// Dependency/backport gate only. Passing this is NOT authorization for release.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const source = '/opt/utilibre/src/wallabag-repair-20261009';
const review = dirname(fileURLToPath(import.meta.url));
const image = 'utilibre-wallabag-review:20261009';
function run(command, args, accepted = [0]) {
  const result = spawnSync(command, args, {encoding:'utf8',timeout:90000,maxBuffer:4*1024**2});
  assert(!result.error && accepted.includes(result.status), `${command} check failed; no release permitted`);
  return result.stdout;
}
assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),'496db5b457755bbf7d46f314716c8aad1b80fcfb');
run('node',[resolve(review,'apply-otphp-backport.mjs'),source,'--check']);
const base = ['run','--rm','--pull=never','--read-only','--memory=512m','--cpus=1','--cap-drop=ALL','--security-opt=no-new-privileges',
  '--tmpfs','/tmp:rw,nosuid,nodev,size=128m','-e','COMPOSER_HOME=/tmp/composer','-v',`${source}:/app:ro`];
const audit = JSON.parse(run('docker',[...base,image,'/usr/local/bin/composer','audit','--locked','--no-dev','--format=json'],[0,1,2,3]));
assert(audit.advisories && typeof audit.advisories === 'object');
const known = new Set(['PKSA-qv5y-crcz-9nxw','PKSA-kbc7-dq62-pt7d']);
const findings = Object.entries(audit.advisories).flatMap(([pkg, values]) => Object.values(values).map(a => ({package:pkg,id:a.advisoryId,title:a.title,url:a.link})));
const unexpected = findings.filter(a => a.package !== 'spomky-labs/otphp' || !known.has(a.id));
const regression = run('docker',[...base,'--network=none','-v',`${review}:/review:ro`,image,'/review/check-otphp.php']);
assert(regression.includes('"checks":14,"failed":0'));
const report = {checkedAt:new Date().toISOString(),upstream:'496db5b457755bbf7d46f314716c8aad1b80fcfb',image,
  nativeRuntimeAdvisories:findings,locallyBackported:findings.filter(a=>!unexpected.includes(a)),unexpected,
  abandonedPackages:audit.abandoned || {},regressions:{checks:14,failures:0},
  status:unexpected.length ? 'BLOCKED_NEW_ADVISORIES' : 'DEPENDENCY_BACKPORT_VERIFIED_NOT_A_PUBLIC_RELEASE',
  scope:'Dependency check only; runtime/restore/edge evidence is recorded separately in docs/service-pack.md. This script never approves a public release.'};
if (process.argv[2]) await writeFile(process.argv[2],JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({status:report.status,nativeAdvisories:findings.length,locallyBackported:report.locallyBackported.length,
  unexpected:unexpected.length,abandonedPackages:Object.keys(report.abandonedPackages).length,regressions:report.regressions}));
process.exitCode = unexpected.length ? 1 : 0;
