// Exact native wheel upgrades atop the already-tested CA repair; no resolver.
import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';import {createHash} from 'node:crypto';
import {specs,wheels,output} from './specs.mjs';
process.umask(0o077);
const pins={
 '312':['e6/99/fdf65cc539e266ab93546c261bdf98411fe165c6e4e13f9dbf597097192b','42d63be3af4f9b951b199b0a9d23365d37ab14687e6d77b74940432c8515c4ca'],
 '313':['ef/fe/f5cdaa2d1c4086e757430f368c271a58ee29cfe7378e7ae7b9d964015c25','5f56499c1a74d2b862beb0c33b8016f99d095858455df9d21583bbbc1c15b582'],
 '314':['1d/f2/1371707ce438ba9a43f9d24089828494ec6f9396e28cd7903aa704dd6306','e91c2b1cbeae768c98752e67e717e283d68dae45717b41f2d91eaee648e37b7d'],
};
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>['candlr','liberaforms','kitchenowl','trip'].includes(k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key),base=JSON.parse(fs.readFileSync(output+'/'+key+'/build.json')).imageId,dir=output+'/'+key+'/pillow';fs.mkdirSync(dir,{recursive:true});
 const work=fs.mkdtempSync('/tmp/utilibre-pillow-'),sha=b=>createHash('sha256').update(b).digest('hex');
 const run=(p,args,opt={})=>{try{return cp.execFileSync(p,args,{encoding:'utf8',timeout:180000,maxBuffer:48*1024**2,stdio:['pipe','pipe','pipe'],...opt});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||e)+'\nExit status: '+e.status);const error=Error('Pillow candidate failed; private diagnostic '+dir+'/error.log');error.exitStatus=e.status;throw error;}};
 const docker=(args,opt)=>run('docker',args,opt);
 const native=(id,file,args=[])=>docker(['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','384m','--pids-limit','64','--ulimit','core=0','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--entrypoint',s.python,id,'-B','-',...args],{input:fs.readFileSync(new URL(file,import.meta.url))});
 try{
  const disk=fs.statfsSync(output);assert(disk.bavail*disk.bsize>=8*1024**3);
  const before=JSON.parse(native(base,'./check.py',[s.site,'2026.10.19']));
  const normalBefore=JSON.parse(native(base,'./pillow-check.py',['12.3.0']));
  // Reproduce only in a no-network, capped disposable process. A process crash
  // or the explicit tile assertion is recorded, never mistaken for a build test.
  let baseline;try{native(base,'./pillow-check.py',['12.3.0','regression']);baseline='already rejects';}catch(error){const e=fs.readFileSync(dir+'/error.log','utf8');assert([134,139].includes(error.exitStatus)||/JPEG wider than tile accepted|double free|corrupted/.test(e),'Unrelated baseline failure');baseline={result:'vulnerable tile regression reproduced',exitStatus:error.exitStatus};}
  const py=s.site.match(/python3\.(\d+)/)[1],abi='3'+py,pin=pins[abi],file=`pillow-13.0.0-cp${abi}-cp${abi}-manylinux_2_27_x86_64.manylinux_2_28_x86_64.whl`;
  const url='https://files.pythonhosted.org/packages/'+pin[0]+'/'+file;const r=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),pin[1]);fs.writeFileSync(work+'/'+file,bytes,{mode:0o644});
  fs.copyFileSync(output+'/'+wheels[1].file,work+'/'+wheels[1].file);fs.chmodSync(work+'/'+wheels[1].file,0o644);
  const old=JSON.parse(docker(['image','inspect',base]))[0],candidate='utilibre-'+key+':pillow-certifi-20261021';
  const temp='/tmp/utilibre-pillow-20261021',recipe=`FROM ${base}\nUSER 0\nCOPY ${file} ${wheels[1].file} ${temp}/\nRUN PYTHONPATH=${temp}/${wheels[1].file} ${s.python} -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-index --no-deps --force-reinstall ${temp}/${file} && rm ${temp}/${file} ${temp}/${wheels[1].file} && rmdir ${temp}\nUSER ${old.Config.User}\n`;
  fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
  docker(['build','--network','none','--pull=false','--memory','384m','--cpu-period','100000','--cpu-quota','100000','-t',candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  const next=JSON.parse(docker(['image','inspect',candidate]))[0];assert.deepEqual(next.Config,old.Config);
  const after=JSON.parse(native(next.Id,'./check.py',[s.site,'2026.10.19']));
  const allowed=p=>['/PIL/','/pillow.libs/','/pillow-12.3.0.dist-info/','/pillow-13.0.0.dist-info/'].some(x=>p.startsWith(s.site+x));
  const changed=[];for(const p of new Set([...Object.keys(before.files),...Object.keys(after.files)]))if(JSON.stringify(before.files[p])!==JSON.stringify(after.files[p])){assert(allowed(p),'Unrelated file changed: '+p);changed.push(p);}
  const normalAfter=native(next.Id,'./pillow-check.py',['13.0.0','regression']).trim().split('\n').map(JSON.parse);assert(normalAfter[1].jpegTileOverflowRejected);
  fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,deployed:false,key,base,candidate,imageId:next.Id,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,baseline,normalBefore,normalAfter,changedFiles:changed,wheel:{url,sha256:pin[1]},existingCertifiFixPreserved:true},null,2)+'\n');console.log(key+': Pillow 13 regression, normal images and unchanged dependencies passed');
 }finally{fs.rmSync(work,{recursive:true,force:true});}
}
