// No interpreter replacement or daemon restart; additive native vendor module.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012',file=root+'/host.json',deb=root+'/utilibre-archive-tar_3.14-1_all.deb';
const sha=b=>createHash('sha256').update(b).digest('hex'),pkg=JSON.parse(fs.readFileSync(root+'/package.json'));
const cmd=(exe,args)=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const modules=()=>cmd('perl',['-MArchive::Tar','-e','print $Archive::Tar::VERSION,"|",$INC{"Archive/Tar.pm"}']);
const packages=()=>cmd('dpkg-query',['-W','-f=${binary:Package}|${Version}\n']).split('\n').filter(l=>!l.startsWith('utilibre-archive-tar|')).sort();
const save=r=>fs.writeFileSync(file,JSON.stringify(r,null,2)+'\n');
const mode=process.argv[2];assert(['prepare','apply'].includes(mode));assert.equal(sha(fs.readFileSync(deb)),pkg.debSha256);
if(mode==='prepare'){
 assert(!fs.existsSync(file));for(const m of pkg.modules)assert(!fs.existsSync(m.path),'Existing vendor module must not be overwritten');
 const prior=modules();assert(prior==='3.02_001|/usr/share/perl/5.40/Archive/Tar.pm');
 save({date:new Date().toISOString(),status:'prepared',prior,packagesSha256:sha(packages().join('\n')),debSha256:pkg.debSha256,modules:pkg.modules});console.log('Host module prepared; no install or restart.');
}else{
 const r=JSON.parse(fs.readFileSync(file));assert.equal(r.status,'prepared');assert(Date.now()-Date.parse(r.date)<86400000);assert.equal(r.prior,modules());assert.equal(r.packagesSha256,sha(packages().join('\n')));assert.equal(r.debSha256,pkg.debSha256);
 const work=fs.mkdtempSync('/var/tmp/utilibre-archive-native-');fs.chmodSync(work,0o755);
 for(const part of ['t','bin'])fs.cpSync(root+'/Archive-Tar-3.14/'+part,work+'/'+part,{recursive:true});
 fs.copyFileSync(new URL('./native.pl',import.meta.url),work+'/native.pl');
 cmd('chown',['-R','65534:65534',work]);cmd('chmod',['-R','u+rwX,go+rX',work]);
 r.status='applying';r.testDirectory=work;save(r);
 try{
  cmd('dpkg',['--install',deb]);assert.equal(modules(),'3.14|/usr/share/perl5/Archive/Tar.pm');
  assert.equal(sha(packages().join('\n')),r.packagesSha256);
  for(const m of pkg.modules)assert.equal(sha(fs.readFileSync(m.path)),m.sha256);
  const script=`cd ${work} && EXPECT_FIXED=1 perl native.pl && perl -MTest::Harness -e 'runtests(sort glob "t/*.t")'`;
  const output=cmd('runuser',['-u','nobody','--','sh','-ec',script]);fs.writeFileSync(root+'/host-native.txt',output+'\n');assert(output.includes('All tests successful.'));
  r.status='passed';r.completedAt=new Date().toISOString();r.upstreamTests=output.match(/Files=\d+, Tests=\d+/)?.[0];r.testLogSha256=sha(output);r.unrelatedPackagesUnchanged=true;r.noRestart=true;save(r);console.log('Host installed module, complete native suite and unchanged package inventory passed; no restart.');
 }catch(e){
  r.status='failed';r.rollback='attempting';save(r);
  try{cmd('dpkg',['--remove','utilibre-archive-tar']);assert.equal(modules(),r.prior);for(const m of pkg.modules)assert(!fs.existsSync(m.path));r.rollback='verified';}catch{r.rollback='unverified';}
  save(r);fs.writeFileSync(root+'/host-error.txt',String(e.stack));throw Error('Host module gate failed; rollback '+r.rollback);
 }
}
