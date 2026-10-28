// Fixed upstream native code only, with exact live payload and release proof.
import fs from 'node:fs';import cp from 'node:child_process';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {validateDecision} from '../triage.mjs';import {freshScan,overlayRows} from '../review-native-backports.mjs';
import {curlFixedUpstream} from './curl-policy.mjs';
import {additionalOverlayReceipts} from '../followup-overlays.mjs';
process.umask(0o077);
const flags=process.argv.slice(2);assert(flags.length<=2&&new Set(flags).size===flags.length&&flags.every(f=>['--bookworm','--oct28'].includes(f)));
const bookworm=flags.includes('--bookworm'),oct28=flags.includes('--oct28'),upstreamVersion=oct28?'8.23.0':'8.22.0';
const root='/var/lib/utilibre-maintenance',dir=root+'/closure-followup-20261012',version=upstreamVersion+(bookworm?'-1~deb12u1+utilibre1':'-1~deb13u1+utilibre1');
const batch=root+'/security-20261028';
const build=oct28?(bookworm?batch+'/curl-bookworm/build':batch+'/curl-trixie'):(bookworm?root+'/bookworm-curl-followup-20261012/build':dir+'/curl-trixie');
const reportName=(oct28?'oct28-':'')+(bookworm?'bookworm-curl-review.json':'curl-review.json');
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const queue=read(root+'/security-queue.json'),scan=read(root+'/security.json'),primary=read(dir+'/debian-primary.json');freshScan(queue,scan);assert.equal(scan.status,'checked');assert(Date.now()-Date.parse(primary.date)<86400000);
const release=read(oct28?batch+(bookworm?'/curl-bookworm/release.json':'/curl/release.json'):dir+(bookworm?'/bookworm-curl-release.json':'/curl-release.json'));assert.equal(release.status,'passed');const rows=overlayRows(release);
if(!oct28&&!bookworm&&fs.existsSync(dir+'/python-system-release.json')){
 const next=read(dir+'/python-system-release.json');assert.equal(next.status,'passed');
 for(const row of overlayRows(next)){if(row.oldImage===row.newImage)continue;assert(rows.some(r=>r.name===row.name&&r.newImage===row.oldImage));rows.push(row);}
}
if(bookworm&&!oct28){
 const rss=read(dir+'/rssbridge-curl-release.json');assert.equal(rss.status,'passed');rows.push(...overlayRows(rss));
}
for(const receipt of additionalOverlayReceipts)if(fs.existsSync(root+'/'+receipt)){
  for(const next of overlayRows(read(root+'/'+receipt)))if(next.oldImage!==next.newImage&&rows.some(r=>r.name===next.name&&r.newImage===next.oldImage))rows.push(next);
}
const hostDirectory=oct28?batch:dir;const host=!bookworm&&fs.existsSync(hostDirectory+'/curl-host.json')?read(hostDirectory+'/curl-host.json'):null;
const sums=new Map(fs.readFileSync(build+'/SHA256SUMS','utf8').trim().split('\n').map(l=>[path.basename(l.slice(66)),l.slice(0,64)]));
const debs=new Map(fs.readdirSync(build).filter(f=>f.endsWith('_amd64.deb')).map(f=>[run('dpkg-deb',['-f',build+'/'+f,'Package']),f]));
const decisions=[],proofs=[],skipped=[],payloads=new Map();
const oldMappings=[];for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)))try{if(fs.readFileSync('/proc/'+pid+'/cgroup','utf8').includes('docker'))continue;if(/libcurl[^\n]+\(deleted\)/.test(fs.readFileSync('/proc/'+pid+'/maps','utf8')))oldMappings.push(pid);}catch{}
function files(d,p=''){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(d+'/'+e.name,p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]);}
for(const item of queue.items.filter(i=>i.status==='needs-review'&&i.type==='debian'&&i.installed===version&&(bookworm?['curl','libcurl4','libcurl3-gnutls']:['curl','libcurl4t64','libcurl4-gnutls','libcurl3t64-gnutls']).includes(i.package))){
 try{
  const isHost=item.scope==='host-os';assert(isHost||item.scope==='runtime-image');
  if(isHost){assert.equal(host?.status,'passed');const live=read(hostDirectory+'/curl-host-live.json');assert(live.passed&&live.rows.length===3&&live.rows.every(x=>x.passed&&x.checks===7));assert.equal(oldMappings.length,0);assert(Date.parse(host.completedAt)<=Date.parse(live.date)&&Date.parse(live.date)<=Date.parse(scan.date));}
  else for(const name of item.containers){const row=rows.find(r=>r.name===name&&r.newImage===item.artifact);assert(row&&Date.parse(row.completedAt)<=Date.parse(scan.date));assert.equal(run('docker',['inspect','--format','{{.Image}}',name]),item.artifact);}
  const fixed=primary.sources.curl?.[item.id]?.releases?.sid;assert.equal(fixed?.status,'resolved');assert(fixed.fixed_version&&fixed.fixed_version!=='0');
  const upstream=curlFixedUpstream(fixed.fixed_version);run('dpkg',['--compare-versions',upstreamVersion,'ge',upstream]);
  // Transitional GnuTLS inventory is checked against its actual new provider.
  const pkg=item.package==='libcurl3t64-gnutls'?'libcurl4-gnutls':item.package;
  if(!payloads.has(pkg)){
   const f=debs.get(pkg);assert(f);const deb=build+'/'+f;assert.equal(sha(deb),sums.get(f));
   const temp=fs.mkdtempSync('/dev/shm/utilibre-curl-proof-');try{run('dpkg-deb',['-x',deb,temp]);const paths=files(temp).filter(p=>p==='/usr/bin/curl'||/^\/usr\/lib\/.*libcurl.*\.so\.\d/.test(p));assert(paths.length);payloads.set(pkg,{debSha256:sha(deb),files:paths.map(p=>({path:p,sha256:sha(temp+p)}))});}finally{fs.rmSync(temp,{recursive:true});}
  }
  const payload=payloads.get(pkg);
  if(isHost&&oct28){const b=read(batch+'/curl/curl-expanded-breezewiki/build.json'),n=read(batch+'/curl/curl-expanded-breezewiki/native.json');assert(b.passed&&n.passed&&n.abiPreserved&&n.upstreamSuites.length===2&&n.upstreamSuites.every(t=>t.passed===t.reported&&t.passed>1800));assert(host.libcAndServicePidsUnchanged&&host.nativeFileTransfer&&host.rows.length===4);for(const row of host.rows){assert.equal(sha(row.next),row.nextSha256);assert.equal(sha(row.prior),row.priorSha256);}assert.equal(host.candidate,b.imageId);}
  if((bookworm||oct28)&&!isHost){
   const specs=oct28?read(new URL('../security-20261028/'+(bookworm?'curl-bookworm':'curl')+'-inputs.json',import.meta.url)).rows:read(new URL('../bookworm-curl-followup/specs.json',import.meta.url));
   for(const name of item.containers){
    const spec=specs.find(s=>s.containers.includes(name));assert(spec);
    const proofDir=oct28?batch+(bookworm?'/curl-bookworm/images/':'/curl/')+spec.key:root+'/bookworm-curl-followup-20261012/images/'+spec.key;
    const b=read(proofDir+'/build.json'),n=read(proofDir+'/native.json');
    assert(b.passed&&b.configurationUnchanged&&n.passed&&n.abiPreserved);
    assert.equal(n.imageId,b.imageId);assert.equal(b.version,version);
    assert(rows.some(r=>r.name===name&&r.newImage===b.imageId),'Required original tested release');
    if(oct28){assert.equal(b.base,spec.base);assert.equal(b.candidate,spec.candidate);assert(b.applicationSha256&&b.etcSha256&&b.unrelatedLibrariesSha256);}
    else {const a=read(proofDir+'/application.json');assert(a.passed);assert.equal(a.imageId,b.imageId);}
    if(bookworm)assert(n.sshDefaultProtocolWrongKeyRejectedBothTls);
    assert(n.upstreamSuites.length===2&&n.upstreamSuites.every(t=>t.passed===t.reported&&t.passed>1800));
    assert(n.nativeTransfers.length>=2&&n.nativeTransfers.every(t=>t.passed&&t.checks===7));
    if(spec.key==='rssbridge'){
     const imp=read(proofDir+'/impersonate.json');assert(imp.passed&&imp.imageId===b.imageId&&imp.release===(oct28?'v2.3.1':'v2.2.3'));
     assert(imp.proofs.length===2&&imp.proofs.every(p=>p.http2Negotiated&&p.chrome131Preserved&&p.unsupportedProtocolsRejected&&p.fictionalGithubHttpsToAtom));
     assert.equal(run('docker',['exec',name,'sha256sum','/usr/local/lib/curl-impersonate/libcurl-impersonate.so']).split(/\s/)[0],imp.newLibrarySha256);
     assert.equal(run('docker',['exec',name,'php','-r','echo curl_version()["version"];']),upstreamVersion+'-IMPERSONATE');
    }
   }
  }
  for(const name of isHost?[null]:item.containers){const cmd=(p,a)=>name?run('docker',['exec',name,p,...a]):run(p,a);assert.equal(cmd('dpkg-query',['-W','-f=${Version}',item.package]),version);assert.equal(cmd('dpkg-query',['-W','-f=${Version}',pkg]),version);for(const f of payload.files)assert.equal(cmd('sha256sum',[f.path]).split(/\s/)[0],f.sha256);}
  const reason=`Native signed upstream curl ${upstreamVersion} fixes ${item.id}; Debian's primary tracker resolves its source at ${fixed.fixed_version}. Actual ${pkg} ${version} executable/library payload matches native package SHA256 ${payload.debSha256}. Both upstream TLS suites, old/new loopback HTTP redirects/gzip/POST/TLS validation/rejection, ABI and unchanged app/config gates passed before the completed exact-image release. Only native Debian packaging/build flags differ from signed upstream. https://security-tracker.debian.org/tracker/${item.id} ; https://curl.se/docs/vuln-${upstreamVersion}.html . Proof: closure-followup-20261012/${reportName}.${bookworm?' RSS-Bridge additionally retains its separately byte-checked upstream impersonation library, native HTTPS/HTTP2 and protocol restrictions.':''} Does not clear GnuTLS, unrelated dependencies or untested QUIC paths.`;
  decisions.push(validateDecision({key:item.key,status:'mitigated',reason,expiresAt:new Date(Date.now()+7*86400000).toISOString()}));proofs.push({key:item.key,artifact:item.artifact,fixedVersion:fixed.fixed_version,...payload});
 }catch(e){skipped.push({key:item.key,id:item.id,reason:e.message.slice(0,180)});}
}
fs.writeFileSync(dir+'/'+reportName,JSON.stringify({date:new Date().toISOString(),scanDate:scan.completedAt,applied:false,decisions,proofs,skipped},null,2)+'\n');console.log(JSON.stringify({prepared:decisions.length,skipped:skipped.length,applied:false}));
