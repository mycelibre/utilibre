// Quota-only NGINX fixtures and real LRCLIB handler with an injected local fake
// provider. Explicitly NOT evidence of real search-provider capacity.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {createLyricsHandler} from '../deployment/community/lrclib-server.mjs';
import {percentile} from './capacity-check.mjs';

const root = new URL('../deployment/community/',import.meta.url);
const cases = [
  ['TransLite',3390,'translite-gateway.conf','translate_global'],
  ['AnonymousOverflow',3391,'anonymousoverflow-gateway.conf','overflow_global'],
  ['4get',3392,'fourget-gateway.conf','fourget_global'],
  ['Binternet',3393,'binternet-gateway.conf','binternet_global'],
];
const fixtureConfig=readFileSync(new URL('capacity-fixtures/nginx.conf',root),'utf8');
for(const [, , file,zone] of cases){
  const production=readFileSync(new URL(file,root),'utf8');
  for(const regex of [new RegExp(`limit_req_zone \\$server_name zone=${zone}:[^;]+;`),new RegExp(`limit_req zone=${zone} [^;]+;`)]){
    assert.equal(fixtureConfig.match(regex)?.[0],production.match(regex)?.[0],`Fixture drift: ${file}`);
    assert(production.match(regex));
  }
}
const agent=new http.Agent({keepAlive:true,maxSockets:50,maxFreeSockets:2});
function get(port,path='/'){
  return new Promise(resolve=>{
    const start=performance.now();
    const req=http.get({hostname:'127.0.0.1',port,path,agent,headers:{'User-Agent':'Utilibre-Isolated-Capacity-Fixture/1.0'}},res=>{
      res.resume();res.on('end',()=>{clearTimeout(deadline);resolve({status:res.statusCode,ms:performance.now()-start})});
    });
    const deadline=setTimeout(()=>req.destroy(Error('timeout')),9000);
    req.on('error',error=>{clearTimeout(deadline);resolve({status:0,error:error.message,ms:performance.now()-start})});
  });
}
const summarize=(name,results)=>({name,requests:results.length,statuses:results.reduce((a,r)=>(a[r.status]=(a[r.status]||0)+1,a),{}),p95Ms:Math.round(percentile(results.map(r=>r.ms),.95)*100)/100});
const report={at:new Date().toISOString(),scope:'Isolated fixtures only; no network access to real content providers',results:[]};
let upstreamCalls=0,simultaneous=0,peakUpstream=0;
const handler=createLyricsHandler({request:async()=>{
  upstreamCalls++; simultaneous++;peakUpstream=Math.max(peakUpstream,simultaneous);
  await new Promise(r=>setTimeout(r,200));simultaneous--;
  return Response.json([{id:1,duration:100,trackName:'Synthetic capacity fixture',artistName:'Utilibre test',plainLyrics:'Synthetic text only, not a published song',syncedLyrics:null}]);
}});
const server=http.createServer(handler);
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
  for(const [name,port] of cases){
    const results=await Promise.all(Array.from({length:30},()=>get(port)));
    const summary=summarize(`${name}: burst of 30 simultaneous requests`,results);
    assert.equal(summary.statuses[0]||0,0,'Fixture transport failed');
    assert((summary.statuses[429]||0)>0,'Expected quota rejection');
    report.results.push(summary);console.log(JSON.stringify(summary));
  }
  const port=server.address().port;
  const cold=await Promise.all(Array.from({length:30},(_,i)=>get(port,`/api/search?q=synthetic-${i}`)));
  report.results.push({...summarize('LRCLIB: 30 simultaneous distinct cache misses',cold),upstreamCalls,peakUpstream});
  const accepted=cold.filter(r=>r.status===200).length;
  assert(accepted>=2 && accepted<=5,'Small distinct bursts queue, but remain bounded');
  assert.equal(upstreamCalls,accepted);assert.equal(peakUpstream,1);
  assert.equal(cold.filter(r=>r.status===429).length,30-accepted);
  await new Promise(resolve=>setTimeout(resolve,550));
  const beforeIdentical=upstreamCalls;
  const identical=await Promise.all(Array.from({length:30},()=>get(port,'/api/search?q=identical-cold-fixture')));
  report.results.push({...summarize('LRCLIB: 30 identical simultaneous cache misses',identical),additionalUpstreamCalls:upstreamCalls-beforeIdentical,peakUpstream});
  assert(identical.every(r=>r.status===200));assert.equal(upstreamCalls-beforeIdentical,1);
  await new Promise(resolve=>setTimeout(resolve,550));
  await get(port,'/api/search?q=warm-fixture');
  const before=upstreamCalls,start=performance.now();let next=0;
  const warm=[];
  await Promise.all(Array.from({length:50},async()=>{while(next++<1000)warm.push(await get(port,'/api/search?q=warm-fixture'));}));
  report.results.push({...summarize('LRCLIB: 1000 cached requests, concurrency 50',warm),elapsedMs:performance.now()-start,additionalUpstreamCalls:upstreamCalls-before});
  assert(warm.every(r=>r.status===200));assert.equal(upstreamCalls,before);
  console.log(JSON.stringify(report.results.slice(-3)));
}finally{
  agent.destroy();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  const directory=`/opt/utilibre/reports/capacity-fixtures-${report.at.replace(/[:.]/g,'-')}`;
  mkdirSync(directory,{recursive:true,mode:0o700});
  writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(`REPORT ${directory}/results.json`);
}
