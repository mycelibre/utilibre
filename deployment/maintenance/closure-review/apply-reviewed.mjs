// Explicit operator application of bounded, separately inspected reviewers.
// Never copies decisions between image keys and never changes raw scan findings.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateDecision} from '../triage.mjs';
import {run as rebuild} from '../build-queue.mjs';
import {reviewFile as blkidReview,eligible as blkidEligible} from '../security-20261028/blkid-policy.mjs';
import {reviewFile as cryptpadBodyReview,eligible as cryptpadBodyEligible} from '../security-20261028/cryptpad-body-policy.mjs';
import {reviewFile as gosuReview,eligible as gosuEligible} from '../security-20261028/gosu-policy.mjs';
import {hostFollowupReviews,hostFollowupStatus} from './host-followup-policy.mjs';
import {gnupgReview,gnupgFollowupStatus} from './gnupg-followup-policy.mjs';
import {xserverDhiReview,xserverDhiStatus} from './xserver-dhi-policy.mjs';
import {reviewFile as penpotReview,eligible as penpotEligible} from "../penpot-native-followup/review-policy.mjs";
import {npmReview,npmEligible} from '../vendor-leaves-final/npm-policy.mjs';
import {reviewFile as xlibReview,eligible as xlibEligible} from '../xlib-followup/review-policy.mjs';
import {reviewFile as sudoReview,eligible as sudoEligible} from '../sudo-followup/review-policy.mjs';
import {reviewFile as qemuReview,eligible as qemuEligible} from '../qemu-component-followup/policy.mjs';
import {reviewFile as openldapReview,eligible as openldapEligible} from '../openldap-followup/review-policy.mjs';
import {reviewFile as tiffReview,eligible as tiffEligible,expectedStatus as tiffStatus} from '../tiff-bookworm-followup/review-policy.mjs';
import {reviewFile as dhiBinaryReview,eligible as dhiBinaryEligible} from '../dhi-binary-attribution/policy.mjs';
import {reviewFile as qgaReview,eligible as qgaEligible} from '../qga-native-followup/policy.mjs';
import {reviewFile as hdf5Review,eligible as hdf5Eligible} from '../hdf5-native-followup/review-policy.mjs';
import {reviewFile as gdalAvifReview,eligible as gdalAvifEligible} from '../gdal-avif-followup/review-policy.mjs';
import {reviewFile as heifReview,eligible as heifEligible,fixed as heifFixed} from '../heif-bookworm-followup/review-policy.mjs';
import {reviewFile as archiveTarReview,eligible as archiveTarEligible} from '../archive-tar-final/review-policy.mjs';
import {reviewFile as coturnBsonReview,eligible as coturnBsonEligible} from '../coturn-bson-final/review-policy.mjs';
import {reviewFile as nltkReview,eligible as nltkEligible} from '../application-leaves-final/nltk-review-policy.mjs';
import {reviewFile as bracesReview,eligible as bracesEligible} from '../application-leaves-final/braces-review-policy.mjs';
import {reviewFile as mountFinalReview,eligible as mountFinalEligible} from '../mount-acl-final/review-policy.mjs';
import {reviewFile as historicalHeaderReview,eligible as historicalHeaderEligible} from '../historical-header-final/policy.mjs';
import {reviewFile as aclCliReview,eligible as aclCliEligible} from '../mount-acl-final/acl-cli-review-policy.mjs';
import {reviewFile as ubuntuMountReview,eligible as ubuntuMountEligible} from '../mount-acl-final/ubuntu-review-policy.mjs';
import {reviewFile as singleScreenReview,eligible as singleScreenEligible} from '../xvfb-single-screen-final/review-policy.mjs';
import {reviewFile as sandboxDnsReview,eligible as sandboxDnsEligible,checkedSourceHash} from '../sandbox-inventory/review-policy.mjs';
import {runtimeBinding} from '../sandbox-inventory/binding.mjs';
import {denoSourceName} from '../sandbox-inventory/collect.mjs';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const queue=read('security-queue.json'),scan=read('security.json');assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');
const current=new Map(queue.items.map(x=>[x.key,x])),ledger=new Map(read('security-decisions.json').map(x=>[x.key,x]));
const opensslReview='openssl-bookworm-followup-20261012/review.json';
const curlOct28Reviews=['closure-followup-20261012/oct28-curl-review.json','closure-followup-20261012/oct28-bookworm-curl-review.json'];
const packageAttributionReviews=[historicalHeaderReview,aclCliReview,gosuReview];
const drfReview='security-20261028/drf/review.json';
const joseCaddyReview='security-20261028/jose-caddy/review.json';
const joseLeafReview='security-20261028/jose-leaf/review.json';
const nativeMitigationReviews=[cryptpadBodyReview,blkidReview,joseLeafReview,joseCaddyReview,drfReview,openldapReview,tiffReview,qgaReview,hdf5Review,gdalAvifReview,archiveTarReview,coturnBsonReview,nltkReview,bracesReview,mountFinalReview,ubuntuMountReview,singleScreenReview,sandboxDnsReview];
const files=process.argv.slice(2);assert(files.length&&files.every(x=>[...curlOct28Reviews,...packageAttributionReviews,dhiBinaryReview,...nativeMitigationReviews,heifReview,qemuReview,xlibReview,sudoReview,npmReview,...hostFollowupReviews,gnupgReview,xserverDhiReview,penpotReview,opensslReview,"python-bookworm-followup-20261012/mitigation-review.json","python-bookworm-followup-20261012/not-affected-review.json","geospatial-followup-20261012/native-reviews.json","host-extra-followup-20261012/pcap-review.json",'component-review.json','binary-scope-review.json','specific-closure-review-20261012.json','vendor-fixed-review.json','native-backport-review.json','closure-followup-20261012/headers-review.json','closure-followup-20261012/payload-review.json','closure-followup-20261012/ncurses-review.json','closure-followup-20261012/rsync-review.json','closure-followup-20261012/util-linux-review.json','closure-followup-20261012/util-linux-component-review.json','closure-followup-20261012/xml-uri-review.json','closure-followup-20261012/curl-review.json','closure-followup-20261012/bookworm-curl-review.json','closure-followup-20261012/gzip-review.json','closure-followup-20261012/sqlite-fts-review.json','closure-followup-20261012/wget-review.json','vendor-leaves-final-20261011/dhi-fixed-review.json','next-leaves-final-20261012/resume-reviews.json','closure-followup-20261012/urllib3-review.json','closure-followup-20261012/python-system-review.json','component-followup-20261012/binary-reviews.json','component-followup-20261012/runtime-reviews.json'].includes(x)));
let sandboxSourceHash;
if(files.includes(sandboxDnsReview)){
 const source=scan.sources.find(s=>s.name===denoSourceName);sandboxSourceHash=await checkedSourceHash(source);
 assert.deepEqual(source.binding,await runtimeBinding(async(program,args,timeout)=>execFileSync(program,args,{encoding:'utf8',timeout,stdio:['ignore','pipe','pipe']})));
}
let applied=0;
for(const file of files){
 const stat=fs.statSync(root+'/'+file);assert(stat.mtimeMs>Date.parse(scan.completedAt)&&Date.now()-stat.mtimeMs<900000,'Regenerate review after the exact scan');
 const value=read(file);if(!Array.isArray(value))assert.equal(value.scanDate,scan.completedAt);
 for(const decision of Array.isArray(value)?value:value.decisions){
  if(file===joseCaddyReview||file===joseLeafReview){const item=current.get(decision.key);assert(item&&item.scope==='runtime-image'&&item.type==='gobinary'&&item.id==='CVE-2026-116587'&&item.package==='github.com/go-jose/go-jose/v3'&&item.installed==='v3.0.5'&&(file===joseCaddyReview?item.target.endsWith('caddy'):['usr/bin/oauth2-proxy','app/wakapi'].includes(item.target)));}
  if(file===sandboxDnsReview)assert(sandboxDnsEligible({...current.get(decision.key),status:'needs-review'},sandboxSourceHash));
  if(file===cryptpadBodyReview)assert(cryptpadBodyEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===blkidReview)assert(blkidEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===gosuReview)assert(gosuEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===archiveTarReview)assert(archiveTarEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===coturnBsonReview)assert(coturnBsonEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===nltkReview)assert(nltkEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===bracesReview)assert(bracesEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===mountFinalReview)assert(mountFinalEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===historicalHeaderReview)assert(historicalHeaderEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===aclCliReview)assert(aclCliEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===ubuntuMountReview)assert(ubuntuMountEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===singleScreenReview)assert(singleScreenEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===penpotReview)assert(penpotEligible({...current.get(decision.key),status:"needs-review"}));
  if(file===xlibReview)assert(xlibEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===sudoReview)assert(sudoEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===qemuReview)assert(qemuEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===openldapReview)assert(openldapEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===tiffReview)assert(tiffEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===qgaReview)assert(qgaEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===hdf5Review)assert(hdf5Eligible({...current.get(decision.key),status:'needs-review'}));
  if(file===dhiBinaryReview)assert(dhiBinaryEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===gdalAvifReview)assert(gdalAvifEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===heifReview)assert(heifEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===npmReview)assert(npmEligible({...current.get(decision.key),status:'needs-review'}));
  const item=current.get(decision.key);assert(item,'Finding no longer current');
  if(file===drfReview){assert.equal(item.scope,'runtime-image');assert.equal(item.type,'python-pkg');assert.equal(item.package,'djangorestframework');assert(['3.17.1','3.17.2'].includes(item.installed));assert(['CVE-2026-114136','CVE-2026-114137','CVE-2026-114138'].includes(item.id));}
  if(curlOct28Reviews.includes(file)){assert(file==='closure-followup-20261012/oct28-curl-review.json'?['runtime-image','host-os'].includes(item.scope):item.scope==='runtime-image');assert.equal(item.type,'debian');assert.equal(item.installed,file.includes('bookworm')?'8.23.0-1~deb12u1+utilibre1':'8.23.0-1~deb13u1+utilibre1');assert(['curl','libcurl4','libcurl3-gnutls','libcurl4t64','libcurl4-gnutls','libcurl3t64-gnutls'].includes(item.package));}
assert.equal(decision.status,file===dhiBinaryReview?'not-affected':file===tiffReview?tiffStatus(item):file===heifReview?(heifFixed.includes(item.id)?'mitigated':'not-affected'):hostFollowupReviews.includes(file)?hostFollowupStatus(file,item):file===gnupgReview?gnupgFollowupStatus(file,item):file===xserverDhiReview?xserverDhiStatus(file,item):[...curlOct28Reviews,...nativeMitigationReviews,xlibReview,sudoReview,penpotReview,opensslReview,"python-bookworm-followup-20261012/mitigation-review.json","geospatial-followup-20261012/native-reviews.json",'native-backport-review.json','closure-followup-20261012/ncurses-review.json','closure-followup-20261012/rsync-review.json','closure-followup-20261012/util-linux-review.json','closure-followup-20261012/curl-review.json','closure-followup-20261012/bookworm-curl-review.json','closure-followup-20261012/gzip-review.json','closure-followup-20261012/sqlite-fts-review.json','closure-followup-20261012/wget-review.json','closure-followup-20261012/python-system-review.json'].includes(file)?'mitigated':'not-affected');
  assert(file===sandboxDnsReview ? item.scope==='upstream-release-source-lock' : [bracesReview,cryptpadBodyReview].includes(file) ? item.scope==='mounted-runtime-code' : ['host-os','runtime-image'].includes(item.scope));
  if(item.status!=='needs-review')continue;
  ledger.set(decision.key,validateDecision(decision));applied++;
 }
}
fs.writeFileSync(root+'/security-decisions.json.tmp',JSON.stringify([...ledger.values()],null,2)+'\n');fs.renameSync(root+'/security-decisions.json.tmp',root+'/security-decisions.json');
await rebuild();console.log(JSON.stringify({exactReviewedDecisionsApplied:applied,sourceFiles:files}));
