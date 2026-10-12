// Rebind completed DHI source/native proof to exact live bytes after overlays.
// No new protocol probes, deployments or ledger writes.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {readIndexes,sha} from './authenticate-dhi.mjs';
import {container,version,packages,binary,nativeHash,sourcePins,fixes,eligible,nativeGate} from './dhi-policy.mjs';
import {inventory,command} from '../component-followup/inventory.mjs';
import {payloadManifest} from '../vendor-leaves-final/dhi-proof.mjs';
import {freshScan} from '../review-native-backports.mjs';
import {validateDecision} from '../triage.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance',dir=root+'/xserver-followup-20261012',dhi=dir+'/dhi';
const read=p=>JSON.parse(fs.readFileSync(p));
const scan=read(root+'/security.json'),queue=read(root+'/security-queue.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const image=command('docker',['inspect','--format','{{.Image}}',container]);assert.equal(command('docker',['inspect','--format','{{.State.Running}}',container]),'true');
assert.equal(scan.images.find(i=>i.id===image)?.status,'checked');
const indexes=readIndexes();const stanzas=text=>text.split(/\n\s*\n/);
const pkgIndex=stanzas(indexes[0].text),srcIndex=stanzas(indexes[1].text);
const native=read(dir+'/native-current-dhi.json');assert.equal(sha(fs.readFileSync(dir+'/native-current-dhi.json')),nativeHash);nativeGate(native);
const source=srcIndex.find(s=>s.startsWith('Package: xorg-server\n')&&s.includes('\nVersion: '+version+'\n'));assert(source);
for(const [file,digest]of Object.entries(sourcePins)){assert.equal(sha(fs.readFileSync(dhi+'/'+file)),digest);assert(source.includes(digest+' '+fs.statSync(dhi+'/'+file).size+' '+file));}
const temp=fs.mkdtempSync('/tmp/utilibre-xserver-dhi-proof-'),payloads=[];
try{
 const tree=temp+'/source';command('dpkg-source',['-x',dhi+'/xorg-server_21.1.16-1.3+deb13u4+dhi1.dsc',tree]);
 for(const [cve,fix]of Object.entries(fixes)){
  assert.equal(sha(fs.readFileSync(dir+'/'+cve+'.patch')),fix.sha256);
  cp.execFileSync('patch',['-p1','--batch','--fuzz=0','--reverse','--dry-run','-i',dir+'/'+cve+'.patch'],{cwd:tree,stdio:'pipe',timeout:15000});
 }
 for(const [pkg,pin]of Object.entries(packages)){
  const file=dhi+'/'+pkg+'_'+version.replace(':','%3a')+'_'+pin.architecture+'.deb';assert.equal(sha(fs.readFileSync(file)),pin.sha256);
  const stanza=pkgIndex.find(s=>s.startsWith('Package: '+pkg+'\n')&&s.includes('\nVersion: '+version+'\n'));assert(stanza?.includes('\nSHA256: '+pin.sha256+'\n'));
  assert.equal(command('dpkg-deb',['-f',file,'Package']),pkg);assert.equal(command('dpkg-deb',['-f',file,'Version']),version);
  const extract=temp+'/'+pkg;command('dpkg-deb',['-x',file,extract]);const expected=payloadManifest(extract),actual=inventory(pkg,container);assert.equal(actual.installed,version);
  const manifest=actual.records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
  assert.deepEqual(manifest,expected,'Every installed package payload must match the signed DHI archive');payloads.push({package:pkg,version,archiveSha256:pin.sha256,files:manifest});
 }
}finally{assert(path.dirname(temp)==='/tmp'&&path.basename(temp).startsWith('utilibre-xserver-dhi-proof-'));fs.rmSync(temp,{recursive:true});}
assert.equal(command('docker',['exec',container,'sha256sum','/usr/bin/Xvfb']).split(/\s+/)[0],binary);
const date=new Date().toISOString(),items=queue.items.filter(eligible);assert(items.every(i=>i.artifact===image),'Reviewer cannot cover another exact image');
const decisions=items.map(i=>validateDecision({key:i.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:`Penpot exporter only: installed ${i.package} ${version} and its companion package match every payload file/symlink of the authenticated DHI archives. Historical InRelease signature and full indexes reverified; fresh extracted corresponding source contains exact upstream ${fixes[i.id].commit} (zero-fuzz reverse dry-run). Xvfb SHA256 ${binary} is unchanged from the completed isolated native test: pixel roundtrip, rejected invalid XI2 modifier and rejected malformed XKB font without server crash. RandR providers are absent, so CVE-2026-93521 is supported by signed source/payload, NOT a reproduced provider mutation. Current image ${image}. https://security-tracker.debian.org/tracker/${i.id} ; https://gitlab.freedesktop.org/xorg/xserver/-/commit/${fixes[i.id].commit} . Evidence: xserver-followup-20261012/dhi-review-evidence.json. No production change or new native probe; no waiver for CVE-2023-5574, other CVEs, roles or versions.`}));
assert.equal(command('docker',['inspect','--format','{{.Image}}',container]),image,'Concurrent image deployment');
assert.equal(read(root+'/security.json').completedAt,scan.completedAt,'Concurrent scan');assert.equal(read(root+'/security-queue.json').scanDate,queue.scanDate);
const evidence={date,scanDate:scan.completedAt,image,container,version,status:'passed',payloads,sourcePins,fixes,nativeHash,nativeReusedWithoutNewProbe:true,authenticatedIndexes:indexes.map(({name,hash,bytes})=>({name,sha256:hash,bytes})),productionChanged:false};
fs.writeFileSync(dir+'/dhi-review-evidence.json',JSON.stringify(evidence,null,2)+'\n');
fs.writeFileSync(dir+'/dhi-review.json',JSON.stringify({date,scanDate:scan.completedAt,decisions,applied:false,evidenceSha256:sha(fs.readFileSync(dir+'/dhi-review-evidence.json'))},null,2)+'\n');
console.log(JSON.stringify({prepared:decisions.length,image,files:payloads.reduce((n,p)=>n+p.files.length,0),exactSourceFixes:3,productionChanged:false,applied:false}));
