// Maintainer-only exact release with the established native/namespace rollback.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,spec,sha,read,docker,inspect} from './common.mjs';
import {canonical} from '../go-final/release.mjs';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup,namespaceDependents,replaceImagePins} from '../language-final/release.mjs';
process.umask(0o077);
const mode=process.argv[2];assert(['prepare','apply'].includes(mode)&&process.argv.length===3);
const target=spec.container,composeFile='/home/ubuntu/freetools/deployment/calendar/compose.gathio.yaml',file=root+'/release.json';
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=row=>{const {image,...other}=row;return sha(JSON.stringify(canonical(other)));};
const save=r=>{fs.writeFileSync(file+'.tmp',JSON.stringify(r,null,2)+'\n');fs.renameSync(file+'.tmp',file);};
const n=read(root+'/native-build.json'),b=read(root+'/stage.json'),a=read(root+'/application.json'),s=read(root+'/source-offer.json');
for(const proof of [n,b,a]){assert.equal(proof.status,'passed');assert(Date.now()-Date.parse(proof.date)<86400000);}
assert.equal(n.version,spec.version);assert(n.serialFullBuildAndTests&&n.nativeCompiledAgainstOriginalHeaders);assert.equal(n.buildLogSha256,sha(fs.readFileSync(root+'/build.log')));
assert.equal(n.authenticatedSha256,sha(fs.readFileSync(root+'/source/authenticated.json')));
for(const[name,digest]of Object.entries(spec.sourceFiles))assert.equal(sha(fs.readFileSync(root+'/source/'+name)),digest);
assert(n.vendor.includes(spec.adjustedPatchSha256+'  debian/patches/utilibre-CVE-2018-11205.patch'));
assert.equal(b.nativeSha256,sha(fs.readFileSync(root+'/native-build.json')));assert.equal(b.base,spec.base);assert.equal(a.image,b.image);assert.equal(inspect(b.candidate).Id,b.image);assert.equal(inspect(spec.baseRef).Id,spec.base);
assert(b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.priorRuntimeBytesUnchanged&&b.oldHeaderNativeRoundtrips);
for(const f of spec.libraries)for(const key of ['symbols','soname','needed'])assert.deepEqual(b.newAbi[f][key],b.oldAbi[f][key]);
for(const key of ['hdf5NativeRoundtrips','upstreamFlatGeobuf','documentdbTypedData','nativeRasterExportImport','geometryProjection','readOnlyRoleAndDeniedDelete'])assert(a[key],key);
assert(a.drivers>100&&a.cases.length===4&&a.cases.every(c=>c.status===0)&&a.syntheticDumpRestoreSha256);assert.equal(a.network,'none');assert(a.fictionalDataOnly);
assert(s.published);for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert.equal(sha(fs.readFileSync(dir+'/'+s.filename)),s.sha256);
const proofs=Object.fromEntries(['native-build','stage','application','source-offer'].map(p=>[p,sha(fs.readFileSync(root+'/'+p+'.json'))]));
const native=()=>docker('exec',target,'psql','-U','gathio','-d','postgres','-v','ON_ERROR_STOP=1','-Atc',"SELECT current_setting('server_version')||'|'||postgis_lib_version()||'|'||(SELECT extversion FROM pg_extension WHERE extname='documentdb');");
async function gate(g,which){
 await checkExistingGroup(g,which);
 for(const pkg of spec.packages)assert.equal(docker('exec',target,'dpkg-query','-W','-f=${Version}',pkg),which==='new'?spec.version:'1.10.8+repack1-1');
 for(const f of spec.libraries)assert.equal(docker('exec',target,'sha256sum','/usr/lib/x86_64-linux-gnu/'+f).split(/\s/)[0],b[which==='new'?'newAbi':'oldAbi'][f].sha256);
 assert.equal(native(),g.nativeBefore);let okay=false;
 for(let i=0;i<30;i++){try{const r=await fetch('http://10.10.1.43:3198/',{redirect:'manual',signal:AbortSignal.timeout(10000)});await r.body?.cancel();if(r.status===200){okay=true;break;}}catch{}await new Promise(r=>setTimeout(r,1000));}assert(okay);
}
if(mode==='prepare'){
 assert(!fs.existsSync(file));const live=inspect(target),labels=live.Config.Labels;assert.equal(live.Image,spec.base);
 const g={project:labels['com.docker.compose.project'],cwd:labels['com.docker.compose.project.working_dir'],files:labels['com.docker.compose.project.config_files'].split(','),rows:[],before:[],status:'prepared',nativeBefore:native()};
 assert.equal(g.project,'utilibre-gathio');assert.deepEqual(g.files,[composeFile]);assert.equal(labels['com.docker.compose.service'],'postgres');const cfg=config(g);assert.equal(cfg.postgres.image,spec.baseRef);
 g.rows.push({name:target,key:'gathio-hdf5',service:'postgres',oldRef:spec.baseRef,oldImage:spec.base,newRef:b.candidate,newImage:b.image,configHash:hash(cfg.postgres)});
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));
 for(const {container:x,parent}of namespaceDependents(all,new Set([target]))){assert.equal(x.Config.Labels['com.docker.compose.project'],g.project);const service=x.Config.Labels['com.docker.compose.service'],c=cfg[service];assert.equal(inspect(c.image).Id,x.Image);g.rows.push({name:x.Name.slice(1),service,oldRef:c.image,newRef:c.image,oldImage:x.Image,newImage:x.Image,configHash:hash(c),namespaceParent:parent});}
 await gate(g,'old');save({date:new Date().toISOString(),status:'prepared',proofs,groups:[g]});console.log('Exact HDF5 release prepared; production/config unchanged.');
}else{
 const r=read(file);assert.equal(r.status,'prepared');assert.equal(r.groups.length,1);assert.deepEqual(r.proofs,proofs);assert(Date.now()-Date.parse(r.date)<86400000);const g=r.groups[0];
 const validate=()=>{assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);const cfg=config(g);for(const row of g.rows){assert.equal(hash(cfg[row.service]),row.configHash);assert([row.oldRef,row.newRef].includes(cfg[row.service].image));assert.equal(inspect(row.oldRef).Id,row.oldImage);assert.equal(inspect(row.newRef).Id,row.newImage);}};
 const repin=reverse=>{const result=replaceImagePins(fs.readFileSync(composeFile,'utf8'),[{from:reverse?b.candidate:spec.baseRef,to:reverse?spec.baseRef:b.candidate}]);assert.equal(result.replaced,1);fs.writeFileSync(composeFile,result.text);};
 let rollback=false;await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(r),recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:which=>gate(g,which),rollbackPins:()=>{validate();rollback=true;repin(true);}});
 g.completedAt=new Date().toISOString();r.status='passed';r.completedAt=g.completedAt;save(r);console.log('Native HDF5 exact bytes and existing Gathio health passed.');
}
