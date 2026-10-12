export const reviewFile='mount-acl-final-20261012/ubuntu-review.json';
export const containers=new Set(['utilibre-addy-db-1','public-utility-redlib-1']);
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='ubuntu'&&i.id==='CVE-2026-53613'&&['libmount1','mount'].includes(i.package)&&i.installed==='2.39.3-9ubuntu6.6+utilibre1'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&containers.has(i.containers[0]);}
