// Dependency source offer only; no application data or configuration is copied.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);const here=new URL('.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261028/symfony',out=root+'/offer',inputs=JSON.parse(fs.readFileSync(here+'symfony-inputs.json'));
fs.mkdirSync(out,{recursive:true});const sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a)=>cp.execFileSync(p,a,{encoding:'utf8',timeout:60000,maxBuffer:1024**2,stdio:['ignore','pipe','pipe']}).trim();
for(const s of inputs.rows){
 const b=JSON.parse(fs.readFileSync(root+'/'+s.key+'/build.json'));assert(b.passed&&b.base===s.base);
 for(const [state,image]of [['original',s.base],['patched',b.imageId]]){
  const dir=out+'/'+s.key+'/'+state;fs.mkdirSync(dir,{recursive:true});const c=run('docker',['create','--entrypoint','/bin/true',image]);
  try{for(const name of Object.keys(s.packages).map(p=>p.split('/')[1]))run('docker',['cp',c+':'+s.site+'/'+name,dir+'/'+name]);}finally{run('docker',['rm',c]);}
  for(const f of s.files)assert.equal(sha(fs.readFileSync(dir+'/'+f.path)),f[state==='original'?'beforeSha256':'afterSha256']);
 }
}
for(const n of ['symfony-inputs.json','symfony-header.patch','symfony-yaml.patch','symfony-check.php','symfony.mjs','publish-symfony.mjs'])fs.copyFileSync(here+n,out+'/'+n);
fs.writeFileSync(out+'/README.txt','Exact original and patched Symfony components, including upstream MIT notices. Header fix: 343a1772ce6ac03e48b228d2d7168d19750e3f36, including 9ffa802 compatibility correction. YAML wrapper from release 7.4.21, commit 76ebb5337a07da6ddf5ce6cdf0cc1e5f6ba6f9b2. Installed package metadata retained. Native application tests and release gates: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/security-20261028 . No user data, configuration, secrets or production database.\n');
const filename='security-symfony-20261028-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',root+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(root+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);
fs.writeFileSync(root+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),published:true,filename,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size},null,2)+'\n');
