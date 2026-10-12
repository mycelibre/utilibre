import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
const prior='/var/lib/utilibre-maintenance/closure-followup-20261012';
const task='/var/lib/utilibre-maintenance/mount-acl-final-20261012';
const lists=prior+'/apt-lists';
const release=lists+'/deb.debian.org_debian_dists_bookworm_InRelease';
const verified=task+'/verified-release-'+process.pid;
try { cp.execFileSync('sqv',['--keyring','/usr/share/keyrings/debian-archive-keyring.gpg','--cleartext','--output',verified,release],{stdio:['ignore','pipe','pipe']}); }
finally { if(fs.existsSync(verified))fs.unlinkSync(verified); }
const digest=b=>createHash('sha256').update(b).digest('hex');
const index=fs.readFileSync(lists+'/deb.debian.org_debian_dists_bookworm_main_source_Sources');
assert(fs.readFileSync(release,'utf8').includes(digest(index)),'Source index must be bound to signed Release');
const entry=index.toString().split('\n\n').find(e=>e.startsWith('Package: util-linux\n')&&e.includes('Version: 2.38.1-5+deb12u3\n'));
assert(entry,'Exact native baseline source entry');
for(const name of ['util-linux_2.38.1-5+deb12u3.dsc','util-linux_2.38.1-5+deb12u3.debian.tar.xz','util-linux_2.38.1.orig.tar.xz']){
 const bytes=fs.readFileSync(task+'/sources/'+name);
 assert(entry.includes(`${digest(bytes)} ${bytes.length} ${name}`),name);
}
fs.writeFileSync(task+'/source-authentication.json',JSON.stringify({date:new Date().toISOString(),passed:true,releaseSha256:digest(fs.readFileSync(release)),indexSha256:digest(index),entry},null,2)+'\n');
console.log('Exact Bookworm baseline source authenticated against signed Debian Release.');
