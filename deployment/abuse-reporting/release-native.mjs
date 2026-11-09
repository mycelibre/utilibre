// Finite notice-only releases, using the established scoped rollback mechanism.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {existingComposeArgs,replaceImagePins,checkExistingGroup,recreateExistingGroup,releaseGroup} from '../maintenance/language-final/release.mjs';
import {acquireReleaseLock} from '../maintenance/security-20261103/release-lock.mjs';
process.umask(0o077);assert.equal(process.argv[2],'--apply');
const keys=process.argv.slice(3);assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>['chhoto','privatebin','wbo','pollaris'].includes(k)));
const unlock=acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');process.once('exit',unlock);
const root='/var/lib/utilibre-maintenance/security-20261109/abuse-reporting',read=p=>JSON.parse(fs.readFileSync(p)),sha=x=>createHash('sha256').update(x).digest('hex');
const proof=read(root+'/images.json');assert(proof.passed&&proof.fixtureSha256===sha(fs.readFileSync(new URL('check-images.py',import.meta.url))));
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}),docker=(...a)=>run('docker',a),inspect=n=>JSON.parse(docker('inspect',n))[0];
const urls={chhoto:'https://links.utilibre.org/',privatebin:'https://paste.utilibre.org/',wbo:'https://collab.utilibre.org/',pollaris:'https://pollaris.utilibre.org/'};
const file=root+'/release.json',report=fs.existsSync(file)?read(file):{status:'partial',groups:[]};
const save=()=>{report.status=report.groups.length===4&&report.groups.every(g=>g.status==='passed')?'passed':'partial';report.updatedAt=new Date().toISOString();fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');};
for(const key of keys){
 const p=proof.rows.find(r=>r.key===key);assert(p&&p.allOtherFilesAndConfigurationUnchanged&&p.nativeChecksPassed);assert.equal(inspect(p.candidate).Id,p.imageId);
 if(report.groups.some(g=>g.key===key&&g.status==='passed')){await checkExistingGroup(report.groups.find(g=>g.key===key),'new');continue;}
 const failed=report.groups.find(g=>g.key===key&&g.status==='failed');if(failed){assert.equal(failed.rollback,'verified');(report.previousAttempts??=[]).push(failed);report.groups=report.groups.filter(g=>g!==failed);}
 const x=inspect(p.container),l=x.Config.Labels;assert.equal(x.Image,p.base);
 const all=JSON.parse(docker('inspect',...docker('ps','-q').trim().split(/\s+/)));
 const members=all.filter(c=>c.Config.Labels?.['com.docker.compose.project']===l['com.docker.compose.project']&&c.Image===p.base);
 assert(members.length===1||(key==='pollaris'&&members.length===2));
 const g={key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),before:[],rows:members.map(c=>({name:c.Name.slice(1),service:c.Config.Labels['com.docker.compose.service'],oldImage:p.base,newImage:p.imageId,oldContainerId:c.Id,oldRestartCount:c.RestartCount}))};
 const texts=new Map(g.files.map(f=>[f,fs.readFileSync(f,'utf8')]));
 const updated=new Map();let count=0;
 for(const [f,s] of texts){const v=replaceImagePins(s,[{from:x.Config.Image,to:p.candidate}]);count+=v.replaced;updated.set(f,v.text);}assert(count>=1&&count<=members.length);
 const configBefore=JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));
 const imageServices=Object.entries(configBefore.services).filter(([,s])=>s.image===x.Config.Image).map(([name])=>name);
 g.deferredServices=imageServices.filter(service=>!g.rows.some(r=>r.service===service));
 assert(g.deferredServices.length===0||(key==='pollaris'&&g.deferredServices.every(s=>s==='worker')));
 const shape=()=>{const cfg=JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));for(const service of imageServices)delete cfg.services[service].image;if(key==='pollaris'&&cfg['x-application']){assert([x.Config.Image,p.candidate].includes(cfg['x-application'].image));delete cfg['x-application'].image;}return sha(JSON.stringify(cfg));};
 const originalShape=shape();
 const diagnosed=async(phase,fn)=>{try{return await fn();}catch(e){fs.writeFileSync(root+'/'+key+'-'+phase+'-error.txt',String(e.stack)+'\n'+String(e.stderr||''));throw e;}};
 const publicCheck=async()=>{const r=await fetch(urls[key],{signal:AbortSignal.timeout(20000)}),html=await r.text();assert.equal(r.status,200);for(const url of ['https://utilibre.org/en/abuse','https://utilibre.org/es/denunciar-abuso'])assert(html.includes(url),key+': native report link missing');};
 report.groups.push(g);save();
 await releaseGroup(g,{save,preflight:async()=>{for(const [f,s] of texts)assert.equal(fs.readFileSync(f,'utf8'),s);for(const r of g.rows)assert.equal(inspect(r.name).Image,p.base);},recreate:async()=>diagnosed('recreate',async()=>{if(!g.rollback){for(const [f,s] of updated)fs.writeFileSync(f,s);assert.equal(shape(),originalShape);const cfg=JSON.parse(docker(...existingComposeArgs(g),'config','--format','json'));for(const service of imageServices)assert.equal(inspect(cfg.services[service].image).Id,p.imageId);}await recreateExistingGroup(g);if(key==='pollaris')docker('exec','-w','/app',p.container,'php','bin/console','cache:clear','--env=prod','--no-debug');}),gate:async version=>diagnosed('gate-'+version,async()=>{await checkExistingGroup(g,version);if(version==='new')await publicCheck();}),rollbackPins:async()=>{for(const [f,s] of texts)fs.writeFileSync(f,s);}});
 g.completedAt=new Date().toISOString();g.storageNote=key==='wbo'?'Native temporary boards are held in tmpfs and reset when the app is recreated; contents were not inspected or backed up.':'No content deletion, migration or restore performed';save();console.log(key+': notice deployed and public HTTPS link verified; service settings unchanged');
}
