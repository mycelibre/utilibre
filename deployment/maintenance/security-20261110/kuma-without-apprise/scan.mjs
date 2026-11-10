// Reuse the pinned fleet scanner and summarizer, with one frozen local database.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {summarize,imageScanStatus} from '../../security-review.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261110/kuma-without-apprise',cache='/var/cache/utilibre-security';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const build=read(root+'/build.json');assert(build.passed);
const binary='/opt/utilibre/maintenance/bin/trivy',databaseSha256=sha(cache+'/db/trivy.db'),javaDatabaseSha256=sha(cache+'/java-db/trivy-java.db');
const metadata=read(cache+'/db/metadata.json'),version=cp.execFileSync(binary,['--version'],{encoding:'utf8'});assert(version.includes('Version: 0.75.0'));
const rows=[];
for(const [kind,image] of [['baseline',build.base],['candidate',build.imageId]]){
 const output=root+'/'+kind+'-scan.json',fd=fs.openSync(root+'/'+kind+'-scan.log','w');
 try{cp.execFileSync('systemd-run',['--quiet','--scope','-p','CPUQuota=100%','-p','MemoryMax=2G',binary,'image','--disable-telemetry','--cache-dir',cache,'--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--format','json','--image-src','docker','--output',output,image],{timeout:330000,stdio:['ignore',fd,fd],env:{...process.env,GOMAXPROCS:'1',GOMEMLIMIT:'512MiB',TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true'}});}finally{fs.closeSync(fd);}
 const raw=read(output),summary=summarize(raw);assert.equal(imageScanStatus(summary),'checked');assert.equal(raw.Metadata.ImageID,image);
 const packages=raw.Results.flatMap(r=>r.Packages||[]).map(p=>p.Name);
 for(const name of ['apprise','python3-markdown'])assert.equal(packages.includes(name),kind==='baseline');
 rows.push({kind,image,...summary});
}
// Trivy names the OS target after the image ID. Normalize that identity only;
// preserve paths, versions, severity and every actual finding in both raw reports.
const fingerprint=(f,image)=>JSON.stringify({...f,target:f.type==='debian'&&f.target.startsWith(image+' ')?'IMAGE'+f.target.slice(image.length):f.target});
const old=new Set(rows[0].findings.map(f=>fingerprint(f,build.base)));
const added=rows[1].findings.filter(f=>['CRITICAL','HIGH'].includes(f.severity)&&!old.has(fingerprint(f,build.imageId)));
assert.equal(added.length,0);assert(rows[0].findings.some(f=>f.id==='CVE-2019-25781'&&f.package==='python3-markdown'));
assert(!rows[1].findings.some(f=>f.package==='python3-markdown'||f.package==='apprise'));
assert.equal(sha(cache+'/db/trivy.db'),databaseSha256);assert.equal(sha(cache+'/java-db/trivy-java.db'),javaDatabaseSha256);
fs.writeFileSync(root+'/scan-gate.json',JSON.stringify({passed:true,date:new Date().toISOString(),imageId:build.imageId,base:build.base,databaseSha256,javaDatabaseSha256,metadata,scanner:'Trivy 0.75.0',scannerSha256:sha(binary),newHighCritical:0,removedMarkdownFinding:true,rows:rows.map(({findings,goModules,...r})=>r)},null,2)+'\n');
console.log('Same-database comparison passed: Markdown/Apprise absent, no new high or critical findings.');
