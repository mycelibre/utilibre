// Two loopback origins inside a networkless container; fictional headers only.
const assert=require('node:assert/strict'),http=require('node:http'),vm=require('node:vm');
const pkg=process.argv[2],mode=process.argv[3],fixed=['fixed','backport'].includes(mode),redirects=require(pkg);
assert(['baseline','fixed','backport'].includes(mode));
assert.equal(require(pkg+'/package.json').version,mode==='fixed'?'1.16.2':'1.16.1');
let target,source;
const listen=server=>new Promise(r=>server.listen(0,'127.0.0.1',r));
(async()=>{
 target=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(req.headers));});await listen(target);
 source=http.createServer((req,res)=>{
  if(req.url==='/same'){res.writeHead(302,{location:'/final'});res.end();}
  else if(req.url==='/final')res.end(JSON.stringify(req.headers));
  else if(req.url==='/loop'){res.writeHead(302,{location:'/loop'});res.end();}
  else {res.writeHead(302,{location:'http://127.0.0.1:'+target.address().port+'/'});res.end();}
 });await listen(source);
 const request=(path,sensitiveHeaders,array=false)=>new Promise((resolve,reject)=>{
  const headers={'X-API-Key':'fictional-key','X-Harmless':'kept','Authorization':'Bearer fictional','Cookie':'fictional=1'};
  const req=redirects.http.get({hostname:'127.0.0.1',port:source.address().port,path,sensitiveHeaders,headers:array?Object.entries(headers).flat():headers,maxRedirects:3},res=>{let data='';res.setEncoding('utf8');res.on('data',c=>{data+=c;assert(data.length<4096);});res.on('end',()=>resolve(JSON.parse(data)));});
  req.setTimeout(3000,()=>req.destroy(Error('timeout')));req.on('error',reject);
 });
 const observations=[];
 for(const array of [false,true])for(const crossRealm of [false,true]){
  const names=crossRealm?vm.runInNewContext("['X-API-Key']"):['X-API-Key'];
  const h=await request('/cross',names,array);
  assert.equal(h['x-harmless'],'kept');assert.equal(h.authorization,undefined);assert.equal(h.cookie,undefined);
  assert.equal(h['x-api-key'],crossRealm&&!fixed?'fictional-key':undefined);
  observations.push({array,crossRealm,credentialForwarded:h['x-api-key']!==undefined});
 }
 const h=await request('/same',vm.runInNewContext("['X-API-Key']"));
 assert.equal(h['x-api-key'],'fictional-key');assert.equal(h.authorization,'Bearer fictional');assert.equal(h['x-harmless'],'kept');
 await assert.rejects(request('/loop',[]),e=>e.code==='ERR_FR_TOO_MANY_REDIRECTS');
 console.log(JSON.stringify({passed:true,fixed,observations,sameOriginPreserved:true,redirectLimit:true,network:'loopback only, container network none'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>{source?.close();target?.close();});
