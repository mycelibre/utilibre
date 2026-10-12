// Preserve the vendor's current source-package evidence separately from the
// distribution-specific scanner match. This never makes a triage decision.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/closure-followup-20261012';
process.umask(0o077);
const url='https://security-tracker.debian.org/tracker/data/json';
const response=await fetch(url,{signal:AbortSignal.timeout(120000)});
assert(response.ok);const body=await response.text(),all=JSON.parse(body);
const queue=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security-queue.json'));
const ids=new Set(queue.items.filter(x=>['CRITICAL','HIGH'].includes(x.severity)&&x.status==='needs-review').map(x=>x.id));
const sources={};
for(const [pkg,records] of Object.entries(all)){
 const relevant=Object.fromEntries(Object.entries(records).filter(([id])=>ids.has(id)));
 if(Object.keys(relevant).length)sources[pkg]=relevant;
}
fs.writeFileSync(root+'/debian-primary.json',JSON.stringify({url,date:new Date().toISOString(),responseSha256:createHash('sha256').update(body).digest('hex'),sources},null,2)+'\n');
console.log(JSON.stringify({primarySourcePackages:Object.keys(sources).length,reviewedIds:ids.size,automaticExemptions:0}));
