// Native permission checks in an isolated copy; no production documents/volumes.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {runtimeBinding} from './binding.mjs';
process.umask(0o077);
const directory='/var/lib/utilibre-maintenance/sandbox-inventory-20261012';
fs.mkdirSync(directory,{recursive:true});
const run=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',timeout:45000,maxBuffer:1024**2,stdio:['pipe','pipe','pipe'],...options}).trim();
const command=async(_program,args,timeout)=>run(args,{timeout});
const binding=await runtimeBinding(command);
const {image,wrapperSha256,binarySha256}=binding;
function probe(args,options){
 const name='maintenance-grist-permissions-'+randomUUID();
 try{return run(['run','--name',name,...args],options);}
 finally{try{run(['rm','-f',name],{timeout:15000});}catch{}}
}
const program=`const checks=[];
for(const [name,call] of [
 ['DNS',()=>Deno.resolveDns('fictional.example.invalid','A',{nameServer:{ipAddr:'127.0.0.1',port:9}})],
 ['TCP',()=>Deno.connect({hostname:'fictional.example.invalid',port:443})],
 ['HTTP',()=>fetch('https://fictional.example.invalid/')],
]){try{await call();throw Error('Unexpected permission');}catch(error){if(error.name!=='NotCapable')throw error;checks.push({name,result:error.name});}}
console.log(JSON.stringify({passed:true,checks}));`;
const output=probe(['--rm','-i','--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','384m','--memory-swap','384m','--pids-limit','64','--tmpfs','/tmp:rw,nosuid,nodev,size=32m,mode=1777','--entrypoint','/usr/local/bin/grist-deno',image,'run','--no-prompt','--cached-only','-'],{input:program});
const result=JSON.parse(output);assert.equal(result.passed,true);assert.equal(result.checks.length,3);
const nativeProgram=`const assert=require('node:assert/strict');
const {createConcreteSandbox}=require('app/server/lib/NSandbox');
const sandbox=createConcreteSandbox('pyodide',{preferredPythonVersion:'3'});
const timeout=setTimeout(()=>process.exit(1),60000);
(async()=>{try{
 assert.equal(await sandbox.pyCall('test_echo','fictional permissions check'),'fictional permissions check');
 assert.equal(sandbox.childProc.spawnfile,'/usr/local/bin/grist-deno');
 const args=sandbox.childProc.spawnargs;
 assert(!args.some(a=>/^--allow-(net|run|ffi)(=|$)/.test(a)||a==='--allow-all'||a==='-A'));
 console.log(JSON.stringify({passed:true,check:'Native Grist Python echo and no network/run/FFI grants'}));
}finally{clearTimeout(timeout);await sandbox.shutdown();}})().catch(()=>process.exit(1));`;
const nativeOutput=probe(['--rm','-i','--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','1g','--memory-swap','1g','--pids-limit','64',
 '--tmpfs','/tmp:rw,nosuid,nodev,size=128m,mode=1777','--tmpfs','/grist/sandbox/pyodide/_build/cache:rw,nosuid,nodev,size=128m,uid=1000,gid=1000',
 '-e','GRIST_SANDBOX_FLAVOR=pyodide','-e','GRIST_PYODIDE_SKIP_DENO=0','-e','GRIST_SANDBOX=/usr/local/bin/grist-deno','-e','NODE_PATH=/grist/_build:/grist/_build/ext:/grist/_build/stubs',
 '--entrypoint','node',image,'-'],{input:nativeProgram,timeout:70000});
const native=JSON.parse(nativeOutput.split('\n').find(l=>l.startsWith('{"passed"')));assert.equal(native.passed,true);
assert.deepEqual(await runtimeBinding(command),binding,'Production runtime changed during check');
const receipt={date:new Date().toISOString(),image,wrapperSha256,binarySha256,binding,configurationChecked:true,native,...result,
 scope:'Current image; separate no-network, read-only container without production mounts. NotCapable is required, not a DNS failure. Existing Grist native isolation gate remains separately required.'};
fs.writeFileSync(directory+'/runtime-permissions.json',JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({passed:true,checks:result.checks,productionChanged:false}));
