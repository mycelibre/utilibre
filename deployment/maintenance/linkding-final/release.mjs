// Existing native SQLite backup API, then same-application library replacement.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/linkding-python-20261011',file=dir+'/release-p2.json';
const name='utilibre-linkding-linkding-1',ref='utilibre-linkding:1.47.0-python-security-20261011-p2';
const docker=(...a)=>{try{return execFileSync('docker',a,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']});}catch{throw Error('Docker operation failed; private values not emitted.');}};
const inspect=x=>JSON.parse(docker('inspect',x))[0];
const args=['compose','-p','utilibre-linkding','-f','/home/ubuntu/freetools/deployment/community/compose.linkding.yaml'];
const config=()=>JSON.parse(docker(...args,'config','--format','json')).services.linkding;
const hash=s=>{const{image,...rest}=s;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
if(process.argv[2]==='prepare'){
 const test=JSON.parse(await readFile(dir+'/stage-p2.json'));assert.equal(test.status,'passed');
 const x=inspect(name);assert.equal(x.Image,test.oldImage);assert.equal(inspect(ref).Id,test.newImage);
 const backup='/opt/utilibre/community-backups/linkding-p2-'+new Date().toISOString().replace(/[:.]/g,'-');await mkdir(backup,{mode:0o700});
 for(const filename of ['db.sqlite3','tasks.sqlite3'])execFileSync('python3',['-c',
  'import sqlite3,sys,os; os.umask(0o077); s=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True); d=sqlite3.connect(sys.argv[2]); s.backup(d); assert d.execute("pragma integrity_check").fetchall()==[("ok",)]; d.close(); s.close()',
  '/opt/utilibre/community-data/linkding/'+filename,backup+'/'+filename],{stdio:['ignore','pipe','pipe']});
 const r={name,service:'linkding',oldImage:x.Image,oldRef:x.Config.Image,newImage:test.newImage,newRef:ref,configHash:hash(config()),backup,status:'prepared'};
 await writeFile(file,JSON.stringify(r,null,2)+'\n');console.log('Current native SQLite backups integrity-checked; release prepared.');
}else if(process.argv[2]==='apply'){
 const r=JSON.parse(await readFile(file));assert.equal(config().image,ref);assert.equal(hash(config()),r.configHash);assert.equal(inspect(ref).Id,r.newImage);
 const save=()=>writeFile(file,JSON.stringify(r,null,2)+'\n');
 await releaseReviewedRow(r,inspect(name).Image,{inspect,save,start:()=>docker(...args,'up','-d','--no-deps','--no-build','--pull','never','linkding'),rollback:async()=>{
  const f=dir+'/rollback-p2.json';await writeFile(f,JSON.stringify({services:{linkding:{image:r.oldRef}}}));docker(...args,'-f',f,'up','-d','--no-deps','--no-build','--pull','never','linkding');
 }});console.log('Linkding exact candidate is healthy; same app/schema/privacy configuration.');
}else throw Error('Use prepare or apply');
