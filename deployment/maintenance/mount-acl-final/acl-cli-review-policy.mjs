// A component-absence decision, not a fix for the legacy libacl API issue.
export const reviewFile='mount-acl-final-20261012/acl-cli-review.json';
export const groups=[
 ['utilibre-family-chess-app-1'],['utilibre-calendar-radicale-1'],
 ['utilibre-records-candlr-1'],['utilibre-expanded-actual-1'],
 ['utilibre-gathio-postgres-1'],['utilibre-beaverhabits-app-1'],
 ['utilibre-kitchenowl-app-1'],['utilibre-community-rallly-1'],
 ['utilibre-community-uptime-kuma-1'],['utilibre-13ft-app-1'],
 ['utilibre-pack-forms-app-1'],['utilibre-services-rsshub-1'],
 ['utilibre-wishlist-app-1'],['utilibre-priviblur-priviblur-1'],
 ['utilibre-expanded-breezewiki-1'],['utilibre-expanded-penpot-exporter-1'],
 ['utilibre-records-grist-1'],
 ['utilibre-wallabag-proxy-1','utilibre-unfurl-proxy-1','utilibre-trip-proxy-1','utilibre-13ft-proxy-1','utilibre-records-egress-1'],
 ['utilibre-expanded-penpot-backend-1'],['utilibre-expanded-penpot-frontend-1'],
 ['utilibre-expanded-resume-1'],['utilibre-services-freshrss-1'],
 ['utilibre-unfurl-app-1'],['utilibre-community-rssbridge-1'],
 ['utilibre-linkding-linkding-1'],['utilibre-identity-server-1','utilibre-identity-worker-1'],
 ['utilibre-pack-cryptpad-cryptpad-1'],['utilibre-turn-option-turn-1','utilibre-galene-turn-turn-1'],
 ['utilibre-trip-app-1'],
];
const signatures=new Set(groups.map(g=>[...g].sort().join('|')));
const versions=new Set(['2.3.1-3','2.3.2-2+b1','2.3.2-2+dhi1']);
export function eligible(i){
 if(i?.status!=='needs-review'||i.type!=='debian'||i.package!=='libacl1'||i.id!=='CVE-2026-54370'||!versions.has(i.installed)||!Array.isArray(i.containers))return false;
 if(i.scope==='host-os')return i.artifact==='host-dpkg'&&i.installed==='2.3.2-2+b1'&&i.containers.length===0;
 return i.scope==='runtime-image'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&signatures.has([...i.containers].sort().join('|'));
}
export function expectedStatus(i){if(!eligible({...i,status:'needs-review'}))throw Error('Not a scoped CLI-only ACL finding');return 'not-affected';}
