// Stage only Rallly's compiled application and Effect package on its repaired parent.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261122/rallly-effect';
const parent='sha256:03ba573731f9b4060ff0e68732ab04cf7ec635049bdb2cab6c1e5f5e6ed72660';
const tag='utilibre-rallly:4.15.4-effect3221-permissions-20261122';
const archive=root+'/app.tar.gz';
const effect='/var/lib/utilibre-maintenance/security-20261122/effect/effect-3.22.1.tgz';
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const run=(name,args,opts={})=>cp.execFileSync(name,args,{encoding:'utf8',timeout:180000,maxBuffer:8*1024**2,stdio:['ignore','pipe','pipe'],...opts}).trim();
const build=JSON.parse(fs.readFileSync(root+'/build.json'));
assert(build.passed&&build.baseImage===parent&&build.isolatedNetwork==='none'&&build.databaseTouched===false);
assert.equal(sha(archive),build.applicationArchiveSha256);
assert.equal(build.lockSha256,'fcb87821d6a3811524d195e8513755930ecb59c1aaeef50f334ef2a7fa5dfaa6');
assert.equal(sha(effect),'94d00b7672f53dcb7482c3eea269ae0ce704ff138d07e9103a26433b2bb3d986');
assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-community-rallly-1']),parent);
assert.equal(run('docker',['image','inspect','--format','{{.Id}}',parent]),parent);
assert(!fs.existsSync(root+'/stage-v2')&&!fs.existsSync(root+'/stage-v2.json'));
const stage=root+'/stage-v2';fs.mkdirSync(stage+'/app/apps/web',{recursive:true,mode:0o700});
const names=run('tar',['-tzf',archive]).split('\n');
assert(names.length>1000&&names.every(p=>p.startsWith('./')&&!p.split('/').includes('..')));
for(const p of ['./apps/web/.next/','./apps/web/server.js'])assert(names.includes(p));
run('tar',['-xzf',archive,'-C',stage+'/app','./apps/web/.next/','./apps/web/server.js']);
fs.mkdirSync(stage+'/effect',{mode:0o700});
run('tar',['-xzf',effect,'-C',stage+'/effect','--strip-components=1']);
const installed=JSON.parse(fs.readFileSync(stage+'/effect/package.json'));
assert.equal(installed.name,'effect');assert.equal(installed.version,'3.22.1');
assert(fs.statSync(stage+'/app/apps/web/server.js').size>500);
assert(fs.existsSync(stage+'/app/apps/web/.next/server'));
const df=`FROM ${parent}\nUSER 0\nRUN rm -rf /app/apps/web/.next /app/node_modules/effect\nCOPY --chown=nextjs:nodejs app/apps/web/.next /app/apps/web/.next\nCOPY --chown=nextjs:nodejs app/apps/web/server.js /app/apps/web/server.js\nCOPY --chown=nextjs:nodejs effect /app/node_modules/effect\nUSER nextjs\n`;
fs.writeFileSync(stage+'/Dockerfile',df,{mode:0o600});
const old=JSON.parse(run('docker',['image','inspect','--format','{{json .Config}}',parent]));
run('docker',['build','--network','none','--pull=false','-t',tag,stage],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
const image=run('docker',['image','inspect','--format','{{.Id}}',tag]);
assert.notEqual(image,parent);
assert.deepEqual(JSON.parse(run('docker',['image','inspect','--format','{{json .Config}}',image])),old);
const actual=run('docker',['run','--rm','--network','none','--read-only','--log-driver','none','--memory','256m','--cpus','1','--entrypoint','node',image,'-p','require("/app/node_modules/effect").Schema ? require("/app/node_modules/effect/package.json").version : "missing"']);
assert.equal(actual,'3.22.1');
fs.writeFileSync(root+'/stage-v2.json',JSON.stringify({passed:true,date:new Date().toISOString(),base:parent,imageId:image,tag,
 configurationUnchanged:true,sourceArchiveSha256:build.sourceSha256,applicationArchiveSha256:build.applicationArchiveSha256,
 effectTarSha256:sha(effect),changedPaths:['/app/apps/web/.next','/app/apps/web/server.js','/app/node_modules/effect'],
 productionChanged:false},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({staged:true,imageId:image,productionChanged:false}));
