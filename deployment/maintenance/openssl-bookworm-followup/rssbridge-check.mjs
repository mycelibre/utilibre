// Retest real PHP/OpenSSL and unchanged native impersonation consumer separately.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012',out=dir+'/images/rssbridge',here=new URL('.',import.meta.url).pathname,upstream=here+'../bookworm-curl-followup/';
const b=JSON.parse(fs.readFileSync(out+'/build.json')),spec=JSON.parse(fs.readFileSync(here+'specs.json')).find(s=>s.key==='rssbridge');
const docker=a=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(out+'/impersonate-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Native RSSBridge gate failed; private diagnostics retained.');}};
assert.equal(docker(['image','inspect','--format','{{.Id}}',spec.candidate]),b.imageId);assert(!fs.existsSync(out+'/impersonate.json'));
const fixture='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/impersonate/fixture',name='maintenance-openssl-rssbridge-fixture',limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=16m,mode=1777'];
docker(['run','-d','--name',name,...limits,'--network','none','--user','0','--mount','type=bind,src='+fixture+',dst=/fixture,readonly','--mount','type=bind,src='+upstream+'impersonate-fixture.mjs,dst=/fixture.mjs,readonly','--entrypoint','node','utilibre-kuma:python-expat-security-20261012','/fixture.mjs']);
const proofs=[];
try{
 for(let n=0;n<40;n++){try{docker(['exec',name,'node','-e',"fetch('http://127.0.0.1:18080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]);break;}catch{if(n===39)throw Error('Fixture not ready');await new Promise(r=>setTimeout(r,200));}}
 for(const image of [spec.base,b.imageId]){
  const args=['run','--rm',...limits,'--network','container:'+name,'--user','33:33','--tmpfs','/app/cache:rw,size=32m,uid=33,gid=33','--mount','type=bind,src='+fixture+'/cert.pem,dst=/ca.pem,readonly','--mount','type=bind,src='+upstream+'impersonate-native.php,dst=/native.php,readonly','--mount','type=bind,src='+upstream+'impersonate-feed.php,dst=/feed.php,readonly','--mount','type=bind,src=/home/ubuntu/freetools/deployment/community/rssbridge.ini.php,dst=/app/config.ini.php,readonly','--entrypoint','php'];
  const n=JSON.parse(docker([...args,image,'/native.php']));assert.equal(n.checks,12);assert(n.http2Negotiated&&n.chrome131Preserved&&n.unsupportedProtocolsRejected&&n.phpOpenSslPassed);assert.equal(n.version.version,'8.22.0-IMPERSONATE');
  assert.equal(docker([...args,image,'/feed.php']),'RSSBRIDGE_FICTIONAL_GITHUB_HTTPS_TO_ATOM_PASSED');
  const sum=docker(['run','--rm',...limits,'--network','none','--entrypoint','sha256sum',image,'/usr/local/lib/curl-impersonate/libcurl-impersonate.so']).split(' ')[0];assert.equal(sum,'3e30f8c2978706f169c90faf061d5ee7ef6ea6bdd4e296d8de6df4aa478cff19');proofs.push({image,...n,fictionalGithubHttpsToAtom:true,librarySha256:sum});
 }
 const configSha256=createHash('sha256').update(fs.readFileSync('/home/ubuntu/freetools/deployment/community/rssbridge.ini.php')).digest('hex');assert.equal(configSha256,'2de06f7bd279a7c05dcdf4fe005cce7651c7de1fe26e0bd1dcdd1e3842ef7999');
 fs.writeFileSync(out+'/impersonate.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,configurationUnchanged:true,configSha256,proofs,limitations:'Fictional local feed only; no external source requested. Existing impersonation/BoringSSL bytes and HTTP(S)-only scope unchanged.'},null,2)+'\n');console.log('RSSBridge actual PHP crypto, HTTP/2, chrome131, protocol denials and Atom conversion passed.');
}finally{docker(['rm','-f',name]);}
