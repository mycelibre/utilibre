import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
import {base,candidate,target,backport,beforeSha,sha} from './backport.mjs';
process.umask(0o077);
const dir='/var/lib/utilibre-maintenance/tanstack-20261021';fs.mkdirSync(dir,{recursive:true});
const work=fs.mkdtempSync('/tmp/utilibre-tanstack-build-');
const run=(args,opts={})=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:120000,maxBuffer:8*1024**2,stdio:['pipe','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Bounded TanStack build failed; private diagnostic retained');}};
try{
 const disk=fs.statfsSync(dir);assert(disk.bavail*disk.bsize>=8*1024**3,'Disk reserve');
 const source=run(['run','--rm','--network','none','--read-only','--cpus','1','--memory','192m','--log-driver','none','--entrypoint','node',base,'-e',`process.stdout.write(require('fs').readFileSync(${JSON.stringify(target)}))`]);
 assert.equal(sha(source),beforeSha);const next=backport(source);fs.writeFileSync(work+'/ssr.mjs',next,{mode:0o644});fs.chmodSync(work+'/ssr.mjs',0o644);
 cp.execFileSync('node',['--check',work+'/ssr.mjs']);
 const recipe=`FROM ${base}\nCOPY ssr.mjs ${target}\n`;
 fs.writeFileSync(work+'/Dockerfile',recipe);fs.writeFileSync(dir+'/Dockerfile',recipe);
 run(['build','--network','none','--pull=false','--memory','256m','-t',candidate,work],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
 const old=JSON.parse(run(['image','inspect',base]))[0],built=JSON.parse(run(['image','inspect',candidate]))[0];assert.deepEqual(built.Config,old.Config);
 const after=run(['run','--rm','--network','none','--read-only','--cpus','1','--memory','192m','--log-driver','none','--entrypoint','node',built.Id,'-e',`process.stdout.write(require('fs').readFileSync(${JSON.stringify(target)}))`]);assert.equal(after,next);
 fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),passed:true,deployed:false,base,candidate,imageId:built.Id,target,beforeSha,afterSha:sha(next),configurationUnchanged:true,changedFiles:[target],upstream:'https://github.com/TanStack/router/commit/d521abd71c69f1ff010bb3def4d417cb5fa058cb',limitation:'Security backport only; package metadata deliberately retains original versions. Behavioral and native integration gates still required.'},null,2)+'\n');console.log('Exact TanStack upstream backport candidate built; not deployed');
}finally{fs.rmSync(work,{recursive:true,force:true});}
