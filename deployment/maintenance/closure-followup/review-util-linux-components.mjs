// Component/version attribution only. Does not waive remaining mount defects.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {bookwormHookCase,repairedVersion,repairedPackages,repairedBookwormComponentCase,repairedBookwormEvidence,legacyAbsence} from './mount-component-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',source=dir+'/sources';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const exec=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:15000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const versions={
 [repairedVersion]:{branch:'2.38.1',repaired:true,packages:repairedPackages},
 '2.38.1-5+deb12u3':{branch:'2.38.1',packages:{
  libmount1:'f46e2d6b006951825adde9757790b6609d7c66c7700f9b68f3db913eaac323c3',
  mount:'456ed2c62f884bc1133b6969d4d1eb2e6d8581076b00b4c8d700151155270a7a',
  'util-linux':'8eb241ff24b2e1ee9c0373f4fc9bc728b85bf5966c1496154df7da01c0e42f34',
 }},
 '2.41.5-0+deb13u1':{branch:'2.41.5',packages:{
  libmount1:'6d00f45f2e80e078e906e3eedecd3ba6913e39fef49bff361ee583f17f00ec05',
  mount:'eb70a615114ac40123768beb20e302554d5cb7edb33290be7e418ebe1075c878',
 }},
 '2.41.5-0+deb13u1+utilibre2':{branch:'2.41.5',packages:{
  libmount1:'2c8f0cfd71e577dc391f2e64740fbbbbb6d0bdcb7a0b1797f931181cc6c57b37',
  mount:'d1115bc1201dbe782afeda1fe88ce97c617e1195996da6933a64f3f91f9287dc',
 }},
};
const sourcePins={
 'util-linux-2.38.1/sys-utils/nsenter.c':'b21729644a4e21f5a0e917ce0142b3c5709888f1a0e6eda7d0e6ce86a3b554c6',
 'util-linux-2.38.1/libmount/src/context_mount.c':'09ded04a551e96ae05faca35bf9d56c995ecd7a77efc76f7d785ba6d358862dc',
 'util-linux-2.38.1/libmount/src/context.c':'b4bd89b9bdb8e52e8bd9ca79c00139f703fb646256866cc19527bda09d09b4f0',
 'util-linux-2.41.5/libmount/src/hook_subdir.c':'5a832d08ed196100f1f53f4badb2b9c09fe79f371c9b1bcf5ee273d852c302bc',
};
for(const [path,hash] of Object.entries(sourcePins))assert.equal(sha(fs.readFileSync(source+'/'+path)),hash);
assert(!fs.readFileSync(source+'/util-linux-2.38.1/sys-utils/nsenter.c','utf8').includes('join-cgroup'));
assert(!fs.readFileSync(source+'/util-linux-2.38.1/libmount/src/context_mount.c','utf8').includes('open_tree'));
const legacySource=source+'/util-linux-2.38.1/libmount/src';
legacyAbsence(Object.fromEntries(fs.readdirSync(legacySource).filter(f=>/\.(?:c|h)$/.test(f)).map(f=>[f,fs.readFileSync(legacySource+'/'+f,'utf8')])));
const stableSubdir=fs.readFileSync(source+'/util-linux-2.41.5/libmount/src/hook_subdir.c','utf8');
assert(stableSubdir.includes('subdir mount refused for non-root user'));
assert(!stableSubdir.includes('api->subdir'));
const decisions=[],proofs=[],skipped=[],manifests=new Map(),observed=new Map();
function files(dir,prefix='') {return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?files(dir+'/'+d.name,prefix+'/'+d.name):d.isFile()?[prefix+'/'+d.name]:[]);}
function manifest(version,pkg){
 const key=version+'|'+pkg;if(manifests.has(key))return manifests.get(key);
 const deb=(version===repairedVersion?root+'/mount-acl-final-20261012/output':version.endsWith('+utilibre2')?dir+'/util-linux-trixie':source)+'/'+pkg+'_'+version+'_amd64.deb';assert.equal(sha(fs.readFileSync(deb)),versions[version].packages[pkg]);
 assert.equal(exec('dpkg-deb',['-f',deb,'Version']),version);
 const tmp=fs.mkdtempSync('/dev/shm/utilibre-mount-component-');
 try{
  exec('dpkg-deb',['-x',deb,tmp]);
  const selected=files(tmp).filter(p=>pkg==='util-linux'?/^\/(?:usr\/)?s?bin\/nsenter$/.test(p):pkg==='mount'?/^\/(?:usr\/)?s?bin\/(?:mount|umount)$/.test(p):/\/libmount\.so\./.test(p));
  assert(selected.length>0);const result=selected.map(path=>({path,sha256:sha(fs.readFileSync(tmp+path))}));manifests.set(key,result);return result;
 }finally{fs.rmSync(tmp,{recursive:true});}
}
for(const item of queue.items){
 const spec=versions[item.installed];if(item.status!=='needs-review'||item.type!=='debian'||!spec||!spec.packages[item.package]||!['host-os','runtime-image'].includes(item.scope))continue;
 const subdir=item.id==='CVE-2026-78409'&&['mount','libmount1'].includes(item.package);
 const cgroup=item.id==='CVE-2026-78408'&&item.package==='util-linux'&&spec.branch==='2.38.1';
 const legacyHooks=bookwormHookCase(item);
 if(!subdir&&!cgroup&&!legacyHooks)continue;
 try{
  let repair;
  if(spec.repaired){assert(repairedBookwormComponentCase(item));repair=repairedBookwormEvidence(item,scan);}
  if(legacyHooks){
   const p=read(dir+'/bookworm-mount-hooks/proof.json');assert(p.passed&&Date.now()-Date.parse(p.date)<86400000);
   const native=p.rows.filter(r=>r.legacy&&r.artifact===item.artifact);assert.equal(native.length,2);assert.deepEqual(native.map(r=>r.helperExit).sort(),[0,1]);assert(native.every(r=>r.passed&&item.containers.every(name=>r.containers.includes(name))));
   if(repair){assert.equal(p.scanDate,scan.completedAt);assert(Date.parse(p.date)>=Date.parse(scan.completedAt));assert(native.every(r=>r.version===item.installed));const proved=p.repairedProofs.find(x=>x.artifact===item.artifact&&x.container===item.containers[0]);assert.deepEqual(proved,repair);}
   const control=p.rows.filter(r=>!r.legacy);assert.equal(control.length,2);assert(control.every(r=>r.passed));
  }
  const key=item.artifact+'|'+item.package+'|'+item.installed;
  if(!observed.has(key)){
   const rows=[];
   for(const name of item.scope==='host-os'?[null]:item.containers){
    const run=(p,a)=>name?exec('docker',['exec',name,p,...a]):exec(p,a);
    if(name)assert.equal(exec('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);
    const pkgs=item.package==='mount'?['mount','libmount1']:[item.package];
    for(const pkg of pkgs){
     assert.equal(run('dpkg-query',['-W','-f=${Version}',pkg]),item.installed);
     for(const file of manifest(item.installed,pkg)){assert.equal(run('sha256sum',[file.path]).split(/\s+/)[0],file.sha256);rows.push({name,pkg,...file});}
    }
    if(cgroup)assert(!run('nsenter',['--help']).includes('--join-cgroup'));
   }
   observed.set(key,rows);
  }
  const provenance=repair?'Exact live bytes match locally rebuilt native packages bound to completed mount-acl-final source, regression, application and release proofs.':'Exact live bytes match authenticated Debian packages.';
  const targetRace=repair?'The separate CVE-2026-53613 native repair is reviewed independently, not waived here.':'CVE-2026-53613 remains affected.';
  const reason=legacyHooks?
   `The upstream advisory concerns owner/idmap post-hooks. Exact ${item.installed} source lacks hook_owner/hook_idmap, X-mount.owner/group/mode/idmap and post-hook dispatch; legacy additional-mount handling requires helper status zero. ${provenance} Isolated helper exits 0/1 leave target mode unchanged in eight legacy images; the 2.41 positive control applies mode only on success. https://github.com/util-linux/util-linux/security/advisories/${item.id==='CVE-2026-76642'?'GHSA-m25x-3hj9-m26f':'GHSA-rh77-686x-2f2m'} . This is absent-code attribution, not a vendor fix claim. ${targetRace} No real mount or privileged exploit. Native proof: closure-followup-20261012/bookworm-mount-hooks/proof.json.`:subdir?
   `Upstream GHSA-8f2p-47x3-43mv identifies the detached-subdirectory fast path introduced in 2.42. This exact ${item.installed} source lacks api->subdir; 2.41's hook refuses restricted-user subdirectory mounts, while 2.38 has no open_tree. ${provenance} https://github.com/util-linux/util-linux/security/advisories/GHSA-8f2p-47x3-43mv . This absence decision covers only the subdirectory advisory. No privileged exploit test or general kernel-safety claim.`:
   `Upstream GHSA-55fx-f4gg-cfhj limits the vulnerable --join-cgroup feature to >=2.40. Exact Debian ${item.installed} nsenter source and installed --help have no join-cgroup/cgroup_procs implementation; executable matches authenticated Debian package. https://github.com/util-linux/util-linux/security/advisories/GHSA-55fx-f4gg-cfhj . This does not clear newer nsenter or any other util-linux defect.`;
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Source and live payload hashes: closure-followup-20261012/util-linux-component-review.json; raw findings retained.'}));
  proofs.push({key:item.key,id:item.id,payloads:observed.get(key),...(repair?{repair}:{})});
 }catch(error){skipped.push({key:item.key,id:item.id,reason:error.message.slice(0,180)});}
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt,'Scan changed during proof');
fs.writeFileSync(dir+'/util-linux-component-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,sourcePins,versions,decisions,proofs,skipped},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
