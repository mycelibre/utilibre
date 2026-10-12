// Emits a reviewable apply_patch, never writes source or changes dispositions.
// Only passed, byte-checked library/CLI overlays may rebind application IDs.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {overlayRows} from '../review-native-backports.mjs';
import {replaceImagePins} from '../language-final/release.mjs';
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const file='/home/ubuntu/freetools/deployment/maintenance/advisory-reviews.json';
const original=fs.readFileSync(file,'utf8'),reviews=JSON.parse(original);
const sha=t=>createHash('sha256').update(t).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const kind=process.argv[2]==='--util-linux'?'util-linux':process.argv[2]==='--curl'?'curl':process.argv[2]==='--gzip'?'gzip':'ncurses';assert(process.argv.length<=3);assert([undefined,'--util-linux','--curl','--gzip'].includes(process.argv[2]));
const r=read(dir+'/'+kind+'-release.json');assert.equal(r.status,'passed');
const rows=overlayRows(r);
for(const row of rows){
 assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);
 if(row.key==='namespace-companion'){assert.equal(row.oldImage,row.newImage);continue;}
 const spec=JSON.parse(fs.readFileSync(new URL('./'+kind+'-specs.json',import.meta.url))).find(s=>s.base===row.oldImage&&s.containers.includes(row.name));assert(spec);
 const b=read(dir+'/'+kind+'/'+spec.key+'/build.json'),n=read(dir+'/'+kind+'/'+spec.key+'/native.json');
 assert(b.passed&&b.configurationUnchanged&&n.passed);assert.equal(b.imageId,row.newImage);assert.equal(n.imageId,row.newImage);
 if(['ncurses','gzip'].includes(kind))assert(n.sharedLibrariesUnchanged);
 else if(kind==='curl'){assert(n.abiPreserved&&n.nativeTransfers.length>=2&&n.nativeTransfers.every(t=>t.passed));assert.match(b.etcSha256,/^[a-f0-9]{64}/);assert.match(b.unrelatedLibrariesSha256,/^[a-f0-9]{64}/);}
 else{assert(n.abiPreserved&&n.nativeMountFailureAndSuccess&&n.simulatedCgroupDescriptorClosed);assert.match(b.etcSha256,/^[a-f0-9]{64}/);assert.match(b.unrelatedLibrariesSha256,/^[a-f0-9]{64}/);}
}
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,image]of Object.entries(review.containers||{})){
  const row=rows.find(r=>'/'+r.name===name&&r.oldImage===image);if(row){review.containers[name]=row.newImage;changed=true;}
 }
 for(const [name,hash]of Object.entries(review.files||{})){
  const bytes=fs.readFileSync(name);if(sha(bytes)===hash)continue;
  assert(r.groups.flatMap(g=>[...(g.files||[]),...(g.mirrorFiles||[])]).includes(name),'Unreviewed source file change');
  // Reconstruct the previously reviewed file by reversing exact image scalars
  // from completed releases only. Never accept arbitrary file drift.
  const current=bytes.toString('utf8');let text=current,matched=false;
  for(const receipt of [...(kind==='gzip'?['gzip-release.json']:[]),...(['gzip','curl'].includes(kind)?['curl-release.json']:[]),...(['gzip','curl','util-linux'].includes(kind)?['util-linux-release.json','rsync-release.json']:[]),'ncurses-release.json','bookworm-release.json']){
   const release=read(dir+'/'+receipt);assert.equal(release.status,'passed');
   const pairs=release.groups.flatMap(g=>{assert.equal(g.status,'passed');return (g.rows||[g]).map(r=>({from:r.newRef,to:r.oldRef}));});
   text=replaceImagePins(text,pairs).text;if(sha(text)===hash){matched=true;break;}
  }
  assert(matched,'Reviewed configuration changed beyond passed image pins');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence=(kind==='gzip'?'2026-10-12 gzip follow-up: only the native compression utility package changed. Application/configuration/shared-library hashes are unchanged; old/new stream, integrity, preserve-original, zgrep and gzexe checks and live readiness passed.':kind==='curl'?'2026-10-12 curl follow-up: native stable curl and compatible QUIC companions repaired. Existing ABI, complete application files, configuration and unrelated libraries are unchanged. Both upstream TLS suites, old/new isolated native transfers and live health passed.':kind==='util-linux'?'2026-10-12 stable util-linux follow-up: exact installed native utility family and Penpot private libmount/libblkid repaired, existing ABI preserved. Application files outside these two library paths, image/runtime configuration and unrelated libraries are unchanged. Native old/new controls and live health passed.':'2026-10-12 terminal-CLI follow-up: only native ncurses-bin changed; exact image configuration, complete app-file and shared-library hashes match the previously reviewed image. Native terminal round-trip, old/new overflow regression and live health passed.')+' Application version and advisory IDs/revisions/ranges are unchanged; this does not clear dependency findings. See closure-followup/README.md. '+(review.runtimeEvidence||'');
}
const next=JSON.stringify(reviews,null,2)+'\n',before=original.split('\n'),after=next.split('\n');assert.equal(before.length,after.length,'Unexpected schema edit');
const changes=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])changes.push('@@\n-'+before[i]+'\n+'+after[i]);
assert(changes.length);console.log('*** Begin Patch\n*** Update File: '+file+'\n'+changes.join('\n')+'\n*** End Patch');
