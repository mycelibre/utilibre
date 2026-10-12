import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,run} from './stage.mjs';
process.umask(0o077);
const name='security-penpot-heif-alignment-20261012-source.tar.gz',archive=root+'/'+name,receipt=root+'/source-offer.json',read=p=>JSON.parse(fs.readFileSync(p));
const source=read(root+'/source.json');assert.equal(source.status,'passed');assert.equal(read(root+'/native.json').status,'passed');assert.equal(read(root+'/application-run.log').status,'passed');
const recipes=['README.md','Dockerfile','acquire.mjs','stage.mjs','check.mjs','release-inputs.mjs','source-offer.mjs'],files=source.sourceFiles.map(f=>f.file);
assert([undefined,'--publish'].includes(process.argv[2])&&process.argv.length<=3);
if(process.argv[2]==='--publish'){
 const p=read(receipt);assert.equal(p.sha256,sha(fs.readFileSync(archive)));assert.equal(p.filename,name);
 const allowed=new Set(['penpot-heif/','penpot-heif/manifest.json','penpot-heif/sources/','penpot-heif/recipes/',...files.map(f=>'penpot-heif/sources/'+f),...recipes.map(f=>'penpot-heif/recipes/'+f)]);assert.deepEqual(new Set(run('tar',['-tzf',archive]).split('\n')),allowed);
 for(const dest of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const file=dest+'/'+name;if(fs.existsSync(file)){assert.equal(sha(fs.readFileSync(file)),p.sha256);continue;}const temp=fs.mkdtempSync(dest+'/.penpot-heif-');fs.copyFileSync(archive,temp+'/'+name);fs.chmodSync(temp+'/'+name,0o644);fs.renameSync(temp+'/'+name,file);fs.rmdirSync(temp);}
 p.published=true;p.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}else{
 assert(!fs.existsSync(archive));const temp=fs.mkdtempSync(root+'/offer-'),dir=temp+'/penpot-heif';fs.mkdirSync(dir+'/sources',{recursive:true});fs.mkdirSync(dir+'/recipes');
 for(const f of source.sourceFiles){assert.equal(sha(fs.readFileSync(root+'/sources/'+f.file)),f.sha256);fs.copyFileSync(root+'/sources/'+f.file,dir+'/sources/'+f.file);}
 for(const f of recipes)fs.copyFileSync(new URL(f,import.meta.url),dir+'/recipes/'+f);
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({version:source.version,sourceFiles:source.sourceFiles,librarySha256:source.binary.librarySha256,changes:'No upstream source modification. Align ImageMagick private copy with exact already-installed Debian system library and plugins.',authentication:source.method},null,2)+'\n');
 run('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'penpot-heif']);const p={date:new Date().toISOString(),filename:name,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}
