const assert=require('node:assert/strict');
const {io}=require('/app/node_modules/socket.io-client');
const {randomBytes}=require('node:crypto');
const socket=io('http://127.0.0.1:3001',{transports:['websocket']});
const timeout=setTimeout(()=>{socket.disconnect();process.exitCode=1;},20000);
const call=(event,...args)=>new Promise((resolve,reject)=>socket.emit(event,...args,result=>result?.ok?resolve(result):reject(Error('Fictional native account operation rejected'))));
socket.once('info',()=>setTimeout(async()=>{
 try {
  const password='Fixture!'+randomBytes(24).toString('hex');
  await call('setup','fictional-sqlite-check',password);
  await call('login',{username:'fictional-sqlite-check',password,token:''});
  console.log('Native fresh Kuma setup and authenticated Socket.IO login passed.');
 } catch(error){console.error(error.message);process.exitCode=1;}
 finally{clearTimeout(timeout);socket.disconnect();}
},100));
socket.once('connect_error',()=>{clearTimeout(timeout);socket.disconnect();process.exitCode=1;});
