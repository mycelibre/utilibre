// Native vendor-module overlay: no Perl interpreter, application or ABI replacement.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {canonical} from '../go-final/release.mjs';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/archive-tar-final-20261012';
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=f=>JSON.parse(fs.readFileSync(root+'/'+f+'.json'));
const pkg=read('package'),deb=root+'/utilibre-archive-tar_3.14-1_all.deb';
assert.equal(sha(fs.readFileSync(deb)),pkg.debSha256);
const docker=(...args)=>cp.execFileSync('docker',args,{encoding:'utf8',timeout:240000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const limits=['--rm','--network','none','--cpus','1','--memory','512m','--memory-swap','512m','--pids-limit','96','--cap-drop','ALL','--security-opt','no-new-privileges','--log-driver','none','--read-only','--tmpfs','/tmp:rw,nosuid,nodev,size=96m,mode=1777'];
const specs=[['gathio','utilibre-gathio-postgres-1'],['rsshub','utilibre-services-rsshub-1'],['priviblur','utilibre-priviblur-priviblur-1'],['breezewiki','utilibre-expanded-breezewiki-1'],['freshrss','utilibre-services-freshrss-1']];
const fixtures=root+'/fixtures';fs.mkdirSync(fixtures,{recursive:true});
for(const part of ['t','bin'])fs.cpSync(root+'/Archive-Tar-3.14/'+part,fixtures+'/'+part,{recursive:true});
fs.copyFileSync(new URL('./native.pl',import.meta.url),fixtures+'/native.pl');
cp.execFileSync('chmod',['-R','a+rX',fixtures]);
const suite=`set -eu
cp -a /fixtures /tmp/work
cd /tmp/work
perl -MArchive::Tar -e 'die unless $Archive::Tar::VERSION eq "3.14" && $INC{"Archive/Tar.pm"} eq "/usr/share/perl5/Archive/Tar.pm"'
perl /fixtures/native.pl
perl -MTest::Harness -e 'runtests(sort glob "t/*.t")'
mkdir cli
cd cli
printf 'Fictional native CLI fixture\\n' > example.txt
ptar -cf example.tar example.txt
ptar -tf example.tar
mkdir extracted
cd extracted
ptar -xf ../example.tar
cmp example.txt ../example.txt
`;
const rows=[];
for(const [key,name]of specs){
 assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3,'Disk floor');
 const live=inspect(name),base=live.Image,baseRef=live.Config.Image,old=inspect(base);
 const prior=docker('run',...limits,'--user','65534:65534','--entrypoint','perl',base,'-MArchive::Tar','-e','print $Archive::Tar::VERSION,"|",$INC{"Archive/Tar.pm"}');
 assert(!prior.endsWith('/usr/share/perl5/Archive/Tar.pm'),'Unexpected existing vendor override');
 assert.equal(inspect(baseRef).Id,base);
 const context=fs.mkdtempSync(root+'/context-');fs.copyFileSync(deb,context+'/module.deb');
 fs.writeFileSync(context+'/Dockerfile',`FROM ${baseRef}\nUSER 0\nCOPY module.deb /tmp/utilibre-archive-tar.deb\nRUN dpkg -i /tmp/utilibre-archive-tar.deb && rm /tmp/utilibre-archive-tar.deb\nUSER ${old.Config.User||'0'}\n`);
 const candidate='utilibre-'+key+':archive-tar-20261012';
 fs.writeFileSync(root+'/'+key+'-build.txt',docker('build','--network','none','--pull=false','-t',candidate,context));
 const image=inspect(candidate);
 assert.equal(inspect(baseRef).Id,base);assert.deepEqual(image.RootFS.Layers.slice(0,old.RootFS.Layers.length),old.RootFS.Layers);
 const normal=c=>canonical({...c,User:c.User||'0'});
 assert.deepEqual(normal(image.Config),normal(old.Config),'Runtime configuration changed');
 const query='${binary:Package}|${Version}\\n';
 const packages=ref=>docker('run',...limits,'--entrypoint','dpkg-query',ref,'-W','-f='+query).split('\n').filter(x=>!x.startsWith('utilibre-archive-tar|')).sort();
 assert.deepEqual(packages(image.Id),packages(base),'Unrelated packages changed');
 const changed=docker('history','--no-trunc','--format','{{.CreatedBy}}',image.Id).split('\n');
 assert(changed.some(l=>l.includes('dpkg -i /tmp/utilibre-archive-tar.deb')));
 fs.writeFileSync(root+'/'+key+'-control.txt',docker('run',...limits,'--user','65534:65534','--mount','type=bind,src='+fixtures+',dst=/fixtures,readonly','--entrypoint','perl',base,'/fixtures/native.pl'));
 const output=docker('run',...limits,'--user','65534:65534','--env','EXPECT_FIXED=1','--mount','type=bind,src='+fixtures+',dst=/fixtures,readonly','--entrypoint','sh',image.Id,'-c',suite);
 fs.writeFileSync(root+'/'+key+'-native.txt',output);
 assert(output.includes('All tests successful.'),'Incomplete upstream tests');
 for(const m of pkg.modules)assert.equal(docker('run',...limits,'--entrypoint','sha256sum',image.Id,m.path).split(/\s+/)[0],m.sha256);
 rows.push({key,name,baseRef,base,image:image.Id,candidate,prior,configurationUnchanged:true,unrelatedPackagesUnchanged:true,nativeSuite:true,nativeCli:true,upstreamTests:output.match(/Files=\d+, Tests=\d+/)?.[0],testLogSha256:sha(output),modules:pkg.modules});
 fs.writeFileSync(root+'/stage.json',JSON.stringify({date:new Date().toISOString(),status:rows.length===specs.length?'passed':'staging',packageSha256:sha(fs.readFileSync(root+'/package.json')),network:'none',rows},null,2)+'\n');
 console.log(key+': exact native module, upstream tests, old-CLI roundtrip passed');
}
