// Capture and publish the exact source corresponding to the fixed Rallly build.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

process.umask(0o077);
const mode=process.argv[2];
assert(['capture','publish','rollback'].includes(mode)&&process.argv.length===3);
const repo='/home/ubuntu/freetools';
const root='/var/lib/utilibre-maintenance/security-20261122/rallly-effect';
const old='/opt/utilibre/source-rallly-security-GJiJpU/rallly-utilibre.tar.gz';
const publicFile='/opt/utilibre/toolbox-public/rallly-utilibre.tar.gz';
const publicUrl='https://tools.utilibre.org/utilibre-source/rallly-utilibre.tar.gz';
const sourceHash='8046b45f519985bbf99c7386d8ff3880cd082824cc90b6d92729d50f811c8461';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const read=p=>JSON.parse(fs.readFileSync(p));
const run=(name,args)=>cp.execFileSync(name,args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe']}).trim();
const archive=root+'/rallly-utilibre-effect3221.tar.gz';
const previous=root+'/previous-public-source.tar.gz';
const captureFile=root+'/source-capture.json';
const publicationFile=root+'/source-publication.json';
assert.equal(sha(old),sourceHash);

if(mode==='capture'){
 const build=read(root+'/build.json'),stage=read(root+'/stage-v2.json');
 const native=read(root+'/native.json'),scan=read(root+'/scan-gate.json');
 assert(build.passed&&stage.passed&&native.passed&&scan.passed);
 assert.equal(stage.imageId,native.imageId);
 assert.equal(stage.imageId,scan.imageId);
 assert(!fs.existsSync(archive)&&!fs.existsSync(captureFile));
 const prepared='/opt/utilibre/temporary/security-rallly-effect-v4-20261122/prepared.tar.gz';
 assert.equal(sha(prepared),read(root+'/prepare-v4.json').stageSha256);
 const work=fs.mkdtempSync('/opt/utilibre/temporary/rallly-source-capture-');
 const src=work+'/old',fresh=work+'/fresh';
 fs.mkdirSync(src);fs.mkdirSync(fresh);
 run('tar',['-xzf',old,'-C',src]);
 const paths=['package.json','pnpm-lock.yaml',
  'apps/web/src/app/[locale]/layout.tsx',
  'apps/web/src/app/[locale]/inter-latin.woff2',
  'utilibre-security/Inter-OFL.txt'];
 run('tar',['-xzf',prepared,'-C',fresh,...paths.map(x=>'rallly/'+x)]);
 const expected=Object.fromEntries(fs.readFileSync(root+'/lock-hashes-v4.txt','utf8').trim().split('\n').map(line=>{
  const [hash,path]=line.split('  ');return [path,hash];
 }));
 for(const path of paths){
  const from=fresh+'/rallly/'+path,to=src+'/rallly/'+path;
  if(expected[path])assert.equal(sha(from),expected[path]);
  fs.mkdirSync(to.slice(0,to.lastIndexOf('/')),{recursive:true});
  fs.copyFileSync(from,to);
 }
 const security=src+'/rallly/utilibre-security';
 for(const file of ['rallly-effect-build.mjs','rallly-effect-inner.sh','rallly-effect-stage.mjs']){
  fs.copyFileSync(repo+'/deployment/maintenance/security-20261122/'+file,security+'/'+file);
 }
 fs.copyFileSync(repo+'/deployment/community/rallly-local-font.patch',security+'/rallly-local-font.patch');
 fs.writeFileSync(security+'/BUILD-EFFECT.txt',
  'Rallly upstream 4b61a00b1abcbe480d6b3992b5d98b01754e90c6, self-hosted 4.15.4. '+
  'This archive contains the exact resolved pnpm lock for Effect 3.22.1, the local Inter font and its OFL notice. '+
  'The included isolated build recipe records the pinned earlier repaired runtime parent, input archive SHA, package-manager version, source preconditions and tests. '+
  'Do not reapply its source-edit step to this already-modified archive. Build with the frozen lock, local assets and no production credentials. '+
  'The source archive is not a container image or a database backup.\n');
 run('tar',['-czf',archive,'-C',src,'rallly']);
 const report={date:new Date().toISOString(),passed:true,imageId:stage.imageId,
  previousSourceSha256:sourceHash,archiveSha256:sha(archive),
  archiveBytes:fs.statSync(archive).size,lockSha256:build.lockSha256,
  modifiedSourcePaths:paths,productionChanged:false};
 fs.writeFileSync(captureFile,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 fs.rmSync(work,{recursive:true,force:true});
 console.log('Rallly fixed-Effect source captured; publication unchanged');
}else if(mode==='publish'){
 const capture=read(captureFile),stage=read(root+'/stage-v2.json');
 assert(capture.passed&&capture.imageId===stage.imageId&&sha(archive)===capture.archiveSha256);
 assert(!fs.existsSync(publicationFile)&&!fs.existsSync(previous));
 assert.equal(sha(publicFile),sourceHash);
 fs.copyFileSync(publicFile,previous);
 fs.copyFileSync(archive,publicFile+'.new');
 fs.chmodSync(publicFile+'.new',0o644);
 fs.renameSync(publicFile+'.new',publicFile);
 const response=await fetch(publicUrl,{redirect:'manual',signal:AbortSignal.timeout(45000)});
 assert.equal(response.status,200);
 assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),capture.archiveSha256);
 fs.writeFileSync(publicationFile,JSON.stringify({date:new Date().toISOString(),passed:true,
  imageId:stage.imageId,url:publicUrl,sha256:capture.archiveSha256,rollback:previous},null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('Rallly fixed-Effect source published and public hash verified');
}else{
 assert(fs.existsSync(previous));
 assert.equal(sha(previous),sourceHash);
 assert.equal(sha(publicFile),read(captureFile).archiveSha256);
 fs.copyFileSync(previous,publicFile+'.rollback');
 fs.chmodSync(publicFile+'.rollback',0o644);
 fs.renameSync(publicFile+'.rollback',publicFile);
 console.log('Previous Rallly source publication restored');
}
