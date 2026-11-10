// Exact live-payload proof for the previously shipped OTPHP security backport.
// No actual accounts, OTP seeds, network or databases are inspected.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
import {freshScan} from '../review-native-backports.mjs';
process.umask(0o077);
const directory='/var/lib/utilibre-maintenance';
const q=JSON.parse(fs.readFileSync(directory+'/security-queue.json'));
freshScan(q,JSON.parse(fs.readFileSync(directory+'/security.json')));
const item=q.items.find(x=>x.status==='needs-review'&&x.id==='GHSA-g7m4-839x-ch6v'&&x.package==='spomky-labs/otphp'&&x.containers.includes('utilibre-wallabag-app-1'));
assert(item && item.installed==='v10.0.3');
const run=args=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('OTPHP exact payload/native check failed; no decision');}};
assert.equal(run(['inspect','--format','{{.Image}}','utilibre-wallabag-app-1']),item.artifact);
const expected={
 'ParameterTrait.php':'0a4884236f433f20b0f176c57a3c92874f0628d3effbbfce2ade54942f7f5484',
 'Factory.php':'404ea47d4c2ca60ae2c728a1cbed5faccc99d035684a51872b31caa041cd77e3',
};
for(const [file,hash]of Object.entries(expected)) assert.equal(run(['exec','utilibre-wallabag-app-1','sha256sum','/app/vendor/spomky-labs/otphp/src/'+file]).split(/\s/)[0],hash);
const output=run(['run','--rm','--network','none','--read-only','--memory','256m','--memory-swap','256m','--cpus','1','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges:true','--log-driver','none','--entrypoint','php','-v','/home/ubuntu/freetools/deployment/maintenance/security-20261109/check-otphp-ordinary.php:/review.php:ro',item.artifact,'/review.php']);
assert.deepEqual(JSON.parse(output),{checks:14,failed:0,realAccountsTouched:false,ordinaryOnly:true});
const decision=validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Exact live Wallabag image retains OTPHP10.0.3 with the already deployed security backport, not an unpatched package or version alias. ParameterTrait.php SHA256 0a4884236f433f20b0f176c57a3c92874f0628d3effbbfce2ade54942f7f5484 and Factory.php SHA256 404ea47d4c2ca60ae2c728a1cbed5faccc99d035684a51872b31caa041cd77e3 match the reviewed patch. A networkless copy of this exact image passed fourteen ordinary synthetic checks: valid provisioning round trip, public RFC6238 vectors and native Scheb verification of correct, malformed and expired codes. No excessive-input or mass-assignment reproduction was run; the correction is established by exact retained source hashes. No production account seed read. This resolves only GHSA-g7m4-839x-ch6v on this artifact. https://github.com/Spomky-Labs/otphp/security/advisories/GHSA-g7m4-839x-ch6v ; recipe deployment/pack/wallabag/otphp-10-security.patch.'});
const result={date:new Date().toISOString(),artifact:item.artifact,hashes:expected,nativeChecks:14,ordinaryOnly:true,fixtureSha256:createHash('sha256').update(fs.readFileSync(new URL('../security-20261109/check-otphp-ordinary.php',import.meta.url))).digest('hex'),nativeOutputSha256:createHash('sha256').update(output).digest('hex'),decision,applied:false};
fs.writeFileSync(directory+'/otphp-closure-review.json',JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(directory+'/otphp-closure-decision.json',JSON.stringify(decision,null,2)+'\n');
console.log(JSON.stringify({passed:true,nativeChecks:14,artifact:item.artifact,applied:false}));
