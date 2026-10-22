// Rebuild browser assets without replacing the repaired server/sandbox runtime.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const dir='/var/lib/utilibre-maintenance/security-20261022/grist',b=JSON.parse(fs.readFileSync(dir+'/client-build.json'));
process.umask(0o077);assert(b.passed&&b.fullFrontendBuild&&b.dompurify==='3.4.17');
assert.equal(createHash('sha256').update(fs.readFileSync(dir+'/client.tar.gz')).digest('hex'),b.archiveSha256);
const run=(args,opts={})=>{try{return cp.execFileSync('docker',args,{encoding:'utf8',timeout:180000,maxBuffer:4*1024**2,stdio:['ignore','pipe','pipe'],...opts});}catch(e){fs.writeFileSync(dir+'/stage-error.log',String(e.stdout||'')+String(e.stderr||e.message));throw Error('Grist staging failed; private evidence retained');}};
const cfg=id=>JSON.parse(run(['image','inspect','--format','{{json .Config}}',id]));const original=cfg(b.base);assert.equal(original.User,'1000:1000');
const candidate='utilibre-grist:1.7.21-dom3417-security-20261022';
fs.writeFileSync(dir+'/Dockerfile',`FROM ${b.base}\nUSER 0\nRUN test -d /grist/static && test -d /grist/node_modules/isomorphic-dompurify/node_modules/dompurify && rm -r /grist/static /grist/node_modules/dompurify /grist/node_modules/isomorphic-dompurify/node_modules/dompurify\nADD client.tar.gz /grist/\nRUN cp -a /grist/node_modules/dompurify /grist/node_modules/isomorphic-dompurify/node_modules/dompurify\nUSER "1000:1000"\n`);
run(['build','--network','none','--pull=false','-t',candidate,dir],{env:{...process.env,DOCKER_BUILDKIT:'0'}});
const imageId=run(['image','inspect','--format','{{.Id}}',candidate]).trim();assert.deepEqual(cfg(imageId),original);
fs.writeFileSync(dir+'/build.json',JSON.stringify({date:new Date().toISOString(),key:'grist',passed:true,base:b.base,container:'utilibre-records-grist-1',candidate,imageId,configurationUnchanged:true,productionChanged:false},null,2));console.log(JSON.stringify({candidate,imageId}));
