// Small true-overlap bursts on static applications only. No upstream requests.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {request,targets,safeAssetPaths,percentile,closeAgents} from './capacity-check.mjs';
const report={at:new Date().toISOString(),scope:'Origin-only static page + at most one asset under 1MiB. All visits launched together; not document processing, browser execution or account workflows.',pool:[],bursts:[]};
try {
  for(const target of targets.slice(0,10)){
    const root=await request(target,target.path,'origin',true);
    if(root.status!==200)throw Error(`Preflight failed ${target.id}`);
    const paths=[target.path],asset=safeAssetPaths(root.body,target)[0];
    if(asset){const r=await request(target,asset);if(r.status===200 && /javascript|css/.test(r.type||'') && r.bytes<=1024*1024)paths.push(asset);}
    report.pool.push({target,paths});
  }
  for(const concurrency of [25,50,100]){
    const mem=readFileSync('/proc/meminfo','utf8');
    if(Number(mem.match(/MemAvailable:\s+(\d+)/)[1])<3*1024*1024)throw Error('Insufficient RAM headroom');
    const started=performance.now(),requests=[],visits=[];
    let active=0,peak=0;
    await Promise.all(Array.from({length:concurrency},async(_,i)=>{
      const item=report.pool[i%report.pool.length],start=performance.now();active++;peak=Math.max(peak,active);
      try {for(const path of item.paths)requests.push(await request(item.target,path));}
      finally {active--;visits.push(performance.now()-start);}
    }));
    const result={concurrency,peakOutstandingVisits:peak,requests:requests.length,statuses:requests.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),bytes:requests.reduce((n,r)=>n+r.bytes,0),elapsedMs:performance.now()-started,responseP95Ms:percentile(requests.map(r=>r.ms),.95),visitP95Ms:percentile(visits,.95)};
    report.bursts.push(result);console.log(JSON.stringify(result));
    if(requests.some(r=>r.status!==200)||result.visitP95Ms>1000)break;
    await new Promise(resolve=>setTimeout(resolve,3000));
  }
}finally{
  closeAgents();
  const directory=`/opt/utilibre/reports/capacity-bursts-${report.at.replace(/[:.]/g,'-')}`;
  mkdirSync(directory,{recursive:true,mode:0o700});writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(`REPORT ${directory}/results.json`);
}
