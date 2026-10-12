// Native TLS/Protobuf against a disposable instance, synthetic credentials only.
import assert from 'node:assert/strict';
import {connect} from 'node:tls';
function vi(n){const a=[];while(n>127){a.push((n&127)|128);n=Math.floor(n/128);}return Buffer.from([...a,n]);}
const str=(n,s)=>{const b=Buffer.from(s);return Buffer.concat([vi(n*8+2),vi(b.length),b]);};
const uint=(n,v)=>Buffer.concat([vi(n*8),vi(v)]);
const frame=(t,b)=>{const h=Buffer.alloc(6);h.writeUInt16BE(t);h.writeUInt32BE(b.length,2);return Buffer.concat([h,b]);};
async function auth(pass,voice=false){return await new Promise((resolve,reject)=>{
 const s=connect({host:'127.0.0.1',port:64738,rejectUnauthorized:false});let data=Buffer.alloc(0),synced=false;
 const timer=setTimeout(()=>{s.destroy();reject(Error('Synthetic Mumble timeout'));},12000);
 const done=(err,result)=>{clearTimeout(timer);s.destroy();err?reject(err):resolve(result);};
 s.on('error',e=>done(e));s.on('secureConnect',()=>{
  s.write(frame(0,Buffer.concat([uint(1,0x10400),str(2,'Synthetic fixture'),str(3,'Linux')])));
  s.write(frame(2,Buffer.concat([str(1,'fictional'),str(2,pass),uint(5,1)])));
 });
 s.on('data',b=>{data=Buffer.concat([data,b]);while(data.length>=6){const t=data.readUInt16BE(),n=data.readUInt32BE(2);if(n>1048576)return done(Error('Oversize'));
  if(data.length<6+n)return;const body=data.subarray(6,n+6);data=data.subarray(n+6);
  if(t===5&&voice){synced=true;s.write(frame(1,Buffer.from([0x9f,0,3,0xf8,0xff,0xfe])));continue;}
  if(t===1&&synced){if(!body.subarray(-3).equals(Buffer.from([0xf8,0xff,0xfe])))return done(Error('Voice mismatch'));return done(null,5);}
  if(t===4||t===5)return done(null,t);
 }});
});}
assert.equal(await auth('wrong-fictional-password'),4);
assert.equal(await auth('Fictional-only-native-2026',true),5);
console.log('MUMBLE_NATIVE_PASSED: TLS, wrong-password denial, native join, exact Opus server-only loopback');
