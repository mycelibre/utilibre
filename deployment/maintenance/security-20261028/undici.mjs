// Same-major dependency updates using the existing exact-package builder.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {buildExactPackages} from '../js-closure/build.mjs';
export const output='/var/lib/utilibre-maintenance/security-20261028/undici';
export const specs=JSON.parse(fs.readFileSync(new URL('./undici-inputs.json',import.meta.url))).rows;
export const packages={
 undici6:{name:'undici',version:'6.29.1',integrity:'sha512-EvRlUt/QqAEvXdQeRMYUfwOQsfzpDztykrG2owGEE/rBOBoYv9uF39ZzsNDh4lTFHhTr2XOZjKkYgueD12ZmGA=='},
 undici7:{name:'undici',version:'7.30.1',integrity:'sha512-03KrMbjIFDWQR5RNPrSw3bd1r12JpyFQl9/yxjUbJtqkjmllqC5lFjZh6ujeuJCKr8EOQvRW872Oy/az+nLYxg=='},
 undici8:{name:'undici',version:'8.12.2',integrity:'sha512-XtuDWVdqTLr3NAxm2ly9/hU6kUsJOgGh1RASzMBbsw6aWCOaQzHdW+QQDfdERjfJ2V5vL5pRPa4RetO9UfivDg=='},
};
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key);assert(!fs.existsSync(output+'/'+key+'/build.json'),'Preserve completed candidate');
 const text=cp.execFileSync('docker',['run','--rm','-i','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','128m','--log-driver','none','--entrypoint',s.runtime||'node',s.base,...(s.runtime==='bun'?['run','-']:['-']),JSON.stringify(Object.keys(s.before))],{encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe'],input:'const fs=require("fs");console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[2]).map(p=>[p,JSON.parse(fs.readFileSync(p+"/package.json")).version]))))'});
 assert.deepEqual(JSON.parse(text),s.before,'Unsupported package baseline');
 await buildExactPackages(specs,packages,output,[key]);
}
