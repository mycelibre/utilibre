// Same stable-suite vendor package overlay, using the existing finite build and
// release pattern. Only builds candidates: no production dpkg, migration or pull.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const kerberos=process.argv.includes('--kerberos-nov10');if(kerberos)process.argv=process.argv.filter(a=>a!=='--kerberos-nov10');
const root='/var/lib/utilibre-maintenance/security-'+(kerberos?'20261110':'20261109'),here=new URL('.',import.meta.url),inputs=JSON.parse(fs.readFileSync(new URL(kerberos?'../security-20261110/kerberos-inputs.json':'vendor-debian-inputs.json',here)));
if(kerberos)assert.equal(inputs.upstreamVersion,'1.22.3');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const limits=['--hostname','utilibre-vendor-fixture','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--cpus','1','--memory','384m','--memory-swap','384m','--pids-limit','64','--log-driver','none'];
for(const key of process.argv.slice(2)){
 const s=inputs.rows.find(r=>r.key===key);assert(s);const dir=root+'/vendor-debian/'+key;fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Preserve evidence');
 const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:240000,maxBuffer:32*1024**2,stdio:['ignore','pipe','pipe'],...o}).trim();}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stderr||e.message));throw Error(key+': isolated preparation failed; evidence retained');}};
 const docker=(...a)=>run('docker',a),native=(image,cmd,args=[])=>docker('run','--rm',...limits,'--user','0','--tmpfs','/tmp:rw,size=32m,mode=1777','--entrypoint',cmd,image,...args);
 for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
 assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);
 const cfg=i=>readConfig(docker('image','inspect','--format','{{json .Config}}',i));
 function readConfig(s){return JSON.parse(s);}
 const old=cfg(s.base);assert(old.User===undefined||/^[\w:.-]*$/.test(old.User));
 const inventory=i=>Object.fromEntries(native(i,'dpkg-query',['-W','-f=${Package}\t${Version}\n']).split('\n').map(l=>l.split('\t')));
 const before=inventory(s.base),context=dir+'/context';fs.mkdirSync(context,{recursive:true});
 const excluded=new Set(),pins=[];
 for(const [name,p] of Object.entries(s.packages)){
  assert.equal(before[name],p.installed);const pin=inputs.packages[p.package],file=root+'/debian-acquisition/'+pin.file;
  assert.equal(sha(fs.readFileSync(file)),pin.sha256);assert.equal(run('dpkg-deb',['-f',file,'Package']),name);assert.equal(run('dpkg-deb',['-f',file,'Version']),pin.version);
  const extracted=context+'/payload-'+name;run('dpkg-deb',['-x',file,extracted]);
  function visit(dir,path=''){for(const n of fs.readdirSync(dir)){const p=path+'/'+n,full=dir+'/'+n;excluded.add(p);if(fs.lstatSync(full).isDirectory())visit(full,p);}}
  visit(extracted);fs.rmSync(extracted,{recursive:true});
  for(const p of native(s.base,'dpkg-query',['-L',name]).split('\n'))excluded.add(p);
  fs.copyFileSync(file,context+'/'+pin.file);fs.chmodSync(context+'/'+pin.file,0o644);pins.push(pin);
 }
 const allowed=[...excluded].filter(p=>/^\/[\w/+.@:-]+$/.test(p));assert.equal(allowed.length,excluded.size);
 // Package-owned files may change. Everything else in application, config and
 // executable/library roots must stay byte-identical; no broad wildcard edits.
 const scope='for d in /app /opt /usr/local /usr/src /priviblur /upstream /grist /var/www /etc /usr/lib /usr/bin /usr/sbin /lib; do if test -d "$d"; then find "$d" -type f '+allowed.map(p=>"! -path '"+p+"'").join(' ')+' ! -path /etc/ld.so.cache -exec sha256sum {} +; fi; done | LC_ALL=C sort | sha256sum';
 const fingerprint=native(s.base,'sh',['-ec',scope]);
 const user=old.User||'';
 const recipe=`FROM ${s.base}\n${['','root','0'].includes(user)?'':'USER 0\n'}COPY *.deb /tmp/utilibre-vendor/\nRUN dpkg --force-confold -i /tmp/utilibre-vendor/*.deb && test -z "$(dpkg --audit)" && rm -r /tmp/utilibre-vendor\n${['','root','0'].includes(user)?'':'USER '+user+'\n'}`;
 fs.writeFileSync(context+'/Dockerfile',recipe);
 run('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(cfg(imageId),old);
 const after=inventory(imageId),normalized={...after};for(const p of pins){assert.equal(after[p.name],p.version);normalized[p.name]=before[p.name];}assert.deepEqual(normalized,before);
 assert.equal(native(imageId,'sh',['-ec',scope]),fingerprint,'Unrelated application/configuration/library changed');
 const nativeRows=[];
 for(const image of [s.base,imageId]){
  let checks=0;
  if(s.packages.apt){
   assert(native(image,'apt-get',['--version']).startsWith('apt '));
   assert(native(image,'apt-cache',['show','libc6']).includes('Package: libc6')); // installed dpkg/status fallback, no network
   assert(native(image,'apt-config',['dump']).includes('APT'));
   native(image,'apt-get',['--simulate','-o','Debug::NoLocking=true','check']);checks+=4;
  }else if(Object.keys(s.packages).some(p=>p.startsWith('libapt-'))){
   assert(!native(image,'sh',['-ec','ldd /usr/lib/x86_64-linux-gnu/libapt-pkg.so.*']).includes('not found'));checks++;
  }
  if(s.packages.zlib1g){
   assert.equal(sha(fs.readFileSync(root+'/vendor-debian/zlib-native')),inputs.fixture.binarySha256);
   assert.equal(sha(fs.readFileSync(new URL('zlib-native.c',here))),inputs.fixture.sourceSha256);
   assert.equal(docker('run','--rm',...limits,'-v',root+'/vendor-debian/zlib-native:/native:ro','--entrypoint','/native',image),'ZLIB_NATIVE_PASSED checks=7');checks+=7;
  }
  if(kerberos){assert.equal(sha(fs.readFileSync(root+'/vendor-debian/kerberos-native')),inputs.fixture.binarySha256);assert.equal(sha(fs.readFileSync(new URL('../security-20261110/kerberos-native.c',here))),inputs.fixture.sourceSha256);assert.equal(docker('run','--rm',...limits,'-v',root+'/vendor-debian/kerberos-native:/native:ro','--entrypoint','/native',image),'KERBEROS_NATIVE_PASSED checks=15');checks+=15;}
  assert(checks>0);nativeRows.push({imageId:image,passed:true,checks});
 }
 const proof={...s,date:new Date().toISOString(),imageId,passed:true,configurationUnchanged:true,unrelatedPackagesUnchanged:true,applicationSha256:fingerprint.split(' ')[0],pins,nativeRows,fixtureSha256:sha(fs.readFileSync(new URL('vendor-debian.mjs',here))),deployed:false,limitation:kerberos?'Native library upgrade from authenticated MIT release, with ordinary API checks. Full application and live-provider behavior are separate checks. No vulnerability reproduction.':'Native package compatibility and vendor fix evidence. No hostile HTTP APT race or zlib exploit reproduction is claimed.'};
 fs.writeFileSync(dir+'/build.json',JSON.stringify(proof,null,2)+'\n');console.log(key+': exact vendor packages and native checks passed');
}
