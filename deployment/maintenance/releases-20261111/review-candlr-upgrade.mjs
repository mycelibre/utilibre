// Carry only exact, unexpired prior Debian decisions across the verified
// application-only replacement. No new acceptance and no expiry extension.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {verifyHeldUpgrade,heldRoot} from './held-policy.mjs';
import {fileHash} from './upgrade-policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
assert([2,3].includes(process.argv.length));const key=process.argv[2]||'candlr';assert(['candlr','kitchenowl'].includes(key));process.umask(0o077);
const read=p=>JSON.parse(fs.readFileSync(p));
const root='/var/lib/utilibre-maintenance';
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');
freshScan(queue,scan);assert.equal(scan.status,'checked');
const expected=read(new URL('./'+key+'-review-inputs.json',import.meta.url));
const priorPath=heldRoot+(key==='candlr'?'/before-fleet-security-queue.json':'/kitchenowl/before-release-queue.json');
assert.equal(fileHash(priorPath),expected.previousQueueSha256);
const old=read(priorPath);
const {s,d}=verifyHeldUpgrade(key,{fresh:false});
assert.equal(read(heldRoot+'/'+key+'-release/result.json').status,'passed');
const live=JSON.parse(execFileSync('docker',['inspect',s.name,'--format','{"image":{{json .Image}},"running":{{.State.Running}},"readonly":{{.HostConfig.ReadonlyRootfs}}}'],{encoding:'utf8',timeout:10000}));
assert(live.running&&live.readonly);assert.equal(live.image,s.newImage);
assert.equal(scan.database.updatedAt,s.databaseUpdatedAt,'A refreshed database requires a separate review');
const proof=read(d+'/'+s.retainedRuntime),decisions=[];
for(const item of queue.items.filter(x=>x.scope==='runtime-image'&&x.artifact===s.newImage&&['HIGH','CRITICAL'].includes(x.severity))){
 const matches=proof.retainedRawHighCritical.filter(x=>x.id===item.id&&x.package===item.package&&x.installed===item.installed);assert.equal(matches.length,1);
 const row=matches[0];
 if(row.status==='needs-review'){assert.equal(item.id,'CVE-2026-54369');assert.equal(item.package,'libacl1');continue;}
 const previous=old.items.find(x=>x.key===row.previousKey);assert(previous);assert.equal(previous.artifact,s.oldImage);
 assert.equal(previous.status,row.status);assert.equal(previous.decision?.status,row.status);
 assert(Date.parse(previous.decision.expiresAt)>Date.now(),'Prior decision expired; re-review the repair');
 const reason=`Exact ${key} ${s.version} image retains all Debian files outside its declared application payload, verified by full image filesystem comparison and unchanged read-only deployment. Prior ${row.status} decision ${row.previousKey} and its complete component/backport rationale remain in the SHA-bound prior queue; no expiry extension or new acceptance. Evidence: held-inputs.json, ${key}/${s.retainedRuntime} and ${key}-review-inputs.json. This covers only ${item.package} ${item.id}; the ACL finding and raw scanner evidence remain open/visible. Re-review changed bytes, advisory data, role or configuration.`;
 decisions.push(validateDecision({key:item.key,status:previous.status,expiresAt:previous.decision.expiresAt,reason}));
}
assert.equal(decisions.length,expected.decisions);
fs.writeFileSync(d+'/retained-review.json',JSON.stringify({schemaVersion:1,scanDate:scan.completedAt,decisions},null,2)+'\n');
console.log(`${decisions.length} exact prior decisions prepared; expiries unchanged, ACL excluded`);
