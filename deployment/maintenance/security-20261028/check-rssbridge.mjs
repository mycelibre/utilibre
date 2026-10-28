// Reuse the installed PHP/RSSBridge consumers and existing synthetic fixture.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028',out=root+'/brotli/rssbridge',b=JSON.parse(fs.readFileSync(out+'/build.json'));
const helper=JSON.parse(fs.readFileSync(root+'/brotli/kuma/build.json')).imageId;
const here=new URL('../bookworm-curl-followup/',import.meta.url).pathname;
const run=(p,a)=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(out+'/consumer-error-'+Date.now()+'.log',String(e.stderr||e.message));throw Error('RSSBridge native consumer check failed');}};
const docker=(...a)=>run('docker',a),name='maintenance-brotli-rssbridge-fixture',fixture=fs.mkdtempSync(out+'/fixture-');
const limits=['--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none','--tmpfs','/tmp:rw,size=16m,mode=1777'];
assert(!fs.existsSync(out+'/consumer.json'));assert(b.passed);
const rows=[];
try{
 run('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','2','-keyout',fixture+'/key.pem','-out',fixture+'/cert.pem','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,DNS:github.com']);fs.chmodSync(fixture+'/cert.pem',0o644);
 docker('run','-d','--name',name,...limits,'--network','none','--user','0','-v',fixture+':/fixture:ro','-v',here+'impersonate-fixture.mjs:/fixture.mjs:ro','--entrypoint','node',helper,'/fixture.mjs');
 for(let n=0;n<30;n++){try{docker('exec',name,'node','-e',"fetch('http://127.0.0.1:18080/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))");break;}catch{if(n===29)throw Error('Fixture not ready');await new Promise(r=>setTimeout(r,200));}}
 for(const imageId of [b.base,b.imageId]){
  const a=['run','--rm',...limits,'--network','container:'+name,'--user','33:33','--tmpfs','/app/cache:rw,size=32m,uid=33,gid=33','-v',fixture+'/cert.pem:/ca.pem:ro','-v',here+'impersonate-native.php:/native.php:ro','-v',here+'impersonate-feed.php:/feed.php:ro','-v','/home/ubuntu/freetools/deployment/community/rssbridge.ini.php:/app/config.ini.php:ro','--entrypoint','php',imageId];
  const n=JSON.parse(docker(...a,'/native.php'));assert(n.checks===12&&n.http2Negotiated&&n.phpOpenSslPassed&&n.chrome131Preserved&&n.unsupportedProtocolsRejected);
  assert.equal(docker(...a,'/feed.php'),'RSSBRIDGE_FICTIONAL_GITHUB_HTTPS_TO_ATOM_PASSED');rows.push({imageId,...n,fictionalFeed:true});
 }
 assert.deepEqual(rows[0].version,rows[1].version);
 fs.writeFileSync(out+'/consumer.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,rows,network:'Isolated loopback namespace; no live feeds or production data',limitation:'Checks preserve native behavior. Embedded curl-impersonate dependencies remain a separate assessment.'},null,2)+'\n');console.log('RSSBridge: system-library and real preloaded PHP/feed compatibility passed');
}finally{try{docker('rm','-f',name);}finally{fs.rmSync(fixture,{recursive:true,force:true});}}
