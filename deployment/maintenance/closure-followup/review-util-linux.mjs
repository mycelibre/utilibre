// Exact fixed-code decisions, bounded by completed release and live bytes.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',build=dir+'/util-linux-trixie',version='2.41.5-0+deb13u1+utilibre2';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const q=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(q,scan);
const release=read(dir+'/util-linux-release.json');assert.equal(release.status,'passed');
const host=read(dir+'/util-linux-host.json');assert.equal(host.status,'passed');assert(host.nativeReadOnlyChecks&&host.configurationLibcAndServicePidsUnchanged);
const regressions=read(dir+'/util-linux-regression.json');assert(regressions.passed&&regressions.rows.length===6);assert(regressions.rows.filter(r=>r.kind==='repaired').every(r=>r.exitCode===0));
const rows=overlayRows(release);const primary=read(dir+'/debian-primary.json');assert(Date.now()-Date.parse(primary.date)<86400000);
// Only the completed curl overlay may advance IDs; all util-linux bytes are
// independently compared again below, including Penpot's private libraries.
if(fs.existsSync(dir+'/curl-release.json')){
 const next=read(dir+'/curl-release.json');assert.equal(next.status,'passed');
 for(const row of overlayRows(next)){
  if(row.oldImage===row.newImage)continue;
  const prior=rows.find(p=>p.name===row.name&&p.newImage===row.oldImage);assert(prior);
  rows.push({...prior,newImage:row.newImage,completedAt:row.completedAt});
 }
}
const sums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').pop(),l.slice(0,64)]));
const debs=new Map(fs.readdirSync(build).filter(f=>f.endsWith('_amd64.deb')).map(f=>[run('dpkg-deb',['-f',build+'/'+f,'Package']),build+'/'+f]));
// These are the explicit unchanged upstream/DHI security patches in the source.
const patches={
 'CVE-2026-76642':['https://github.com/util-linux/util-linux/security/advisories/GHSA-m25x-3hj9-m26f','util-linux-a15c00a9e545aa8b9cf6ec0f888ff6c7b3eaeedc.patch','874e91ef452c086c94192eec0bf94b324a4e6c4b8f23bcc2e26fafe828edad91'],
 'CVE-2026-78408':['https://github.com/util-linux/util-linux/security/advisories/GHSA-55fx-f4gg-cfhj','util-linux-43ec8a89f6c99130727084b3496a2ffd2b4200f0.patch','cf12a53cd8bf86d729c14929ab00d589aa996b6479a42523c96cbbb5c1b817d1'],
 'CVE-2026-78410':['https://github.com/util-linux/util-linux/security/advisories/GHSA-rh77-686x-2f2m','util-linux-9fcb98bf08d9119d07ba3a3c709b1a85e4a1bbcb.patch','86dc6819c9465d829849734605cfe586404607fd7612f3f05ad5c829a33d0bb6'],
 'CVE-2026-53615':['https://github.com/docker-hardened-images/catalog/tree/a399ba8b3297ee5f29c05f9a1d2068743eaae797/package/deb/main/util-linux','util-linux-dhi-CVE-2026-53615.patch','1c245b3d05261a7688f295b5b9b0bdfc3eb44d11bccc5c63668f4fbeffe2c1b6'],
};
for(const [,file,hash] of Object.values(patches))assert.equal(sha(dir+'/sources/'+file),hash);
function walk(d,prefix=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name,prefix+'/'+e.name):e.isFile()?[prefix+'/'+e.name]:[]);}
const payloads=new Map(),observed=new Map(),decisions=[],proofs=[],skipped=[];
const oldHostMappings=[];
for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p))){try{
 if(fs.readFileSync('/proc/'+pid+'/cgroup','utf8').includes('docker'))continue;
 const maps=fs.readFileSync('/proc/'+pid+'/maps','utf8');
 if(/lib(?:mount|blkid|uuid|smartcols|lastlog|fdisk).*\(deleted\)/.test(maps))oldHostMappings.push(Number(pid));
}catch{}}
function payload(pkg){
 if(payloads.has(pkg))return payloads.get(pkg);const deb=debs.get(pkg);assert(deb);assert.equal(sha(deb),sums.get(deb.split('/').pop()));
 const tmp=fs.mkdtempSync('/dev/shm/utilibre-util-proof-');try{run('dpkg-deb',['-x',deb,tmp]);const files=walk(tmp).filter(p=>/^\/(?:usr\/)?(?:s?bin\/|lib\/.*\.so)/.test(p));assert(files.length);const data={packageSha256:sha(deb),files:files.map(p=>({path:p,sha256:sha(tmp+p)}))};payloads.set(pkg,data);return data;}finally{fs.rmSync(tmp,{recursive:true});}
}
for(const item of q.items){
 if(item.status!=='needs-review'||item.type!=='debian'||!debs.has(item.package)||!['host-os','runtime-image'].includes(item.scope))continue;
 const isHost=item.scope==='host-os';const matches=rows.filter(r=>r.newImage===item.artifact);
 if(!isHost&&!matches.length)continue;if(isHost&&item.artifact!=='host-dpkg')continue;
 const patch=patches[item.id],fixed=primary.sources['util-linux']?.[item.id]?.releases?.trixie;
 if(!patch&&!(fixed?.status==='resolved'&&fixed.fixed_version&&fixed.fixed_version!=='0'))continue;
 try{
  if(!patch)run('dpkg',['--compare-versions','2.41.5-0+deb13u1','ge',fixed.fixed_version]);
  if(isHost&&item.package.startsWith('lib'))assert.equal(oldHostMappings.length,0,'Old host library mappings still require service refresh; repaired disk bytes alone are insufficient');
  if(!isHost){assert.deepEqual([...item.containers].sort(),matches.map(r=>r.name).sort());assert(matches.every(r=>Date.parse(r.completedAt)<=Date.parse(scan.date)));}else assert(Date.parse(host.completedAt)<=Date.parse(scan.date));
  const key=item.artifact+'|'+item.package;
  if(!observed.has(key)){
   const p=payload(item.package),records=[];
   for(const name of isHost?[null]:item.containers){
    const cmd=(p,a)=>name?run('docker',['exec',name,p,...a]):run(p,a);
    if(name)assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);
    assert.equal(cmd('dpkg-query',['-W','-f=${source:Version}',item.package]),version);
    const hashes=cmd('sha256sum',p.files.map(f=>f.path)).split('\n');assert.equal(hashes.length,p.files.length);
    hashes.forEach((line,i)=>{assert.equal(line.slice(0,64),p.files[i].sha256);assert.equal(line.slice(66),p.files[i].path);});
    if(name==='utilibre-expanded-penpot-backend-1'&&['libmount1','libblkid1'].includes(item.package)){
     const base=item.package==='libmount1'?'libmount':'libblkid',file=p.files.find(f=>f.path.includes('/'+base+'.so.'));assert(file);assert.equal(cmd('sha256sum',['/opt/imagick/lib/deps/'+base+'.so.1']).split(/\s+/)[0],file.sha256);
    }
    records.push({name,packageSha256:p.packageSha256,files:p.files.length});
   }
   observed.set(key,records);
  }
  const reason=patch?`Unmodified checksum-pinned upstream/DHI patch in the native stable rebuild: ${patch[0]}. Patch SHA256 ${patch[2]}.`:`Authenticated Debian 2.41.5 source includes the Debian fix at ${fixed.fixed_version}: https://security-tracker.debian.org/tracker/${item.id}.`;
  decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Exact util-linux ${version} runtime payload repair. ${reason} Every shipped executable/shared-library byte in this package was matched live to the native build; Penpot's private loader copies are included. Stable ABI, unchanged application/configuration, upstream non-root suite with documented skips, old/new synthetic helper and descriptor controls, and live release gates passed. No privileged mount/host namespace exploit was attempted; source-pin race mitigation is source-reviewed, not a claim of a full adversarial kernel test. Evidence: closure-followup-20261012/util-linux-review.json and util-linux-release.json. Only this finding is reviewed; raw records retained.`}));proofs.push({key:item.key,id:item.id,observations:observed.get(key)});
 }catch(error){skipped.push({key:item.key,id:item.id,package:item.package,reason:error.message.slice(0,180)});}
}
fs.writeFileSync(dir+'/util-linux-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
