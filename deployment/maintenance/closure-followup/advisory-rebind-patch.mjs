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
const r=read(dir+'/ncurses-release.json');assert.equal(r.status,'passed');
const rows=overlayRows(r);
for(const row of rows){
 assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);
 const spec=JSON.parse(fs.readFileSync(new URL('./ncurses-specs.json',import.meta.url))).find(s=>s.base===row.oldImage&&s.containers.includes(row.name));assert(spec);
 const b=read(dir+'/ncurses/'+spec.key+'/build.json'),n=read(dir+'/ncurses/'+spec.key+'/native.json');
 assert(b.passed&&b.configurationUnchanged&&n.passed&&n.sharedLibrariesUnchanged);assert.equal(b.imageId,row.newImage);assert.equal(n.imageId,row.newImage);
}
for(const review of Object.values(reviews)){
 let changed=false;
 for(const [name,image]of Object.entries(review.containers||{})){
  const row=rows.find(r=>'/'+r.name===name&&r.oldImage===image);if(row){review.containers[name]=row.newImage;changed=true;}
 }
 for(const [name,hash]of Object.entries(review.files||{})){
  const bytes=fs.readFileSync(name);if(sha(bytes)===hash)continue;
  assert(['/home/ubuntu/freetools/deployment/community/compose.yaml','/home/ubuntu/freetools/deployment/expanded/compose.yaml'].includes(name),'Unreviewed source file change');
  // Reconstruct the previously reviewed file by reversing exact image scalars
  // from completed releases only. Never accept arbitrary file drift.
  const current=bytes.toString('utf8');let text=current,matched=false;
  for(const receipt of ['ncurses-release.json','bookworm-release.json']){
   const release=read(dir+'/'+receipt);assert.equal(release.status,'passed');
   const pairs=release.groups.flatMap(g=>{assert.equal(g.status,'passed');return (g.rows||[g]).map(r=>({from:r.newRef,to:r.oldRef}));});
   text=replaceImagePins(text,pairs).text;if(sha(text)===hash){matched=true;break;}
  }
  assert(matched,'Reviewed configuration changed beyond passed image pins');review.files[name]=sha(current);changed=true;
 }
 if(changed)review.runtimeEvidence='2026-10-12 terminal-CLI follow-up: only native ncurses-bin changed; exact image configuration, complete app-file and shared-library hashes match the previously reviewed image. Native terminal round-trip, old/new overflow regression and live health passed. Application version and advisory IDs/revisions/ranges are unchanged; this does not clear dependency findings. See closure-followup/README.md. '+(review.runtimeEvidence||'');
}
const next=JSON.stringify(reviews,null,2)+'\n',before=original.split('\n'),after=next.split('\n');assert.equal(before.length,after.length,'Unexpected schema edit');
const changes=[];for(let i=0;i<before.length;i++)if(before[i]!==after[i])changes.push('@@\n-'+before[i]+'\n+'+after[i]);
assert(changes.length);console.log('*** Begin Patch\n*** Update File: '+file+'\n'+changes.join('\n')+'\n*** End Patch');
