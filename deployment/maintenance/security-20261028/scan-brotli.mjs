// Existing Trivy interface, exact old/new images and one unchanged local DB.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028',flags=['--alpine','--node-apk','--undici','--body','--go','--go-helpers','--node','--curl','--curl-bookworm'];
assert(process.argv.filter(a=>flags.includes(a)).length<=1);
const profile=process.argv.find(a=>flags.includes(a))?.slice(2)||'brotli',alpine=['alpine','node-apk'].includes(profile),undici=profile==='undici',body=profile==='body',go=['go','go-helpers'].includes(profile),node=profile==='node',curl=profile.startsWith('curl'),inputs=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url)));
const keys=process.argv.slice(2).filter(k=>!flags.includes(k));assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>inputs.rows.some(s=>s.key===k)));
const sha=b=>createHash('sha256').update(b).digest('hex');
const db='/var/cache/utilibre-security/db/trivy.db',metadata=JSON.parse(fs.readFileSync('/var/cache/utilibre-security/db/metadata.json'));
assert(Date.now()-Date.parse(metadata.UpdatedAt)<48*3600000,'Advisory database is stale');
const dbHash=()=>cp.execFileSync('sha256sum',[db],{encoding:'utf8'}).split(' ')[0],dbSha256=dbHash();
const env={...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'1',GOMEMLIMIT:'1GiB'};
for(const key of keys){
 const s=inputs.rows.find(r=>r.key===key),dir=root+'/'+profile+(profile==='curl-bookworm'?'/images':'')+'/'+key,b=JSON.parse(fs.readFileSync(dir+'/build.json'));
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
  }else if(!undici&&!body&&!go&&!node)assert(packages.length>30,'Missing Debian inventory');
  // Debian's Trivy Version excludes the package revision; ID retains it.
  const expected=undici||body||go||curl||node?[]:alpine?Object.entries(s.packages).map(([pkg,p])=>[pkg,name==='before'?p.installed:inputs.packages[p.package].version]):[['libbrotli1',name==='before'?s.installed:s.version]];
  if(undici)for(const version of new Set(Object.values(name==='before'?s.before:b.versions)))assert(packages.some(p=>p.Name==='undici'&&p.Version===version),'Installed JS package missing from scan');
  if(body)for(const version of new Set(Object.entries(name==='before'?s.before:b.versions).filter(([p])=>p.endsWith('/body-parser')).map(([,v])=>v)))assert(packages.some(p=>p.Name==='body-parser'&&p.Version===version),'Missing body-parser inventory');
  if(go)assert(packages.some(p=>p.Name==='stdlib'&&p.Version===('v'+(name==='before'?(s.previousCompiler||'1.26.9'):s.compilerVersion))),'Missing Go standard-library inventory');
  if(curl)for(const pkg of s.packages)assert(packages.some(p=>p.Name===pkg&&(name==='before'||p.Version==='8.23.0')),'Missing curl inventory');
  for(const [pkg,version]of expected)assert(packages.some(p=>p.Name===pkg&&p.ID===pkg+'@'+version),'Target package missing');
  const findings=scan.Results.flatMap(r=>(r.Vulnerabilities||[]).map(v=>({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,type:r.Type,path:v.PkgPath||'',severity:v.Severity})));
  rows.push({imageId:image,rawSha256:sha(raw),packages:packages.length,findings});
 }
 const target=r=>r.findings.filter(v=>node?false:body?v.package==='body-parser'&&v.id==='CVE-2026-111181':go?v.package==='stdlib'&&v.id===inputs.advisory:curl?v.id==='CVE-2026-92392'&&s.packages.includes(v.package):undici?v.package==='undici'&&['HIGH','CRITICAL'].includes(v.severity):alpine?inputs.advisories.includes(v.id)&&Object.hasOwn(s.packages,v.package):v.id===inputs.advisory&&v.package==='libbrotli1');
 if(!curl&&!node)assert(target(rows[0]).length>0,'Baseline attribution absent');
 assert.equal(target(rows[1]).length,0,'Target finding remains');
 if(curl){assert.equal(b.version,profile==='curl-bookworm'?'8.23.0-1~deb12u1+utilibre1':'8.23.0-1~deb13u1+utilibre1');assert(b.packages.length&&b.packages.every(p=>/^[a-f0-9]{64}$/.test(p.sha256)));}
 if(node){const n=JSON.parse(fs.readFileSync(dir+'/native.json'));assert(n.passed&&n.imageId===b.imageId&&n.rows[1].nulRejected&&n.rows[1].fullwidthRejected&&n.rows[1].looseRejected);assert.equal(b.currentRuntime.versions.node,b.artifact.version);assert.equal(b.binarySha256,b.artifact.nodeSha256);}
 const fingerprint=v=>JSON.stringify(curl&&s.packages.includes(v.package)?{...v,installed:'reviewed-curl-package-version'}:v),known=new Set(rows[0].findings.map(fingerprint));
 const added=rows[1].findings.filter(v=>['CRITICAL','HIGH'].includes(v.severity)&&!known.has(fingerprint(v)));
 assert.equal(added.length,0,'New critical/high findings need review');assert.equal(dbHash(),dbSha256);
 const result={date:new Date().toISOString(),passed:true,imageId:b.imageId,base:s.base,advisories:node?['CVE-2026-105482','CVE-2026-105483','CVE-2026-106069','CVE-2026-111497','CVE-2026-106072']:body?['CVE-2026-111181']:go?[inputs.advisory]:curl?['CVE-2026-92392']:undici?['CVE-2026-109869']:alpine?inputs.advisories:[inputs.advisory],advisoryUpdatedAt:metadata.UpdatedAt,databaseSha256:dbSha256,targetedFindingRemoved:target(rows[0]).length>0,...(node?{primarySourceFixVerified:true,fixEvidence:'Pinned official Node binary plus native version, DNS/TLS regression and compatibility proof',scannerCoverageGap:'This scanner does not inventory most standalone Node binaries; package scan absence is not runtime fix proof'}:{}),...(curl?{primarySourceFixVerified:true,fixEvidence:'Signed curl 8.23.0 source; checksum-pinned native packages and preserved ABI/application tests',primaryAdvisory:'https://curl.se/docs/CVE-2026-92392.html',scannerCoverageGap:target(rows[0]).length===0?'Debian database does not attribute this advisory to the custom 8.22 baseline; scan absence is not the fix proof':null}:{}),removedTargets:target(rows[0]),newHighCritical:0,remainingCritical:rows[1].findings.filter(v=>v.severity==='CRITICAL').length,remainingHigh:rows[1].findings.filter(v=>v.severity==='HIGH').length,rows:rows.map(({findings,...r})=>r),scope:'Package-only repair; other existing findings remain open'};
 fs.writeFileSync(dir+'/scan-gate.json',JSON.stringify(result,null,2)+'\n');console.log(key+(node?': pinned Node security release and native regressions verified; package findings retained':curl?': exact upstream-fixed curl packages verified; other scanner findings retained':': targeted dependency findings removed, no new high/critical records'));
}
