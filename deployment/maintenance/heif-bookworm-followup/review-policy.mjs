export const reviewFile='heif-bookworm-followup-20261012/review.json';
export const version='1.15.1-1+deb12u1+utilibre1';
export const fixed=['CVE-2025-68431','CVE-2026-32882'];
export const absent=['CVE-2026-32740','CVE-2026-32741','CVE-2026-41071','CVE-2026-47178','CVE-2026-84450','CVE-2026-84451'];
export const novemberAbsent=['CVE-2026-120208','CVE-2026-50142','CVE-2026-62289','CVE-2026-62292','CVE-2026-84444','CVE-2026-84446'];
export function novemberReason(id,text,symbols){
 const cases={
 'CVE-2026-120208':[['unci','unc_decoder'],'The mixed-interleave uncompressed-image codec introduced in >=1.18 is absent from this exact 1.15.1 source.'],
 'CVE-2026-50142':[['Box_stsz','Track::','SampleAuxInfoReader'],'The later HEIF sequence sample table/Track implementation is absent from this exact 1.15.1 source.'],
 'CVE-2026-62289':[['heif_image_handle_get_image_tiling'],'The image-tiling API and double-clap tile geometry implementation are absent from this exact 1.15.1 source and export set.'],
 'CVE-2026-62292':[['unci','unc_decoder','heif_image_handle_decode_image_tile'],'The uncompressed tile decoder and public decode-image-tile API are absent from this exact 1.15.1 source and export set.'],
 'CVE-2026-84444':[['unci','heif_context_add_image_tile'],'The uncompressed tile encoder and add-image-tile API are absent from this exact 1.15.1 source and export set.'],
 'CVE-2026-84446':[['Box_stsz','Track::','SampleAuxInfoReader'],'The later HEIF sequence track/timing implementation is absent from this exact 1.15.1 source.']};
 const c=cases[id];if(!c||typeof text!=='string'||text.length<10000||typeof symbols!=='string'||symbols.length<1000||c[0].some(s=>text.includes(s)||symbols.includes(s)))return null;
 return c[1]+' Component attribution only, not a blanket old-version exemption. https://security-tracker.debian.org/tracker/'+id;
}
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.package==='libheif1'&&i.installed===version&&[...fixed,...absent,...novemberAbsent].includes(i.id)&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-gathio-postgres-1';}
