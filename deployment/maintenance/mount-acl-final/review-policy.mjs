export const reviewFile='mount-acl-final-20261012/review.json';
export const containers=new Set(['utilibre-expanded-actual-1','utilibre-gathio-postgres-1','utilibre-community-rallly-1','utilibre-community-uptime-kuma-1','utilibre-wishlist-app-1','utilibre-expanded-resume-1','utilibre-community-rssbridge-1','utilibre-pack-cryptpad-cryptpad-1']);
export function eligible(i){
 return i?.status==='needs-review'&&i.type==='debian'&&i.scope==='runtime-image'&&i.id==='CVE-2026-53613'&&['libmount1','mount'].includes(i.package)&&i.installed==='2.38.1-5+deb12u3+utilibre1'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&containers.has(i.containers[0]);
}
