// Isolated package consumers; real TLS callback regression plus legitimate flows.
const fs=require('fs'),http=require('http'),https=require('https'),zlib=require('zlib'),assert=require('assert/strict');
const undici=require(process.argv[2]),{Agent,request,fetch}=undici;
const ca=fs.readFileSync('/fixture/cert.pem','utf8'),key=fs.readFileSync('/fixture/key.pem');
const handler=(req,res)=>{
 if(req.url==='/redirect'){res.writeHead(302,{location:'/'});return res.end();}
 if(req.url==='/gzip'){res.writeHead(200,{'content-encoding':'gzip'});return res.end(zlib.gzipSync('fictional transfer'));}
 if(req.method==='POST'){let b='';req.on('data',c=>{b+=c;if(b.length>1024)req.destroy()});return req.on('end',()=>res.end(b));}
 res.writeHead(req.url==='/missing'?404:200);res.end('fictional transfer');
};
(async()=>{
 const plain=http.createServer(handler),tls=https.createServer({key,cert:ca},handler);const sockets=new Set();
 for(const srv of [plain,tls])srv.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));});
 const start=s=>new Promise(r=>s.listen(0,'127.0.0.1',r));await start(plain);await start(tls);
 const u='http://127.0.0.1:'+plain.address().port,t='https://localhost:'+tls.address().port,agents=[];
 const a=options=>{const x=new Agent(options);agents.push(x);return x;};
 try{
  const ordinary=a({connect:{ca}});
  for(const path of ['/','/redirect','/gzip']){const r=await fetch(u+path,{dispatcher:ordinary});assert.equal(await r.text(),'fictional transfer');}
  const p=await request(u,{method:'POST',body:'synthetic=utilibre',dispatcher:ordinary});assert.equal(await p.body.text(),'synthetic=utilibre');
  assert.equal((await fetch(u+'/missing',{dispatcher:ordinary})).status,404);
  assert.equal(await(await fetch(t,{dispatcher:ordinary})).text(),'fictional transfer');
  await assert.rejects(request('https://127.0.0.1:'+tls.address().port,{dispatcher:ordinary}),e=>e.code==='ERR_TLS_CERT_ALTNAME_INVALID');
  // tls.checkServerIdentity used to be lost by Agent's JSON clone; CA remains
  // valid, so acceptance here reproduces exactly the upstream advisory.
  let called=false,rejected=false;
  const rejector=a({tls:{ca,checkServerIdentity(){called=true;const e=Error('fixture pin rejected');e.code='UTILIBRE_FIXTURE_PIN';return e;}}});
  try{const r=await request(t,{dispatcher:rejector});await r.body.text();}catch(e){if(e.code==='UTILIBRE_FIXTURE_PIN')rejected=true;else throw e;}
  console.log(JSON.stringify({normalPassed:true,checks:7,customTlsCallbackCalled:called,customTlsPinRejected:rejected,version:require(process.argv[2]+'/package.json').version}));
 }finally{await Promise.all(agents.map(x=>x.destroy()));for(const s of sockets)s.destroy();await Promise.all([plain,tls].map(s=>new Promise(r=>s.close(r))));}
})().catch(e=>{console.error(e);process.exitCode=1});
