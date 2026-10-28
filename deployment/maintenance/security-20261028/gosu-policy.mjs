export const reviewFile='security-20261028/gosu/review.json';
export const binarySha256='8aab77d37a8468859988f0fc89ae4c3d4683322ec6d069d44f2b0d69c247d452';
export function eligible(i){
 return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='gobinary'&&i.package==='stdlib'&&i.installed==='v1.26.9'&&i.id==='CVE-2026-111943'&&i.target==='usr/local/bin/gosu'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact||'')&&Array.isArray(i.containers)&&i.containers.length>0;
}
export function prove(i,p){
 return eligible(i)&&p?.sha256===binarySha256&&p.module==='github.com/tianon/gosu'&&p.go==='go1.26.9'&&p.main===true&&p.functions>100&&p.x509===false&&Array.isArray(p.x509Functions)&&p.x509Functions.length===0;
}
