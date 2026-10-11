// Current upstream release, isolated memory cache, existing network isolation.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
const image='ghcr.io/diygod/rsshub@sha256:967194b8f73a1251b2a566f91b457bc872c1bbaf343827a455ade760b9693bf6';
const live=process.argv[2]==='live', name=live?'utilibre-services-rsshub-1':'utilibre-maintenance-rsshub-stage';
if(!live&&process.argv[2]!=='stage')throw Error('Use stage or live');
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:90000,maxBuffer:2*1024**2});
const env={NODE_ENV:'production',PORT:'1201',CACHE_TYPE:'memory',REQUEST_RETRY:'0',REQUEST_TIMEOUT:'15000',DEBUG_INFO:'false',NO_LOGFILES:'true',LOGGER_LEVEL:'error',ALLOW_USER_SUPPLY_UNSAFE_DOMAIN:'false',FILTER_REGEX_ENGINE:'re2',ALLOW_USER_HOTLINK_TEMPLATE:'false',ENABLE_REMOTE_DEBUGGING:'false'};
let created=false;
try{
 if(!live){docker(['run','-d','--name',name,'--network','container:utilibre-services-rsshub-1','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','1536m','--memory-swap','1536m','--cpus','1','--pids-limit','256','--log-driver','none','--tmpfs','/tmp:rw,nosuid,nodev,noexec,size=128m,mode=1777',...Object.entries(env).flatMap(([k,v])=>['-e',k+'='+v]),image]);created=true;}
 const port=live?1200:1201;
 const code=`(async()=>{for(let n=0;n<25;n++){try{let r=await fetch('http://127.0.0.1:${port}/healthz');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,1000));} const response=await fetch('http://127.0.0.1:${port}/github/issue/DIYgod/RSSHub/open?limit=2',{signal:AbortSignal.timeout(30000)});const text=await response.text();if(!response.ok||!text.includes('<rss')||!text.includes('DIYgod/RSSHub'))throw Error('Native RSS route failed');console.log(JSON.stringify({node:process.version,vm2:require('vm2/package.json').version,rss:response.status,validFeed:true}));})().catch(()=>process.exit(1))`;
 const result=JSON.parse(docker(['exec',name,'node','-e',code]));assert.equal(result.vm2,'3.12.2');
 const data=JSON.parse(docker(['inspect',name]))[0];assert.equal(data.HostConfig.LogConfig.Type,'none');
 if(live){const expected=JSON.parse(docker(['image','inspect',image]))[0].Id;assert.equal(data.Image,expected);assert(!Object.values(data.HostConfig.PortBindings||{}).some(Boolean));
 const reachable=docker(['exec','utilibre-services-freshrss-1','php','-r',`$b=file_get_contents('http://rsshub:1200/healthz');if($b===false)exit(1);echo 'ok';`]);assert.equal(reachable,'ok');}
 const dir='/var/lib/utilibre-maintenance/rsshub-20261011';await mkdir(dir,{recursive:true,mode:0o700});
 const report={date:new Date().toISOString(),mode:live?'live':'stage',image,...result,logging:'none',limitations:['One upstream issue feed checked; not all connectors.','Internal support service; no new public route or account changes.']};
 await writeFile(dir+(live?'/release.json':'/stage.json'),JSON.stringify(report,null,2)+'\n',{mode:0o600});console.log(JSON.stringify(report));
}finally{if(created)docker(['rm','-f',name]);}
