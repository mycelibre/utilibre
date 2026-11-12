// Native five-package same-ABI replacement; no daemon restart or libc change.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/host-tools-20261112',out=root+'/python/build';
const oldRoot='/var/lib/utilibre-maintenance/closure-followup-20261012/python-system/build';
const version='3.13.18-1~deb13u1+utilibre1',previous='3.13.16-1~deb13u1+utilibre1';
const packages=['libpython3.13-minimal','libpython3.13-stdlib','python3.13-minimal','python3.13','python3.13-venv'];
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const env={PATH:'/usr/sbin:/usr/bin:/sbin:/bin',DEBIAN_FRONTEND:'noninteractive'};
const run=(p,a,extra={})=>cp.execFileSync(p,a,{env:{...env,...extra},encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const candidate=packages.map(p=>out+'/'+p+'_'+version+'_amd64.deb'),rollback=packages.map(p=>oldRoot+'/'+p+'_'+previous+'_amd64.deb');
const recipe=new URL('./check-python.py',import.meta.url).pathname,record=root+'/python-candidate.json',receipt=root+'/python-release.json';
assert(process.argv.length===3&&['prepare','apply'].includes(process.argv[2]));
if(process.argv[2]==='apply'&&fs.existsSync(receipt)){
 const proof=JSON.parse(fs.readFileSync(receipt));assert.equal(proof.status,'passed');
 const manifest=root+'/python-installed-files.json';assert.equal(sha(manifest),proof.installedFilesManifestSha256);
 for(const [file,digest] of Object.entries(JSON.parse(fs.readFileSync(manifest))))assert.equal(sha(file),digest);
 for(const p of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',p]),version);
 console.log('Python: exact installed package payload already active; no changes');process.exit(0);
}
assert(fs.readFileSync(out+'/vendor-runner.log','utf8').includes('NATIVE_PYTHON_VENDOR_BUILD_AND_COMPATIBILITY_PASSED'));
const tests=fs.readFileSync(out+'/compatibility-tests.log','utf8');assert(tests.includes('Result: SUCCESS'));assert(tests.includes('run=2,630 skipped=59'));
const checksumMap=file=>new Map(fs.readFileSync(file,'utf8').trim().split('\n').map(l=>[l.slice(66).split('/').at(-1),l.slice(0,64)]));
const nextSums=checksumMap(out+'/SHA256SUMS'),oldSums=checksumMap(oldRoot+'/SHA256SUMS');
for(const file of candidate)assert.equal(sha(file),nextSums.get(file.split('/').at(-1)));
for(const file of rollback)assert.equal(sha(file),oldSums.get(file.split('/').at(-1)));
const services=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','-p','MainPID','--value',s])]));
if(process.argv[2]==='prepare'){
 assert(!fs.existsSync(record));const dir=root+'/python/candidate';assert(!fs.existsSync(dir));fs.mkdirSync(dir);
 for(const file of candidate)run('dpkg-deb',['-x',file,dir]);
 const extra={PYTHONHOME:dir+'/usr',PYTHONPATH:'/usr/lib/python3/dist-packages'};
 const native=JSON.parse(run('unshare',['--net',dir+'/usr/bin/python3.13','-B',recipe],extra));assert(native.passed);
 assert.equal(sha(dir+'/etc/python3.13/sitecustomize.py'),sha('/etc/python3.13/sitecustomize.py'));
 const simulation=run('apt-get',['--simulate','--no-install-recommends','install',...candidate]);
 assert(!/^Remv /m.test(simulation));
 assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1].replace(/:amd64$/,'')).sort(),[...packages].sort());
 fs.writeFileSync(root+'/python-apt-simulation.txt',simulation+'\n');
 fs.writeFileSync(record,JSON.stringify({date:new Date().toISOString(),passed:true,version,packages:Object.fromEntries(candidate.map(p=>[p,sha(p)])),rollback:Object.fromEntries(rollback.map(p=>[p,sha(p)])),native,checkerSha256:sha(recipe),configurationSha256:sha('/etc/python3.13/sitecustomize.py'),upstreamCompatibility:{cases:2630,skips:59,files:5}},null,2)+'\n');
 console.log('Python candidate: native host consumers and exact five-package APT simulation passed.');
}else{
 assert(!fs.existsSync(receipt));const proof=JSON.parse(fs.readFileSync(record));assert(proof.passed&&Date.now()-Date.parse(proof.date)<86400000);assert.equal(sha(recipe),proof.checkerSha256);
 for(const file of candidate)assert.equal(sha(file),proof.packages[file]);for(const file of rollback)assert.equal(sha(file),proof.rollback[file]);
 assert.equal(run('dpkg',['--audit']),'');for(const p of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',p]),previous);
 const before=services(),libc=sha('/usr/lib/x86_64-linux-gnu/libc.so.6');
 const report={...proof,date:new Date().toISOString(),status:'applying'};const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');save();
 try{
  run('dpkg',['--force-confold','--install',...candidate]);assert.equal(run('dpkg',['--audit']),'');
  for(const p of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',p]),version);
  report.native=JSON.parse(run('unshare',['--net','/usr/bin/python3','-B',recipe]));assert(report.native.passed);
  assert.deepEqual(services(),before);assert.equal(sha('/usr/lib/x86_64-linux-gnu/libc.so.6'),libc);assert.equal(sha('/etc/python3.13/sitecustomize.py'),proof.configurationSha256);
  const files=run('/usr/bin/python3',['-c',`import sys,subprocess,tarfile,io,hashlib,json,pathlib
rows={}
for deb in sys.argv[1:]:
 with tarfile.open(fileobj=io.BytesIO(subprocess.check_output(['dpkg-deb','--fsys-tarfile',deb]))) as archive:
  for entry in archive:
   if entry.isfile():
    path=pathlib.Path('/')/entry.name.removeprefix('./')
    assert '..' not in path.parts
    expected=hashlib.sha256(archive.extractfile(entry).read()).hexdigest()
    assert hashlib.sha256(path.read_bytes()).hexdigest()==expected
    rows[str(path)]=expected
print(json.dumps(rows,sort_keys=True,indent=2))`,...candidate]);
  const manifest=root+'/python-installed-files.json';fs.writeFileSync(manifest,files+'\n');
  report.installedFilesManifestSha256=sha(manifest);report.installedFilesVerified=Object.keys(JSON.parse(files)).length;
  report.status='passed';report.libcAndDockerSshUnchanged=true;
 }catch(error){
  report.status='failed';save();run('dpkg',['--force-confold','--install',...rollback]);assert.equal(run('dpkg',['--audit']),'');
  for(const p of packages)assert.equal(run('dpkg-query',['-W','-f=${Version}',p]),previous);report.rollbackVerified=true;save();throw Error('Python host gate failed; preceding five packages restored.');
 }
 report.completedAt=new Date().toISOString();save();console.log('Python 3.13.18 installed; native host consumers pass; no service restart.');
}
