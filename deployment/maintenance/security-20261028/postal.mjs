// Same-major dependency updates using the existing exact-package builder.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {buildExactPackages} from '../js-closure/build.mjs';
export const output='/var/lib/utilibre-maintenance/security-20261028/postal';
export const specs=JSON.parse(fs.readFileSync(new URL('./postal-inputs.json',import.meta.url))).rows;
export const packages={postal:{name:'postal-mime',version:'4.0.8',integrity:'sha512-nnAgc4a9hn7zYuQmX4C7LU+fN47kR5S8cE8zvB/vZ2NimNDbaj+ISZJ9qe3CKIfn2uOTwwz4nQeIyljvdFNgOA=='}};
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key);assert(!fs.existsSync(output+'/'+key+'/build.json'),'Preserve completed candidate');
 const text=cp.execFileSync('docker',['run','--rm','-i','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','128m','--log-driver','none','--entrypoint',s.runtime||'node',s.base,...(s.runtime==='bun'?['run','-']:['-']),JSON.stringify(Object.keys(s.before))],{encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe'],input:'const fs=require("fs");console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[2]).map(p=>[p,JSON.parse(fs.readFileSync(p+"/package.json")).version]))))'});
 assert.deepEqual(JSON.parse(text),s.before,'Unsupported package baseline');
 await buildExactPackages(specs,packages,output,[key]);
}
