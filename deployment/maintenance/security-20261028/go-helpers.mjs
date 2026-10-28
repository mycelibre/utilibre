// Adapt the existing closure/leaf build receipts to the shared release gates.
// No acquisition, source editing, or deployment is performed here.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028';
const inputs=JSON.parse(fs.readFileSync(new URL('./go-helpers-inputs.json',import.meta.url)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(f));
const docker=(...a)=>cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
for(const key of keys){
 const s=inputs.rows.find(s=>s.key===key),closure=['anubis','ferretdb'].includes(key);
 const source=root+(closure?'/go-closure/'+key:'/go-leaf/output');
 const stage=read(source+(closure?'/image.json':'/'+key+'-image.json'));
 assert.equal(stage.base,s.base);assert.equal(stage.imageId,docker('image','inspect','--format','{{.Id}}',s.candidate));
 const native=read(source+(closure?'/native.json':'/'+key+'-native.json'));
 assert(native.passed&&native.imageId===stage.imageId);
 const out=root+'/go-helpers/'+key;fs.mkdirSync(out,{recursive:true});assert(!fs.existsSync(out+'/build.json'),'Preserve completed evidence');
 const binaries=key==='wakapi'?[[s.binary,'wakapi'],['/app/healthcheck','wakapi-healthcheck']]:[[s.binary,key]];
 const comparisons=[];
 for(const [target,name]of binaries){
  const binary=source+'/'+name,info=fs.readFileSync(source+'/'+name+'-buildinfo.txt','utf8');assert(info.split('\n')[0].includes('go'+s.compilerVersion));
  const cid=docker('create','--entrypoint','/bin/true',s.base);
  try{docker('cp',cid+':'+target,out+'/before-'+name);}finally{docker('rm',cid);}
  const old=docker('run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--memory','128m','--cpus','1','-v',out+':/input:ro','--entrypoint','/usr/local/go/bin/go','sha256:5bba7feafd0a05a85a6454714b44e5909beebda3dfda1018bb0f4fd5acc66d1f','version','-m','/input/before-'+name);
  assert(old.split('\n')[0].includes('go'+s.previousCompiler));
  const dependencies=t=>t.split('\n').map(x=>x.trim()).filter(x=>x.startsWith('dep\t')||x.startsWith('=>\t')).sort();
  assert.deepEqual(dependencies(info),dependencies(old),'Module drift requires separate review');
  fs.writeFileSync(out+'/'+name+'-before-buildinfo.txt',old+'\n');
  fs.writeFileSync(out+'/'+name+'-after-buildinfo.txt',info);
  comparisons.push({path:target,binarySha256:sha(fs.readFileSync(binary)),unchangedModules:dependencies(info).length});
 }
 const assets=['anubis','ntfy','wakapi'].includes(key)?read(source+'/'+key+'-assets.json'):null;
 if(assets)assert(assets.passed&&assets.binarySha256===comparisons[0].binarySha256);
 if(key==='wakapi')assert(read(source+'/wakapi-healthcheck-tests.json').passed);
 const configurationUnchanged=JSON.stringify(JSON.parse(docker('image','inspect','--format','{{json .Config}}',s.base)))===JSON.stringify(JSON.parse(docker('image','inspect','--format','{{json .Config}}',stage.imageId)));
 assert(configurationUnchanged);
 const result={date:new Date().toISOString(),passed:true,key,base:s.base,candidate:s.candidate,imageId:stage.imageId,configurationUnchanged,compilerVersion:s.compilerVersion,binaries:comparisons,native,assets,sourceRevision:s.sourceRevision,changedFiles:comparisons.map(b=>b.path).sort(),scope:'Compiler-only; no dependency or runtime-configuration changes'};
 fs.writeFileSync(out+'/build.json',JSON.stringify(result,null,2)+'\n');console.log(key+': native behavior, compiler, module and image-configuration gates passed');
}
