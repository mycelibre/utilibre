// Reuse existing offline application fixtures; change only image/evidence paths.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const cfitsio=process.argv.includes('--cfitsio'),profile=cfitsio?'cfitsio':'blkid';
const root='/var/lib/utilibre-maintenance/security-20261028/'+profile,here=new URL('.',import.meta.url).pathname;
const selected=process.argv.slice(2).filter(a=>a!=='--cfitsio'),map=cfitsio?{gathio:'gathio-postgres'}:{gathio:'gathio-postgres',kuma:'community-uptime-kuma',rssbridge:'community-rssbridge'};
assert(selected.length&&new Set(selected).size===selected.length&&selected.every(k=>Object.hasOwn(map,k)));
const originalPath=here+'../bookworm-curl-followup/app-checks.mjs',original=fs.readFileSync(originalPath,'utf8'),sha=s=>createHash('sha256').update(s).digest('hex');
const specs=selected.map(key=>{const b=JSON.parse(fs.readFileSync(root+'/'+map[key]+'/build.json'));assert(b.passed);return {key,candidate:b.candidate};});
fs.mkdirSync(root+'/fixtures',{recursive:true});const id=sha(JSON.stringify(specs)).slice(0,12),file=root+'/fixtures/apps-'+id+'.mjs',specFile=root+'/fixtures/specs-'+id+'.json';
fs.writeFileSync(specFile,JSON.stringify(specs));
let code=original;
for(const [from,to]of [
 ["'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012'",JSON.stringify(root)],
 ["here=new URL('.',import.meta.url).pathname",'here='+JSON.stringify(here+'../bookworm-curl-followup/')],
 ["here+'specs.json'",JSON.stringify(specFile)],
 ["dir+'/images/'+s.key","dir+'/'+"+JSON.stringify(map)+"[s.key]"],
 ["maintenance-bookworm-curl-","maintenance-"+profile+"-"]
]){assert.equal(code.split(from).length,2,'Fixture adaptation must match exactly once');code=code.replace(from,to);}
fs.writeFileSync(file,code);fs.writeFileSync(file+'.provenance.json',JSON.stringify({source:originalPath,sourceSha256:sha(original),adaptedSha256:sha(code),changes:['exact artifact and evidence paths','disposable names'],behaviorUnchanged:true},null,2)+'\n');
cp.execFileSync(process.execPath,[file,...selected],{timeout:600000,stdio:'inherit'});
