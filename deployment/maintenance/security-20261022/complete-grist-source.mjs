// Correct the corresponding-source companion, not the running application.
// Explicit public publication; never part of an audit/default maintenance job.
import fs from 'node:fs';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='/var/lib/utilibre-maintenance/security-20261022', dir=root+'/grist';
const read=p=>JSON.parse(fs.readFileSync(p)), sha=b=>createHash('sha256').update(b).digest('hex');
const run=(p,a,o={})=>cp.execFileSync(p,a,{encoding:'utf8',timeout:90000,maxBuffer:32*1024**2,stdio:['pipe','pipe','pipe'],...o});
process.umask(0o077);
assert(!fs.existsSync(dir+'/source-completion.json'),'Preserve completed publication evidence');
const publication=read(root+'/redirects/source-publication.json'), target=publication.images.find(r=>r.key==='grist-redirects');
assert(target&&publication.passed);
assert.equal(run('docker',['inspect','--format','{{.Image}}','utilibre-records-grist-1']).trim(),target.imageId);
const archive='/opt/utilibre/toolbox-public/grist-utilibre.tar.gz';assert.equal(sha(fs.readFileSync(archive)),publication.grist.sha256);
const work=fs.mkdtempSync('/opt/utilibre/grist-source-completion-');
fs.copyFileSync(archive,work+'/previous-source.tar.gz');
run('tar',['-xzf',archive,'-C',work]);
const source=work+'/grist', file=source+'/app/server/lib/ActiveDoc.ts';
const original=fs.readFileSync(file,'utf8');
const changes=[
 ['import imageSize from "image-size";','import { imageSizeFromFile } from "image-size/fromFile";'],
 ['      dimensions = await bluebird.fromCallback((cb: any) => imageSize(fileData.absPath, cb));','      dimensions = await imageSizeFromFile(fileData.absPath);'],
];
let before=original;
if(changes.every(([,b])=>original.includes(b))){
 for(const [a,b] of changes){assert.equal(before.split(b).length,2);before=before.replace(b,a);}
}
assert.equal(sha(before),'f0e9d0809d8f4eb626d39323a9e0dd6f5f9e9824237a7d552e236b833f973177');
let after=before;
for(const [a,b] of changes){assert.equal(after.split(a).length,2);after=after.replace(a,b);}
fs.writeFileSync(file,after);
const native=String.raw`
const fs=require('fs'),assert=require('assert/strict'),{createRequire}=require('module');
const p='/grist/_build/app/server/lib/ActiveDoc.js',t=fs.readFileSync(p,'utf8'),r=createRequire(p);
assert(t.includes('const image_size_1 = require("image-size/fromFile");'));
assert(t.includes('dimensions = await (0, image_size_1.imageSizeFromFile)(fileData.absPath);'));
assert.equal(JSON.parse(fs.readFileSync('/grist/node_modules/image-size/package.json')).version,'2.0.4');
const f='/tmp/fictional.png';
fs.writeFileSync(f,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9i8AAAAASUVORK5CYII=','base64'));
assert.throws(()=>r('image-size')(f,()=>{}),TypeError);
r('image-size/fromFile').imageSizeFromFile(f).then(d=>{
 assert.equal(d.width,1);assert.equal(d.height,1);assert.equal(d.type,'png');
 console.log(JSON.stringify({passed:true,compiledSha256:require('crypto').createHash('sha256').update(t).digest('hex'),nativePng:true,oldApiRejected:true}));
});`;
const proof=JSON.parse(run('docker',['run','--rm','--network','none','--read-only','--log-driver','none','--memory','256m','--cpus','1','--pids-limit','64','--cap-drop','ALL','--security-opt','no-new-privileges','--tmpfs','/tmp:rw,size=8m,mode=1777','--entrypoint','node',target.imageId,'-e',native]));
assert(proof.passed&&proof.nativePng&&proof.oldApiRejected);
const leaves=read('/var/lib/utilibre-maintenance/js-closure-20261012/grist/build.json');assert(leaves.passed&&leaves.adapter);
const folder=source+'/utilibre-security/runtime-leaves';fs.mkdirSync(folder);
for(const item of leaves.packages){
 assert(['basic-ftp','image-size','ip-address'].includes(item.name));assert.equal(new URL(item.tarball).hostname,'registry.npmjs.org');
 const r=await fetch(item.tarball,{redirect:'error',signal:AbortSignal.timeout(30000)});assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer());assert(bytes.length<4*1024**2);assert.equal(sha(bytes),item.archiveSha256);assert.equal('sha512-'+createHash('sha512').update(bytes).digest('base64'),item.integrity);
 fs.writeFileSync(folder+'/'+item.name+'-'+item.version+'.tgz',bytes);
}
fs.copyFileSync('/var/lib/utilibre-maintenance/js-closure-20261012/grist/Dockerfile',folder+'/Dockerfile');
fs.writeFileSync(folder+'/packages.json',JSON.stringify(leaves.packages,null,2)+'\n');
fs.copyFileSync(new URL('./complete-grist-source.mjs',import.meta.url),folder+'/complete-grist-source.mjs');
fs.writeFileSync(folder+'/README.txt','Earlier runtime leaf replacements and their complete upstream source/license archives are retained here. ActiveDoc.ts in the source tree includes the same two-statement image-size Promise API adaptation as the running compiled server. The previous default/callback API fails against image-size 2.0.4; the supported API reads the fictional PNG correctly. The browser build lock and these runtime overlays are intentionally separate. Build with the frozen browser lock first, then apply the exact runtime leaf replacements and compiled adapter recorded in Dockerfile. Do not resolve current package releases. Other existing OS/sandbox repairs remain in Utilibre maintenance recipes and their corresponding source offers; this check does not claim byte-identical reproduction of all dependencies.\n');
const candidate=work+'/complete-source.tar.gz';run('tar',['-czf',candidate,'-C',work,'grist']);const bytes=fs.readFileSync(candidate);
fs.copyFileSync(candidate,archive+'.new');fs.chmodSync(archive+'.new',0o644);fs.renameSync(archive+'.new',archive);
const url=publication.grist.url,r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);assert.equal(sha(Buffer.from(await r.arrayBuffer())),sha(bytes));
fs.writeFileSync(dir+'/source-completion.json',JSON.stringify({date:new Date().toISOString(),passed:true,imageId:target.imageId,applicationChanged:false,sourceBefore:sha(before),sourceAfter:sha(after),...proof,url,archiveSha256:sha(bytes),previousArchiveSha256:publication.grist.sha256,rollback:work+'/previous-source.tar.gz'},null,2));
console.log('Grist source companion and retained runtime package sources published; exact current adapter and native PNG check passed. Application unchanged.');
