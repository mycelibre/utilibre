import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const stage='utilibre-maintenance-pairdrop-stage',image='utilibre-pairdrop:1.11.2-security-20261011-p2';
const docker=args=>execFileSync('docker',args,{encoding:'utf8',timeout:30000});
const old='ghcr.io/schlagmichdoch/pairdrop:v1.11.2';
const hash=ref=>docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--entrypoint','sh',ref,'-c','find server public -type f ! -path public/scripts/browser-tabs-connector.js -print0 | sort -z | xargs -0 sha256sum | sha256sum']).trim();
assert.equal(hash(old),hash(image),'Application bytes outside the reviewed tab guard changed');
docker(['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','-v','/home/ubuntu/freetools/deployment/community/pairdrop-storage-guard.cjs:/tmp/check.cjs:ro','--entrypoint','node',image,'/tmp/check.cjs']);
const lock=ref=>JSON.parse(docker(['run','--rm','--network','none','--read-only','--entrypoint','node',ref,'-e','console.log(JSON.stringify(require("./package-lock.json")))']));
const before=lock(old),after=lock(image);
assert.equal(after.packages['node_modules/proxy-addr'].version,'2.0.8');
delete before.packages['node_modules/proxy-addr'];delete after.packages['node_modules/proxy-addr'];assert.deepEqual(before,after,'Unreviewed dependency lock changes');
let created=false;
try{
 docker(['run','-d','--name',stage,'--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','.5','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:size=32m,mode=1777','-p','127.0.0.1:33124:3000','-e','PORT=3000','-e','RATE_LIMIT=1','-e','DEBUG_MODE=false','-e','WS_FALLBACK=false','-e','RTC_CONFIG=/config/rtc.json','-v','/home/ubuntu/freetools/deployment/community/pairdrop-rtc.json:/config/rtc.json:ro',image]);created=true;
 let ready=false;for(let n=0;n<20;n++){try{const r=await fetch('http://127.0.0.1:33124/',{signal:AbortSignal.timeout(2000)});await r.body?.cancel();if(r.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready,'Staged server did not become ready');
 execFileSync(process.execPath,['deployment/community/check-pairdrop.mjs'],{stdio:'inherit',timeout:180000,env:{...process.env,PAIRDROP_CHECK_ORIGIN:'http://127.0.0.1:33124'}});
 console.log('PairDrop staged runtime: unchanged application apart from tested tab guard; one dependency-only lock change; two-browser native transfer passed.');
}finally{if(created)docker(['rm','-f',stage]);}
