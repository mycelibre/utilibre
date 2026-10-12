// Fresh-scan, exact-byte proposal only. Never changes the private ledger.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,sha,read,docker,inspect} from './ubuntu-common.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';import {eligible} from './ubuntu-review-policy.mjs';
process.umask(0o077);
const main='/var/lib/utilibre-maintenance',scan=read(main+'/security.json'),queue=read(main+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const n=read(root+'/ubuntu-native.json'),e=read(root+'/ubuntu-upstream-exception.json'),o=read(root+'/ubuntu-source-offer.json');assert.equal(n.status,'passed');assert.equal(n.exports.length,318);assert.equal(n.checks.length,12);assert(n.exactExportsPreserved&&n.sonameAndNeededPreserved&&n.nobleLibcCompatible);assert(e.baselineAndCandidateSameFailure&&e.candidateFailures===2);
assert(o.published);assert.equal(sha(fs.readFileSync(o.archive)),o.sha256);assert.equal(o.filename,'security-noble-mount-20261012-source.tar.gz');
const decisions=[];
for(const key of ['addy','redlib']){
 const dir=root+'/ubuntu-images/'+key;if(!fs.existsSync(dir+'/release.json'))continue;const release=read(dir+'/release.json');if(release.status!=='passed')continue;
 assert(Date.parse(release.completedAt)<=Date.parse(scan.date));
 const stage=read(dir+'/stage.json'),consumer=read(dir+'/consumer.json'),app=read(dir+'/application.json');
 for(const [label,path]of [['stage',dir+'/stage.json'],['application',dir+'/application.json'],['consumer',dir+'/consumer.json'],['native',root+'/ubuntu-native.json'],['upstreamException',root+'/ubuntu-upstream-exception.json']])assert.equal(release.proofs[label],sha(fs.readFileSync(path)));
 assert(app.passed&&consumer.passed);assert.equal(app.imageId,stage.image);assert.equal(consumer.imageId,stage.image);assert.equal(consumer.cases.length,6);assert(stage.configurationUnchanged&&stage.unrelatedPackagesUnchanged&&stage.priorRuntimeBytesUnchanged);
 let artifact=stage.image;
 const chain=additionalOverlayReceipts.filter(f=>fs.existsSync(main+'/'+f)).flatMap(f=>overlayRows(read(main+'/'+f))).filter(r=>r.name===stage.name).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
 for(const r of chain)if(r.oldImage===artifact){assert(Date.parse(r.completedAt)<=Date.parse(scan.date));artifact=r.newImage;}
 assert.equal(inspect(stage.name).Image,artifact);assert.equal(docker('exec',stage.name,'sha256sum',n.libraryPath).split(/\s/)[0],n.librarySha256);
 for(const pkg of ['libmount1','mount'])assert.equal(docker('exec',stage.name,'dpkg-query','-W','-f=${Version}',pkg),n.version);
 for(const item of queue.items.filter(i=>eligible(i)&&i.artifact===artifact&&i.containers[0]===stage.name))decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact native Ubuntu Noble repair binds restricted legacy mount calls to the pre-canonicalization target descriptor using authenticated vendor 2.39.3-9ubuntu6.6 plus upstream 708d1b3c pre-canonicalization and 2c773f33 legacy FD pinning. The vendor initial new-mount target repair alone is insufficient for classic mounts and is not the entire repair. Original ABI (318 exports), dependencies, vendor fixes and application bytes are preserved; six unprivileged inode/symlink regression cases pass in this exact image, plus native application and release gates. Full upstream suite has two independently reproduced baseline lsfd device-encoding exceptions; all 17 targeted libmount tests pass. No real kernel mounts/SUID or arbitrary external-helper security claim. Full corresponding source SHA256 '+o.sha256+'. Only CVE-2026-53613 in this exact package/role/byte-proven artifact is covered; raw scan retained. https://ubuntu.com/security/CVE-2026-53613'}));
}
fs.writeFileSync(root+'/ubuntu-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false,cves:['CVE-2026-53613']}));

