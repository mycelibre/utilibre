// Additive advisory attribution only. Never changes the deployed package,
// original build/release/source receipts, or scanner/decision ledger.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,read,run,docker,target,version} from './common.mjs';
export function verifyTiffcropScope(image){
 const commit='b04e935cb6242f22cc8b63c99a372cf3ea825e4e',patch=root+'/sources/'+commit+'.patch';
 assert.equal(sha(fs.readFileSync(patch)),'6fbb1062494b45f66b694a3bb5c19d60ef3074c335cd66e8bdd0ab67cb8980ff');
 const archive=root+'/sources/tiff_4.7.2.orig.tar.bz2';assert.equal(sha(fs.readFileSync(archive)),'c5086d8f7c5ba51ca98241f24a8bd1cb66218c399077aeccbf6a236cf3152acc');
 const source=run('tar',['-xOf',archive,'libtiff-v4.7.2/tools/tiffcrop.c']);
 const built=run('tar',['-xOf',root+'/output/tiff-4.7.2-bookworm-source.tar.xz','source/tools/tiffcrop.c']);assert.equal(built,source);
 assert.equal(fs.readFileSync((fs.existsSync('/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/tiff-followup/source/tools/tiffcrop.c')?'/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/tiff-followup/source/tools/tiffcrop.c':'/var/lib/utilibre-maintenance/security-20261028/review-sources/tiff/source/tools/tiffcrop.c'),'utf8').trim(),source);
 const normalized=source.replace(/\s+/g,'');
 assert.equal((normalized.match(/if\(page->cols>\(MAX_SECTIONS\/page->rows\)\)/g)||[]).length,2);
 assert.equal((normalized.match(/if\(\(page->cols==0\)\|\|\(page->rows==0\)\)/g)||[]).length,2);
 for(const statement of ['uint64_ttotal_sections64=_TIFFMultiply64(NULL,page->cols,page->rows,"subdivisioncount");','page->total_sections=_TIFFCastUInt64ToUInt32(NULL,total_sections64,"subdivisioncount");','uint64_ttotal_sections64=_TIFFMultiply64(in,page->cols,page->rows,"subdivisioncount");','page->total_sections=_TIFFCastUInt64ToUInt32(in,total_sections64,"subdivisioncount");','k=page->total_sections;'])assert(normalized.includes(statement),statement);
 assert(!normalized.includes('k=page->cols*page->rows;'));
 const patchText=fs.readFileSync(patch,'utf8');assert(patchText.includes('diff --git a/tools/tiffcrop.c b/tools/tiffcrop.c'));assert(patchText.includes('+    k = page->total_sections;'));
 assert.equal(docker('exec',target,'dpkg-query','-W','-f=${Version}','libtiff6'),version);
 const packageFiles=docker('exec',target,'dpkg','-L','libtiff6').split('\n');assert(!packageFiles.some(p=>p.includes('tiffcrop')));
 const found=docker('exec',target,'find','/usr','/opt','/bin','/sbin','-type','f','-iname','*tiffcrop*','-print');assert.equal(found,'');
 assert.equal(docker('exec',target,'sh','-ec','if command -v tiffcrop; then exit 1; fi'),'');
 const native=read(root+'/native.json');assert(native.sourceSignatureVerified);assert.equal(docker('exec',target,'sha256sum',native.libraryPath).split(/\s/)[0],native.librarySha256);
 const result={schema:1,date:new Date().toISOString(),status:'passed',id:'CVE-2026-52490',verdict:'not-affected',image,target,package:'libtiff6',version,librarySha256:native.librarySha256,tiffcropNotInstalled:true,checkedPaths:['/usr','/opt','/bin','/sbin'],sourceSha256:sha(source),sourceMatchesPublishedCorrespondingSource:true,sourceAlreadyHasNonzeroDivisionBoundsAndChecked64BitCounts:true,upstreamCommit:commit,patchSha256:sha(fs.readFileSync(patch)),primary:'https://security-tracker.debian.org/tracker/CVE-2026-52490',upstreamIssue:'https://gitlab.com/libtiff/libtiff/-/work_items/846',limits:'This advisory is the tiffcrop command-line subdivision path, absent from the installed library-only package. Exact source checks corroborate that upstream 4.7.2 also includes its resolution. No exploit run or new runtime repair claimed; no source-wide exclusion.'};
 fs.writeFileSync(root+'/tiffcrop-52490-evidence.json',JSON.stringify(result,null,2)+'\n');return result;
}
