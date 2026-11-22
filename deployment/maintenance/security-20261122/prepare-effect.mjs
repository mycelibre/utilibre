// Existing exact package builder; no application activation or install hooks.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
process.umask(0o077);
const inputs=JSON.parse(fs.readFileSync(new URL('./effect-inputs.json',import.meta.url)));
const root='/var/lib/utilibre-maintenance/security-20261122/effect';
const selected=process.argv.slice(2);
assert(selected.length===1&&inputs.rows.some(r=>r.key===selected[0]));
assert.equal(inputs.approval,'isolated-preparation-only');
assert(!fs.existsSync(root+'/'+selected[0]+'/build.json'),'Preserve prepared artifact');
const sha=b=>createHash('sha256').update(b).digest('hex');
for(const [name,pin]of Object.entries(inputs.cachedInputs)){
 const bytes=fs.readFileSync(root+'/'+name);assert.equal(bytes.length,pin.bytes);assert.equal(sha(bytes),pin.sha256);
}
// The original 4 MiB cap rejects this verified package. Keep that failure;
// adapt only its exact archive length and replace both downloads with pinned
// local inputs. General package builds keep their original cap and behavior.
const original=new URL('../js-closure/build.mjs',import.meta.url);
let code=fs.readFileSync(original,'utf8');const originalSha256=sha(code);
const replace=(before,after)=>{assert.equal(code.split(before).length,2);code=code.replace(before,after);};
for(const path of ['./specs.mjs','../security-20261103/decode-cjs.mjs'])replace("from '"+path+"'",'from '+JSON.stringify(new URL(path,original).href));
replace("await fetch('https://registry.npmjs.org/'+encodeURIComponent(packageName)+'/'+pin.version)","new Response(fs.readFileSync("+JSON.stringify(root+'/registry-3.22.1.json')+"))");
replace('await fetch(meta.dist.tarball)',"new Response(fs.readFileSync("+JSON.stringify(root+'/effect-3.22.1.tgz')+"))");
const length=inputs.cachedInputs['effect-3.22.1.tgz'].bytes;assert(Number.isSafeInteger(length)&&length>4*1024**2&&length<8*1024**2);
replace('assert(bytes.length<4*1024**2)',`assert.equal(bytes.length,${length})`);
const adapter=root+'/offline-package-builder.mjs';
if(fs.existsSync(adapter))assert.equal(fs.readFileSync(adapter,'utf8'),code);else fs.writeFileSync(adapter,code);
fs.writeFileSync(root+'/builder-adapter.json',JSON.stringify({originalSha256,adapterSha256:sha(code),network:'none',archiveBytes:length})+'\n');
const {buildExactPackages}=await import(pathToFileURL(adapter).href);
await buildExactPackages(inputs.rows,inputs.packages,root,selected);
