// Reuse the established isolated 25 MB attachment/privacy regression. No real
// paste is created on the public instance and no production volume is mounted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {output} from './specs.mjs';
process.umask(0o077);
const dir=output+'/privatebin',b=JSON.parse(fs.readFileSync(dir+'/build.json'));
assert(b.passed);
let text;
try{
 text=cp.execFileSync(process.execPath,['deployment/utilibre/tests/check-privatebin-uploads.mjs'],{
  cwd:new URL('../../../',import.meta.url),encoding:'utf8',timeout:300000,maxBuffer:2*1024**2,
  env:{...process.env,PRIVATEBIN_TEST_IMAGE:b.candidate},stdio:['ignore','pipe','pipe'],
 });
}catch(e){
 fs.writeFileSync(dir+'/application-error.log',String(e.stdout||'')+String(e.stderr||''));
 throw Error('PrivateBin regression failed; private diagnostic retained');
}
const result=JSON.parse(text.trim().split('\n').at(-1));
assert(result.passed);assert.equal(result.imageId,b.imageId);
fs.writeFileSync(dir+'/application.json',JSON.stringify({
 date:result.date,imageId:result.imageId,passed:true,
 command:'node deployment/maintenance/php-20261022/check-privatebin.mjs',
 report:result.output+'/result.json',checks:result.checks,
 network:'isolated internal Docker network',limitations:result.limitations,
},null,2)+'\n');
console.log('PrivateBin exact-image 25 MB encrypted attachment and privacy checks passed');
