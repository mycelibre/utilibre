export const reviewFile='openldap-followup-20261012/review.json';
export const version='2.5.13+dfsg-5+utilibre1';
const containers=new Set(['utilibre-community-uptime-kuma-1','utilibre-community-rallly-1','utilibre-community-rssbridge-1','utilibre-gathio-postgres-1']);
export function eligible(i){
 return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.package==='libldap-2.5-0'&&i.installed===version&&i.id==='CVE-2023-2953'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&Array.isArray(i.containers)&&i.containers.length>0&&new Set(i.containers).size===i.containers.length&&i.containers.every(c=>containers.has(c));
}
