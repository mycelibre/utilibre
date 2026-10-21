import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs,output,aiohttpPredecessors} from './specs.mjs';
process.umask(0o077);
const snapshot=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security.json'));
const db=JSON.parse(fs.readFileSync('/var/cache/utilibre-security/db/metadata.json'));
assert.equal(snapshot.status,'checked');assert.equal(db.UpdatedAt,snapshot.database.updatedAt);
const pillow=process.argv[2]==='--pillow',uv=process.argv[2]==='--uv',aiohttp=process.argv[2]==='--aiohttp',followup=pillow?'pillow':uv?'uv':aiohttp?'aiohttp':null,keys=process.argv.slice(followup?3:2);assert(keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
for(const key of keys){
 const s=specs.find(s=>s.key===key),dir=output+'/'+key+(followup?'/'+followup:''),b=JSON.parse(fs.readFileSync(dir+'/build.json'));
 assert.equal(cp.execFileSync('docker',['image','inspect','--format','{{.Id}}',b.candidate],{encoding:'utf8'}).trim(),b.imageId);
 cp.execFileSync('/opt/utilibre/maintenance/bin/trivy',['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--image-src','docker','--format','json','--output',dir+'/scan.json',b.imageId],{timeout:330000,maxBuffer:1024**2,stdio:['ignore','ignore','pipe'],env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'2',GOMEMLIMIT:'1GiB'}});
 const scan=JSON.parse(fs.readFileSync(dir+'/scan.json'));
 const packages=(scan.Results||[]).flatMap(r=>r.Packages||[]),findings=(scan.Results||[]).flatMap(r=>r.Vulnerabilities||[]);
 assert(packages.some(p=>p.Name==='certifi'&&p.Version==='2026.10.19'),'New package not inventoried');
 assert(!findings.some(v=>v.VulnerabilityID==='GHSA-6q48-6c7w-9gw2'),'CA vulnerability still detected');
 if(pillow){assert(packages.some(p=>p.Name.toLowerCase()==='pillow'&&p.Version==='13.0.0'));assert(!findings.some(v=>v.PkgName.toLowerCase()==='pillow'),'Pillow finding remains');}
 if(uv){assert(packages.some(p=>p.Name==='uv'&&p.Version==='0.13.4'));assert(!findings.some(v=>v.VulnerabilityID==='GHSA-hq85-5cpj-mr62'),'uv CA vulnerability remains');}
 if(aiohttp){for(const [name,version]of [['aiohttp','3.14.4'],['yarl','1.25.1']]){assert(packages.some(p=>p.Name===name&&p.Version===version));assert(!findings.some(v=>v.PkgName===name),'aiohttp/yarl finding remains');}}
 const before=followup?{status:'checked',findings:JSON.parse(fs.readFileSync(output+'/'+key+(aiohttp&&aiohttpPredecessors[key]?'/'+aiohttpPredecessors[key]:'')+'/scan.json')).Results.flatMap(r=>(r.Vulnerabilities||[]).map(v=>({id:v.VulnerabilityID,package:v.PkgName})))}:snapshot.images.find(i=>i.id===s.base);assert.equal(before?.status,'checked');
 const known=new Set(before.findings.map(v=>v.id+'|'+v.package));
 const added=findings.filter(v=>['CRITICAL','HIGH'].includes(v.Severity)&&!known.has(v.VulnerabilityID+'|'+v.PkgName));assert.equal(added.length,0,'New high/critical finding needs review');
 const result={date:new Date().toISOString(),passed:true,imageId:b.imageId,base:b.base,advisoryUpdatedAt:db.UpdatedAt,rawSha256:createHash('sha256').update(fs.readFileSync(dir+'/scan.json')).digest('hex'),certifiFindingRemoved:true,pillowFindingsRemoved:pillow,uvFindingRemoved:uv,newHighCritical:0,remainingCritical:findings.filter(v=>v.Severity==='CRITICAL').length,remainingHigh:findings.filter(v=>v.Severity==='HIGH').length,scope:'Targeted dependency repair gate, not whole-application security clearance'};
 result.aiohttpFindingsRemoved=aiohttp;
 fs.writeFileSync(dir+'/scan-gate.json',JSON.stringify(result,null,2)+'\n');console.log(key+': targeted findings removed; no new high/critical findings');
}
