// Root-maintainer-only, one explicitly selected service. Prepare is read-only.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,version,oldVersion,sha,read,docker,inspect} from './common.mjs';
import {canonical} from '../go-final/release.mjs';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup,namespaceDependents,replaceImagePins} from '../language-final/release.mjs';
process.umask(0o077);
const [mode,key]=process.argv.slice(2);assert(['prepare','apply'].includes(mode)&&/^(actual|gathio|rallly|kuma|wishlist|resume|rssbridge|cryptpad)$/.test(key)&&process.argv.length===4);
const dir=root+'/images/'+key,file=dir+'/release.json',s=read(dir+'/stage.json'),n=read(root+'/native.json'),a=read(dir+'/application.json'),c=read(dir+'/consumer.json'),o=read(root+'/source-offer.json'),e=read(root+'/upstream-exception.json');
assert.equal(s.status,'passed');assert(a.passed&&c.passed);assert.equal(a.imageId,s.image);assert.equal(c.imageId,s.image);assert.equal(c.cases.length,6);
assert.equal(n.status,'passed');assert.equal(n.version,version);assert(n.exactExportsPreserved&&n.sonameAndNeededPreserved&&n.bookwormLibcCompatible);assert.equal(n.checks.length,12);assert.equal(n.exports,312);
assert.equal(s.nativeSha256,sha(fs.readFileSync(root+'/native.json')));assert.equal(c.nativeSha256,s.nativeSha256);
assert(s.configurationUnchanged&&s.unrelatedPackagesUnchanged&&s.priorRuntimeBytesUnchanged);assert(e.baselineAndCandidateSameFailure&&e.candidateFailures===1);
assert(o.published);for(const path of ['/opt/utilibre/toolbox-public/','/opt/utilibre/records/public/'])assert.equal(sha(fs.readFileSync(path+o.filename)),o.sha256);
assert.equal(inspect(s.candidate).Id,s.image);assert.equal(inspect(s.baseRef).Id,s.base);
for(const p of [s,n,a,c])assert(Date.now()-Date.parse(p.date)<86400000,'Fresh exact candidate evidence required');
const proofs=Object.fromEntries([['stage',dir+'/stage.json'],['application',dir+'/application.json'],['consumer',dir+'/consumer.json'],['native',root+'/native.json'],['source',root+'/source-offer.json'],['upstreamException',root+'/upstream-exception.json'],['releaseScript',new URL(import.meta.url).pathname]].map(([name,path])=>[name,sha(fs.readFileSync(path))]));
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=row=>{const{image,...other}=row;return sha(JSON.stringify(canonical(other)));};
const save=r=>{fs.writeFileSync(file+'.tmp',JSON.stringify(r,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
async function gate(g,which){
 await checkExistingGroup(g,which);
 for(const pkg of ['libmount1','mount'])assert.equal(docker('exec',s.name,'dpkg-query','-W','-f=${Version}',pkg),which==='new'?version:oldVersion);
 if(which==='new')assert.equal(docker('exec',s.name,'sha256sum',n.libraryPath).split(/\s/)[0],n.librarySha256);
 assert.equal(docker('exec',s.name,'dpkg','--audit'),'');
}
if(mode==='prepare'){
 assert(!fs.existsSync(file));assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const live=inspect(s.name),labels=live.Config.Labels;assert.equal(live.Image,s.base);
 const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),rows:[],before:[],status:'prepared'};
 assert(g.cwd.startsWith('/home/ubuntu/freetools/deployment/'));assert(g.files.every(f=>f.startsWith(g.cwd+'/')&&f.endsWith('.yaml')));
 const service=labels['com.docker.compose.service'],cfg=config(g);assert.equal(cfg[service].image,s.baseRef);
 g.rows.push({name:s.name,key:key+'-mount',service,oldRef:s.baseRef,oldImage:s.base,newRef:s.candidate,newImage:s.image,configHash:hash(cfg[service])});
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
 for(const{container:x,parent}of namespaceDependents(all,new Set([s.name]))){
  assert.equal(x.Config.Labels['com.docker.compose.project'],g.project);const service=x.Config.Labels['com.docker.compose.service'],row=cfg[service];assert.equal(inspect(row.image).Id,x.Image);
  g.rows.push({name:x.Name.slice(1),service,oldRef:row.image,newRef:row.image,oldImage:x.Image,newImage:x.Image,configHash:hash(row),namespaceParent:parent});
 }
 await gate(g,'old');save({schema:1,date:new Date().toISOString(),status:'prepared',key,proofs,groups:[g],dataMigration:false,rollback:'Exact predecessor image, unchanged volumes and service configuration; no data rollback required by this native dependency-only change.'});
 console.log(key+': source, native, application and exact baseline prepared; no production change.');
}else{
 const r=read(file);assert.equal(r.status,'prepared');assert.deepEqual(r.proofs,proofs);assert(Date.now()-Date.parse(r.date)<86400000);const g=r.groups[0];assert.equal(r.groups.length,1);
 const validate=()=>{assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);const cfg=config(g);for(const row of g.rows){assert.equal(hash(cfg[row.service]),row.configHash);assert([row.oldRef,row.newRef].includes(cfg[row.service].image));assert.equal(inspect(row.oldRef).Id,row.oldImage);assert.equal(inspect(row.newRef).Id,row.newImage);}};
 const repin=reverse=>{let count=0;for(const path of g.files){const out=replaceImagePins(fs.readFileSync(path,'utf8'),[{from:reverse?s.candidate:s.baseRef,to:reverse?s.baseRef:s.candidate}]);if(out.replaced){assert.equal(out.replaced,1);fs.writeFileSync(path,out.text);count+=out.replaced;}}assert.equal(count,1);};
 let rollback=false;await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(r),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:which=>gate(g,which),rollbackPins:()=>{validate();rollback=true;repin(true);}});
 g.completedAt=new Date().toISOString();r.status='passed';r.completedAt=g.completedAt;save(r);console.log(key+': exact native overlay and existing readiness passed.');
}
