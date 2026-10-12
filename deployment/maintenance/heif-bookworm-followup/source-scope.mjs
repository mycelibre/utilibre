// Individual upstream component checks; never treats the source version as a waiver.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {root,sha,read} from './common.mjs';
import './verify-source.mjs';
const tree='/var/lib/utilibre-maintenance/sudo-followup-20261012/bookworm/work/heif-followup/source/libheif';
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):e.isFile()&&/\.(cc|h)$/.test(e.name)?[p+'/'+e.name]:[]);
const files=walk(tree).sort(),text=files.map(f=>fs.readFileSync(f,'utf8')).join('\n');assert(files.length>30);
const absent=['copy_image_to','MaskImageCodec','decode_mask_image','SampleAuxInfoReader','heif_image_handle_get_image_tiling','unc_decoder','get_compressed_image_data_uncompressed'];
for(const symbol of absent)assert(!text.includes(symbol),'Unexpected later component: '+symbol);
const context=fs.readFileSync(tree+'/heif_context.cc','utf8');
const grid=context.slice(context.indexOf('Error HeifContext::decode_full_grid_image('),context.indexOf('Error HeifContext::decode_full_grid_image(')+7000);
assert.match(grid,/heif_chroma tile_chroma = heif_chroma_444/);assert.match(grid,/img->create\(w, h,\s*heif_colorspace_RGB,\s*heif_chroma_444\)/);
const symbols=fs.readFileSync(root+'/output/new-symbols.txt','utf8');assert(!symbols.includes('heif_image_handle_get_image_tiling'));
const reasons={
 'CVE-2026-32740':'The upstream defect is copy_image_to grid chroma rounding for YCbCr 4:2:0. This authenticated 1.15.1 source has no copy_image_to; its decode_full_grid_image explicitly allocates RGB/4:4:4 intermediates. The affected later tile compositor is absent, not merely disabled by configuration. https://github.com/strukturag/libheif/security/advisories/GHSA-frfr-f3vg-2g6j',
 'CVE-2026-32741':'MaskImageCodec/decode_mask_image and the mski decoder implicated by the upstream advisory are absent from this authenticated old source. No newly introduced mask codec is linked into this native package. https://github.com/strukturag/libheif/security/advisories/GHSA-j3w5-7whq-p37q',
 'CVE-2026-41071':'SampleAuxInfoReader and the later sequence track implementation are absent. Debian records the vulnerable feature as introduced in 1.20.0, not this 1.15.1 baseline. https://security-tracker.debian.org/tracker/CVE-2026-41071',
 'CVE-2026-47178':'Upstream reports the unci tile decoder in releases >=1.19.0; this 1.15.1 source does not contain unci/unc_decoder implementation. https://github.com/strukturag/libheif/security/advisories/GHSA-5x55-x5pf-9c6g',
 'CVE-2026-84450':'Upstream bounds the oversized-ispe image-tiling API defect to >=1.19.0; heif_image_handle_get_image_tiling is absent from both this 1.15.1 source and exact binary export inventory. Existing Fraction arithmetic is not being broadly declared safe. https://github.com/strukturag/libheif/security/advisories/GHSA-gh5q-69gg-c964',
 'CVE-2026-84451':'Upstream identifies the >=1.19 uncompressed tile API and unc_decoder::get_compressed_image_data_uncompressed. Neither implementation nor the image-tiling API is present in this 1.15.1 package. https://github.com/strukturag/libheif/security/advisories/GHSA-hh47-fhqr-cj2r'
};
assert(!/\bmski\b|\bunci\b/.test(text));
const native=read(root+'/native.json');assert.equal(native.status,'passed');
const record={date:new Date().toISOString(),status:'passed',sourceFiles:files.map(f=>({path:f.slice(tree.length+1),sha256:sha(fs.readFileSync(f))})),absent,reasons,nativeSha256:sha(fs.readFileSync(root+'/native.json')),librarySha256:native.librarySha256,sourceInspectionOnly:true,exploitsRun:false};
assert(!fs.existsSync(root+'/source-scope.json'));fs.writeFileSync(root+'/source-scope.json',JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:'passed',individualSourceComponents:Object.keys(reasons).length,librarySha256:native.librarySha256}));
