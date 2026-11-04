// Reuse existing authenticated packages and native fixtures. No daemon restart.
// stage writes only the library package; verify requires all old users gone.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{inventory}from'../component-followup/inventory.mjs';
import{payloadManifest,validatePayload}from'../vendor-leaves-final/dhi-proof.mjs';
process.umask(0o077);const mode=process.argv[2];assert(['prepare','stage','verify'].includes(mode)&&process.argv.length===3);
const root='/var/lib/utilibre-maintenance/security-20261103',dir=root+'/expat-host',here=new URL('.',import.meta.url).pathname;
fs.mkdirSync(dir,{recursive:true});const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const spec=read(here+'expat-debian-inputs.json').packages.trixie,pins=read(here+'expat-debian-fixture.json');
const previous={file:'/var/lib/utilibre-maintenance/closure-followup-20261012/sources/libexpat1_2.9.0-1_amd64.deb',sha256:'190d7f5e45f070c42a12f708fe417d6636cb45fae71175203168bb5c3695081b',version:'2.9.0-1'};
const candidate=root+'/packages/trixie/'+spec.file;
const run=(p,a,o={})=>{try{return cp.execFileSync(p,a,{encoding:'utf8',timeout:45000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],env:{PATH:'/usr/sbin:/usr/bin:/sbin:/bin',LANG:'C.UTF-8'},...o}).trim();}catch(e){fs.writeFileSync(dir+'/error-'+Date.now()+'.log',String(e.stdout||'')+String(e.stderr||e));throw Error('Host Expat gate failed; private diagnostics retained');}};
const actual=()=>inventory('libexpat1').records.filter(r=>r.type!=='directory').map(r=>r.type==='regular'?{path:r.path,type:'file',sha256:r.sha256}:r.type==='symlink'?{path:r.path,type:'symlink',target:r.target}:r).sort((a,b)=>a.path.localeCompare(b.path));
const version=()=>run('dpkg-query',['-W','-f=${Version}','libexpat1']);
const otherPackages=()=>run('dpkg-query',['-W','-f=${binary:Package}=${Version}\n']).split('\n').filter(l=>!/^libexpat1(?::amd64)?=/.test(l)).sort();
const services=()=>run('systemctl',['show','docker.service','ssh.service','qemu-guest-agent.service','dbus.service','-p','Id','-p','MainPID']);
const mappings=()=>{const rows=[];for(const pid of fs.readdirSync('/proc').filter(p=>/^\d+$/.test(p)))try{const cgroup=fs.readFileSync('/proc/'+pid+'/cgroup','utf8');if(/docker|containerd/.test(cgroup))continue;const lines=fs.readFileSync('/proc/'+pid+'/maps','utf8').split('\n').filter(l=>/\/libexpatw?\.so\./.test(l));if(lines.length)rows.push({pid:Number(pid),unit:cgroup.trim(),files:[...new Set(lines.map(l=>l.slice(l.indexOf('/'))))]});}catch(e){if(!['ENOENT','ESRCH'].includes(e.code))throw e;}return rows;};
assert.equal(sha(candidate),spec.sha256);assert.equal(sha(previous.file),previous.sha256);assert.equal(run('dpkg',['--audit']),'');
assert(fs.statfsSync(root).bavail*fs.statfsSync(root).bsize>8*1024**3);
const fixture=root+'/expat-debian/fixture';for(const [file,hash]of [['native',pins.binarySha256],['wide',pins.wideBinarySha256]])assert.equal(sha(fixture+'/'+file),hash);
assert.equal(sha(here+'expat-native.c'),pins.sourceSha256);assert.equal(sha(here+'expat-wide.c'),pins.wideSourceSha256);
const work=fs.mkdtempSync('/tmp/utilibre-expat-host-');fs.chmodSync(work,0o755);
try{
 for(const [name,file]of [['old',previous.file],['new',candidate]]){run('dpkg-deb',['-x',file,work+'/'+name]);run('chmod',['-R','a+rX',work+'/'+name]);}
 const oldPayload=payloadManifest(work+'/old'),newPayload=payloadManifest(work+'/new');
 const proof={candidateSha256:spec.sha256,previousSha256:previous.sha256,fixtureSha256:sha(here+'expat-host-check.py'),oldPayload,newPayload};
 const abi=[];
 for(const name of ['libexpat','libexpatw']){const pair=[];for(const state of ['old','new']){const file=work+'/'+state+'/usr/lib/x86_64-linux-gnu/'+name+'.so.1';const syms=run('readelf',['--dyn-syms','--wide',file]).split('\n').map(l=>l.trim().split(/\s+/)).filter(f=>['GLOBAL','WEAK'].includes(f[4])&&f[6]!=='UND').map(f=>f[7]).sort();const needed=run('readelf',['-d',file]).split('\n').filter(l=>/\((?:SONAME|NEEDED)\)/.test(l)).map(l=>l.slice(l.indexOf('('))).sort();pair.push({sha256:sha(file),syms,needed});}assert(pair[0].syms.length>60&&pair[0].syms.every(x=>pair[1].syms.includes(x)));assert.deepEqual(pair[1].needed,pair[0].needed);abi.push({name,before:pair[0].sha256,after:pair[1].sha256});}
 for(const file of ['native','wide']){fs.copyFileSync(fixture+'/'+file,work+'/'+file);fs.chmodSync(work+'/'+file,0o755);}fs.copyFileSync(here+'expat-host-check.py',work+'/check.py');fs.chmodSync(work+'/check.py',0o644);
 const check=state=>{const lib=(state==='live'?'':work+'/'+state)+'/usr/lib/x86_64-linux-gnu';const isolated=(cmd,args)=>run('unshare',['--net','prlimit','--core=0','--as=536870912','--cpu=30','--','runuser','-u','nobody','--','env','LD_LIBRARY_PATH='+lib,'PYTHONDONTWRITEBYTECODE=1',cmd,...args]);const native=isolated(work+'/native',[state==='old'?'before':'after']);assert.match(native,/^EXPAT_NATIVE_PASSED subparser=(completed|segfault)$/);assert.equal(isolated(work+'/wide',[]),'EXPAT_WIDE_PASSED');const consumer=JSON.parse(isolated('/usr/bin/python3',['-B',work+'/check.py',state==='old'?'2.9.0':'2.10.0']));assert(consumer.passed&&consumer.busCandidateMapping&&!consumer.productionBusContacted);return{native,wideChecks:3,consumer,network:'none'};};
 if(mode==='prepare'){
  assert(!fs.existsSync(dir+'/stage.json'));assert.equal(version(),previous.version);validatePayload(oldPayload,actual());const before={packages:otherPackages(),services:services()};
  const simulation=run('apt-get',['--simulate','--no-install-recommends','install',candidate]);assert.deepEqual([...simulation.matchAll(/^Inst (\S+)/gm)].map(m=>m[1]),['libexpat1']);assert(!/^Remv /m.test(simulation));
  const native={old:check('old'),candidate:check('new')};assert.deepEqual(otherPackages(),before.packages);assert.equal(services(),before.services);
  fs.writeFileSync(dir+'/prepared.json',JSON.stringify({date:new Date().toISOString(),status:'prepared-not-deployed',proof,abi,native,simulation,mappings:mappings(),noServiceRestart:true},null,2)+'\n');console.log('Host Expat ABI, parser and private D-Bus checks passed; not installed.');
 }else if(mode==='stage'){
  assert(!fs.existsSync(dir+'/stage.json'),'Preserve stage receipt');const p=read(dir+'/prepared.json');assert.equal(p.status,'prepared-not-deployed');assert(Date.now()-Date.parse(p.date)<1800000);assert.deepEqual(p.proof,proof);assert.deepEqual(p.abi,abi);assert.equal(version(),previous.version);validatePayload(oldPayload,actual());
  const before={packages:otherPackages(),services:services()},report={startedAt:new Date().toISOString(),status:'staging',proof,abi,oldMappings:mappings(),noServiceRestart:true};const save=()=>fs.writeFileSync(dir+'/stage.json',JSON.stringify(report,null,2)+'\n');save();
  try{fs.writeFileSync(dir+'/install.log',run('dpkg',['--force-confold','--install',candidate])+'\n');assert.equal(version(),spec.version);validatePayload(newPayload,actual());report.native=check('live');assert.deepEqual(otherPackages(),before.packages);assert.equal(services(),before.services);assert.equal(run('dpkg',['--audit']),'');report.status='installed-awaiting-consumer-refresh';report.mappings=mappings();report.completedAt=new Date().toISOString();save();console.log('Host Expat installed and new-process checks passed; resident consumers still require refresh. Not a completed mitigation.');}
  catch(e){report.status='failed';report.error=e.message;try{run('dpkg',['--force-confold','--install',previous.file]);validatePayload(oldPayload,actual());report.rollback='Previous package bytes restored; process mappings require review';}catch{report.rollback='NOT VERIFIED';}save();throw e;}
 }else{
  const s=read(dir+'/stage.json');assert.equal(s.status,'installed-awaiting-consumer-refresh');assert.deepEqual(s.proof,proof);assert.equal(version(),spec.version);validatePayload(newPayload,actual());const current=mappings();assert(!current.some(r=>r.files.some(f=>f.endsWith(' (deleted)'))),'Old Expat still mapped; refresh consumers before verification');
  for(const row of current)for(const file of row.files)assert(abi.some(a=>a.after===sha(file)),'Unrecognized resident Expat library');assert(current.some(r=>r.unit.includes('/dbus.service')),'System bus not observed');assert.equal(run('systemctl',['is-active','dbus.service']),'active');
  assert(!fs.existsSync(dir+'/release.json'),'Preserve completed evidence');fs.writeFileSync(dir+'/release.json',JSON.stringify({status:'passed',completedAt:new Date().toISOString(),proof,abi,native:check('live'),mappings:current,noServiceRestartByVerifier:true},null,2)+'\n');console.log('Host Expat exact installed payload, current consumer mappings and native checks passed.');
 }
}finally{fs.rmSync(work,{recursive:true});}
