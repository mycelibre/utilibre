// Operator-only review records. No wildcard/indefinite suppression or auto-approval.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const directory='/var/lib/utilibre-maintenance';
export function validateDecision(value,now=Date.now()){
 if(!value||!/^[a-f0-9]{64}$/.test(value.key)||!['confirmed','mitigated','not-affected'].includes(value.status))throw Error('Exact finding key and supported review status required');
 if(typeof value.reason!=='string'||value.reason.trim().length<20||value.reason.length>1200)throw Error('An evidence-backed reason (20–1200 characters) is required');
 const expiry=Date.parse(value.expiresAt);
 if(!Number.isFinite(expiry)||expiry<=now||expiry>now+30*86400000)throw Error('Review expiry must be in the next 30 days');
 return {key:value.key,status:value.status,reason:value.reason.trim(),expiresAt:new Date(expiry).toISOString(),reviewedAt:new Date(now).toISOString()};
}
export function applyDecisions(items,decisions,now=Date.now()){
 const byKey=new Map(decisions.map(x=>[x.key,x]));
 return items.map(item=>{
  const decision=byKey.get(item.key);
  if(!decision||Date.parse(decision.expiresAt)<=now)return item;
  try{
   const reviewed=Date.parse(decision.reviewedAt);
   if(!Number.isFinite(reviewed)||reviewed>now+300000)throw Error('Invalid review time');
   validateDecision(decision,reviewed);
  }catch{return item;}
  return {...item,status:decision.status,decision};
 });
}
export async function run(args=process.argv.slice(2)){
 const queue=JSON.parse(await readFile(directory+'/security-queue.json','utf8'));
 if(args[0]==='list'&&args.length===1){
  console.log(JSON.stringify(queue.items.filter(x=>['CRITICAL','HIGH'].includes(x.severity)),null,2));return;
 }
 if(args[0]!=='record'||args.length!==2)throw Error('Use: node deployment/maintenance/triage.mjs list | record /absolute/review.json');
 if(!args[1].startsWith('/'))throw Error('Use an absolute private review-file path');
 const decision=validateDecision(JSON.parse(await readFile(args[1],'utf8')));
 if(!queue.items.some(x=>x.key===decision.key))throw Error('Finding is not in the current queue');
 let decisions=[];try{decisions=JSON.parse(await readFile(directory+'/security-decisions.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
 decisions=decisions.filter(x=>x.key!==decision.key);decisions.push(decision);
 await writeFile(directory+'/security-decisions.json.tmp',JSON.stringify(decisions,null,2)+'\n',{mode:0o600});await rename(directory+'/security-decisions.json.tmp',directory+'/security-decisions.json');
 const {run:buildQueue}=await import('./build-queue.mjs');await buildQueue();
 console.log('Exact finding review recorded; expires automatically. Raw scan remains unchanged.');
}
// Let this module finish evaluating before the CLI dynamically loads the queue
// builder, which imports applyDecisions from here. A top-level await deadlocks
// that import cycle after saving a decision but before rebuilding the queue.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run().catch(error=>{
 console.error(error.message);process.exitCode=1;
});
