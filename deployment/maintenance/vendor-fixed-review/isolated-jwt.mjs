// Small adapter for the existing synthetic native test, not a service runner.
// No network, production volumes, Docker socket or credentials inside tests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const bwrapSha='573236e5328ac2ebb08f59ae3a9805b4f8d12bdef14be8af4450d5463294985f';
const env={PATH:'/usr/bin:/bin',LANG:'C.UTF-8'};
function command(program,args){return execFileSync(program,args,{env,encoding:'utf8',timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();}
export function runNativeJwt(artifact,fixture,sandbox,execute=command){
 if(artifact==='host-dpkg'){
  assert(sandbox&&sandbox.startsWith('/'),'Pinned bubblewrap required for host tests; never fall back to unsandboxed execution');
  assert.equal(createHash('sha256').update(fs.readFileSync(sandbox)).digest('hex'),bwrapSha,'Sandbox binary changed');
  const args=['--unshare-all','--die-with-parent','--new-session','--clearenv','--setenv','PATH',env.PATH,'--setenv','LANG',env.LANG,'--ro-bind','/usr','/usr'];
  for(const p of ['/bin','/lib','/lib64'])if(fs.existsSync(p))args.push('--ro-bind',p,p);
  args.push('--proc','/proc','--dev','/dev','--tmpfs','/tmp','--chdir','/tmp','--cap-drop','ALL','--','/usr/bin/python3','-I','-B','-c',fixture);
  return JSON.parse(execute('/usr/bin/prlimit',['--as=268435456','--cpu=15','--',sandbox,...args]));
 }
 assert(/^sha256:[a-f0-9]{64}$/.test(artifact),'Exact local image required');
 let cid;
 try{
  cid=execute('docker',['create','--pull','never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','128m','--memory-swap','128m','--cpus','0.5','--pids-limit','32','--log-driver','none','--user','65534:65534','--entrypoint','/usr/bin/python3',artifact,'-I','-B','-c',fixture]);
  assert(/^[a-f0-9]{64}$/.test(cid),'Invalid disposable container identity');
  const output=execute('docker',['start','--attach',cid]);
  assert.equal(execute('docker',['inspect','--format','{{.State.ExitCode}}',cid]),'0','Native check failed');
  return JSON.parse(output);
 }finally{
  // Only the container created by this invocation, even on timeout/failure.
  if(cid&&/^[a-f0-9]{64}$/.test(cid))execute('docker',['rm','--force','--volumes',cid]);
 }
}
