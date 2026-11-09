// Finite signed, same-branch zlib overlay preparation. Never releases images,
// changes Compose files, updates the queue, or mounts production data.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

process.umask(0o077);
const here=new URL('.',import.meta.url),root='/var/lib/utilibre-maintenance/security-20261109/zlib';
const inputs=JSON.parse(fs.readFileSync(new URL('zlib-inputs.json',here)));
assert.equal(inputs.schemaVersion,1);
const keys=process.argv.slice(2);assert(keys.length&&new Set(keys).size===keys.length);
const sha=b=>createHash('sha256').update(b).digest('hex');
const limits=['--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges',
 '--cpus','1','--memory','256m','--memory-swap','256m','--pids-limit','64','--log-driver','none'];
const run=(p,args,options={})=>cp.execFileSync(p,args,{encoding:'utf8',timeout:240000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...options});
const docker=(...args)=>run('docker',args).trim();
const native=(image,entry,args=[])=>docker('run','--rm',...limits,'--user','0','--entrypoint',entry,image,...args);
const inventory=image=>Object.fromEntries(native(image,'cat',['/lib/apk/db/installed']).split('\n\n')
 .map(record=>Object.fromEntries(record.split('\n').filter(line=>/^[PV]:/.test(line)).map(line=>[line[0],line.slice(2)])))
 .filter(r=>r.P).map(r=>[r.P,r.V]));
const config=image=>JSON.parse(docker('image','inspect','--format','{{json .Config}}',image));

for(const key of keys){
 const s=inputs.rows.find(row=>row.key===key);assert(s&&s.approval==='preparation-only'&&!s.ownerHold);
 const dir=root+'/'+key;fs.mkdirSync(dir,{recursive:true});
 assert(!fs.existsSync(dir+'/build.json')&&!fs.existsSync(dir+'/stage.json'),'Preserve completed or failed evidence');
 try{
  const space=fs.statfsSync('/');assert(space.bavail*space.bsize>=inputs.minimumFreeBytes);
  for(const name of s.containers)assert.equal(docker('inspect','--format','{{.Image}}',name),s.base);
  assert.equal(native(s.base,'cat',['/etc/alpine-release']),s.release);
  const before=inventory(s.base);assert.equal(before.zlib,s.installed);assert.equal(before.musl,s.musl);
  const old=config(s.base),p=inputs.packages[s.branch];assert(p&&p.branch===s.release.split('.').slice(0,2).join('.'));
  const apk=root+'/packages/alpine-'+p.branch+'/'+p.file;assert.equal(sha(fs.readFileSync(apk)),p.sha256);
  assert.equal(sha(fs.readFileSync(root+'/fixture/native')),inputs.nativeFixture.binarySha256);
  assert.equal(sha(fs.readFileSync(new URL(inputs.nativeFixture.source,here))),inputs.nativeFixture.sourceSha256);
  const context=dir+'/context';fs.mkdirSync(context);
  fs.copyFileSync(apk,context+'/'+p.file);fs.chmodSync(context+'/'+p.file,0o644);
  const rootUser=[undefined,'','0','root'].includes(old.User);assert(rootUser||/^[A-Za-z0-9_:.-]+$/.test(old.User));
  const alias='utilibre-zlib-base:'+s.base.slice(7,19);docker('tag',s.base,alias);
  fs.writeFileSync(context+'/Dockerfile',`FROM ${alias}\n${rootUser?'':'USER 0\n'}COPY ${p.file} /tmp/utilibre-zlib.apk\nRUN set -eu; if [ -f /var/log/apk.log ]; then cp -p /var/log/apk.log /tmp/utilibre-apk.log; fi; apk verify /tmp/utilibre-zlib.apk; apk add --no-network /tmp/utilibre-zlib.apk; if [ -f /tmp/utilibre-apk.log ]; then cp -p /tmp/utilibre-apk.log /var/log/apk.log; rm /tmp/utilibre-apk.log; else rm -f /var/log/apk.log; fi; rm /tmp/utilibre-zlib.apk\n${rootUser?'':'USER '+old.User+'\n'}`);
  const log=run('docker',['build','--network','none','--pull=false','--force-rm','--memory','256m','--cpu-period','100000','--cpu-quota','100000','-t',s.candidate,context],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
  fs.writeFileSync(dir+'/build.log',log);
  const imageId=docker('image','inspect','--format','{{.Id}}',s.candidate);assert.deepEqual(config(imageId),old,'Runtime configuration changed');
  const after=inventory(imageId);assert.equal(after.zlib,p.version);assert.deepEqual({...after,zlib:before.zlib},before,'Unrelated APK change');
  const nativeRows=[];
  for(const image of [s.base,imageId]){
   const output=docker('run','--rm',...limits,'--user','65534:65534','-v',root+'/fixture/native:/native:ro','--entrypoint','/native',image);
   assert.equal(output,'ZLIB_NATIVE_PASSED checks=7');nativeRows.push({imageId:image,passed:true,checks:7});
  }
  const stage={...s,date:new Date().toISOString(),imageId,package:p,configurationUnchanged:true,unrelatedPackagesUnchanged:true,nativeRows,nativeFixture:inputs.nativeFixture,deployed:false};
  fs.writeFileSync(dir+'/stage.json',JSON.stringify(stage,null,2)+'\n');
  run('python3',[new URL('zlib-check.py',here).pathname,'--scope',key]);
  const scope=JSON.parse(fs.readFileSync(dir+'/scope.json'));assert(scope.passed&&scope.base===s.base&&scope.imageId===imageId&&scope.allUnrelatedImageFilesUnchanged&&scope.muslUnchanged);
  const result={...stage,passed:true,scopeSha256:sha(fs.readFileSync(dir+'/scope.json')),applicationBytesUnchanged:true,
   additionalRequiredGates:['consumer.json','scan-gate.json'],releaseAuthorized:false,rollbackImage:s.base};
  fs.writeFileSync(dir+'/build.json',JSON.stringify(result,null,2)+'\n');
  console.log(key+': signed zlib overlay, seven native checks per version, full unrelated-file and configuration parity passed.');
 }catch(error){
  fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(error.stack)+'\n'+String(error.stdout||'')+String(error.stderr||''));throw error;
 }
}
