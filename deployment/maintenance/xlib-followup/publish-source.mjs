// Explicit corresponding-source allowlist; never publish build logs or private state.
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);assert.deepEqual(process.argv.slice(2),['--publish']);
const root='/var/lib/utilibre-maintenance/xlib-followup-20261012',here=new URL('.',import.meta.url).pathname;
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p));
const proof=read(root+'/source-checks.json');assert(proof.passed&&proof.sources.length===6);
const release=read(root+'/release.json');assert.equal(release.groups.length,3);assert(release.groups.every(g=>['prepared','passed'].includes(g.status)));
const temp=fs.mkdtempSync(root+'/source-offer-'),files=[];
const copy=(from,to)=>{assert(!path.isAbsolute(to)&&!to.split('/').includes('..'));assert(fs.lstatSync(from).isFile());const dest=temp+'/'+to;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(from,dest);fs.chmodSync(dest,0o644);files.push({path:to,sha256:sha(dest)});};
try{
 for(const s of proof.sources)for(const f of s.archives){const from=root+'/sources/'+s.suite+'/'+s.package+'/'+f.file;assert.equal(sha(from),f.sha256);copy(from,'sources/'+s.suite+'/'+s.package+'/'+f.file);}
 for(const p of read(here+'specs.json').patches){const from=root+'/patches/'+p.cve+'.patch';assert.equal(sha(from),p.sha256);copy(from,'patches/'+p.cve+'.patch');}
 for(const suite of ['trixie','bookworm'])copy(root+'/build/'+suite+'/build-packages.txt','build-locks/'+suite+'.txt');
 for(const name of ['README.md','specs.json','roles.json','acquire.mjs','prepare.mjs','inner.sh','build.sh','verify-source.mjs','Dockerfile','stage.mjs','check-breezewiki.mjs','check-penpot.mjs','check-gathio.mjs','acquire-host.mjs','native-host.mjs','release-host.mjs','release.mjs','policy.mjs','policy.test.mjs','publish-source.mjs'])copy(here+name,'recipes/'+name);
 for(const name of ['xserver-followup/authenticate-dhi.mjs','xserver-followup/dhi-policy.mjs','xserver-followup/review.sources','python-bookworm-followup/review.sources','check-liberaforms-cairosvg.mjs','penpot-2.18.3/check-runtime-native.py','check-penpot-2.18.3.mjs','bookworm-curl-followup/policy.mjs','language-final/release.mjs','go-final/release.mjs'])copy(here+'../'+name,'shared/'+name);
 fs.writeFileSync(temp+'/SHA256SUMS',files.map(f=>f.sha256+'  '+f.path).join('\n')+'\n');
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),files,reproduction:'Complete authenticated original native sources plus exact upstream patch series and recipes. Recreate source with recipes/prepare.mjs (adjust work paths to a fresh isolated area); build under the pinned native image and dependency locks. Original source licenses/notices retained in archives. Shared helper snapshots are included; the current full Utilibre integration source offer provides remaining common test/release tooling. No compiled binary, operational log, secret or user data included.'},null,2)+'\n');
 const filename='security-xlib-followup-20261012-source.tar.gz',archive=root+'/'+filename;assert(!fs.existsSync(archive));
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public'])assert(!fs.existsSync(base+'/'+filename));
 cp.execFileSync('tar',['--owner=0','--group=0','--sort=name','-czf',archive,'-C',temp,'.'],{timeout:60000});
 const result={date:new Date().toISOString(),filename,bytes:fs.statSync(archive).size,sha256:sha(archive),published:true,indexNotRepublished:true};
 for(const base of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){fs.copyFileSync(archive,base+'/'+filename+'.tmp');fs.chmodSync(base+'/'+filename+'.tmp',0o644);fs.renameSync(base+'/'+filename+'.tmp',base+'/'+filename);}
 fs.writeFileSync(root+'/source-offer.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('source-offer-'));fs.rmSync(temp,{recursive:true});}
