// Targeted same-snapshot comparison. The archived advisory DB may predate the
// PHP advisory; vendor fixed-version evidence is checked independently.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,output} from './specs.mjs';
process.umask(0o077);
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
const dbFile='/var/cache/utilibre-security/db/metadata.json',db=JSON.parse(fs.readFileSync(dbFile));
// The 22 October scheduled scan failed its disk preflight and replaced the
// summary with an incomplete result. Explicitly use the preserved, completed
// 21 October assessment, not that failed summary or an invented empty baseline.
const baseline='/var/lib/utilibre-maintenance/ssh-backports103-20261021/host-scan/security.before.json';
const snapshot=JSON.parse(fs.readFileSync(baseline));assert.equal(snapshot.status,'checked');
assert.equal(snapshot.database.updatedAt,db.UpdatedAt,'Baseline must use same database');
for(const key of keys){
 const dir=output+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&b.applicationUnchanged&&b.configurationUnchanged);
 assert.equal(cp.execFileSync('docker',['image','inspect','--format','{{.Id}}',b.candidate],{encoding:'utf8'}).trim(),b.imageId);
 try{cp.execFileSync('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--image-src','docker','--format','json','--output',dir+'/scan.json',b.imageId],{timeout:330000,maxBuffer:1024**2,stdio:['ignore','ignore','pipe'],env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'2',GOMEMLIMIT:'1GiB'}});}catch(e){fs.writeFileSync(dir+'/scan-error.log',String(e.stderr||e));throw Error('Candidate scan failed; retained private diagnostic');}
 assert.deepEqual(JSON.parse(fs.readFileSync(dbFile)),db,'DB changed during assessment');
 const scan=JSON.parse(fs.readFileSync(dir+'/scan.json')),pkgs=scan.Results.flatMap(r=>r.Packages||[]),findings=scan.Results.flatMap(r=>r.Vulnerabilities||[]);
 assert(pkgs.some(p=>p.Name===b.origin&&p.Version===b.version)||b.packages.every(n=>pkgs.some(p=>p.Name===n&&p.Version===b.version)),'Updated PHP not inventoried');
 const before=snapshot.images.find(i=>i.id===b.base);assert.equal(before?.status,'checked');const known=new Set(before.findings.map(v=>v.id+'|'+v.package));
 const added=findings.filter(v=>['CRITICAL','HIGH'].includes(v.Severity)&&!known.has(v.VulnerabilityID+'|'+v.PkgName));
 const report={date:new Date().toISOString(),imageId:b.imageId,base:b.base,advisoryUpdatedAt:db.UpdatedAt,rawSha256:createHash('sha256').update(fs.readFileSync(dir+'/scan.json')).digest('hex'),newHighCritical:added.map(v=>({id:v.VulnerabilityID,package:v.PkgName})),remainingCritical:findings.filter(v=>v.Severity==='CRITICAL').length,remainingHigh:findings.filter(v=>v.Severity==='HIGH').length,vendorFixedPhp:b.normalAfter.version,scope:'PHP package update; not complete application security clearance',limitations:'Archived advisory snapshot predates the two PHP disclosures. Fixed-version evidence comes from PHP and the signed vendor packages, not absence of those CVEs in this scan.',passed:added.length===0};
 fs.writeFileSync(dir+'/scan-gate.json',JSON.stringify(report,null,2)+'\n');assert(report.passed,'New high/critical findings need review');console.log(key+': PHP version inventoried; no new high/critical findings in same-snapshot comparison');
}
