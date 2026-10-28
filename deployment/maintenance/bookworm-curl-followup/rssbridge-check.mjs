// Isolated native production consumers: system libcurl and preloaded impersonation
// are distinct. This gate covers the latter, including real HTTP/2 negotiation.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {exportedSymbols} from './policy.mjs';
process.umask(0o077);
const oct28=process.argv.includes('--oct28');assert(process.argv.slice(2).every(a=>a==='--oct28'));
const dir=oct28?'/var/lib/utilibre-maintenance/security-20261028/curl-bookworm':'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012',here=new URL('.',import.meta.url).pathname,out=dir+'/images/rssbridge';
const spec=(oct28?JSON.parse(fs.readFileSync(here+'../security-20261028/curl-bookworm-inputs.json')).rows:JSON.parse(fs.readFileSync(here+'specs.json'))).find(s=>s.key==='rssbridge'),build=JSON.parse(fs.readFileSync(out+'/build.json'));
const run=(p,args,o={})=>{try{return cp.execFileSync(p,args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/rssbridge-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('RSSBridge impersonation gate failed; private diagnostics retained.');}};
const docker=a=>run('docker',a),sha=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
assert.equal(docker(['image','inspect','--format','{{.Id}}',spec.candidate]),build.imageId);assert(!fs.existsSync(out+'/impersonate.json'));
const fixture=dir+'/impersonate/fixture';fs.mkdirSync(fixture,{recursive:true});
run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',fixture+'/key.pem','-out',fixture+'/cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,DNS:github.com']);fs.chmodSync(fixture+'/cert.pem',0o644);
const name='maintenance-bookworm-impersonate-fixture',limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=16m,mode=1777'];
const old=dir+'/impersonate/old-library.so',current=out+'/impersonate-runtime/libcurl-impersonate.so.4.8.0';
if(oct28){const c=docker(['create','--entrypoint','true',spec.base]);try{docker(['cp','-L',c+':/usr/local/lib/curl-impersonate/libcurl-impersonate.so.4.8.0',old]);}finally{docker(['rm',c]);}}
const symbolSet=f=>exportedSymbols(run('readelf',['--dyn-syms','--wide',f]));
const oldSymbols=symbolSet(old),newSymbols=symbolSet(current);assert(oldSymbols.size>90);for(const s of oldSymbols)assert(newSymbols.has(s),'Lost preloaded ABI '+s);
const gnuVersions=run('readelf',['--version-info',current]);assert(!/GLIBC_2\.(?:[2-9][0-9]|18|19)/.test(gnuVersions),'Prebuilt must require no newer than glibc2.17');
docker(['run','-d','--name',name,...limits,'--network','none','--user','0','--mount','type=bind,src='+fixture+',dst=/fixture,readonly','--mount','type=bind,src='+here+'impersonate-fixture.mjs,dst=/fixture.mjs,readonly','--entrypoint','node',oct28?'utilibre-kuma:node-security-20261028':'utilibre-kuma:urllib3-security-20261012','/fixture.mjs']);
const proofs=[];
try{
 for(let n=0;n<40;n++){try{docker(['exec',name,'node','-e',"fetch('http://127.0.0.1:18080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);break;}catch{if(n===39)throw Error('Fixture not ready');await new Promise(r=>setTimeout(r,200));}}
 for(const image of [spec.base,build.imageId]){
  const nativeArgs=['run','--rm',...limits,'--network','container:'+name,'--user','33:33','--tmpfs','/app/cache:rw,size=32m,uid=33,gid=33','--mount','type=bind,src='+fixture+'/cert.pem,dst=/ca.pem,readonly','--mount','type=bind,src='+here+'impersonate-native.php,dst=/native.php,readonly','--mount','type=bind,src='+here+'impersonate-feed.php,dst=/feed.php,readonly','--mount','type=bind,src=/home/ubuntu/freetools/deployment/community/rssbridge.ini.php,dst=/app/config.ini.php,readonly','--entrypoint','php'];
  const native=JSON.parse(docker([...nativeArgs,image,'/native.php']));assert.equal(native.checks,12);assert(native.http2Negotiated&&native.chrome131Preserved&&native.unsupportedProtocolsRejected&&native.phpOpenSslPassed);
  assert.equal(docker([...nativeArgs,image,'/feed.php']),'RSSBRIDGE_FICTIONAL_GITHUB_HTTPS_TO_ATOM_PASSED');
  const sources=docker(['run','--rm',...limits,'--network','none','--entrypoint','sh',image,'-ec','sha256sum /app/lib/http.php /app/bridges/GithubTrendingBridge.php /app/bridges/TheGuardianBridge.php /app/bridges/ArsTechnicaBridge.php; ! grep -R -n -E "CURLAUTH_NTLM|CURLPROTO_SMB|NTLM|SMB" /app/lib /app/bridges/GithubTrendingBridge.php /app/bridges/TheGuardianBridge.php /app/bridges/ArsTechnicaBridge.php']);
  assert(sources.startsWith('904e8888021424a190fa5e91d496ad93276dadfe62afa7d0b8496ee3d79c25ad'));
  proofs.push({image,...native,fictionalGithubHttpsToAtom:true,nativeSourceChecksums:sources});
 }
 assert.equal(proofs[0].version.version,oct28?'8.22.0-IMPERSONATE':'8.13.0-IMPERSONATE');assert.equal(proofs[1].version.version,oct28?'8.23.0-IMPERSONATE':'8.22.0-IMPERSONATE');
 assert.equal(proofs[0].nativeSourceChecksums,proofs[1].nativeSourceChecksums);
 const removedMask=(proofs[0].version.features&~proofs[1].version.features)>>>0;
 assert.equal(removedMask,oct28?0:16); // NTLM only; exception scoped to proven HTTP(S)-only RSSBridge.
 const removedProtocols=proofs[0].version.protocols.filter(x=>!proofs[1].version.protocols.includes(x));assert.deepEqual(removedProtocols,oct28?[]:['smb','smbs']);
 const config='/home/ubuntu/freetools/deployment/community/rssbridge.ini.php',configSha256=sha(config);assert.equal(configSha256,'2de06f7bd279a7c05dcdf4fe005cce7651c7de1fe26e0bd1dcdd1e3842ef7999');
 fs.writeFileSync(out+'/impersonate.json',JSON.stringify({date:new Date().toISOString(),imageId:build.imageId,passed:true,release:oct28?'v2.3.1':'v2.2.3',sourceCommit:oct28?'98de20ee6b6ca6f755d59bc502f819079a3c94ac':'6e8f87760a4dd96771e96fc9d55440dcd8845243',oldLibrarySha256:sha(old),newLibrarySha256:sha(current),preservedExports:oldSymbols.size,configSha256,allowedBridges:['GithubTrendingBridge','TheGuardianBridge','ArsTechnicaBridge'],removedMask,removedProtocols,justification:oct28?'No protocol or feature removal from the existing v2.2.3 baseline; actual PHP client, HTTP/2 and fictional feed verified.':'Upstream binary drops NTLM/SMB/SMBS; exact deployed bridges use HTTPS and native CurlHttpClient already prohibits non-HTTP(S) protocols. Both old/new protocol denial and native HTTP/2 + feed journeys passed. This exception must not apply to general libcurl consumers.',proofs,limitations:'No real remote feed queried; fictional native GithubTrending-to-Atom journey. HTTP/2 negotiated; HTTP/3 capability retained but not separately transferred. Vendor upstream complete suite was not rerun. Official prebuilt digest verified; only supported SONAME alteration.'},null,2)+'\n');
 console.log('RSSBridge: old/new native HTTP(S), HTTP/2, chrome131, protocol rejection, PHP OpenSSL and fictional Atom feed passed.');
}finally{docker(['rm','-f',name]);}
