// Read Kuma's public heartbeat API locally; deliver notifications from the host.
// Nodemailer's DNS resolver ignores Docker /etc/hosts for this private relay.
// Host STARTTLS keeps certificate verification enabled, without patching Kuma.
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync,statfsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const directory='/var/lib/utilibre-monitor-alerts',file=`${directory}/state.json`;
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
const disk=statfsSync('/opt/utilibre');
if(disk.bavail*disk.bsize<10*1024**3)issues.push('Application disk has less than 10 GiB free');
if(disk.files&&disk.ffree/disk.files<0.05)issues.push('Application disk has less than 5% free inodes');
const memory=Object.fromEntries([...readFileSync('/proc/meminfo','utf8').matchAll(/^(\w+):\s+(\d+)/gm)].map(([,name,value])=>[name,Number(value)]));
if(memory.MemAvailable/memory.MemTotal<0.05)issues.push('Available host memory is below 5%');
// Service state only: no form/document counts, paths or user activity.
for(const unit of ['utilibre-pack-backup.service','utilibre-pack-forms-maintenance.service']) {
  if(!existsSync(`/etc/systemd/system/${unit}`))continue;
  try {
    const result=execFileSync('systemctl',['show',unit,'--property=Result','--value'],{encoding:'utf8',timeout:5000}).trim();
    if(result&&result!=='success')issues.push(`Native maintenance failed: ${unit}`);
  } catch {issues.push(`Cannot inspect native maintenance: ${unit}`)}
}
issues.sort();
const fingerprint=JSON.stringify(issues),count=previous.fingerprint===fingerprint?(previous.count||0)+1:1;
const test=process.argv.includes('--test');
const due=issues.length&&count>=2&&(previous.alertedFingerprint!==fingerprint||Date.now()-(previous.sentAt||0)>12*3600000);
const recovered=!issues.length&&Boolean(previous.alertedFingerprint);
let alertedFingerprint=previous.alertedFingerprint||'',sentAt=previous.sentAt||0;
if(test||due||recovered){
  const subject=test?'Utilibre monitoring test':issues.length?'Utilibre service attention needed':'Utilibre monitoring recovered';
  const body=test?'Verified monitoring mail test. The host checks public-service heartbeats and disk/memory every five minutes. This does not independently detect a complete VM outage.':issues.length?issues.join('\n'):'Previously reported monitor/resource issues have cleared.';
  const program=`import smtplib,ssl,json,sys,socket
from email.message import EmailMessage
class Relay(smtplib.SMTP):
 def _get_socket(self,host,port,timeout):
  return socket.create_connection(('10.10.1.20',port),timeout)
data=json.load(sys.stdin)
m=EmailMessage();m['From']='no-reply@utilibre.org';m['To']='admin@utilibre.org';m['Subject']=data['subject'];m.set_content(data['body'])
with Relay('mx.mailgt.dev',26,timeout=15) as server:
 server.starttls(context=ssl.create_default_context());server.send_message(m)
`;
  try{execFileSync('python3',['-c',program],{input:JSON.stringify({subject,body}),stdio:['pipe','ignore','pipe'],timeout:25000})}
  catch{console.error('Monitoring email delivery failed; state not acknowledged.');process.exit(1)}
  if(!test){alertedFingerprint=issues.length?fingerprint:'';sentAt=Date.now()}
  console.log('Monitoring notification accepted by the verified-TLS SMTP relay.');
}
writeFileSync(`${file}.tmp`,JSON.stringify({fingerprint,count,alertedFingerprint,sentAt,checkedAt:Date.now()})+'\n',{mode:0o600});
renameSync(`${file}.tmp`,file);
console.log(issues.length?`${issues.length} issue(s); notifications require two consecutive observations.`:'All observed monitors and resource thresholds are healthy.');
