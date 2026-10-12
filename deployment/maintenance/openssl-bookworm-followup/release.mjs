// Explicitly scoped native OpenSSL release, using the established rollback gates.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,releaseGroup,rollbackFiles,existingComposeArgs,checkExistingGroup,recreateExistingGroup} from '../language-final/release.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012',file='/var/lib/utilibre-maintenance/closure-followup-20261012/openssl-bookworm-release.json';
const [mode,key]=process.argv.slice(2),version='3.0.22-1~deb12u1+utilibre1';assert(['prepare','apply'].includes(mode));assert.equal(process.argv.length,4);
const specs=JSON.parse(fs.readFileSync(new URL('./specs.json',import.meta.url))),spec=specs.find(s=>s.key===key);assert(spec);
const allowed={
 kuma:{project:'utilibre-community',service:'uptime-kuma',file:'/home/ubuntu/freetools/deployment/community/compose.yaml',url:'http://10.10.1.43:3125/status/utilibre'},
 rallly:{project:'utilibre-community',service:'rallly',file:'/home/ubuntu/freetools/deployment/community/compose.yaml',url:'http://10.10.1.43:3123/login'},
 rssbridge:{project:'utilibre-community',service:'rssbridge',file:'/home/ubuntu/freetools/deployment/community/compose.yaml',url:'https://bridge.utilibre.org/'},
 wishlist:{project:'utilibre-wishlist',service:'app',file:'/home/ubuntu/freetools/deployment/wishlist/compose.yaml',url:'https://wishlist.utilibre.org/login'},
 gathio:{project:'utilibre-gathio',service:'postgres',file:'/home/ubuntu/freetools/deployment/calendar/compose.gathio.yaml',url:'http://10.10.1.43:3198/'}
};assert(allowed[key]);
const read=f=>JSON.parse(fs.readFileSync(f)),sha=v=>createHash('sha256').update(v).digest('hex'),digest=v=>sha(JSON.stringify(canonical(v)));
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,APP_BIND_IP:'10.10.1.43'}}).trim();}catch{throw Error('Bounded Docker operation failed; private configuration withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0],config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=row=>{const {image,...rest}=row;return digest(rest);},save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
function proofs(s){
 const location=dir+'/images/'+s.key,paths=['build','native','application',...(s.key==='rssbridge'?['impersonate']:[])].map(n=>location+'/'+n+'.json'),[b,n,a,v]=paths.map(read);
 for(const p of [b,n,a,...(v?[v]:[])]){assert(p.passed);assert.equal(p.imageId,b.imageId);assert(Date.now()-Date.parse(p.date)<86400000);}
 assert(b.configurationUnchanged&&n.abiPreserved);assert.equal(b.version,version);assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(inspect(s.candidate).Id,b.imageId);assert.equal(inspect(s.baseRef).Id,s.base);
 assert.equal(b.abi.length,2);assert(b.abi.every(x=>x.preservedSymbols>100));assert.deepEqual(n.upstreamSuites,[{files:259,tests:2980},{files:259,tests:3415}]);
 assert.equal(n.native.length,2);for(const x of n.native){assert(x.passed&&x.nativeCrypto&&x.tls12And13AndWrongHost);assert.equal(x.dtls.length,2);assert(x.dtls.every(t=>t.passed&&t.expected===(x.image===s.base?'old native regression reproduced':'fixed native state preserved')));if(s.key!=='wishlist')assert.equal(x.systemCurlTransfers,7);}
 assert.equal(n.native[1].image,b.imageId);assert.deepEqual(b.packages.map(p=>p.name),s.packages);assert(b.packages.every(p=>p.version===version));
 if(['kuma','gathio'].includes(s.key)){assert(n.native.every(x=>x.nativePythonTls.passed&&x.nativePythonTls.checks.length===11));assert(a.fictionalDataOnly&&a.network==='none');if(s.key==='kuma')assert(a.nativeSetupLogin&&a.noNotificationSent);else assert(a.nativeTypedDataAndIsolation&&a.logicalRestore&&a.nativePostgresTlsAndWrongHost&&a.nativePostgisProjection&&a.nativeSdkTls.passed&&a.nativeSdkTls.nativeSigV4VerifiedIndependently&&a.nativeSdkTls.nativeBarmanUploadListReadDownload);}
 if(s.key==='rallly')assert(a.nativeMigrations&&a.fictionalInviteRendered);
 if(s.key==='wishlist')assert(a.nativeBlankDatabaseStartup&&a.nativeAccountCreated&&a.listCreated&&a.itemCreated&&a.reloadPersistence&&a.anonymousListDenied&&a.fictionalDataOnly);
 if(s.key==='rssbridge'){
  assert(a.nativeHomepage&&v.configurationUnchanged);assert.equal(v.proofs.length,2);for(const p of v.proofs)assert(p.checks===12&&p.http2Negotiated&&p.chrome131Preserved&&p.unsupportedProtocolsRejected&&p.phpOpenSslPassed&&p.fictionalGithubHttpsToAtom);
  assert.equal(sha(fs.readFileSync('/home/ubuntu/freetools/deployment/community/rssbridge.ini.php')),v.configSha256);
 }
 for(const field of ['applicationSha256','etcSha256','unrelatedLibrariesSha256','algorithmsSha256'])assert.match(b[field],/^[a-f0-9]{64}/);
 return {b,hashes:Object.fromEntries(paths.map(p=>[p,sha(fs.readFileSync(p))]))};
}
async function http(url){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(12000)});await r.body?.cancel();return r.status;}
async function gate(g,which){
 await checkExistingGroup(g,which);const row=g.rows.find(r=>r.key!=='namespace-companion'),s=specs.find(s=>s.key===row.key),b=read(dir+'/images/'+row.key+'/build.json');
 for(const lib of b.abi)assert.equal(docker('exec',row.name,'sha256sum',lib.path).split(' ')[0],lib[which==='new'?'newSha256':'oldSha256']);
 const versions=docker('exec',row.name,'dpkg-query','-W','-f=${binary:Package}\t${Version}\n',...s.packages).split('\n');assert.equal(versions.length,s.packages.length);for(const line of versions)assert.equal(line.split('\t')[1],which==='new'?version:'3.0.22-1~deb12u1');
 assert.match(docker('exec',row.name,'openssl','list','-providers'),/default/);
 if(row.key==='rssbridge'){
  const x=inspect(row.name);assert(x.Config.Env.includes('CURL_IMPERSONATE=chrome131'));assert(x.Config.Env.includes('LD_PRELOAD=/usr/local/lib/curl-impersonate/libcurl-impersonate.so'));
  assert.equal(docker('exec',row.name,'php','-r','echo curl_version()["version"]," ",curl_version()["ssl_version"];'),'8.22.0-IMPERSONATE BoringSSL');
  assert.equal(docker('exec',row.name,'sha256sum','/usr/local/lib/curl-impersonate/libcurl-impersonate.so').split(' ')[0],'3e30f8c2978706f169c90faf061d5ee7ef6ea6bdd4e296d8de6df4aa478cff19');
  assert.equal(docker('exec',row.name,'sha256sum','/app/config.ini.php').split(' ')[0],read(dir+'/images/rssbridge/impersonate.json').configSha256);
 }
 let recovered=false;for(let n=0;n<30;n++){try{if(await http(g.url)===g.httpBefore){recovered=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert(recovered,'Existing public application did not recover');
}
if(mode==='prepare'){
 const report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),status:'prepared',groups:[]};assert(!report.groups.some(g=>g.rows.some(r=>r.key===key)));assert(report.groups.every(g=>g.status==='passed'));
 const a=allowed[key],{b,hashes}=proofs(spec),live=inspect(spec.container),labels=live.Config.Labels;assert.equal(live.Image,spec.base);
 const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),rows:[],before:[],status:'prepared',url:a.url,proofs:hashes};
 assert.equal(g.project,a.project);assert.deepEqual(g.files,[a.file]);assert.equal(labels['com.docker.compose.service'],a.service);
 const cfg=config(g),c=cfg[a.service];assert.equal(c.image,spec.baseRef);
 g.rows.push({name:spec.container,key,service:a.service,oldRef:spec.baseRef,oldImage:spec.base,newRef:spec.candidate,newImage:b.imageId,configHash:hash(c),verification:dir+'/images/'+key+'/native.json'});
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));for(const {container:x,parent} of namespaceDependents(all,new Set([spec.container]))){
  const l=x.Config.Labels;assert.equal(l['com.docker.compose.project'],g.project,'Unreviewed namespace companion');const service=l['com.docker.compose.service'],c=cfg[service];assert.equal(inspect(c.image).Id,x.Image);
  g.rows.push({name:x.Name.slice(1),key:'namespace-companion',service,oldRef:c.image,newRef:c.image,oldImage:x.Image,newImage:x.Image,configHash:hash(c),namespaceParent:parent});
 }
 g.httpBefore=await http(g.url);assert.equal(g.httpBefore,200);await gate(g,'old');report.groups.push(g);report.date=new Date().toISOString();report.status='prepared';delete report.completedAt;save(report);console.log(key+': exact OpenSSL candidate prepared; production unchanged.');
}else{
 const report=read(file);assert(Date.now()-Date.parse(report.date)<86400000);const selected=report.groups.filter(g=>g.rows.some(r=>r.key===key));assert.equal(selected.length,1);const g=selected[0];assert.deepEqual(proofs(spec).hashes,g.proofs);
 assert.equal(g.project,allowed[key].project);assert.deepEqual(g.files,[allowed[key].file]);if(g.status==='passed'){await gate(g,'new');console.log(key+': already released and live gate passed.');process.exit(0);}assert.equal(g.status,'prepared');
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3,'8 GiB recovery floor');
 const validate=()=>{const cfg=config(g);for(const r of g.rows){assert.equal(hash(cfg[r.service]),r.configHash);assert([r.oldRef,r.newRef].includes(cfg[r.service].image));assert.equal(inspect(r.oldRef).Id,r.oldImage);assert.equal(inspect(r.newRef).Id,r.newImage);}};
 const repin=reverse=>{const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r[reverse?'newRef':'oldRef'],to:r[reverse?'oldRef':'newRef']}));let count=0;for(const path of rollbackFiles(g)){const next=replaceImagePins(fs.readFileSync(path,'utf8'),pairs);if(next.replaced){assert.equal(next.replaced,1);fs.writeFileSync(path,next.text);count+=next.replaced;}}assert.equal(count,1,'Exactly one reviewed image scalar');};
 let rollback=false;await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(report),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:which=>gate(g,which),rollbackPins:()=>{validate();rollback=true;repin(true);}});
 g.completedAt=new Date().toISOString();assert(report.groups.every(g=>g.status==='passed'));report.status='passed';report.completedAt=g.completedAt;save(report);console.log(key+': native OpenSSL DTLS repair live; exact image, ABI bytes and public health passed.');
}
