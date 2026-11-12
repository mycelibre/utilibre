// Prepare one exact operator review; no automatic acceptance or network access.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateBatch} from '../../triage.mjs';
process.umask(0o077);
assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/';
const dir=root+'host-tools-20261112/gh-followup/';
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(new URL('./inputs.json',import.meta.url));
const queue=read(root+'security-queue.json');
assert.equal(sha('/usr/bin/gh'),inputs.binarySha256);
assert.equal(cp.execFileSync('dpkg-query',['-W','-f=${Version}','gh'],{encoding:'utf8',timeout:10000}),inputs.version);
const scope=read(dir+'source-scope.json');
assert(scope.passed&&scope.applicationSourceUnchanged);
assert.deepEqual(scope.changed.sort(),['go.mod','go.sum']);
assert.equal(read(dir+'release.json').status,'passed');
const advisory=read(dir+'advisories.json').find(x=>x.cve_id==='CVE-2026-48501');
assert.equal(advisory.html_url,'https://github.com/cli/cli/security/advisories/GHSA-8xvp-7hj6-mcj9');
assert(advisory.vulnerabilities.some(v=>v.package.name==='github.com/cli/cli/v2'&&v.patched_versions==='v2.93.0'));
assert.equal(inputs.version,'2.103.3+utilibre1');
const findings=queue.items.filter(x=>x.scope==='host-os'&&x.package==='gh'&&x.id===advisory.cve_id&&x.installed===inputs.version);
assert.equal(findings.length,1);
const batch={schemaVersion:1,scanDate:queue.scanDate,decisions:[{
 key:findings[0].key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),
 reason:`CVE-2026-48501 is fixed upstream in gh 2.93.0. Installed host package is exact 2.103.3+utilibre1, binary SHA256 ${inputs.binarySha256}; upstream application source at ${inputs.revision} is unchanged (only native Go locks differ). Debian marks its older 2.46 package unfixed; that package range does not establish vulnerability of this independently built newer version. Native transport/API tests passed. Source: ${advisory.html_url}. Evidence: host-tools-20261112/gh-followup/package-review.json. Current artifact only; not a finding about past credential exposure.`
}]};
validateBatch(batch,queue);
fs.writeFileSync(dir+'package-review.json',JSON.stringify({date:new Date().toISOString(),binarySha256:inputs.binarySha256,package:inputs.version,sourceRevision:inputs.revision,advisory:advisory.html_url,evidenceHashes:Object.fromEntries(['advisories.json','source-scope.json','release.json'].map(n=>[n,sha(dir+n)])),preparedOnly:true},null,2)+'\n');
fs.writeFileSync(dir+'package-review-decisions.json',JSON.stringify(batch,null,2)+'\n');
console.log('Prepared one exact gh package review; raw findings unchanged. Operator recording is separate.');
