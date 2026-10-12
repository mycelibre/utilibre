// Explicit operator application of the two bounded primary-evidence reviewers.
// Never copies decisions between image keys and never changes raw scan findings.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {validateDecision} from '../triage.mjs';
import {run as rebuild} from '../build-queue.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const queue=read('security-queue.json'),scan=read('security.json');assert.equal(queue.scanDate,scan.completedAt);assert.equal(scan.status,'checked');
const current=new Map(queue.items.map(x=>[x.key,x])),ledger=new Map(read('security-decisions.json').map(x=>[x.key,x]));
const files=process.argv.slice(2);assert(files.length&&files.every(x=>['component-review.json','binary-scope-review.json','specific-closure-review-20261012.json','vendor-fixed-review.json','native-backport-review.json','closure-followup-20261012/headers-review.json','closure-followup-20261012/payload-review.json','closure-followup-20261012/ncurses-review.json','closure-followup-20261012/rsync-review.json','closure-followup-20261012/util-linux-review.json','closure-followup-20261012/util-linux-component-review.json','closure-followup-20261012/xml-uri-review.json','closure-followup-20261012/curl-review.json','closure-followup-20261012/gzip-review.json','vendor-leaves-final-20261011/dhi-fixed-review.json'].includes(x)));
let applied=0;
for(const file of files){
 const stat=fs.statSync(root+'/'+file);assert(stat.mtimeMs>Date.parse(scan.completedAt)&&Date.now()-stat.mtimeMs<900000,'Regenerate review after the exact scan');
 const value=read(file);if(!Array.isArray(value))assert.equal(value.scanDate,scan.completedAt);
 for(const decision of Array.isArray(value)?value:value.decisions){
  const item=current.get(decision.key);assert(item,'Finding no longer current');assert.equal(decision.status,['native-backport-review.json','closure-followup-20261012/ncurses-review.json','closure-followup-20261012/rsync-review.json','closure-followup-20261012/util-linux-review.json','closure-followup-20261012/curl-review.json','closure-followup-20261012/gzip-review.json'].includes(file)?'mitigated':'not-affected');
  assert(['host-os','runtime-image'].includes(item.scope));
  if(item.status!=='needs-review')continue;
  ledger.set(decision.key,validateDecision(decision));applied++;
 }
}
fs.writeFileSync(root+'/security-decisions.json.tmp',JSON.stringify([...ledger.values()],null,2)+'\n');fs.renameSync(root+'/security-decisions.json.tmp',root+'/security-decisions.json');
await rebuild();console.log(JSON.stringify({exactReviewedDecisionsApplied:applied,sourceFiles:files}));
