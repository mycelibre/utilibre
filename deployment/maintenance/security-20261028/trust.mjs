// Signed-index native APK update in a disposable package root, never a live container.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {unchangedPackages} from './trust-policy.mjs';
process.umask(0o077);
const input=JSON.parse(fs.readFileSync(new URL('./trust-inputs.json',import.meta.url))),root='/var/lib/utilibre-maintenance/security-20261028/trust',acq=root+'-review';
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>input.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [f,h]of Object.entries(input.pins))assert.equal(sha(fs.readFileSync(acq+'/'+f)),h);
for(const key of keys){
 const s=input.rows.find(s=>s.key===key),dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'));
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': native trust update failed; private diagnostics retained');}};
 const docker=(...a)=>run('docker',a),cfg=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));
 assert.equal(docker('inspect','--format','{{.Image}}',s.containers[0]),s.base);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 const target=fs.mkdtempSync(dir+'/root-'),old=docker('create','--entrypoint','/not-run',s.base);
 try{for(const path of ['/lib/apk/db','/etc/apk','/etc/ssl','/etc/pki','/var/lib/db/sbom']){fs.mkdirSync(target+path.slice(0,path.lastIndexOf('/')),{recursive:true});docker('cp',old+':'+path,target+path);}}finally{docker('rm',old);}
 const inventory=()=>{const out={};function walk(d){for(const n of fs.readdirSync(d)){const p=d+'/'+n,st=fs.lstatSync(p);if(st.isDirectory())walk(p);else out[p.slice(target.length)]=st.isSymbolicLink()?{link:fs.readlinkSync(p)}:{sha256:sha(fs.readFileSync(p)),mode:st.mode&0o777};}}walk(target);return out;};
 const packages=()=>Object.fromEntries(fs.readFileSync(target+'/lib/apk/db/installed','utf8').trim().split('\n\n').map(b=>[b.match(/^P:(.+)$/m)[1],b]));
 const before=inventory(),previous=packages();assert(previous['ca-certificates-bundle'].includes('\nV:'+input.previous+'\n'));
 fs.copyFileSync(target+'/etc/ssl/certs/ca-certificates.crt',dir+'/before.pem');
 const limits=['--rm','--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','CHOWN','--cap-add','FOWNER','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--memory','512m','--cpus','1','--pids-limit','32','--log-driver','none','--tmpfs','/tmp:rw,size=64m','--mount','type=bind,src='+acq+',dst=/trust,readonly'];
 const verified=docker('run',...limits,'--entrypoint','apk',input.helper,'--keys-dir','/trust','verify','/trust/APKINDEX.tar.gz');assert(verified.endsWith(': OK'));
 const log=docker('run',...limits,'--mount','type=bind,src='+target+',dst=/target','--entrypoint','apk',input.helper,'--root','/target','--keys-dir','/trust','--repositories-file','/dev/null','--repository','/trust','--no-cache','--no-network','add','--no-scripts','ca-certificates-bundle='+input.version);fs.writeFileSync(dir+'/native-installer.log',verified+'\n'+log+'\n');
 const next=packages();assert(next['ca-certificates-bundle'].includes('\nV:'+input.version+'\n'));unchangedPackages(previous,next);
 assert.equal(sha(fs.readFileSync(target+'/etc/ssl/certs/ca-certificates.crt')),input.bundleSha256);
 // Native installer log belongs in private build evidence, not the image.
 assert(!Object.hasOwn(before,'/var/log/apk.log'));
 fs.renameSync(target+'/var/log/apk.log',dir+'/apk-install-'+Date.now()+'.log');
 const after=inventory(),changed=Object.keys(after).filter(p=>JSON.stringify(after[p])!==JSON.stringify(before[p])).sort();
 const deleted=Object.keys(before).filter(p=>!Object.hasOwn(after,p));
 assert(deleted.every(p=>p==='/var/lib/db/sbom/ca-certificates-bundle-'+input.previous+'.spdx.json'),'Unexpected removal');
 const allowed=['/etc/apk/world','/lib/apk/db/installed','/etc/ssl/certs/ca-certificates.crt','/var/lib/db/sbom/ca-certificates-bundle-'+input.version+'.spdx.json'];
 assert.deepEqual(changed,allowed.sort());
 const context=dir+'/context';fs.mkdirSync(context,{recursive:true});let recipe='FROM '+s.base+'\n';
 for(const [i,p]of changed.entries()){assert(!after[p].link);fs.copyFileSync(target+p,context+'/'+i);fs.chmodSync(context+'/'+i,after[p].mode);recipe+='COPY '+i+' '+p+'\n';}
 fs.writeFileSync(context+'/Dockerfile',recipe);run('docker',['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(cfg(imageId),cfg(s.base));
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),passed:true,imageId,configurationUnchanged:true,version:input.version,bundleSha256:input.bundleSha256,changedFiles:changed,unrelatedPackagesUnchanged:true,signedIndexVerified:true,nativeApkInstall:true,retainedHistoricalSbom:deleted,deployed:false},null,2)+'\n');
 console.log(key+': signed native APK trust update prepared; application/verification gates still required');
}
