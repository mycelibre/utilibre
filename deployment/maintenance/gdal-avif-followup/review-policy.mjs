export const reviewFile='gdal-avif-followup-20261012/review.json';
export const version='3.6.2+dfsg-1+utilibre2';
export const fixed=['CVE-2026-49014','CVE-2026-8086','CVE-2026-8087'];
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.package==='libgdal32'&&i.installed===version&&fixed.includes(i.id)&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-gathio-postgres-1';}
