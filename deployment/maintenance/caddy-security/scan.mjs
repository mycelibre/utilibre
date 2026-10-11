import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,statfsSync} from 'node:fs';
process.umask(0o077);
const netReview=process.argv[2]==='--net';assert(!process.argv[2]||netReview,'Use --net or no argument');
const directory='/var/lib/utilibre-maintenance/caddy-security-20261011'+(netReview?'/net':'');
const build=JSON.parse(readFileSync(directory+'/build.json'));
const baseline=JSON.parse(readFileSync('/var/lib/utilibre-maintenance/security.json'));
const report={date:new Date().toISOString(),status:'running',deployed:false,rows:[]};
for(const row of build.rows){
 const space=statfsSync(directory);assert(space.bavail*space.bsize>=8*1024**3,'Preserve recovery floor');
 const output=directory+'/'+row.kind+'-trivy.json';
 execFileSync('systemd-run',['--quiet','--scope','-p','CPUQuota=100%','-p','MemoryMax=2G','/opt/utilibre/maintenance/bin/trivy','image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',output,row.candidateId],{timeout:190000,stdio:['ignore','pipe','pipe'],env:{...process.env,GOMAXPROCS:'1',GOMEMLIMIT:'512MiB',TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true'}});
 const data=JSON.parse(readFileSync(output));const binary=data.Results.find(result=>result.Target===row.path.replace(/^\//,''));
 assert(binary,'Actual Caddy binary inventory required');assert(binary.Packages.some(pkg=>pkg.Name==='stdlib'&&pkg.Version==='v1.26.9'),'Patched Go inventory required');
 assert(!binary.Vulnerabilities?.some(v=>v.PkgName==='stdlib'),'Go standard-library findings remain');
 const prior=baseline.images.find(image=>image.id===row.baseId);assert(prior,'Prior image software inventory required');
 const previous=prior.findings.filter(f=>f.target===row.path.replace(/^\//,'')&&f.package!=='stdlib'&&(!netReview||f.package!=='golang.org/x/net'));
 if(netReview){assert(binary.Packages.some(pkg=>pkg.Name==='golang.org/x/net'&&pkg.Version==='v0.60.0'));assert(!binary.Vulnerabilities?.some(v=>v.PkgName==='golang.org/x/net'),'Patched x/net findings remain');}
 const remaining=(binary.Vulnerabilities||[]).map(v=>({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,fixed:v.FixedVersion||null,severity:v.Severity}));
 const comparable=values=>values.map(v=>[v.id,v.package,v.installed,v.fixed,v.severity].join('|')).sort();
 assert.deepEqual(comparable(remaining),comparable(previous),'Library findings changed and need a fresh review');
 const findings=data.Results.flatMap(result=>result.Vulnerabilities||[]);
 report.rows.push({...row,status:'compiler-fix-verified-library-findings-remain',stdlibFindings:0,remainingCaddyLibraries:remaining,critical:findings.filter(v=>v.Severity==='CRITICAL').length,high:findings.filter(v=>v.Severity==='HIGH').length});
 console.log(row.kind+': patched compiler verified; '+remaining.length+' unchanged library advisories remain explicitly unresolved.');
}
report.status='compiler-fix-verified-library-findings-remain';report.completedAt=new Date().toISOString();writeFileSync(directory+'/scan.json',JSON.stringify(report,null,2)+'\n',{mode:0o600});
