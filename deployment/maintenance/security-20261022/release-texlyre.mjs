// Static output only. Browser documents, server configuration and access remain unchanged.
import fs from 'node:fs';import cp from 'node:child_process';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const repo='/home/ubuntu/freetools',dir='/var/lib/utilibre-maintenance/security-20261022/texlyre',live='/opt/utilibre/toolbox-public/apps/texlyre',source='/opt/utilibre/evaluation-src/texlyre-20261011';
const b=JSON.parse(fs.readFileSync(dir+'/build.json')),n=JSON.parse(fs.readFileSync(dir+'/native.json')),hash=b=>createHash('sha256').update(b).digest('hex');
assert(b.passed&&n.passed&&n.archiveSha256===b.archiveSha256&&n.productionChanged===false);assert(Date.now()-Date.parse(n.date)<86400000);assert.deepEqual(n.outside,[]);assert.deepEqual(n.errors,[]);
assert(['guestProject','compiledPdfAccentsFormula','projectExportImport','localAccountUpgrade','reloadPersistence'].every(k=>n[k]===true));assert.equal(hash(fs.readFileSync(dir+'/dist.tar.gz')),b.archiveSha256);assert(!fs.existsSync(dir+'/release.json'));
assert(fs.statSync(live).isDirectory()&&!fs.lstatSync(live).isSymbolicLink());assert(fs.statfsSync('/').bavail*fs.statfsSync('/').bsize>8*1024**3);
const stage=fs.mkdtempSync('/opt/utilibre/texlyre-release-'),candidate=stage+'/candidate',previous=stage+'/previous';fs.mkdirSync(candidate,{mode:0o755});
cp.execFileSync('tar',['-xf',dir+'/dist.tar.gz','-C',candidate],{timeout:120000});assert(!fs.existsSync(candidate+'/test-only-pdfjs'));
const index=fs.readFileSync(candidate+'/index.html'),js=index.toString().match(/src="(\/assets\/[^" ]+\.js)"/)[1];assert(js&&!js.includes('..'));
let swapped=false;
try{
 fs.renameSync(live,previous);try{fs.renameSync(candidate,live);swapped=true;}catch(e){fs.renameSync(previous,live);throw e;}
 const r=await fetch('https://latex.utilibre.org/',{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(index));
 const asset=await fetch('https://latex.utilibre.org'+js,{signal:AbortSignal.timeout(20000)});assert.equal(asset.status,200);assert.equal(hash(Buffer.from(await asset.arrayBuffer())),hash(fs.readFileSync(live+js)));
 fs.copyFileSync(dir+'/package-lock.json',repo+'/deployment/texlyre/package-lock.json');fs.copyFileSync(dir+'/package-lock.json',source+'/package-lock.json');fs.copyFileSync(dir+'/package.json',source+'/package.json');
 cp.execFileSync('node',[repo+'/deployment/texlyre/publish-source.mjs'],{timeout:120000,stdio:['ignore','pipe','pipe']});
 const url='https://latex.utilibre.org/utilibre-source/texlyre-utilibre.tar.gz',offer=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(offer.status,200);const sourceSha256=hash(Buffer.from(await offer.arrayBuffer()));assert.equal(sourceSha256,hash(fs.readFileSync('/opt/utilibre/toolbox-public/texlyre-utilibre.tar.gz')));
 const receipt={date:new Date().toISOString(),status:'passed',archiveSha256:b.archiveSha256,sourceSha256,dompurify:'3.4.17',publicHtmlAndScriptVerified:true,sourceUrl:url,rollbackDirectory:previous,userDataChanged:false,configurationChanged:false};fs.writeFileSync(dir+'/release.json',JSON.stringify(receipt,null,2),{mode:0o600});console.log('TeXlyre: repaired static editor deployed; public HTML, compiled script and corresponding source verified.');
}catch(e){if(swapped){fs.renameSync(live,stage+'/failed-candidate');fs.renameSync(previous,live);}throw e;}
