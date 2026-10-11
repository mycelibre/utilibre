// Private deduplicated findings ledger, with first observation and triage deadlines.
import {readFile,writeFile,rename,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {applyDecisions} from './triage.mjs';
const directory='/var/lib/utilibre-maintenance';
export function findingsQueue(report,previous={items:[]},now=new Date().toISOString()){
 const old=new Map((previous.items||[]).map(x=>[x.key,x]));const found=new Map();
 const continuity=new Map();
 const lineage=(scope,name,f)=>[scope,name,f.id,f.package,f.installed].join('\n');
 for(const item of previous.items||[])for(const name of item.scope==='runtime-image'?item.containers||[]:[item.targetName||item.artifact]){
  const key=lineage(item.scope,name,item),prior=continuity.get(key);
  if(!prior||Date.parse(item.firstSeen)<Date.parse(prior))continuity.set(key,item.firstSeen);
 }
 const targets=[...(report.images||[]).map(x=>({...x,name:x.id,scope:'runtime-image'})),...(report.sources||[]).map(x=>({...x,scope:x.scope||'source-lock'})),{...report.host,name:'host-dpkg',scope:'host-os'}];
 for(const t of targets)for(const f of t.findings||[]){
  // Same package in multiple paths/layers is one target finding, not many incidents.
  const artifact=t.sha256?`${t.name}@sha256:${t.sha256}`:t.name;
  const key=createHash('sha256').update([artifact,f.id,f.package,f.installed].join('\n')).digest('hex');
  if(found.has(key))continue;
  // Rebuilding an image must reopen exact-image decisions, not restart the
  // deadline for unchanged vulnerable packages serving the same application.
  const seen=[old.get(key)?.firstSeen,...(t.scope==='runtime-image'?t.containers||[]:[t.name]).map(name=>continuity.get(lineage(t.scope,name,f)))].filter(x=>Number.isFinite(Date.parse(x)));
  const firstSeen=seen.length?new Date(Math.min(...seen.map(Date.parse))).toISOString():now;
  const hours={CRITICAL:24,HIGH:72,MEDIUM:168,LOW:720,UNKNOWN:168}[f.severity]||168;
  found.set(key,{...f,key,firstSeen,lastSeen:now,reviewBy:new Date(Date.parse(firstSeen)+hours*3600000).toISOString(),owner:'admin@utilibre.org',status:'needs-review',scope:t.scope,artifact,targetName:t.name,containers:t.containers||[]});
 }
 return {date:now,scanDate:report.completedAt||report.date,status:report.status==='checked'?'current':'incomplete',items:[...found.values()],note:'Deadlines are operator triage targets, not guaranteed fixes. Entries are scanner findings, not proven exploits. A missing result in an incomplete scan never proves resolution.'};
}
export async function run(){
 await mkdir(directory,{recursive:true,mode:0o700});
 const report=JSON.parse(await readFile(directory+'/security.json','utf8'));
 let previous;try{previous=JSON.parse(await readFile(directory+'/security-queue.json','utf8'));}catch{previous={items:[]};}
 const queue=findingsQueue(report,previous);
 // Preserve unresolved observations across failed/partial scans.
 if(report.status!=='checked'){
  const seen=new Set(queue.items.map(x=>x.key));
  queue.items.push(...previous.items.filter(x=>!seen.has(x.key)).map(x=>({...x,status:'not-rechecked'})));
 }
 let decisions=[];try{decisions=JSON.parse(await readFile(directory+'/security-decisions.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 queue.items=applyDecisions(queue.items,decisions);
 await writeFile(directory+'/security-queue.json.tmp',JSON.stringify(queue,null,2)+'\n',{mode:0o600});await rename(directory+'/security-queue.json.tmp',directory+'/security-queue.json');
 console.log(`Private review queue: ${queue.items.length} package/target findings; ${queue.status}.`);
 return queue;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
