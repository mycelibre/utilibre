// Six pinned FOSS dependencies; existing package assembler, entirely offline.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
process.umask(0o077);
assert.equal(process.argv.length,2);
const root='/var/lib/utilibre-maintenance/security-20261122/admin-build-deps';
const inputs=JSON.parse(fs.readFileSync(new URL('./admin-build-deps-inputs.json',import.meta.url)));
assert.equal(inputs.approval,'isolated-preparation-only');
assert(!fs.existsSync(root+'/admin/build.json'));
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [name,pin]of Object.entries(inputs.cachedInputs)){
 const bytes=fs.readFileSync(root+'/'+name);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);
}
const original=new URL('../js-closure/build.mjs',import.meta.url);
let code=fs.readFileSync(original,'utf8');const originalSha256=sha(code);
const replace=(before,after)=>{assert.equal(code.split(before).length,2);code=code.replace(before,after);};
for(const path of ['./specs.mjs','../security-20261103/decode-cjs.mjs'])replace("from '"+path+"'",'from '+JSON.stringify(new URL(path,original).href));
replace("await fetch('https://registry.npmjs.org/'+encodeURIComponent(packageName)+'/'+pin.version)",`new Response(fs.readFileSync(${JSON.stringify(root+'/')}+pin.metadata))`);
replace('await fetch(meta.dist.tarball)',`new Response(fs.readFileSync(${JSON.stringify(root+'/')}+pin.archive))`);
const lengths=Object.fromEntries(Object.values(inputs.packages).map(p=>[p.archive,inputs.cachedInputs[p.archive].bytes]));
assert(Object.values(lengths).every(n=>Number.isSafeInteger(n)&&n>0&&n<40*1024**2));
replace('assert(bytes.length<4*1024**2)',`assert.equal(bytes.length,${JSON.stringify(lengths)}[pin.archive])`);
// Distroless image: retain only the existing nested CLI shims, using Node
// filesystem operations instead of adding a shell to the candidate.
replace("recipe+='RUN mv '+target+'/node_modules /tmp/utilibre-preserved-modules && rm -r '+target+' && mkdir -p '+target+' && mv /tmp/utilibre-preserved-modules '+target+'/node_modules\\n';",`assert.equal(s.runtimeRemoval,'node');
    recipe+='RUN '+JSON.stringify(['node','-e','const fs=require("node:fs"),p=process.argv[1],t="/tmp/utilibre-preserved-modules",o={recursive:true,dereference:false,verbatimSymlinks:true,preserveTimestamps:true,errorOnExist:true,force:false};if(fs.existsSync(t))throw Error("Occupied preservation path");fs.cpSync(p+"/node_modules",t,o);fs.rmSync(p,{recursive:true});fs.mkdirSync(p,{recursive:true});fs.cpSync(t,p+"/node_modules",o);fs.rmSync(t,{recursive:true});',target])+'\\n';`);
const adapter=root+'/offline-package-builder-v3.mjs';assert(!fs.existsSync(adapter));fs.writeFileSync(adapter,code);
fs.writeFileSync(root+'/builder-adapter-v3.json',JSON.stringify({originalSha256,adapterSha256:sha(code),network:'none',archiveLengths:lengths})+'\n');
const {buildExactPackages}=await import(pathToFileURL(adapter).href);
await buildExactPackages(inputs.rows,inputs.packages,root,['admin']);
