// Manual external runner: fixed Utilibre front doors only, no credentials,
// user writes, upstream searches, arbitrary URLs or redirects.
import {targets,request,safeAssetPaths,phase,closeAgents} from './capacity-check.mjs';
const higher=process.env.CAPACITY_HIGHER==='true';
const report={at:new Date().toISOString(),higher,scope:'Independent GitHub-hosted runner; public HTML and at most one local JS/CSS asset under 1MiB. Bounded 30s paced stages, not full browser workflows or 1000 active users.',preflight:[],phases:[]};
try{
  const pool=[];
  for(const target of targets){
    const root=await request(target,target.path,'public',true),paths=[target.path];
    const row={id:target.id,status:root.status};
    if(root.status!==200||!/text\/html/.test(root.type||'')){row.skipped=true;report.preflight.push(row);continue;}
    const asset=safeAssetPaths(root.body,target)[0];
    if(asset){const r=await request(target,asset,'public');row.assetStatus=r.status;if(r.status===200&&/javascript|css/.test(r.type||'')&&r.bytes<=1024*1024)paths.push(asset);}
    report.preflight.push(row);pool.push({target,paths});
  }
  if(pool.length<10)throw Error('Too few healthy front doors; no load sent');
  // Higher stages require a separate explicit dispatch after reviewing baseline.
  for(const rate of higher?[50,100]:[2.5,5,10,25]){
    const result=await phase({name:'external-frontdoors',pool,mode:'public',rate,seconds:30,maxInflight:40});
    report.phases.push(result);
    console.log(JSON.stringify({stage:rate,requests:result.requests,errors:result.errors,p95Ms:result.responseP95Ms,stopped:result.stopped}));
    if(result.stopped){report.stopped=result.stopped;break;}
  }
  if(report.preflight.some(r=>r.skipped)||report.stopped)process.exitCode=1;
}catch(error){report.stopped=String(error.message).slice(0,150);process.exitCode=1;}
finally{
  closeAgents();report.finishedAt=new Date().toISOString();
  // Aggregated counters only: no response bodies, cookies, query text or secrets.
  for(const p of report.phases){p.maximumGeneratorCPU=Math.max(0,...p.samples.map(s=>s.cpuBusyPercent));delete p.samples;}
  console.log('UTILIBRE_EXTERNAL_RESULT '+JSON.stringify(report));
}
