// Real module calls, synthetic local inputs only; run with --network none.
const assert=require('node:assert/strict'),fs=require('node:fs'),http=require('node:http');
const {createRequire}=require('node:module'),r=createRequire('/grist/package.json');
const modules=JSON.parse(fs.readFileSync('/usr/local/share/utilibre-language/grist-modules.json'));
for(const x of modules)assert.equal(require(x.path+'/package.json').version,x.current);
assert.deepEqual(r('brace-expansion')('file-{a,b}'),['file-a','file-b']);
assert.equal(r('js-yaml').load('fictional: 7').fictional,7);
assert.equal(require('/grist/node_modules/xmlbuilder2/node_modules/js-yaml').safeLoad('fictional: 8').fictional,8);
assert.equal(r('fast-uri').parse('https://example.invalid/path').host,'example.invalid');
const keys=[];assert(r('path-to-regexp')('/doc/:id',keys).test('/doc/fictional'));assert.equal(keys[0].name,'id');
for(const location of ['/grist/node_modules/jws','/grist/node_modules/jsonwebtoken/node_modules/jws']){
 const jws=require(location),token=jws.sign({header:{alg:'HS256'},payload:'fictional',secret:'fixture-only'});
 assert(jws.verify(token,'HS256','fixture-only'));assert(!jws.verify(token,'HS256','wrong-fixture'));
}
const server=http.createServer((req,res)=>{res.setHeader('Content-Type','application/json');res.end('{"fictional":true}');});
server.listen(0,'127.0.0.1',async()=>{
 try{
  const url='http://127.0.0.1:'+server.address().port;
  assert.equal((await r('axios').get(url,{proxy:false})).data.fictional,true);
  assert.equal((await (await r('undici').fetch(url)).json()).fictional,true);
  console.log(JSON.stringify({passed:true,modules:modules.length,brace:true,yaml3and4:true,uri:true,route:true,jws3and4:true,axiosLocalRequest:true,undiciLocalRequest:true}));
 }catch(error){console.error(error.message);process.exitCode=1;}finally{server.close();}
});
