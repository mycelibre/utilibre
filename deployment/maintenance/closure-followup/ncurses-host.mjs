// Install only the authenticated compatible CLI package, with local rollback.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/closure-followup-20261012';
const file=dir+'/ncurses-host.json',version='6.5+20250216-2+dhi4';
const candidate=dir+'/ncurses-dhi/ncurses-bin_'+version+'_amd64.deb';
const rollback=dir+'/rollback/ncurses-bin_6.5+20250216-2_amd64.deb';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:120000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe'],env:{...process.env,DEBIAN_FRONTEND:'noninteractive'}}).trim();
assert(!fs.existsSync(file),'Never overwrite a host release receipt');
assert.equal(sha(candidate),'54821f5e17572f0badc7059efefb54fb54d9e8a28449274f478735314f22474d');
assert.equal(sha(rollback),'40a525f4761e9ed4b8adcd1783cb9a6467ff8008215ae99b3597825bdefc61e4');
assert(fs.readFileSync(dir+'/ncurses-dhi/package-index.txt','utf8').includes('SHA256: '+sha(candidate)));
const proof=JSON.parse(fs.readFileSync(dir+'/ncurses/ncurses-linkding-linkding/native.json'));
assert(proof.passed&&proof.longSgrInput&&proof.sharedLibrariesUnchanged);
assert(Date.now()-Date.parse(proof.date)<86400000);
const simulation=run('apt-get',['--simulate','--no-install-recommends','install',candidate]);
assert(!/^Remv /m.test(simulation));
assert.deepEqual(simulation.split('\n').filter(l=>l.startsWith('Inst ')).map(l=>l.split(' ')[1]),['ncurses-bin']);
assert.equal(run('dpkg-query',['-W','-f=${Version}','ncurses-bin']),'6.5+20250216-2');
assert.equal(run('dpkg',['--audit']),'');
const library='/usr/lib/x86_64-linux-gnu/libtinfo.so.6.5',libraryHash=sha(library);
const pids=()=>Object.fromEntries(['docker.service','ssh.service'].map(s=>[s,run('systemctl',['show','--value','--property','MainPID',s])]));
const before=pids(),report={date:new Date().toISOString(),status:'applying',version,packageSha256:sha(candidate),oldPackageSha256:sha(rollback),librarySha256:libraryHash};
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');save();
try{
 run('dpkg',['--force-confold','--install',candidate]);
 assert.equal(run('dpkg-query',['-W','-f=${Version}','ncurses-bin']),version);
 assert.match(run('sh',['deployment/maintenance/closure-followup/ncurses-native.sh']),/NATIVE_TERMINAL_ROUNDTRIP_AND_LONG_SGR_PASSED/);
 assert.equal(sha(library),libraryHash);assert.deepEqual(pids(),before);
 report.status='passed';report.nativeRoundTripAndBoundaryPassed=true;report.coreLibraryAndServicePidsUnchanged=true;
}catch(e){
 report.status='failed';report.failure=e.message.slice(0,180);save();
 run('dpkg',['--force-confold','--install',rollback]);assert.equal(run('dpkg',['--audit']),'');
 report.rollback='Original ncurses-bin restored; no user state or libraries changed';save();throw Error('Terminal CLI release failed; original package restored');
}
report.completedAt=new Date().toISOString();save();console.log('Host terminal CLI patched; native boundary/round-trip checks passed. Core libraries and Docker/SSH unchanged.');
