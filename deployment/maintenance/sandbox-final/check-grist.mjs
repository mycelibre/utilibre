import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
const dir=fs.mkdtempSync('/var/lib/utilibre-maintenance/sandbox-final-20261011/native-');
const image=process.argv[2]||'utilibre-grist:1.7.21-deno297-security-20261011';
assert.match(image,/^utilibre-grist:1\.7\.21-[a-z0-9-]+$/);
const name='maintenance-grist-pyodide-stage';
const root=path.resolve('deployment/maintenance/sandbox-final');
const run=(args,options={})=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:150000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...options});
const check=(file,args=[])=>run(['exec',name,'node',`/checks/${file}`,...args]);
assert.equal(run(['ps','-aq','--filter',`name=^/${name}$`]).trim(),'');
fs.chmodSync(dir,0o755);
for(const d of ['data','fixture']){fs.mkdirSync(path.join(dir,d),{mode:0o700});fs.chownSync(path.join(dir,d),1000,1000)}
const env={APP_HOME_URL:'http://127.0.0.1:8484',GRIST_IN_SERVICE:'true',GRIST_FORCE_LOGIN:'true',GRIST_FORWARD_AUTH_HEADER:'X-Forwarded-Email',GRIST_IGNORE_SESSION:'true',GRIST_DEFAULT_EMAIL:'fictional-a@example.invalid',GRIST_SESSION_SECRET:'synthetic-stage-only-not-a-production-key',GRIST_TELEMETRY_LEVEL:'off',GRIST_ALLOW_AUTOMATIC_VERSION_CHECKING:'false',GRIST_SUPPORT_ANON:'false',GRIST_WIDGET_LIST_URL:'',GRIST_LOG_LEVEL:'error',GRIST_ENABLE_REQUEST_FUNCTION:'false',GRIST_SANDBOX_FLAVOR:'pyodide',GRIST_PYODIDE_SKIP_DENO:'0',NODE_PATH:'/grist/_build:/grist/_build/ext:/grist/_build/stubs'};
let created=false;const results=[];
function start(data){run(['run','-d','--name',name,'--network','none','--read-only','--user','1000:1000','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--cpus','1','--memory','2g','--memory-swap','2g','--pids-limit','128','--tmpfs','/tmp:rw,nosuid,nodev,size=128m,mode=1777','--tmpfs','/grist/sandbox/pyodide/_build/cache:rw,nosuid,nodev,size=128m,uid=1000,gid=1000','-v',`${data}:/persist`,'-v',`${dir}/fixture:/fixture`,'-v',`${root}:/checks:ro`,...Object.entries(env).flatMap(([k,v])=>['-e',`${k}=${v}`]),image]);created=true;}
async function ready(){for(let i=0;i<60;i++){try{run(['exec',name,'node','-e',`fetch('http://127.0.0.1:8484/status').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`]);return}catch{}await new Promise(r=>setTimeout(r,1000))}throw Error('Native Grist startup failed');}
try{
start(path.join(dir,'data'));await ready();
assert.equal(run(['exec',name,'sh','-c','test ! -e /usr/bin/runsc && /grist/sandbox/pyodide/worker/node_modules/@deno/linux-x64-glibc/deno --version']).split('\n')[0],'deno 2.9.7 (stable, release, x86_64-unknown-linux-gnu)');
const native=check('grist-native.cjs');assert.ok(native.includes('"passed":true'));results.push(JSON.parse(native.split('\n').find(x=>x.startsWith('{"passed"'))));
results.push(JSON.parse(check('grist-api.cjs').trim()));
run(['stop','--time','15',name]);run(['rm',name]);created=false;
// Isolated synthetic backup and restore only. Never copy production user data.
fs.cpSync(path.join(dir,'data'),path.join(dir,'restore'),{recursive:true,preserveTimestamps:true});
function own(d){fs.chownSync(d,1000,1000);if(fs.statSync(d).isDirectory())for(const f of fs.readdirSync(d))own(path.join(d,f))}own(path.join(dir,'restore'));
start(path.join(dir,'restore'));await ready();results.push(JSON.parse(check('grist-api.cjs',['restore']).trim()));
const receipt={passed:true,date:new Date().toISOString(),image,imageId:run(['image','inspect',image,'--format','{{.Id}}']).trim(),network:'none',limits:'1 CPU / 2GiB / 128 PIDs, uid1000, no capabilities, no-new-privileges',data:'fictional only',checks:results,productionChanged:false};fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify(receipt,null,2)+'\n',{mode:0o600});console.log(JSON.stringify({report:dir,...receipt}));
}catch(error){fs.writeFileSync(path.join(dir,'error.log'),String(error.stderr||error.message),{mode:0o600});console.error('Isolated Grist gate failed; inspect '+dir+'/error.log');process.exitCode=1}
finally{if(created)run(['rm','-f',name]);}
