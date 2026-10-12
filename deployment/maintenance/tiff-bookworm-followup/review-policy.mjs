export const reviewFile='tiff-bookworm-followup-20261012/review.json';
export const version='4.7.2-1~deb12u1+utilibre1';
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.package==='libtiff6'&&i.installed===version&&['CVE-2026-12912','CVE-2026-36849','CVE-2023-52355'].includes(i.id)&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-gathio-postgres-1';}
