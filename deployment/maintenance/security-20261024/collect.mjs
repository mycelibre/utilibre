// Adapt this batch's exact evidence to the existing release/source interfaces.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
process.umask(0o077);
const root='/var/lib/utilibre-maintenance/security-20261024',key=process.argv[2];assert(['opengist','vikunja'].includes(key));
const s=JSON.parse(fs.readFileSync(new URL('./images.json',import.meta.url))).find(x=>x.key===key);
const read=f=>JSON.parse(fs.readFileSync(root+'/'+key+'/'+f));
const b=read('build.json'),v=read(key+'-verify.json'),n=read('native.json'),a=read('assets.json');
assert(b.base===s.baseId&&b.imageId===v.imageId&&v.passed&&n.imageId===b.imageId&&n.passed&&a.passed);
assert.equal(createHash('sha256').update(fs.readFileSync(root+'/'+key+'/binary')).digest('hex'),b.binarySha256);
assert.equal(a.binarySha256,b.binarySha256);
assert(JSON.parse(fs.readFileSync(root+'/echo-regression/result.json')).passed);
for(const f of ['go.mod','go.sum'])assert.equal(createHash('sha256').update(fs.readFileSync(new URL('../go-leaf-final/locks/'+key+'/'+f,import.meta.url))).digest('hex'),b.locks[f]);
fs.mkdirSync(root+'/output',{recursive:true});
for(const [suffix,proof] of Object.entries({image:{...b,image:s.candidate,compiler:s.compiler,runtimeConfigurationUnchanged:true},verify:v,native:n,assets:a}))fs.writeFileSync(root+'/output/'+key+'-'+suffix+'.json',JSON.stringify(proof,null,2)+'\n');
console.log(key+': exact release evidence collected');
