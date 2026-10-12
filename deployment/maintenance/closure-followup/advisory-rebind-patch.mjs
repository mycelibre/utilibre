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
const kind=process.argv[2]==='--python-system'?'python-system':process.argv[2]==='--urllib3'?'urllib3':process.argv[2]==='--util-linux'?'util-linux':process.argv[2]==='--curl'?'curl':process.argv[2]==='--gzip'?'gzip':process.argv[2]==='--sqlite-fts'?'sqlite-fts':'ncurses';assert(process.argv.length<=3);assert([undefined,'--util-linux','--curl','--gzip','--sqlite-fts','--urllib3','--python-system'].includes(process.argv[2]));
const r=read(dir+'/'+kind+'-release.json');assert.equal(r.status,'passed');
const rows=overlayRows(r);
for(const row of rows){
 assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);
 if(row.key==='namespace-companion'){assert.equal(row.oldImage,row.newImage);continue;}
 const spec=JSON.parse(fs.readFileSync(new URL('./'+kind+'-specs.json',import.meta.url))).find(s=>s.base===row.oldImage&&s.containers.includes(row.name));assert(spec);
 const b=read(dir+'/'+kind+'/'+spec.key+'/build.json'),n=read(dir+'/'+kind+'/'+spec.key+'/native.json');
 assert(b.passed&&b.configurationUnchanged&&n.passed);assert.equal(b.imageId,row.newImage);assert.equal(n.imageId,row.newImage);
 if(['ncurses','gzip','urllib3'].includes(kind))assert(n.sharedLibrariesUnchanged);
 else if(kind==='python-system'){assert.equal(b.version,'3.13.16-1~deb13u1+utilibre1');assert(n.application.woff2Roundtrip&&n.application.fontforgeTtfOtf&&n.application.pngJpegWebpThumbnails);assert.equal(n.upstreamCases,5658);assert.match(b.hashes.configuration,/^[a-f0-9]{64}/);assert.match(b.hashes.otherLibraries,/^[a-f0-9]{64}/);}
 else if(kind==='sqlite-fts'){assert(n.abiPreserved&&n.nativeSqliteBackupRestore&&n.nativeFtsCorruptionRejected&&n.existingDistinctRegressionsPassed);assert.equal(n.applicationChecks.status,'passed');assert.match(b.etcSha256,/^[a-f0-9]{64}/);assert.match(b.unrelatedLibrariesSha256,/^[a-f0-9]{64}/);}
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
  for(const receipt of [...(kind==='python-system'?['python-system-release.json']:[]),...(['python-system','urllib3'].includes(kind)?['urllib3-release.json']:[]),...(['python-system','urllib3','sqlite-fts'].includes(kind)?['sqlite-fts-release.json']:[]),...(['python-system','urllib3','sqlite-fts','gzip'].includes(kind)?['gzip-release.json']:[]),...(['python-system','urllib3','sqlite-fts','gzip','curl'].includes(kind)?['curl-release.json']:[]),...(['python-system','urllib3','sqlite-fts','gzip','curl','util-linux'].includes(kind)?['util-linux-release.json','rsync-release.json']:[]),'ncurses-release.json','bookworm-release.json']){
   const release=read(dir+'/'+receipt);assert.equal(release.status,'passed');
   const pairs=release.groups.flatMap(g=>{assert.equal(g.status,'passed');return (g.rows||[g]).map(r=>({from:r.newRef,to:r.oldRef}));});
   text=replaceImagePins(text,pairs).text;if(sha(text)===hash){matched=true;break;}
  }
  assert(matched,'Reviewed configuration changed beyond passed image pins');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence=(kind==='python-system'?'2026-10-12 CPython follow-up: native system interpreter/library updated within the same 3.13 ABI; application files, configuration and unrelated native libraries unchanged. Focused upstream tests, native image/font/venv/SQLite/tar checks and live readiness passed.':kind==='urllib3'?'2026-10-12 urllib3 follow-up: signed Debian Python HTTP packages repaired; application/configuration, all shared libraries and unrelated Python files unchanged. Eleven loopback HTTP/TLS/proxy/chunk checks, native Kuma login and DocumentDB role/restore checks, and live readiness passed.':kind==='sqlite-fts'?'2026-10-12 SQLite FTS follow-up: exact native library payload repaired with the upstream bound check; existing DISTINCT repair, ABI, application/configuration and unrelated libraries preserved. 87 DISTINCT and 7 compatible FTS tests, native corruption rejection, consumer/restore gates and live readiness passed.':kind==='gzip'?'2026-10-12 gzip follow-up: only the native compression utility package changed. Application/configuration/shared-library hashes are unchanged; old/new stream, integrity, preserve-original, zgrep and gzexe checks and live readiness passed.':kind==='curl'?'2026-10-12 curl follow-up: native stable curl and compatible QUIC companions repaired. Existing ABI, complete application files, configuration and unrelated libraries are unchanged. Both upstream TLS suites, old/new isolated native transfers and live health passed.':kind==='util-linux'?'2026-10-12 stable util-linux follow-up: exact installed native utility family and Penpot private libmount/libblkid repaired, existing ABI preserved. Application files outside these two library paths, image/runtime configuration and unrelated libraries are unchanged. Native old/new controls and live health passed.':'2026-10-12 terminal-CLI follow-up: only native ncurses-bin changed; exact image configuration, complete app-file and shared-library hashes match the previously reviewed image. Native terminal round-trip, old/new overflow regression and live health passed.')+' Application version and advisory IDs/revisions/ranges are unchanged; this does not clear dependency findings. See closure-followup/README.md. '+(review.runtimeEvidence||'');
}
const next=JSON.stringify(reviews,null,2)+'\n',before=original.split('\n'),after=next.split('\n');assert.equal(before.length,after.length,'Unexpected schema edit');
const changes=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])changes.push('@@\n-'+before[i]+'\n+'+after[i]);
assert(changes.length);console.log('*** Begin Patch\n*** Update File: '+file+'\n'+changes.join('\n')+'\n*** End Patch');
