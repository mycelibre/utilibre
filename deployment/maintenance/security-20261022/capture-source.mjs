// Finite source capture for already-tested builds, not a generic patch engine.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const repo='/home/ubuntu/freetools',out='/var/lib/utilibre-maintenance/security-20261022',key=process.argv[2];assert(['spliit','degoog','grist','rallly'].includes(key));
const specs={spliit:{source:'/opt/utilibre/community-src/spliit-utilibre-1.29.0-p1',revision:'d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a',patch:'deployment/spliit/security-dependencies.patch',lock:'package-lock.json'},degoog:{source:'/opt/utilibre/community-src/degoog',revision:'4a9bcc74f0fceaa33efbab4777f063274cce23d6',patch:'deployment/community/degoog-security.patch',lock:'bun.lock'},grist:{source:'/opt/utilibre/evaluation-src/grist-20261011',revision:'6dfae2fa33af6ef057b5de676afc85e6f3026fc6',patch:'deployment/grist/browser-security.patch',lock:'yarn.lock'},rallly:{source:'/opt/utilibre/community-src/rallly',revision:'4b61a00b1abcbe480d6b3992b5d98b01754e90c6',patch:'deployment/community/rallly-security.patch',lock:'pnpm-lock.yaml'}};
const s=specs[key],dir=out+'/'+key,build=JSON.parse(fs.readFileSync(dir+'/build.json'));
assert(build.passed);const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:90000,maxBuffer:24*1024**2,stdio:['ignore','pipe','pipe'],...opts});
const stage=fs.mkdtempSync('/opt/utilibre/source-'+key+'-security-'),src=stage+'/'+key;fs.mkdirSync(src);
run('git',['-C',s.source,'archive','--format=tar','--output='+stage+'/original.tar',s.revision]);run('tar',['-xf',stage+'/original.tar','-C',src]);
run('git',['init','-q',src]);run('git',['-C',src,'add','.']);
if(key==='spliit')run('git',['-C',src,'apply',repo+'/'+s.patch]);
for(const f of ['package.json',s.lock])fs.copyFileSync(dir+'/'+f,src+'/'+f);
if(key==='rallly')fs.copyFileSync(dir+'/web-package.json',src+'/apps/web/package.json');
if(key==='spliit'){
 const p=src+'/src/components/currency-selector.tsx',a='  const flagUrl = `https://flagcdn.com/h24/${\n    currency?.code.length ? currency.code.slice(0, 2).toLowerCase() : \'un\'\n  }.png`\n',b='      <img src={flagUrl} className="w-4" alt="" />\n',text=fs.readFileSync(p,'utf8');
 if(text.includes(a)||text.includes(b)){assert.equal(text.split(a).length,2);assert.equal(text.split(b).length,2);fs.writeFileSync(p,text.replace(a,'').replace(b,''));}
 else assert(!text.includes('flagUrl')&&!text.includes('flagcdn.com'),'Unexpected currency privacy adaptation');
}
if(key==='grist'){
 const file=src+'/app/server/lib/ActiveDoc.ts';let text=fs.readFileSync(file,'utf8');
 assert.equal(createHash('sha256').update(text).digest('hex'),'f0e9d0809d8f4eb626d39323a9e0dd6f5f9e9824237a7d552e236b833f973177');
 for(const [a,b] of [['import imageSize from "image-size";','import { imageSizeFromFile } from "image-size/fromFile";'],['      dimensions = await bluebird.fromCallback((cb: any) => imageSize(fileData.absPath, cb));','      dimensions = await imageSizeFromFile(fileData.absPath);']]){assert.equal(text.split(a).length,2);text=text.replace(a,b);}
 fs.writeFileSync(file,text);
}
const changed=run('git',['-C',src,'diff','--name-only']).trim().split('\n'),allowed=key==='spliit'?['Dockerfile','package.json',s.lock,'src/components/currency-selector.tsx']:key==='rallly'?['package.json',s.lock,'apps/web/package.json']:key==='grist'?['package.json',s.lock,'app/server/lib/ActiveDoc.ts']:['package.json',s.lock];assert.deepEqual(changed.sort(),allowed.sort());
const patch=run('git',['-C',src,'diff','--binary']);fs.writeFileSync(repo+'/'+s.patch,patch);
const clean=stage+'/check';fs.mkdirSync(clean);run('tar',['-xf',stage+'/original.tar','-C',clean]);run('git',['apply','--check',repo+'/'+s.patch],{cwd:clean});run('git',['apply',repo+'/'+s.patch],{cwd:clean});run('git',['apply','--reverse','--check',repo+'/'+s.patch],{cwd:clean});
const h=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');for(const f of changed)assert.equal(h(clean+'/'+f),h(src+'/'+f));
fs.mkdirSync(src+'/utilibre-security');fs.copyFileSync(repo+'/'+s.patch,src+'/utilibre-security/approved-source.patch');
const nextApp=['spliit','rallly'].includes(key),recipe=nextApp?'next-app':key;
for(const f of ['build-'+recipe+'.mjs','build-'+recipe+'.sh',...(nextApp?['pin-next-app.cjs']:[])])fs.copyFileSync(repo+'/deployment/maintenance/security-20261022/'+f,src+'/utilibre-security/'+f);
fs.writeFileSync(src+'/utilibre-security/BUILD.txt',`Upstream ${s.revision}; prepared 22 October 2026. Modified application source and exact dependency lock are included. Native notices retained. No credentials or user data. Use the frozen lock with the package manager/version recorded in the build script. The maintenance scripts show the verified compilation procedure but their pinning step expects the old baseline: do not rerun that step or reapply the patch to this already-patched archive. For Rallly set NEXT_PUBLIC_SELF_HOSTED=true, NEXT_PUBLIC_APP_VERSION=4.15.4, API_BASE_URL empty, disable build telemetry and use pnpm db:generate then the native web build; the build script records the bounded worker configuration. Runtime packaging is layered on the exact previously repaired image identified by build-${recipe}.mjs. A fresh upstream image is not equivalent to that repaired runtime and must pass all maintenance gates.\n`);
if(key==='spliit')fs.cpSync(repo+'/deployment/spliit',src+'/utilibre-deployment',{recursive:true,filter:p=>!p.split('/').at(-1).startsWith('.env')});
const archive=stage+'/'+key+'-utilibre.tar.gz';run('tar',['--exclude=.git','-czf',archive,'-C',stage,key]);
fs.writeFileSync(dir+'/source-capture.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:build.imageId,revision:s.revision,patch:s.patch,patchSha256:h(repo+'/'+s.patch),lockSha256:h(src+'/'+s.lock),changed,archive,archiveSha256:h(archive),cleanApplyAndReverseCheck:true},null,2),{mode:0o600});
console.log(key+': frozen source patch, clean apply/reverse check and source archive captured.');
