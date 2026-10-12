// A small dependency-only gate in each exact runtime, using old Debian headers.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,work,sha,read,docker,inspect,limits} from './common.mjs';
const selected=process.argv.slice(2);assert(selected.length);
const binary=work+'/output/mount-regression',proof=read(root+'/native.json');
assert.equal(proof.status,'passed');
for(const key of selected){
 const dir=root+'/images/'+key,s=read(dir+'/stage.json');assert.equal(inspect(s.candidate).Id,s.image);
 assert(!fs.existsSync(dir+'/consumer.json'));
 const cases=[];
 for(const mode of ['normal','ancestor-swap','target-swap','ancestor-link','target-link','unrestricted']){
  const output=docker('run',...limits,'--read-only','--user','65534:65534','--tmpfs','/tmp:rw,nosuid,nodev,size=8m,mode=1777','--mount','type=bind,src='+binary+',dst=/regression,readonly','--entrypoint','/regression',s.image,'fixed',mode);
  cases.push({mode,output});
 }
 fs.writeFileSync(dir+'/consumer.json',JSON.stringify({schema:1,date:new Date().toISOString(),passed:true,imageId:s.image,binarySha256:sha(fs.readFileSync(binary)),nativeSha256:sha(fs.readFileSync(root+'/native.json')),cases,network:'none',user:65534,kernelMounts:false,productionChanged:false},null,2)+'\n');
 console.log(key+': six unprivileged native runtime cases passed.');
}
