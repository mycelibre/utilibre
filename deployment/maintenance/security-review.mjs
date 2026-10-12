// Inventory *running* image IDs, not tags. Scan software, never mounted user data.
// Trivy performs local matching. Databases and, for a broken Docker export,
// the explicitly reviewed immutable official artifact below may be downloaded.
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir,readFile,writeFile,rename,copyFile,mkdtemp,rm,statfs} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const exec=promisify(execFile), root=fileURLToPath(new URL('../../',import.meta.url));
const directory='/var/lib/utilibre-maintenance', cache='/var/cache/utilibre-security';
const binary='/opt/utilibre/maintenance/bin/trivy';
const env={...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true',GOMAXPROCS:'2',GOMEMLIMIT:'1GiB'};
const authentikDigest='sha256:ab9b4e8cc4ab3f8d1198d2db6aeea66bafea1963b3f2843589e0d163f97d9849';
// Ask Docker only for inventory fields; never load live credentials/mounts into
// a large child-process buffer or an exception's captured stdout.
export const inventoryFormat='{"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Image":{{json .Config.Image}}}}';
export function scannerManifestName(file){
 const name=path.basename(file);
 if(/^(auth|linkding)-python-requirements\.txt$/.test(name))return 'requirements.txt';
 return name==='security-package-lock.json'?'package-lock.json':name;
}
export function registryFallback(item){
 // Docker's local OCI export of this exact image lacks its config blob. Do not
 // resolve a moving tag or infer another image is equivalent to the running one.
 const reviewed=[
  {digest:authentikDigest,repository:'ghcr.io/goauthentik/server',tag:'2026.8.3'},
  {digest:'sha256:967194b8f73a1251b2a566f91b457bc872c1bbaf343827a455ade760b9693bf6',repository:'ghcr.io/diygod/rsshub',tag:'2026-10-11'},
 ];
 const match=reviewed.find(r=>item.id===r.digest&&item.references.length&&item.references.every(x=>[r.repository+':'+r.tag,r.repository+'@'+r.digest,r.repository+':'+r.tag+'@'+r.digest].includes(x)));
 return match?match.repository+'@'+match.digest:null;
}
export function summarize(data){
 const counts={UNKNOWN:0,LOW:0,MEDIUM:0,HIGH:0,CRITICAL:0};
 const findings=[];let packages=0,osPackages=0;
 for(const result of data.Results||[]){
  packages+=(result.Packages||[]).length;
  if(result.Class==='os-pkgs')osPackages+=(result.Packages||[]).length;
  for(const v of result.Vulnerabilities||[]){
   const severity=Object.hasOwn(counts,v.Severity)?v.Severity:'UNKNOWN';counts[severity]++;
   findings.push({id:v.VulnerabilityID,package:v.PkgName,installed:v.InstalledVersion,fixed:v.FixedVersion||null,severity,type:result.Type,target:result.Target,url:v.PrimaryURL||null});
  }
 }
 const family=data.Metadata?.OS?.Family||null;
 return {packages,counts,findings,eosl:data.Metadata?.OS?.EOSL===true,
  os:{family,name:data.Metadata?.OS?.Name||null,packages:osPackages,inventory:osPackages?'present':family?'missing':'not-detected'}};
}
export function imageScanStatus(result){return result.packages>0&&result.os?.inventory!=='missing'?'checked':'incomplete';}
export function imageInventory(rows){
 const map=new Map();
 for(const row of rows){
  if(!/^\/(?:utilibre-|public-utility-)/.test(row.Name))continue;
  if(!/^sha256:[a-f0-9]{64}$/.test(row.Image))throw Error('Invalid image identifier');
  const item=map.get(row.Image)||{id:row.Image,containers:[],references:[]};
  item.containers.push(row.Name.slice(1));
  if(!item.references.includes(row.Config.Image))item.references.push(row.Config.Image);
  map.set(row.Image,item);
 }
 return [...map.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
async function command(program,args,timeout=600000){
 try{return (await exec(program,args,{cwd:root,env,timeout,maxBuffer:64*1024**2})).stdout;}
 catch(error){await writeFile(directory+'/security-last-error.log',String(error.stderr||error.message).slice(0,64000),{mode:0o600});throw Error('Bounded security-review command failed; private diagnostic retained.');}
}
async function atomic(file,data){await writeFile(file+'.tmp',JSON.stringify(data,null,2)+'\n',{mode:0o600});await rename(file+'.tmp',file);}
export async function run(){
 await mkdir(directory,{recursive:true,mode:0o700});await mkdir(cache,{recursive:true,mode:0o700});
 const started=Date.now(),report={date:new Date().toISOString(),status:'running',scanner:'Trivy 0.75.0',images:[],sources:[],limitations:['No exploitation or reachability proof. Findings require review; patched vendored code may need evidence-backed exceptions.','Image scans do not inspect mounted user data or a container writable layer.','Source-lock checks cover the listed code manifests, not every minified browser bundle.','Package inventory is not complete compiled-component coverage: Grist\'s official Deno binary has no recoverable Rust-crate inventory/release SBOM; its Pyodide Python/WASM components also retain upstream coverage limits. See deployment/maintenance/sandbox-final/README.md.','Separate Caddy/Proxmox hosts are outside this VM scan.']};
 const latest=directory+'/security.json';
 await atomic(directory+'/security-progress.json',report);
 let scratch;
 try{
  const space=await statfs(directory);if(space.bavail*space.bsize<8*1024**3)throw Error('Disk floor');
  await command(binary,['image','--disable-telemetry','--cache-dir',cache,'--db-repository','ghcr.io/aquasecurity/trivy-db:2','--download-db-only','--no-progress'],300000);
  await command(binary,['image','--disable-telemetry','--cache-dir',cache,'--java-db-repository','ghcr.io/aquasecurity/trivy-java-db:1','--download-java-db-only','--no-progress'],300000);
  const metadata=JSON.parse(await readFile(cache+'/db/metadata.json','utf8'));
  report.database={updatedAt:metadata.UpdatedAt,downloadedAt:metadata.DownloadedAt};
  if(!Number.isFinite(Date.parse(metadata.UpdatedAt))||Date.now()-Date.parse(metadata.UpdatedAt)>48*3600000)throw Error('Vulnerability database is stale');
  const ids=(await command('docker',['ps','-q'])).trim().split(/\s+/).filter(Boolean);
  if(!ids.length)throw Error('No running containers');
  const rows=(await command('docker',['inspect','--format',inventoryFormat,...ids])).trim().split('\n').map(line=>JSON.parse(line));
  const inventory=imageInventory(rows);
  report.expectedImages=inventory.length;report.containers=inventory.reduce((n,i)=>n+i.containers.length,0);
  scratch=await mkdtemp(directory+'/security-scratch-');
  const flags=['--disable-telemetry','--cache-dir',cache,'--scanners','vuln','--offline-scan','--skip-db-update','--skip-java-db-update','--parallel','1','--timeout','8m','--no-progress','--list-all-pkgs','--format','json'];
  async function scan(kind,target,extra=[]){
   const output=path.join(scratch,'scan.json');
   await command(binary,[kind,...flags,...extra,'--output',output,target],510000);
   return summarize(JSON.parse(await readFile(output,'utf8')));
  }
  for(const item of inventory){
   try{const result=await scan('image',item.id,['--image-src','docker']);report.images.push({...item,status:imageScanStatus(result),method:'local-image',...result});}
   catch{
    const fallback=registryFallback(item);
    try{
     if(!fallback)throw Error('No reviewed fallback');
     const result=await scan('image',fallback,['--image-src','remote','--sbom-sources','']);
     report.images.push({...item,status:imageScanStatus(result),method:'registry-artifact-exact-digest',note:'Local OCI export is incomplete; scanned the same immutable official registry artifact, not container writable data.',...result});
    }catch{report.images.push({...item,status:'failed',note:'Scanner failed; inspect privately or retry this immutable image. No clean result inferred.'});}
   }
   console.log(`Images ${report.images.length}/${inventory.length}: ${report.images.at(-1).status}`);
   await atomic(directory+'/security-progress.json',report);
  }
  // Minimal dpkg snapshot only: never traverse /home, /opt data or the live rootfs.
  const osRoot=path.join(scratch,'host');
  await mkdir(osRoot+'/etc',{recursive:true});await mkdir(osRoot+'/var/lib/dpkg',{recursive:true});
  await copyFile('/etc/os-release',osRoot+'/etc/os-release');await copyFile('/etc/debian_version',osRoot+'/etc/debian_version');await copyFile('/var/lib/dpkg/status',osRoot+'/var/lib/dpkg/status');
  report.host={status:'checked',...await scan('rootfs',osRoot,['--pkg-types','os'])};
  if(!report.host.packages)throw Error('Host package inventory was empty');
  // Explicit code-only roots. Extra/missing source manifests are reported, not
  // interpreted as proof of what is bundled in a deployed static application.
  const tracked=(await command('git',['ls-files','-z'])).split('\0').filter(x=>/(^|\/)((?:security-)?package-lock\.json|(?:auth|linkding)-python-requirements\.txt|pnpm-lock\.yaml|yarn\.lock|composer\.lock|Cargo\.lock|go\.mod|go\.sum|poetry\.lock|uv\.lock)$/.test(x));
  const sources=[...tracked.map(p=>({path:path.join(root,p),name:p,scope:'tracked-build-input'})),{path:'/opt/utilibre/src/cryptpad/package-lock.json',name:'cryptpad/package-lock.json',scope:'mounted-runtime-code'}];
  for(const source of sources){
   try{
    const bytes=await readFile(source.path);if(bytes.length>10*1024**2)throw Error('Oversized manifest');
    const dest=path.join(scratch,'manifest-'+report.sources.length);await mkdir(dest);
    await writeFile(path.join(dest,scannerManifestName(source.path)),bytes);
    report.sources.push({name:source.name,scope:source.scope,sha256:createHash('sha256').update(bytes).digest('hex'),status:'checked',...await scan('fs',dest,['--pkg-types','library'])});
   }catch{report.sources.push({name:source.name,scope:source.scope,status:'failed'});}
  }
  report.status=report.images.some(x=>x.status!=='checked')||report.sources.some(x=>x.status!=='checked')?'incomplete':'checked';
 }catch{report.status='failed';report.error='Inventory/database/host scan failed; no security clearance. Rerun the job or consult the documented commands.';}
 finally{
  if(scratch)await rm(scratch,{recursive:true,force:true});
  report.completedAt=new Date().toISOString();report.elapsedSeconds=Math.round((Date.now()-started)/1000);
  await atomic(latest,report);await atomic(directory+'/security-progress.json',report);
  console.log(JSON.stringify({status:report.status,images:report.images.length,report:latest,elapsedSeconds:report.elapsedSeconds}));
 }
 if(report.status!=='checked')process.exitCode=1;
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await run();
