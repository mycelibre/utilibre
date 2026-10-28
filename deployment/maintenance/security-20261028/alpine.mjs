// Same-branch signed APK overlays; application/configuration bytes are immutable.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const input=JSON.parse(fs.readFileSync(new URL('./alpine-inputs.json',import.meta.url))),root='/var/lib/utilibre-maintenance/security-20261028';
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>input.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const limits=['--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--log-driver','none'];
for(const key of keys){
 const s=input.rows.find(r=>r.key===key),dir=root+'/alpine/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Preserve completed proof');
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',JSON.stringify({status:e.status,signal:e.signal})+'\n'+String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': candidate failed; private evidence retained');}};
 const docker=(...a)=>run('docker',a),native=(id,p,a=[])=>docker('run','--rm',...limits,'--hostname','utilibre-library-fixture','--entrypoint',p,id,...a);
 const config=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));
 const inv=id=>Object.fromEntries(native(id,'cat',['/lib/apk/db/installed']).split('\n\n').map(t=>Object.fromEntries(t.split('\n').filter(l=>/^[PV]:/.test(l)).map(l=>[l[0],l.slice(2)]))).filter(x=>x.P).map(x=>[x.P,x.V]));
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);for(const n of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',n),s.base);assert.equal(native(s.base,'cat',['/etc/alpine-release']),s.release);
 const old=config(s.base),before=inv(s.base);assert(old.User===undefined||typeof old.User==='string'&&/^[A-Za-z0-9_:.-]*$/.test(old.User));
 const app='for d in /app /opt /srv /var/www /usr/local /usr/src /usr/share/nginx; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum';
 const other='find /usr/lib /lib /usr/bin /usr/sbin -path /lib/apk/db -prune -o -type f ! -name "libbrotli*.so*" ! -name "libcurl.so*" ! -path /usr/bin/curl ! -path /usr/bin/wcurl -exec sha256sum {} + | sort | sha256sum';
 const etc='find /etc -type f ! -path /etc/apk/world -exec sha256sum {} + | sort | sha256sum';
 const fingerprints=[app,other,etc].map(c=>native(s.base,'sh',['-ec',c]));
 const context=dir+'/context';fs.mkdirSync(context,{recursive:true});const pins=[];
 for(const [name,v]of Object.entries(s.packages)){
  assert.equal(before[name],v.installed);const p=input.packages[v.package];assert.equal(p.branch,s.release.split('.').slice(0,2).join('.'));
  const file=root+'/packages/alpine-'+p.branch+'/'+p.file;assert.equal(sha(fs.readFileSync(file)),p.sha256);fs.copyFileSync(file,context+'/'+p.file);fs.chmodSync(context+'/'+p.file,0o644);pins.push(p);
 }
 const rootUser=[undefined,'','0','root'].includes(old.User),recipe=`FROM ${s.base}\n${rootUser?'':'USER 0\n'}COPY *.apk /tmp/utilibre-libraries/\nRUN apk add --no-network /tmp/utilibre-libraries/*.apk && rm /tmp/utilibre-libraries/*.apk && rmdir /tmp/utilibre-libraries\n${rootUser?'':'USER '+old.User+'\n'}`;
 fs.writeFileSync(context+'/Dockerfile',recipe);run('docker',['build','--network','none','--pull=false','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(config(imageId),old,'Image configuration changed');const after=inv(imageId),normalized={...after};
 for(const p of pins){assert.equal(after[p.name],p.version);normalized[p.name]=before[p.name];}assert.deepEqual(normalized,before,'Unrelated package change');
 for(const [i,c]of [app,other,etc].entries())assert.equal(native(imageId,'sh',['-ec',c]),fingerprints[i],'Unrelated file change');
 const nativeRows=[];if(s.packages['brotli-libs'])for(const id of [s.base,imageId]){
  const txt=docker('run','--rm',...limits,'-v',root+'/brotli-native-musl:/brotli-native:ro','--entrypoint','/brotli-native',id);assert.equal(txt,'BROTLI_ROUNDTRIP_CORRUPT_INPUT_AND_OUTPUT_BOUND_PASSED');nativeRows.push({imageId:id,passed:true,checks:['encode/decode','corrupt stream rejected','output bound']});
 }
 fs.writeFileSync(dir+'/build.json',JSON.stringify({...s,date:new Date().toISOString(),passed:true,imageId,pins,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationSha256:fingerprints[0].split(' ')[0],unrelatedLibrariesSha256:fingerprints[1].split(' ')[0],etcSha256:fingerprints[2].split(' ')[0],nativeRows,fixtureSha256:sha(fs.readFileSync(root+'/brotli-native-musl')),additionalRequiredGate:'consumer.json',deployed:false},null,2)+'\n');console.log(key+': same-branch package, exact file scope and native library checks passed');
}
