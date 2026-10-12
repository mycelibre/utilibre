// Fresh-scan, exact-byte proposal only. Never changes the private ledger.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,sha,read,docker,inspect} from './common.mjs';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';import {eligible} from './review-policy.mjs';
process.umask(0o077);
const main='/var/lib/utilibre-maintenance',scan=read(main+'/security.json'),queue=read(main+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const n=read(root+'/native.json'),e=read(root+'/upstream-exception.json'),o=read(root+'/source-offer.json');assert.equal(n.status,'passed');assert.equal(n.exports,312);assert.equal(n.checks.length,12);assert(n.exactExportsPreserved&&n.sonameAndNeededPreserved&&n.bookwormLibcCompatible);assert(e.baselineAndCandidateSameFailure&&e.candidateFailures===1);
assert(o.published);assert.equal(sha(fs.readFileSync(o.archive)),o.sha256);assert.equal(o.sha256,'4d25fc4768bcfd418ae87e3bc64cd3389e7137a79dda6535665f2a5abbaf7480');
const decisions=[];
for(const key of ['actual','gathio','rallly','kuma','wishlist','resume','rssbridge','cryptpad']){
 const dir=root+'/images/'+key;if(!fs.existsSync(dir+'/release.json'))continue;const release=read(dir+'/release.json');if(release.status!=='passed')continue;
 assert(Date.parse(release.completedAt)<=Date.parse(scan.date));
 const stage=read(dir+'/stage.json'),consumer=read(dir+'/consumer.json'),app=read(dir+'/application.json');
 for(const [label,path]of [['stage',dir+'/stage.json'],['application',dir+'/application.json'],['consumer',dir+'/consumer.json'],['native',root+'/native.json'],['upstreamException',root+'/upstream-exception.json']])assert.equal(release.proofs[label],sha(fs.readFileSync(path)));
 assert(app.passed&&consumer.passed);assert.equal(app.imageId,stage.image);assert.equal(consumer.imageId,stage.image);assert.equal(consumer.cases.length,6);assert(stage.configurationUnchanged&&stage.unrelatedPackagesUnchanged&&stage.priorRuntimeBytesUnchanged);
 let artifact=stage.image;
 const chain=additionalOverlayReceipts.filter(f=>fs.existsSync(main+'/'+f)).flatMap(f=>overlayRows(read(main+'/'+f))).filter(r=>r.name===stage.name).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
 for(const r of chain)if(r.oldImage===artifact){assert(Date.parse(r.completedAt)<=Date.parse(scan.date));artifact=r.newImage;}
 assert.equal(inspect(stage.name).Image,artifact);assert.equal(docker('exec',stage.name,'sha256sum',n.libraryPath).split(/\s/)[0],n.librarySha256);
 for(const pkg of ['libmount1','mount'])assert.equal(docker('exec',stage.name,'dpkg-query','-W','-f=${Version}',pkg),n.version);
 for(const item of queue.items.filter(i=>eligible(i)&&i.artifact===artifact&&i.containers[0]===stage.name))decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact native Debian Bookworm backport binds restricted legacy mount calls to the pre-canonicalization target descriptor using upstream 0b010025, 708d1b3c, 2c773f33 and c197f0f3. The June reopen-only change is insufficient and is not the entire repair. Original ABI (312 exports), dependencies, vendor fixes and application bytes are preserved; six unprivileged inode/symlink regression cases pass in this exact image, plus native application and release gates. Full upstream suite has one independently reproduced baseline lsfd device-encoding exception; all 17 targeted libmount tests pass. No real kernel mounts/SUID or arbitrary external-helper security claim. Full corresponding source SHA256 '+o.sha256+'. Only CVE-2026-53613 in this exact package/role/byte-proven artifact is covered; raw scan retained. https://security-tracker.debian.org/tracker/CVE-2026-53613'}));
}
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false,cves:['CVE-2026-53613']}));
