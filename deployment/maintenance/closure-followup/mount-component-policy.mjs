// Exact owner/idmap-hook and subdir attribution, never the older target race.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {overlayRows} from '../review-native-backports.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
export const repairedVersion='2.38.1-5+deb12u3+utilibre1';
export const repairedPackages={libmount1:'e99bea05583417a47f455a12f3bcc37f7a63ab9773ad735fd6620495e02bf834',mount:'71ccc4e3b4e1b7308c89b07fb6804ec0c323e9180c0fe76319dc67ad429481d6'};
export const repairedRoles={actual:'utilibre-expanded-actual-1',gathio:'utilibre-gathio-postgres-1',rallly:'utilibre-community-rallly-1',kuma:'utilibre-community-uptime-kuma-1',wishlist:'utilibre-wishlist-app-1',resume:'utilibre-expanded-resume-1',rssbridge:'utilibre-community-rssbridge-1',cryptpad:'utilibre-pack-cryptpad-cryptpad-1'};
export function repairedBookwormComponentCase(i){
 return i?.type==='debian'&&i.scope==='runtime-image'&&i.installed===repairedVersion&&Object.hasOwn(repairedPackages,i.package)&&
  ['CVE-2026-76642','CVE-2026-78410','CVE-2026-78409'].includes(i.id)&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&
  Array.isArray(i.containers)&&i.containers.length===1&&Object.values(repairedRoles).includes(i.containers[0]);
}
export function bookwormHookCase(item) {
 return item.type==='debian'&&item.scope==='runtime-image'&&
  (item.installed==='2.38.1-5+deb12u3'||repairedBookwormComponentCase(item))&&['libmount1','mount'].includes(item.package)&&
  ['CVE-2026-76642','CVE-2026-78410'].includes(item.id);
}
export function legacyAbsence(files){
 assert(!Object.hasOwn(files,'hook_owner.c')&&!Object.hasOwn(files,'hook_idmap.c'));
 const all=Object.values(files).join('\n');
 assert(!/X-mount\.(?:owner|group|mode|idmap)|MNT_STAGE_MOUNT_POST|mnt_context_call_hooks|api->subdir/.test(all));
 assert(files['context_mount.c'].includes('mnt_context_get_helper_status(cxt) == 0'));
 assert(!files['context_mount.c'].includes('open_tree'));
 return true;
}
const sha=b=>createHash('sha256').update(b).digest('hex');
const root='/var/lib/utilibre-maintenance/mount-acl-final-20261012';
const work='/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/mount-acl-final';
const sourceSha='4d25fc4768bcfd418ae87e3bc64cd3389e7137a79dda6535665f2a5abbaf7480';
const librarySha='79a898619cf9e100a80a30c75cb61ab30ca925809ae2b16aea2f87e09be084e0';
const read=p=>JSON.parse(fs.readFileSync(p)),fileSha=p=>sha(fs.readFileSync(p));
export function validateRepairedRelease(i,scan,p){
 assert(repairedBookwormComponentCase(i),'Outside exact repaired component scope');
 const {stage:s,release:r,native:n,consumer:c,application:a,source:o,upstreamException:e,hashes:h}=p;
 assert.equal(r.status,'passed');assert.equal(s.status,'passed');assert.equal(n.status,'passed');
 assert.equal(s.name,i.containers[0]);assert.equal(repairedRoles[s.key],s.name);assert.equal(r.key,s.key);assert.equal(s.image,i.artifact);assert.equal(s.version,repairedVersion);
 assert.equal(n.version,repairedVersion);assert.equal(n.librarySha256,librarySha);assert.equal(n.exports,312);
 assert(n.exactExportsPreserved&&n.sonameAndNeededPreserved&&n.bookwormLibcCompatible);
 assert.equal(n.checks.length,12);assert(n.checks.every(x=>x.passed));
 assert(s.configurationUnchanged&&s.unrelatedPackagesUnchanged&&s.priorRuntimeBytesUnchanged);
 assert(a.passed&&c.passed);assert.equal(a.imageId,s.image);assert.equal(c.imageId,s.image);assert.equal(c.cases.length,6);assert.equal(c.network,'none');assert.equal(c.user,65534);assert.equal(c.kernelMounts,false);
 assert.equal(s.nativeSha256,h.native);assert.equal(c.nativeSha256,h.native);
 assert(e.baselineAndCandidateSameFailure&&e.candidateFailures===1);
 assert(o.published);assert.equal(o.sha256,sourceSha);
 for(const label of ['stage','native','consumer','application','source','upstreamException'])assert.equal(r.proofs[label],h[label],`Changed ${label} evidence`);
 assert.equal(r.groups.length,1);const g=r.groups[0];assert.equal(g.status,'passed');assert.equal(g.rows.length,1);const row=g.rows[0];
 assert(row.status===undefined||row.status==='passed');assert.equal(row.name,s.name);assert.equal(row.oldImage,s.base);assert.equal(row.newImage,s.image);assert.equal(row.oldRef,s.baseRef);assert.equal(row.newRef,s.candidate);
 const completed=Date.parse(r.completedAt);assert(Number.isFinite(completed)&&completed<=Date.parse(scan.date),'Scan must follow completed repair');assert.equal(g.completedAt,r.completedAt);
 assert.equal(n.packages.length,2);assert.equal(s.packages.length,2);
 for(const [pkg,hash]of Object.entries(repairedPackages)){const name=pkg+'_'+repairedVersion+'_amd64.deb';assert.equal(n.packages.find(p=>p.name===name)?.sha256,hash);assert.equal(s.packages.find(p=>p.name===name)?.sha256,hash);}
 return true;
}
let sourceProof;
export function validateOverlayChain(initial,expected,name,rows,scanDate){
 let image=initial;
 for(const r of [...rows].sort((a,b)=>Date.parse(a.completedAt)-Date.parse(b.completedAt))){
  if(r.name!==name||r.oldImage!==image||r.oldImage===r.newImage)continue;
  assert(Number.isFinite(Date.parse(r.completedAt))&&Date.parse(r.completedAt)<=Date.parse(scanDate),'Overlay must precede scan');
  assert(/^sha256:[a-f0-9]{64}$/.test(r.newImage));image=r.newImage;
 }
 assert.equal(image,expected,'Unproven repair-to-current-image ancestry');return true;
}
export function verifyRepairedSource(){
 if(sourceProof)return sourceProof;
 const offer=read(root+'/source-offer.json');assert(offer.published);assert.equal(offer.sha256,sourceSha);assert.equal(fileSha(offer.archive),sourceSha);
 const pins={'context.c':'390463047eb65c5500b2cc77d46d17c5c027a36051c842f840c5f6f5418a501e','context_mount.c':'b1e1c51705f3089cc82c7730add3c3bb391d93988b891de236a6e9f700412a46'};
 const reviewSource=fs.existsSync(work+'/source/libmount/src')?work+'/source':'/var/lib/utilibre-maintenance/security-20261028/review-sources/mount/source';
 const source=reviewSource+'/libmount/src',files=Object.fromEntries(fs.readdirSync(source).filter(f=>/\.(?:c|h)$/.test(f)).map(f=>[f,fs.readFileSync(source+'/'+f,'utf8')]));
 for(const[p,h]of Object.entries(pins))assert.equal(sha(files[p]),h);
 legacyAbsence(files);
 const patch=reviewSource+'/debian/patches/utilibre-legacy-target-pinning.patch';assert.equal(fileSha(patch),'45d2b7ba1de8747b07b1d8c1926db572e4a2baf9a76c9a3d01551c86695baed5');
 cp.execFileSync('patch',['-p1','--fuzz=0','--batch','--reverse','--force','--dry-run','-i',patch],{cwd:reviewSource,stdio:'pipe',timeout:15000});
 const native=read(root+'/native.json');assert.equal(fileSha(root+'/output/upstream-build.log'),native.upstreamBuildLogSha256);
 sourceProof={source,pins,sourceArchiveSha256:sourceSha,patchSha256:fileSha(patch),forcedReverseZeroFuzz:true,absentHooksAndSubdir:true,files:Object.fromEntries(Object.entries(files).map(([f,b])=>[f,sha(b)]))};return sourceProof;
}
export function repairedBookwormEvidence(i,scan){
 assert(repairedBookwormComponentCase(i));
 const key=Object.entries(repairedRoles).find(([,n])=>n===i.containers[0])[0],dir=root+'/images/'+key;
 const paths={stage:dir+'/stage.json',release:dir+'/release.json',native:root+'/native.json',consumer:dir+'/consumer.json',application:dir+'/application.json',source:root+'/source-offer.json',upstreamException:root+'/upstream-exception.json'};
 const proof=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,read(p)]));proof.hashes=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,fileSha(p)]));
 validateRepairedRelease({...i,artifact:proof.stage.image},scan,proof);
 const parent='/var/lib/utilibre-maintenance';
 const rows=additionalOverlayReceipts.filter(p=>fs.existsSync(parent+'/'+p)).flatMap(p=>overlayRows(read(parent+'/'+p)));
 validateOverlayChain(proof.stage.image,i.artifact,i.containers[0],rows,scan.date);
 const run=args=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:15000,stdio:['ignore','pipe','pipe']}).trim();
 assert.equal(run(['inspect',i.containers[0],'--format','{{.Image}}']),i.artifact);
 assert.equal(run(['exec',i.containers[0],'sha256sum',proof.native.libraryPath]).split(/\s+/)[0],proof.native.librarySha256);
 const source=verifyRepairedSource();
 for(const[pkg,h]of Object.entries(repairedPackages))assert.equal(fileSha(root+'/output/'+pkg+'_'+repairedVersion+'_amd64.deb'),h);
 return {root,version:repairedVersion,artifact:i.artifact,container:i.containers[0],source,receiptHashes:proof.hashes,libraryPath:proof.native.libraryPath,librarySha256:proof.native.librarySha256};
}
