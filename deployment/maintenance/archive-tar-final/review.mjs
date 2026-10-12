// Proposals only. Default native module loading is mitigated, not all tar abuse.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {freshScan,overlayRows} from '../review-native-backports.mjs';import {additionalOverlayReceipts} from '../followup-overlays.mjs';import {validateDecision} from '../triage.mjs';import {eligible} from './review-policy.mjs';
process.umask(0o077);const base='/var/lib/utilibre-maintenance',root=base+'/archive-tar-final-20261012',read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const queue=read(base+'/security-queue.json'),scan=read(base+'/security.json');freshScan(queue,scan);assert.equal(scan.status,'checked');
const stage=read(root+'/stage.json'),release=read(root+'/release.json'),pkg=read(root+'/package.json'),host=read(root+'/host.json'),vendor=read(root+'/vendor.json');for(const r of [stage,release,host,vendor])assert.equal(r.status,'passed');assert.equal(release.stageSha256,sha(fs.readFileSync(root+'/stage.json')));
const run=(bin,args)=>cp.execFileSync(bin,args,{encoding:'utf8',timeout:15000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe']}).trim(),docker=(...args)=>run('docker',args);
const chain=additionalOverlayReceipts.filter(p=>fs.existsSync(base+'/'+p)).flatMap(p=>overlayRows(read(base+'/'+p))).sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt));
const verified=new Map();
for(const row of stage.rows){
 const receipt=release.groups.flatMap(g=>g.rows).find(r=>r.name===row.name);assert(receipt);assert.equal(receipt.newImage,row.image);assert(Date.parse(release.completedAt)<=Date.parse(scan.date));
 let image=row.image;for(const next of chain)if(next.name===row.name&&next.oldImage===image&&next.newImage!==image){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));image=next.newImage;}
 assert.equal(docker('inspect','--format','{{.Image}}',row.name),image);assert.equal(docker('exec',row.name,'perl','-MArchive::Tar','-e','print $Archive::Tar::VERSION,"|",$INC{"Archive/Tar.pm"}'),'3.14|/usr/share/perl5/Archive/Tar.pm');
 for(const m of pkg.modules)assert.equal(docker('exec',row.name,'sha256sum',m.path).split(/\s+/)[0],m.sha256);
 verified.set(image,{name:row.name,type:'vendor-path-3.14'});
}
assert(Date.parse(host.completedAt)<=Date.parse(scan.date));assert.equal(run('perl',['-MArchive::Tar','-e','print $Archive::Tar::VERSION,"|",$INC{"Archive/Tar.pm"}']),'3.14|/usr/share/perl5/Archive/Tar.pm');for(const m of pkg.modules)assert.equal(sha(fs.readFileSync(m.path)),m.sha256);verified.set('host-dpkg',{type:'vendor-path-3.14'});
let vendorImage=vendor.image;for(const next of chain)if(next.name===vendor.container&&next.oldImage===vendorImage&&next.newImage!==vendorImage){assert(Date.parse(next.completedAt)<=Date.parse(scan.date));vendorImage=next.newImage;}
assert.equal(docker('inspect','--format','{{.Image}}',vendor.container),vendorImage);assert.equal(docker('exec',vendor.container,'sha256sum',vendor.path).split(/\s+/)[0],vendor.sha256);assert(vendor.upstreamGuardEqual&&vendor.nativeCapAndNormalRoundtrips&&vendor.capBeforeAllocation);verified.set(vendorImage,{name:vendor.container,type:'existing-DHI-cap-backport'});
const decisions=[],proofs=[];for(const item of queue.items.filter(eligible)){
 const proof=verified.get(item.artifact);if(!proof)continue;if(item.scope==='runtime-image')assert.deepEqual(item.containers,[proof.name]);else assert.equal(item.artifact,'host-dpkg');
 const reason=proof.type==='existing-DHI-cap-backport'?'Existing DHI Archive::Tar 3.02_001 contains the exact upstream default 1 GiB MAX_FILE_SIZE guard before allocation; native bounded-cap and normal/Unicode/gzip/extraction tests passed. Exact live module hash and source guard rechecked. No image replacement or metadata alteration.':'Unmodified official CPAN Archive::Tar 3.14 installed as a native vendor-path module. Exact three module hashes, native load path, completed release ancestry, full upstream suite (1709 assertions) and old ptar read/write/extract verified. Core interpreter/package is unchanged; explicit use of the old core path is outside this mitigation.';
 decisions.push(validateDecision({key:item.key,status:'mitigated',expiresAt:new Date(Date.now()+7*86400000).toISOString(),reason:reason+' Addresses CVE-2026-9538 declared-size allocation only. Upstream issue47 recovery warnings/CPU remain, so this is not general resource-abuse immunity or an upload-size policy. No huge/exploit payload executed. https://security-tracker.debian.org/tracker/CVE-2026-9538 . Evidence: archive-tar-final-20261012; raw finding retained.'}));proofs.push({key:item.key,...proof});
}
fs.writeFileSync(root+'/review.json',JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,applied:false}));
