import fs from 'node:fs';
const spec=JSON.parse(fs.readFileSync(new URL('./cryptpad-body-inputs.json',import.meta.url)));
export const reviewFile='security-20261028/cryptpad-body/review.json';
export function eligible(i){
 return i?.status==='needs-review'&&i.scope==='mounted-runtime-code'&&i.type==='npm'&&i.package==='body-parser'&&i.installed===spec.packageVersion&&i.id===spec.advisory&&i.target==='package-lock.json'&&i.targetName==='cryptpad/package-lock.json'&&i.artifact==='cryptpad/package-lock.json@sha256:'+spec.lockSha256&&Array.isArray(i.containers)&&i.containers.length===0;
}
