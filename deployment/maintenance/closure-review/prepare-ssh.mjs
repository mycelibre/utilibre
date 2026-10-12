// Backport the exact upstream client lifetime fix to Debian's maintained 10.0
// tree. Keep Debian's extra GSSAPI declarations, and omit upstream RCS dates.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/ssh-closure-20261012';
const commit='e8bdfb151a356d0171fea4194dd205fbb252be23';
const response=await fetch('https://api.github.com/repos/openssh/openssh-portable/commits/'+commit);
assert(response.ok);const source=await response.json();assert.equal(source.sha,commit);
assert.deepEqual(source.files.map(x=>x.filename).sort(),['ssh.c','sshconnect.c','sshconnect.h','sshconnect2.c']);
const records=[];
for(const f of source.files){
 const file=root+'/openssh-10.0p1/'+f.filename,original=fs.readFileSync(file,'utf8');let text=original;
 for(const hunk of f.patch.split(/(?=^@@ )/m).filter(x=>x.startsWith('@@ '))){
  if(hunk.startsWith('@@ -1,4 '))continue;
  const lines=hunk.split('\n').slice(1);
  const old=lines.filter(l=>!l.startsWith('+')).map(l=>l.slice(1)).join('\n');
  const next=lines.filter(l=>!l.startsWith('-')).map(l=>l.slice(1)).join('\n');
  if(text.includes(old)){assert.equal(text.split(old).length,2);text=text.replace(old,next);continue;}
  // Only this hunk differs: Debian inserts four GSSAPI declarations between
  // the signature and assignments. Apply each upstream changed block intact.
  assert.equal(f.filename,'sshconnect2.c');assert(hunk.includes('xxx_host = xstrdup(host)'));
  for(const [a,b] of [
   ['ssh_kex2(struct ssh *ssh, char *host, struct sockaddr *hostaddr, u_short port,\n    const struct ssh_conn_info *cinfo)','ssh_kex2(struct ssh *ssh, char *host, struct sockaddr_storage *hostaddr,\n    u_short port, const struct ssh_conn_info *cinfo)'],
   ['\txxx_host = host;\n\txxx_hostaddr = hostaddr;\n\txxx_conn_info = cinfo;','\txxx_host = xstrdup(host);\n\txxx_hostaddr = *hostaddr;\n\txxx_conn_info = ssh_conn_info_dup(cinfo);'],
  ]){assert.equal(text.split(a).length,2);assert(old.includes(a));assert(next.includes(b));text=text.replace(a,b);}
 }
 assert.notEqual(text,original);
 fs.writeFileSync(root+'/'+f.filename+'.before',original);fs.writeFileSync(file,text);
 const sha=x=>createHash('sha256').update(x).digest('hex');records.push({file:f.filename,before:sha(original),after:sha(text),upstreamPatchSha256:sha(f.patch)});
}
const patch=records.map(r=>{
 try{return cp.execFileSync('diff',['-u','--label','a/'+r.file,'--label','b/'+r.file,root+'/'+r.file+'.before',root+'/openssh-10.0p1/'+r.file],{encoding:'utf8'});}catch(e){assert.equal(e.status,1);return e.stdout;}
}).join('');
fs.writeFileSync(root+'/client-lifetime-backport.patch',patch);
fs.writeFileSync(root+'/backport.json',JSON.stringify({date:new Date().toISOString(),commit,source:source.html_url,records},null,2)+'\n');
console.log('Four exact upstream client lifetime hunks adapted; Debian GSSAPI declarations retained.');
