// Distroless live-filesystem proof; no inventory edits, no applied decisions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {specs,output} from './specs.mjs';
import {authenticateArchive,payloadManifest,validatePayload,digest} from '../vendor-leaves-final/dhi-proof.mjs';
import {exactDhiFinding} from '../vendor-leaves-final/policy.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const proofOnly=process.argv[2]==='--proof-only';assert(!process.argv[2]||proofOnly);
const s=specs.find(s=>s.key==='admin'),dir=output+'/admin',stage=JSON.parse(fs.readFileSync(dir+'/build.json'));
const archiveDir='/var/lib/utilibre-maintenance/vendor-leaves-final-20261011/admin-ssl';
const version='3.5.7-1~deb13u3+dhi0',allowed=new Set('84782 42772 54872 54873 54875 72897 75804 75805 75806 77696 84784 35189 35191'.split(' ').map(s=>'CVE-2026-'+s));
const docker=(a,opt={})=>execFileSync('docker',a,{encoding:'utf8',timeout:45000,maxBuffer:2*1024**2,stdio:['pipe','pipe','pipe'],...opt});
const current=()=>docker(['inspect','--format','{{.Image}} {{.State.Running}}',s.container]).trim();
const [image,running]=current().split(' ');assert.equal(running,'true');assert([s.base,stage.imageId].includes(image));
const queue=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security-queue.json')),scan=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/security.json'));
if(!proofOnly){freshScan(queue,scan);assert.equal(scan.images.find(x=>x.id===image)?.status,'checked');}
const proofs=[],decisions=[],archives=[];
const index=fs.readFileSync(archiveDir+'/package-index.txt','utf8');
for(const p of ['libssl3t64','openssl-provider-legacy']){
 const deb=archiveDir+'/'+p+'_'+version+'_amd64.deb',hash=digest(fs.readFileSync(deb));authenticateArchive(index,p,version,hash);archives.push({package:p,version,sha256:hash});
 const scratch=fs.mkdtempSync('/dev/shm/utilibre-admin-dhi-');let expected;
 try{execFileSync('dpkg-deb',['--control',deb,scratch+'/control'],{timeout:10000});execFileSync('dpkg-deb',['--extract',deb,scratch+'/root'],{timeout:10000});expected=payloadManifest(scratch+'/root');}finally{fs.rmSync(scratch,{recursive:true});}
 const code=`const fs=require('fs'),c=require('crypto'),data=JSON.parse(process.argv[1]);const control=fs.readFileSync('/var/lib/dpkg/status.d/'+data.package,'utf8');if(!control.includes('Version: '+data.version+'\\n'))throw Error('actual version');const result=data.expected.map(x=>x.type==='file'?{...x,sha256:c.createHash('sha256').update(fs.readFileSync(x.path)).digest('hex')}:{...x,target:fs.readlinkSync(x.path)});console.log(JSON.stringify(result));`;
 const observed=JSON.parse(docker(['exec',s.container,'node','-e',code,JSON.stringify({package:p,version,expected})]));
 proofs.push({package:p,actualVersion:version,payloadManifestSha256:validatePayload(expected,observed),regularFiles:expected.filter(x=>x.type==='file').length,symlinks:expected.filter(x=>x.type==='symlink').length,imageId:image,liveOverlaysVerified:true});
}
assert.equal(current(),image+' true');
const source={};
if(!proofOnly){
 const url='https://security-tracker.debian.org/tracker/data/json',response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert(response.ok);const bytes=Buffer.from(await response.arrayBuffer());assert(bytes.length<128*1024**2);const tracker=JSON.parse(bytes);source.url=url;source.sha256=digest(bytes);source.records={};
 for(const proof of proofs)for(const item of queue.items.filter(i=>exactDhiFinding(i,s.container,image,proof.package,allowed))){
  const evidence=tracker.openssl?.[item.id]?.releases?.trixie;assert(evidence?.fixed_version&&evidence.status==='resolved');execFileSync('dpkg',['--compare-versions',version.replace(/\+dhi\d+$/,''),'ge',evidence.fixed_version]);source.records[item.id]=evidence;
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Already-fixed live DHI ${proof.package} ${version}, exact image ${image}. Every regular file SHA256 and symlink target was compared with fresh extraction of the SHA-pinned authenticated vendor APT archive, package manifest ${proof.payloadManifestSha256}. Actual running distroless filesystem including writable/mounted overlays verified using its native Node runtime, not a fresh image alone. Debian OpenSSL ${item.id} is fixed for Trixie at ${evidence.fixed_version}: https://security-tracker.debian.org/tracker/${item.id}. Scanner also reports an older residual status.d fragment; raw metadata/findings remain unchanged. No decision covers other packages, images or CVEs. Evidence: deployment/maintenance/patch-leaves-final/review-admin-dhi.mjs and private admin/dhi-review.json.`}));
 }
}
assert.equal(current(),image+' true');
const result={date:new Date().toISOString(),scanDate:proofOnly?null:queue.scanDate,proofOnly,applied:false,passed:true,imageId:image,proofs,archives,source,decisions};
fs.writeFileSync(dir+(proofOnly?'/dhi-proof.json':'/dhi-review.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({proofs:proofs.length,regularFiles:proofs.reduce((n,p)=>n+p.regularFiles,0),decisions:decisions.length,applied:false,proofOnly,imageId:image}));
