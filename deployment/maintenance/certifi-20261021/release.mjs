// Finite CA-only rollout through the existing image release and namespace gates.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {specs as caSpecs,output,aiohttpPredecessors} from './specs.mjs';
import {canonical} from '../go-final/release.mjs';
import {replaceImagePins,namespaceDependents,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup,existingGroupStatus} from '../language-final/release.mjs';
process.umask(0o077);
const [action,...keys]=process.argv.slice(2),pillow=action.endsWith('-pillow'),uv=action.endsWith('-uv'),aiohttp=action.endsWith('-aiohttp'),followup=pillow?'pillow':uv?'uv':aiohttp?'aiohttp':null,mode=action.replace(/-(pillow|uv|aiohttp)$/,'');assert(['prepare','apply','retry-searxng'].includes(mode));
const specs=followup?caSpecs.filter(s=>(pillow?['candlr','liberaforms','kitchenowl','trip']:aiohttp?Object.keys(aiohttpPredecessors):['beaverhabits']).includes(s.key)).map(s=>({...s,base:JSON.parse(fs.readFileSync(output+'/'+s.key+(aiohttp&&aiohttpPredecessors[s.key]?'/'+aiohttpPredecessors[s.key]:'')+'/build.json')).imageId,candidate:'utilibre-'+s.key+':'+followup+'-certifi-20261021'})):caSpecs;
assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));
const evidenceDir=key=>output+'/'+key+(followup?'/'+followup:'');
const docker=(...args)=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch{throw Error('Bounded Docker command failed; configuration output withheld');}};
const format='{"Id":{{json .Id}},"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Labels":{{json .Config.Labels}},"Healthcheck":{{json (index .Config "Healthcheck")}}},"State":{"Running":{{json .State.Running}},"StartedAt":{{json .State.StartedAt}},"Health":{{json (index .State "Health")}}},"RestartCount":{{json .RestartCount}},"HostConfig":{"NetworkMode":{{json .HostConfig.NetworkMode}}}}';
const inspect=n=>JSON.parse(docker('inspect','--format',format,n));
const image=n=>docker('image','inspect','--format','{{.Id}}',n);
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=s=>{const {image,...rest}=s;return createHash('sha256').update(JSON.stringify(canonical(rest))).digest('hex');};
const file=output+(followup?'/'+followup+'-release.json':'/release.json'),report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):{date:new Date().toISOString(),status:'partial',groups:[]};
const save=()=>{
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 for(const g of report.groups.filter(g=>g.status==='passed'&&g.completedAt))fs.writeFileSync(evidenceDir(g.key)+'/release.json',JSON.stringify({status:'passed',completedAt:g.completedAt,scope:'Only this exact dependency-update service group',groups:[g]},null,2)+'\n');
};
const urls={radicale:'https://calendar.utilibre.org/',candlr:'https://candlr.utilibre.org/login',beaverhabits:'https://habits.utilibre.org/', '13ft':'https://read.utilibre.org/',liberaforms:'https://forms.utilibre.org/',searxng:'https://search.utilibre.org/',kitchenowl:'https://kitchen.utilibre.org/',unfurl:'https://expand.utilibre.org/',linkding:'https://bookmarks.utilibre.org/',authentik:'https://auth.utilibre.org/',simplelogin:'https://simplelogin.utilibre.org/',trip:'https://trip.utilibre.org/'};
async function publicStatus(key){const r=await fetch(urls[key],{redirect:'manual',signal:AbortSignal.timeout(10000)});await r.body?.cancel();return r.status;}
if(mode==='retry-searxng'){
 assert.deepEqual(keys,['searxng']);assert(!pillow);
 const g=report.groups.find(g=>g.key==='searxng');assert.equal(g?.status,'failed');assert.equal(g.rollback,'verified');
 await checkExistingGroup(g,'old');assert.equal(await publicStatus(g.key),g.publicBefore);
 assert.equal(g.files.length,2);assert.equal(g.files[0],g.cwd+'/compose.yaml');
 assert(/^\/var\/lib\/utilibre-searx-updater\/run-[a-z0-9_]+\/image\.json$/.test(g.files[1]));
 assert.deepEqual(JSON.parse(fs.readFileSync(g.files[1])),{services:{searxng:{image:g.rows[0].oldRef}}});
 const old=config(g);const next=config({...g,files:[g.files[0]]});
 assert.deepEqual(canonical(old),canonical(next),'Removing the retained updater override must not change effective configuration');
 for(const r of g.rows){assert.equal(next[r.service].image,r.oldRef);assert.equal(hash(next[r.service]),r.configHash);assert.equal(image(r.newRef),r.newImage);}
 g.attempts=[...(g.attempts||[]),{status:g.status,rollback:g.rollback,files:g.files,verifiedAt:new Date().toISOString(),reason:'Retained daily-updater image-only override masked the .env pin; effective base Compose configuration verified identical before removing that override from this release invocation.'}];
 g.files=[g.files[0]];g.status='prepared';delete g.rollback;save();
 console.log('SearXNG rollback verified; stale image-only override identified. Retry prepared without restarting services.');
}
function pins(g,version){
 if(g.key==='searxng'){
  const row=g.rows.find(r=>r.oldRef!==r.newRef);
  cp.execFileSync('python3',['-c',"import importlib.util,sys; s=importlib.util.spec_from_file_location('m','scripts/searxng-maintain.py'); m=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.persist_image(sys.argv[1])",row[version+'Ref']],{cwd:new URL('../../../',import.meta.url),stdio:['ignore','pipe','pipe'],timeout:10000});return;
 }
 const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r[version==='new'?'oldRef':'newRef'],to:r[version+'Ref']}));
 const edits=g.files.map(f=>({f,...replaceImagePins(fs.readFileSync(f,'utf8'),pairs)}));
 assert(edits.reduce((n,e)=>n+e.replaced,0)>=1,'No exact image scalar found');
 for(const e of edits)if(e.replaced)fs.writeFileSync(e.f,e.text);
}
if(mode==='prepare')for(const key of keys){
 assert(!report.groups.some(g=>g.key===key),'Existing receipt must not be overwritten');
 const s=specs.find(x=>x.key===key),b=JSON.parse(fs.readFileSync(evidenceDir(key)+'/build.json'));
 assert(b.passed&&b.configurationUnchanged&&b.unrelatedDependencyFilesUnchanged);
 if(pillow)assert(b.existingCertifiFixPreserved&&b.normalAfter[1].jpegTileOverflowRejected);
  else if(aiohttp)assert(b.existingCertifiFixPreserved&&b.normalAfter.passed&&b.normalBefore.fieldLimitStatus===200&&b.normalAfter.fieldLimitStatus===413&&b.normalAfter.controlFrameRegression==='fixed');
 else if(uv)assert(b.existingCertifiFixPreserved&&b.offlineChecks.passed);
 else assert(b.tls.trustedTLS&&b.tls.untrustedTLSRejected&&b.before.blockedRootTrusted&&!b.after.blockedRootTrusted);
 assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(image(s.candidate),b.imageId);
 assert(Date.now()-Date.parse(b.date)<86400000);
 const first=inspect(s.containers[0]),l=first.Config.Labels;
 const g={key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared',preparedAt:new Date().toISOString()};
 const all=docker('inspect','--format',format,...docker('ps','-q').split('\n')).split('\n').map(JSON.parse);
 const dependent=namespaceDependents(all,new Set(s.containers));
 const cfg=config(g);
 for(const name of [...s.containers,...dependent.map(d=>d.container.Name.slice(1))]){
  const x=all.find(x=>x.Name==='/'+name),labels=x.Config.Labels;assert.equal(labels['com.docker.compose.project'],g.project,'Unreviewed cross-project companion');
  const service=labels['com.docker.compose.service'],c=cfg[service],selected=s.containers.includes(name);assert.equal(image(c.image),x.Image);
  if(selected)assert.equal(x.Image,s.base);
  const parent=all.find(p=>'container:'+p.Id===x.HostConfig.NetworkMode)?.Name.slice(1);
  assert(Date.now()-Date.parse(x.State.StartedAt)>300000,'Predecessor has not been stable for five minutes');
  g.rows.push({name,service,oldContainerId:x.Id,oldRestartCount:x.RestartCount,oldRef:c.image,oldImage:x.Image,newRef:selected?s.candidate:c.image,newImage:selected?b.imageId:x.Image,configHash:hash(c),...(parent?{namespaceParent:parent}:{})});
 }
 g.before=await existingGroupStatus(g);await checkExistingGroup(g,'old');
 g.publicBefore=await publicStatus(key);
 if(key==='simplelogin'&&g.publicBefore===502){
  const r=await fetch('http://127.0.0.1:3212/auth/login',{redirect:'manual',signal:AbortSignal.timeout(5000)});await r.body?.cancel();assert.equal(r.status,200);
  g.publicPreExistingFailure='Public HTTPS 502 before release; native login gateway 200. CA repair does not claim to repair the separate edge route.';
 }else assert(g.publicBefore>=200&&g.publicBefore<500,'Public baseline failed');
 report.groups.push(g);save();console.log(key+': prepared, no production changes');
}
if(mode==='apply')for(const key of keys){
 const g=report.groups.find(g=>g.key===key);assert(g&&Date.now()-Date.parse(g.preparedAt)<86400000);
 const scan=JSON.parse(fs.readFileSync(evidenceDir(key)+'/scan-gate.json'));assert(scan.passed&&scan.certifiFindingRemoved&&scan.newHighCritical===0);if(pillow)assert(scan.pillowFindingsRemoved);if(uv)assert(scan.uvFindingRemoved);if(aiohttp)assert(scan.aiohttpFindingsRemoved);assert(Date.now()-Date.parse(scan.date)<86400000);
 for(const r of g.rows.filter(r=>r.oldImage!==r.newImage))assert.equal(scan.imageId,r.newImage);
 if(g.status==='passed'){await checkExistingGroup(g,'new');continue;}assert.equal(g.status,'prepared');
 const s=fs.statfsSync(output);assert(s.bavail*s.bsize>=8*1024**3,'8 GiB reserve');
 const validate=version=>{const c=config(g);for(const r of g.rows){assert.equal(c[r.service].image,r[version+'Ref']);assert.equal(hash(c[r.service]),r.configHash);assert.equal(image(r.newRef),r.newImage);assert.equal(image(r.oldRef),r.oldImage);}};
 let reverting=false;
 await releaseGroup(g,{preflight:async()=>{validate('old');await checkExistingGroup(g,'old');},save,recreate:async()=>{if(!reverting)pins(g,'new');validate(reverting?'old':'new');await recreateExistingGroup(g);},gate:async version=>{await checkExistingGroup(g,version);assert.equal(await publicStatus(key),g.publicBefore,'Public route changed');},rollbackPins:()=>{reverting=true;pins(g,'old');validate('old');}});
 g.completedAt=new Date().toISOString();save();console.log(key+': deployed, exact image/health/route/namespace gates passed');
}
report.status=report.groups.length===specs.length&&report.groups.every(g=>g.status==='passed')?'passed':'partial';report.updatedAt=new Date().toISOString();save();
