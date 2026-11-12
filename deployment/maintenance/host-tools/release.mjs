// Scoped host-tool activation. Downloads and tests must already be complete.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/host-tools-20261112';
const pins=JSON.parse(fs.readFileSync(new URL('./versions.json',import.meta.url)));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:30000,maxBuffer:1024**2,env:{...process.env,TRIVY_DISABLE_TELEMETRY:'true',TRIVY_SKIP_VERSION_CHECK:'true'}}).trim();
const [tool]=process.argv.slice(2);
assert(process.argv.length===3&&['node','trivy','restic'].includes(tool),'Use release.mjs node|trivy|restic');
const p=pins[tool],receipt=root+'/'+tool+'-release.json';
if(fs.existsSync(receipt)){
 const previous=JSON.parse(fs.readFileSync(receipt));assert.equal(previous.status,'passed');
 const binary=tool==='node'?'/root/.nvm/versions/node/v'+p.version+'/bin/node':'/opt/utilibre/maintenance/bin/'+tool;
 assert.equal(sha(binary),p.binarySha256);
 if(tool==='node')for(const name of p.units)assert(fs.readFileSync('/etc/systemd/system/'+name,'utf8').includes('/node/v'+p.version+'/bin'));
 if(tool==='restic')assert(fs.readFileSync(new URL('../../storagebox/restic.sh',import.meta.url),'utf8').includes('    '+binary+' --repository-file'));
 console.log(tool+': exact artifact already active; no changes');process.exit(0);
}
const report={date:new Date().toISOString(),tool,version:p.version,status:'preparing',rollback:[]};
const save=()=>fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
if(tool==='node'){
 const from='/root/.nvm/versions/node/v'+p.previousVersion,to='/root/.nvm/versions/node/v'+p.version;
 assert.equal(sha(from+'/bin/node'),p.previousBinarySha256);
 assert.equal(sha(root+'/downloads/node-v'+p.version+'-linux-x64.tar.xz'),p.archiveSha256);
 const tests=fs.readFileSync(root+'/node-tests.txt','utf8');
 assert(tests.includes('tests 75')&&tests.includes('pass 75')&&tests.includes('fail 0'));
 assert.equal(sha(root+'/downloads/node-v'+p.version+'-linux-x64/bin/node'),p.binarySha256);
 assert(!fs.existsSync(to));
 const units=p.units.map(name=>{
  assert(/^utilibre-[a-z0-9-]+\.service$/.test(name));
  const linked='/etc/systemd/system/'+name,file=fs.realpathSync(linked),current=fs.readFileSync(file,'utf8');
  assert(file===linked||p.templates.some(t=>file==='/home/ubuntu/freetools/'+t),'Unexpected unit symlink');
  // A unit linked to its tracked template may already contain the reviewed edit.
  assert(current.includes(from)||(file!==linked&&current.includes(to)));
  const body=current.replaceAll(to,from);
  return {file,name,body,next:body.replaceAll(from,to),beforeSha256:sha(file)};
 });
 fs.cpSync(root+'/downloads/node-v'+p.version+'-linux-x64',to,{recursive:true,errorOnExist:true,force:false,verbatimSymlinks:true});
 assert.equal(sha(to+'/bin/node'),p.binarySha256);assert.equal(run(to+'/bin/node',['--version']),'v'+p.version);
 const backups=root+'/node-unit-backups';fs.mkdirSync(backups,{recursive:true});
 for(const u of units){const backup=backups+'/'+u.name;fs.writeFileSync(backup,u.body);report.rollback.push({file:u.file,backup,sha256:sha(backup)});}
 report.status='activating';save();
 try{
  for(const u of units){assert.equal(sha(u.file),u.beforeSha256);fs.writeFileSync(u.file+'.new',u.next,{mode:0o644});fs.renameSync(u.file+'.new',u.file);}
  run('systemctl',['daemon-reload']);
  for(const u of units){assert.equal(fs.readFileSync(u.file,'utf8'),u.next);assert(!run('systemctl',['show',u.name,'-p','ExecStart','-p','Environment']).includes(from));}
  report.changedUnits=units.length;report.restartedServices=0;report.status='passed';
 }catch(e){
  for(const u of units)fs.writeFileSync(u.file,u.body,{mode:0o644});
  run('systemctl',['daemon-reload']);report.status='failed-units-restored';save();throw e;
 }
}else if(tool==='restic'){
 const candidate=root+'/restic-candidate/restic',dest='/opt/utilibre/maintenance/bin/restic';
 assert.equal(sha(candidate),p.binarySha256);assert.equal(sha('/usr/bin/restic'),p.previousBinarySha256);
 const native=JSON.parse(fs.readFileSync(root+'/restic-portability.json'));
 const remote=JSON.parse(fs.readFileSync(root+'/modules-restore.json'));
 assert(native.passed&&native.binarySha256===p.binarySha256);
 assert(remote.remoteRestoreVerified&&remote.candidateResticSha256===p.binarySha256);
 const scan=JSON.parse(fs.readFileSync(root+'/restic-candidate-scan.json'));
 assert(scan.Results.some(x=>x.Type==='gobinary'&&x.Packages.length>0));
 assert(scan.Results.every(x=>!(x.Vulnerabilities||[]).length));
 assert(!fs.existsSync(dest));
 const wrapper=new URL('../../storagebox/restic.sh',import.meta.url).pathname;
 const before=fs.readFileSync(wrapper,'utf8'),token='    restic --repository-file';assert.equal(before.split(token).length,2);
 const backup=root+'/restic-wrapper-before.sh';fs.copyFileSync(wrapper,backup);
 report.rollback=[{file:wrapper,backup,sha256:sha(backup)}];report.status='activating';save();
 fs.copyFileSync(candidate,dest+'.new');fs.chmodSync(dest+'.new',0o755);fs.renameSync(dest+'.new',dest);
 assert.equal(sha(dest),p.binarySha256);assert(run(dest,['version']).startsWith('restic '+p.version+' '));
 fs.writeFileSync(wrapper,before.replace(token,'    '+dest+' --repository-file'));
 report.nativeChecks=native.checks;report.remoteSnapshot=remote.snapshot;report.status='passed';
}else{
 const dest='/opt/utilibre/maintenance/bin/trivy',candidate=root+'/bin/trivy';
 assert.equal(sha(dest),p.previousBinarySha256);assert.equal(sha(candidate),p.binarySha256);
 const raw=JSON.parse(fs.readFileSync(root+'/downloaded-runtime-scan.json'));
 const result=raw.Results.find(r=>r.Target==='trivy');assert(result.Packages.length>0);
 const review=JSON.parse(fs.readFileSync(root+'/trivy-advisory-review.json'));
 assert.equal(review.binarySha256,p.binarySha256);
 assert.equal(review.status,'not-affected-at-reviewed-artifact');
 assert(Date.parse(review.reviewAfter)>Date.now());
 assert.equal(sha(root+'/GO-2026-5932.json'),review.advisorySha256);
 assert.equal(sha(root+'/trivy-go.mod'),review.upstreamGoModSha256);
 const symbols=cp.execFileSync('strings',[candidate],{maxBuffer:64*1024**2});
 assert(symbols.includes('github.com/ProtonMail/go-crypto/openpgp/'));
 assert(!symbols.includes('golang.org/x/crypto/openpgp'));
 assert((result.Vulnerabilities||[]).every(v=>v.VulnerabilityID==='GO-2026-5932'&&v.PkgName==='golang.org/x/crypto'&&v.InstalledVersion==='v0.58.0'&&v.Severity==='UNKNOWN'));
 report.advisoryReview=review; // Raw observation is retained in the scan report.
 const old=JSON.parse(fs.readFileSync(root+'/old-scanner-candidate-result.json'));
 const normalize=r=>JSON.stringify(r.Results.map(x=>({target:x.Target,packages:x.Packages.map(v=>[v.Name,v.Version]).sort(),findings:(x.Vulnerabilities||[]).map(v=>[v.VulnerabilityID,v.PkgName,v.InstalledVersion,v.FixedVersion||'',v.Severity]).sort()})).sort((a,b)=>a.target.localeCompare(b.target)));
 assert.equal(normalize(raw),normalize(old),'Same-input scanner results changed');
 const backup=dest+'-sha256-'+p.previousBinarySha256;
 if(!fs.existsSync(backup))fs.copyFileSync(dest,backup);
 assert.equal(sha(backup),p.previousBinarySha256);report.rollback.push({file:dest,backup,sha256:p.previousBinarySha256});
 report.status='activating';save();fs.copyFileSync(candidate,dest+'.new');fs.chmodSync(dest+'.new',0o755);fs.renameSync(dest+'.new',dest);
 assert.equal(sha(dest),p.binarySha256);assert(run(dest,['--version']).startsWith('Version: '+p.version));report.status='passed';
}
report.completedAt=new Date().toISOString();save();console.log(tool+': '+report.status+'; private receipt '+receipt);
