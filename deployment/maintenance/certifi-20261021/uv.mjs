// Official uv wheel, exact patched predecessor; no dependency resolution.
import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';import {createHash} from 'node:crypto';
import {specs,wheels,output} from './specs.mjs';
process.umask(0o077);
const s=specs.find(s=>s.key==='beaverhabits'),base=JSON.parse(fs.readFileSync(output+'/'+s.key+'/build.json')).imageId,dir=output+'/'+s.key+'/uv';
fs.mkdirSync(dir,{recursive:true});const work=fs.mkdtempSync('/tmp/utilibre-uv-'),sha=b=>createHash('sha256').update(b).digest('hex');
const wheel={file:'uv-0.13.4-py3-none-manylinux_2_17_x86_64.manylinux2014_x86_64.whl',sha256:'05e4332791b4d55b6dde8695b7fa6079b26991519f44760887c5dfbd5ca4fe53',url:'https://files.pythonhosted.org/packages/4b/a1/de02c0913726728eca56ee258875cbba9c7b0572c63f494fd9f55c7852e3/uv-0.13.4-py3-none-manylinux_2_17_x86_64.manylinux2014_x86_64.whl'};
const run=(args,opts={})=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:64*1024**2,stdio:['pipe','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('uv candidate failed; private diagnostic retained');}};
const native=(id,python,script,args=[])=>run(['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=64m,mode=1777','--entrypoint',python,id,'-B','-',...args],{input:script});
const manifest=`import pathlib,hashlib,json
root=pathlib.Path('/usr/local/lib/python3.13/site-packages')
paths=list(root.rglob('*'))+[pathlib.Path('/usr/local/bin/uv'),pathlib.Path('/usr/local/bin/uvx')]
print(json.dumps({str(p):{'link':str(p.readlink())} if p.is_symlink() else {'sha256':hashlib.file_digest(p.open('rb'),'sha256').hexdigest(),'mode':p.stat().st_mode&511} for p in sorted(paths) if '__pycache__' not in p.parts and (p.is_file() or p.is_symlink())}))`;
try{
 const disk=fs.statfsSync(output);assert(disk.bavail*disk.bsize>=8*1024**3);
 const before=JSON.parse(native(base,'/usr/local/bin/python',manifest));
 const r=await fetch(wheel.url,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert.equal(sha(bytes),wheel.sha256);fs.writeFileSync(work+'/'+wheel.file,bytes,{mode:0o644});
 fs.copyFileSync(output+'/'+wheels[1].file,work+'/'+wheels[1].file);fs.chmodSync(work+'/'+wheels[1].file,0o644);
 const old=JSON.parse(run(['image','inspect',base]))[0],candidate='utilibre-beaverhabits:uv-certifi-20261021',temp='/tmp/utilibre-uv-wheel';
 const recipe=`FROM ${base}\nUSER 0\nCOPY ${wheel.file} ${wheels[1].file} ${temp}/\nRUN PYTHONPATH=${temp}/${wheels[1].file} /usr/local/bin/python -B -m pip --isolated install --disable-pip-version-check --no-cache-dir --no-compile --no-index --no-deps --force-reinstall ${temp}/${wheel.file} && rm ${temp}/${wheel.file} ${temp}/${wheels[1].file} && rmdir ${temp}\nUSER ${old.Config.User}\n`;
 fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
 run(['build','--network','none','--pull=false','--memory','384m','--cpu-period','100000','--cpu-quota','100000','-t',candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const next=JSON.parse(run(['image','inspect',candidate]))[0];assert.deepEqual(next.Config,old.Config);
 const after=JSON.parse(native(next.Id,'/usr/local/bin/python',manifest)),changed=[];
 for(const p of new Set([...Object.keys(before),...Object.keys(after)]))if(JSON.stringify(before[p])!==JSON.stringify(after[p])){assert(/^\/usr\/local\/(bin\/uvx?$|lib\/python3\.13\/site-packages\/uv(?:\/|-0\.(?:9\.2|13\.4)\.dist-info\/))/.test(p),'Unrelated dependency changed');changed.push(p);}
 const caBefore=JSON.parse(native(base,s.python,fs.readFileSync(new URL('./check.py',import.meta.url)),[s.site,'2026.10.19']));
 const caAfter=JSON.parse(native(next.Id,s.python,fs.readFileSync(new URL('./check.py',import.meta.url)),[s.site,'2026.10.19']));assert.deepEqual(caAfter,caBefore);
 const offlineChecks=JSON.parse(native(next.Id,'/usr/local/bin/python',`import importlib.metadata,pathlib,subprocess,json
assert importlib.metadata.version('uv')=='0.13.4'
assert subprocess.check_output(['uv','--version'],text=True).startswith('uv 0.13.4')
pathlib.Path('/tmp/requirements.in').write_text('')
p=subprocess.run(['uv','pip','compile','--offline','--no-index','--no-config','--no-cache','/tmp/requirements.in'],capture_output=True,text=True,timeout=20)
assert p.returncode==0,p.stderr
pathlib.Path('/tmp/requirements.in').write_text('utilibre-fictional-missing-package==1.0\\n')
p=subprocess.run(['uv','pip','compile','--offline','--no-index','--no-config','--no-cache','/tmp/requirements.in'],capture_output=True,text=True,timeout=20)
assert p.returncode!=0 and 'No solution found' in p.stderr,p.stderr
print(json.dumps({'passed':True,'offlineEmptyResolution':True,'missingPackageRejected':True,'version':'0.13.4'}))`));
 fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,key:s.key,base,candidate,imageId:next.Id,configurationUnchanged:true,unrelatedDependencyFilesUnchanged:true,existingCertifiFixPreserved:true,offlineChecks,changedFiles:changed,wheel,limitation:'Official corrected CA bundle and offline CLI behavior checked; no forged-certificate or live provider probe.'},null,2)+'\n');console.log('uv 0.13.4: exact wheel, offline CLI and unchanged application checks passed');
}finally{fs.rmSync(work,{recursive:true,force:true});}
