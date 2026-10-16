// Read-only proof for the four completed runtime reductions and the unrelated
// Penpot Compose hash change. Does NOT apply decisions or refresh upstreams.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {partitionReviewed,runtimeEvidenceFormat} from '../../../scripts/review-upstream-maintenance.mjs';
const sha=data=>createHash('sha256').update(data).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const maintenance='/var/lib/utilibre-maintenance/';
const evidence=maintenance+'runtime-gnutls-minimization-20261012/';
const production='/home/ubuntu/freetools/';
const ids={actual:'actual',resume:'reactive-resume',wishlist:'wishlist',cryptpad:'cryptpad'};
const command=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:10000,maxBuffer:1024**2});

export function verifyOverlay(group,prior,build,app,before,after,oldLayers,newLayers,owned){
 assert.equal(group.status,'passed');assert.equal(prior.containers['/'+group.name],group.oldImage);
 assert.equal(build.base,group.oldImage);assert.equal(build.imageId,group.newImage);
 for(const flag of ['passed','configurationUnchanged','filesystemParity'])assert.equal(build[flag],true,flag);
 assert.equal(app.passed,true);assert.equal(app.imageId,group.newImage);
 assert.deepEqual(build.packageRemovalExact,['apt','libgnutls30:amd64']);
 assert.deepEqual(Object.keys(build.packagesBefore).filter(p=>!Object.hasOwn(build.packagesAfter,p)).sort(),build.packageRemovalExact);
 for(const [p,v] of Object.entries(build.packagesAfter))assert.deepEqual(v,build.packagesBefore[p]);
 assert(oldLayers.length>0&&newLayers.length>oldLayers.length,'Missing image ancestry');
 assert.deepEqual(newLayers.slice(0,oldLayers.length),oldLayers,'Image ancestry changed');
 const changed=[...new Set([...Object.keys(before),...Object.keys(after)])].filter(p=>JSON.stringify(before[p])!==JSON.stringify(after[p])).sort();
 assert.deepEqual(changed,build.changedPaths,'Retained manifests disagree with build receipt');
 // Recheck scope without trusting a generic `passed` flag. App files cannot
 // change; only apt/GnuTLS removal and dpkg/linker bookkeeping were approved.
 const bookkeeping=new Set(['/var/lib/dpkg/status','/var/lib/dpkg/status-old','/var/log/dpkg.log','/var/lib/dpkg/triggers/Unincorp','/var/cache/ldconfig/aux-cache','/etc/ld.so.cache']);
 assert(owned instanceof Set&&owned.size>0,'Package ownership evidence required');
 for(const prefix of ['/lib','/bin','/sbin','/lib64'])if(before[prefix]?.type==='2'&&before[prefix]?.link==='usr'+prefix)
  for(const p of [...owned])if(p.startsWith(prefix+'/'))owned.add('/usr'+p);
 for(const p of changed)assert(bookkeeping.has(p)||/^\/var\/lib\/dpkg\/info\/(apt\.|libgnutls30:amd64\.)/.test(p)||(!Object.hasOwn(after,p)&&owned.has(p)),'Unexpected changed file: '+p);
 return {image:group.newImage,parent:group.oldImage,changedFiles:changed.length,applicationTestDate:app.date};
}

function removedPackagePaths(image){
 assert(/^sha256:[a-f0-9]{64}$/.test(image));let cid;
 try{
  cid=command(['create','--pull','never','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--cpus','0.5','--memory','64m','--memory-swap','64m','--pids-limit','16','--log-driver','none','--entrypoint','dpkg-query',image,'-L','apt','libgnutls30']).trim();
  assert(/^[a-f0-9]{64}$/.test(cid));
  const result=command(['start','--attach',cid]);
  assert.equal(command(['inspect','--format','{{.State.ExitCode}}',cid]).trim(),'0');
  return new Set(result.trim().split('\n'));
 }finally{if(cid&&/^[a-f0-9]{64}$/.test(cid))command(['rm','--force','--volumes',cid]);}
}

export function verifyCompose(before,after){
 let expected=before;
 for(const service of ['actual','resume']){
  const needle=`image: utilibre-${service}:mount-security-20261012`;
  assert.equal(expected.split(needle).length,2,'Expected exactly one original image pin');
  expected=expected.replace(needle,`image: utilibre-${service}:runtime-minimal-20261012`);
 }
 assert.equal(after,expected,'Change beyond the two reviewed image references');
}

export function run(output){
 assert(typeof output==='string'&&output.startsWith('/')&&!fs.existsSync(output),'New absolute report path required');
 process.umask(0o077);
 const prior=read(production+'deployment/maintenance/advisory-reviews.json');
 const candidate=read(new URL('../advisory-reviews.json',import.meta.url));
 const latest=read(maintenance+'latest.json'),release=read(evidence+'release.json');
 assert.equal(release.status,'passed');assert.equal(release.groups.length,4);
 const proofs=[];
 for(const group of release.groups){
  const dir=evidence+'images/'+group.key+'/';
  assert.equal(sha(fs.readFileSync(dir+'build.json')),group.buildHash);
  assert.equal(sha(fs.readFileSync(dir+'application.json')),group.applicationHash);
  const oldLayers=JSON.parse(command(['image','inspect','--format','{{json .RootFS.Layers}}',group.oldImage]));
  const newLayers=JSON.parse(command(['image','inspect','--format','{{json .RootFS.Layers}}',group.newImage]));
  const proof=verifyOverlay(group,prior[ids[group.key]],read(dir+'build.json'),read(dir+'application.json'),read(dir+'filesystem-before.json'),read(dir+'filesystem-after.json'),oldLayers,newLayers,removedPackagePaths(group.oldImage));
  assert.deepEqual(candidate[ids[group.key]].containers,{['/'+group.name]:group.newImage});
  proofs.push({id:ids[group.key],...proof,buildHash:group.buildHash,applicationHash:group.applicationHash});
 }
 const compose=production+'deployment/expanded/compose.yaml';
 const before=fs.readFileSync(evidence+'_home_ubuntu_freetools_deployment_expanded_compose.yaml.before','utf8');
 assert.equal(sha(before),prior.penpot.files[compose]);
 verifyCompose(before,fs.readFileSync(compose,'utf8'));
 const penpot=[];
 for(const name of Object.keys(candidate.penpot.containers)){
  const pid=command(['inspect','--format','{{.State.Pid}}',name.slice(1)]).trim();assert(/^\d+$/.test(pid)&&pid!=='0');
  const ports=['tcp','tcp6'].flatMap(n=>fs.readFileSync(`/proc/${pid}/net/${n}`,'utf8').trim().split('\n').slice(1).filter(l=>l.trim().split(/\s+/)[3]==='0A').map(l=>parseInt(l.trim().split(/\s+/)[1].split(':').at(-1),16)));
  assert(!ports.includes(4403)&&!ports.includes(6063),'MCP/REPL listener found');
  // Values remain in memory; never print/store environment or credentials.
  if(/-(frontend|backend)-1$/.test(name)){
   const env=JSON.parse(command(['inspect','--format','{{json .Config.Env}}',name.slice(1)]));
   const flags=env.find(s=>s.startsWith('PENPOT_FLAGS='))?.slice(13).split(/\s+/)||[];
   assert(flags.includes('disable-mcp')&&flags.includes('disable-prepl-server'),'MCP/REPL prevention flags missing');
  }
  penpot.push({name,mcpAndPreplListenersAbsent:true});
 }
 const evaluations=[];
 for(const id of [...Object.values(ids),'penpot']){
  const review=candidate[id];
  assert.deepEqual(review.advisories,prior[id].advisories,'New or changed advisory decision needs its own review');
  assert.equal(review.version,prior[id].version);
  const names=Object.keys(review.containers).map(n=>n.slice(1));
  const live=command(['inspect','--format',runtimeEvidenceFormat,...names]).trim().split('\n').map(l=>JSON.parse(l));
  const files=Object.fromEntries(Object.keys(review.files||{}).map(p=>[p,sha(fs.readFileSync(p))]));
  const provider=latest.results.find(p=>p.id===id);assert.equal(provider.advisories.coverage,'repository-published');
  const result=partitionReviewed(provider.advisories.publishedHistory,review,live,files);
  assert.equal(result.needsReview.length,0,'Advisory or runtime binding changed');
  evaluations.push({id,reviewed:result.reviewed.length,needsReview:0});
 }
 const report={date:new Date().toISOString(),applied:false,productionChanged:false,upstreamSnapshotDate:latest.date,proofs,penpot,composeSha256:sha(fs.readFileSync(compose)),evaluations};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({report:output,evaluations,applied:false}));return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)run(process.argv[2]);
