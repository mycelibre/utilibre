// Package exact corresponding sources and record reviewed candidate evidence.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/releases-20261112/gathio';
const here=new URL('.',import.meta.url).pathname;
const read=p=>JSON.parse(fs.readFileSync(p));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const inputs=read(here+'inputs.json'),built=read(root+'/runtime/build.json'),native=read(root+'/native.json'),locks=read(root+'/source-lock.json');
assert(built.passed&&built.configurationUnchanged&&native.passed&&locks.passed);
assert.equal(built.base,inputs.spec.base);assert.equal(native.imageId,built.imageId);
assert.equal(sha(here+'source-update.patch'),locks.sourcePatchSha256);
const before=read(root+'/scan-baseline.json'),after=read(root+'/scan-candidate.json');
const findings=r=>r.Results.flatMap(x=>(x.Vulnerabilities||[]).map(v=>({id:v.VulnerabilityID,package:v.PkgName,version:v.InstalledVersion,severity:v.Severity})));
assert(before.Results.length&&after.Results.length);
assert(Date.now()-Date.parse(after.CreatedAt)<86400000);
const previous=findings(before),next=findings(after),key=v=>[v.id,v.package,v.version,v.severity].join('|');
assert(next.every(v=>previous.some(p=>key(v)===key(p))),'New finding requires review');
for(const id of inputs.advisories){assert(previous.some(v=>v.id===id&&v.package==='mongoose'));assert(!next.some(v=>v.id===id));}
assert(!next.some(v=>['CRITICAL','HIGH'].includes(v.severity)));
const source=root+'/source';assert(!fs.existsSync(source));fs.mkdirSync(source);
const prior='/opt/utilibre/toolbox-public/security-gathio-multer-20261028-source.tar.gz';
assert.equal(sha(prior),'aa69966daeca31ec34f088bc0eb26b2d526aa0a35ffc260b9d3af41c81b2be89');
fs.copyFileSync(prior,source+'/prior-complete-source.tar.gz');
for(const file of ['inputs.json','source-update.patch','build.mjs','prepare-lock.mjs','resolve-lock.sh','check-native.mjs'])fs.copyFileSync(here+file,source+'/'+file);
for(const file of ['build.mjs','specs.mjs'])fs.copyFileSync(new URL('../../js-closure/'+file,import.meta.url),source+'/existing-'+file);
for(const [name,p] of Object.entries(inputs.packages)){
 const r=await fetch('https://registry.npmjs.org/'+name+'/-/'+name+'-'+p.version+'.tgz',{signal:AbortSignal.timeout(20000)});assert(r.ok);
 const b=Buffer.from(await r.arrayBuffer());assert(b.length<8*1024**2);assert.equal('sha512-'+createHash('sha512').update(b).digest('base64'),p.integrity);
 fs.writeFileSync(source+'/'+name+'-'+p.version+'.tgz',b);
}
fs.writeFileSync(source+'/README.txt','Gathio GPL-3.0-or-later corresponding-source supplement, 12 November 2026.\nThe nested prior-complete-source archive retains the full application and previous repairs.\nsource-update.patch records native package-manager resolution; build.mjs overlays only exact MIT-licensed mongoose/mquery source packages onto the repaired runtime. Package archives retain their upstream licenses.\nThe full shared build/check framework is in Utilibre integration source, deployment/maintenance. No production data or credentials are included.\n');
const archive=root+'/gathio-mongoose-20261112-source.tar.gz';assert(!fs.existsSync(archive));
cp.execFileSync('tar',['-czf',archive,'-C',root,'source'],{timeout:60000});
const config='deployment/calendar/compose.gathio.yaml';
const report={schemaVersion:1,date:new Date().toISOString(),approved:true,base:inputs.spec.base,candidate:inputs.spec.candidate,imageId:built.imageId,removed:previous.filter(v=>!next.some(p=>key(v)===key(p))),remaining:next,source:{archive,sha256:sha(archive),publicName:'gathio-mongoose-20261112-source.tar.gz'},evidence:Object.fromEntries(['runtime/build.json','native.json','source-lock.json','scan-baseline.json','scan-candidate.json'].map(f=>[f,sha(root+'/'+f)])),files:Object.fromEntries([config,'deployment/calendar/gathio/config.toml','deployment/calendar/gathio/data-notes.md','deployment/calendar/gathio/nginx.conf'].map(f=>[f,sha(f)])),checkerSha256:sha(here+'check-native.mjs'),scope:'Exact mongoose/mquery package overlay; app configuration, DB schema, data, retention and permissions unchanged'};
fs.writeFileSync(root+'/candidate.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({approved:true,imageId:report.imageId,removed:report.removed,remaining:report.remaining,sourceSha256:report.source.sha256}));
