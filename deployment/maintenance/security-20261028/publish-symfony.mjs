// Dependency source offer only; no application data or configuration is copied.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
if(process.argv.length===3&&process.argv[2]==='--mongoc-nov9'){
 process.umask(0o077);
 const here=new URL('../security-20261109/',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-20261109/mongoc';
 const input=JSON.parse(fs.readFileSync(here+'mongoc-inputs.json')),b=JSON.parse(fs.readFileSync(root+'/coturn/build.json'));
 for(const name of ['inventory','application','scan-gate']){const p=JSON.parse(fs.readFileSync(root+'/coturn/'+name+'.json'));assert(p.passed&&p.imageId===b.imageId);}
 const sha=b=>createHash('sha256').update(b).digest('hex'),stage=fs.mkdtempSync('/dev/shm/utilibre-mongoc-source-');
 try{
  const source='/var/lib/utilibre-maintenance/security-20261028/bson/input/source';
  assert.equal(sha(fs.readFileSync(source+'/'+input.cursor.files[0])),input.cursor.beforeSha256);
  fs.cpSync(source,stage+'/source',{recursive:true,filter:p=>!p.split('/').includes('.pc')});
  assert(fs.existsSync(stage+'/source/COPYING')||fs.existsSync(stage+'/source/LICENSE'));
  fs.mkdirSync(stage+'/recipe');
  for(const name of ['mongoc-inputs.json','mongoc-compiler.Dockerfile','build-mongoc.sh','mongoc.mjs','mongoc-policy.mjs',...input.cursor.pins.map(p=>p.patchFile)])fs.copyFileSync(here+name,stage+'/recipe/'+name);
  for(const pin of input.cursor.pins)assert.equal(sha(fs.readFileSync(stage+'/recipe/'+pin.patchFile)),pin.patchSha256);
  fs.copyFileSync(new URL('../coturn-bson-final/native.c',import.meta.url),stage+'/recipe/ordinary-client.c');
  fs.writeFileSync(stage+'/README.txt','Complete retained Mongo C driver 1.30.4 source with prior Debian, OCSP and BSON corrections, plus two exact upstream cursor fixes. Apply both patches in the declared order with zero fuzz, then require the declared cursor postimage. Build recipe preserves TLS, SASL, encryption and compression; it replaces only libmongoc, not libbson or libmongocrypt. Compiler overlay uses the exact local image and package hashes. Ordinary old-header client source is included; its retained executable identity is in the manifest. Existing complete adapters and isolated relay fixture: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance . No production data, secrets or configuration. No byte-for-byte build reproduction or external-network compatibility claim.\n');
  const filename='security-mongoc-20261109-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
  assert(!fs.existsSync(archive));
  cp.execFileSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',root+'/source.tar.gz','-C',stage,'.'],{timeout:60000});
  fs.copyFileSync(root+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);
  fs.writeFileSync(root+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),published:true,filename,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size},null,2)+'\n');
 }finally{fs.rmSync(stage,{recursive:true});}
 process.exit(0);
}
process.umask(0o077);const expression=process.argv.includes('--batch-20261109');assert(process.argv.length===(expression?3:2));const here=new URL(expression?'../security-20261109/':'.',import.meta.url).pathname,root='/var/lib/utilibre-maintenance/security-'+(expression?'20261109':'20261028')+'/symfony',out=root+'/offer',inputs=JSON.parse(fs.readFileSync(here+'symfony-inputs.json'));
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
for(const n of expression?['symfony-inputs.json','expression-check.php','expression-policy.mjs']:['symfony-inputs.json','symfony-header.patch','symfony-yaml.patch','symfony-check.php','symfony.mjs','publish-symfony.mjs'])fs.copyFileSync(here+n,out+'/'+n);
if(expression)for(const n of ['symfony.mjs','publish-symfony.mjs'])fs.copyFileSync(new URL('./'+n,import.meta.url),out+'/'+n);
fs.writeFileSync(out+'/README.txt',expression?'Exact original and repaired Symfony ExpressionLanguage components with upstream MIT notices. Only Parser.php is replaced with the compatible 5.4.54 / 7.4.21 upstream source, pinned in symfony-inputs.json. Ordinary local expression checks and isolated native application flows pass. No excessive-depth reproduction. Installed package metadata retained; raw scanner records require exact deployed-source review. No account data, secrets or configuration. Complete maintained adapters: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance .\n':'Exact original and patched Symfony components, including upstream MIT notices. Header fix: 343a1772ce6ac03e48b228d2d7168d19750e3f36, including 9ffa802 compatibility correction. YAML wrapper from release 7.4.21, commit 76ebb5337a07da6ddf5ce6cdf0cc1e5f6ba6f9b2. Installed package metadata retained. Native application tests and release gates: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/security-20261028 . No user data, configuration, secrets or production database.\n');
const filename='security-symfony-'+(expression?'20261109':'20261028')+'-source.tar.gz',archive='/opt/utilibre/toolbox-public/'+filename;
run('tar',['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner','-czf',root+'/source.tar.gz','-C',out,'.']);fs.copyFileSync(root+'/source.tar.gz',archive);fs.chmodSync(archive,0o644);
fs.writeFileSync(root+'/source-offer.json',JSON.stringify({date:new Date().toISOString(),published:true,filename,archive,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size},null,2)+'\n');
