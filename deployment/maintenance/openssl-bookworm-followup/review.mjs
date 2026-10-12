// Prepare only the exact CVE-2026-84782 backport decisions. Never waive a service.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';import {freshScan,overlayRows} from '../review-native-backports.mjs';import {additionalOverlayReceipts} from '../followup-overlays.mjs';import {suites} from './policy.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/openssl-bookworm-followup-20261012',cve='CVE-2026-84782',version='3.0.22-1~deb12u1+utilibre1';
const read=f=>JSON.parse(fs.readFileSync(f)),sha=b=>createHash('sha256').update(b).digest('hex'),run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json'),primary=read(root+'/closure-followup-20261012/debian-primary.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert(Date.now()-Date.parse(primary.date)<86400000);
assert.equal(primary.sources.openssl?.[cve]?.releases?.sid?.status,'resolved');
// The maintained 3.0 source backport, not a claim to contain all newer 3.6 code.
const originalArchive=dir+'/ubuntu/openssl_3.0.13-0ubuntu3.16.debian.tar.xz';assert.equal(sha(fs.readFileSync(originalArchive)),'77893129922c917792dd187c2853fb36ce1c98597c442b42d8190252959b7f6c');
const original=cp.execFileSync('tar',['-xOf',originalArchive,'debian/patches/CVE-2026-84782.patch'],{encoding:'utf8'});assert.equal(sha(original),'50ad8c00cc9fa93b79704a116df6486461c3192d3412a77749bb4c4cd4692589');
const actual=cp.execFileSync('tar',['-xOf',dir+'/build/openssl_'+version+'.debian.tar.xz','debian/patches/utilibre-dtls-CVE-2026-84782.patch'],{encoding:'utf8'});
const changes=s=>s.split('\n').filter(l=>/^[+-]/.test(l)).join('\n');assert.equal(changes(actual),changes(original));assert.match(actual,/e961062f6b86727b63b0381ceeec7fa074026fef/);assert.match(actual,/WRITE_STATE_TRANSITION/);assert.match(actual,/init_off = 0/);
const upstreamSuites=suites(fs.readFileSync(dir+'/build/build.log','utf8'));assert.deepEqual(upstreamSuites,[{files:259,tests:2980},{files:259,tests:3415}]);
const release=read(root+'/closure-followup-20261012/openssl-bookworm-release.json');assert.equal(release.status,'passed');assert.equal(release.groups.length,5);
const originalRows=overlayRows(release),rows=[...originalRows];
for(const p of additionalOverlayReceipts){if(p==='closure-followup-20261012/openssl-bookworm-release.json'||!fs.existsSync(root+'/'+p))continue;for(const next of overlayRows(read(root+'/'+p)))if(next.oldImage!==next.newImage&&rows.some(r=>r.name===next.name&&r.newImage===next.oldImage))rows.push(next);}
const specs=read(new URL('./specs.json',import.meta.url)),payloads=new Map(),decisions=[],proofs=[],skipped=[];
function files(d,p=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(d+'/'+e.name,p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]);}
function nativeProof(spec){
 const out=dir+'/images/'+spec.key,b=read(out+'/build.json'),n=read(out+'/native.json'),a=read(out+'/application.json');assert(b.passed&&b.configurationUnchanged&&n.passed&&n.abiPreserved&&a.passed);assert.equal(n.imageId,b.imageId);assert.equal(a.imageId,b.imageId);assert.equal(b.base,spec.base);assert.equal(b.version,version);assert(originalRows.some(r=>r.name===spec.container&&r.newImage===b.imageId));
 const group=release.groups.find(g=>g.rows.some(r=>r.name===spec.container&&r.newImage===b.imageId));assert(group);
 for(const [file,hash] of Object.entries(group.proofs))assert.equal(sha(fs.readFileSync(file)),hash,'Proof changed since the guarded release');
 assert.deepEqual(n.upstreamSuites,upstreamSuites);assert.equal(n.native.length,2);assert.equal(n.native[0].image,b.base);assert.equal(n.native[1].image,b.imageId);
 for(const x of n.native){assert(x.passed&&x.nativeCrypto&&x.tls12And13AndWrongHost);for(const name of ['test_dtls_client_retransmit','test_dtls_server_retransmit']){
  const patched=x.image===b.imageId,output=fs.readFileSync(out+'/'+(patched?'new':'old')+'-'+name+'.log','utf8');
  if(patched){assert.match(output,new RegExp('(?:^|\\n)ok 1 - '+name+'(?:\\n|$)'));assert(!output.includes('not ok'));}
  else{assert(output.includes('not ok 1 - '+name)&&output.includes('write_calls'));}
  assert(x.dtls.some(t=>t.name===name&&t.passed&&t.expected===(patched?'fixed native state preserved':'old native regression reproduced')));
 }}
 assert(b.abi.length===2&&b.abi.every(p=>p.preservedSymbols>100));
 if(spec.key==='gathio')assert(a.nativePostgresTlsAndWrongHost&&a.nativePostgisProjection&&a.nativeTypedDataAndIsolation&&a.logicalRestore&&a.nativeSdkTls.passed&&a.nativeSdkTls.nativeSigV4VerifiedIndependently&&a.nativeSdkTls.nativeBarmanUploadListReadDownload);
 if(spec.key==='rssbridge'){const v=read(out+'/impersonate.json');assert(v.passed&&v.imageId===b.imageId&&v.proofs.every(p=>p.phpOpenSslPassed&&p.chrome131Preserved&&p.http2Negotiated&&p.unsupportedProtocolsRejected));}
 return b;
}
const hashes={libssl3:'f112c901b8629d43e5812739f2f189d1f8c0e22ec73f6a14a286415b2c42d1d5',openssl:'ca9e03e6c2d98df60b0707d26b5b53c54084b1f744cdd6d6be3178efed9b0b99','libssl-dev':'405a0f9a30ca5961a4db927858ac437c299a19b0ab9717b4706d137056639047'};
for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.id===cve&&i.scope==='runtime-image'&&i.type==='debian'&&i.installed===version&&Object.hasOwn(hashes,i.package))){
 try{
  assert(item.containers.length>0);for(const name of item.containers){const spec=specs.find(s=>s.container===name);assert(spec&&spec.packages.includes(item.package));nativeProof(spec);const row=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date));assert.equal(run('docker',['inspect',name,'--format','{{.Image}}']),item.artifact);}
  if(!payloads.has(item.package)){
   const deb=dir+'/build/'+item.package+'_'+version+'_amd64.deb';assert.equal(sha(fs.readFileSync(deb)),hashes[item.package]);assert.equal(run('dpkg-deb',['-f',deb,'Version']),version);const temp=fs.mkdtempSync('/dev/shm/utilibre-openssl-payload-');
   try{run('dpkg-deb',['-x',deb,temp]);const paths=files(temp).filter(p=>p.startsWith('/usr/')&&!p.startsWith('/usr/share/'));assert(paths.length);payloads.set(item.package,{debSha256:hashes[item.package],files:paths.map(p=>({path:p,sha256:sha(fs.readFileSync(temp+p))}))});}finally{assert(path.basename(temp).startsWith('utilibre-openssl-payload-'));fs.rmSync(temp,{recursive:true});}
  }
  const payload=payloads.get(item.package);for(const name of item.containers){assert.equal(run('docker',['exec',name,'dpkg-query','-W','-f=${Version}',item.package]),version);const lines=run('docker',['exec',name,'sha256sum',...payload.files.map(p=>p.path)]).split('\n');assert.equal(lines.length,payload.files.length);for(let n=0;n<lines.length;n++)assert.equal(lines[n].split(/\s/)[0],payload.files[n].sha256);}
  const reason=`Native stable OpenSSL ${version} contains the maintained Ubuntu 3.0 backport of ${cve}, upstream commit e961062f6b86727b63b0381ceeec7fa074026fef. All patch additions/deletions are byte-identical to authenticated Ubuntu source; only two whitespace context lines changed. Static/shared upstream suites (2980/3415 tests), both old-fails/new-passes DTLS retransmit regressions, ABI, native TLS/crypto consumers and application gates passed before this exact-image release. Actual ${item.package} runtime/static-library payload matches package SHA256 ${payload.debSha256}; current image ancestry and native files rechecked. https://ubuntu.com/security/CVE-2026-84782 ; https://security-tracker.debian.org/tracker/CVE-2026-84782 . Evidence: openssl-bookworm-followup-20261012/review.json. This mitigates only this CVE in these exact bytes, not other OpenSSL advisories or bundled TLS libraries.`;
  decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,artifact:item.artifact,cve,version,...payload});
 }catch(e){skipped.push({key:item.key,package:item.package,reason:e.message.slice(0,180)});}
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
