import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/closure-followup-20261012';
const pins={
 'libexpat1_2.9.0-1_amd64.deb':'190d7f5e45f070c42a12f708fe417d6636cb45fae71175203168bb5c3695081b',
 'libsodium26_1.0.22-2_amd64.deb':'18d593b1aaab48f126bd3636f009fc5294f948c4960c171b7e73eab9f814f198',
 'vim-common_2%3a9.2.0858-1_all.deb':'c21aad77632ef790d2352f1c38e688069980bbd530034248dd5e1158da9c9fe3',
 'vim-runtime_2%3a9.2.0858-1_all.deb':'1421e29be1730c7aebd055b52d22d86b0305785d155006a9a30e156558774e77',
 'vim-tiny_2%3a9.2.0858-1_amd64.deb':'df2d037d405f1376d1d8025d022dba81fbfed8695f68a131b788d16d3b68cf83',
 'vim_2%3a9.2.0858-1_amd64.deb':'a146e1522011659f2a60420ec3958be9f7dc30e6aa396b0da37a5eb8fbc301c0',
};
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(cmd,args)=>{try{return cp.execFileSync(cmd,args,{encoding:'utf8',timeout:120000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive'}}).trim();}catch(e){fs.writeFileSync(root+'/host-release-error.log',String(e.stderr||e.stdout||e.message));throw Error('Host gate failed; private diagnostic retained');}};
if(process.argv[2]==='--resume'){
 const old=JSON.parse(fs.readFileSync(root+'/host-release.json'));
 assert.equal(old.status,'failed');assert(old.rollback?.startsWith('original five packages restored'));
 const archive=root+'/host-release-attempt-'+Date.now()+'.json';
 fs.renameSync(root+'/host-release.json',archive);
}
assert(!fs.existsSync(root+'/host-release.json'));
const native=JSON.parse(fs.readFileSync(root+'/host-candidate.json'));assert.equal(native.status,'passed');assert(!native.installed);
assert(Date.now()-Date.parse(native.date)<86400000);
const primary=JSON.parse(fs.readFileSync(root+'/debian-primary.json'));
for(const [pkg,version] of [['vim','2:9.2.0858-1'],['expat','2.9.0-1']])for(const entry of Object.values(primary.sources[pkg])){
 const v=entry.releases.sid;assert.equal(v.status,'resolved');assert(v.fixed_version);run('dpkg',['--compare-versions',version,'ge',v.fixed_version]);
}
for(const file of ['test_plugin_netrw','test_blob','test_buffer','test_spell'])assert(fs.existsSync(root+'/sources/vim-9.2.0858/src/testdir/'+file+'.res'),'Upstream test group did not finish');
// Unpack tiny before runtime: the newer runtime explicitly Breaks older tiny.
const candidates=Object.keys(pins).sort((a,b)=>{
 const order=n=>n.startsWith('vim-runtime_')?5:n.startsWith('vim_')?6:n.startsWith('vim-tiny_')?4:0;
 return order(a)-order(b);
}).map(n=>root+'/sources/'+n);
for(const file of candidates)assert.equal(sha(file),pins[file.split('/').at(-1)]);
const old=fs.readdirSync(root+'/rollback').filter(n=>/^(?:vim(?:-common|-runtime|-tiny)?_|libexpat1_)/.test(n)).map(n=>root+'/rollback/'+n);assert.equal(old.length,5);
const simulation=run('apt-get',['--simulate','--no-install-recommends','install',...candidates]);assert(!/^Remv /m.test(simulation));
const expected=['libexpat1','vim','vim-common','vim-runtime','vim-tiny'];
try{assert.equal(run('dpkg-query',['-W','-f=${Version}','libsodium26']),'1.0.22-2');}catch{expected.push('libsodium26');}
assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]).sort(),expected.sort());
assert.equal(run('dpkg',['--audit']),'');
const services=['docker.service','ssh.service'];const pids=()=>Object.fromEntries(services.map(s=>[s,run('systemctl',['show','--property','MainPID','--value',s])]));
const before=pids(),config=Object.fromEntries(fs.readdirSync('/etc/vim').filter(n=>fs.statSync('/etc/vim/'+n).isFile()).map(n=>[n,sha('/etc/vim/'+n)]));
const report={date:new Date().toISOString(),status:'applying',packages:pins,oldPackages:Object.fromEntries(old.map(p=>[p,sha(p)])),native:root+'/host-candidate.json',originalServicePids:before};
const save=()=>fs.writeFileSync(root+'/host-release.json',JSON.stringify(report,null,2)+'\n');save();
try{
 run('dpkg',['--force-confold','--install',...candidates]);assert.equal(run('dpkg',['--audit']),'');
 run('python3',['deployment/maintenance/closure-followup/check-host.py','--installed']);
 for(const [name,hash] of Object.entries(config)){
  const pristine=root+'/old-vim/etc/vim/'+name,newDefault=root+'/candidate/etc/vim/'+name;
  // Only an untouched packaged default may receive its upstream replacement.
  const expected=fs.existsSync(pristine)&&sha(pristine)===hash&&fs.existsSync(newDefault)?sha(newDefault):hash;
  assert.equal(sha('/etc/vim/'+name),expected,'Custom editor configuration changed');
 }
 assert.deepEqual(pids(),before);report.status='passed';report.customEditorConfigurationPreserved=true;report.pristineTinyDefaultUpdated=true;
 report.oldMappedLibraries='Existing dbus/user-bus/unattended-upgrades mappings require a separate supervised refresh; no VM reboot was performed.';
}catch(error){
 report.failure=error.message;
 report.status='failed';save();run('dpkg',['--force-confold','--install',...old]);assert.equal(run('dpkg',['--audit']),'');report.rollback='original five packages restored; harmless new libsodium26 retained';save();throw Error('Host release failed; restored original packages');
}
report.completedAt=new Date().toISOString();save();console.log('Host Vim and Expat deployed; native tests and preserved configuration passed. No Docker/SSH restart.');
