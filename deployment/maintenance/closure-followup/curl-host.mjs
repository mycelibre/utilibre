// Host native library update. Exact APT plan and signed rollback are required.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012',file=dir+'/curl-host.json';
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive',NEEDRESTART_MODE:'l'},...o}).trim();
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const oldNames=['curl','libcurl4t64','libcurl3t64-gnutls','libnghttp3-9','libngtcp2-16','libngtcp2-crypto-gnutls8'];
const newNames=['libcurl4-gnutls','libngtcp2-crypto-ossl0'];
const versions=()=>Object.fromEntries(oldNames.map(p=>[p,run('dpkg-query',['-W','-f=${Version}',p])]));
const pids=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','--value','--property','MainPID',s])]));
const save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
const simulate=rows=>{const text=run('apt-get',['--simulate','--no-install-recommends','install',...rows.map(r=>r.next)]);assert(!/^Remv /m.test(text));assert.deepEqual(text.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]).sort(),[...oldNames,...newNames].sort());return text;};
const library='/usr/lib/x86_64-linux-gnu/';
if(mode==='prepare'){
 assert(!fs.existsSync(file));assert.equal(run('dpkg',['--audit']),'');
 const build=JSON.parse(fs.readFileSync(dir+'/curl/curl-expanded-breezewiki/build.json')),native=JSON.parse(fs.readFileSync(dir+'/curl/curl-expanded-breezewiki/native.json'));
 assert(build.passed&&native.passed&&native.abiPreserved);assert(native.nativeTransfers.every(x=>x.passed));assert.equal(build.imageId,native.imageId);
 const old=versions();assert(oldNames.every(p=>old[p].startsWith(p.startsWith('libnghttp3')?'1.8.0':p.startsWith('libngtcp2')?'1.11.0':'8.14.1')));
 const rollback=dir+'/rollback/curl';fs.mkdirSync(rollback,{recursive:true});
 const apt=['-o','Dir::Etc::sourcelist=/home/ubuntu/freetools/deployment/maintenance/closure-followup/review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists='+dir+'/apt-lists'];
 run('apt-get',[...apt,'download',...oldNames.map(p=>p+'='+old[p])],{cwd:rollback});
 const rows=build.packages.map(p=>{
  const next=p.dir+'/'+p.file;assert.equal(sha(next),p.sha256);let prior=null;
  if(oldNames.includes(p.name)){
   prior=fs.readdirSync(rollback).filter(f=>f.endsWith('.deb')).map(f=>rollback+'/'+f).find(f=>run('dpkg-deb',['-f',f,'Package'])===p.name);assert(prior);assert.equal(run('dpkg-deb',['-f',prior,'Version']),old[p.name]);
   assert(run('apt-cache',[...apt,'show',p.name+'='+old[p.name]]).includes('SHA256: '+sha(prior)));
  }else assert(newNames.includes(p.name));
  return {name:p.name,next,nextSha256:p.sha256,prior,priorSha256:prior?sha(prior):null};
 });
 assert.deepEqual(rows.map(r=>r.name).sort(),[...oldNames,...newNames].sort());simulate(rows);
 // Native stage proved the same old host library symbols and new payloads.
 for(const a of build.abi)assert.equal(sha(a.path),a.oldSha256);
 assert.equal(fs.readlinkSync(library+'libcurl-gnutls.so.3'),'libcurl-gnutls.so.4');
 save({date:new Date().toISOString(),status:'prepared',old,rows,abi:build.abi,legacyGnutlsAlias:true,servicePids:pids(),libcSha256:sha(library+'libc.so.6'),candidate:build.imageId});
 console.log('Host curl: exact six replacements and two native companion packages prepared; signed rollback retained.');
}else{
 const r=JSON.parse(fs.readFileSync(file));assert.equal(r.status,'prepared');assert(Date.now()-Date.parse(r.date)<86400000);assert.deepEqual(versions(),r.old);assert.deepEqual(pids(),r.servicePids);
 for(const row of r.rows){assert.equal(sha(row.next),row.nextSha256);if(row.prior)assert.equal(sha(row.prior),row.priorSha256);}
 simulate(r.rows);assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);r.status='applying';save(r);
 try{
  run('apt-get',['--yes','--no-install-recommends','-o','Dpkg::Options::=--force-confold','install',...r.rows.map(x=>x.next)]);
  assert(r.legacyGnutlsAlias);assert(!fs.existsSync(library+'libcurl-gnutls.so.3'));fs.symlinkSync('libcurl-gnutls.so.4',library+'libcurl-gnutls.so.3');
  assert.equal(run('dpkg',['--audit']),'');assert.equal(sha(library+'libc.so.6'),r.libcSha256);assert.deepEqual(pids(),r.servicePids);
  for(const a of r.abi){assert.equal(sha(a.path),a.newSha256);assert(!/not found|undefined symbol/.test(run('ldd',['-r',a.path])));}
  assert.match(run('curl',['--version']),/^curl 8\.22\.0 /);
  const text=run('curl',['--silent','--fail','--proto','=file','file:///etc/debian_version']);assert.equal(text,fs.readFileSync('/etc/debian_version','utf8').trim());
  r.status='passed';r.libcAndServicePidsUnchanged=true;r.nativeFileTransfer=true;
 }catch(e){
  fs.writeFileSync(dir+'/curl-host-error.log',String(e.stdout||'')+String(e.stderr||e));r.status='failed';save(r);
  const args=['--allow-downgrades','--no-install-recommends','install',...r.rows.filter(x=>x.prior).map(x=>x.prior),...newNames.map(p=>p+'-')];
  const plan=run('apt-get',['--simulate',...args]);assert.deepEqual(plan.split('\n').filter(l=>l.startsWith('Remv ')).map(l=>l.split(' ')[1]).sort(),[...newNames].sort());
  run('apt-get',['--yes','-o','Dpkg::Options::=--force-confold',...args]);assert.deepEqual(versions(),r.old);assert.equal(run('dpkg',['--audit']),'');r.rollback='Exact original six packages restored; only the two new companions removed';save(r);throw Error('Host curl failed; exact signed rollback verified');
 }
 r.completedAt=new Date().toISOString();save(r);console.log('Host native curl updated; library ABI/payload, local transfer and unchanged Docker/SSH/libc checks passed.');
}
