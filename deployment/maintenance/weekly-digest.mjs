// One operator digest per week. Counts refer to software checks, never visitors.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {sendOperatorMail} from './mail.mjs';
const directory='/var/lib/utilibre-maintenance';
async function read(name){try{return JSON.parse(await readFile(directory+'/'+name,'utf8'));}catch{return null;}}
const upstream=await read('latest.json'),security=await read('security-queue.json'),journeys=await read('journeys.json'),recovery=await read('recovery.json');
const candidates=upstream?.results?.filter(x=>x.branchChanged||x.release)||[];
const manual=upstream?.results?.filter(x=>x.advisories?.coverage!=='repository-published')||[];
const findings=security?.items||[];
const pending=findings.filter(x=>!(['mitigated','not-affected'].includes(x.status)&&Date.parse(x.decision?.expiresAt)>Date.now()));
const severe=pending.filter(x=>['CRITICAL','HIGH'].includes(x.severity));
const overdue=pending.filter(x=>Date.parse(x.reviewBy)<Date.now());
const body=[
 'Utilibre weekly maintenance review — owner: admin@utilibre.org',
 'This is an operator work list, not automatic approval to upgrade or a security clearance.',
 '',
 `Upstream report: ${upstream?.date||'UNAVAILABLE'}; providers: ${upstream?.providers??'unknown'}.`,
 `Vulnerability review: ${security?.date||'UNAVAILABLE'}; ${findings.length} package/target findings (${severe.length} high/critical); ${overdue.length} past their triage target.`,
 `Daily synthetic tasks: ${journeys?.status||'UNAVAILABLE'} (${journeys?.date||'unknown'}).`,
 `Weekly representative restore: ${recovery?.status||'UNAVAILABLE'} (${recovery?.date||'unknown'}).`,
 '',
 'Actions: review critical findings within 24h, high within 72h, medium within 7d; test and patch or document an effective mitigation. These are review targets, not guaranteed repair times.',
 'Review release candidates weekly; a changed branch or available tag does not establish that our deployed build needs that release.',
 'For each changed app use its runbook: privacy/network checks, useful task, current saved-work backup where relevant, staged rollout and compatible rollback.',
 'Review non-GitHub advisories/security notes manually:',
 ...manual.map(x=>`- ${x.project}: ${x.source}`),
 '',
 'Release references (first 20; complete report stays on the VM):',
 ...candidates.slice(0,20).map(x=>`- ${x.project}: installed ${x.installed}; ${x.release?.url||x.source}`),
 '',
 'Private full reports: /var/lib/utilibre-maintenance/{latest,security,security-queue,journeys,recovery}.json',
 'External checks: https://github.com/mycelibre/utilibre/actions/workflows/utilibre-availability.yml',
 'Confirm GitHub failed-workflow email notifications are enabled. Schedule delays/60-day inactivity disabling are platform limits, not a guaranteed pager.',
 'Monthly: rotate real-device EN/ES tasks and account restore coverage. Physical phones and every stateful service are not covered by the representative automated check.',
 'Runbook: docs/updates.md. No visitor analytics or private documents are used for these measurements.',
].join('\n');
if(process.argv.includes('--preview'))console.log(body);
else{
 sendOperatorMail('Utilibre weekly maintenance review',body);
 await writeFile(directory+'/digest.json.tmp',JSON.stringify({date:new Date().toISOString(),status:'relay-accepted',note:'SMTP relay acceptance is not evidence of inbox reading.'})+'\n',{mode:0o600});
 await rename(directory+'/digest.json.tmp',directory+'/digest.json');
 console.log('Weekly maintenance digest accepted by the verified SMTP relay.');
}
