// Freeze reviewed resolved locks for deterministic rebuilds. This is not a
// native/release gate; source publication separately requires those receipts.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const allowed=['oauth2-proxy','anubis','opengist','mezzo','ntfy','vikunja','wakapi'];
const name=process.argv[2];assert(allowed.includes(name));
const out='/var/lib/utilibre-maintenance/go-leaf-final-20261011/output/';
const dir=new URL('./locks/'+name+'/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const manifests=[];let patch='';
for(const file of ['go.mod','go.sum']){
 const before=out+name+'-'+file+'.before',after=out+name+'-'+file;
 const bytes=fs.readFileSync(after);fs.writeFileSync(new URL(file,dir),bytes);
 const d=cp.spawnSync('diff',['-u','--label','a/'+file,'--label','b/'+file,before,after],{encoding:'utf8'});
 assert([0,1].includes(d.status));patch+=d.stdout;
 manifests.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});
}
fs.mkdirSync(new URL('./patches/',import.meta.url),{recursive:true});
fs.writeFileSync(new URL('./patches/'+name+'-go-security-20261011.patch',import.meta.url),patch);
fs.writeFileSync(new URL('manifest.json',dir),JSON.stringify({application:name,files:manifests},null,2)+'\n');
console.log(JSON.stringify({application:name,locks:manifests}));
