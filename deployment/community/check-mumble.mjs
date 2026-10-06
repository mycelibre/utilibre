import assert from 'node:assert/strict';
import {connect} from 'node:tls';
import {readFile} from 'node:fs/promises';
const env=Object.fromEntries((await readFile('/opt/utilibre/mumble/runtime.env','utf8')).trim().split('\n').map(line=>{const split=line.indexOf('=');return [line.slice(0,split),line.slice(split+1)]}));
function varint(value){const bytes=[];while(value>127){bytes.push((value&127)|128);value=Math.floor(value/128)}bytes.push(value);return Buffer.from(bytes)}
function str(field,value){const bytes=Buffer.from(value);return Buffer.concat([varint(field*8+2),varint(bytes.length),bytes])}
function uint(field,value){return Buffer.concat([varint(field*8),varint(value)])}
function packet(type,body){const head=Buffer.alloc(6);head.writeUInt16BE(type);head.writeUInt32BE(body.length,2);return Buffer.concat([head,body])}
async function authenticate(password){
  return new Promise((resolve,reject)=>{
    // This is explicitly a loopback pilot certificate check, not public PKI.
    const socket=connect({host:'127.0.0.1',port:64738,rejectUnauthorized:false});
    const timer=setTimeout(()=>{socket.destroy();reject(Error('Mumble protocol timeout'))},10000);
    let pending=Buffer.alloc(0),fingerprint;
    socket.once('secureConnect',()=>{
      fingerprint=socket.getPeerCertificate().fingerprint256;
      socket.write(packet(0,Buffer.concat([uint(1,0x10500),str(2,'Utilibre health check'),str(3,'Linux')])));
      socket.write(packet(2,Buffer.concat([str(1,'Utilibre-health-test'),str(2,password),uint(5,1)])));
    });
    socket.on('error',error=>{clearTimeout(timer);reject(error)});
    socket.on('data',chunk=>{
      pending=Buffer.concat([pending,chunk]);
      while(pending.length>=6){
        const type=pending.readUInt16BE(),length=pending.readUInt32BE(2);
        if(length>8*1024*1024){socket.destroy();clearTimeout(timer);reject(Error('Oversized frame'));return;}
        if(pending.length<length+6)return;
        pending=pending.subarray(length+6);
        if(type===4||type===5){clearTimeout(timer);socket.end();resolve({type,fingerprint});return;}
      }
    });
  });
}
assert.equal((await authenticate('incorrect-test-password')).type,4,'Incorrect password must be denied');
const good=await authenticate(env.MUMBLE_CONFIG_SERVER_PASSWORD);
assert.equal(good.type,5,'Invitation password must reach ServerSync');
console.log('Mumble loopback TLS and protocol authentication pass; wrong password rejected.');
console.log(`Pilot certificate SHA-256: ${good.fingerprint}`);
