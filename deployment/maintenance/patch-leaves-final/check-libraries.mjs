import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {specs,output as originalOutput} from './specs.mjs';
process.umask(0o077);
const oct22=process.argv.includes('--oct22'),output=oct22?'/var/lib/utilibre-maintenance/security-20261022':originalOutput;
const original=specs.find(x=>x.key===process.argv[2]);assert(original);
if(oct22)assert(['candlr','degoog'].includes(original.key));
const s=oct22?{...original,...JSON.parse(fs.readFileSync(output+'/'+original.key+'/build.json'))}:original;
const build=JSON.parse(fs.readFileSync(output+'/'+s.key+'/build.json'));
const docker=(a,opt={})=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:15000,maxBuffer:2*1024**2,stdio:['pipe','pipe','pipe'],...opt});
assert.equal(docker(['image','inspect','--format','{{.Id}}',s.candidate]).trim(),build.imageId);
const name='maintenance-patch-library-'+s.key;
try{
 const result=JSON.parse(docker(['run','--rm','-i','--name',name,'--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint',s.runtime,build.imageId,...(s.runtime==='bun'?['run','-']:['-']),JSON.stringify(s.paths)],{input:fs.readFileSync(new URL('./libraries.cjs',import.meta.url))}));
 fs.writeFileSync(output+'/'+s.key+'/libraries.json',JSON.stringify({date:new Date().toISOString(),imageId:build.imageId,passed:true,network:'none',...result},null,2)+'\n');console.log(s.key+' bounded native package gates passed');
}catch(e){fs.writeFileSync(output+'/'+s.key+'/library-error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Library gate failed; private receipt retained');}
finally{try{docker(['rm','-f',name]);}catch{}}
