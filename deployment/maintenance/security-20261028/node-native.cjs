const assert=require('assert/strict'),dns=require('dns'),dgram=require('dgram'),tls=require('tls'),http=require('http'),https=require('https'),zlib=require('zlib'),fs=require('fs'),{createRequire}=require('module');
const expected=process.argv[2],roots=JSON.parse(process.argv[3]);let queryCount=0;
const deadline=setTimeout(()=>{console.error('NODE_FIXTURE_DEADLINE');process.exit(3)},15000);
(async()=>{
 const udp=dgram.createSocket('udp4');udp.on('message',(q,remote)=>{queryCount++;const header=Buffer.from(q.subarray(0,12));header.writeUInt16BE(0x8180,2);header.writeUInt16BE(1,6);header.writeUInt16BE(0,8);header.writeUInt16BE(0,10);const answer=Buffer.from('c00c000100010000003c00047f000001','hex');udp.send(Buffer.concat([header,q.subarray(12),answer]),remote.port,remote.address)});
 await new Promise(r=>udp.bind(0,'127.0.0.1',r));const resolver=new dns.Resolver({timeout:1000,tries:1});resolver.setServers(['127.0.0.1:'+udp.address().port]);
 assert.deepEqual(await new Promise((resolve,reject)=>resolver.resolve4('fictional.invalid',(e,v)=>e?reject(e):resolve(v))),['127.0.0.1']);queryCount=0;
 let nulRejected=false,nulError=null;try{await new Promise((resolve,reject)=>resolver.resolve4('fictional.invalid\0.trusted.invalid',(e,v)=>e?reject(e):resolve(v)))}catch(e){nulRejected=true;nulError=e.code;}
 const nulQueries=queryCount;udp.close();
 const cert={subject:{CN:'127.0.0.1'},subjectaltname:'DNS:127.0.0.1'},fullwidthRejected=Boolean(tls.checkServerIdentity('１２７.0.0.1',cert)),looseRejected=Boolean(tls.checkServerIdentity('0127.0.0.1',{subjectaltname:'IP Address:87.0.0.1'}));
 assert.equal(tls.checkServerIdentity('127.0.0.1',{subjectaltname:'IP Address:127.0.0.1'}),undefined);assert.equal(tls.checkServerIdentity('fictional.invalid',{subjectaltname:'DNS:fictional.invalid'}),undefined);assert(tls.checkServerIdentity('other.invalid',{subjectaltname:'DNS:fictional.invalid'}));
 if(expected==='fixed'){assert(nulRejected&&nulQueries===0,'NUL name still reaches DNS');assert(fullwidthRejected&&looseRejected,'TLS address validation regression');}
 const content=Buffer.from('Fictional café: 42');for(const [enc,dec]of [['gzipSync','gunzipSync'],['deflateSync','inflateSync'],['brotliCompressSync','brotliDecompressSync']])assert.deepEqual(zlib[dec](zlib[enc](content)),content);
 assert.throws(()=>zlib.brotliDecompressSync(Buffer.from('malformed fictional stream')));
 const server=http.createServer((req,res)=>{if(req.url==='/redirect'){res.writeHead(302,{Location:'/'});return res.end();}if(req.url==='/post'){let b='';req.on('data',d=>b+=d);return req.on('end',()=>res.end(b));}if(req.url==='/gzip'){res.setHeader('content-encoding','gzip');return res.end(zlib.gzipSync(content));}if(req.url==='/br'){res.setHeader('content-encoding','br');return res.end(zlib.brotliCompressSync(content));}res.end(content);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 for(const p of ['/','/redirect','/gzip','/br'])assert.equal(await (await fetch(base+p,{signal:AbortSignal.timeout(2000)})).text(),content.toString());assert.equal(await (await fetch(base+'/post',{method:'POST',body:'fictional',signal:AbortSignal.timeout(2000)})).text(),'fictional');server.closeAllConnections();server.close();
 const ca=fs.readFileSync('/fixture/cert.pem'),secure=https.createServer({cert:ca,key:fs.readFileSync('/fixture/key.pem')},(q,s)=>s.end(content));await new Promise(r=>secure.listen(0,'127.0.0.1',r));
 const request=servername=>new Promise((resolve,reject)=>{const q=https.get({host:'127.0.0.1',servername,port:secure.address().port,ca},r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>resolve(b));});q.on('error',reject);});
 assert.equal(await request('localhost'),content.toString());await assert.rejects(request('wrong.invalid'));secure.closeAllConnections();secure.close();
 const addons=[],seen=new Set();for(const root of roots){try{fs.accessSync(root+'/package.json',fs.constants.R_OK);}catch(e){if(e.code==='ENOENT'||(e.code==='EACCES'&&root!==process.cwd()))continue;throw e;}const r=createRequire(root+'/package.json');for(const name of ['better-sqlite3','sqlite3','bcrypt','argon2','sharp','isolated-vm']){let file;try{file=r.resolve(name)}catch(e){if(e.code==='MODULE_NOT_FOUND')continue;throw e;}if(seen.has(file))continue;seen.add(file);const module=r(name);
  if(name==='better-sqlite3'){const db=new module(':memory:');assert.equal(db.prepare('select 42 as value').get().value,42);db.close();}
  if(name==='sqlite3'){await new Promise((resolve,reject)=>{const db=new module.Database(':memory:');db.get('select 42 as value',(e,row)=>{if(e)return reject(e);try{assert.equal(row.value,42);db.close(resolve)}catch(e){reject(e)}})});}
  if(name==='bcrypt')assert(module.compareSync('fictional fixture',module.hashSync('fictional fixture',4)));
  if(name==='argon2'){const hash=await module.hash('fictional fixture',{memoryCost:1024,timeCost:1});assert(await module.verify(hash,'fictional fixture'));}
  if(name==='sharp'){const out=await module({create:{width:2,height:3,channels:4,background:'#123456'}}).png().toBuffer();const m=await module(out).metadata();assert.equal(m.width,2);assert.equal(m.height,3);}
  if(name==='isolated-vm'){const isolate=new module.Isolate({memoryLimit:8});assert.equal(isolate.createContextSync().evalSync('20+22'),42);isolate.dispose();}
  addons.push({name,file,passed:true});
 }}
 console.log(JSON.stringify({passed:true,node:process.versions.node,nulRejected,nulError,nulQueries,fullwidthRejected,looseRejected,normalChecks:15,addons}));clearTimeout(deadline);
})().catch(e=>{console.error(e);process.exit(2)});
