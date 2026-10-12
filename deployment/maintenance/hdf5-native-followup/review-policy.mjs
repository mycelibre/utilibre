export const reviewFile='hdf5-native-followup-20261012/review.json';
export const version='1.10.8+repack1-1+utilibre1';
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&['libhdf5-103-1','libhdf5-hl-100'].includes(i.package)&&i.installed===version&&i.id==='CVE-2018-11205'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-gathio-postgres-1';}
