// Read immutable application binaries only; never volumes or user data.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/go-leaf-final-20261011';
for(const p of ['input','output','source'])fs.mkdirSync(dir+'/'+p,{recursive:true,mode:0o700});
const specs=JSON.parse(fs.readFileSync(new URL('./images.json',import.meta.url)));
const run=(p,args)=>cp.execFileSync(p,args,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}).trim();
const rows=[];
const previous=fs.existsSync(dir+'/inventory.json')?JSON.parse(fs.readFileSync(dir+'/inventory.json')).rows:[];
for(const s of specs){
 const saved=previous.find(x=>x.key===s.key);
 const compressed=dir+'/input/'+s.key+'.gz';
 if(saved&&fs.existsSync(compressed)){
  assert.equal(saved.baseId,s.baseId);
  assert.equal(createHash('sha256').update(gunzipSync(fs.readFileSync(compressed))).digest('hex'),saved.binarySha256);
  rows.push(saved);continue;
 }
 assert.equal(run('docker',['inspect','--format','{{.Image}}',s.container]),s.baseId);
 const cid=run('docker',['create','--entrypoint','/bin/true',s.baseId]);
 try{run('docker',['cp',cid+':'+s.binary,dir+'/input/'+s.key]);}finally{run('docker',['rm',cid]);}
 const info=run('docker',['run','--rm','--network','none','--read-only','--cpus','0.5','--memory','128m','-v',dir+'/input:/input:ro','sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade','go','version','-m','/input/'+s.key]);
 fs.writeFileSync(dir+'/input/'+s.key+'-buildinfo.txt',info+'\n');
 rows.push({...s,binarySha256:createHash('sha256').update(fs.readFileSync(dir+'/input/'+s.key)).digest('hex'),buildInfo:info});
 const original=fs.readFileSync(dir+'/input/'+s.key);
 fs.writeFileSync(compressed,gzipSync(original));
 assert(gunzipSync(fs.readFileSync(compressed)).equals(original));
 fs.unlinkSync(dir+'/input/'+s.key);
}
fs.writeFileSync(dir+'/inventory.json',JSON.stringify({date:new Date().toISOString(),rows},null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({key:r.key,compressedBytes:fs.statSync(dir+'/input/'+r.key+'.gz').size,sourceRevision:r.buildInfo.match(/vcs.revision=([^\n]+)/)?.[1],compiler:r.buildInfo.split('\n')[0]}))));
