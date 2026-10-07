// 30-minute guarded, same-VM public HTTPS baseline with synthetic workflows.
// No upstream searches or provider traffic. Not an external/user-count benchmark.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {targets,request,safeAssetPaths,phase,closeAgents} from './capacity-check.mjs';
const execute=promisify(execFile);
const report={at:new Date().toISOString(),scope:'Same-VM 30-minute public HTML/selected-asset baseline, 10 visits/s. Synthetic FMD round trips and Pollaris creation/voting/CSV/deletion every 5 minutes. No external load generator, Caddy telemetry, real upstream search load or 1000-user certification.',preflight:[],phases:[],workflows:[]};
const directory=`/opt/utilibre/reports/capacity-soak-${report.at.replace(/[:.]/g,'-')}`;
mkdirSync(directory,{recursive:true,mode:0o700});
const save=()=>writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});
let interrupted=false, workflowTask;
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{interrupted=true;});
async function snapshot(){
  const {stdout}=await execute('docker',['ps','--format','{{.Names}}|{{.Status}}'],{timeout:10000});
  const {stdout:stats}=await execute('docker',['stats','--no-stream','--format','{{json .}}'],{timeout:20000});
  return {at:new Date().toISOString(),containers:stdout.trim().split('\n'),stats:stats.trim().split('\n').map(x=>JSON.parse(x)),
    memory:readFileSync('/proc/meminfo','utf8'),network:readFileSync('/proc/net/dev','utf8'),
    pressure:Object.fromEntries(['cpu','memory','io'].map(x=>[x,readFileSync(`/proc/pressure/${x}`,'utf8')]))};
}
async function workflows(round){
  for(const script of ['deployment/community/check-fmd.mjs','deployment/community/check-pollaris.mjs']){
    const start=performance.now();let passed=false;
    // Existing tests retain only synthetic fixture state and clean up via native APIs.
    // No real accounts or documents are read. Keep tokens/URLs out of this report.
    try {await execute(process.execPath,[script],{timeout:180000,maxBuffer:1024*1024});passed=true;}
    catch(error){report.stopped=`synthetic-workflow-failed:${script}`;}
    report.workflows.push({round,script,passed,elapsedSeconds:Math.round((performance.now()-start)/100)/10});
    console.log(JSON.stringify({workflow:report.workflows.at(-1)}));save();
    if(!passed)break;
  }
}
try{
  report.before=await snapshot();
  const pool=[];
  // Exclude FMD's single-IP page quota while its actual API workflow is running.
  // All other selected paths are local front doors/static assets, not search APIs.
  for(const target of targets.filter(t=>t.id!=='fmd')){
    const root=await request(target,target.path,'public',true);
    if(root.status!==200||!/text\/html/.test(root.type||''))throw Error(`Preflight:${target.id}`);
    const paths=[target.path],asset=safeAssetPaths(root.body,target)[0];
    if(asset){const r=await request(target,asset,'public');if(r.status===200&&/javascript|css/.test(r.type||'')&&r.bytes<=1024*1024)paths.push(asset);}
    pool.push({target,paths});report.preflight.push({id:target.id,paths});
  }
  for(let minute=0;minute<30;minute++){
    if(interrupted||report.stopped)break;
    if(minute%5===0){await workflowTask;workflowTask=workflows(minute/5+1);}
    const result=await phase({name:`minute-${minute+1}`,pool,mode:'public',rate:10,seconds:60,maxInflight:40});
    report.phases.push(result);
    console.log(JSON.stringify({minute:minute+1,requests:result.requests,errors:result.errors,p95Ms:result.responseP95Ms,stop:result.stopped}));save();
    if(result.stopped){report.stopped=result.stopped;break;}
    if(report.phases.reduce((n,p)=>n+p.bytes,0)>4*1024**3){report.stopped='total-transfer-budget-4GiB';break;}
  }
  await workflowTask;
}catch(error){report.stopped=String(error.message).replace(/https?:\/\/\S+/g,'[URL]').slice(0,200);process.exitCode=1;}
finally{
  await workflowTask;
  closeAgents();report.after=await snapshot();report.finishedAt=new Date().toISOString();
  if(interrupted)report.stopped='operator-interrupted';
  save();console.log(`REPORT ${directory}/results.json`);
  if(report.stopped)process.exitCode=1;
}
