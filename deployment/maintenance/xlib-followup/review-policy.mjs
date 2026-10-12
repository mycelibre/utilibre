export const reviewFile='xlib-followup-20261012/review.json';
const x11=['CVE-2026-88806','CVE-2026-94283','CVE-2026-94284','CVE-2026-94285'];
const versions={trixie:{x11:'2:1.8.12-1+utilibre1',render:'1:0.9.12-1+utilibre1'},bookworm:{x11:'2:1.8.4-2+deb12u2+utilibre1'},dhi:{x11:'2:1.8.12-1+dhi0+utilibre1',render:'1:0.9.12-1+dhi0+utilibre1',xtst:'2:1.2.5-1+dhi0+utilibre1'}};
export function eligible(i){
 if(i?.status!=='needs-review'||i.type!=='debian')return false;
 let suite;
 if(i.scope==='host-os'){if(i.artifact!=='host-dpkg'||i.containers?.length!==0)return false;suite='trixie';}
 else if(i.scope==='runtime-image'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1){
  suite={'utilibre-pack-forms-app-1':'trixie','utilibre-expanded-breezewiki-1':'trixie','utilibre-expanded-penpot-backend-1':'trixie','utilibre-expanded-penpot-exporter-1':'dhi','utilibre-gathio-postgres-1':'bookworm'}[i.containers[0]];
 }if(!suite)return false;
 const v=versions[suite];
 if(['libx11-6','libx11-data','libx11-xcb1'].includes(i.package))return i.installed===v.x11&&x11.includes(i.id)&&(i.package!=='libx11-xcb1'||i.scope==='host-os'||suite==='dhi');
 if(i.package==='libxrender1')return i.installed===v.render&&i.id==='CVE-2026-88807';
 return i.package==='libxtst6'&&suite==='dhi'&&i.installed===v.xtst&&i.id==='CVE-2026-94286';
}
