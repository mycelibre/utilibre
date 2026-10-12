import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,statfsSync} from 'node:fs';
process.umask(0o077);
const directory='/var/lib/utilibre-maintenance/sqlite-final-20261011';
const build=JSON.parse(readFileSync(directory+'/build.json'));
const checks=JSON.parse(readFileSync(directory+'/checks.json'));
assert.equal(checks.status,'passed');
const rows=[];
for(const image of build.rows){
 const space=statfsSync(directory);assert(space.bavail*space.bsize>=8*1024**3);
 const file=directory+'/'+image.kind+'-os-trivy.json';
 execFileSync('systemd-run',['--quiet','--scope','-p','CPUQuota=100%','-p','MemoryMax=2G','/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--pkg-types','os','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',file,image.candidateId],{timeout:190000,stdio:['ignore','pipe','pipe'],env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'1',GOMEMLIMIT:'512MiB'}});
 const data=JSON.parse(readFileSync(file));
 const libraries=data.Results.flatMap(r=>r.Packages||[]).filter(p=>p.Name==='libsqlite3-0');
 assert(libraries.some(p=>p.Version+'-'+p.Release===build.version),'Patched package inventory missing');
 const native=checks.rows.find(r=>r.candidateId===image.candidateId);assert(native?.sonameAndExportsUnchanged);
 rows.push({kind:image.kind,image:image.candidateId,version:build.version,librarySha256:native.librarySha256,
  rawSqliteFindings:data.Results.flatMap(r=>r.Vulnerabilities||[]).filter(v=>['sqlite3','libsqlite3-0'].includes(v.PkgName)).map(v=>({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,fixed:v.FixedVersion,severity:v.Severity})),
  remediation:'Only CVE-2025-7458 backported; exact source, four-line patch, package hashes and native gates supplied. Raw vendor findings retained; no global waiver.'});
 console.log('Recorded native SQLite inventory and raw vendor findings: '+image.kind);
}
writeFileSync(directory+'/scan.json',JSON.stringify({date:new Date().toISOString(),status:'inventory-verified',deployed:false,rows},null,2)+'\n');
