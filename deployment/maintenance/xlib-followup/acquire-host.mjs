// Exact rollback archives and one native diagnostic, not a host APT upgrade.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/xlib-followup-20261012';
const opts=['-o','Dir::Etc::sourcelist='+here+'../xserver-followup/review.sources','-o','Dir::Etc::sourceparts=-','-o','Dir::State::lists=/var/lib/utilibre-maintenance/xserver-followup-20261012/apt-lists'];
const sha=b=>createHash('sha256').update(b).digest('hex');
const specs=[['libx11-6','2:1.8.12-1'],['libx11-data','2:1.8.12-1'],['libx11-xcb1','2:1.8.12-1'],['libxrender1','1:0.9.12-1'],['x11-utils','7.7+7'],['libxtst6','2:1.2.5-1'],['libxinerama1','2:1.1.4-3+b4'],['libxxf86dga1','2:1.1.5-1+b3']];
fs.mkdirSync(root+'/host/archives',{recursive:true});const records=[];
for(const [name,version]of specs){
 const index=cp.execFileSync('apt-cache',[...opts,'show',name+'='+version],{encoding:'utf8'}).trim();assert(index.startsWith('Package: '+name+'\n'));assert(index.includes('\nVersion: '+version+'\n'));
 const remote=index.match(/^Filename: (.+)$/m)[1],digest=index.match(/^SHA256: (.+)$/m)[1];assert(remote.startsWith('pool/')&&!remote.includes('..'));const file=remote.split('/').at(-1),local=root+'/host/archives/'+file;
 if(!fs.existsSync(local)){const r=await fetch('https://deb.debian.org/debian/'+remote);assert(r.ok);const data=Buffer.from(await r.arrayBuffer());assert.equal(sha(data),digest);fs.writeFileSync(local,data,{flag:'wx',mode:0o600});}
 assert.equal(sha(fs.readFileSync(local)),digest);records.push({name,version,file,sha256:digest,index});
}
fs.writeFileSync(root+'/host/acquisition.json',JSON.stringify({date:new Date().toISOString(),records},null,2)+'\n');
console.log('Authenticated rollback/isolated diagnostic archives acquired; host unchanged.');
