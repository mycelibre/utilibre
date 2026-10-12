import fs from 'node:fs';import assert from 'node:assert/strict';
import {root,builder,sha,run,docker} from './common.mjs';
const prior='/var/lib/utilibre-maintenance/closure-followup-20261012/apt-lists';
const release=prior+'/deb.debian.org_debian_dists_sid_InRelease';
const out=root+'/verified-acl-release-'+process.pid;
try{run('sqv',['--keyring','/usr/share/keyrings/debian-archive-keyring.gpg','--cleartext','--output',out,release]);}finally{if(fs.existsSync(out))fs.unlinkSync(out);}
const index=fs.readFileSync(prior+'/deb.debian.org_debian_dists_sid_main_source_Sources');
assert(fs.readFileSync(release,'utf8').includes(sha(index)));
const entry=index.toString().split('\n\n').find(e=>e.startsWith('Package: acl\n')&&e.includes('\nVersion: 2.4.0-1\n'));assert(entry);
const names=['acl_2.4.0-1.dsc','acl_2.4.0-1.debian.tar.xz','acl_2.4.0.orig.tar.xz','acl_2.4.0.orig.tar.xz.asc'];
for(const name of names){const b=fs.readFileSync(root+'/sources/'+name);assert(entry.includes(`${sha(b)} ${b.length} ${name}`));}
fs.writeFileSync(root+'/acl-source-authentication.json',JSON.stringify({date:new Date().toISOString(),passed:true,entry,indexSha256:sha(index),releaseSha256:sha(fs.readFileSync(release))},null,2)+'\n');
docker('exec',builder,'mkdir','-p','/work/mount-acl-final/acl-output');
for(const name of names)docker('cp',root+'/sources/'+name,builder+':/work/mount-acl-final/sources/');
docker('exec',builder,'sh','-c','cd /work/mount-acl-final; test ! -e acl-source; dpkg-source --no-check -x sources/acl_2.4.0-1.dsc acl-source');
console.log('ACL 2.4.0-1 source authenticated and extracted; no runtime or ledger change.');
