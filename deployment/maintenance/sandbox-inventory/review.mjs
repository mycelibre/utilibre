// Exact deployment mitigation, not an upstream Rust-library fix or binary SBOM.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
import {eligible,reviewFile,checkedSourceHash} from './review-policy.mjs';
import {denoSourceName} from './collect.mjs';
import {runtimeBinding} from './binding.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',read=p=>JSON.parse(fs.readFileSync(root+'/'+p));
const scan=read('security.json'),queue=read('security-queue.json');freshScan(queue,scan);
const proof=read('sandbox-inventory-20261012/runtime-permissions.json');
assert(proof.passed&&proof.native?.passed&&proof.configurationChecked);
const proofAge=Date.now()-Date.parse(proof.date);
assert(Number.isFinite(proofAge)&&proofAge>=0&&proofAge<900000,'Refresh native permission/configuration checks');
const source=scan.sources.find(s=>s.name===denoSourceName);
const sourceHash=await checkedSourceHash(source);
assert.deepEqual(source.binding,proof.binding,'Runtime proof and scan must match');
assert.deepEqual(source.binding,await runtimeBinding(async(program,args,timeout)=>execFileSync(program,args,{encoding:'utf8',timeout,stdio:['ignore','pipe','pipe']})),'Runtime changed after scan/proof');
assert.deepEqual(proof.checks,[{name:'DNS',result:'NotCapable'},{name:'TCP',result:'NotCapable'},{name:'HTTP',result:'NotCapable'}]);
const decisions=[],primary=[];
for(const item of queue.items.filter(item=>eligible(item,sourceHash))){
 const response=await fetch(`https://api.github.com/advisories/${item.id}`,{signal:AbortSignal.timeout(20000)});assert(response.ok);
 const advisory=await response.json();assert.equal(advisory.ghsa_id,item.id);
 assert(/DNSSEC/i.test(advisory.description));
 assert(advisory.vulnerabilities.some(v=>v.package.ecosystem==='rust'&&v.package.name===item.package));
 primary.push({id:advisory.ghsa_id,url:advisory.html_url,updatedAt:advisory.updated_at,summary:advisory.summary});
 decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),
  reason:`Grist's exact Deno 2.9.7 release-source finding; not a compiled-crate SBOM or upstream patch. ${advisory.html_url} describes DNSSEC resolver response handling. Current immutable Grist image ${proof.image}, exact Deno executable and no-update wrapper, native Pyodide echo/launch checks pass with no net/run/FFI grant. Native DNS/TCP/HTTP calls fail with NotCapable before I/O in an isolated copy. Production sandbox configuration is matched. This deployment cannot expose the affected resolver to formulas under that verified boundary. Permission/runtime changes require a new check. Raw source findings and lower-severity records remain. Evidence: sandbox-inventory-20261012/runtime-permissions.json; source pin/provenance in deployment/maintenance/sandbox-inventory/deno/.` }));
}
fs.writeFileSync(root+'/'+reviewFile,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,primary,proof},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,applied:false}));
