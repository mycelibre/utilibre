import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,work,version,oldVersion,sha,read,run} from './common.mjs';
process.umask(0o077);
const filename='security-bookworm-mount-20261012-source.tar.gz',archive=root+'/'+filename,receipt=root+'/source-offer.json';
assert([undefined,'--publish'].includes(process.argv[2]));
const names=['util-linux_2.38.1.orig.tar.xz',`util-linux_${version}.dsc`,`util-linux_${version}.debian.tar.xz`];
const originals=[`util-linux_${oldVersion}.dsc`,`util-linux_${oldVersion}.debian.tar.xz`];
const recipes=['README.md','common.mjs','prepare.sh','verify-source.mjs','build.sh','inner-build.sh','finish-build.mjs','finish-build.sh','legacy-target-pinning.patch','mount-regression.c','native.mjs','stage.mjs','application.mjs','source-offer.mjs'];
if(process.argv[2]==='--publish'){
 const p=read(receipt);assert.equal(sha(fs.readFileSync(archive)),p.sha256);
 const allowed=new Set(['mount-native/','mount-native/sources/','mount-native/recipes/','mount-native/manifest.json',...names.concat(originals).map(f=>'mount-native/sources/'+f),...recipes.map(f=>'mount-native/recipes/'+f)]);
 assert.deepEqual(new Set(run('tar',['-tzf',archive]).split('\n')),allowed);
 for(const dest of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const path=dest+'/'+filename;if(fs.existsSync(path)){assert.equal(sha(fs.readFileSync(path)),p.sha256);continue;}const temp=fs.mkdtempSync(dest+'/.mount-offer-');fs.copyFileSync(archive,temp+'/'+filename);fs.chmodSync(temp+'/'+filename,0o644);fs.renameSync(temp+'/'+filename,path);fs.rmdirSync(temp);}
 p.published=true;p.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}else{
 assert(!fs.existsSync(archive));const n=read(root+'/native.json');assert.equal(n.status,'passed');const auth=read(root+'/source-authentication.json');assert(auth.passed);
 const temp=fs.mkdtempSync(root+'/source-offer-'),dir=temp+'/mount-native';fs.mkdirSync(dir+'/sources',{recursive:true});fs.mkdirSync(dir+'/recipes');
 const files=[];
 for(const name of names.concat(originals)){const input=(originals.includes(name)?root+'/sources':work)+'/'+name;fs.copyFileSync(input,dir+'/sources/'+name);files.push({name,sha256:sha(fs.readFileSync(input))});}
 for(const name of recipes)fs.copyFileSync(new URL(name,import.meta.url),dir+'/recipes/'+name);
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({version,oldVersion,files,originalAuthentication:auth,patch:'legacy-target-pinning.patch',adaptation:'Upstream target FD lifetime and September classic-mount hardening adapted to 2.38.1. Restricted paths require Linux openat2 and procfs; no unsafe fallback. Public ABI and all prior Debian patches preserved.',testResults:{exports:312,targetComparisons:12,libmountSuite:17,fullSuite:read(root+'/upstream-exception.json')},reproduction:'Unpack the included complete modified DSC using dpkg-source; install its Build-Depends in an isolated Debian Bookworm compiler (2 CPU, 2 GiB). Run dpkg-buildpackage -b -us -uc -j2 as an unprivileged build user. A container device-minor lsfd test limitation is independently reproduced in the unmodified baseline; finish-build documents that bounded exception. No user content or credentials are included.'},null,2)+'\n');
 run('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'mount-native']);
 const p={date:new Date().toISOString(),filename,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}
