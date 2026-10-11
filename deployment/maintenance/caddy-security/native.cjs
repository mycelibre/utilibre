// Runs inside a candidate with network none; only synthetic loopback HTTP.
const assert=require('node:assert/strict');
const http=require('node:http');
const http2=require('node:http2');
const {spawn}=require('node:child_process');
(async()=>{
 const upstream=http.createServer((req,res)=>{
  if(req.url==='/events') {res.writeHead(200,{'content-type':'text/event-stream'});res.write('data: first\n\n');setTimeout(()=>res.end('data: last\n\n'),250);return;}
  let body='';req.on('data',chunk=>body+=chunk);req.on('end',()=>{res.setHeader('content-type','text/plain');res.setHeader('X-Fixture','native-caddy');res.end(req.method+' '+req.url+' '+body+' '+'.'.repeat(2048));});
 });
 upstream.listen(18101,'127.0.0.1');await new Promise(resolve=>upstream.once('listening',resolve));
 const config={
  admin:{disabled:true},logging:{logs:{default:{writer:{output:'discard'}}}},
  apps:{http:{servers:{fixture:{
   listen:['127.0.0.1:18102'],protocols:['h1','h2c'],automatic_https:{disable:true},
   routes:[
    {match:[{path:['/events']}],handle:[{handler:'reverse_proxy',flush_interval:-1,upstreams:[{dial:'127.0.0.1:18101'}]}]},
    {handle:[{handler:'headers',response:{set:{'Referrer-Policy':['no-referrer']}}},{handler:'encode',encodings:{gzip:{}}},{handler:'reverse_proxy',upstreams:[{dial:'127.0.0.1:18101'}]}]}
   ]
  }}}}
 };
 const child=spawn(process.env.CADDY_BINARY,['run','--config','-'],{stdio:['pipe','ignore','ignore'],env:{...process.env,XDG_CONFIG_HOME:'/tmp/caddy-config',XDG_DATA_HOME:'/tmp/caddy-data'}});
 child.stdin.end(JSON.stringify(config));
 try {
  let ready=false;for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:18102/ready')).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,100));}assert(ready,'Caddy native listener');
  const response=await fetch('http://127.0.0.1:18102/example?fixture=yes',{method:'POST',headers:{'content-type':'text/plain','accept-encoding':'gzip'},body:'Fictional data'});
  assert.equal(response.status,200);assert.equal(response.headers.get('x-fixture'),'native-caddy');assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('content-encoding'),'gzip');assert.match(await response.text(),/^POST \/example\?fixture=yes Fictional data /);
  const stream=await fetch('http://127.0.0.1:18102/events');const reader=stream.body.getReader();const first=await reader.read();assert(Buffer.from(first.value).toString().includes('first'));let rest='';for(;;){const next=await reader.read();if(next.done)break;rest+=Buffer.from(next.value).toString();}assert(rest.includes('last'));
  const session=http2.connect('http://127.0.0.1:18102');
  try{
   await new Promise((resolve,reject)=>{session.once('connect',resolve);session.once('error',reject);});
   const requests=Array.from({length:3},(_,index)=>new Promise((resolve,reject)=>{
    session.settings({initialWindowSize:32768+index*128,headerTableSize:2048+index},error=>{if(error)reject(error);});
    const req=session.request({':method':'GET',':path':'/http2-fixture-'+index});let result='';
    req.on('response',headers=>{try{assert.equal(headers[':status'],200);assert.equal(headers['x-fixture'],'native-caddy');}catch(error){reject(error);}});
    req.on('data',chunk=>result+=chunk);req.on('error',reject);req.on('end',()=>{try{assert.match(result,new RegExp('^GET /http2-fixture-'+index+' '));resolve();}catch(error){reject(error);}});req.end();
   }));
   await Promise.all(requests);
  }finally{session.close();await new Promise(resolve=>session.once('close',resolve));}
  console.log('Caddy native proxy, headers, gzip, live SSE and three HTTP/2 streams with bounded SETTINGS changes passed');
 } finally {child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));await new Promise(resolve=>upstream.close(resolve));}
})().catch(()=>{console.error('Caddy isolated native gate failed');process.exit(1);});
