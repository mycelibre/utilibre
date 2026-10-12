// Reuse existing isolated application checks, changing only artifact locations
// and disposable names. No production configuration or user data is mounted.
import fs from 'node:fs';import assert from 'node:assert/strict';import cp from 'node:child_process';
import {root,sha,read} from './common.mjs';
process.umask(0o077);
const here=new URL('.',import.meta.url).pathname;
const upstream=here+'../bookworm-curl-followup/';
const selected=process.argv.slice(2);assert(selected.length&&selected.every(k=>['kuma','gathio','rssbridge'].includes(k)));
const specs=selected.map(key=>{const s=read(root+'/images/'+key+'/stage.json');assert.equal(s.status,'passed');return {key,candidate:s.candidate};});
fs.mkdirSync(root+'/reused-fixtures',{recursive:true});
fs.writeFileSync(root+'/reused-fixtures/specs.json',JSON.stringify(specs,null,2)+'\n');
for(const s of specs){const stage=read(root+'/images/'+s.key+'/stage.json');fs.writeFileSync(root+'/images/'+s.key+'/build.json',JSON.stringify({imageId:stage.image})+'\n');}
const original=fs.readFileSync(upstream+'app-checks.mjs','utf8');
let code=original.replace("'/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012'",JSON.stringify(root))
 .replace("here=new URL('.',import.meta.url).pathname",'here='+JSON.stringify(upstream))
 .replace("here+'specs.json'",JSON.stringify(root+'/reused-fixtures/specs.json'))
 .replaceAll('maintenance-bookworm-curl-','maintenance-mount-native-');
assert.notEqual(code,original);
const fingerprint=sha(Buffer.from(JSON.stringify(specs))).slice(0,12);
const file=root+'/reused-fixtures/application-'+selected.join('-')+'-'+fingerprint+'.mjs';assert(!fs.existsSync(file));
fs.writeFileSync(file,code);
fs.writeFileSync(file+'.provenance.json',JSON.stringify({date:new Date().toISOString(),upstream:upstream+'app-checks.mjs',upstreamSha256:sha(Buffer.from(original)),adaptedSha256:sha(Buffer.from(code)),changes:['private evidence/spec paths','original fixture assets','disposable container names'],applicationBehaviorUnchanged:true},null,2)+'\n');
cp.execFileSync(process.execPath,[file,...selected],{stdio:'inherit',timeout:600000});
