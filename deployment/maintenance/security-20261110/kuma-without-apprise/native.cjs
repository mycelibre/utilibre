// Ordinary functional fixtures only. Run inside a fresh network-none Kuma.
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const {randomBytes} = require('node:crypto');
const {io} = require('/app/node_modules/socket.io-client');
const SMTP = require('/app/server/notification-providers/smtp');
const Ntfy = require('/app/server/notification-providers/ntfy');
const expectedApprise = process.argv[2] === 'baseline';
const listen = s => new Promise(resolve => s.listen(0, '127.0.0.1', resolve));
const socket = io('http://127.0.0.1:3001', {transports:['websocket'], reconnection:false});
const call = (event,...args) => new Promise((resolve,reject) => socket.timeout(10000).emit(event,...args,(err,result) => err ? reject(err) : resolve(result)));
const ok = async (event,...args) => {const r=await call(event,...args);assert.equal(r?.ok,true, event+' failed: '+r?.msg);return r;};
const close = s => new Promise(resolve=>s.close(resolve));
const limit=setTimeout(()=>{console.error('Ordinary fixture timeout');process.exit(1);},60000);
let server, smtp;
(async()=>{
 await new Promise((resolve,reject)=>{socket.once('info',resolve);socket.once('connect_error',reject);});
 await new Promise(r=>setTimeout(r,200));
 const password='Fictional!'+randomBytes(24).toString('hex');
 await ok('setup','fictional-package-removal',password);
 await ok('login',{username:'fictional-package-removal',password,token:''});
 assert.equal(await call('checkApprise'),expectedApprise);
 let notice, mail='', mailCount=0;
 server=http.createServer((req,res)=>{
  if(req.method==='POST') {let chunks='';req.on('data',c=>chunks+=c);req.on('end',()=>{notice=JSON.parse(chunks);res.writeHead(200,{'Content-Type':'application/json'});res.end('{}');});}
  else {res.writeHead(200,{'Content-Type':'text/plain'});res.end('Fictional healthy monitor');}
 });
 await listen(server);
 const destination='http://127.0.0.1:'+server.address().port;
 assert.equal(await new Ntfy().send({ntfyserverurl:destination,ntfytopic:'fictional',ntfyPriority:3},'Fictional native notification'),'Sent Successfully.');
 assert.equal(notice.topic,'fictional');assert.equal(notice.message,'Fictional native notification');
 // Minimal bounded SMTP sink: no relay, recipients or external transport.
 smtp=net.createServer(client=>{
  let buffer='',data=false;client.setEncoding('utf8');client.write('220 fixture.invalid ESMTP\r\n');
  client.on('data',chunk=>{buffer+=chunk;assert(buffer.length<65536);let i;
   while((i=buffer.indexOf('\r\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
    if(data){if(line==='.') {data=false;mailCount++;client.write('250 accepted\r\n');}else mail+=line+'\n';}
    else if(line.startsWith('EHLO'))client.write('250 fixture.invalid\r\n');
    else if(line==='DATA'){data=true;client.write('354 continue\r\n');}
    else if(line==='QUIT')client.end('221 bye\r\n');
    else client.write('250 ok\r\n');
   }
  });
 });
 await listen(smtp);
 assert.equal(await new SMTP().send({smtpHost:'127.0.0.1',smtpPort:smtp.address().port,smtpSecure:false,smtpIgnoreSTARTTLS:true,smtpFrom:'fixture@sender.invalid',smtpTo:'fixture@recipient.invalid'},'Fictional native SMTP notice'),'Sent Successfully.');
 assert.equal(mailCount,1);assert.match(mail,/Fictional native SMTP notice/);
 const heartbeats=[];socket.on('heartbeat',h=>heartbeats.push(h));
 const monitor=await ok('add',{type:'http',name:'Fictional local monitor',url:destination,interval:20,retryInterval:20,timeout:5,maxretries:0,accepted_statuscodes:['200-299'],notificationIDList:{},conditions:[],kafkaProducerBrokers:[],kafkaProducerSaslOptions:{},rabbitmqNodes:[]});
 for(let i=0;i<60&&!heartbeats.some(h=>h.monitorID===monitor.monitorID&&h.status===1);i++)await new Promise(r=>setTimeout(r,500));
 assert(heartbeats.some(h=>h.monitorID===monitor.monitorID&&h.status===1),'Native successful HTTP heartbeat missing');
 await ok('pauseMonitor',monitor.monitorID);
 await ok('addStatusPage','Fictional status page','fictional-removal');
 const response=await fetch('http://127.0.0.1:3001/api/status-page/fictional-removal');
 assert(response.ok);assert.equal((await response.json()).config.title,'Fictional status page');
 await ok('deleteMonitor',monitor.monitorID);
 console.log(JSON.stringify({passed:true,checks:8,setupLogin:true,appriseAvailable:expectedApprise,nativeNtfy:true,nativeSmtp:true,successfulMonitorHeartbeat:true,statusPage:true,monitorDeletion:true,network:'none; loopback sinks only',realNotificationsSent:0}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{clearTimeout(limit);socket.disconnect();if(server)await close(server);if(smtp)await close(smtp);});
