// Native Bookworm sudo only; build an isolated image without touching the live
// service, its configuration, account database, or current Compose pin.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
export const dir='/var/lib/utilibre-maintenance/sudo-followup-20261012';
export const spec={container:'utilibre-community-uptime-kuma-1',baseRef:'utilibre-kuma:click-security-20261012',base:'sha256:a30210737c27fd8a9e0e162e472377ad1692348eee9001e4ccaee4d245a731ca',candidate:'utilibre-kuma:sudo-security-20261012'};
export const oldVersion='1.9.13p3-1+deb12u4',version=oldVersion+'+utilibre1';
export const packageName=`sudo_${version}_amd64.deb`,packageHash='3d09d0e1c23b598ca48c20d187bded4899cb17d80c3cf1f603b7758606f66e37';
export const sha=b=>createHash('sha256').update(b).digest('hex');
export function run(cmd,args,input){try{return cp.execFileSync(cmd,args,{input,encoding:'utf8',timeout:180000,maxBuffer:12e6,stdio:['pipe','pipe','pipe'],env:{...process.env,DOCKER_BUILDKIT:'0',APP_BIND_IP:'10.10.1.43'}}).trim();}catch(e){fs.writeFileSync(dir+'/kuma-command-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Bounded sudo maintenance check failed; private diagnostics retained');}}
export const docker=(...args)=>run('docker',args),inspect=name=>JSON.parse(docker('inspect',name))[0];
export const limits=['--rm','--network','none','--hostname','utilibre-sudo-fixture','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--pids-limit','64','--log-driver','none','--ulimit','core=0','--tmpfs','/tmp:rw,size=32m,mode=1777'];
const here=new URL('.',import.meta.url).pathname;
if(process.argv[1]===new URL(import.meta.url).pathname){
 assert(!fs.existsSync(dir+'/kuma-build.json'));assert.equal(inspect(spec.baseRef).Id,spec.base);assert.equal(inspect(spec.container).Image,spec.base);
 const native=JSON.parse(fs.readFileSync(dir+'/bookworm/output/native.json'));assert.equal(native.candidateSha256,packageHash);assert.equal(native.version,version);assert(native.upstreamResults.every(r=>r.errors===0));assert.equal(native.abi.length,14);assert.equal(native.configs.length,7);
 const source=JSON.parse(fs.readFileSync(dir+'/source-offer.json'));assert(source.published);assert.equal(source.sha256,'0f26666dd28dc3b9a99b83e1752f28723409f19b8b1a7ac49f7676d6a745d26c');
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
 const context=dir+'/kuma-overlay';fs.mkdirSync(context+'/packages',{recursive:true});
 const deb=fs.readFileSync(dir+'/bookworm/output/'+packageName);assert.equal(sha(deb),packageHash);fs.writeFileSync(context+'/packages/'+packageName,deb);
 const before=inspect(spec.base);
 docker('build','--pull=false','--network=none','--memory','384m','--cpu-period','100000','--cpu-quota','100000','--build-arg','BASE='+spec.baseRef,'--build-arg','RESTORE_USER='+(before.Config.User||'root'),'-f',here+'../xml-final/Dockerfile','-t',spec.candidate,context);
 const after=inspect(spec.candidate),norm=c=>({...c,User:['','root','0',undefined].includes(c.User)?'root':c.User});assert.deepEqual(norm(after.Config),norm(before.Config));
 const fingerprint=(image,command)=>docker('run',...limits,'--user','0','--entrypoint','sh',image,'-ec',command);
 const commands={application:'for d in /app /opt /usr/local; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',configuration:'find /etc -type f -exec sha256sum {} + | sort | sha256sum',libraries:'find /usr/lib /lib -type f -name "*.so*" -exec sha256sum {} + | sort | sha256sum'};
 const hashes={};for(const [name,command]of Object.entries(commands)){hashes[name]=fingerprint(spec.base,command);assert.equal(fingerprint(spec.candidate,command),hashes[name],name+' changed');}
 const inventory=image=>fingerprint(image,"dpkg-query -W -f='${binary:Package} ${Version}\\n'").split('\n').filter(line=>!line.startsWith('sudo '));assert.deepEqual(inventory(spec.candidate),inventory(spec.base));
 assert.equal(fingerprint(spec.base,"dpkg-query -W -f='${Version}' sudo"),oldVersion);assert.equal(fingerprint(spec.candidate,"dpkg-query -W -f='${Version}' sudo"),version);
 for(const row of native.abi){const actual=docker('run',...limits,'--user','0','--entrypoint','sha256sum',spec.candidate,row.path).split(/\s/)[0];assert.equal(actual,row.sha256,row.path);}
 // Parser only; no authentication, privilege transition or cache operation.
 // sudo --version initializes a plugin that tries setresuid even in version
 // mode; the intentionally cap-less fixture must not be weakened for that.
 docker('run',...limits,'--user','0','--entrypoint','visudo',spec.candidate,'-c','-q');
 const click=JSON.parse(docker('run',...limits,'--user','1000:1000','--mount','type=bind,src='+here+'../click-followup/native.py,dst=/check.py,readonly','--entrypoint','python3',spec.candidate,'/check.py'));assert(click.passed&&click.noDelivery&&click.apprise==='1.10.0'&&click.click==='8.3.3');
 const result={...spec,date:new Date().toISOString(),imageId:after.Id,passed:true,packageName,packageHash,version,configurationUnchanged:true,unrelatedPackagesUnchanged:true,hashes,nativeProofSha256:sha(fs.readFileSync(dir+'/bookworm/output/native.json')),sourceArchiveSha256:source.sha256,parserPassed:true,packageVersionVerified:true,versionCommand:'Not run: sudo version mode needs an internal UID transition blocked by the cap-less fixture; exact package version and binary hashes verified instead',clickPreserved:click,productionChanged:false};
 fs.writeFileSync(dir+'/kuma-build.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({candidate:spec.candidate,imageId:after.Id,version,configurationUnchanged:true,clickPreserved:true,productionChanged:false}));
}
