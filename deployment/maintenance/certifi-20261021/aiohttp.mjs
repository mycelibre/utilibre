// Explicit aiohttp + required yarl wheel pair; no resolver or unrelated upgrades.
import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';import {createHash} from 'node:crypto';
import {specs,wheels,output,aiohttpPredecessors as predecessors} from './specs.mjs';
process.umask(0o077);
const pins={
 '313':[
 ['aiohttp','3.14.4','69/c0/70667e82ec041f4122a17afce711bbcf94a71bec5888b69a49aed8817be2','ff4b366510c733974adb7a4102c094e4a6308e6f369315a4cf14d2d0a619cf82'],
 ['yarl','1.25.1','0e/b7/a82a49bf88340b837ef6972b508a1604ae377b9e6904b46b10cf5f1cf925','be80550d9bfe83d9b62398a37081a90434e6df2d978ec345c3d2820de6beddab']],
 '314':[
 ['aiohttp','3.14.4','cb/05/e00f35581c97656d9e864edaa03292382c620dd1d9c836a4f73a2279acc4','fb22c8e4b60385a9b414c70c6e8b2d0f4b23ff7fc4bb572ceb58297b228169f1'],
 ['yarl','1.25.1','a2/be/415b00c0fe5a0615b062a456b26623d7ec91c2bee20faea1a14045aa0469','30eec96e8a91bd588ce897c9543f6d5d8d34b28fbcba28a4dedf20ebeae9fe57']],
};
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>Object.hasOwn(predecessors,k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key),previous=output+'/'+key+(predecessors[key]?'/'+predecessors[key]:''),base=JSON.parse(fs.readFileSync(previous+'/build.json')).imageId,dir=output+'/'+key+'/aiohttp';fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Do not overwrite a tested candidate');
 const work=fs.mkdtempSync('/tmp/utilibre-aiohttp-'),sha=b=>createHash('sha256').update(b).digest('hex');
 const run=(p,args,opt={})=>{try{return cp.execFileSync(p,args,{encoding:'utf8',timeout:180000,maxBuffer:48*1024**2,stdio:['pipe','pipe','pipe'],...opt});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('aiohttp candidate failed; private diagnostic '+dir+'/error.log');}};
 const docker=(args,opt)=>run('docker',args,opt);
 const native=(id,file,args=[])=>docker(['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','384m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint',s.python,id,'-B','-',...args],{input:fs.readFileSync(new URL(file,import.meta.url))});
 try{
  const disk=fs.statfsSync(output);assert(disk.bavail*disk.bsize>=8*1024**3);
  const before=JSON.parse(native(base,'./check.py',[s.site,'2026.10.19'])),normalBefore=JSON.parse(native(base,'./aiohttp-check.py',['3.14.3']));
  const abi='3'+s.site.match(/python3\.(\d+)/)[1],packages=[];
  for(const [name,version,prefix,hash] of pins[abi]){
   const file=`${name}-${version}-cp${abi}-cp${abi}-manylinux2014_x86_64.manylinux_2_17_x86_64.manylinux_2_28_x86_64.whl`,url='https://files.pythonhosted.org/packages/'+prefix+'/'+file;
   const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),hash);fs.writeFileSync(work+'/'+file,bytes,{mode:0o644});packages.push({file,url,sha256:hash});
  }
  fs.copyFileSync(output+'/'+wheels[1].file,work+'/'+wheels[1].file);assert.equal(sha(fs.readFileSync(work+'/'+wheels[1].file)),wheels[1].sha256);fs.chmodSync(work+'/'+wheels[1].file,0o644);
  const old=JSON.parse(docker(['image','inspect',base]))[0],candidate='utilibre-'+key+':aiohttp-certifi-20261021',temp='/tmp/utilibre-aiohttp-20261021';
  const all=[...packages.map(x=>x.file),wheels[1].file],recipe=`FROM ${base}\nUSER 0\nCOPY ${all.join(' ')} ${temp}/\nRUN PYTHONPATH=${temp}/${wheels[1].file} ${s.python} -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-index --no-deps --force-reinstall ${packages.map(x=>temp+'/'+x.file).join(' ')} && rm ${all.map(x=>temp+'/'+x).join(' ')} && rmdir ${temp}\nUSER ${old.Config.User}\n`;
  fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
  docker(['build','--network','none','--pull=false','--memory','384m','--cpu-period','100000','--cpu-quota','100000','-t',candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  const next=JSON.parse(docker(['image','inspect',candidate]))[0];assert.deepEqual(next.Config,old.Config);
  const after=JSON.parse(native(next.Id,'./check.py',[s.site,'2026.10.19'])),normalAfter=JSON.parse(native(next.Id,'./aiohttp-check.py',['3.14.4']));
  const changed=[];for(const p of new Set([...Object.keys(before.files),...Object.keys(after.files)]))if(JSON.stringify(before.files[p])!==JSON.stringify(after.files[p])){assert(p.startsWith(s.site+'/')&&/^(aiohttp(?:\/|-3\.14\.[34]\.dist-info\/)|yarl(?:\/|-1\.(?:22\.0|24\.[25]|25\.1)\.dist-info\/))/.test(p.slice(s.site.length+1)),'Unrelated file changed: '+p);changed.push(p);}
  fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,deployed:false,key,base,candidate,imageId:next.Id,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,normalBefore,normalAfter,changedFiles:changed,wheels:packages,existingCertifiFixPreserved:true,predecessor:predecessors[key]},null,2)+'\n');console.log(key+': aiohttp/yarl native HTTP, forms, WebSocket and unchanged dependency gates passed');
 }finally{fs.rmSync(work,{recursive:true,force:true});}
}
