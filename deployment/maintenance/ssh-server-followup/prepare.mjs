// Reproducible native stable backport; this does not install host packages.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/ssh-server-followup-20261012';
const previous='/var/lib/utilibre-maintenance/ssh-closure-20261012';
const sha=b=>createHash('sha256').update(b).digest('hex');
assert(!fs.existsSync(root),'Keep previous evidence; use a new reviewed staging root');
assert(Number(fs.statfsSync('/var/lib/utilibre-maintenance').bavail)*Number(fs.statfsSync('/var/lib/utilibre-maintenance').bsize)>8*1024**3);
fs.mkdirSync(root,{mode:0o700});
const archives=['openssh_10.0p1-7+deb13u4.dsc','openssh_10.0p1-7+deb13u4.debian.tar.xz','openssh_10.0p1.orig.tar.gz','openssh_10.0p1.orig.tar.gz.asc'];
for(const f of archives)fs.copyFileSync(previous+'/'+f,root+'/'+f);
cp.execFileSync('dpkg-source',['-x',root+'/'+archives[0],root+'/openssh-10.0p1'],{stdio:'pipe'});
const tree=root+'/openssh-10.0p1';
const lifetime=fs.readFileSync(new URL('../closure-review/openssh-client-lifetime.patch',import.meta.url));
assert.equal(sha(lifetime),sha(fs.readFileSync(previous+'/client-lifetime-backport.patch')));
fs.writeFileSync(root+'/openssh-client-lifetime.patch',lifetime);
cp.execFileSync('patch',['-p1','--batch','--forward'],{cwd:tree,input:lifetime,stdio:['pipe','pipe','pipe']});
const commits=[
 ['8dfe7ed6e2fd988de08df508355a196b956b2753',['serverloop.c']],
 ['5d04ca6af739b82fd30d84d2783ca802ebfa1192',['auth2-gss.c']],
 ['c10e04980300eab089f71aaada8b28fd878ee729',['auth2-gss.c']],
];
const baseline=new Map(),records=[];
for(const [commit,files] of commits){
 const response=await fetch('https://api.github.com/repos/openssh/openssh-portable/commits/'+commit);
 assert(response.ok);const upstream=await response.json();assert.equal(upstream.sha,commit);
 assert.deepEqual(upstream.files.map(f=>f.filename).sort(),files);
 fs.writeFileSync(root+'/'+commit+'.json',JSON.stringify(upstream,null,2)+'\n');
 const changed=[];
 for(const f of upstream.files){
  const file=tree+'/'+f.filename,original=fs.readFileSync(file,'utf8');let next=original;
  if(!baseline.has(f.filename))baseline.set(f.filename,original);
  for(const hunk of f.patch.split(/(?=^@@ )/m).filter(s=>s.startsWith('@@ '))){
   if(hunk.startsWith('@@ -1,4 '))continue;
   // Upstream renamed the BSD integer alias globally. Keep stable's ABI and
   // spelling; only hunk context needs this mechanical translation.
   const lines=hunk.split('\n').slice(1).map(s=>s.replaceAll('uint32_t','u_int32_t'));
   const before=lines.filter(s=>!s.startsWith('+')).map(s=>s.slice(1)).join('\n');
   const after=lines.filter(s=>!s.startsWith('-')).map(s=>s.slice(1)).join('\n');
   assert.equal(next.split(before).length,2,'Exact unique upstream hunk: '+f.filename);
   next=next.replace(before,after);
  }
  assert.notEqual(next,original);fs.writeFileSync(file,next);
  changed.push({file:f.filename,before:sha(original),after:sha(next),upstreamPatchSha256:sha(f.patch)});
 }
 records.push({commit,url:upstream.html_url,changed});
}
const patch=[...baseline].map(([file,before])=>{
 fs.writeFileSync(root+'/'+file+'.before',before);
 try{return cp.execFileSync('diff',['-u','--label','a/'+file,'--label','b/'+file,root+'/'+file+'.before',tree+'/'+file],{encoding:'utf8'});}catch(e){assert.equal(e.status,1);return e.stdout;}
}).join('');
fs.writeFileSync(root+'/openssh-server-backport.patch',patch);
const changelog=tree+'/debian/changelog';
fs.writeFileSync(changelog,'openssh (1:10.0p1-7+deb13u4+utilibre2) trixie; urgency=medium\n\n  * Preserve the reviewed upstream client lifetime repair.\n  * Backport DisableForwarding tunnel precedence and GSSAPI MaxAuthTries\n    repairs, retaining Debian GSSAPI/PAM support and stable dependencies.\n\n -- Utilibre Maintenance <maintenance@utilibre.local>  Mon, 12 Oct 2026 14:00:00 +0000\n\n'+fs.readFileSync(changelog,'utf8'));
const manifest={date:new Date().toISOString(),version:'1:10.0p1-7+deb13u4+utilibre2',base:'1:10.0p1-7+deb13u4',archives:Object.fromEntries(archives.map(f=>[f,sha(fs.readFileSync(root+'/'+f))])),preservedClientCommit:'e8bdfb151a356d0171fea4194dd205fbb252be23',clientPatchSha256:sha(lifetime),serverPatchSha256:sha(patch),records,predecessor:'d43ba60c91cb323ca921049b7d43b1908c318454 changes separate minimum-delay paths; the selected fix adds no dependency on its auth_failure_delay symbol and applies completely without it.',productionChanged:false};
fs.writeFileSync(root+'/backport.json',JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({root,version:manifest.version,commits:records.map(r=>r.commit),productionChanged:false}));
