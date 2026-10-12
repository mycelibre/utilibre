// Audit the exact existing Debian patch series before accepting the native
// upstream rebuild. No patch is silently discarded based on version alone.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {root} from './verify-source.mjs';
const old=root+'/inspect/source',source='/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/tiff-followup/source';
const sha=b=>createHash('sha256').update(b).digest('hex'),norm=t=>t.replace(/\s+/g,'');
const checks={
 'add-a-tif_config.h-include.patch':[['libtiff/tif_hash_set.c','#include "tif_config.h"']],
 'TIFFWriteDirectorySec_avoid_harmless_unsigned-integer-overflow.patch':[['libtiff/tif_dirwrite.c','if (tif->tif_curdircount != TIFF_NON_EXISTENT_DIR_NUMBER)'],['libtiff/tif_dirwrite.c','tif->tif_curdir = tif->tif_curdircount;']],
 'TIFFSetDirectory_avoid_harmless_unsigned-integer-overflow.patch':[['libtiff/tif_dir.c','if (tif->tif_curdir == 0) tif->tif_curdir = TIFF_NON_EXISTENT_DIR_NUMBER; else tif->tif_curdir--;']],
 'TIFFClose_avoid_NULL_pointer_dereferencing.patch':[['libtiff/tif_close.c','void TIFFClose(TIFF *tif) { if (tif != NULL) { TIFFCloseProc closeproc = tif->tif_closeproc;']],
 'CVE-2023-2731.patch':[['libtiff/tif_lzw.c','if (sp->read_error)'],['libtiff/tif_lzw.c','"LZWDecode: Scanline %" PRIu32 " cannot be read due to "'],['libtiff/tif_lzw.c','no_eoi: memset(op, 0, (size_t)occ); sp->read_error = 1;']],
 'CVE-2023-26966.patch':[['libtiff/tif_luv.c','if (isnan(u) || isnan(v)) { u = U_NEU; v = V_NEU; }']],
 'CVE-2023-2908.patch':[['libtiff/tif_dir.c','if (slen > 0) { const char *ep = s + slen; const char *cp = s;']],
 'CVE-2023-52356.patch':[['libtiff/tif_getimage.c','if (row >= img.height)'],['libtiff/tif_getimage.c','Invalid row passed to TIFFReadRGBAStrip().'],['libtiff/tif_getimage.c','if (col >= img.width || row >= img.height)'],['libtiff/tif_getimage.c','Invalid row/col passed to TIFFReadRGBATile().']],
 'CVE-2024-7006.patch':[['libtiff/tif_dirinfo.c','fld == NULL || !_TIFFMergeFields(tif, fld, 1)'],['libtiff/tif_dirread.c','fld == NULL || !_TIFFMergeFields(tif, fld, 1)']],
 'CVE-2025-9900.patch':[['libtiff/tif_getimage.c','ok = TIFFRGBAImageGet(&img, raster, rwidth, rheight);'],['libtiff/tif_getimage.c','if (h > hx)'],['libtiff/tif_getimage.c','raster += (size_t)(h - hx) * w; h = hx;']],
 'CVE-2026-4775.patch':[['libtiff/tif_getimage.c','const tmsize_t incr = 3 * (tmsize_t)w + 4 * (tmsize_t)toskew;'],['libtiff/tif_getimage.c','const tmsize_t incr = 2 * (tmsize_t)toskew + (tmsize_t)w;']]
};
const notes={
 'TIFFWriteDirectorySec_avoid_harmless_unsigned-integer-overflow.patch':'Superseded safely by native directory-count assignment, instead of incrementing the nonexistent-directory sentinel. Existing multi-directory upstream tests are required.',
 'CVE-2023-26966.patch':'Upstream uses isnan rather than self-inequality; neutral chromaticity assignments retained.',
 'CVE-2025-9900.patch':'Native row-offset-aware height checks supersede the original whole-image check; direct raster pointer retained. Width validation moved to the individual get functions.',
 'CVE-2026-4775.patch':'All four affected tile paths retain widened tmsize_t arithmetic (three identical 2*toskew+w occurrences).'
};
const files=new Map(),get=f=>{if(!files.has(f))files.set(f,fs.readFileSync(source+'/'+f,'utf8'));return files.get(f);};
const series=fs.readFileSync(old+'/debian/patches/series','utf8').trim().split('\n');assert.equal(series.length,22);
const rows=series.map(name=>{
 const patch=fs.readFileSync(old+'/debian/patches/'+name,'utf8');
 const paths=[...new Set([...patch.matchAll(/^\+\+\+ [^/]+\/([^\s]+)/gm)].map(m=>m[1]))];assert(paths.length);
 const library=paths.filter(p=>p.startsWith('libtiff/'));
 if(library.length){assert(checks[name],name+' needs a library review');for(const [file,needle]of checks[name])assert(norm(get(file)).includes(norm(needle)),name+' missing reviewed fix in '+file);}
 else assert(paths.every(p=>/^(tools|doc)\//.test(p)),name+' unexpected patch scope');
 return{name,sha256:sha(patch),paths,upstreamCommit:patch.match(/^From ([a-f0-9]{40}) /m)?.[1]||null,decision:library.length?'Library fix retained in upstream source':'Only command-line tools/documentation; neither deployed by the library-only overlay',note:notes[name]||null};
});
assert.equal((get('libtiff/tif_dirread.c').match(/fld == NULL \|\| !_TIFFMergeFields\(tif, fld, 1\)/g)||[]).length,2);
assert.equal((get('libtiff/tif_getimage.c').match(/const tmsize_t incr = 2 \* \(tmsize_t\)toskew \+ \(tmsize_t\)w;/g)||[]).length,3);
assert(!get('libtiff/tif_dirwrite.c').includes('tif->tif_curdir++;'));
const fixed=[['libtiff/tif_pixarlog.c','if (occ % required)'],['libtiff/tif_pixarlog.c','max_rows = occ / required; max_nsamples = max_rows * llen;'],['libtiff/tif_pixarlog.c','if (nsamples > max_nsamples)'],['libtiff/tif_pixarlog.c','op += (unsigned long)td->td_imagewidth * 4;'],['libtiff/tif_read.c','const uint64_t maxCompressionRatio = TIFFGetMaxCompressionRatio(tif);'],['libtiff/tif_compress.c','uint64_t TIFFGetMaxCompressionRatio(TIFF *tif)']];
for(const [f,s]of fixed)assert(norm(get(f)).includes(norm(s)),f+' missing fixed-release behavior');
assert.equal((norm(get('libtiff/tif_read.c')).match(/constuint64_tmaxCompressionRatio=TIFFGetMaxCompressionRatio\(tif\);/g)||[]).length,4);
const result={schema:1,date:new Date().toISOString(),status:'passed',oldVersion:'4.5.0-6+deb12u4',newVersion:'4.7.2-1~deb12u1+utilibre1',rows,sourceFiles:[...files].map(([path,text])=>({path,sha256:sha(text)})),targetedFixes:['CVE-2026-12912','CVE-2026-36849'],excludedFromCodeFixClaim:['CVE-2023-52355'],limits:'Manual source review plus exact source assertions. Requires full upstream tests, preserved exports/dependencies, normal old-header codec checks and real GDAL/PostGIS consumers before release.'};
fs.writeFileSync(root+'/vendor-audit.json',JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({status:'passed',vendorPatches:rows.length,libraryPatches:rows.filter(r=>r.paths.some(p=>p.startsWith('libtiff/'))).length,sourceFiles:result.sourceFiles.length}));
