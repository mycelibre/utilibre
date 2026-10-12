import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,version,vendorVersion,sha,read,run} from './ubuntu-common.mjs';
process.umask(0o077);assert([undefined,'--publish'].includes(process.argv[2]));
const filename='security-noble-mount-20261012-source-v2.tar.gz',archive=root+'/'+filename,receipt=root+'/ubuntu-source-offer-v2.json';
const inputs=['util-linux_2.39.3.orig.tar.xz',`util-linux_${vendorVersion}.dsc`,`util-linux_${vendorVersion}.debian.tar.xz`];
const changed=[`util-linux_${version}.dsc`,`util-linux_${version}.debian.tar.xz`];
const recipes=['README.md','common.mjs','ubuntu-common.mjs','ubuntu-assessment.mjs','ubuntu-build.sh','ubuntu-target-pinning.patch','ubuntu-finish-build.mjs','mount-regression.c','ubuntu-native.mjs','ubuntu-stage.mjs','ubuntu-consumer.mjs','ubuntu-addy-application.mjs','ubuntu-redlib-application.mjs','ubuntu-release.mjs','ubuntu-source-offer.mjs','ubuntu-source-offer-v2.mjs','ubuntu-pins.mjs','ubuntu-pins.test.mjs'];
if(process.argv[2]==='--publish'){
 const p=read(receipt);assert.equal(sha(fs.readFileSync(archive)),p.sha256);
 const allowed=new Set(['noble-mount/','noble-mount/sources/','noble-mount/recipes/','noble-mount/manifest.json',...inputs.concat(changed).map(f=>'noble-mount/sources/'+f),...recipes.map(f=>'noble-mount/recipes/'+f)]);
 assert.deepEqual(new Set(run('tar',['-tzf',archive]).split('\n')),allowed);
 for(const dest of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const path=dest+'/'+filename;if(fs.existsSync(path)){assert.equal(sha(fs.readFileSync(path)),p.sha256);continue;}const temp=fs.mkdtempSync(dest+'/.mount-offer-');fs.copyFileSync(archive,temp+'/'+filename);fs.chmodSync(temp+'/'+filename,0o644);fs.renameSync(temp+'/'+filename,path);fs.rmdirSync(temp);}
 p.published=true;p.publishedAt=new Date().toISOString();fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}else{
 assert(!fs.existsSync(archive));const n=read(root+'/ubuntu-native.json'),auth=read(root+'/ubuntu-input/source-authentication.json');assert.equal(n.status,'passed');assert(auth.passed);
 const temp=fs.mkdtempSync(root+'/ubuntu-source-offer-'),dir=temp+'/noble-mount';fs.mkdirSync(dir+'/sources',{recursive:true});fs.mkdirSync(dir+'/recipes');
 const files=[];for(const name of inputs.concat(changed)){const input=root+(inputs.includes(name)?'/ubuntu-input/':'/ubuntu-output/')+name;fs.copyFileSync(input,dir+'/sources/'+name);files.push({name,sha256:sha(fs.readFileSync(input))});}
 for(const name of recipes)fs.copyFileSync(new URL(name,import.meta.url),dir+'/recipes/'+name);
 fs.writeFileSync(dir+'/manifest.json',JSON.stringify({previousOffer:{filename:'security-noble-mount-20261012-source.tar.gz',sha256:'9661403044f1420f0a2f4fbf48b9cfc3351152713232cfad0f403ff16cea3c84',unchanged:true},integrationCorrection:'Native source and packages unchanged. Redlib deployment must change both its exact Compose default and existing nonsecret REDLIB_IMAGE override; previous attempt failed before any production pin write/recreation.',version,vendorVersion,files,originalAuthentication:auth,patch:'ubuntu-target-pinning.patch',adaptation:'Complete Ubuntu 2.39.3 vendor target-FD repair with upstream September pre-canonicalization and classic-mount FD pinning; retain new-mount API and all Ubuntu vendor patches. Require openat2/procfs for restricted paths instead of unsafe fallback. No public ABI additions/removals.',tests:{exports:n.exports.length,targetComparisons:n.checks.length,upstream:read(root+'/ubuntu-upstream-exception.json')},reproduction:'Unpack complete modified DSC using dpkg-source. Install authenticated Ubuntu Noble Build-Depends in a bounded disposable compiler. Run dpkg-buildpackage -b -us -uc -j2 as an unprivileged user. Two container device-number lsfd failures independently reproduce using the official Ubuntu binary; ubuntu-finish-build binds that exception and the 17 passing native libmount tests before packaging without repeating tests. Only mount/libmount1 binary packages are deployed; no unrelated package or private data is included.'},null,2)+'\n');
 run('tar',['--sort=name','--mtime=2026-10-12T00:00:00Z','--owner=0','--group=0','--numeric-owner','-czf',archive,'-C',temp,'noble-mount']);
 const p={date:new Date().toISOString(),filename,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};fs.writeFileSync(receipt,JSON.stringify(p,null,2)+'\n');console.log(JSON.stringify(p));
}

