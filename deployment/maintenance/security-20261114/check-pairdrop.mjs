// Retained two-browser transfer fixture against an isolated candidate listener.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261114/community-pairdrop';
const b=JSON.parse(fs.readFileSync(root+'/build.json'));
assert(process.argv.length===2||(process.argv.length===3&&process.argv[2]==='--baseline'));
const baseline=process.argv[2]==='--baseline';
if(baseline){b.imageId=b.base;b.candidate=b.base;}
const name='utilibre-pairdrop-vendor-nov14',network=name+'-net';let created=false,net=false;
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
assert.equal(docker('image','inspect','--format','{{.Id}}',b.candidate),b.imageId);
assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'');
const rtc=root+'/rtc.json';fs.writeFileSync(rtc,JSON.stringify({sdpSemantics:'unified-plan',iceServers:[]}));fs.chmodSync(rtc,0o644);
try{
 cp.execFileSync('python3',['-c',"import ipaddress,json,subprocess; n=ipaddress.ip_network('198.19.248.0/28'); r=json.loads(subprocess.check_output(['ip','-j','route','show','table','all'])); assert not any(n.overlaps(ipaddress.ip_network(x['dst'],strict=False)) for x in r if x.get('dst') not in (None,'default'))"]);
 docker('network','create','--internal','--subnet','198.19.248.0/28',network);net=true;
 docker('run','-d','--name',name,'--network',network,'--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','.5','--pids-limit','96','--log-driver','none','--tmpfs','/tmp:size=32m,mode=1777','-e','PORT=33124','-e','RATE_LIMIT=1','-e','DEBUG_MODE=false','-e','WS_FALLBACK=false','-e','RTC_CONFIG=/config/rtc.json','-v',rtc+':/config/rtc.json:ro',b.imageId);created=true;
 const pid=docker('inspect','--format','{{.State.Pid}}',name);assert(+pid>0);
 // Chromium's ICE adapter selection needs a default interface. The gateway
 // stays on Docker's internal-only bridge: this does not enable external NAT.
 assert.equal(JSON.parse(docker('network','inspect',network))[0].Internal,true);
 cp.execFileSync('nsenter',['-t',pid,'-n','ip','route','add','default','via','198.19.248.1'],{timeout:5000,stdio:['ignore','pipe','pipe']});
 let ready=false;for(let n=0;n<20;n++){try{assert.equal(cp.execFileSync('nsenter',['-t',pid,'-n',process.execPath,'--input-type=module','-e',"const r=await fetch('http://127.0.0.1:33124/',{signal:AbortSignal.timeout(2000)});console.log(r.status);await r.body?.cancel()"],{encoding:'utf8',timeout:4000,stdio:['ignore','pipe','pipe']}).trim(),'200');ready=true;break;}catch{}await new Promise(r=>setTimeout(r,500));}assert(ready);
 const fixture='deployment/community/check-pairdrop.mjs';
 let selected=fixture;
 if(process.env.PAIRDROP_BROWSER_DIAGNOSTIC==='1'){
  let code=fs.readFileSync(fixture,'utf8').replaceAll('import.meta.url',JSON.stringify(new URL('../../community/check-pairdrop.mjs',import.meta.url).href));
  code=code.replace("from './pairdrop-stats.mjs'",'from '+JSON.stringify(new URL('../../community/pairdrop-stats.mjs',import.meta.url).href));
  code=code.replace("page.on('pageerror', error => errors.push(error.message));","page.on('pageerror', error => {errors.push(error.message);console.error('FIXTURE_JS_ERROR',error.message)}); page.on('console', m => {console.error('FIXTURE_CONSOLE',m.type(),m.text())}); page.on('websocket',ws=>{console.error('FIXTURE_WS_OPEN');ws.on('socketerror',e=>console.error('FIXTURE_WS_ERROR',e));});");
  code=code.replace('timeout: 45000','timeout: 10000');selected=root+'/browser-diagnostic.mjs';fs.writeFileSync(selected,code);
 }
 const output=cp.execFileSync('nsenter',['-t',pid,'-n',process.execPath,selected],{encoding:'utf8',timeout:180000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,PAIRDROP_CHECK_ORIGIN:'http://127.0.0.1:33124',PAIRDROP_FORCE_RELAY:''}});
 assert(output.includes('exact-byte WebRTC transfer passed'));
 fs.writeFileSync(root+(baseline?'/application-baseline.json':'/application.json'),JSON.stringify({passed:true,date:new Date().toISOString(),base:b.base,imageId:b.imageId,fixture,fixtureSha256:createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'),twoBrowsers:true,exactByteTransfer:true,mode:'direct',externalRequests:0,productionChanged:false,network:'Docker internal-only bridge; browsers enter isolated namespace; empty STUN/TURN list',limitations:'Two Chromium sessions on one Linux host; no new physical phone/different-network verification.'},null,2)+'\n');
 console.log('PairDrop: two-browser discovery, approval and exact-byte direct transfer passed');
}catch(e){fs.writeFileSync(root+'/application-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error('Private PairDrop test failed; diagnostic retained');}
finally{if(created)docker('rm','-f',name);if(net)docker('network','rm',network);}
