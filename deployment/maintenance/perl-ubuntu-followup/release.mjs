// Preparation is read-only. Root explicitly approves any production apply.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {replaceImagePins,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup} from '../language-final/release.mjs';
import {packages,version} from './policy.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/perl-ubuntu-followup-20261012',here=new URL('.',import.meta.url).pathname,mode=process.argv[2];assert(['prepare','apply'].includes(mode));assert.equal(process.argv.length,3);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex'),file=dir+'/release.json',spec=read(here+'spec.json');
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000,maxBuffer:8*1024**2}).trim();}catch{throw Error('Bounded native operation failed; configuration withheld');}};
const inspect=n=>JSON.parse(docker('inspect',n))[0],config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=c=>{const{image,...rest}=c;return sha(JSON.stringify(rest));};
const build=read(dir+'/build.json'),checks=read(dir+'/checks.json'),offer=read(dir+'/source-offer.json');
assert(build.passed&&build.configurationUnchanged&&build.unrelatedPackageAndPayloadsUnchanged&&build.abi.sameSonameAndNeeded);assert.equal(build.base,spec.base);assert.equal(build.imageId,inspect(spec.candidate).Id);assert.equal(checks.imageId,build.imageId);
assert.deepEqual(build.packages.map(p=>p.name),packages);assert(build.packages.every(p=>p.version===version));assert.equal(build.inputProofSha256,sha(fs.readFileSync(dir+'/inputs.json')));
for(const key of ['passed','archiveUpstreamPassed','nativeAuthenticatedWriteRead','transactionRollback','leastPrivilegeDenied','secondInstanceRestore','cleanedUp'])assert(checks[key],key);
assert(offer.published);assert.equal(sha(fs.readFileSync('/opt/utilibre/toolbox-public/'+offer.filename)),offer.sha256);assert(Date.now()-Date.parse(checks.date)<86400000);
for(const p of build.packages)assert.equal(sha(fs.readFileSync(dir+'/input/'+p.file)),p.sha256);
const proofFiles=['build.json','checks.json','inputs.json','source-offer.json'];const proofs=Object.fromEntries(proofFiles.map(p=>[dir+'/'+p,sha(fs.readFileSync(dir+'/'+p))]));
const endpoint='http://127.0.0.1:3211/';async function http(){const r=await fetch(endpoint,{redirect:'manual',signal:AbortSignal.timeout(5000)});await r.body?.cancel();return r.status;}
async function native(g,which){await checkExistingGroup(g,which);const image=which==='new'?build.imageId:spec.base;const installed=which==='new'?version:spec.oldVersion;
 for(const p of packages)assert.equal(docker('exec',spec.container,'dpkg-query','-W','-f=${Version}',p),installed);
 for(const [path,h]of Object.entries(build.payloads[image]))assert.equal(docker('exec',spec.container,'sha256sum',path).split(/\s+/)[0],h);
 assert.equal(docker('exec',spec.container,'dpkg','--audit'),'');assert.match(docker('exec',spec.container,'mariadbd','--version'),/12\.2\.2-MariaDB/);
 const cfg=config(g);for(const u of g.untouched){const x=inspect(u.name);assert.equal(x.Id,u.id);assert.equal(x.Image,u.image);assert.equal(sha(JSON.stringify(cfg[u.service])),u.configSha256);assert(x.State.Running);}
 assert.equal(await http(),g.httpBefore);
}
if(mode==='prepare'){
 if(fs.existsSync(file))assert.equal(read(file).status,'prepared','Retain completed receipt');const live=inspect(spec.container);assert.equal(live.Image,spec.base);const l=live.Config.Labels;
 const g={key:'addy-db',project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),status:'prepared',before:[],rows:[],proofs};assert.equal(g.project,'utilibre-addy');assert.deepEqual(g.files,['/home/ubuntu/freetools/deployment/addy/compose.yaml']);const cfg=config(g);assert.equal(cfg.db.image,spec.baseRef);
 g.rows.push({key:'addy-db',name:spec.container,service:'db',oldRef:spec.baseRef,oldImage:spec.base,newRef:spec.candidate,newImage:build.imageId,configHash:hash(cfg.db),verification:dir+'/build.json'});
 g.untouched=['app','redis','gateway'].map(service=>{const x=inspect('utilibre-addy-'+service+'-1');return{name:x.Name.slice(1),id:x.Id,image:x.Image,service,configSha256:sha(JSON.stringify(cfg[service]))};});
 g.httpBefore=await http();assert([200,301,302,303].includes(g.httpBefore));await native(g,'old');g.preparedAt=new Date().toISOString();g.fileHashes=Object.fromEntries(g.files.map(p=>[p,sha(fs.readFileSync(p))]));
 fs.writeFileSync(file,JSON.stringify({date:g.preparedAt,status:'prepared',groups:[g]},null,2)+'\n');console.log('Addy DB exact four-package vendor update prepared; no production changes.');
}else{
 const report=read(file),g=report.groups[0];assert.equal(report.status,'prepared');assert.equal(report.groups.length,1);assert.equal(g.key,'addy-db');assert.equal(g.status,'prepared');assert(Date.now()-Date.parse(g.preparedAt)<3600000);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>=8*1024**3);assert.deepEqual(proofs,g.proofs);
 for(const[p,h]of Object.entries(g.fileHashes))assert.equal(sha(fs.readFileSync(p)),h,'Concurrent compose edit; prepare again');
 const validate=()=>{const cfg=config(g);assert.equal(hash(cfg.db),g.rows[0].configHash);assert([spec.baseRef,spec.candidate].includes(cfg.db.image));assert.equal(inspect(spec.baseRef).Id,spec.base);assert.equal(inspect(spec.candidate).Id,build.imageId);};
 const repin=reverse=>{const p=g.files[0],next=replaceImagePins(fs.readFileSync(p,'utf8'),[{from:reverse?spec.candidate:spec.baseRef,to:reverse?spec.baseRef:spec.candidate}]);assert.equal(next.replaced,1);fs.writeFileSync(p,next.text);};
 const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');let rollback=false;
 await releaseGroup(g,{preflight:async()=>{validate();await native(g,'old');},save,recreate:async()=>{validate();if(!rollback)repin(false);await recreateExistingGroup(g);},gate:async which=>{await native(g,which);validate();},rollbackPins:()=>{validate();rollback=true;repin(true);}});
 report.status='passed';report.completedAt=new Date().toISOString();g.completedAt=report.completedAt;save();console.log('Addy DB native Perl vendor update passed; unrelated containers/config/data unchanged.');
}
