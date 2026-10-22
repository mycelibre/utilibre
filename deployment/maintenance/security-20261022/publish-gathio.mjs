// Pinned Git source + complete reviewed patch. No runtime data/config/secrets.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='/home/ubuntu/freetools',source='/opt/utilibre/calendar-src/gathio',dir='/var/lib/utilibre-maintenance/security-20261022/gathio',revision='98a5e9b719120e2f3e72f712a78c97fba1eff8e7';
const run=(exe,args,opts={})=>cp.execFileSync(exe,args,{encoding:'utf8',timeout:60000,maxBuffer:16*1024**2,...opts});
const release=JSON.parse(fs.readFileSync(dir+'/../release.json')).groups.find(g=>g.key==='gathio');assert.equal(release.status,'passed');
assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-gathio-gathio-1']).trim(),release.newImage);
assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),revision);
const stage=fs.mkdtempSync('/opt/utilibre/source-gathio-security-'),patch=run('git',['-C',source,'diff','HEAD','--binary']);
const paths=run('git',['-C',source,'diff','--name-only','HEAD']).trim().split('\n');assert.equal(paths.length,11);assert(paths.every(p=>['package.json','pnpm-lock.yaml','pnpm-workspace.yaml','src/lib/importIcs.ts','src/routes/event.ts','src/routes/frontend.ts','src/routes/group.ts','src/start.ts','src/util/generator.ts','views/event.handlebars','views/layouts/main.handlebars'].includes(p)));
// Mechanical regeneration of the existing patch, not an additional patch stack.
fs.writeFileSync(root+'/deployment/calendar/gathio/privacy-security.patch',patch);
run('git',['-C',source,'archive','--format=tar','--prefix=gathio/','--output='+stage+'/source.tar',revision]);run('tar',['-xf',stage+'/source.tar','-C',stage]);
run('git',['apply','--check',root+'/deployment/calendar/gathio/privacy-security.patch'],{cwd:stage+'/gathio'});
const dest=stage+'/gathio/utilibre';fs.mkdirSync(dest);
for(const file of ['privacy-security.patch','build.py','Dockerfile','Postgres.Dockerfile'])fs.copyFileSync(root+'/deployment/calendar/gathio/'+file,dest+'/'+file);
fs.writeFileSync(dest+'/BUILD.txt',`Gathio 1.6.7, upstream ${revision}. GPL notices retained.\nApply privacy-security.patch to this exact source; pnpm 10.30.3 install --frozen-lockfile --ignore-scripts. build.py includes the vendor assets, tests and build sequence and expects a Git checkout. DOMPurify 3.4.17 and TOML 5.0.1 are pinned in the patch and lockfile. No saved events or operator credentials are included. The production overlay preserves previously patched Node and OS libraries; a clean runtime build must also pass the maintenance security gate.\n`);
const archive=stage+'/gathio-utilibre.tar.gz',destination='/opt/utilibre/toolbox-public/gathio-utilibre.tar.gz';run('tar',['-czf',archive,'-C',stage,'gathio']);fs.copyFileSync(destination,stage+'/previous-source.tar.gz');fs.copyFileSync(archive,destination);fs.chmodSync(destination,0o644);
const url='https://tools.utilibre.org/utilibre-source/gathio-utilibre.tar.gz',response=await fetch(url,{signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await response.arrayBuffer()),sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(response.status,200);assert.equal(sha(bytes),sha(fs.readFileSync(archive)));
fs.writeFileSync(dir+'/source-publication.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:release.newImage,url,bytes:bytes.length,sha256:sha(bytes),rollback:stage+'/previous-source.tar.gz'},null,2),{mode:0o600});console.log('Gathio: reviewed source patch captured; updated public archive hash verified.');
