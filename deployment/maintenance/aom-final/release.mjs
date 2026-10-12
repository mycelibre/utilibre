// One same-engine image replacement, after native gates and isolated restore.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {releaseReviewedRow} from '../release-postgres-vendor-security.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/aom-final-20261011';
const source='/home/ubuntu/freetools/deployment/calendar/compose.gathio.yaml';
const oldRef='utilibre-gathio-documentdb:17.11-0.107.0-gosu-security-20261011-p2';
const newRef='utilibre-gathio-documentdb:17.11-0.107.0-aom-security-20261011';
const newImage='sha256:4e0932f601d929d237445f5699b9f7b456bf453b995ada1ed86d238708332d15';
const command=(c,a)=>{try{return execFileSync(c,a,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();}catch(e){fs.writeFileSync(dir+'/release-error.log',String(e.stderr||e.message));throw Error('Native release command failed; restricted diagnostic retained.');}};
const docker=(...a)=>command('docker',a);
const compose=['compose','-f',source];
const inspect=n=>JSON.parse(docker('inspect',n))[0];
const config=()=>JSON.parse(docker(...compose,'config','--format','json')).services.postgres;
const hash=c=>{const{image,...rest}=c;return createHash('sha256').update(JSON.stringify(rest)).digest('hex');};
const path=dir+'/release.json';
if(process.argv[2]==='prepare'){
 const stage=JSON.parse(fs.readFileSync(dir+'/checks.json'));assert.equal(stage.status,'passed');assert.equal(stage.imageId,newImage);
 const sqlite=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/sqlite-final-20261011/checks.json'));assert.equal(sqlite.status,'passed');assert(sqlite.rows.some(r=>r.candidateId===stage.baseId&&r.sharedLibraryFiveRegressions));
 const restore=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/gathio-20261011/gathio-restore.json'));
 assert.equal(restore.image,newRef);assert(restore.nativeGathioReopen&&restore.uploadedImage&&restore.wrongTokenRejected&&restore.cleanPostgresFilesystemRestore);
 assert(Date.now()-Date.parse(restore.date)<3600000);
 const x=inspect('utilibre-gathio-postgres-1');assert.equal(x.Image,inspect(oldRef).Id);assert.equal(config().image,oldRef);assert.equal(x.State.Health.Status,'healthy');assert.equal(inspect(newRef).Id,newImage);
 fs.writeFileSync(path,JSON.stringify({date:new Date().toISOString(),status:'prepared',backup:restore.backup,row:{name:'utilibre-gathio-postgres-1',oldRef,oldImage:x.Image,newRef,newImage,configHash:hash(config())}},null,2)+'\n');
 console.log('Exact combined SQLite/AOM image prepared; fresh scoped native restore passed.');
}else if(process.argv[2]==='apply'){
 const report=JSON.parse(fs.readFileSync(path)),r=report.row;assert.equal(report.status,'prepared');assert(Date.now()-Date.parse(report.date)<3600000);
 assert.equal(config().image,newRef);assert.equal(hash(config()),r.configHash);assert.equal(inspect(newRef).Id,newImage);
 const save=()=>fs.writeFileSync(path,JSON.stringify(report,null,2)+'\n');
 await releaseReviewedRow(r,inspect(r.name).Image,{save,inspect:async name=>{
  const x=inspect(name);
  if(name===r.name&&x.Image===newImage&&x.State.Health?.Status==='healthy'){
   assert.equal(docker('exec',r.name,'dpkg-query','-W','-f','${Version}','libaom3'),'3.14.1-1');
   assert.equal(docker('exec',r.name,'dpkg-query','-W','-f','${Version}','libsqlite3-0'),'3.40.1-2+deb12u2+utilibre1');
   command('node',['deployment/maintenance/check-gathio-live.mjs']);
  }return x;
 },start:()=>docker(...compose,'up','-d','--no-deps','--no-build','--pull','never','postgres'),rollback:()=>{
  const text=fs.readFileSync(source,'utf8');assert(text.includes(newRef));fs.writeFileSync(source,text.replace(newRef,oldRef));
  docker(...compose,'up','-d','--no-deps','--no-build','--pull','never','postgres');
 }});
 report.status='passed';report.completedAt=new Date().toISOString();report.publicNativeCreateExportDelete=true;save();
 console.log('Gathio same-engine release passed: exact libraries, native event/ICS/deletion and public HTTPS.');
}else throw Error('Use prepare, edit only reviewed image pin, then apply.');
