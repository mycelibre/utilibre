// One pure-Python Debian package, not a distribution upgrade. No service restart.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/host-final-20261011';
const recipe=new URL('./check-jwt.py',import.meta.url).pathname;
const files=[
 ['python3-jwt_2.10.1-2+deb13u1_all.deb','d6971f1c7b688e7edeff93483ccbab11083bdc19a754a7f5f37d2f7b4a97afe5'],
 ['python3-jwt_2.15.1-1_all.deb','e2bdfe81e1c0c45866e37e1a2f2fd190fcec24f8c5fc083e994733b0f915b1af'],
];
const run=(command,args,env=process.env)=>execFileSync(command,args,{env,encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}).trim();
const report={startedAt:new Date().toISOString(),status:'prepared',package:'python3-jwt',old:'2.10.1-2+deb13u1',candidate:'2.15.1-1',source:'Debian signed sid Packages; isolated download-only APT lists',files};
const save=()=>fs.writeFileSync(dir+'/jwt-release.json',JSON.stringify(report,null,2)+'\n');
for(const[file,hash]of files)assert.equal(createHash('sha256').update(fs.readFileSync(dir+'/'+file)).digest('hex'),hash);
assert.equal(run('dpkg-query',['-W','-f=${Version}','python3-jwt']),report.old);
report.staged=JSON.parse(run('/usr/bin/python3',[recipe],{...process.env,PYTHONPATH:dir+'/candidate/usr/lib/python3/dist-packages'}));
assert.equal(report.staged.passed,true);
assert.equal(run('dpkg',['--audit']),'');
save();
if(process.argv[2]==='--apply'){
 try{
  run('dpkg',['--install',dir+'/'+files[1][0]]);
  assert.equal(run('dpkg-query',['-W','-f=${Version}','python3-jwt']),report.candidate);
  report.live=JSON.parse(run('/usr/bin/python3',[recipe],{...process.env,PYTHONPATH:''}));assert.equal(report.live.passed,true);
  assert.equal(run('dpkg',['--audit']),'');report.status='passed';
 }catch{
  report.status='failed';
  try{run('dpkg',['--install',dir+'/'+files[0][0]]);assert.equal(run('dpkg-query',['-W','-f=${Version}','python3-jwt']),report.old);report.rollback='exact previous package restored';}
  catch{report.rollback='NOT VERIFIED';}
  save();throw Error('Host JWT release failed; inspect private receipt.');
 }
 report.completedAt=new Date().toISOString();save();
 console.log('Host PyJWT 2.15.1 installed; native JWT/OAuthlib tests passed; no daemon restart.');
}else console.log('Prepared package and native staged checks passed; use --apply to release.');
