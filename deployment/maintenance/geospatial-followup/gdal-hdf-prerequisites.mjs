// Three complete upstream EHmetagroup prerequisite repairs. No custom parser.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/geospatial-followup-20261012';
const tree=root+'/gdal-tree', source=root+'/gdal-source';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fixes=[
  ['950cd2a08a24f66cb72695f798e44215326e917b','981ff948dd5bbcccdcac2d6868e9471ad1ef81751ee25a38415781e416958deb'],
  ['4cfbcf82856e6b1ff706c0ebe2ee62a5c428cae4','61491657d25ec2c82d9fbc5fddf7fc19e7b3bbaf6b772bfed88b024d6c0faf4f'],
  ['f1911cfcccac9e56a9050c5656d5a28a0053c967','2afaea7e208a53c79509cde2914ca0353bbcef029a1bf5d79a899c5c612d0a5b'],
];
const receipt=source+'/hdf-prerequisites.json';
assert(!fs.existsSync(receipt),'Never overwrite prerequisite evidence');
assert.equal(fs.readFileSync(tree+'/debian/changelog','utf8').split('\n')[0],'gdal (3.6.2+dfsg-1+utilibre1) bookworm; urgency=high');
const file='frmts/hdf4/hdf-eos/EHapi.c';
const before=sha(fs.readFileSync(tree+'/'+file)), rows=[];
for(const [commit,digest] of fixes){
  const response=await fetch(`https://github.com/OSGeo/gdal/commit/${commit}.patch`);
  assert(response.ok);const raw=Buffer.from(await response.arrayBuffer());
  assert.equal(sha(raw),digest);assert(raw.toString().startsWith('From '+commit+' '));
  const sections=raw.toString().split(/(?=^diff --git )/m).filter(s=>s.startsWith('diff --git a/'+file+' b/'+file+'\n'));
  assert.equal(sections.length,1);const patch=sections[0];
  const name='utilibre-hdf-prerequisite-'+commit.slice(0,8)+'.patch';
  assert(!fs.readFileSync(tree+'/debian/patches/series','utf8').includes(name));
  fs.writeFileSync(source+'/'+name+'.upstream',raw);
  fs.writeFileSync(tree+'/debian/patches/'+name,patch);
  const run=args=>cp.execFileSync('docker',['exec','maintenance-postgis-native-20261012',...args],{encoding:'utf8',timeout:30000});
  const dry=run(['patch','--dry-run','--batch','--fuzz=0','-p1','-d','/work/gdal-tree','-i','/work/gdal-tree/debian/patches/'+name]);
  assert(!/FAILED|fuzz|malformed/.test(dry));
  fs.appendFileSync(tree+'/debian/patches/series','\n'+name+'\n');
  run(['dpkg-source','--before-build','/work/gdal-tree']);
  rows.push({commit,sourceSha256:digest,patchSha256:sha(patch),file,adaptations:'None: complete upstream EHapi.c hunks, zero fuzz.'});
}
fs.writeFileSync(receipt,JSON.stringify({date:new Date().toISOString(),file,before,after:sha(fs.readFileSync(tree+'/'+file)),fixes:rows,reason:'The exact malformed swath fixture reached a pre-existing EHmetagroup null-pointer dereference before the SWnentries repair. Retain the upstream prerequisite guards, then rerun both entry points and all original native gates.'},null,2)+'\n');
console.log('Three upstream HDF metadata prerequisite repairs applied; no deployment.');
