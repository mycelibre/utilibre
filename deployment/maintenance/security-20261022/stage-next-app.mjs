// Preserve the repaired runtime and native migration CLI; replace built app output.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const key=process.argv[2];assert(['spliit','rallly'].includes(key));
const dir='/var/lib/utilibre-maintenance/security-20261022/'+key,b=JSON.parse(fs.readFileSync(dir+'/client-build.json'));
assert(b.passed&&b.fullBuildAndUnitTests&&b.next==='16.4.1');
assert.equal(createHash('sha256').update(fs.readFileSync(dir+'/app.tar.gz')).digest('hex'),b.archiveSha256);
const run=(args,options={})=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:2*1024**2,stdio:['ignore','pipe','pipe'],...options});}catch(e){fs.writeFileSync(dir+'/stage-error.log',String(e.stdout||'')+String(e.stderr||''));throw Error('Candidate staging failed; private evidence retained');}};
const config=id=>JSON.parse(run(['image','inspect','--format','{{json .Config}}',id]));
const old=config(b.base),app=key==='spliit'?'/usr/app':'/app';assert(old.User);
const candidate=`utilibre-${key}:${key==='spliit'?'1.29.0':'4.15.4'}-next1641-security-20261022`;
const paths=key==='spliit'?['/usr/app/.next','/usr/app/node_modules/next','/usr/app/node_modules/@next/env']:JSON.parse(run(['run','--rm','--network','none','--read-only','--log-driver','none','--memory','128m','--cpus','1','--entrypoint','node',b.base,'-e',`const fs=require('fs');console.log(JSON.stringify(['/app/apps/web/.next',...fs.readdirSync('/app/node_modules/.pnpm').filter(n=>/^(next|@next\\+(env|swc[^@]*))@16\\.3\\.8(?:_|$)/.test(n)).map(n=>'/app/node_modules/.pnpm/'+n)]))`]));
assert(paths.length>=3&&paths.every(p=>p.startsWith(app+'/')&&!p.includes('..')&&/^\/[A-Za-z0-9_@+./=-]+$/.test(p)));
const cleanup=`require('fs');for(const p of ${JSON.stringify(paths)})require('fs').rmSync(p,{recursive:true,force:false})`;
fs.writeFileSync(dir+'/Dockerfile',`FROM ${b.base}\nUSER 0\nRUN node -e ${JSON.stringify(cleanup)}\nADD app.tar.gz ${app}/\nUSER ${JSON.stringify(old.User)}\n`);
run(['build','--network','none','--pull=false','-t',candidate,dir],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
const imageId=run(['image','inspect','--format','{{.Id}}',candidate]).trim();assert.deepEqual(config(imageId),old);
fs.writeFileSync(dir+'/build.json',JSON.stringify({key,date:new Date().toISOString(),passed:true,base:b.base,container:b.container,candidate,imageId,configurationUnchanged:true,onlyApplicationTreeChanged:true,removedBuildPaths:paths,productionChanged:false},null,2));console.log(JSON.stringify({key,candidate,imageId}));
