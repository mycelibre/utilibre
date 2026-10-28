// Finite reviewed source repairs; no package-wide or version-only exemptions.
import fs from 'node:fs';
const inputs=Object.fromEntries(['nltk','symfony'].map(k=>[k,JSON.parse(fs.readFileSync(new URL('./'+k+'-inputs.json',import.meta.url)))]));
export const reviewFiles=['security-20261028/nltk/review.json','security-20261028/symfony/review.json'];
export function eligible(i,profile){
 if(!Object.hasOwn(inputs,profile)||i?.status!=='needs-review'||i.scope!=='runtime-image'||!/^sha256:[a-f0-9]{64}$/.test(i.artifact||'')||!Array.isArray(i.containers))return false;
 const s=inputs[profile].rows.find(s=>JSON.stringify([...s.containers].sort())===JSON.stringify([...i.containers].sort()));if(!s)return false;
 if(profile==='nltk')return i.type==='python-pkg'&&i.package==='nltk'&&i.installed===s.previous&&i.id===inputs.nltk.advisory;
 return i.type==='composer-vendor'&&s.packages[i.package]===i.installed&&((i.package==='symfony/http-foundation'&&i.id==='CVE-2026-108082')||(i.package==='symfony/yaml'&&i.id==='CVE-2026-109413'));
}
