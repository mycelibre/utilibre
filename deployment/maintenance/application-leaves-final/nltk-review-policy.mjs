export const reviewFile='application-leaves-final-20261012/nltk/review.json';
export function eligible(i){return i?.status==='needs-review'&&i.type==='python-pkg'&&i.scope==='runtime-image'&&i.package==='nltk'&&i.installed==='3.10.3'&&i.id==='CVE-2026-81726'&&/^sha256:[a-f0-9]{64}$/.test(i.artifact)&&i.containers?.length===1&&i.containers[0]==='utilibre-kitchenowl-app-1';}
