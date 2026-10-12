export const reviewFile='penpot-native-followup-20261012/review.json';
export function eligible(i){
 return i.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&['utilibre-expanded-penpot-backend-1','utilibre-expanded-penpot-exporter-1'].includes(i.containers[0])&&(
  (['librsvg2-2','librsvg2-common'].includes(i.package)&&i.installed==='2.60.3+utilibre1'&&i.id==='CVE-2026-96889')||
  (i.package==='libtiff6'&&i.installed==='4.7.2-1~deb13u1+utilibre1'&&['CVE-2026-36849','CVE-2026-52490'].includes(i.id)));
}
