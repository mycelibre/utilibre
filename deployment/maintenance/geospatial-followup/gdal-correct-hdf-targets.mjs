// Correct only an undeployed candidate; retain rejected evidence. A fresh build
// uses gdal-patch.mjs, which already anchors every HDF hunk to its function.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {anchorHdfHunks} from './hdf-hunk-targets.mjs';
const root='/var/lib/utilibre-maintenance/geospatial-followup-20261012',tree=root+'/gdal-tree',source=root+'/gdal-source';
const sha=b=>createHash('sha256').update(b).digest('hex');
const run=args=>cp.execFileSync('docker',['exec','-w','/work/gdal-tree','maintenance-postgis-native-20261012',...args],{encoding:'utf8',timeout:30000});
assert(!fs.existsSync(root+'/gdal-release.json'),'Never modify a released source candidate');
assert(!fs.existsSync(source+'/hdf-target-correction.json'));
const checks=JSON.parse(fs.readFileSync(root+'/gdal-checks.json'));assert.equal(checks.status,'failed');
fs.copyFileSync(source+'/applied-provenance.json',source+'/applied-provenance-rejected-target.json',fs.constants.COPYFILE_EXCL);
const provenance=JSON.parse(fs.readFileSync(source+'/applied-provenance.json'));
run(['dpkg-source','--after-build','.']);
const rows=[];
for(const id of ['CVE-2026-8086','CVE-2026-8087']){
 const fix=provenance.fixes.find(f=>f.id===id);assert(fix);assert.equal(fix.paths.length,1);
 const patchPath=tree+'/debian/patches/'+id+'.patch',original=fs.readFileSync(patchPath,'utf8');
 assert.equal(sha(original),fix.appliedSha256);
 const code=fs.readFileSync(tree+'/'+fix.paths[0],'utf8'),adjusted=anchorHdfHunks(original,code);
 assert.equal(adjusted.replace(/^@@.*$/gm,''),original.replace(/^@@.*$/gm,''),'Only hunk positioning changes');
 fs.writeFileSync(patchPath,adjusted);fix.appliedSha256=sha(adjusted);
 const dry=run(['patch','--dry-run','--batch','--fuzz=0','-p1','-i','debian/patches/'+id+'.patch']);
 assert(!/FAILED|fuzz|malformed|offset/.test(dry),'Exact function offsets must apply');
 rows.push({id,file:fix.paths[0],before:sha(code),originalPatchSha256:sha(original),correctedPatchSha256:sha(adjusted),dry});
}
run(['dpkg-source','--before-build','.']);
for(const row of rows)row.after=sha(fs.readFileSync(tree+'/'+row.file));
const sw=fs.readFileSync(tree+'/frmts/hdf4/hdf-eos/SWapi.c','utf8');
const fn=sw.slice(sw.indexOf('\nSWinqfields('),sw.indexOf('\n}',sw.indexOf('\nSWinqfields(')));
assert(fn.includes('while (metaptrs[0])'));assert(!fn.includes('while (1)'));
provenance.adaptations+=' HDF hunk offsets corrected to uniquely matched named functions; all original hunk lines retained. Earlier false placement never deployed.';
fs.writeFileSync(source+'/applied-provenance.json',JSON.stringify(provenance,null,2)+'\n');
fs.writeFileSync(source+'/hdf-target-correction.json',JSON.stringify({date:new Date().toISOString(),rows,deployed:false,upstreamHunkContentsUnchanged:true},null,2)+'\n');
console.log('Candidate HDF patch placement corrected; rebuild and original native gates still required.');
