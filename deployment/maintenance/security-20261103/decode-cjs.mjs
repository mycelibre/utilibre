// Compatibility only: upstream 0.5.1's decoder stays byte-for-byte unchanged.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash}from'node:crypto';
export const decoderSha256='6a86ac891edf15c5efa0841ebb31935e3669d58b98318b57d7b08a4530317cb0';
export const bridge="'use strict';\nconst decode = require('./index.js').default;\nmodule.exports = input => decode(typeof input === 'string' ? input.replace(/\\+/g, ' ') : input);\n";
export function bridgeMetadata(pkg){
 assert.equal(pkg.name,'decode-uri-component');assert.equal(pkg.version,'0.5.1');assert.equal(pkg.type,'module');assert.equal(pkg.main,undefined);assert.deepEqual(pkg.exports,{types:'./index.d.ts',default:'./index.js'});assert.deepEqual(pkg.dependencies||{},{});
 return {...pkg,main:'./index.cjs',exports:{types:'./index.d.ts',import:'./index.js',require:'./index.cjs',default:'./index.js'},files:[...pkg.files,'index.cjs']};
}
export function prepareDecodeBridge(dir){
 const bytes=fs.readFileSync(dir+'/index.js');assert.equal(createHash('sha256').update(bytes).digest('hex'),decoderSha256);
 const pkg=bridgeMetadata(JSON.parse(fs.readFileSync(dir+'/package.json')));assert(!fs.existsSync(dir+'/index.cjs'));
 fs.writeFileSync(dir+'/index.cjs',bridge,{mode:0o644});fs.writeFileSync(dir+'/package.json',JSON.stringify(pkg,null,2)+'\n',{mode:0o644});
 fs.chmodSync(dir+'/index.cjs',0o644);fs.chmodSync(dir+'/package.json',0o644);
 return {decoderSha256,bridgeSha256:createHash('sha256').update(bridge).digest('hex'),changed:['index.cjs','package.json'],requires:'Node >=22.12 with synchronous require(ESM); tested on the pinned Grist Node 22.23.4'};
}
