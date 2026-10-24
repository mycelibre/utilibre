// Targeted same-snapshot comparison. The archived advisory DB may predate the
// PHP advisory; vendor fixed-version evidence is checked independently.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,output} from './specs.mjs';
import {scannerPackageVersion} from './checks.mjs';
process.umask(0o077);
const args=process.argv.slice(2),override=args.find(a=>a.startsWith('--baseline='));
const keys=args.filter(a=>a!==override);assert(keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
if(override)assert(override.slice(11).startsWith('/'),'Explicit baseline must be an absolute retained report');
const dbFile='/var/cache/utilibre-security/db/metadata.json',db=JSON.parse(fs.readFileSync(dbFile));
// The 22 October scheduled scan failed its disk preflight and replaced the
// summary with an incomplete result. Explicitly use the preserved, completed
// 21 October assessment, not that failed summary or an invented empty baseline.
const baseline=override?override.slice(11):'/var/lib/utilibre-maintenance/ssh-backports103-20261021/host-scan/security.before.json';
const snapshot=JSON.parse(fs.readFileSync(baseline));assert.equal(snapshot.status,'checked');
assert.equal(snapshot.database.updatedAt,db.UpdatedAt,'Baseline must use same database');
for(const key of keys){
 const dir=output+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&b.applicationUnchanged&&b.configurationUnchanged);
 assert.equal(cp.execFileSync('docker',['image','inspect','--format','{{.Id}}',b.candidate],{encoding:'utf8'}).trim(),b.imageId);
 try{cp.execFileSync('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--image-src','docker','--format','json','--output',dir+'/scan.json',b.imageId],{timeout:330000,maxBuffer:1024**2,stdio:['ignore','ignore','pipe'],env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'2',GOMEMLIMIT:'1GiB'}});}catch(e){fs.writeFileSync(dir+'/scan-error.log',String(e.stderr||e));throw Error('Candidate scan failed; retained private diagnostic');}
 assert.deepEqual(JSON.parse(fs.readFileSync(dbFile)),db,'DB changed during assessment');
 const scan=JSON.parse(fs.readFileSync(dir+'/scan.json')),pkgs=scan.Results.flatMap(r=>r.Packages||[]),findings=scan.Results.flatMap(r=>r.Vulnerabilities||[]);
 // Trivy separates Debian's upstream Version and distro Release; Alpine keeps
 // its release suffix in Version. Require the complete native package version.
 const version=scannerPackageVersion;
 if(b.manager==='official-php'){
  assert.equal(b.donor,specs.find(s=>s.key===key).donor);assert.match(b.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(b.normalAfter.version,b.version);
  assert.equal(cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--entrypoint','php',b.imageId,'-n','-r','echo PHP_VERSION;'],{encoding:'utf8',timeout:30000}).trim(),b.version);
 }else assert(pkgs.some(p=>p.Name===b.origin&&version(p)===b.version)||(b.packages.length>0&&b.packages.every(n=>pkgs.some(p=>p.Name===n&&version(p)===b.version))),'Updated PHP not inventoried');
 const before=snapshot.images.find(i=>i.id===b.base);assert.equal(before?.status,'checked');const known=new Set(before.findings.map(v=>v.id+'|'+v.package));
 const added=findings.filter(v=>['CRITICAL','HIGH'].includes(v.Severity)&&!known.has(v.VulnerabilityID+'|'+v.PkgName));
 const report={date:new Date().toISOString(),imageId:b.imageId,base:b.base,advisoryUpdatedAt:db.UpdatedAt,rawSha256:createHash('sha256').update(fs.readFileSync(dir+'/scan.json')).digest('hex'),newHighCritical:added.map(v=>({id:v.VulnerabilityID,package:v.PkgName})),remainingCritical:findings.filter(v=>v.Severity==='CRITICAL').length,remainingHigh:findings.filter(v=>v.Severity==='HIGH').length,vendorFixedPhp:b.normalAfter.version,scope:'PHP package update; not complete application security clearance',limitations:'Archived advisory snapshot predates the two PHP disclosures. Fixed-version evidence comes from PHP and the signed vendor packages, not absence of those CVEs in this scan.',passed:added.length===0};
 report.phpInventory=b.manager==='official-php'?'Compiled runtime: verified vendor artifact/source checksum and native version, not automatically inventoried by Trivy':'Native PHP packages inventoried with full distro release';
 report.baseline=baseline;
 if(override)report.limitations='Explicit completed baseline and candidate use the same advisory snapshot. Native signed-package checks independently establish the PHP update; this is not a whole-application clearance.';
 fs.writeFileSync(dir+'/scan-gate.json',JSON.stringify(report,null,2)+'\n');assert(report.passed,'New high/critical findings need review');console.log(key+': fixed PHP verified; no new high/critical findings in same-snapshot comparison');
}
