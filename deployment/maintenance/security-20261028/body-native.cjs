// Local-only legitimate requests and the upstream trailing-compressed-bytes case.
const assert=require('assert/strict'),http=require('http'),zlib=require('zlib');
const parser=require(process.argv[2]),mode=process.argv[3];
const server=http.createServer((req,res)=>{
 const middleware=req.url==='/form'?parser.urlencoded({extended:true,limit:512}):parser.json({limit:512});
 middleware(req,res,error=>{res.statusCode=error?error.status||500:200;res.end(JSON.stringify(error?{error:error.type}:{body:req.body}));});
});
const deadline=setTimeout(()=>{console.error('fixture deadline');process.exit(3);},8000);
function request(port,body,headers={},route='/'){
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:route,method:'POST',headers:{'content-type':'application/json','content-length':body.length,...headers}},res=>{const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,...JSON.parse(Buffer.concat(chunks))}));});
  req.on('error',reject);req.end(body);
 });
}
server.listen(0,'127.0.0.1',async()=>{
 try{
  const port=server.address().port,body=Buffer.from(JSON.stringify({example:'Fictional café',count:3}));
  if(mode==='normal'){
   for(const encoding of ['identity','gzip','deflate']){
    const bytes=encoding==='gzip'?zlib.gzipSync(body):encoding==='deflate'?zlib.deflateSync(body):body;
    const result=await request(port,bytes,{'content-encoding':encoding});assert.equal(result.status,200);assert.deepEqual(result.body,JSON.parse(body));
   }
   const form=await request(port,Buffer.from('task=Fictional&items%5B0%5D=one&items%5B1%5D=two'),{'content-type':'application/x-www-form-urlencoded'},'/form');assert.equal(form.status,200);assert.deepEqual(form.body.items,['one','two']);
   assert.equal((await request(port,Buffer.from('{bad'))).status,400);
   assert.equal((await request(port,Buffer.from(JSON.stringify({text:'x'.repeat(1000)})))) .status,413);
   assert.equal((await request(port,body,{'content-encoding':'unsupported-fixture'})).status,415);
   console.log(JSON.stringify({passed:true,normalChecks:7}));
   server.closeAllConnections();server.close();clearTimeout(deadline);
  }else{
   assert.equal(mode,'regression');
   // Adapted from upstream's 1.20.9 trailing-frame regression (MIT).
   // One NUL after a complete frame lets zlib finish before the HTTP body.
   const first=Buffer.concat([zlib.gzipSync(body),Buffer.from([0])]);
   const payload=Buffer.concat([first,Buffer.alloc(100*1024,0x58)]);
   const result=await request(port,payload,{'content-encoding':'gzip'});
   assert.equal(result.status,200);assert.deepEqual(result.body,JSON.parse(body));
   setTimeout(()=>{console.log('BODY_PARSER_TRAILING_BYTES_SURVIVED');server.closeAllConnections();server.close();clearTimeout(deadline);},250);
  }
 }catch(e){console.error(e);process.exit(2);}
});
