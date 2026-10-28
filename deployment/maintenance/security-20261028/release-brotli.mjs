// Finite package-only deployment through existing transactional release gates.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
import https from 'node:https';
import {replaceImagePins,namespaceDependents,releaseGroup,existingComposeArgs,checkExistingGroup,recreateExistingGroup,existingGroupStatus} from '../language-final/release.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261028',flags=['--dnspython','--authlib','--alpine','--node-apk','--undici','--body','--go-helpers','--caddy','--go-runtime','--go-services','--node','--curl','--curl-bookworm'];
assert(process.argv.filter(a=>flags.includes(a)).length<=1);
const profile=process.argv.find(a=>flags.includes(a))?.slice(2)||'brotli',dns=profile==='dnspython',authlib=profile==='authlib',alpine=['alpine','node-apk'].includes(profile),undici=profile==='undici',body=profile==='body',go=['go-helpers','caddy','go-runtime','go-services'].includes(profile),node=profile==='node',curl=profile.startsWith('curl');
const specs=JSON.parse(fs.readFileSync(new URL('./'+profile+'-inputs.json',import.meta.url))).rows.flatMap(s=>s.releaseGroups?s.releaseGroups.map(g=>({...s,...g,evidenceKey:s.key})):[s]);
const evidence=(s)=>root+'/'+profile+(profile==='curl-bookworm'?'/images':'')+'/'+(s.evidenceKey||s.key);
const [mode,...keys]=process.argv.slice(2).filter(k=>!flags.includes(k));assert(['prepare','apply','retry'].includes(mode));assert(keys.length&&new Set(keys).size===keys.length&&keys.every(k=>specs.some(s=>s.key===k)));

const read=f=>JSON.parse(fs.readFileSync(f)),digest=b=>createHash('sha256').update(b).digest('hex');
const docker=(...a)=>{try{return cp.execFileSync('docker',a,{encoding:'utf8',timeout:180000,maxBuffer:16*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(root+'/brotli-command-error-'+Date.now()+'.log',String(e.stderr||e.message));throw Error('Bounded Docker operation failed; private diagnostics retained');}};
const format='{"Id":{{json .Id}},"Name":{{json .Name}},"Image":{{json .Image}},"Config":{"Labels":{{json .Config.Labels}},"Healthcheck":{{json (index .Config "Healthcheck")}}},"State":{"Running":{{json .State.Running}},"StartedAt":{{json .State.StartedAt}},"Health":{{json (index .State "Health")}}},"RestartCount":{{json .RestartCount}},"HostConfig":{"NetworkMode":{{json .HostConfig.NetworkMode}}}}';
const inspect=n=>JSON.parse(docker('inspect','--format',format,n)),image=n=>docker('image','inspect','--format','{{.Id}}',n);
const config=g=>JSON.parse(docker(...existingComposeArgs(g),'config','--format','json')).services;
const hash=s=>{const {image,...rest}=s;return digest(JSON.stringify(canonical(rest)));};
const file=root+'/'+profile+'/release.json',report=fs.existsSync(file)?read(file):{date:new Date().toISOString(),status:'partial',groups:[]};
const save=()=>{report.updatedAt=new Date().toISOString();report.status=report.groups.length===specs.length&&report.groups.every(g=>g.status==='passed')?'passed':'partial';fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');};
// Existing configured public homes only: no search terms, accounts or user data.
const urls={trip:'https://trip.utilibre.org/',wishlist:'https://wishlist.utilibre.org/',biblioreads:'https://biblioreads.utilibre.org/',cryptpad:'https://pad.utilibre.org/',spliit:'https://expenses.utilibre.org/',projects:'https://projects.utilibre.org/',gathio:'https://events.utilibre.org/',candlr:'https://candlr.utilibre.org/',bookplate:'https://bookplate.utilibre.org/','grist-undici':'https://grist.utilibre.org/',wbo:'https://collab.utilibre.org/','newsletters-web':'https://newsletters.utilibre.org/',resume:'https://cv.utilibre.org/',actual:'https://budget.utilibre.org/',linkding:'https://bookmarks.utilibre.org/',simplelogin:'https://simplelogin.utilibre.org/',authentik:'https://auth.utilibre.org/',freshrss:'https://rss.utilibre.org/',kuma:'https://status.utilibre.org/',liberaforms:'https://forms.utilibre.org/',priviblur:'https://tumblr.utilibre.org/',rallly:'https://poll.utilibre.org/',grist:'https://grist.utilibre.org/',penpot:'https://design.utilibre.org/',breezewiki:'https://wiki.utilibre.org/',kitchenowl:'https://kitchen.utilibre.org/',rssbridge:'https://bridge.utilibre.org/','gathio-postgres':'https://events.utilibre.org/',privatebin:'https://paste.utilibre.org/',wallabag:'https://wallabag.utilibre.org/',pairdrop:'https://drop.utilibre.org/',addy:'https://aliases.utilibre.org/',fourget:'https://4get.utilibre.org/',kittygram:'https://gram.utilibre.org/',degoog:'https://degoog.utilibre.org/',binternet:'https://binternet.utilibre.org/',translite:'https://translate.utilibre.org/',pollaris:'https://pollaris.utilibre.org/'};
Object.assign(urls,{beaverhabits:'https://habits.utilibre.org/',donetick:'https://chores.utilibre.org/',librespeed:'https://speed.utilibre.org/',yopass:'https://secret.utilibre.org/',fmd:'https://fmd.utilibre.org/','caddy-wishlist':urls.wishlist,'caddy-newsletters-web':urls['newsletters-web'],'ferretdb':urls.gathio,'oauth2-proxy':urls.grist,'ntfy':'https://notify.utilibre.org/v1/health','wakapi':'https://wakapi.utilibre.org/','mezzo':'https://tenor.utilibre.org/','grist-body':urls.grist,bytestash:'https://snippets-library.utilibre.org/',gathio:urls.gathio,'curl-expanded-breezewiki':urls.breezewiki,'curl-services-freshrss':urls.freshrss,'curl-linkding-linkding':urls.linkding,'curl-expanded-penpot-backend':urls.penpot,'curl-expanded-penpot-exporter':urls.penpot,'curl-kitchenowl-app':urls.kitchenowl,'curl-services-rsshub':null,'curl-records-grist':urls.grist,'curl-priviblur-priviblur':urls.priviblur});
async function publicStatus(key){if(!urls[key])return null;
 // Public IPv4 timed out from this VM. Check the existing Caddy address
 // with the real hostname, SNI and certificate verification; never disable TLS.
 // This is an edge-path check, explicitly not an outside-Internet observation.
 if(key==='librespeed')return new Promise((resolve,reject)=>{const req=https.get(urls[key],{lookup:(_host,options,cb)=>cb(null,options.all?[{address:'10.10.1.3',family:4}]:'10.10.1.3',4),timeout:10000},r=>{r.resume();resolve(r.statusCode);});req.on('timeout',()=>req.destroy(Error('Edge path timeout')));req.on('error',reject);});
 const r=await fetch(urls[key],{redirect:'manual',signal:AbortSignal.timeout(10000)});await r.body?.cancel();return r.status;}
async function nativeSimpleLogin(){const r=await fetch('http://127.0.0.1:3212/auth/login',{redirect:'manual',signal:AbortSignal.timeout(5000)});await r.body?.cancel();assert.equal(r.status,200);}
async function publicReady(g){
 // A running S6/Laravel container is not yet HTTP-ready. Bounded readiness
 // avoids declaring failure at four seconds and rolling back a healthy boot.
 for(let attempt=0;attempt<13;attempt++){
  try{assert.equal(await publicStatus(g.key),g.publicBefore);if(g.key==='simplelogin')await nativeSimpleLogin();return;}
  catch{if(attempt===12)throw Error(g.key+': public readiness failed within one minute');await new Promise(r=>setTimeout(r,5000));}
 }
}
function proof(key){const s=specs.find(s=>s.key===key),dir=evidence(s),b=read(dir+'/build.json'),scan=read(dir+'/scan-gate.json');
 assert(b.passed&&b.configurationUnchanged);
 if(profile==='caddy'){const a=read(root+'/caddy/'+(key==='caddy-wishlist'?'wishlist-stage':'newsletters-stage')+'.json');if(key==='caddy-wishlist')assert(a.imageId===b.imageId&&a.nativeAccountCreated&&a.anonymousListDenied);else assert(a.status==='passed'&&[a.webImage,a.smtpImage].includes(b.imageId)&&a.isolatedSmtpAccepted);}
 if(dns){const v=read(dir+'/inventory.json');assert(v.passed&&v.imageId===b.imageId);assert.deepEqual(v.changedPaths,b.changedFiles);assert(b.baseline.passed&&!b.baseline.excessiveChainRejected&&b.native.passed&&b.native.excessiveChainRejected&&b.native.maximumChainAccepted&&b.native.malformedCases===3&&b.native.consumerChecks===10&&b.unrelatedDependencyFilesUnchanged&&b.existingCertifiFixPreserved);}
 else if(authlib){const v=read(dir+'/inventory.json');assert(v.passed&&v.imageId===b.imageId);assert.deepEqual(v.changedPaths,b.changedFiles);assert(b.baseline.passed&&!b.baseline.emptySignaturesRejected&&b.native.passed&&b.native.emptySignaturesRejected&&b.native.tripOAuthFactory&&b.native.stateMismatchRejected&&b.unrelatedDependencyFilesUnchanged&&b.existingCertifiFixPreserved);}
 else if(go){const v=read(dir+'/inventory.json');assert(v.passed&&v.imageId===b.imageId&&JSON.stringify(v.changedPaths)===JSON.stringify(b.changedFiles));assert(b.native.passed&&b.native.imageId===b.imageId&&b.binaries.every(r=>r.binarySha256&&Number.isInteger(r.unchangedModules)));}
 else if(node){const n=read(dir+'/native.json');assert(n.passed&&n.imageId===b.imageId&&n.rows.length===2&&n.rows.every(r=>r.passed&&r.normalChecks===15));assert(n.rows[1].nulRejected&&n.rows[1].fullwidthRejected&&n.rows[1].looseRejected);assert(b.changedFiles.length===1&&b.changedFiles[0]===s.binary&&b.binarySha256===b.artifact.nodeSha256);}
 else if(curl){const n=read(dir+'/native.json');assert(n.passed&&n.imageId===b.imageId&&n.abiPreserved&&n.nativeTransfers.length>=2&&n.nativeTransfers.every(t=>t.passed&&t.checks===7));assert(b.abi.length>0&&b.applicationSha256&&b.etcSha256&&b.unrelatedLibrariesSha256);}
 else if(body){assert(b.unchangedOtherAppFiles>0);const n=read(dir+'/native.json'),paths=Object.keys(s.before).filter(p=>p.endsWith('/body-parser'));assert(n.passed&&n.imageId===b.imageId&&n.dependencies.length>0&&n.rows.length===paths.length*4);for(const path of paths){assert(n.rows.some(r=>r.path===path&&r.imageId===s.base&&r.regressionReproduced));assert(n.rows.filter(r=>r.path===path&&r.imageId===b.imageId).every(r=>r.passed));}}
 else if(undici){
  assert(b.unchangedOtherAppFiles>0&&b.changedFiles>0);const paths=Object.keys(s.before);
  for(const f of ['native','encoding']){const n=read(dir+'/'+f+'.json');assert(n.passed&&n.imageId===b.imageId&&n.rows.length===paths.length*2);for(const path of paths){const old=n.rows.find(r=>r.imageId===s.base&&r.path===path),fixed=n.rows.find(r=>r.imageId===b.imageId&&r.path===path);assert(old&&fixed);if(f==='native')assert(old.normalPassed&&fixed.normalPassed&&!old.customTlsCallbackCalled&&fixed.customTlsCallbackCalled&&fixed.customTlsPinRejected);else assert(old.regressionReproduced&&old.exitCode!==0&&fixed.passed&&fixed.exitCode===0);}}
  if(['candlr','degoog'].includes(key)){const a=read(dir+'/app.json');assert(a.passed&&a.imageId===b.imageId&&a.applicationParity.length===2);}
 }else assert(b.unrelatedPackagesUnchanged&&(b.nativeRows.length===2||(alpine&&!s.packages['brotli-libs']))&&b.nativeRows.every(r=>r.passed));assert.equal(b.base,s.base);assert.equal(b.candidate,s.candidate);assert.equal(image(s.candidate),b.imageId);if(s.oldRef)assert.equal(image(s.oldRef),s.base);
 assert(scan.passed&&(scan.targetedFindingRemoved||((curl||node||dns)&&scan.primarySourceFixVerified))&&scan.newHighCritical===0);assert.equal(scan.imageId,b.imageId);assert.equal(scan.base,b.base);assert(Date.now()-Date.parse(scan.advisoryUpdatedAt)<48*3600000);assert(Date.now()-Date.parse(b.date)<86400000&&Date.now()-Date.parse(scan.date)<86400000);
 if(alpine){const c=read(dir+'/consumer.json');assert(c.passed&&c.imageId===b.imageId&&c.rows.length===2&&c.rows.every(r=>r.passed));if(key==='privatebin')assert(c.privatebinUploads.passed&&c.privatebinUploads.imageId===b.imageId);}
 if((body&&key==='grist-body')||(node&&key==='grist')){const app=read(dir+'/app.json');assert(app.passed&&app.imageId===b.imageId&&app.checks.length===3&&app.checks.every(r=>r.passed));}
 if((body||node)&&key==='actual'){const app=read(dir+'/app.json');assert(app.passed&&app.imageId===b.imageId&&app.rows.length===2&&app.rows.every(r=>r.passed&&r.health===200));}
 if(key==='rssbridge'){if(curl){const c=read(dir+'/impersonate.json');assert(c.passed&&c.imageId===b.imageId&&c.release==='v2.3.1'&&c.removedMask===0&&c.removedProtocols.length===0&&c.proofs.length===2&&c.proofs.every(r=>r.http2Negotiated&&r.fictionalGithubHttpsToAtom&&r.chrome131Preserved));}else{const c=read(dir+'/consumer.json');assert(c.passed&&c.imageId===b.imageId&&c.rows.length===2&&c.rows.every(r=>r.fictionalFeed&&r.http2Negotiated));}}
 return {s,b,scan};}
function pins(g,version){const pairs=g.rows.filter(r=>r.oldRef!==r.newRef).map(r=>({from:r[version==='new'?'oldRef':'newRef'],to:r[version+'Ref']}));const edits=g.files.map(f=>({f,...replaceImagePins(fs.readFileSync(f,'utf8'),pairs)}));assert(edits.reduce((n,e)=>n+e.replaced,0)>=1,'No exact image scalar');for(const e of edits)if(e.replaced)fs.writeFileSync(e.f,e.text);}
if(mode==='prepare')for(const key of keys){
 assert(!report.groups.some(g=>g.key===key),'Preserve existing receipt');const {s,b,scan}=proof(key),first=inspect(s.containers[0]),l=first.Config.Labels;
 const g={key,project:l['com.docker.compose.project'],cwd:l['com.docker.compose.project.working_dir'],files:l['com.docker.compose.project.config_files'].split(','),rows:[],status:'prepared',preparedAt:new Date().toISOString(),evidence:evidence(s),remainingHigh:scan.remainingHigh,remainingCritical:scan.remainingCritical};
 const all=docker('inspect','--format',format,...docker('ps','-q','--filter','label=com.docker.compose.project').split('\n')).split('\n').map(JSON.parse),dependent=namespaceDependents(all,new Set(s.containers)),cfg=config(g);
 for(const name of [...s.containers,...dependent.map(d=>d.container.Name.slice(1))]){
  const x=all.find(x=>x.Name==='/'+name),labels=x.Config.Labels;assert.equal(labels['com.docker.compose.project'],g.project,'Unreviewed cross-project companion');const service=labels['com.docker.compose.service'],c=cfg[service],selected=s.containers.includes(name);assert.equal(image(c.image),x.Image);if(selected)assert.equal(x.Image,s.base);
  const parent=all.find(p=>'container:'+p.Id===x.HostConfig.NetworkMode)?.Name.slice(1);assert(Date.now()-Date.parse(x.State.StartedAt)>300000);
  g.rows.push({name,service,oldContainerId:x.Id,oldRestartCount:x.RestartCount,oldRef:c.image,oldImage:x.Image,newRef:selected?s.candidate:c.image,newImage:selected?b.imageId:x.Image,configHash:hash(c),...(parent?{namespaceParent:parent}:{})});
 }
 g.before=await existingGroupStatus(g);await checkExistingGroup(g,'old');g.publicBefore=await publicStatus(key);
 if(key==='librespeed')g.routeCheck='Existing Caddy private address with public Host/SNI and verified TLS. Direct public IPv4 times out from this VM; outside-Internet reachability not established here.';
 if(key==='simplelogin'&&g.publicBefore===502){await nativeSimpleLogin();g.publicPreExistingFailure='Existing public 502, also documented in certifi-20261021 rollout. Native login gateway returns 200; library repair does not repair the separate edge route.';}
 else assert(g.publicBefore===null||g.publicBefore>=200&&g.publicBefore<500,'Public baseline unavailable; investigate first');
 report.groups.push(g);save();console.log(key+': candidate and baseline verified; prepared without live changes');
}
if(mode==='retry')for(const key of keys){
 proof(key);const g=report.groups.find(g=>g.key===key);assert(g&&g.status==='failed');
 await checkExistingGroup(g,'old');await publicReady(g);const c=config(g);
 for(const r of g.rows){assert.equal(c[r.service].image,r.oldRef);assert.equal(hash(c[r.service]),r.configHash);}
 g.attempts=[...(g.attempts||[]),{status:g.status,rollback:g.rollback,verifiedRollbackAt:new Date().toISOString(),reason:'Old image, unchanged configuration and public route reverified after startup; bounded HTTP readiness now required.'}];
 g.status='prepared';g.preparedAt=new Date().toISOString();delete g.rollback;save();console.log(key+': rollback verified, retry prepared without changing production');
}
if(mode==='apply')for(const key of keys){
 const {b}=proof(key),g=report.groups.find(g=>g.key===key);assert(g&&Date.now()-Date.parse(g.preparedAt)<86400000);for(const r of g.rows.filter(r=>r.oldImage!==r.newImage))assert.equal(r.newImage,b.imageId);
 if(g.status==='passed'){await checkExistingGroup(g,'new');continue;}assert.equal(g.status,'prepared');assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>=8*1024**3);
 const validate=version=>{const c=config(g);for(const r of g.rows){assert.equal(c[r.service].image,r[version+'Ref']);assert.equal(hash(c[r.service]),r.configHash);assert.equal(image(r.newRef),r.newImage);assert.equal(image(r.oldRef),r.oldImage);}};
 let reverting=false;await releaseGroup(g,{preflight:async()=>{validate('old');await checkExistingGroup(g,'old');},save,recreate:async()=>{if(!reverting)pins(g,'new');validate(reverting?'old':'new');await recreateExistingGroup(g);},gate:async version=>{await checkExistingGroup(g,version);await publicReady(g);},rollbackPins:()=>{reverting=true;pins(g,'old');validate('old');}});
 g.completedAt=new Date().toISOString();save();console.log(key+': deployed; exact artifact, health, namespace and route gates passed');
}
