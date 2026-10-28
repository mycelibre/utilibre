// Existing Trivy interface, exact old/new images and one unchanged local DB.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028',alpine=process.argv.includes('--alpine'),undici=process.argv.includes('--undici'),profile=alpine?'alpine':undici?'undici':'brotli',inputs=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url)));
const keys=process.argv.slice(2).filter(k=>!['--alpine','--undici'].includes(k));assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const db='/var/cache/utilibre-security/db/trivy.db',metadata=JSON.parse(fs.readFileSync('/var/cache/utilibre-security/db/metadata.json'));
assert(Date.now()-Date.parse(metadata.UpdatedAt)<48*3600000,'Advisory database is stale');
const dbHash=()=>cp.execFileSync('sha256sum',[db],{encoding:'utf8'}).split(' ')[0],dbSha256=dbHash();
const env={...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'1',GOMEMLIMIT:'1GiB'};
for(const key of keys){
 const s=inputs.rows.find(r=>r.key===key),dir=root+'/'+profile+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));
 assert(b.passed&&b.base===s.base&&b.candidate===s.candidate);
 assert.equal(cp.execFileSync('docker',['image','inspect','--format','{{.Id}}',s.candidate],{encoding:'utf8'}).trim(),b.imageId);
 assert(!fs.existsSync(dir+'/scan-gate.json'),'Preserve completed assessment');
 const rows=[];
 for(const [name,image]of [['before',s.base],['after',b.imageId]]){
  const file=dir+'/'+name+'-scan.json',args=['image','--disable-telemetry','--cache-dir','/var/cache/utilibre-security','--cache-backend','memory','--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','5m','--no-progress','--list-all-pkgs','--image-src','docker','--format','json','--output',file,image];
  try{cp.execFileSync('/opt/utilibre/maintenance/bin/trivy',args,{env,timeout:330000,maxBuffer:1024**2,stdio:['ignore','ignore','pipe']});}
  catch(e){fs.writeFileSync(dir+'/'+name+'-scan-error.log',String(e.stderr||e.message));throw Error(key+': scanner failed; coverage incomplete');}
  const raw=fs.readFileSync(file),scan=JSON.parse(raw);assert.equal(scan.Metadata.ImageID,image);
  const packages=scan.Results.flatMap(r=>r.Packages||[]);assert(packages.length>0,'Missing inventory');
  if(alpine){
   const text=cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--memory','128m','--cpus','1','--log-driver','none','--entrypoint','cat',image,'/lib/apk/db/installed'],{encoding:'utf8',timeout:30000,stdio:['ignore','pipe','pipe']});
   const expected=text.split('\n\n').map(t=>Object.fromEntries(t.split('\n').filter(l=>/^[PV]:/.test(l)).map(l=>[l[0],l.slice(2)]))).filter(x=>x.P);
   const actual=new Set(scan.Results.filter(r=>r.Type==='alpine').flatMap(r=>r.Packages||[]).map(p=>p.ID));
   assert(expected.length>0&&expected.every(p=>actual.has(p.P+'@'+p.V)),'Incomplete native APK inventory');
  }else if(!undici)assert(packages.length>30,'Missing Debian inventory');
  // Debian's Trivy Version excludes the package revision; ID retains it.
  const expected=undici?[]:alpine?Object.entries(s.packages).map(([pkg,p])=>[pkg,name==='before'?p.installed:inputs.packages[p.package].version]):[['libbrotli1',name==='before'?s.installed:s.version]];
  if(undici)for(const version of new Set(Object.values(name==='before'?s.before:b.versions)))assert(packages.some(p=>p.Name==='undici'&&p.Version===version),'Installed JS package missing from scan');
  for(const [pkg,version]of expected)assert(packages.some(p=>p.Name===pkg&&p.ID===pkg+'@'+version),'Target package missing');
  const findings=scan.Results.flatMap(r=>(r.Vulnerabilities||[]).map(v=>({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,type:r.Type,path:v.PkgPath||'',severity:v.Severity})));
  rows.push({imageId:image,rawSha256:sha(raw),packages:packages.length,findings});
 }
 const target=r=>r.findings.filter(v=>undici?v.package==='undici'&&['HIGH','CRITICAL'].includes(v.severity):alpine?inputs.advisories.includes(v.id)&&Object.hasOwn(s.packages,v.package):v.id===inputs.advisory&&v.package==='libbrotli1');
 assert(target(rows[0]).length>0,'Baseline attribution absent');assert.equal(target(rows[1]).length,0,'Target finding remains');
 const fingerprint=v=>JSON.stringify(v),known=new Set(rows[0].findings.map(fingerprint));
 const added=rows[1].findings.filter(v=>['CRITICAL','HIGH'].includes(v.severity)&&!known.has(fingerprint(v)));
 assert.equal(added.length,0,'New critical/high findings need review');assert.equal(dbHash(),dbSha256);
 const result={date:new Date().toISOString(),passed:true,imageId:b.imageId,base:s.base,advisories:undici?['CVE-2026-109869']:alpine?inputs.advisories:[inputs.advisory],advisoryUpdatedAt:metadata.UpdatedAt,databaseSha256:dbSha256,targetedFindingRemoved:true,removedTargets:target(rows[0]),newHighCritical:0,remainingCritical:rows[1].findings.filter(v=>v.severity==='CRITICAL').length,remainingHigh:rows[1].findings.filter(v=>v.severity==='HIGH').length,rows:rows.map(({findings,...r})=>r),scope:'Package-only repair; other existing findings remain open'};
 fs.writeFileSync(dir+'/scan-gate.json',JSON.stringify(result,null,2)+'\n');console.log(key+': targeted dependency findings removed, no new high/critical records');
}
