// Explicit operator application of bounded, separately inspected reviewers.
// Never copies decisions between image keys and never changes raw scan findings.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateDecision} from '../triage.mjs';
import {run as rebuild} from '../build-queue.mjs';
import {hostFollowupReviews,hostFollowupStatus} from './host-followup-policy.mjs';
import {gnupgReview,gnupgFollowupStatus} from './gnupg-followup-policy.mjs';
import {xserverDhiReview,xserverDhiStatus} from './xserver-dhi-policy.mjs';
import {reviewFile as penpotReview,eligible as penpotEligible} from "../penpot-native-followup/review-policy.mjs";
import {npmReview,npmEligible} from '../vendor-leaves-final/npm-policy.mjs';
import {reviewFile as xlibReview,eligible as xlibEligible} from '../xlib-followup/review-policy.mjs';
import {reviewFile as sudoReview,eligible as sudoEligible} from '../sudo-followup/review-policy.mjs';
import {reviewFile as qemuReview,eligible as qemuEligible} from '../qemu-component-followup/policy.mjs';
import {reviewFile as openldapReview,eligible as openldapEligible} from '../openldap-followup/review-policy.mjs';
import {reviewFile as tiffReview,eligible as tiffEligible} from '../tiff-bookworm-followup/review-policy.mjs';
import {reviewFile as qgaReview,eligible as qgaEligible} from '../qga-native-followup/policy.mjs';
import {reviewFile as hdf5Review,eligible as hdf5Eligible} from '../hdf5-native-followup/review-policy.mjs';
import {reviewFile as gdalAvifReview,eligible as gdalAvifEligible} from '../gdal-avif-followup/review-policy.mjs';
import {reviewFile as heifReview,eligible as heifEligible,fixed as heifFixed} from '../heif-bookworm-followup/review-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const queue=read('security-queue.json'),scan=read('security.json');assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');
const current=new Map(queue.items.map(x=>[x.key,x])),ledger=new Map(read('security-decisions.json').map(x=>[x.key,x]));
const opensslReview='openssl-bookworm-followup-20261012/review.json';
const nativeMitigationReviews=[openldapReview,tiffReview,qgaReview,hdf5Review,gdalAvifReview];
const files=process.argv.slice(2);assert(files.length&&files.every(x=>[...nativeMitigationReviews,heifReview,qemuReview,xlibReview,sudoReview,npmReview,...hostFollowupReviews,gnupgReview,xserverDhiReview,penpotReview,opensslReview,"python-bookworm-followup-20261012/mitigation-review.json","python-bookworm-followup-20261012/not-affected-review.json","geospatial-followup-20261012/native-reviews.json","host-extra-followup-20261012/pcap-review.json",'component-review.json','binary-scope-review.json','specific-closure-review-20261012.json','vendor-fixed-review.json','native-backport-review.json','closure-followup-20261012/headers-review.json','closure-followup-20261012/payload-review.json','closure-followup-20261012/ncurses-review.json','closure-followup-20261012/rsync-review.json','closure-followup-20261012/util-linux-review.json','closure-followup-20261012/util-linux-component-review.json','closure-followup-20261012/xml-uri-review.json','closure-followup-20261012/curl-review.json','closure-followup-20261012/bookworm-curl-review.json','closure-followup-20261012/gzip-review.json','closure-followup-20261012/sqlite-fts-review.json','closure-followup-20261012/wget-review.json','vendor-leaves-final-20261011/dhi-fixed-review.json','next-leaves-final-20261012/resume-reviews.json','closure-followup-20261012/urllib3-review.json','closure-followup-20261012/python-system-review.json','component-followup-20261012/binary-reviews.json','component-followup-20261012/runtime-reviews.json'].includes(x)));
let applied=0;
for(const file of files){
 const stat=fs.statSync(root+'/'+file);assert(stat.mtimeMs>Date.parse(scan.completedAt)&&Date.now()-stat.mtimeMs<900000,'Regenerate review after the exact scan');
 const value=read(file);if(!Array.isArray(value))assert.equal(value.scanDate,scan.completedAt);
 for(const decision of Array.isArray(value)?value:value.decisions){
  if(file===penpotReview)assert(penpotEligible({...current.get(decision.key),status:"needs-review"}));
  if(file===xlibReview)assert(xlibEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===sudoReview)assert(sudoEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===qemuReview)assert(qemuEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===openldapReview)assert(openldapEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===tiffReview)assert(tiffEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===qgaReview)assert(qgaEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===hdf5Review)assert(hdf5Eligible({...current.get(decision.key),status:'needs-review'}));
  if(file===gdalAvifReview)assert(gdalAvifEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===heifReview)assert(heifEligible({...current.get(decision.key),status:'needs-review'}));
  if(file===npmReview)assert(npmEligible({...current.get(decision.key),status:'needs-review'}));
  const item=current.get(decision.key);assert(item,'Finding no longer current');assert.equal(decision.status,file===heifReview?(heifFixed.includes(item.id)?'mitigated':'not-affected'):hostFollowupReviews.includes(file)?hostFollowupStatus(file,item):file===gnupgReview?gnupgFollowupStatus(file,item):file===xserverDhiReview?xserverDhiStatus(file,item):[...nativeMitigationReviews,xlibReview,sudoReview,penpotReview,opensslReview,"python-bookworm-followup-20261012/mitigation-review.json","geospatial-followup-20261012/native-reviews.json",'native-backport-review.json','closure-followup-20261012/ncurses-review.json','closure-followup-20261012/rsync-review.json','closure-followup-20261012/util-linux-review.json','closure-followup-20261012/curl-review.json','closure-followup-20261012/bookworm-curl-review.json','closure-followup-20261012/gzip-review.json','closure-followup-20261012/sqlite-fts-review.json','closure-followup-20261012/wget-review.json','closure-followup-20261012/python-system-review.json'].includes(file)?'mitigated':'not-affected');
  assert(['host-os','runtime-image'].includes(item.scope));
  if(item.status!=='needs-review')continue;
  ledger.set(decision.key,validateDecision(decision));applied++;
 }
}
fs.writeFileSync(root+'/security-decisions.json.tmp',JSON.stringify([...ledger.values()],null,2)+'\n');fs.renameSync(root+'/security-decisions.json.tmp',root+'/security-decisions.json');
await rebuild();console.log(JSON.stringify({exactReviewedDecisionsApplied:applied,sourceFiles:files}));
