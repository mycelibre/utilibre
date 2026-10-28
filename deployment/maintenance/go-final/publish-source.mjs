// Publish only reviewed source files, exact dependency locks and build recipes.
// Never traverse production data, application settings, environment or secrets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import cp from 'node:child_process';
import path from 'node:path';
import {createHash} from 'node:crypto';
process.umask(0o077);
const oct28=process.argv.includes('--oct28'),root=oct28?'/var/lib/utilibre-maintenance/security-20261028/go':'/var/lib/utilibre-maintenance/go-final-20261011',repo='/home/ubuntu/freetools',recipe=repo+'/deployment/maintenance/go-final';
const prepared=oct28?{rows:JSON.parse(fs.readFileSync(root+'/build.json')).rows.map(b=>({...b,source:root+'/'+b.key+'/source',commit:b.sourceCommit}))}:JSON.parse(fs.readFileSync(root+'/prepare.json'));
const builds=JSON.parse(fs.readFileSync(root+'/build.json'));assert.equal(builds.status,'passed');
const sha=b=>createHash('sha256').update(b).digest('hex');
const stage=fs.mkdtempSync(root+'/source-'),rows=[];
for(const s of prepared.rows){
 const build=builds.rows.find(x=>x.key===s.key);assert(build?.imageId);
 if(oct28){const prior=JSON.parse(fs.readFileSync('/var/lib/utilibre-maintenance/go-final-20261011/prepare.json')).rows.find(p=>p.key===s.key);assert(prior.commit===s.commit);s.ldflags=prior.ldflags;}
 const out=stage+'/'+s.key;fs.mkdirSync(out);
 for(const entry of s.sourceFiles){
  const rel=entry.path;assert(!path.isAbsolute(rel)&&!rel.split('/').some(p=>['..','.git','.env','runtime.env','secrets','backups','node_modules'].includes(p)));
  if(['go.mod','go.sum','Dockerfile.utilibre'].includes(rel))continue;
  const from=s.source+'/'+rel;assert(fs.lstatSync(from).isFile()&&!fs.lstatSync(from).isSymbolicLink());assert.equal(sha(fs.readFileSync(from)),entry.sha256,'Source changed after compile: '+rel);
  fs.mkdirSync(path.dirname(out+'/'+rel),{recursive:true});fs.copyFileSync(from,out+'/'+rel);
 }
 for(const lock of ['go.mod','go.sum'])fs.copyFileSync(recipe+'/locks/'+s.key+'/'+lock,out+'/'+lock);
 const dockerfile=repo+'/deployment/'+(s.key==='galene'?'pack':'community')+'/Dockerfile.'+(s.key==='safetwitch'?'safetwitch-backend':s.key);
 fs.copyFileSync(dockerfile,out+'/Dockerfile.utilibre');
 if(s.key==='rimgo')fs.copyFileSync(oct28?root+'/rimgo/rimgo-app.css':root+'/input/rimgo-app.css',out+'/static/app.css');
 fs.copyFileSync(recipe+'/build.sh',out+'/UTILIBRE-build.sh');
 fs.writeFileSync(out+'/UTILIBRE-GO-SECURITY.json',JSON.stringify({sourceCommit:s.commit,image:s.candidate,imageId:build.imageId,compiler:oct28?'go1.26.10':'go1.26.9',compilerImage:oct28?s.compiler:'golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade',...(oct28?{compilerArchive:s.compilerArchive}:{} ),moduleChanges:build.moduleChanges,ldflags:s.ldflags,license:'Original upstream license files included and unchanged; Go standard library and golang.org/x modules use their upstream BSD-style licenses.',build:'go mod verify; CGO_ENABLED=0 GOTOOLCHAIN=local GOTELEMETRY=off GOFLAGS=-mod=readonly go build -trimpath -ldflags="'+s.ldflags+'" -o app .',note:'Runtime hardening, quotas, access and request handling remain in the original image and deployment configuration. Matching integration source: https://github.com/mycelibre/utilibre/tree/main/deployment/maintenance/go-final'},null,2)+'\n');
 const name=s.key==='safetwitch'?'safetwitch-backend':s.key,archive=stage+'/'+name+'-utilibre.tar.gz',destination='/opt/utilibre/toolbox-public/'+name+'-utilibre.tar.gz';
 cp.execFileSync('tar',['-czf',archive,'-C',out,'.']);
 if(fs.existsSync(destination))fs.copyFileSync(destination,stage+'/previous-'+name+'.tar.gz');
 fs.copyFileSync(archive,destination+'.tmp');fs.chmodSync(destination+'.tmp',0o644);fs.renameSync(destination+'.tmp',destination);
 rows.push({key:s.key,imageId:build.imageId,archive:path.basename(destination),sha256:sha(fs.readFileSync(destination)),sourceCommit:s.commit});
}
fs.writeFileSync(root+'/published-source.json',JSON.stringify({date:new Date().toISOString(),status:'passed',rows,previousArchives:stage},null,2)+'\n');console.log(rows);
