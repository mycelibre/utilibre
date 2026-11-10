// Read-only recorded-evidence checks. No scanner, network, Docker or deployment.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {proveKerberos,kerberosComparison} from './kerberos-policy.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261110';
const read=p=>JSON.parse(fs.readFileSync(p));
const inputs=read(new URL('./kerberos-inputs.json',import.meta.url));
const results=[];
for(const s of inputs.rows){
 const b=read(root+'/vendor-debian/'+(s.evidenceKey||s.key)+'/build.json');
 assert(proveKerberos(inputs,s,b,root));results.push({key:s.key,passed:true});
}
const s=inputs.rows[0],b=read(root+'/vendor-debian/'+s.key+'/build.json');
const mutations=[
 i=>{i.schemaVersion=2;},i=>{i.upstreamVersion='1.22.2';},
 i=>{i.source.sha256='0'.repeat(64);},i=>{i.source.signingKey='0'.repeat(40);},
];
for(const mutate of mutations){const i=structuredClone(inputs);mutate(i);assert.throws(()=>proveKerberos(i,s,b,root),{code:'ERR_ASSERTION'});}
const buildMutations=[v=>v.base='unsupported',v=>v.configurationUnchanged=false,v=>v.unrelatedPackagesUnchanged=false,v=>v.nativeRows[0].checks=0];
for(const mutate of buildMutations){const v=structuredClone(b);mutate(v);assert.throws(()=>proveKerberos(inputs,s,v,root),{code:'ERR_ASSERTION'});}
const pkg=Object.keys(s.packages)[0];
assert.equal(kerberosComparison({package:pkg,installed:'old'},s),kerberosComparison({package:pkg,installed:'new'},s));
assert.notEqual(kerberosComparison({package:'unrelated',installed:'old'},s),kerberosComparison({package:'unrelated',installed:'new'},s));
const report={date:new Date().toISOString(),passed:true,verifiedRecipes:results,negativeChecks:mutations.length+buildMutations.length,comparisonChecks:2,productionChanged:false,network:'none',limitation:'Recorded build/ABI/application evidence validation; no new functional or live-provider test.'};
fs.writeFileSync(root+'/kerberos/policy-checks.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({verifiedRecipes:results.length,negativeChecks:report.negativeChecks,comparisonChecks:2,passed:true}));
