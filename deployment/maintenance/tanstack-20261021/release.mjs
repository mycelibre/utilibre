// Exact admin-console-only release. No database or other Penpot service restart.
import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
import {base,candidate,target,sha,afterSha,backport} from './backport.mjs';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup} from '../language-final/release.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/tanstack-20261021',file=dir+'/release.json',name='utilibre-expanded-penpot-admin-console-1';
const run=(args,opts={})=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe'],...opts}).trim();}catch{throw Error('Bounded release operation failed; configuration output withheld');}};
const read=p=>JSON.parse(fs.readFileSync(p));
const inspect=n=>JSON.parse(run(['inspect',n]))[0],config=g=>JSON.parse(run([...existingComposeArgs(g),'config','--format','json'])).services;
const hash=s=>{const {image,...rest}=s;return sha(JSON.stringify(canonical(rest)));};
const native=()=>JSON.parse(run(['exec',name,'node','-e',"fetch('http://127.0.0.1:3000/admin-console/',{redirect:'manual'}).then(r=>console.log(JSON.stringify({status:r.status,location:r.headers.get('location')})))"]));
const action=process.argv[2];assert(['prepare','apply'].includes(action));
const b=read(dir+'/build.json'),n=read(dir+'/native.json'),s=read(dir+'/scan-gate.json');
assert(b.passed&&b.configurationUnchanged&&n.passed&&s.passed&&s.newHighCritical===0);
assert.equal(b.imageId,n.imageId);assert.equal(b.imageId,s.imageId);assert.equal(inspect(candidate).Id,b.imageId);assert.equal(b.base,base);
assert(Date.now()-Date.parse(n.date)<86400000&&Date.now()-Date.parse(s.date)<86400000);
const bytes=run(['run','--rm','--network','none','--read-only','--memory','192m','--cpus','1','--log-driver','none','--entrypoint','node',b.imageId,'-e',`process.stdout.write(require('fs').readFileSync(${JSON.stringify(target)},'utf8'))`]);
// Docker output is trimmed by run; this bundle has no terminating newline.
assert.equal(sha(bytes),afterSha);assert.equal(backport(bytes),bytes,'Repeat execution must make no further edits');
let report=fs.existsSync(file)?read(file):{status:'prepared',date:new Date().toISOString(),groups:[]};
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
if(action==='prepare'){
 assert.equal(report.groups.length,0,'Do not overwrite a release receipt');
 const x=inspect(name),l=x.Config.Labels;
 assert.equal(x.Image,base);assert.equal(l['com.docker.compose.project'],'utilibre-expanded');
 const g={key:'penpot-admin',project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared',before:[]};
 assert.deepEqual(g.files,['/home/ubuntu/freetools/deployment/expanded/compose.yaml']);
 const service=l['com.docker.compose.service'],c=config(g)[service];assert.equal(inspect(c.image).Id,base);
 g.rows.push({name,service,oldContainerId:x.Id,oldRestartCount:x.RestartCount,oldRef:c.image,oldImage:base,newRef:candidate,newImage:b.imageId,configHash:hash(c)});
 g.nativeBefore=native();assert.equal(g.nativeBefore.status,307);await checkExistingGroup(g,'old');
 g.otherContainers=run(['ps','--filter','label=com.docker.compose.project=utilibre-expanded','--format','{{.Names}}']).split('\n').filter(x=>x!==name).map(name=>({name,id:inspect(name).Id}));
 g.allConfigHashes=Object.fromEntries(Object.entries(config(g)).map(([k,v])=>[k,hash(v)]));report.groups.push(g);save();console.log('Penpot admin candidate prepared; no live changes');
}else{
 const g=report.groups[0];assert(g&&report.groups.length===1&&Date.now()-Date.parse(report.date)<86400000);
 const validate=version=>{const c=config(g);assert.deepEqual(Object.fromEntries(Object.entries(c).map(([k,v])=>[k,hash(v)])),g.allConfigHashes);for(const r of g.rows){assert.equal(c[r.service].image,r[version+'Ref']);assert.equal(inspect(r.newRef).Id,r.newImage);assert.equal(inspect(r.oldRef).Id,r.oldImage);}for(const x of g.otherContainers)assert.equal(inspect(x.name).Id,x.id);};
 if(g.status==='passed'){validate('new');await checkExistingGroup(g,'new');console.log('Already deployed and verified; nothing restarted');process.exit(0);}
 assert.equal(g.status,'prepared');const disk=fs.statfsSync(dir);assert(disk.bavail*disk.bsize>=8*1024**3,'8 GiB reserve');
 const pins=version=>{const r=g.rows[0],p=g.files[0],out=replaceImagePins(fs.readFileSync(p,'utf8'),[{from:r[version==='new'?'oldRef':'newRef'],to:r[version+'Ref']}]);assert.equal(out.replaced,1);fs.writeFileSync(p,out.text);};
 let rollback=false;
 await releaseGroup(g,{preflight:async()=>{validate('old');await checkExistingGroup(g,'old');},save,recreate:async()=>{if(!rollback)pins('new');validate(rollback?'old':'new');await recreateExistingGroup(g);},gate:async version=>{await checkExistingGroup(g,version);validate(version);assert.deepEqual(native(),g.nativeBefore);},rollbackPins:()=>{rollback=true;pins('old');validate('old');}});
 g.completedAt=new Date().toISOString();report.completedAt=g.completedAt;report.status='passed';save();console.log('Penpot admin deployed; exact bytes, unchanged configuration, native login and untouched sibling containers verified');
}
