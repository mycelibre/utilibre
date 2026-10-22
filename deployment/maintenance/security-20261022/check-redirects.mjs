import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {specs,output} from './redirects.mjs';
const keys=process.argv.slice(2);assert(keys.length&&keys.every(k=>specs.some(s=>s.key===k)));process.umask(0o077);
const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:240000,maxBuffer:4*1024**2,stdio:['pipe','pipe','pipe'],...opts});
const h=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex'),db='/var/cache/utilibre-security/db/trivy.db';
for(const s of specs.filter(s=>keys.includes(s.key))){const dir=output+'/'+s.key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));assert(b.passed&&b.base===s.base);const rows=[],dbSha256=h(db);
 for(const imageId of [s.base,b.imageId]){
  const native=JSON.parse(run('docker',['run','--rm','-i','--network','none','--read-only','--cpus','1','--memory','256m','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--entrypoint','node',imageId,'-',s.roots[0]],{input:fs.readFileSync(new URL('./redirect-regression.cjs',import.meta.url))}));
  const filename=dir+(imageId===s.base?'/before-scan.json':'/after-scan.json');
  run('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','3m','--no-progress','--format','json','--image-src','docker','--output',filename,imageId],{env:{...process.env,TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'1',GOMEMLIMIT:'1GiB'}});
  const scan=JSON.parse(fs.readFileSync(filename)),findings=scan.Results.flatMap(r=>(r.Vulnerabilities||[]).filter(v=>['CRITICAL','HIGH'].includes(v.Severity)).map(v=>[v.VulnerabilityID,v.PkgName,v.InstalledVersion,v.Severity].join('|'))).sort();rows.push({imageId,native,findings});
 }
 assert.equal(h(db),dbSha256);assert(rows[0].findings.some(f=>f.includes('|follow-redirects|')));assert(!rows[1].findings.some(f=>f.includes('|follow-redirects|')));assert(rows[1].findings.every(f=>rows[0].findings.includes(f)),'New high/critical finding');
 fs.writeFileSync(dir+'/regression.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,base:s.base,dbSha256,rows,newHighCritical:0,followRedirectsFindings:0,noExternalRequests:true},null,2));console.log(s.key+': both original leaks reproduced; repaired library preserves normal redirects and strips sensitive headers; no new high/critical findings.');
}
