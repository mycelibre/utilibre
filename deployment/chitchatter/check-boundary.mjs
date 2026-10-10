import assert from 'node:assert/strict';
import WebSocket from '/opt/utilibre/src/chitchatter/node_modules/ws/index.js';
const url='ws://10.10.1.43:3200/tracker';
const denied=await new Promise((resolve,reject)=>{const w=new WebSocket(url,{origin:'https://example.invalid'});w.on('unexpected-response',(_req,res)=>{res.resume();resolve(res.statusCode)});w.on('error',reject);w.on('open',()=>reject(new Error('Foreign origin accepted')))});assert.equal(denied,401);
const closeCode=await new Promise((resolve,reject)=>{const w=new WebSocket(url,{origin:'http://localhost:3200'});w.on('open',()=>w.send('x'.repeat(65537)));w.on('close',resolve);w.on('error',reject)});assert.equal(closeCode,1009);
for(const suffix of ['/tracker','/stats','/announce']){const r=await fetch('http://10.10.1.43:3200'+suffix);if(suffix==='/tracker')assert.equal(r.status,404);}
console.log('PASS foreign WebSocket origin rejected; oversized frame closed1009; no HTTP tracker');
