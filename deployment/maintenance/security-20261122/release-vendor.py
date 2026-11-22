"""Exact PHP activation through the retained application-specific release gate.

Approval binds native tests, full-image scope, raw all-severity assessment and
upstream security-release evidence. Existing supervisors and rollback apply.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

os.umask(0o077)
HERE=Path(__file__).resolve().parent
ROOT=Path('/var/lib/utilibre-maintenance/security-20261122')
inputs=json.loads((HERE/'vendor-inputs.json').read_text())
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert len(sys.argv)>=3 and sys.argv[1] in ('prepare','apply','retry')
assert len(sys.argv[2:])==len(set(sys.argv[2:]))
for key in sys.argv[2:]:
    row=next(r for r in inputs['rows'] if r['key']==key)
    assert row.get('releaseApproval')=='approved'
    for filename,digest in row['reviewedEvidence'].items():
        assert filename in ('build.json','scope.json','application.json','scan-gate.json','after-scan.json')
        assert sha(ROOT/'vendor'/key/filename)==digest
    assert sha(ROOT/'primary/php-changelog.html')==row['upstreamEvidence']['sha256']
original=HERE.parent/'php-20261022/release.mjs';code=original.read_text()


def replace(old,new):
    global code
    assert code.count(old)==1, old[:100]
    code=code.replace(old,new)


replace("import {specs,output} from './specs.mjs';", 'const inputs=JSON.parse(fs.readFileSync('+json.dumps(str(HERE/'vendor-inputs.json'))+'));\nconst specs=inputs.rows.map(r=>({...r,php:"php",version:r.upstreamEvidence?.release})),output='+json.dumps(str(ROOT/'vendor'))+';')
for path in ('../go-final/release.mjs','../language-final/release.mjs'):
    replace("from '"+path+"'", 'from '+json.dumps((original.parent/path).resolve().as_uri()))
code=code.replace('import.meta.url',json.dumps(original.as_uri()))
replace("process.umask(0o077);", 'import {acquireReleaseLock} from '+json.dumps((HERE.parent/'security-20261103/release-lock.mjs').as_uri())+';\nprocess.umask(0o077);\nconst unlock=acquireReleaseLock("/var/lib/utilibre-maintenance/package-release.lock");\ntry {')
replace('assert(b.passed&&b.configurationUnchanged&&b.applicationUnchanged&&b.unrelatedPackagesUnchanged);', '''assert(b.passed&&b.configurationUnchanged&&b.unrelatedPackagesUnchanged);
 const scope=read(output+'/'+key+'/scope.json');assert(scope.passed&&scope.allUnrelatedImageFilesUnchanged&&scope.configurationUnchanged&&scope.muslUnchanged);
 assert.equal(createHash('sha256').update(fs.readFileSync(output+'/'+key+'/scope.json')).digest('hex'),b.scopeSha256);''')
replace('assert.deepEqual(v.newHighCritical,[]);', '''assert.deepEqual(v.newFindings,[]);assert.equal(v.targetedAfter,0);
 assert.equal(v.databaseSha256,inputs.database.databaseSha256);
 assert.equal(createHash('sha256').update(fs.readFileSync(output+'/'+key+'/after-scan.json')).digest('hex'),v.rawScanSha256);
 assert(Date.now()-Date.parse(v.advisoryUpdatedAt)<48*3600000);''')
replace('assert.equal(b.normalAfter.version,s.version.split(\'-\')[0]);', 'assert.equal(b.native.find(n=>n.imageId===b.imageId&&n.phpVersion).phpVersion,s.version);')
replace("version==='new'?b.normalAfter.version:b.normalBefore.version", "b.native.find(n=>n.imageId===(version==='new'?b.imageId:b.base)&&n.phpVersion).phpVersion")
code+='\n} finally { unlock(); }\n'
adapter=ROOT/'release-vendor-adapter.mjs'
if adapter.exists():assert adapter.read_text()==code
else:adapter.write_text(code)
(ROOT/'release-vendor-adapter.json').write_text(json.dumps({'originalSha256':sha(original),'adapterSha256':sha(adapter),
 'changes':['finite approved artifact inputs','full-file scope and all-severity gate','existing package release lock','native PHP version evidence']},indent=2)+'\n')
subprocess.run(['/root/.nvm/versions/node/v24.22.3/bin/node',str(adapter),*sys.argv[1:]],check=True)
