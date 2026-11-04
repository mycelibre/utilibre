// Finite signed libbrotli1 overlays. Uses the existing native-package pattern;
// no dependency resolution, live mutation, package-manager fallback or deployment.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {selectBatch} from '../security-20261103/batch.mjs';
const batch=selectBatch(process.argv.slice(2)),xi=batch.args.includes('--libxi'),expat=batch.args.includes('--expat-debian'),profile=xi?'libxi':expat?'expat-debian':'brotli',packageName=xi?'libxi6':expat?'libexpat1':'libbrotli1';
assert(!(xi&&expat));assert(!(xi||expat)||batch.enabled);process.argv=[...process.argv.slice(0,2),...batch.args.filter(a=>!['--expat-debian','--libxi'].includes(a))];
process.umask(0o077);
const inputs=JSON.parse(fs.readFileSync(batch.input(profile)));
const root=batch.root;
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const limits=['--network','none','--read-only','--user','0','--cap-drop','ALL','--cap-add','DAC_OVERRIDE','--security-opt','no-new-privileges','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','64','--log-driver','none'];
for(const key of keys){
 const s=inputs.rows.find(r=>r.key===key),pin=inputs.packages[s.suite],dir=root+'/'+profile+'/'+key;
 fs.mkdirSync(dir,{recursive:true});assert(!fs.existsSync(dir+'/build.json'),'Keep completed evidence');
 const run=(exe,args,opts={})=>{try{return cp.execFileSync(exe,args,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...opts}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',JSON.stringify({status:e.status,signal:e.signal})+'\n'+String(e.stdout||'')+String(e.stderr||e.message));throw Error(key+': bounded candidate failed; private evidence retained');}};
 const docker=(...a)=>run('docker',a),config=id=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',id));
 const native=(id,cmd,args=[])=>docker('run','--rm',...limits,'--hostname','utilibre-library-fixture','--entrypoint',cmd,id,...args);
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'Recovery reserve');
 for(const n of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',n),s.base,'Unsupported predecessor');
 const os=native(s.base,'cat',['/etc/os-release']);assert(os.includes('VERSION_CODENAME='+s.suite)||os.includes('VERSION_CODENAME="'+s.suite+'"'));
 const archive=root+'/packages/'+s.suite+'/'+pin.file;assert.equal(sha(fs.readFileSync(archive)),pin.sha256);
 if(pin.authentication==='authenticated-source-rebuild'){assert(expat&&s.suite==='bookworm');const file=root+'/expat-bookworm/output/build.json';assert.equal(sha(fs.readFileSync(file)),pin.buildReceiptSha256);const proof=JSON.parse(fs.readFileSync(file));assert(proof.passed&&proof.packageSha256===pin.sha256&&proof.nativeSuite.checks===5328&&proof.nativeSuite.failed===0&&proof.wideChecks===3);assert.equal(sha(fs.readFileSync(new URL('../security-20261103/expat-bookworm-source.json',import.meta.url))),pin.sourceManifestSha256);}
 else {const index=fs.readFileSync(root+'/packages/'+s.suite+'/'+(xi?'libxi-':'')+'package-index.txt');assert.equal(sha(index),pin.authenticatedIndexSha256);assert(index.toString().includes('SHA256: '+pin.sha256));}
 const inventory=id=>Object.fromEntries(native(id,'dpkg-query',['-W','-f=${Package}\t${Version}\n']).split('\n').map(l=>l.split('\t')));
 const before=inventory(s.base);assert.equal(before[packageName],s.installed);
 const old=config(s.base);assert(/^[A-Za-z0-9_:.-]*$/.test(old.User));
 if(s.bundledLibrary){assert(expat&&key==='debian-expanded-penpot-backend'&&s.bundledLibrary.path==='/opt/imagick/lib/deps/libexpat.so.1');assert.equal(native(s.base,'sha256sum',[s.bundledLibrary.path]).split(' ')[0],s.bundledLibrary.beforeSha256);}
 // These roots include the previously modified Python/Node/native dependencies.
 const appScript=('for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql /priviblur /upstream /grist /var/www; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum').replace('-type f -exec',s.bundledLibrary?'-type f ! -path "/opt/imagick/lib/deps/libexpat.so.1" -exec':'-type f -exec');
 const otherScript='find /usr/lib /usr/bin /usr/sbin -type f ! -name "'+(xi?'libXi.so*':expat?'libexpat*.so*':'libbrotli*.so*')+'" -exec sha256sum {} + | sort | sha256sum';
 const etcScript='find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum';
 const fingerprints=[appScript,otherScript,etcScript].map(t=>native(s.base,'sh',['-ec',t]));
 const context=dir+'/context';fs.mkdirSync(context,{recursive:true});fs.copyFileSync(archive,context+'/libbrotli1.deb');fs.chmodSync(context+'/libbrotli1.deb',0o644);
 const rootUser=['','0','root'].includes(old.User);
 if(s.statusFragment){assert(expat&&key==='debian-expanded-penpot-exporter'&&s.statusFragment.path==='/var/lib/dpkg/status.d/libexpat1');assert.equal(native(s.base,'sha256sum',[s.statusFragment.path]).split(' ')[0],s.statusFragment.beforeSha256);}
 if(s.bundledLibrary){const library=fs.readFileSync(root+'/expat-debian/extracted'+s.bundledLibrary.source);assert.equal(sha(library),s.bundledLibrary.afterSha256);fs.writeFileSync(context+'/bundled-expat.so',library,{mode:0o644});fs.chmodSync(context+'/bundled-expat.so',0o644);}
 const recipe=`FROM ${s.base}\n${rootUser?'':'USER 0\n'}COPY libbrotli1.deb /tmp/libbrotli1.deb\nRUN test "$(dpkg-query -W -f='${'${Version}'}' ${packageName})" = '${s.installed}' && dpkg --force-confold -i /tmp/libbrotli1.deb && test "$(dpkg-query -W -f='${'${Version}'}' ${packageName})" = '${s.version}' && test -z "$(dpkg --audit)" && rm /tmp/libbrotli1.deb\n${s.statusFragment?'RUN dpkg-query -s libexpat1 > /var/lib/dpkg/status.d/libexpat1\n':''}${s.bundledLibrary?'COPY bundled-expat.so '+s.bundledLibrary.path+'\n':''}${rootUser?'':'USER '+old.User+'\n'}`;
 fs.writeFileSync(context+'/Dockerfile',recipe);
 run('docker',['build','--network','none','--pull=false','--memory','512m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(config(imageId),old,'Image configuration changed');
 if(s.bundledLibrary)assert.equal(native(imageId,'sha256sum',[s.bundledLibrary.path]).split(' ')[0],s.bundledLibrary.afterSha256);
 if(s.statusFragment)assert.equal(native(imageId,'cat',[s.statusFragment.path]),native(imageId,'dpkg-query',['-s','libexpat1']));
 const after=inventory(imageId);assert.equal(after[packageName],s.version);assert.deepEqual({...after,[packageName]:before[packageName]},before,'Unrelated package change');
 for(const [i,script]of [appScript,otherScript,etcScript].entries())assert.equal(native(imageId,'sh',['-ec',script]),fingerprints[i],'Unrelated application/configuration/library bytes changed');
 const fixture=root+(xi?'/libxi/fixture/native':expat?'/expat-debian/'+(s.suite==='bookworm'?'fixture-bookworm':'fixture')+'/native':'/brotli-native'),nativeRows=[];
 // RSSBridge intentionally preloads curl-impersonate, which exports another
 // Brotli ABI. Test the system package without interposition; the real PHP
 // consumer retains its preload and has a separate mandatory release gate.
 const fixtureEnv=key==='rssbridge'?['-e','LD_PRELOAD=']:[];
 if(key==='rssbridge')assert(old.Env.includes('LD_PRELOAD=/usr/local/lib/curl-impersonate/libcurl-impersonate.so'));
 for(const id of [s.base,imageId]){
  if(xi){
   const pins=JSON.parse(fs.readFileSync(new URL('../security-20261103/xi-fixture.json',import.meta.url)));
   assert.equal(sha(fs.readFileSync(fixture)),pins.binarySha256);
   assert.equal(sha(fs.readFileSync(new URL('../security-20261103/xi-native.c',import.meta.url))),pins.sourceSha256);
   const library=dir+'/'+(id===s.base?'before':'after')+'-libXi.so.6';
   fs.writeFileSync(library,cp.execFileSync('docker',['run','--rm',...limits,'--entrypoint','cat',id,'/usr/lib/x86_64-linux-gnu/libXi.so.6'],{timeout:30000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}),{mode:0o644});
   const text=docker('run','--rm',...limits,'--tmpfs','/tmp:rw,size=32m,mode=1777','-v',fixture+':/native:ro','-v',library+':/xi.so:ro','--entrypoint','sh',inputs.fixtureRuntime,'-ec','Xvfb :99 -nolisten tcp -screen 0 640x480x24 >/tmp/xvfb.log 2>&1 & server=$!; trap "kill $server" EXIT; for i in 1 2 3 4 5; do test ! -S /tmp/.X11-unix/X99 || break; sleep 1; done; /native /xi.so');
   assert.equal(text,'LIBXI_NATIVE_PASSED checks=14');nativeRows.push({imageId:id,passed:true,checks:14,librarySha256:sha(fs.readFileSync(library))});continue;
  }
  const text=docker('run','--rm',...limits,...fixtureEnv,'-v',fixture+':/brotli-native:ro','--entrypoint','/brotli-native',id,...(expat?[id===s.base?'before':'after']:[]));
  if(expat){assert.match(text,/^EXPAT_NATIVE_PASSED subparser=(completed|segfault)$/);nativeRows.push({imageId:id,passed:true,checks:5,subparser:text.split('=')[1],baselineReproduction:id===s.base&&text.endsWith('segfault')});}
  else {assert.equal(text,'BROTLI_ROUNDTRIP_CORRUPT_INPUT_AND_OUTPUT_BOUND_PASSED');nativeRows.push({imageId:id,passed:true,checks:['encode/decode roundtrip','malformed stream rejected','insufficient output rejected']});}
 }
 const proof={...s,date:new Date().toISOString(),passed:true,imageId,pin,applicationSha256:fingerprints[0].split(' ')[0],unrelatedLibrariesSha256:fingerprints[1].split(' ')[0],etcSha256:fingerprints[2].split(' ')[0],configurationUnchanged:true,unrelatedPackagesUnchanged:true,nativeRows,fixtureSha256:sha(fs.readFileSync(fixture)),...(key==='rssbridge'?{additionalRequiredGate:'consumer.json',limitation:'System Brotli tested with LD_PRELOAD cleared only in fixture. Production preload unchanged; embedded vendor Brotli is not repaired by this package.'}:{}),deployed:false};
 fs.writeFileSync(dir+'/build.json',JSON.stringify(proof,null,2)+'\n');console.log(key+': signed package, exact scope, unchanged app/config and native '+(xi?'XInput':expat?'Expat':'Brotli')+' checks passed');
}
