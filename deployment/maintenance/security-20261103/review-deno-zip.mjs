// Offline preparation only. Applying an exact decision remains a separate operator action.
import fs from 'node:fs';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {checkedSourceHash} from '../sandbox-inventory/review-policy.mjs';
import {denoSourceName} from '../sandbox-inventory/collect.mjs';
import {runtimeBinding,digest} from '../sandbox-inventory/binding.mjs';
import {eligible,checkProof} from './deno-zip-policy.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/security-20261103',sourceDir=dir+'/deno-source';
const read=p=>JSON.parse(fs.readFileSync(p));
const pins=read(new URL('./deno-zip-inputs.json',import.meta.url));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);
const source=scan.sources.find(s=>s.name===denoSourceName),hash=await checkedSourceHash(source);
assert.equal(digest(fs.readFileSync(sourceDir+'/source.tar.gz')),pins.archiveSha256);
for(const [file,sha] of Object.entries(pins.files))assert.equal(digest(fs.readFileSync(sourceDir+'/deno-'+pins.commit+'/'+file)),sha);
// The complete pinned archive was reviewed: ZipArchive readers occur in CLI upgrade,
// compile and desktop handling, not Grist's run operation. No ZipStreamReader consumer.
for(const [cve,pin] of Object.entries(pins.advisories)){
 const bytes=fs.readFileSync(sourceDir+'/'+pin.id+'.json');assert.equal(digest(bytes),pin.sha256);
 const a=JSON.parse(bytes);assert.equal(a.cve_id,cve);assert.equal(a.ghsa_id,pin.id);
 assert(a.vulnerabilities.some(v=>v.package.ecosystem==='rust'&&v.package.name==='zip'));
}
const proof=read(root+'/sandbox-inventory-20261012/runtime-permissions.json');checkProof(proof,source.binding);
assert.deepEqual(await runtimeBinding(async(p,a,t)=>execFileSync(p,a,{encoding:'utf8',timeout:t,stdio:['ignore','pipe','pipe']})),source.binding);
const decisions=queue.items.filter(i=>eligible(i,hash)).map(item=>validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:
 `Exact Grist Deno 2.9.7 source-lock finding, not an upstream fix or compiled-crate SBOM. ${pins.advisories[item.id].url}. Pinned Deno source routes ZIP extraction through upgrade/compile/desktop CLI operations; no ZipStreamReader caller. Grist's native Pyodide echo succeeds and launcher uses run without net/run/FFI grants. Native process and FFI calls are denied with NotCapable, as are DNS/TCP/HTTP; update checks are disabled by the exact wrapper. Formula code cannot invoke the affected CLI extraction under this verified boundary. No claim that memory limits fix ZIP parsing. Bound to current image ${proof.image}, executable, wrapper and sandbox settings; changes invalidate review. Manual operator use of other Deno commands is outside scope. Evidence: security-20261103/deno-zip-review.json and sandbox-inventory-20261012/runtime-permissions.json. Raw findings retained.`}));
fs.writeFileSync(dir+'/deno-zip-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,pins,proof,decisions,applied:false},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false}));
