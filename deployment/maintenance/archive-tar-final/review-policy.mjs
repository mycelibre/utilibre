export const reviewFile='archive-tar-final-20261012/review.json';
export function eligible(i){return i?.status==='needs-review'&&i.id==='CVE-2026-9538'&&['host-os','runtime-image'].includes(i.scope)&&i.type==='debian'&&/^(?:perl|perl-modules-5\.(?:36|40))$/.test(i.package)&&/^(?:5\.36\.0-7\+deb12u4|5\.40\.1-6\+deb13u1|5\.40\.1-6\+dhi(?:\+deb13u1\+dhi2|7))$/.test(i.installed);}
