// Prepare narrow, expiring review drafts; never mutate the decision ledger.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/python-bookworm-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,args)=>cp.execFileSync(p,args,{encoding:'utf8',timeout:60000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const pyversion='3.11.2-6+deb12u9+utilibre1',expatversion='2.9.0-1~deb12u1+utilibre1';
const pypackages=['python3.11','python3.11-minimal','libpython3.11-minimal','libpython3.11-stdlib'];
const specs=read(here+'specs.json'),release=read(dir+'/release.json');assert.equal(release.status,'passed');
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const primary=read(root+'/closure-followup-20261012/debian-primary.json');assert(Date.now()-Date.parse(primary.date)<86400000);
assert.equal(primary.sources.expat['CVE-2026-77214'].releases.sid.status,'resolved');assert.equal(primary.sources.expat['CVE-2026-77214'].releases.sid.fixed_version,'2.9.0-1');
run('node',[here+'verify-source.mjs']);
assert.equal(sha(dir+'/sources/expat_2.9.0.orig.tar.gz'),'6e8ce7b52ebbaa423c59becc7cf1e6875c42e49228c062ac8123c10e700cec27');
assert.match(fs.readFileSync(dir+'/build/expat-native-tests.log','utf8'),/100%: Checks: 5196, Failed: 0/);
assert.match(fs.readFileSync(dir+'/build/python-tests.log','utf8'),/All 10 tests OK/);
const rows=overlayRows(release);
for(const receipt of additionalOverlayReceipts)if(fs.existsSync(root+'/'+receipt))for(const next of overlayRows(read(root+'/'+receipt))){
 const previous=rows.find(r=>r.name===next.name&&r.newImage===next.oldImage);
 if(previous&&next.newImage!==next.oldImage&&!rows.some(r=>r.name===next.name&&r.newImage===next.newImage))rows.push({...next,originalImage:previous.originalImage||previous.newImage});
}
const sums=new Map(fs.readFileSync(dir+'/build/SHA256SUMS','utf8').trim().split('\n').map(l=>[l.slice(66).split('/').at(-1),l.slice(0,64)]));
const manifests=new Map(),checked=new Map(),mitigations=[],notAffected=[],proofs=[];
function walk(d,p=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(d+'/'+e.name,p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]);}
function manifest(pkg){
 if(manifests.has(pkg))return manifests.get(pkg);
 const version=pkg==='libexpat1'?expatversion:pyversion,leaf=pkg+'_'+version+'_amd64.deb',deb=dir+'/build/'+leaf;assert.equal(sha(deb),sums.get(leaf));
 const temp=fs.mkdtempSync('/dev/shm/utilibre-py311-review-');
 try{
  run('dpkg-deb',['-x',deb,temp]);
  const files=walk(temp).filter(p=>/^\/usr\/(?:bin\/|lib\/)/.test(p)&&!p.endsWith('.pyc')).map(path=>({path,sha256:sha(temp+path)}));assert(files.length);
  const value={pkg,version,packageSha256:sha(deb),files};manifests.set(pkg,value);return value;
 }finally{fs.rmSync(temp,{recursive:true});}
}
const absentScript=`import hashlib,inspect,io,json,tarfile
assert 'filter' not in inspect.signature(tarfile.TarFile.extractall).parameters
assert not any(hasattr(tarfile,n) for n in ['data_filter','tar_filter','LinkFallbackError'])
assert not hasattr(tarfile.TarFile,'makelink_with_filter')
memory=io.BytesIO()
with tarfile.open(fileobj=memory,mode='w'): pass
memory.seek(0)
with tarfile.open(fileobj=memory) as archive:
 try: archive.extractall(filter='data')
 except TypeError as error: assert 'filter' in str(error)
 else: raise AssertionError('Unexpected filter implementation')
print(json.dumps({'sha256':hashlib.sha256(open(tarfile.__file__,'rb').read()).hexdigest(),'filterApiAbsent':True,'filterKeywordRejected':True}))`;
for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&((i.installed===pyversion&&pypackages.includes(i.package)&&['CVE-2026-7210','CVE-2026-11940'].includes(i.id))||(i.installed===expatversion&&i.package==='libexpat1'&&i.id==='CVE-2026-77214')))){
 assert.equal(item.containers.length,1);const name=item.containers[0],spec=specs.find(s=>s.containers.includes(name));assert(spec,'No unrelated service waiver');
 const row=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date),'Fresh scan after this exact-role release required');
 assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);
 if(!checked.has(item.artifact)){
  const out=dir+'/images/'+spec.key,b=read(out+'/build.json'),n=read(out+'/native.json'),a=read(out+'/application.json');assert(b.passed&&n.passed&&a.passed);
  assert.equal(b.imageId,row.originalImage||item.artifact);assert.equal(n.imageId,b.imageId);assert.equal(a.imageId,b.imageId);
  const current=n.native.find(x=>x.image===b.imageId);assert(current?.bothParserPathsUse128BitSalt&&current.nativeEntropyApiCalls===2&&current.legacyTarExtractionFiltersAbsent);
  if(spec.key==='gathio')assert(n.sdkNative?.passed&&n.sdkNative.nativeBarmanUploadListReadDownload&&a.postgisRegressionAndProjection);
  const payload=[];
  for(const pkg of [...pypackages,'libexpat1']){
   const m=manifest(pkg);assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}',pkg]),m.version);
   const actual=run('docker',['exec',name,'sha256sum',...m.files.map(f=>f.path)]).split('\n');assert.equal(actual.length,m.files.length);
   actual.forEach((line,index)=>assert.equal(line,m.files[index].sha256+'  '+m.files[index].path));
   payload.push({pkg,packageSha256:m.packageSha256,files:m.files.length,manifestSha256:createHash('sha256').update(JSON.stringify(m.files)).digest('hex')});
  }
  const tar=JSON.parse(run('docker',['exec',name,'python3','-B','-c',absentScript]));assert(tar.filterApiAbsent);assert.equal(tar.sha256,'f697df24384495d0ebfcc90e9d684ab0cfb7127fd33f4adaf29fd44c92be9a91');
  checked.set(item.artifact,{payload,tar,sourceImage:b.imageId,releaseCompletedAt:row.completedAt});
 }
 let status,reason;
 if(item.id==='CVE-2026-11940'){
  status='not-affected';reason='This exact Debian tarfile payload has no PEP706 extraction-filter implementation: extractall has no filter parameter; data_filter, tar_filter, LinkFallbackError and makelink_with_filter are absent. The controlled baseline rejects filter=data, and unchanged source SHA256 f697df24384495d0ebfcc90e9d684ab0cfb7127fd33f4adaf29fd44c92be9a91 and absent API are rechecked live. CVE-2026-11940 bypasses those absent filters. This is NOT a claim that default tar extraction is safe for untrusted archives and does not waive any other tar CVE. https://security-tracker.debian.org/tracker/CVE-2026-11940 ; https://github.com/python/cpython/commit/be13e86f6b9788a6f4d0419dffef72cbae5865c9 . Evidence: python-bookworm-followup-20261012/not-affected-review.json.';
 }else if(item.id==='CVE-2026-7210'){
  status='mitigated';reason='Native Debian CPython 3.11 ABI retained with exact upstream cbaecf9f16da611a646d507c1cbca265c588fc56 C/header edits, plus Bookworm-native Expat 2.9.0. Source additions/deletions match upstream byte-for-byte; every previous Debian patch remains. The actual pyexpat AND ElementTree paths invoke XML_SetHashSalt16Bytes (isolated probe: baseline 0, repaired 2 calls), not the weaker legacy API. Ten targeted upstream Python modules and 5196 Expat checks passed; exact installed runtime/stdlib/library files match retained packages and native app journeys passed. https://github.com/python/cpython/commit/cbaecf9f16da611a646d507c1cbca265c588fc56 ; https://security-tracker.debian.org/tracker/CVE-2026-7210 . Evidence: python-bookworm-followup-20261012/mitigation-review.json. Only this exact finding is addressed.';
 }else{
  status='mitigated';reason='Native Bookworm rebuild of complete Expat 2.9.0 source, using Debian 2.9.0-1 packaging and existing distro ABI/dependencies; not a sid binary or glibc replacement. Debian primary tracker resolves CVE-2026-77214 in 2.9.0-1. All 5196 upstream checks passed; both narrow/wide native libraries preserve all 71 prior exported symbols, and complete installed library payload matches retained build packages. Native Python parser/consumer and application checks passed. https://security-tracker.debian.org/tracker/CVE-2026-77214 ; source SHA256 6e8ce7b52ebbaa423c59becc7cf1e6875c42e49228c062ac8123c10e700cec27. Evidence: python-bookworm-followup-20261012/mitigation-review.json. No unrelated findings waived.';
 }
 const decision=validateDecision({key:item.key,status,reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()});
 (status==='mitigated'?mitigations:notAffected).push(decision);proofs.push({key:item.key,id:item.id,artifact:item.artifact,package:item.package,...checked.get(item.artifact)});
}
for(const [name,decisions] of [['mitigation-review',mitigations],['not-affected-review',notAffected]]){
 const keys=new Set(decisions.map(d=>d.key));fs.writeFileSync(dir+'/'+name+'.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs:proofs.filter(p=>keys.has(p.key))},null,2)+'\n');
}
console.log(JSON.stringify({scanDate:scan.completedAt,mitigations:mitigations.length,notAffected:notAffected.length,applied:false}));
