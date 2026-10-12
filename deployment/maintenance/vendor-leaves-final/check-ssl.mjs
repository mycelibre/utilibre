import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',recipe=fileURLToPath(new URL('.',import.meta.url));
const report=JSON.parse(fs.readFileSync(dir+'/ssl-stage.json'));assert.equal(report.status,'passed');
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:30000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']});
const results=[];
for(const r of report.rows){
 const name='maintenance-ssl-native-'+r.kind;
 try{
  assert.equal(docker(['image','inspect',r.candidate,'--format','{{.Id}}']).trim(),r.candidateId);
  // Redlib's unchanged upstream startup requires its native Reddit OAuth request.
  // No user/search/content request is sent. Mumble remains network-isolated.
  const args=['run','-d','--name',name,'--network',r.kind==='redlib'?'bridge':'none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--cap-drop','ALL','--security-opt','no-new-privileges:true','--tmpfs','/tmp:rw,size=16m,mode=1777'];
  if(r.kind==='mumble')args.push('--user','10000:10000','--tmpfs','/data:rw,size=32m,uid=10000,gid=10000','-e','MUMBLE_CONFIG_SERVER_PASSWORD=Fictional-only-native-2026','-e','MUMBLE_CONFIG_USERS=4','-e','MUMBLE_CONFIG_REGISTER_HOSTNAME=','-e','MUMBLE_CONFIG_REGISTER_PASSWORD=','-e','MUMBLE_CONFIG_ICE=','-e','MUMBLE_CONFIG_LOGFILE=/dev/null','-e','MUMBLE_CONFIG_LOGDAYS=-1','-e','MUMBLE_CONFIG_ALLOWPING=false','-e','MUMBLE_CONFIG_BONJOUR=false');
  args.push(r.candidate);if(r.kind==='redlib')args.push('redlib','-4','-H','0');docker(args);
  const pid=JSON.parse(docker(['inspect',name]))[0].State.Pid;assert(pid>0);
  let passed=false;
  for(let n=0;n<12;n++){
   try{
    const code=r.kind==='mumble'?[process.execPath,recipe+'mumble-native.mjs']:[process.execPath,'--input-type=module','-e',`let r=await fetch('http://127.0.0.1:8080/settings');if(r.status!==200||!(await r.text()).includes('Redlib'))throw Error('Native settings failed');console.log('REDLIB_NATIVE_PASSED')`];
    const output=execFileSync('nsenter',['-t',String(pid),'-n',...code],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});assert.match(output,new RegExp(r.kind.toUpperCase()+'_NATIVE_PASSED'));passed=true;break;
   }catch(e){if(n===11)throw e;await new Promise(s=>setTimeout(s,1000));}
  }
  assert(passed);results.push({kind:r.kind,imageId:r.candidateId,status:'passed',date:new Date().toISOString(),checks:r.kind==='mumble'?['native TLS authentication','wrong-password denial','valid account-independent guest join','exact server-only Opus loopback']:['native HTTP settings page; no visitor search/content request'],network:r.kind==='redlib'?'native startup OAuth to Reddit; settings checked inside container network only':'none'});console.log(r.kind+': native protocol gate passed');
 }catch(e){fs.writeFileSync(dir+'/'+r.kind+'-ssl-native-error.log',String(e.stdout||'')+String(e.stderr||'')+String(e));throw Error(r.kind+' SSL native gate failed; private diagnostic retained');}
 finally{try{docker(['rm','-f',name]);}catch{}}
}
fs.writeFileSync(dir+'/ssl-native.json',JSON.stringify({status:'passed',completedAt:new Date().toISOString(),rows:results},null,2)+'\n');
