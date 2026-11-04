// Existing Trivy engine/data; finite old/new comparison, no refresh or telemetry.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{comparisonKey}from'./mongocrypt-policy.mjs';
import{summarize,imageScanStatus}from'../security-review.mjs';
process.umask(0o077);const dir='/var/lib/utilibre-maintenance/security-20261104/mongocrypt',read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(process.argv.length,2);const spec=read(new URL('./mongocrypt-inputs.json',import.meta.url)),stage=read(dir+'/stage.json'),native=read(dir+'/native.json');assert.equal(stage.status,'passed');assert.equal(stage.base,spec.base);assert.equal(native.version,spec.version);
const db='/var/cache/utilibre-security/db/trivy.db',dbSha256=sha(db),metadata=read('/var/cache/utilibre-security/db/metadata.json');assert(Date.now()-Date.parse(metadata.UpdatedAt)<48*3600000);
const reports=[];
for(const [state,image]of [['before',spec.base],['after',stage.image]]){
 const file=dir+'/'+state+'-scan.json';
 try{cp.execFileSync('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--image-src','docker','--format','json','--output',file,image],{env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'1',GOMEMLIMIT:'1GiB'},timeout:330000,maxBuffer:1024**2,stdio:['ignore','ignore','pipe']});}
 catch(e){fs.writeFileSync(dir+'/'+state+'-scan-error.log',String(e.stderr||e.message));throw Error('Scanner failed; no release clearance');}
 const raw=read(file);assert.equal(raw.Metadata.ImageID,image);const result=summarize(raw);assert.equal(imageScanStatus(result),'checked');assert(result.os.packages>30);
 assert(raw.Results.some(r=>r.Packages?.some(p=>p.ID===spec.package+'@'+(state==='before'?spec.oldVersion:spec.version))));
 reports.push({state,image,result,fileSha256:sha(file)});assert.equal(sha(db),dbSha256,'Advisory data changed during comparison');
}

const before=new Set(reports[0].result.findings.map(f=>comparisonKey(f,spec.base)));const added=reports[1].result.findings.filter(f=>['HIGH','CRITICAL'].includes(f.severity)&&!before.has(comparisonKey(f,stage.image)));fs.writeFileSync(dir+'/comparison-added.json',JSON.stringify(added,null,2)+'\n');assert.equal(added.length,0,'New high/critical findings require review; private comparison retained');
fs.writeFileSync(dir+'/scan-gate.json',JSON.stringify({date:new Date().toISOString(),status:'passed',image:stage.image,base:spec.base,dbSha256,advisoryUpdatedAt:metadata.UpdatedAt,scannerSha256:sha('/opt/utilibre/maintenance/bin/trivy'),reports:reports.map(r=>({state:r.state,image:r.image,fileSha256:r.fileSha256,counts:r.result.counts,packages:r.result.packages})),newHighCritical:0,primarySourceFixVerified:true,nativeSha256:sha(dir+'/native.json'),rawMetadataFindingsRetained:true},null,2)+'\n');console.log('Same-database comparison passed; native repair evidence remains required.');
