// Read Kuma's public heartbeat API locally; deliver notifications from the host.
// Nodemailer's DNS resolver ignores Docker /etc/hosts for this private relay.
// Host STARTTLS keeps certificate verification enabled, without patching Kuma.
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,statfsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {sendOperatorMail} from '../maintenance/mail.mjs';
import {reportIssues,queueIssues,externalIssues,unattendedIssues,alertState,redlibUpdateIssues} from '../maintenance/report-health.mjs';
const directory='/var/lib/utilibre-monitor-alerts',file=`${directory}/state.json`;
// Validate live observations without sending mail or acknowledging alert state.
const checkOnly=process.argv.includes('--check-only');
mkdirSync(directory,{recursive:true,mode:0o700});
const previous=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{};
const issues=[];
async function json(path){
  const response=await fetch(`http://127.0.0.1:3135/api/status-page/${path}`,{signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Monitoring API unavailable');
  return response.json();
}
try{
  const [page,health]=await Promise.all([json('utilibre'),json('heartbeat/utilibre')]);
  const monitors=page.publicGroupList.flatMap(group=>group.monitorList);
  if(!monitors.length)throw Error('No public monitors');
  for(const monitor of monitors){
    const beat=health.heartbeatList?.[monitor.id]?.at(-1);
    const timestamp=beat?Date.parse(beat.time.replace(' ','T')+'Z'):NaN;
    if(!beat||!Number.isFinite(timestamp)||Date.now()-timestamp>20*60*1000)issues.push(`Stale monitoring: ${monitor.name}`);
    else if(beat.status!==1)issues.push(`Availability check failed: ${monitor.name}`);
  }
  console.log(`Read ${monitors.length} status-page monitors.`);
}catch{issues.push('Kuma heartbeat API is unavailable or invalid')}
// Reuse the portal's complete configured probe list, including static tools
// that share a gateway. These are application probes, not visitor requests.
try{
 const response=await fetch('http://10.10.1.43:4173/api/status',{signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('Portal probes unavailable');
 const report=await response.json(),date=Date.parse(report.checkedAt);
 if(!Array.isArray(report.services)||report.services.length<50||!Number.isFinite(date)||Date.now()-date>20*60000||date>Date.now()+300000)throw Error('Invalid portal probes');
 for(const item of report.services){
  if(!/^[a-z0-9-]+$/.test(item.id))throw Error('Invalid probe identity');
  if(item.status!=='operational')issues.push(`Catalogue endpoint check failed: ${item.id}`);
 }
 console.log(`Read ${report.services.length} configured catalogue endpoint probes.`);
}catch{issues.push('Catalogue endpoint monitoring unavailable or stale')}
const disk=statfsSync('/opt/utilibre');
if(disk.bavail*disk.bsize<10*1024**3)issues.push('Application disk has less than 10 GiB free');
if(disk.files&&disk.ffree/disk.files<0.05)issues.push('Application disk has less than 5% free inodes');
const memory=Object.fromEntries([...readFileSync('/proc/meminfo','utf8').matchAll(/^(\w+):\s+(\d+)/gm)].map(([,name,value])=>[name,Number(value)]));
if(memory.MemAvailable/memory.MemTotal<0.05)issues.push('Available host memory is below 5%');
// Service state only: no form/document counts, paths or user activity.
let backupUnits=[];
try{
 backupUnits=execFileSync('systemctl',['list-unit-files','--type=timer','--state=enabled','--no-legend','--no-pager'],{encoding:'utf8',timeout:5000}).split('\n').map(x=>x.split(/\s+/)[0]).filter(x=>/^utilibre-(?:[a-z0-9-]+-)?backup\.timer$/.test(x)).map(x=>x.replace(/\.timer$/,'.service'));
}catch{issues.push('Cannot enumerate enabled backup timers');}
for(const unit of new Set([...backupUnits,'utilibre-pack-forms-maintenance.service','utilibre-maintenance-review.service','utilibre-searx-update.service','utilibre-redlib-update.service','utilibre-security-review.service','utilibre-journeys.service','utilibre-recovery-check.service','utilibre-maintenance-digest.service'])) {
  if(!existsSync(`/etc/systemd/system/${unit}`))continue;
  try {
    const result=execFileSync('systemctl',['show',unit,'--property=Result','--value'],{encoding:'utf8',timeout:5000}).trim();
    if(result&&result!=='success')issues.push(`Native maintenance failed: ${unit}`);
  } catch {issues.push(`Cannot inspect native maintenance: ${unit}`)}
}
// Protecting local repairs must not silently stop unrelated native OS updates.
// Watch only after this host's guard is activated; no package/log contents read.
if(existsSync('/etc/systemd/system/apt-daily-upgrade.service.d/utilibre-protected-packages.conf')){
 try{
  const text=execFileSync('systemctl',['show','apt-daily-upgrade.service','--property=LoadState,ActiveState,Result'],{encoding:'utf8',timeout:5000});
  const unit=Object.fromEntries(text.trim().split('\n').map(line=>{const i=line.indexOf('=');return [line.slice(0,i),line.slice(i+1)];}));
  let stamp=NaN;try{stamp=statSync('/var/lib/apt/periodic/upgrade-stamp').mtimeMs;}catch{/* Missing is not successful. */}
  issues.push(...unattendedIssues(unit,stamp));
 }catch{issues.push('Cannot inspect protected unattended OS updates');}
}
for(const [file,name,hours,unit]of [
 ['security.json','Vulnerability scan',36,'utilibre-security-review'],
 ['journeys.json','Synthetic task checks',36,'utilibre-journeys'],
 ['recovery.json','Restore rehearsal',8*24,'utilibre-recovery-check'],
 ['digest.json','Weekly maintenance digest',8*24,'utilibre-maintenance-digest'],
]){
 if(!existsSync(`/etc/systemd/system/${unit}.service`))continue;
 try{
  const report=JSON.parse(readFileSync('/var/lib/utilibre-maintenance/'+file,'utf8'));
  issues.push(...reportIssues(name,report,hours));
  if(file==='security.json')issues.push(...queueIssues(JSON.parse(readFileSync('/var/lib/utilibre-maintenance/security-queue.json','utf8')),report));
 }
 catch{issues.push(`${name}: report unavailable`);}
}
// Read-only repository calls; fetch the scheduled completion separately so a
// burst of manual diagnostics cannot push it outside the first results page.
try{
 const base='repos/mycelibre/utilibre/actions/workflows/independent-availability.yml';
 const query=p=>JSON.parse(execFileSync('gh',['api',p],{encoding:'utf8',timeout:10000,maxBuffer:512*1024}));
 const workflow=query(base),recent=query(base+'/runs?per_page=10');
 const scheduled=query(base+'/runs?event=schedule&status=completed&per_page=1');
 issues.push(...externalIssues(workflow,{workflow_runs:[...(recent.workflow_runs||[]),...(scheduled.workflow_runs||[])]}));
}catch{issues.push('Cannot verify independent external monitoring schedule/results');}
if(existsSync('/etc/systemd/system/utilibre-storagebox-backup.service')) {
  try {
    const status=JSON.parse(readFileSync('/opt/utilibre/storagebox/private/last-success.json','utf8'));
    const date=Date.parse(status.date);
    if(status.status!=='uploaded-and-metadata-checked'||!Number.isFinite(date)||date>Date.now()+300000)issues.push('Off-host application backup confirmation is invalid');
    else if(Date.now()-date>36*3600000)issues.push('Off-host application backup is older than 36 hours');
  } catch {issues.push('Off-host application backup confirmation unavailable')}
}
if(existsSync('/etc/systemd/system/utilibre-maintenance-review.service')) {
  try {
    const report=JSON.parse(readFileSync('/var/lib/utilibre-maintenance/latest.json','utf8'));
    const date=Date.parse(report.date);
    if(!Number.isFinite(date)||date>Date.now()+300000||Date.now()-date>36*3600000)issues.push('Upstream release/advisory review is stale or invalid');
    if(!Array.isArray(report.results)||!report.results.length)throw Error('Empty maintenance report');
    const failed=report.results.filter(item=>item.status!=='checked'||item.advisories?.coverage==='unavailable');
    if(failed.length)issues.push(`Upstream review incomplete for ${failed.length} projects; inspect /var/lib/utilibre-maintenance/latest.json`);
    for(const item of report.results)if(item.advisories?.needsReview?.some(a=>['critical','high'].includes(a.severity)))issues.push(`Published security advisory needs review: ${item.project}`);
  }catch{issues.push('Upstream release/advisory report is unavailable')}
}
if(existsSync('/etc/systemd/system/utilibre-redlib-update.service')) {
 try{issues.push(...redlibUpdateIssues(JSON.parse(readFileSync('/var/lib/utilibre-maintenance/redlib-update/last-run.json','utf8'))));}
 catch{issues.push('Redlib updater: daily report unavailable');}
}
issues.sort();
const observation=alertState(previous,issues);
const {fingerprint,due,recovered}=observation;
const test=process.argv.includes('--test');
let alertedFingerprint=previous.alertedFingerprint||'',sentAt=previous.sentAt||0;
let alertedUrgent=previous.alertedUrgent,lastMailAt=previous.lastMailAt||previous.sentAt||0;
if(!checkOnly&&(test||due||recovered)){
  const subject=test?'Utilibre monitoring test':issues.length?'Utilibre service attention needed':'Utilibre monitoring recovered';
  const body=test?'Verified monitoring mail test. The host checks public-service heartbeats and disk/memory every five minutes. This does not independently detect a complete VM outage.':issues.length?issues.join('\n'):'Previously reported monitor/resource issues have cleared.';
  try{sendOperatorMail(subject,body)}
  catch{console.error('Monitoring email delivery failed; state not acknowledged.');process.exit(1)}
  if(!test){alertedFingerprint=issues.length?fingerprint:'';alertedUrgent=issues.length?observation.urgent:false;sentAt=Date.now();lastMailAt=sentAt}
  console.log('Monitoring notification accepted by the verified-TLS SMTP relay.');
}
if(!checkOnly){
  writeFileSync(`${file}.tmp`,JSON.stringify({fingerprint,observed:observation.observed,healthyObserved:observation.healthyObserved,alertedFingerprint,alertedUrgent,sentAt,lastMailAt,checkedAt:Date.now()})+'\n',{mode:0o600});
  renameSync(`${file}.tmp`,file);
}
if(checkOnly){console.log('Read-only check: no mail sent and no alert state changed.');for(const issue of issues)console.log(issue);}
console.log(issues.length?`${issues.length} issue(s); notifications require two consecutive observations.`:'All observed monitors and resource thresholds are healthy.');
