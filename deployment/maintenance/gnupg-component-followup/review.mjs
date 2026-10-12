import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import path from 'node:path';
import {eligible,prove,pins,version,sha} from './policy.mjs';
import {inventory,command} from '../component-followup/inventory.mjs';
import {payloadManifest} from '../vendor-leaves-final/dhi-proof.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/gnupg-component-followup-20261012';
const read=p=>JSON.parse(fs.readFileSync(p));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const index=fs.readFileSync(dir+'/packages/package-index.txt','utf8').split(/\n\s*\n/).map(t=>Object.fromEntries(t.split('\n').filter(l=>/^[\w-]+: /.test(l)).map(l=>[l.slice(0,l.indexOf(':')),l.slice(l.indexOf(':')+2)])));
const archives=new Map(),cache=new Map(),evidence=[],decisions=[],skipped=[];
function archive(p){
 if(archives.has(p))return archives.get(p);
 const filename=fs.readdirSync(dir+'/packages').find(f=>f.startsWith(p+'_'+version(p)+'_')&&f.endsWith('.deb'));assert(filename);
 const file=dir+'/packages/'+filename,hash=sha(fs.readFileSync(file));assert.equal(hash,pins[p]);
 assert(index.some(s=>s.Package===p&&s.Version===version(p)&&s.SHA256===hash));
 assert.equal(command('dpkg-deb',['-f',file,'Package']),p);assert.equal(command('dpkg-deb',['-f',file,'Version']),version(p));
 const tmp=fs.mkdtempSync('/tmp/utilibre-gnupg-payload-');
 try{command('dpkg-deb',['-x',file,tmp]);const manifest=payloadManifest(tmp);assert(!manifest.some(f=>/tpm2daemon|tpm2d/i.test(f.path)));archives.set(p,{hash,manifest});return archives.get(p);}
 finally{assert(path.dirname(tmp)==='/tmp'&&path.basename(tmp).startsWith('utilibre-gnupg-payload-'));fs.rmSync(tmp,{recursive:true});}
}
function absence(name){
 const packages=command('docker',['exec',name,'dpkg-query','-W','-f=${binary:Package}|${db:Status-Status}\n']);
 const tpmInstalled=packages.split('\n').some(l=>/^tpm2daemon(?::[^|]+)?\|installed$/.test(l));
 // Only executable/library installation trees: never read user documents or
 // enumerate user-account data. No links followed, no ignored find errors.
 const found=command('docker',['exec',name,'find','/usr','/opt','/bin','/sbin','/lib','-iname','*tpm2daemon*','-o','-iname','*tpm2d*']);
 return {tpmInstalled,tpmPaths:found?found.split('\n'):[],tpmSearchComplete:true};
}
for(const item of queue.items.filter(eligible)){
 const key=item.artifact+'|'+item.package;
 try{
  const name=item.containers[0];
  assert.equal(scan.images.find(i=>i.id===item.artifact)?.status,'checked');
  assert.equal(command('docker',['inspect','--format','{{.Image}}',name]),item.artifact);
  assert.equal(command('docker',['inspect','--format','{{.State.Running}}',name]),'true');
  if(!cache.has(key)){
   const signed=archive(item.package),inv=inventory(item.package,name);assert.equal(inv.installed,version(item.package));
   const actual=inv.records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
   assert.deepEqual(actual,signed.manifest,'Live package payload differs from authenticated archive (including missing docs)');
   const proof={image:item.artifact,container:name,package:item.package,actualVersion:inv.installed,archiveSha256:signed.hash,authenticatedIndex:true,payloadExact:true,fileCount:actual.length,inventorySha256:sha(JSON.stringify(inv.records)),...absence(name),records:inv.records};
   if(item.package==='gpgv'){
    const bytes=cp.execFileSync('docker',['exec',name,'cat','/var/lib/dpkg/status.d/gpgv'],{timeout:10000,maxBuffer:16384});
    const status=bytes.toString();assert.match(status,/^Package: gpgv$/m);assert.match(status,/^Source: gnupg2$/m);
    proof.residual={path:'/var/lib/dpkg/status.d/gpgv',version:status.match(/^Version: (.+)$/m)?.[1],sha256:sha(bytes)};
   }
   cache.set(key,proof);evidence.push(proof);
  }
  const p=cache.get(key);prove(item,p);
  assert.equal(command('docker',['inspect','--format','{{.Image}}',name]),item.artifact,'Deployment changed during inventory');
  const stale=item.installed===p.actualVersion?'':' Scanner '+item.installed+' is the verified residual status.d/gpgv fragment; actual payload is '+p.actualVersion+'.';
  decisions.push(validateDecision({key:item.key,status:'not-affected',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`CVE-2026-24882 affects PKDECRYPT in the separate tpm2daemon executable, not these GnuPG sibling programs/data. Actual ${item.package} ${p.actualVersion} fully matches authenticated Debian/DHI archive SHA256 ${p.archiveSha256}, including every regular file and symlink. tpm2daemon is not installed and a successful search of executable/library installation trees found no daemon. Exact current image ${p.image}; inventory SHA256 ${p.inventorySha256}.${stale} https://security-tracker.debian.org/tracker/CVE-2026-24882 ; https://github.com/gpg/gnupg/blob/gnupg-2.4.7/tpm2d/Makefile.am . Evidence: gnupg-component-followup-20261012/evidence.json. No binary was repaired or removed; raw findings retained. This does not cover another GnuPG CVE, an installed daemon, other versions or an unverified image.`}));
 }catch(e){skipped.push({key:item.key,container:item.containers[0],package:item.package,version:item.installed,error:String(e.message).slice(0,240)});}
}
assert.equal(read(root+'/security.json').completedAt,scan.completedAt,'Concurrent scan invalidates review');
for(const p of evidence)assert.equal(command('docker',['inspect','--format','{{.Image}}',p.container]),p.image,'Concurrent deployment invalidates review');
const date=new Date().toISOString();fs.writeFileSync(dir+'/evidence.json',JSON.stringify({date,scanDate:scan.completedAt,evidence},null,2)+'\n');
fs.writeFileSync(dir+'/review.json',JSON.stringify({date,scanDate:scan.completedAt,applied:false,decisions,skipped,evidenceSha256:sha(fs.readFileSync(dir+'/evidence.json'))},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,inventoryGroups:evidence.length,skipped,applied:false}));
