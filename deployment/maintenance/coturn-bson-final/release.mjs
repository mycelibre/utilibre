import fs from 'node:fs';
import assert from 'node:assert/strict';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
import {root,base,baseRef,candidate,targets,sha,read,run,docker,inspect,reserve,reserveSpec} from './common.mjs';
process.umask(0o077);
const path=root+'/release.json',stage=read(root+'/stage.json'),app=read(root+'/application.json');
assert.equal(stage.status,'passed');assert.equal(app.status,'passed');assert.equal(app.image,stage.image);assert.equal(inspect(candidate).Id,stage.image);
if(reserve){
 const n=read(root+'/native.json'),v=read(root+'/coturn/inventory.json'),g=read(root+'/coturn/scan-gate.json');
 assert.equal(n.status,'passed');assert(v.passed&&g.passed&&g.newHighCritical===0&&g.primarySourceFixVerified);
 assert.equal(v.imageId,stage.image);assert.equal(g.imageId,stage.image);
 assert.deepEqual(v.changedPaths,[reserveSpec.library]);
 assert.equal(n.patchSha256,reserveSpec.patchSha256);
 assert(n.results.length===2&&n.results.every(r=>r.passed&&r.normalChecks===10&&r.boundaryCases===5&&r.originalHeaderConsumerPassed));
 assert(!n.results[0].undersizedRejected&&n.results[1].undersizedRejected);
}
const compose=r=>['compose','--profile','*','--project-directory',r.cwd,'-p',r.project,...r.files.flatMap(f=>['-f',f])];
const service=r=>JSON.parse(docker(...compose(r),'config','--format','json')).services[r.service];
const hash=s=>{const{image,...rest}=s;return sha(JSON.stringify(rest));};
const configFiles=['/opt/utilibre/turn/turnserver.conf','/opt/utilibre/pack-data/galene-turn/turnserver.conf'];
const paths=r=>[r.config,...r.certificates];
function unchanged(r){assert.equal(hash(service(r)),r.configHash);for(const file of paths(r))assert.equal(sha(fs.readFileSync(file)),r.contentHashes[file]);}
function idle(r){const c=fs.readFileSync(r.config,'utf8'),min=Number(c.match(/^min-port=(\d+)$/m)?.[1]),max=Number(c.match(/^max-port=(\d+)$/m)?.[1]);assert(Number.isInteger(min)&&min>1024&&max>=min&&max-min<2048);const lines=run('ss',['-H','-u','-a','-n']).split('\n').filter(Boolean);const ports=lines.map(l=>Number(l.trim().split(/\s+/)[3]?.match(/:(\d+)$/)?.[1]));assert(ports.every(Number.isFinite));const count=ports.filter(p=>p>=min&&p<=max).length;assert.equal(count,0,'Active relay allocations: refuse restart, retry after normal users finish');return{at:new Date().toISOString(),aggregateRelaySockets:count};}
if(process.argv[2]==='prepare'){
 assert(!fs.existsSync(path));const proofs=Object.fromEntries(['authenticated','native','stage','application','source-offer',...(reserve?['coturn/inventory','coturn/scan-gate']:[])].map(f=>[f,sha(fs.readFileSync(root+'/'+f+'.json'))]));const offer=read(root+'/source-offer.json');assert(offer.published);assert.equal(sha(fs.readFileSync(offer.archive)),offer.sha256);
 const rows=targets.map((name,i)=>{const x=inspect(name),l=x.Config.Labels;assert.equal(x.Image,base);const r={name,config:configFiles[i],port:i===0?3479:3478,oldRef:baseRef,oldImage:base,newRef:candidate,newImage:stage.image,cwd:l['com.docker.compose.project.working_dir'],project:l['com.docker.compose.project'],service:l['com.docker.compose.service'],files:l['com.docker.compose.project.config_files'].split(',')};const s=service(r);assert.equal(s.image,baseRef);r.configHash=hash(s);r.certificates=s.volumes.filter(v=>v.type==='bind'&&v.target.includes('cert')).flatMap(v=>fs.statSync(v.source).isDirectory()?fs.readdirSync(v.source).filter(n=>fs.statSync(v.source+'/'+n).isFile()).map(n=>v.source+'/'+n):[v.source]);assert(r.certificates.length>=2);r.contentHashes=Object.fromEntries(paths(r).map(p=>[p,sha(fs.readFileSync(p))]));return r;});
 fs.writeFileSync(path,JSON.stringify({date:new Date().toISOString(),status:'prepared',proofs,rows},null,2)+'\n');console.log('Two serial image-only releases prepared, without live changes.');
}else if(process.argv[2]==='apply'){
 const r=read(path);assert.equal(r.rows.length,2);for(const[file,h]of Object.entries(r.proofs))assert.equal(sha(fs.readFileSync(root+'/'+file+'.json')),h);const save=()=>fs.writeFileSync(path,JSON.stringify(r,null,2)+'\n');
 for(const row of r.rows){assert.equal(service(row).image,candidate);unchanged(row);if(row.status==='passed'){assert.equal(inspect(row.name).Image,row.newImage);continue;}
 row.idleChecks=[idle(row)];await new Promise(resolve=>setTimeout(resolve,1000));row.idleChecks.push(idle(row));
 await releaseReviewedRow(row,inspect(row.name).Image,{save,inspect:async name=>{const x=inspect(name);if(name===row.name&&x.State?.Running){try{docker('exec',name,'turnutils_stunclient','-p',String(row.port),'10.10.1.43');x.State.Health={Status:'healthy'};}catch{x.State.Health={Status:'starting'};}}return x;},start:()=>docker(...compose(row),'up','-d','--no-deps','--no-build','--pull','never',row.service),rollback:()=>{const file=root+'/rollback-'+row.name+'.json';fs.writeFileSync(file,JSON.stringify({services:{[row.service]:{image:baseRef}}}));docker(...compose(row),'-f',file,'up','-d','--no-deps','--no-build','--pull','never',row.service);}});
 unchanged(row);row.completedAt=new Date().toISOString();save();console.log(row.name+': exact image and native STUN verified.');
 }
 if(r.status!=='passed'){r.status='passed';r.completedAt=new Date().toISOString();save();}
}else throw Error('Use prepare; operator edits only the two image pins; apply refuses active relay allocations.');
