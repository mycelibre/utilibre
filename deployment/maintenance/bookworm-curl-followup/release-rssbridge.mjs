// Explicitly authorized, single-service release. No other service or setting changes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {existingComposeArgs,namespaceDependents,replaceImagePins,readinessSeconds,releaseGroup} from '../language-final/release.mjs';
process.umask(0o077);
const evidence='/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/images/rssbridge';
const receipt='/var/lib/utilibre-maintenance/closure-followup-20261012/rssbridge-curl-release.json';
const read=f=>JSON.parse(fs.readFileSync(f)),hash=b=>createHash('sha256').update(b).digest('hex'),canonicalHash=v=>hash(JSON.stringify(canonical(v)));
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:12*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded release operation failed; private configuration withheld.');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0],image=n=>docker('image','inspect',n,'--format','{{.Id}}');
const configuration=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services.rssbridge;
const configHash=c=>{const {image,...rest}=c;return canonicalHash(rest);};
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
const b=read(evidence+'/build.json'),n=read(evidence+'/native.json'),a=read(evidence+'/application.json'),v=read(evidence+'/impersonate.json');
function proofGate(){
 for(const p of [b,n,a,v]){assert(p.passed);assert.equal(p.imageId,b.imageId);assert(Date.now()-Date.parse(p.date)<86400000);}
 assert(b.configurationUnchanged&&n.abiPreserved&&a.nativeHomepage);assert.equal(v.release,'v2.2.3');assert.equal(v.sourceCommit,'6e8f87760a4dd96771e96fc9d55440dcd8845243');
 assert.equal(v.removedMask,16);assert.deepEqual(v.removedProtocols,['smb','smbs']);assert.equal(v.proofs.length,2);
 for(const p of v.proofs)assert(p.checks===12&&p.http2Negotiated&&p.chrome131Preserved&&p.unsupportedProtocolsRejected&&p.phpOpenSslPassed&&p.fictionalGithubHttpsToAtom);
 assert.equal(hash(fs.readFileSync('/home/ubuntu/freetools/deployment/community/rssbridge.ini.php')),v.configSha256);
 assert.equal(image(b.candidate),b.imageId);assert.equal(image(b.baseRef),b.base);
 assert.equal(canonicalHash(inspect(b.base).Config),canonicalHash(inspect(b.imageId).Config));
}
let report=fs.existsSync(receipt)?read(receipt):{date:new Date().toISOString(),status:'prepared',groups:[]};
const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
async function gate(g,which){
 const r=g.rows[0],limit=readinessSeconds([inspect(r.name)]);
 for(let attempt=0;attempt<limit;attempt++)try{
  const x=inspect(r.name);assert.equal(x.Image,r[which+'Image']);assert(x.State.Running);assert(x.RestartCount<=(which==='old'?r.oldRestarts:0));assert(Date.now()-Date.parse(x.State.StartedAt)>4000);if(x.State.Health)assert.equal(x.State.Health.Status,'healthy');
  assert(x.Config.Env.includes('CURL_IMPERSONATE=chrome131'));assert(x.Config.Env.includes('LD_PRELOAD=/usr/local/lib/curl-impersonate/libcurl-impersonate.so'));
  assert.equal(docker('exec',r.name,'sha256sum','/app/config.ini.php').split(' ')[0],v.configSha256);
  assert.equal(docker('exec',r.name,'sha256sum','/app/lib/http.php').split(' ')[0],'904e8888021424a190fa5e91d496ad93276dadfe62afa7d0b8496ee3d79c25ad');
  assert.equal(docker('exec',r.name,'php','-r','echo curl_version()["version"]," ",curl_version()["ssl_version"];'),(which==='new'?'8.22.0':'8.13.0')+'-IMPERSONATE BoringSSL');
  assert.equal(docker('exec',r.name,'sha256sum','/usr/local/lib/curl-impersonate/libcurl-impersonate.so').split(' ')[0],which==='new'?v.newLibrarySha256:v.oldLibrarySha256);
  if(which==='new')assert.equal(docker('exec',r.name,'dpkg-query','-W','-f=${Version}','libcurl4'),b.version);
  cp.execFileSync('systemctl',['is-active','--quiet','utilibre-tools-firewall.service']);
  const response=await fetch('https://bridge.utilibre.org/',{signal:AbortSignal.timeout(12000)});assert.equal(response.status,200);assert((await response.text()).includes('RSS-Bridge'));return;
 }catch{if(attempt===limit-1)throw Error('RSSBridge exact-image/native/config/HTTPS health gate failed');await new Promise(resolve=>setTimeout(resolve,1000));}
}
function repin(g,from,to){
 assert.deepEqual(g.files,['/home/ubuntu/freetools/deployment/community/compose.yaml']);
 const file=g.files[0],text=fs.readFileSync(file,'utf8'),changed=replaceImagePins(text,[{from,to}]);assert.equal(changed.replaced,1,'Only one exact RSSBridge scalar may change');fs.writeFileSync(file,changed.text);
}
proofGate();
if(mode==='prepare'){
 assert.equal(report.groups.length,0);const x=inspect('utilibre-community-rssbridge-1'),l=x.Config.Labels;
 assert.equal(x.Image,b.base);assert.equal(l['com.docker.compose.service'],'rssbridge');assert.equal(l['com.docker.compose.project'],'utilibre-community');
 const g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared',preparedAt:new Date().toISOString()};
 assert.equal(g.cwd,'/home/ubuntu/freetools/deployment/community');assert.deepEqual(g.files,[g.cwd+'/compose.yaml']);
 assert.deepEqual(namespaceDependents(JSON.parse(docker('inspect',...docker('ps','-q').split('\n'))),new Set(['utilibre-community-rssbridge-1'])),[],'Unexpected network-namespace companion');
 const c=configuration(g);assert.equal(c.image,b.baseRef);assert.equal(image(c.image),b.base);
 g.rows.push({key:'rssbridge',name:'utilibre-community-rssbridge-1',service:'rssbridge',oldRef:c.image,oldImage:b.base,newRef:b.candidate,newImage:b.imageId,oldRestarts:x.RestartCount,configHash:configHash(c),verification:evidence,impersonationReceipt:evidence+'/impersonate.json'});
 await gate(g,'old');report.groups.push(g);save();console.log('RSSBridge exact candidate prepared; no live mutation.');
}else{
 assert.equal(report.groups.length,1);const g=report.groups[0],r=g.rows[0];
 if(g.status==='passed'){await gate(g,'new');console.log('RSSBridge already released; exact live gate passed.');process.exit(0);}
 assert.equal(g.status,'prepared');assert(Date.now()-Date.parse(g.preparedAt)<86400000);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 let rollback=false;
 const validate=()=>{proofGate();assert.equal(configHash(configuration(g)),r.configHash);assert([r.oldRef,r.newRef].includes(configuration(g).image));};
 await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save,recreate:()=>{validate();if(!rollback)repin(g,r.oldRef,r.newRef);docker(...existingComposeArgs(g),'up','-d','--force-recreate','--no-deps','--no-build','--pull','never','rssbridge');},gate:which=>gate(g,which),rollbackPins:()=>{rollback=true;validate();repin(g,r.newRef,r.oldRef);}});
 g.completedAt=new Date().toISOString();report.status='passed';report.completedAt=g.completedAt;save();console.log('RSSBridge deployed: exact image, native impersonation, unchanged HTTP(S)-only config and HTTPS health passed.');
}
