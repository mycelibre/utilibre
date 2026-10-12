// Rebind unchanged application advisories through two exact native releases.
// Emits an apply_patch only; dependency verdicts and raw findings are untouched.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {replaceImagePins} from '../language-final/release.mjs';
const root='/var/lib/utilibre-maintenance',file='/home/ubuntu/freetools/deployment/maintenance/advisory-reviews.json';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original);
const paths=['closure-followup-20261012/rssbridge-curl-release.json','python-bookworm-followup-20261012/release.json','closure-followup-20261012/openssl-bookworm-release.json'];
const releases=paths.filter(p=>fs.existsSync(root+'/'+p)).map(p=>({path:p,...read(root+'/'+p)}));
for(const release of releases){
 assert.equal(release.status,'passed');
 for(const group of release.groups){assert.equal(group.status,'passed');
  for(const row of group.rows){
   if(row.oldImage===row.newImage)continue;
   const ssl=release.path.endsWith('/openssl-bookworm-release.json');
   const proofDir=ssl?root+'/openssl-bookworm-followup-20261012/images/'+row.key:root+(row.key==='rssbridge'?'/bookworm-curl-followup-20261012/images/rssbridge':'/python-bookworm-followup-20261012/images/'+row.key);
   const b=read(proofDir+'/build.json'),n=read(proofDir+'/native.json'),a=read(proofDir+'/application.json');
   assert(b.passed&&b.configurationUnchanged&&n.passed&&a.passed);assert.equal(b.imageId,row.newImage);assert.equal(n.imageId,row.newImage);assert.equal(a.imageId,row.newImage);assert.equal(b.base,row.oldImage);
   for(const name of ['applicationSha256','etcSha256','unrelatedLibrariesSha256'])assert.match(b[name],/^[a-f0-9]{64}/);
   if(ssl){
    assert(n.abiPreserved&&n.native.length===2&&n.native.every(x=>x.nativeCrypto&&x.tls12And13AndWrongHost&&x.dtls.every(t=>t.passed)));
    assert.deepEqual(n.upstreamSuites,[{files:259,tests:2980},{files:259,tests:3415}]);
    for(const [file,expected] of Object.entries(group.proofs))assert.equal(sha(fs.readFileSync(file)),expected);
    const check=command=>image=>cp.execFileSync('docker',['run','--rm','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--hostname','utilibre-openssl-fixture','--network','none','--memory','512m','--cpus','1','--pids-limit','64','--log-driver','none','--user','0','--entrypoint','sh',image,'-ec',command],{encoding:'utf8',timeout:120000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
    const checks={
     applicationSha256:'for d in /app /opt /usr/local /usr/src /usr/lib/python3 /usr/lib/postgresql /usr/share/postgresql; do if test -d "$d"; then find "$d" -type f -exec sha256sum {} +; fi; done | sort | sha256sum',
     etcSha256:'find /etc -type f ! -name ld.so.cache -exec sha256sum {} + | sort | sha256sum',
     unrelatedLibrariesSha256:'find /usr/lib /lib -type f -name "*.so*" ! -name "libssl.so.3" ! -name "libcrypto.so.3" ! -path "*/engines-3/*" ! -path "*/ossl-modules/*" -exec sha256sum {} + | sort | sha256sum'
    };
    for(const [field,command]of Object.entries(checks))for(const image of [row.oldImage,row.newImage])assert.equal(check(command)(image),b[field],field+' parity no longer holds');
   }else if(row.key==='rssbridge'){const p=read(proofDir+'/impersonate.json');assert(p.passed&&p.imageId===row.newImage);assert(p.proofs.length===2&&p.proofs.every(x=>x.chrome131Preserved&&x.http2Negotiated&&x.unsupportedProtocolsRejected&&x.fictionalGithubHttpsToAtom));}
   else {assert(['kuma','gathio'].includes(row.key));assert(n.abiPreserved&&n.upstreamPythonModules===10&&n.upstreamExpatChecks===5196);assert(n.native.find(x=>x.image===row.newImage)?.bothParserPathsUse128BitSalt);}
  }
 }
}
const rows=releases.flatMap(r=>r.groups.flatMap(g=>g.rows));
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,before]of Object.entries(review.containers||{})){
  let image=before;for(const row of rows)if('/'+row.name===name&&row.oldImage===image)image=row.newImage;
  if(image!==before){assert.equal(cp.execFileSync('docker',['inspect',name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),image);review.containers[name]=image;changed=true;}
 }
 for(const [name,beforeHash]of Object.entries(review.files||{})){
  const bytes=fs.readFileSync(name);if(sha(bytes)===beforeHash)continue;
  assert(releases.some(r=>r.groups.some(g=>g.files.includes(name))),'Unreviewed application configuration change');
  const current=bytes.toString('utf8');
  let reconstructed=current,matched=false;
  for(const release of [...releases].reverse()){
   reconstructed=replaceImagePins(reconstructed,release.groups.flatMap(g=>g.rows).filter(r=>r.oldRef!==r.newRef).map(r=>({from:r.newRef,to:r.oldRef}))).text;
   if(sha(reconstructed)===beforeHash){matched=true;break;}
  }
  assert(matched,'Configuration changed beyond tested native image pins');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 native OpenSSL DTLS follow-up: completed exact-role releases preserve the entire application, configuration and unrelated-library bytes, rehashed before preparing this application binding. Existing Python/SDK/curl layers are retained. Full upstream static/shared suites, both native DTLS regression controls, ABI, crypto/TLS, native application journeys and live health passed. See openssl-bookworm-followup/README.md. Application versions and advisory IDs/ranges are unchanged; this does not clear dependency findings. '+(review.runtimeEvidence||'');
}
const before=original.split('\n'),after=(JSON.stringify(reviews,null,2)+'\n').split('\n');assert.equal(before.length,after.length);
const changes=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])changes.push('@@\n-'+before[i]+'\n+'+after[i]);
assert(changes.length,'No pending application bindings');console.log('*** Begin Patch\n*** Update File: '+file+'\n'+changes.join('\n')+'\n*** End Patch');
