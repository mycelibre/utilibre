// Reuse existing offline application fixtures; change only image/evidence paths.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const msal=process.argv.includes('--msal'),cfitsio=process.argv.includes('--cfitsio'),profile=msal?'msal':cfitsio?'cfitsio':'blkid';
assert(!(msal&&cfitsio));
const root='/var/lib/utilibre-maintenance/security-20261028/'+profile,here=new URL('.',import.meta.url).pathname;
const selected=process.argv.slice(2).filter(a=>!['--msal','--cfitsio'].includes(a)),map=msal?{kuma:'kuma'}:cfitsio?{gathio:'gathio-postgres'}:{gathio:'gathio-postgres',kuma:'community-uptime-kuma',rssbridge:'community-rssbridge'};
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
if(msal){
 const dir=root+'/kuma',b=JSON.parse(fs.readFileSync(dir+'/build.json'));
 assert(!fs.existsSync(dir+'/consumer.json'),'Preserve prior evidence');
 const rows=[];
 for(const imageId of [b.base,b.imageId]){
  const result=JSON.parse(cp.execFileSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--pids-limit','96','--cpus','1','--memory','384m','--tmpfs','/tmp:rw,noexec,nosuid,size=64m','-v',here+'msal-consumer.cjs:/tmp/msal-consumer.cjs:ro','--entrypoint','node',imageId,'/tmp/msal-consumer.cjs'],{encoding:'utf8',timeout:60000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}));
  assert(result.passed);rows.push({imageId,...result});
 }
 fs.writeFileSync(dir+'/consumer.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:b.imageId,network:false,fixtureSha256:sha(fs.readFileSync(here+'msal-consumer.cjs')),rows},null,2)+'\n');
}
cp.execFileSync(process.execPath,[file,...selected],{timeout:600000,stdio:'inherit'});
