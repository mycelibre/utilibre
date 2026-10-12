import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,geo,version,oldVersion,commit,sha,read,run} from './common.mjs';
process.umask(0o077);
const name='security-gdal-avif-20261012-source.tar.gz',archive=root+'/'+name,receipt=root+'/source-offer.json';
const source=read(root+'/source.json'),stage=read(root+'/stage.json'),app=read(root+'/application.json');for(const r of [source,stage,app])assert.equal(r.status,'passed');assert(app.gdalHeicAndAvifRead);
const recipes=['README.md','build.sh','common.mjs','source.mjs','stage.mjs','application.mjs','release.mjs','source-offer.mjs','review.mjs','review-policy.mjs','review-policy.test.mjs'];
const sources=[...Object.keys(source.sourcePins).map(file=>({dir:root+'/output',file})),...['gdal_'+oldVersion+'.dsc','gdal_'+oldVersion+'.debian.tar.xz'].map(file=>({dir:geo+'/gdal-out',file})),...['gdal_3.6.2+dfsg-1.dsc','gdal_3.6.2+dfsg-1.debian.tar.xz'].map(file=>({dir:geo+'/gdal-source',file})),{dir:root,file:commit+'.patch'}];
assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
if(process.argv[2]==='--publish'){
 const p=read(receipt);assert.equal(p.sha256,sha(fs.readFileSync(archive)));assert.equal(p.filename,name);
 const allowed=new Set(['gdal-avif/','gdal-avif/manifest.json','gdal-avif/sources/','gdal-avif/recipes/',...sources.map(s=>'gdal-avif/sources/'+s.file),...recipes.map(f=>'gdal-avif/recipes/'+f)]);assert.deepEqual(new Set(run('tar',['-tzf',archive]).split('\n')),allowed);
 for(const dest of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const file=dest+'/'+name;if(fs.existsSync(file)){assert.equal(sha(fs.readFileSync(file)),p.sha256);continue;}const temp=fs.mkdtempSync(dest+'/.gdal-avif-');fs.copyFileSync(archive,temp+'/'+name);fs.chmodSync(temp+'/'+name,0o644);fs.renameSync(temp+'/'+name,file);fs.rmdirSync(temp);}
 p.published=true;p.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}else{
 assert(!fs.existsSync(archive));const temp=fs.mkdtempSync(root+'/offer-'),dir=temp+'/gdal-avif';fs.mkdirSync(dir+'/sources',{recursive:true});fs.mkdirSync(dir+'/recipes');
 const manifest=[];for(const {dir:from,file}of sources){fs.copyFileSync(from+'/'+file,dir+'/sources/'+file);manifest.push({file,sha256:sha(fs.readFileSync(from+'/'+file))});}for(const f of recipes)fs.copyFileSync(new URL(f,import.meta.url),dir+'/recipes/'+f);
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({version,oldVersion,commit,files:manifest,changes:source.changed,priorSecurityFiles:source.priorSecurityFiles,originalHeadersUnchanged:true,authentication:'Original Debian-maintainer signed DSC and pinned archive hashes; all earlier native repair source retained byte-for-byte. New package is a reproducible locally maintained backport, not signed as an upstream Debian release.'},null,2)+'\n');
 run('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'gdal-avif']);const p={date:new Date().toISOString(),filename:name,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}
