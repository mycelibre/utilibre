import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,version,oldVersion,commit,sha,read,run} from './common.mjs';
process.umask(0o077);
const name='security-coturn-bson-20261012-source.tar.gz',archive=root+'/'+name,receipt=root+'/source-offer.json';
const native=read(root+'/native.json');for(const f of ['native','stage','application'])assert.equal(read(root+'/'+f+'.json').status,'passed');
const recipes=fs.readdirSync(new URL('.',import.meta.url)).filter(f=>/\.(?:md|mjs|c|sh)$/.test(f)).sort();
const sources=[...['mongo-c-driver_'+oldVersion+'.dsc','mongo-c-driver_'+oldVersion+'.debian.tar.xz','mongo-c-driver_1.30.4.orig.tar.gz',commit+'.patch'].map(file=>({dir:root+'/input',file})),...Object.keys(native.sourcePins).map(file=>({dir:root+'/output',file}))];
assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
if(process.argv[2]==='--publish'){
 const p=read(receipt);assert.equal(p.filename,name);assert.equal(sha(fs.readFileSync(archive)),p.sha256);const allowed=new Set(['coturn-bson/','coturn-bson/manifest.json','coturn-bson/sources/','coturn-bson/recipes/',...sources.map(s=>'coturn-bson/sources/'+s.file),...recipes.map(f=>'coturn-bson/recipes/'+f)]);assert.deepEqual(new Set(run('tar',['-tzf',archive]).split('\n')),allowed);
 for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=dir+'/'+name;if(fs.existsSync(dest)){assert.equal(sha(fs.readFileSync(dest)),p.sha256);continue;}const temp=fs.mkdtempSync(dir+'/.coturn-bson-');fs.copyFileSync(archive,temp+'/'+name);fs.chmodSync(temp+'/'+name,0o644);fs.renameSync(temp+'/'+name,dest);fs.rmdirSync(temp);}
 p.published=true;p.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}else{
 assert(!fs.existsSync(archive));const temp=fs.mkdtempSync(root+'/offer-'),dir=temp+'/coturn-bson';fs.mkdirSync(dir+'/sources',{recursive:true});fs.mkdirSync(dir+'/recipes');const files=[];
 for(const s of sources){fs.copyFileSync(s.dir+'/'+s.file,dir+'/sources/'+s.file);files.push({file:s.file,sha256:sha(fs.readFileSync(s.dir+'/'+s.file))});}for(const file of recipes)fs.copyFileSync(new URL(file,import.meta.url),dir+'/recipes/'+file);
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({version,oldVersion,commit,files,changes:native.changed,vendorPatchesPreserved:native.vendorPatchesPreserved,packages:native.packages,authentication:read(root+'/authenticated.json').method,notice:'Complete corresponding library source and reproducible recipes; local backport is not represented as a Debian-issued binary.'},null,2)+'\n');
 run('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'coturn-bson']);const p={date:new Date().toISOString(),filename:name,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}
