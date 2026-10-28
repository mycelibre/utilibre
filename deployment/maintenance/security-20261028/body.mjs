// Finite same-major body-parser fixes, retaining the reviewed dependency graph.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {buildExactPackages} from '../js-closure/build.mjs';
assert(process.argv.filter(a=>['--multer','--zod'].includes(a)).length<=1,'Duplicate profile');
const profile=process.argv.includes('--zod')?'zod':process.argv.includes('--multer')?'multer':'body',data=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url))),keys=process.argv.slice(2).filter(a=>!['--multer','--zod'].includes(a));
const root='/var/lib/utilibre-maintenance/security-20261028/'+profile;
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>data.rows.some(s=>s.key===k)));
for(const key of keys){
 const s=data.rows.find(s=>s.key===key);assert(!fs.existsSync(root+'/'+key+'/build.json'));
 const before=cp.execFileSync('docker',['run','--rm','-i','--network','none','--read-only','--cap-drop','ALL','--memory','256m','--cpus','1','--log-driver','none','--entrypoint','node',s.base,'-',JSON.stringify(Object.keys(s.before))],{encoding:'utf8',timeout:30000,stdio:['pipe','pipe','pipe'],input:'const fs=require("fs");console.log(JSON.stringify(Object.fromEntries(JSON.parse(process.argv[2]).map(p=>[p,JSON.parse(fs.readFileSync(p+"/package.json")).version]))))'});
 assert.deepEqual(JSON.parse(before),s.before,'Unsupported installed packages');
 await buildExactPackages(data.rows,data.packages,root,[key]);
}
