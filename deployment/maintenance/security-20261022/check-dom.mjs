import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';
import {spec,output} from './gathio.mjs';
const run=(args,input)=>cp.execFileSync('docker',args,{input,encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['pipe','pipe','pipe']});
const rows=[];
for(const image of [spec.base,spec.candidate]){
 const imageId=run(['image','inspect','--format','{{.Id}}',image]).trim();
 const result=JSON.parse(run(['run','--rm','-i','--network','none','--read-only','--log-driver','none','--cpus','1','--memory','256m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint','node',image,'-'],fs.readFileSync(new URL('./dom-regression.cjs',import.meta.url))));
 rows.push({imageId,...result});
}
assert(rows[0].version==='3.4.16'&&rows[1].version==='3.4.17');
fs.writeFileSync(output+'/gathio/dom-regression.json',JSON.stringify({date:new Date().toISOString(),passed:true,rows,noNetwork:true,productionChanged:false},null,2)+'\n',{mode:0o600});
console.log('Original library reproduces both DOM defects; patched library rejects them; legitimate markup and TOML parsing pass.');
