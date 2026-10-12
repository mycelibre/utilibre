#!/usr/bin/env node
// Exact repair decisions only after fresh scanning and completed releases.
// Produces a private review proposal; never writes the decision ledger.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
import {validateDecision} from '../triage.mjs';
import {eligible,version} from './review-policy.mjs';
process.umask(0o077);assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance',dir=root+'/openldap-followup-20261012',here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(c,a)=>cp.execFileSync(c,a,{encoding:'utf8',timeout:60000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const s=read(here+'spec.json'),provenance=read(dir+'/out/provenance.json');
assert.equal(provenance.version,version);assert.equal(provenance.tests.filter(t=>t.status==='passed').length,76);assert.equal(provenance.tests.filter(t=>t.status==='skipped').length,9);assert.equal(provenance.debianDisabledTests.length,2);
assert.equal(sha(dir+'/build.log'),provenance.buildLogSha256);assert.equal(sha(dir+'/source-build.log'),provenance.sourceLogSha256);
const deb=dir+'/out/libldap-2.5-0_'+version+'_amd64.deb';assert.equal(sha(deb),'e7ec19de9c188b02782cdb3498ce490503e032cff9f5670d1098570dc3d0ca26');
assert.equal(sha(dir+'/out/openldap_'+version+'.debian.tar.xz'),'1239c4951933f84909a0e8bd3af4e55f8720f6c51b34fd42b9b0ac07d3c0faf9');
for(const [name,hash]of Object.entries(s.sourceFiles))assert.equal(sha(dir+'/source/'+name),hash);
for(const [commit,hash]of Object.entries(s.patches)){
 assert.equal(sha(dir+'/source/'+commit+'.patch'),hash);
 const patch=cp.execFileSync('tar',['-xOf',dir+'/out/openldap_'+version+'.debian.tar.xz','debian/patches/utilibre-'+commit+'.patch']);
 assert.equal(createHash('sha256').update(patch).digest('hex'),hash,'Patch bytes differ from reviewed upstream 2.5 fix');
}
const offer=read(dir+'/source-offer.json');assert(offer.published);assert.equal(sha(offer.file),offer.sha256);
const release=read(dir+'/release.json');assert.equal(release.status,'passed');assert.equal(release.groups.length,4);
const baseRows=overlayRows(release),chain=additionalOverlayReceipts.filter(p=>fs.existsSync(root+'/'+p)).flatMap(p=>overlayRows(read(root+'/'+p))).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
const bases=read(here+'bases.json'),verified=new Map();
for(const spec of bases){
 const out=dir+'/images/'+spec.key,b=read(out+'/build.json'),a=read(out+'/application.json'),row=baseRows.find(r=>r.name===spec.container),g=release.groups.find(g=>g.rows.some(r=>r.name===spec.container));
 assert(row&&g&&g.status==='passed');assert.equal(row.oldImage,spec.base);assert.equal(row.newImage,b.imageId);assert.equal(a.imageId,b.imageId);assert(b.passed&&b.nativePassedOldAndNew&&a.passed&&a.fictionalDataOnly);
 for(const [file,hash]of Object.entries(g.proofs))assert.equal(sha(file),hash,'Release proof changed');
 for(const lib of ['libldap','liblber']){assert.deepEqual(b.oldAbi[lib].symbols,b.newAbi[lib].symbols);assert.deepEqual(b.oldAbi[lib].dependencies,b.newAbi[lib].dependencies);assert.equal(b.oldAbi[lib].soname,b.newAbi[lib].soname);}
 let image=row.newImage,released=Date.parse(row.completedAt);assert(released<=Date.parse(scan.date));
 for(const next of chain)if(next.name===spec.container&&next.oldImage===image&&next.oldImage!==next.newImage){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));image=next.newImage;released=Date.parse(next.completedAt);}
 assert.equal(run('docker',['inspect',spec.container,'--format','{{.Image}}']),image);
 assert.equal(run('docker',['exec',spec.container,'dpkg-query','-W','-f=${Version}','libldap-2.5-0']),version);
 for(const lib of ['libldap','liblber'])assert.equal(run('docker',['exec',spec.container,'sha256sum','/usr/lib/x86_64-linux-gnu/'+lib+'-2.5.so.0.1.8']).split(/\s/)[0],b.newAbi[lib].sha256);
 verified.set(spec.container,{image,released});
}
const decisions=[],proofs=[],skipped=[];
for(const item of queue.items.filter(eligible)){
 try{
  for(const name of item.containers){assert(verified.has(name));assert.equal(verified.get(name).image,item.artifact,'Scanner artifact does not match exact live bytes');}
  decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:'Native libldap-2.5-0 '+version+' contains both exact upstream OpenLDAP 2.5 CVE-2023-2953 fixes 752d320cf96e46f24c0900f1a8f6af0a3fc3c4ce and 6563fab9e2feccb0a684d0398e78571d09fb808b, applied with zero fuzz to authenticated Debian source, preserving its patch stack. Package SHA256 e7ec19de9c188b02782cdb3498ce490503e032cff9f5670d1098570dc3d0ca26; both live library hashes, unchanged ABI/dependencies, source/package proof and completed exact-role release ancestry rechecked. Native compatibility and application checks passed; upstream suite:76 passed,9 skipped/disabled,2 Debian-disabled. No exploit was run and no unrelated LDAP CVE is waived. https://security-tracker.debian.org/tracker/CVE-2023-2953 . Evidence: openldap-followup-20261012/review.json; raw findings retained.'}));
  proofs.push({key:item.key,image:item.artifact,containers:item.containers,packageSha256:'e7ec19de9c188b02782cdb3498ce490503e032cff9f5670d1098570dc3d0ca26',sourceSha256:offer.sha256});
 }catch(e){skipped.push({key:item.key,reason:e.message.slice(0,180)});}
}
fs.writeFileSync(dir+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false,cves:['CVE-2023-2953']}));
