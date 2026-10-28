// Adapted from the upstream MIT-licensed f7075eae regression tests.
const assert=require('node:assert/strict'),http=require('node:http'),zlib=require('node:zlib'),{once}=require('node:events'),{createHash}=require('node:crypto');
const bodyParser=require(process.argv[2]);
const deadline=setTimeout(()=>process.exit(3),10000);
(async()=>{
 for(const mode of ['finish','second-consumer','charset']){
  const first=Buffer.concat([zlib.deflateSync(Buffer.from('{"a":1}')),Buffer.from([0])]),trailing=Buffer.alloc(1024),expected=createHash('sha256').update(first).update(trailing).digest('hex');
  let client;
  const parser=bodyParser.json({verify(){}});
  const server=http.createServer((req,res)=>{
   const hash=createHash('sha256');if(mode==='second-consumer')req.pipe(hash);
   parser(req,res,error=>{
    if(mode==='charset'){assert(error&&error.status===415);res.statusCode=415;res.end('denied');req.resume();return;}
    assert(!error);const finish=()=>res.end(JSON.stringify({body:req.body,hash:mode==='second-consumer'?hash.digest('hex'):null}));
    if(mode==='second-consumer')hash.once('finish',finish);else if(req.complete)finish();else req.once('end',finish);
    client.end(trailing);
   });
  });
  try{
   server.listen(0,'127.0.0.1');await once(server,'listening');
   const result=await new Promise((resolve,reject)=>{
    client=http.request({host:'127.0.0.1',port:server.address().port,method:'POST',agent:false,headers:{'content-type':mode==='charset'?'application/json; charset=utf-999':'application/json','content-encoding':'deflate','content-length':first.length+trailing.length}},res=>{let data='';res.on('data',b=>data+=b);res.on('end',()=>resolve({status:res.statusCode,data}));res.on('error',reject);});
    client.on('error',reject);client.setTimeout(1500,()=>client.destroy(Error('fixture timeout')));if(mode==='charset')client.end(Buffer.concat([first,trailing]));else client.write(first);
   });
   if(mode==='charset')assert.equal(result.status,415);else{assert.equal(result.status,200);const value=JSON.parse(result.data);assert.deepEqual(value.body,{a:1});if(mode==='second-consumer')assert.equal(value.hash,expected);}
   await new Promise(r=>setTimeout(r,100));
  }finally{client?.destroy();server.closeAllConnections();await new Promise(r=>server.close(r));}
 }
 clearTimeout(deadline);console.log('BODY_PARSER_LIFECYCLE_PASSED');
})().catch(e=>{console.error(e);process.exit(1);});
