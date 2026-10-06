import assert from 'node:assert/strict';
import {connect} from 'node:tls';
import {connect as tcpConnect} from 'node:net';
import {readFile} from 'node:fs/promises';
const env=Object.fromEntries((await readFile('/opt/utilibre/mumble/runtime.env','utf8')).trim().split('\n').map(line=>{const split=line.indexOf('=');return [line.slice(0,split),line.slice(split+1)]}));
function varint(value){const bytes=[];while(value>127){bytes.push((value&127)|128);value=Math.floor(value/128)}bytes.push(value);return Buffer.from(bytes)}
function str(field,value){const bytes=Buffer.from(value);return Buffer.concat([varint(field*8+2),varint(bytes.length),bytes])}
function uint(field,value){return Buffer.concat([varint(field*8),varint(value)])}
function packet(type,body){const head=Buffer.alloc(6);head.writeUInt16BE(type);head.writeUInt32BE(body.length,2);return Buffer.concat([head,body])}
// Optional short-lived, loopback-only SOCKS client for an outside-network check.
// No proxy is used for the trusted private-network certificate baseline.
async function outsideSocket(host){
  return new Promise((resolve,reject)=>{
    const socket=tcpConnect({host:'127.0.0.1',port:9151});
    let pending=Buffer.alloc(0),stage=0;
    const fail=error=>{clearTimeout(timer);socket.destroy();reject(error)};
    const timer=setTimeout(()=>fail(Error('Outside-network connection timeout')),30000);
    socket.once('error',fail);
    socket.once('connect',()=>socket.write(Buffer.from([5,1,0])));
    const receive=chunk=>{
      pending=Buffer.concat([pending,chunk]);
      if(stage===0&&pending.length>=2){
        if(pending[0]!==5||pending[1]!==0){fail(Error('SOCKS authentication refused'));return}
        pending=pending.subarray(2);stage=1;
        const name=Buffer.from(host),port=Buffer.alloc(2);port.writeUInt16BE(64738);
        socket.write(Buffer.concat([Buffer.from([5,1,0,3,name.length]),name,port]));
      }
      if(stage===1&&pending.length>=5){
        if(pending[0]!==5||pending[1]!==0){fail(Error('SOCKS destination connection refused'));return}
        const size=pending[3]===1?10:pending[3]===4?22:pending[3]===3?7+pending[4]:0;
        if(!size){fail(Error('Invalid SOCKS reply'));return}
        if(pending.length<size)return;
        clearTimeout(timer);socket.removeListener('data',receive);socket.removeListener('error',fail);
        if(pending.length>size)socket.unshift(pending.subarray(size));
        resolve(socket);
      }
    };
    socket.on('data',receive);
  });
}
async function authenticate(password,host='10.10.1.43',expectedFingerprint){
  const transport=expectedFingerprint&&process.argv.includes('--tor')?await outsideSocket(host):null;
  return new Promise((resolve,reject)=>{
    // Self-signed pilot certificate: public checks pin the trusted LAN certificate
    // before sending any password. This is not a public-PKI validation claim.
    const socket=connect({...transport?{socket:transport,servername:host}:{host,port:64738},rejectUnauthorized:false});
    const timer=setTimeout(()=>{socket.destroy();reject(Error('Mumble protocol timeout'))},10000);
    let pending=Buffer.alloc(0),fingerprint,synchronized=false;
    socket.once('secureConnect',()=>{
      fingerprint=socket.getPeerCertificate().fingerprint256;
      if(expectedFingerprint&&fingerprint!==expectedFingerprint){
        clearTimeout(timer);socket.destroy();reject(Error('Public Mumble certificate does not match the private server'));return;
      }
      // Negotiate legacy 1.4 voice framing, supported by the deployed 1.5 server.
      socket.write(packet(0,Buffer.concat([uint(1,0x10400),str(2,'Utilibre health check'),str(3,'Linux')])));
      socket.write(packet(2,Buffer.concat([str(1,'Utilibre-health-test'),str(2,password),uint(5,1)])));
    });
    socket.on('error',error=>{clearTimeout(timer);reject(error)});
    socket.on('data',chunk=>{
      pending=Buffer.concat([pending,chunk]);
      while(pending.length>=6){
        const type=pending.readUInt16BE(),length=pending.readUInt32BE(2);
        if(length>8*1024*1024){socket.destroy();clearTimeout(timer);reject(Error('Oversized frame'));return;}
        if(pending.length<length+6)return;
        const body=pending.subarray(6,length+6);
        pending=pending.subarray(length+6);
        if(type===5&&process.argv.includes('--voice')){
          synchronized=true;
          // One valid 20 ms Opus silence packet, server-loopback target 31.
          // No channel participant receives this audio probe.
          socket.write(packet(1,Buffer.from([0x9f,0,3,0xf8,0xff,0xfe])));
          continue;
        }
        if(type===1&&synchronized){
          if(!body.subarray(-3).equals(Buffer.from([0xf8,0xff,0xfe]))){
            clearTimeout(timer);socket.destroy();reject(Error('Voice loopback payload mismatch'));return;
          }
          clearTimeout(timer);socket.end();resolve({type:5,fingerprint,voiceLoopback:true});return;
        }
        if(type===4||type===5){clearTimeout(timer);socket.end();resolve({type,fingerprint});return;}
      }
    });
  });
}
assert.equal((await authenticate('incorrect-test-password')).type,4,'Incorrect password must be denied');
const good=await authenticate(env.MUMBLE_CONFIG_SERVER_PASSWORD);
assert.equal(good.type,5,'Invitation password must reach ServerSync');
console.log('Mumble private-network TLS and protocol authentication pass; wrong password rejected.');
console.log(`Pilot certificate SHA-256: ${good.fingerprint}`);
if(process.argv.includes('--voice'))assert.equal(good.voiceLoopback,true,'Private voice tunnel loopback');
if(process.argv.includes('--public')||process.argv.includes('--tor')){
  assert.equal((await authenticate('incorrect-test-password','mumble.utilibre.org',good.fingerprint)).type,4);
  const publicResult=await authenticate(env.MUMBLE_CONFIG_SERVER_PASSWORD,'mumble.utilibre.org',good.fingerprint);
  assert.equal(publicResult.type,5);
  if(process.argv.includes('--voice')){
    assert.equal(publicResult.voiceLoopback,true);
    console.log('Public TCP voice fallback relayed the exact valid Opus silence packet through server loopback.');
  }
  console.log('Public-hostname TCP/TLS authentication passed with the pinned server certificate. UDP audio still requires a voice-client check.');
}
