// Reuse the established loopback-only HTTP/TLS peer and native RSS-Bridge
// regressions. No request reaches GitHub or another real content provider.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {output} from './specs.mjs';
process.umask(0o077);
const dir=output+'/rssbridge',b=JSON.parse(fs.readFileSync(dir+'/build.json'));
const name='utilibre-php-rssbridge-fixture',scratch=fs.mkdtempSync('/tmp/utilibre-php-rssbridge-');
const source=path.resolve('deployment/maintenance/bookworm-curl-followup');
const run=(exe,args)=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:60000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/application-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Isolated RSS-Bridge check failed; diagnostic retained');}};
const docker=(...a)=>run('docker',a),limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--memory-swap','256m','--cpus','.5','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=16m,mode=1777'];
assert.equal(docker('image','inspect','--format','{{.Id}}',b.candidate),b.imageId);
assert.equal(docker('ps','-aq','--filter','name=^/'+name+'$'),'');
const fixtureId=docker('image','inspect','--format','{{.Id}}','utilibre-kuma:urllib3-security-20261012');
let created=false;
try{
 run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',scratch+'/key.pem','-out',scratch+'/cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,DNS:github.com']);fs.chmodSync(scratch+'/cert.pem',0o644);
 docker('run','-d','--name',name,...limits,'--network','none','--user','0','-v',scratch+':/fixture:ro','-v',source+'/impersonate-fixture.mjs:/fixture.mjs:ro','--entrypoint','node',fixtureId,'/fixture.mjs');created=true;
 for(let i=0;i<30;i++){try{docker('exec',name,'node','-e',"fetch('http://127.0.0.1:18080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))");break;}catch{if(i===29)throw Error('Fixture did not start');await new Promise(r=>setTimeout(r,200));}}
 const proofs=[];
 for(const id of [b.base,b.imageId]){
  const opts=['run','--rm',...limits,'--network','container:'+name,'--user','33:33','--tmpfs','/app/cache:rw,size=32m,uid=33,gid=33','-v',scratch+'/cert.pem:/ca.pem:ro','-v',source+'/impersonate-native.php:/native.php:ro','-v',source+'/impersonate-feed.php:/feed.php:ro','-v',path.resolve('deployment/community/rssbridge.ini.php')+':/app/config.ini.php:ro','--entrypoint','php'];
  const native=JSON.parse(docker(...opts,id,'/native.php'));assert(native.checks===12&&native.http2Negotiated&&native.chrome131Preserved&&native.unsupportedProtocolsRejected&&native.phpOpenSslPassed);
  assert.equal(docker(...opts,id,'/feed.php'),'RSSBRIDGE_FICTIONAL_GITHUB_HTTPS_TO_ATOM_PASSED');proofs.push({imageId:id,...native,fictionalFeed:true});
 }
 assert.deepEqual(proofs[0].version,proofs[1].version);
 fs.writeFileSync(dir+'/application.json',JSON.stringify({date:new Date().toISOString(),imageId:b.imageId,passed:true,fixtureId,proofs,checks:['Native HTTP/redirect/gzip/POST','TLS and HTTP/2','Unsupported protocol rejection','Preserved curl impersonation and PHP OpenSSL','Fictional GithubTrending-to-Atom feed'],network:'fixture namespace with no external interface',limitations:['No real remote feed queried','No HTTP/3 transfer tested']},null,2)+'\n');
 console.log('RSS-Bridge native HTTP/TLS/HTTP2 and fictional Atom feed passed on baseline and candidate');
}finally{if(created)docker('rm','-f',name);fs.rmSync(scratch,{recursive:true,force:true});}
