export const reviewFile='heif-bookworm-followup-20261012/review.json';
export const version='1.15.1-1+deb12u1+utilibre1';
export const fixed=['CVE-2025-68431','CVE-2026-32882'];
export const absent=['CVE-2026-32740','CVE-2026-32741','CVE-2026-41071','CVE-2026-47178','CVE-2026-84450','CVE-2026-84451'];
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.package==='libheif1'&&i.installed===version&&[...fixed,...absent].includes(i.id)&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-gathio-postgres-1';}
