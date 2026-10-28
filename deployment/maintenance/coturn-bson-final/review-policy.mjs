export const reviewFile='coturn-bson-final-20261012/review.json';
export const reserveReviewFile='security-20261028/bson/review.json';
export const expectedStatus='mitigated';
export const version='1.30.4-1+deb13u3+utilibre1';
export const roles=['utilibre-turn-option-turn-1','utilibre-galene-turn-turn-1'];
export function eligible(i){return i?.status==='needs-review'&&i.scope==='runtime-image'&&i.type==='debian'&&i.id==='CVE-2026-84964'&&['libbson-1.0-0t64','libmongoc-1.0-0t64'].includes(i.package)&&i.installed===version&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&Array.isArray(i.containers)&&i.containers.length>0&&i.containers.length<=2&&i.containers.every(n=>roles.includes(n))&&new Set(i.containers).size===i.containers.length;}
export function reserveEligible(i){return ['CVE-2026-84964','CVE-2026-106437'].includes(i?.id)&&eligible({...i,id:'CVE-2026-84964'});}
