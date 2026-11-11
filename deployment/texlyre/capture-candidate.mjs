// Finite release gate for the already built and tested 0.14.1 candidate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/stabilization-20261111/texlyre',source=root+'/source';
const json=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=json(new URL('./inputs.json',import.meta.url));
assert.equal(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),spec.revision);
assert.equal(hash(source+'/package-lock.json'),spec.lockSha256);
assert.equal(hash(new URL('./assets.sha256',import.meta.url)),spec.assetsManifestSha256);
execFileSync('sha256sum',['-c',new URL('./assets.sha256',import.meta.url).pathname],{cwd:source,stdio:'pipe'});
const evidence={};
for(const name of ['browser/inspection.json','migration/inspection.json','source-scan.json','source-build-scan.json','build.log','upstream-tests.log','source/package-lock.json'])evidence[name]=hash(root+'/'+name);
for(const name of ['browser','migration']){
 const b=json(root+'/'+name+'/inspection.json');assert(b.passed&&!b.productionChanged&&b.outside.length===0&&b.errors.length===0);
 for(const k of ['guestProject','compiledPdfAccentsFormula','projectExportImport','localAccountUpgrade','reloadPersistence'])assert(b[k]);
 if(name==='migration')assert(b.migrationFrom013);
}
assert(fs.readFileSync(root+'/build.log','utf8').includes('built in'));
const tests=fs.readFileSync(root+'/upstream-tests.log','utf8');assert(tests.includes('9 passed'));assert(!tests.includes('FAIL '));
// Trivy treats the unused Yarn alias as the older, different uri-js package.
// Preserve the raw finding and verify the actual package identity, not severity.
const lock=json(source+'/package-lock.json'),installed=json(source+'/node_modules/uri-js/package.json');
assert.equal(installed.name,'uri-js-replace');assert.equal(installed.version,'1.0.1');
assert.equal(lock.packages['node_modules/uri-js'].name,'uri-js-replace');
assert.equal(lock.packages['node_modules/uri-js'].resolved,'https://registry.npmjs.org/uri-js-replace/-/uri-js-replace-1.0.1.tgz');
const yarn=fs.readFileSync(source+'/yarn.lock','utf8');assert(yarn.includes('"uri-js@npm:uri-js-replace@1.0.1":'));assert(yarn.includes('https://registry.npmjs.org/uri-js-replace/-/uri-js-replace-1.0.1.tgz'));
let alias=0;
for(const name of ['source-scan.json','source-build-scan.json']){
 const scan=json(root+'/'+name);assert(scan.Results.some(r=>r.Type==='npm'));
 for(const r of scan.Results)for(const v of r.Vulnerabilities||[]){
  if(!['CRITICAL','HIGH'].includes(v.Severity))continue;
  assert.equal(r.Target,'yarn.lock');assert.equal(v.VulnerabilityID,'NSWG-ECO-100');assert.equal(v.PkgName,'uri-js');assert.equal(v.InstalledVersion,'1.0.1');alias++;
 }
}
assert.equal(alias,2);
const database=json('/var/cache/utilibre-security/db/metadata.json');assert(Date.now()-Date.parse(database.UpdatedAt)<spec.maximumAdvisoryAgeHours*3600000);
const h=createHash('sha256');function visit(path=''){for(const n of fs.readdirSync(source+'/dist/'+path).sort()){const f=path+n,s=fs.lstatSync(source+'/dist/'+f);assert(!s.isSymbolicLink());if(s.isDirectory())visit(f+'/');else{assert(s.isFile());h.update(f).update('\0').update(fs.readFileSync(source+'/dist/'+f)).update('\0');}}}visit();
const result={date:new Date().toISOString(),passed:true,revision:spec.revision,compiler:spec.compiler,lockSha256:spec.lockSha256,staticSha256:h.digest('hex'),evidence,databaseUpdatedAt:database.UpdatedAt,databaseSha256:hash('/var/cache/utilibre-security/db/trivy.db'),npmCriticalHigh:0,otherLockAliasVerified:true,upstreamTests:{passed:9,skipped:4},fullWasmComponentAssessment:false,byteReproducibleBuildClaim:false,productionChanged:false};
fs.writeFileSync(root+'/candidate.json',JSON.stringify(result,null,2)+'\n');console.log('Pinned candidate, native migration and recorded assessment gates passed.');
