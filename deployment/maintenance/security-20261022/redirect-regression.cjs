// Two local HTTP servers; fictional headers only, never an external provider.
const assert=require('node:assert/strict'),http=require('node:http');
const root=process.argv[2];assert(['/app','/grist'].includes(root));
const client=require(root+'/node_modules/follow-redirects'),version=require(root+'/node_modules/follow-redirects/package.json').version;
const listen=s=>new Promise(r=>s.listen(0,'127.0.0.1',r));
const receiver=http.createServer((q,r)=>{q.resume();r.setHeader('Content-Type','application/json');r.end(JSON.stringify(q.headers));});
let target;
const source=http.createServer((q,r)=>{q.resume();if(q.url==='/same'){r.writeHead(302,{Location:'/end'});r.end();}else if(q.url==='/end'){r.end(JSON.stringify(q.headers));}else{r.writeHead(302,{Location:target});r.end();}});
const get=options=>new Promise((resolve,reject)=>{let req;try{req=client.http.get(options,r=>{let body='';r.on('data',b=>body+=b);r.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});});req.setTimeout(2000,()=>req.destroy(Error('Fixture timeout')));req.on('error',reject);}catch(e){reject(e);}});
(async()=>{await listen(receiver);target='http://127.0.0.1:'+receiver.address().port+'/';await listen(source);try{
 const options={hostname:'127.0.0.1',port:source.address().port,path:'/',sensitiveHeaders:['X-Api^Key','X-Token|Secret']};
 const headers={'Authorization':'Bearer fictional','Cookie':'fictional=yes','X-Api^Key':'fictional-caret','X-Token|Secret':'fictional-pipe','X-Harmless':'cafe'};
 const ordinary=await get({...options,path:'/same',headers:{...headers}});assert.equal(ordinary.authorization,headers.Authorization);assert.equal(ordinary['x-harmless'],'cafe');
 const object=await get({...options,headers:{...headers}});assert.equal(object.authorization,undefined);assert.equal(object['x-harmless'],'cafe');
 // Node does not generate Host when raw array headers are supplied. Include it
 // so a baseline HTTP 400 cannot masquerade as rejection of unsafe redirects.
 let array;try{array=await get({...options,headers:Object.entries({Host:'127.0.0.1:'+source.address().port,...headers}).flat()});}catch(e){if(version==='1.16.1'&&e instanceof TypeError&&/header/i.test(e.message))array={rejectedExplicitly:true};else throw e;}
 const safeObject=!object['x-api^key']&&!object['x-token|secret'],safeArray=array.rejectedExplicitly||(!array.authorization&&!array.cookie&&!array['x-api^key']&&!array['x-token|secret']);
 if(version==='1.16.0'){assert.equal(safeObject,false);assert.equal(safeArray,false);}else{assert.equal(version,'1.16.1');assert(safeObject&&safeArray);}
 console.log(JSON.stringify({version,sameOriginPreservesCredentials:true,ordinaryHeaderPreserved:true,sensitiveObjectHeadersStripped:safeObject,arrayHeadersSafe:Boolean(safeArray),explicitArrayRejection:!!array.rejectedExplicitly}));
}finally{source.closeAllConnections();receiver.closeAllConnections();source.close();receiver.close();}})().catch(e=>{console.error(e.message);process.exitCode=1});
