export const reviewFile='sudo-followup-20261012/review.json';
export function eligible(i){
 if(i?.status!=='needs-review'||i.type!=='debian'||i.package!=='sudo'||i.id!=='CVE-2026-96512')return false;
 if(i.scope==='host-os')return i.installed==='1.9.16p2-3+deb13u2+utilibre1'&&i.containers?.length===0;
 return i.scope==='runtime-image'&&i.installed==='1.9.13p3-1+deb12u4+utilibre1'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-community-uptime-kuma-1';
}
