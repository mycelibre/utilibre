// Native operator API only; preserve all other general settings. Daily Utilibre
// release review replaces Kuma's separate upstream phone-home version request.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const credentials=JSON.parse(readFileSync(new URL('../../secrets/uptime-kuma-admin.json',import.meta.url),'utf8'));
const script=`
const {io}=require('socket.io-client');
const socket=io('http://127.0.0.1:3001',{transports:['websocket']});
const end=ok=>{socket.disconnect();process.exit(ok?0:1)};
setTimeout(()=>end(false),15000);
socket.on('connect_error',()=>end(false));
socket.once('info',()=>setTimeout(()=>socket.emit('login',${JSON.stringify(credentials)},r=>{
 if(!r?.ok)return end(false);
 socket.emit('getSettings',r=>{
  if(!r?.ok||!r.data)return end(false);
  socket.emit('setSettings',{...r.data,checkUpdate:false,checkBeta:false},null,r=>{
   if(!r?.ok)return end(false);
   socket.emit('getSettings',r=>end(r?.ok&&r.data.checkUpdate===false&&r.data.checkBeta===false));
  });
 });
}),100));`;
try{
 execFileSync('docker',['exec','-i','utilibre-community-uptime-kuma-1','node','-'],{input:script,stdio:['pipe','pipe','pipe'],timeout:20000});
 console.log('Native Kuma update/beta requests disabled and read back; other settings preserved.');
}catch{throw Error('Native Kuma configuration failed; no credentials included in diagnostics');}
