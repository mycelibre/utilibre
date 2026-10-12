// Read-only reconciliation of stale DHI status.d records against actual payload.
// This prepares exact decisions, never modifies runtime metadata or the ledger.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';
import {exactDhiFinding} from './policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {authenticateArchive,payloadManifest,validatePayload} from './dhi-proof.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011',out=dir+'/dhi-fixed',sha=b=>createHash('sha256').update(b).digest('hex');fs.mkdirSync(out,{recursive:true});
const images=[['utilibre-expanded-penpot-frontend-1','sha256:ca4f4adc5367a40e1597bea7d6032de0d08266b6d65cdf083ae4c695d54d23a7'],['utilibre-expanded-penpot-exporter-1','sha256:a3102615b1349f141d787dd806bc3464a49d223a5336471b3e09b1bc74a6d8da']];
const versions={'libpcre2-8-0':['pcre2','10.46-1~deb13u3+dhi0'],'libsqlite3-0':['sqlite3','3.46.1-7+deb13u2+dhi1'],...Object.fromEntries(['libssl3t64','openssl','openssl-provider-legacy'].map(p=>[p,['openssl','3.5.7-1~deb13u3+dhi0']])),...Object.fromEntries(['util-linux','libmount1','libblkid1','liblastlog2-2','libsmartcols1','libuuid1'].map(p=>[p,['util-linux','2.41.5-0+deb13u1+dhi3']]))};
const allowed=new Set('103111 86145 89157 89161 89156 89158 89160 89162 11822 11824 84782 42772 54872 54873 54875 72897 75804 75805 75806 77696 84784 35189 35191 14456 18798 63072 63076 14457 54874 63073 63074 63075 75803 53612 53613 53614 13595 27456 53615'.split(' ').map(x=>'CVE-2026-'+x));allowed.add('CVE-2025-14104');
const docker=(args)=>{try{return execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']});}catch(e){fs.writeFileSync(out+'/error.log',String(e.stdout||'')+String(e.stderr||e));throw Error('DHI proof failed; private diagnostic retained');}};
const specs=Object.entries(versions).map(([p,[s,v]])=>p+'='+v).join(' ');
if(!fs.existsSync(out+'/package-index.txt'))docker(['run','--rm','--name','maintenance-dhi-fixed-proof','--user','0','--cpus','1','--memory','256m','--pids-limit','64','--log-driver','none','--mount','type=bind,src='+out+',dst=/proof','--entrypoint','sh',images[0][1],'-ec',`apt-get update > /proof/apt-index.log 2>&1; cd /proof; apt-get download ${specs} >> /proof/apt-index.log 2>&1; apt-cache show ${specs} > package-index.txt; for a in *.deb; do p=$(dpkg-deb -f "$a" Package); dpkg-deb --control "$a" "$p-control"; done`]);
const index=fs.readFileSync(out+'/package-index.txt','utf8'),archives=fs.readdirSync(out).filter(n=>n.endsWith('.deb')).map(file=>({file,sha256:sha(fs.readFileSync(out+'/'+file))}));assert.equal(archives.length,Object.keys(versions).length);
const manifests=new Map();
for(const archive of archives){
 const deb=out+'/'+archive.file;
 const field=name=>execFileSync('dpkg-deb',['-f',deb,name],{encoding:'utf8',timeout:10000}).trim();
 const packageName=field('Package'),version=field('Version');assert.equal(version,versions[packageName]?.[1]);
 authenticateArchive(index,packageName,version,archive.sha256);
 // Never trust cached control directories. Re-extract the pinned package each
 // run, derive SHA256 manifests directly, and include loader symlink targets.
 const scratch=fs.mkdtempSync('/dev/shm/utilibre-dhi-proof-');
 try{
  execFileSync('dpkg-deb',['--control',deb,scratch+'/control'],{timeout:30000});
  execFileSync('dpkg-deb',['--extract',deb,scratch+'/root'],{timeout:30000});
  manifests.set(packageName,payloadManifest(scratch+'/root'));
 }finally{fs.rmSync(scratch,{recursive:true});}
}
const sourceUrl='https://security-tracker.debian.org/tracker/data/json';
const response=await fetch(sourceUrl,{signal:AbortSignal.timeout(30000)});assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length<128*1024**2);const tracker=JSON.parse(bytes);
const sourceEvidence={url:sourceUrl,checkedAt:new Date().toISOString(),sha256:sha(bytes),records:{}};
const queue=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security-queue.json')),scan=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security.json')),decisions=[],proofs=[],skipped=[];
freshScan(queue,scan);
for(const [name,image] of images){
 const live=JSON.parse(docker(['inspect',name]))[0];assert.equal(live.Image,image);assert(live.State.Running);
 assert.equal(scan.images.find(s=>s.id===image)?.status,'checked');
 for(const[p,[source,version]]of Object.entries(versions)){
  const relevant=queue.items.filter(x=>exactDhiFinding(x,name,image,p,allowed));
  if(!relevant.length)continue;
  try{
   assert.equal(docker(['exec',name,'dpkg-query','-W','-f=${Version}',p]).trim(),version);
   const expected=manifests.get(p),files=expected.filter(f=>f.type==='file');
   const hashes=docker(['exec',name,'sha256sum','--',...files.map(f=>f.path)]).trim().split('\n');
   assert.equal(hashes.length,files.length);
   const actual=new Map(hashes.map((line,i)=>{const hash=line.slice(0,64);assert.match(hash,/^[a-f0-9]{64}$/);assert.equal(line.slice(66),files[i].path);return[files[i].path,hash];}));
   const observed=expected.map(f=>f.type==='file'?{...f,sha256:actual.get(f.path)}:{...f,target:docker(['exec',name,'readlink','--',f.path]).trim()});
   const packageProof=validatePayload(expected,observed);
   assert.equal(JSON.parse(docker(['inspect',name]))[0].Image,image);
   for(const item of relevant){
    const evidence=tracker[source]?.[item.id]?.releases?.trixie;assert(evidence?.fixed_version&&evidence.status==='resolved','Primary Debian source does not establish fixed');
    execFileSync('dpkg',['--compare-versions',version.replace(/\+dhi\d+$/,''),'ge',evidence.fixed_version]);
    sourceEvidence.records[source+':'+item.id]=evidence;
    const reason=`Already-fixed actual signed DHI package payload: ${p} ${version}; all live regular-file SHA256 hashes and package symlinks verified against freshly extracted, SHA-pinned vendor-signed APT archive, manifest SHA256 ${packageProof}, exact live image ${image}. This reads the actual live filesystem, including any mounted or writable overlays. Scanner also consumes an older residual /var/lib/dpkg/status.d fragment; raw inventory retained unchanged. Debian primary ${source} ${item.id} record marks Trixie fixed at ${evidence.fixed_version}: https://security-tracker.debian.org/tracker/${item.id}. Only this exact package/image/CVE is reviewed; no exemption for other findings. Read-only evidence: deployment/maintenance/vendor-leaves-final/review-dhi.mjs and private dhi-fixed-review.json.`;
    decisions.push(validateDecision({key:item.key,status:'not-affected',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,image,name,package:p,actualVersion:version,scannerVersion:item.installed,payloadManifestSha256:packageProof,liveRegularFiles:files.length,liveSymlinks:expected.length-files.length,freshAuthenticatedArchive:true});
   }
  }catch(e){skipped.push({name,package:p,error:String(e.message).slice(0,150)});}
 }
}
fs.writeFileSync(out+'/primary-evidence.json',JSON.stringify(sourceEvidence,null,2)+'\n');
fs.writeFileSync(dir+'/dhi-fixed-review.json',JSON.stringify({date:new Date().toISOString(),scanDate:queue.scanDate,applied:false,decisions,proofs,archives,primaryEvidenceSha256:sha(fs.readFileSync(out+'/primary-evidence.json')),skipped},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
