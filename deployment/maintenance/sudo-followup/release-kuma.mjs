// Single native dependency overlay; reuse the established Compose gates.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {dir,spec,run,docker,inspect,sha,oldVersion,version} from './stage-kuma.mjs';
import {existingComposeArgs,checkExistingGroup,recreateExistingGroup,releaseGroup,namespaceDependents,replaceImagePins} from '../language-final/release.mjs';
process.umask(0o077);
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
const read=p=>JSON.parse(fs.readFileSync(p)),file=dir+'/kuma-release.json',save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
const composeFile='/home/ubuntu/freetools/deployment/community/compose.yaml';
const hash=c=>{const {image,...other}=c;return sha(JSON.stringify(other));};
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services['uptime-kuma'];
const b=read(dir+'/kuma-build.json'),n=read(dir+'/bookworm/output/native.json'),a=read(dir+'/kuma-application.json');
assert(b.passed&&a.passed);assert.equal(a.imageId,b.imageId);assert.equal(n.version,version);assert.equal(n.candidateSha256,b.packageHash);
for(const proof of [b,n,a])assert(Date.now()-Date.parse(proof.date)<86400000);
assert.equal(sha(fs.readFileSync(dir+'/bookworm/output/native.json')),b.nativeProofSha256);
assert(b.configurationUnchanged&&b.unrelatedPackagesUnchanged&&b.parserPassed&&b.packageVersionVerified&&b.clickPreserved.passed&&b.clickPreserved.noDelivery);
assert.equal(n.abi.length,14);assert(n.upstreamResults.every(r=>r.errors===0&&r.success===100));
assert(a.nativeSetupLogin&&a.noNotificationSent&&a.fictionalDataOnly&&a.network==='none');
assert.equal(inspect(spec.candidate).Id,b.imageId);assert.equal(inspect(spec.baseRef).Id,spec.base);
const proofs=Object.fromEntries(['kuma-build','kuma-application'].map(p=>[p,sha(fs.readFileSync(dir+'/'+p+'.json'))]));
proofs.native=sha(fs.readFileSync(dir+'/bookworm/output/native.json'));
async function gate(g,which){
 await checkExistingGroup(g,which);
 assert.equal(docker('exec',spec.container,'dpkg-query','-W','-f=${Version}','sudo'),which==='new'?version:oldVersion);
 assert.equal(docker('exec',spec.container,'dpkg-query','-W','-f=${Version}','python3-click'),'8.3.3-3');
 if(which==='new')for(const row of n.abi)assert.equal(docker('exec',spec.container,'sha256sum',row.path).split(/\s/)[0],row.sha256);
 const response=await fetch('http://10.10.1.43:3125/status/utilibre',{redirect:'manual',signal:AbortSignal.timeout(10000)});await response.body?.cancel();assert.equal(response.status,200);
}
if(mode==='prepare'){
 assert(!fs.existsSync(file));const x=inspect(spec.container),l=x.Config.Labels;assert.equal(x.Image,spec.base);
 const all=JSON.parse(docker('inspect',...docker('ps','-q').split('\n')));assert.deepEqual(namespaceDependents(all,new Set([spec.container])),[]);
 const g={project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],before:[],status:'prepared'};
 assert.equal(g.project,'utilibre-community');assert.deepEqual(g.files,[composeFile]);assert.equal(l['com.docker.compose.service'],'uptime-kuma');
 const c=config(g);assert.equal(c.image,spec.baseRef);
 g.rows.push({name:spec.container,key:'kuma-sudo',service:'uptime-kuma',oldRef:spec.baseRef,oldImage:spec.base,newRef:spec.candidate,newImage:b.imageId,configHash:hash(c)});
 await gate(g,'old');assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);
 const backup=dir+'/kuma-pre-release.sqlite';assert(!fs.existsSync(backup));
 run('python3',['-c',"import sqlite3,sys,os\ns=sqlite3.connect('file:/opt/utilibre/community-data/kuma/kuma.db?mode=ro',uri=True)\nd=sqlite3.connect(sys.argv[1]);s.backup(d);assert d.execute('PRAGMA integrity_check').fetchone()==('ok',);d.close();s.close();os.chmod(sys.argv[1],0o600)",backup]);
 save({date:new Date().toISOString(),status:'prepared',backup,backupIntegrity:true,proofs,groups:[g]});console.log('Exact Kuma sudo candidate and private SQLite recovery snapshot prepared; no deployment.');
}else{
 const r=read(file);assert.equal(r.status,'prepared');assert(Date.now()-Date.parse(r.date)<3600000);assert.deepEqual(r.proofs,proofs);assert.equal(r.groups.length,1);const g=r.groups[0];
 const validate=()=>{const c=config(g);assert.equal(hash(c),g.rows[0].configHash);assert.equal(c.image,spec.candidate);assert.equal(inspect(spec.candidate).Id,b.imageId);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);};
 await releaseGroup(g,{preflight:async()=>{validate();await gate(g,'old');},save:()=>save(r),recreate:()=>recreateExistingGroup(g),gate:which=>gate(g,which),rollbackPins:()=>{const changed=replaceImagePins(fs.readFileSync(composeFile,'utf8'),[{from:spec.candidate,to:spec.baseRef}]);assert.equal(changed.replaced,1);fs.writeFileSync(composeFile,changed.text);}});
 g.completedAt=new Date().toISOString();r.status='passed';r.completedAt=g.completedAt;save(r);console.log('Kuma sudo dependency deployed; native package, Click preservation, image, health and public status passed.');
}
