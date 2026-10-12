// Additive source offer for the exact completed cache/Apache/Bookworm batch.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/closure-followup-20261012',here=fileURLToPath(new URL('.',import.meta.url));
const sha=b=>createHash('sha256').update(b).digest('hex'),read=f=>JSON.parse(fs.readFileSync(root+'/'+f));
const receipts=['cache-release.json','apache-release.json','bookworm-release.json'].map(read);
const roles=[];
for(const r of receipts){assert.equal(r.status,'passed');for(const g of r.groups){assert.equal(g.status,'passed');for(const row of g.rows||[g]){
 assert.equal(cp.execFileSync('docker',['inspect',row.name,'--format','{{.Image}}'],{encoding:'utf8'}).trim(),row.newImage);
 roles.push({name:row.name,image:row.newRef,imageId:row.newImage});
}}}
const filename='security-cache-xml-followup-20261012-source.tar.gz',temp=fs.mkdtempSync(root+'/library-source-'),manifest=[];
function copy(source,relative){assert(!relative.split('/').includes('..'));const dest=path.join(temp,relative);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(source,dest);manifest.push({path:relative,sha256:sha(fs.readFileSync(dest))});}
try{
 for(const file of ['libxml2_2.9.14+dfsg.orig.tar.xz','libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre2.debian.tar.xz','libxml2_2.9.14+dfsg-1.3~deb12u6+utilibre2.dsc'])copy(root+'/bookworm-xml/'+file,'libxml2/'+file);
 const response=await fetch('https://registry.npmjs.org/http-cache-semantics/-/http-cache-semantics-4.3.0.tgz',{signal:AbortSignal.timeout(20000)});assert(response.ok);
 const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),'d75e1e6a11587954da5e2f0e2b5c4b397a16d28cc2f7bdf64e9027fc2fe593ee');
 fs.writeFileSync(temp+'/http-cache-semantics-4.3.0.tgz',bytes);manifest.push({path:'http-cache-semantics-4.3.0.tgz',sha256:sha(bytes)});
 for(const sub of ['closure-followup','xml-final'])for(const file of fs.readdirSync(here+'../'+sub)){
  if(!fs.statSync(here+'../'+sub+'/'+file).isFile())continue;
  copy(here+'../'+sub+'/'+file,'recipes/'+sub+'/'+file);
 }
 fs.writeFileSync(temp+'/SOURCES.json',JSON.stringify({date:new Date().toISOString(),roles,files:manifest,instructions:'Complete Bookworm libxml2 source plus its exact Debian patch/build packaging and original notices. Cache dependency archive includes its BSD license. Recipes use the shared helpers in utilibre-integration.tar.gz. Other application/dependency source offers and notices are retained. No secrets, logs or user content included.',limitations:'Native/production tests and remaining disputed cache advisory are documented in the recipes README. This is not a security clearance.'},null,2)+'\n');
 const archive=root+'/'+filename;assert(!fs.existsSync(archive),'Immutable source offer already exists');cp.execFileSync('tar',['-czf',archive,'-C',temp,'.']);
 const receipt={date:new Date().toISOString(),filename,sha256:sha(fs.readFileSync(archive)),bytes:fs.statSync(archive).size,published:false};
 if(process.argv.includes('--publish')){
  for(const dir of ['/opt/utilibre/toolbox-public','/opt/utilibre/records/public']){const dest=dir+'/'+filename;assert(!fs.existsSync(dest));fs.copyFileSync(archive,dest+'.tmp');fs.chmodSync(dest+'.tmp',0o644);fs.renameSync(dest+'.tmp',dest);}
  receipt.published=true;
 }
 fs.writeFileSync(root+'/library-source-offer.json',JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
}finally{assert(path.dirname(temp)===root&&path.basename(temp).startsWith('library-source-'));fs.rmSync(temp,{recursive:true});}
