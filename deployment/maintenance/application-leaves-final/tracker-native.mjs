import assert from 'node:assert/strict';
import fs from 'node:fs';
import {once} from 'node:events';
import {createRequire} from 'node:module';
const require=createRequire('/app/package.json');
const timer=setTimeout(()=>process.exit(2),20000);
assert.throws(()=>require.resolve('ip'),{code:'MODULE_NOT_FOUND'});assert.equal(require('ipaddr.js/package.json').version,'2.5.0');
const {default:parse}=await import('/app/node_modules/bittorrent-tracker/lib/server/parse-udp.js');
const {default:common}=await import('/app/node_modules/bittorrent-tracker/lib/common.js');
function packet(address){const b=Buffer.alloc(98);Buffer.from(common.CONNECTION_ID).copy(b);b.writeUInt32BE(common.ACTIONS.ANNOUNCE,8);b.writeUInt32BE(2,80);b.writeUInt32BE(address,84);b.writeUInt16BE(9000,96);return b;}
const rinfo={address:'192.0.2.9',port:9001};
for(const [n,expected]of [[0,'192.0.2.9'],[0x7f000001,'127.0.0.1'],[0xc0000201,'192.0.2.1'],[0x0a010203,'10.1.2.3'],[0xffffffff,'255.255.255.255']])assert.equal(parse(packet(n),rinfo).ip,expected);
assert.throws(()=>parse(Buffer.alloc(15),rinfo));assert.throws(()=>parse(packet(1).subarray(0,97),rinfo));const invalid=packet(1);invalid[0]^=255;assert.throws(()=>parse(invalid,rinfo));
const {default:Server}=await import('/app/node_modules/bittorrent-tracker/server.js');const {default:WebSocket}=await import('/app/node_modules/ws/wrapper.mjs');
const original=Server.prototype.listen;let server;Server.prototype.listen=function(...a){server=this;return original.apply(this,a)};await import('/app/tracker.mjs');if(!server.listening)await once(server,'listening');assert.equal(server.udp4,null);assert.equal(server.udp6,null);
const a=new WebSocket('ws://127.0.0.1:8000',{origin:'https://chat.utilibre.org'}),b=new WebSocket('ws://127.0.0.1:8000',{origin:'https://chat.utilibre.org'});
try{await Promise.all([once(a,'open'),once(b,'open')]);const announce=peer=>({action:'announce',info_hash:'f'.repeat(20),peer_id:peer.repeat(20),left:1,event:'started',offers:[]});
let reply=once(a,'message');a.send(JSON.stringify(announce('a')));assert.equal(JSON.parse((await reply)[0]).action,'announce');const offer=once(a,'message');reply=once(b,'message');b.send(JSON.stringify({...announce('b'),offers:[{offer:{type:'offer',sdp:'fictional-local-test'},offer_id:'o'.repeat(20)}]}));assert.equal(JSON.parse((await reply)[0]).action,'announce');const delivered=JSON.parse((await offer)[0]);assert.equal(delivered.offer.sdp,'fictional-local-test');assert.equal(delivered.peer_id,'b'.repeat(20));
const rejected=new WebSocket('ws://127.0.0.1:8000',{origin:'https://untrusted.invalid'});rejected.on('error',()=>{});const denied=await new Promise(resolve=>rejected.on('unexpected-response',(_req,res)=>{resolve(res.statusCode);res.resume();rejected.terminate()}));assert.equal(denied,401);
console.log(JSON.stringify({passed:true,ipAbsent:true,udpDisabled:true,ipv4Cases:5,invalidPackets:3,websocketAnnouncements:2,offerRoundtrip:true,originRejection:401,network:'none; synthetic loopback only'}));
}finally{a.terminate();b.terminate();await new Promise(r=>server.close(r));clearTimeout(timer)}
