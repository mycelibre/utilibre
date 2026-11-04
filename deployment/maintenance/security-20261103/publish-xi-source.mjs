// Immutable code-only source supplement; no app data, environment or logs.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261103',name='libxi-184-20261103-source.tar.gz',destination='/opt/utilibre/toolbox-public/'+name;
assert(!fs.existsSync(destination),'Preserve published source');
const source=JSON.parse(fs.readFileSync(new URL('./libxi-source.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex'),stage=fs.mkdtempSync(root+'/xi-source-');
try{
 fs.mkdirSync(stage+'/source');fs.mkdirSync(stage+'/recipe');
 for(const p of source.files){const b=fs.readFileSync(root+'/remaining/libxi-1.8.4-1/'+p.file);assert.equal(b.length,p.bytes);assert.equal(sha(b),p.sha256);fs.writeFileSync(stage+'/source/'+p.file,b);}
 for(const f of ['libxi-source.json','libxi-inputs.json','xi-native.c','xi-fixture.json','xi-policy.mjs','check-xi.mjs','check-penpot.mjs','batch.mjs','publish-xi-source.mjs'])fs.copyFileSync(new URL('./'+f,import.meta.url),stage+'/recipe/'+f);
 for(const f of ['brotli.mjs','scan-brotli.mjs','release-brotli.mjs'])fs.copyFileSync(new URL('../security-20261028/'+f,import.meta.url),stage+'/recipe/'+f);
 fs.writeFileSync(stage+'/REBUILD.txt','Unmodified authenticated Debian libXi 1.8.4 source and original X11/MIT notices. The two Penpot images receive only this native package. Exact archive hashes, predecessor images and offline native consumer checks are recorded in recipe/. Run the recipes in the full Utilibre repository to retain their existing helpers; no byte-identical build claim. Other application source offers and earlier repairs remain required. No operational data or credentials are included.\n');
 const archive=root+'/'+name;cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',stage,'.'],{timeout:30000});
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 const receipt={date:new Date().toISOString(),published:true,filename:name,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size};
 fs.writeFileSync(root+'/libxi/source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{fs.rmSync(stage,{recursive:true});}
