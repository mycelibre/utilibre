const assert=require('node:assert/strict'),http=require('node:http');
const root='/app/node_modules/';
for(const [name,version] of [['axios','1.20.0'],['body-parser','2.3.0'],['qs','6.16.0']])assert.equal(require(root+name+'/package.json').version,version);
assert.equal(require('/usr/local/lib/node_modules/npm/node_modules/undici/package.json').version,'6.28.1');
assert.equal(require(root+'brace-expansion/package.json').version,'2.1.7');
(async()=>{
 const axios=(await import(root+'axios/index.js')).default;
 const npmRoot='/usr/local/lib/node_modules/npm/node_modules/';
 for(const [name,version] of [['brace-expansion','5.0.11'],['ip-address','10.7.2'],['tar','7.5.22']])assert.equal(require(npmRoot+name+'/package.json').version,version);
 assert.deepEqual(require(root+'brace-expansion')('example{1,2}'),['example1','example2']);
 const brace=require(npmRoot+'brace-expansion');assert.deepEqual((brace.expand||brace)('example{1,2}'),['example1','example2']);
 const {Address4,Address6}=require(npmRoot+'ip-address');assert.equal(new Address4('192.0.2.1').correctForm(),'192.0.2.1');assert.equal(new Address6('2001:db8::1').correctForm(),'2001:db8::1');
 const fs=require('node:fs/promises'),tar=require(npmRoot+'tar');await fs.mkdir('/tmp/actual-leaves-source');await fs.mkdir('/tmp/actual-leaves-output');await fs.writeFile('/tmp/actual-leaves-source/fictional.txt','Fictional archive');await tar.c({cwd:'/tmp/actual-leaves-source',file:'/tmp/actual-leaves.tar'},['fictional.txt']);await tar.x({cwd:'/tmp/actual-leaves-output',file:'/tmp/actual-leaves.tar'});assert.equal(await fs.readFile('/tmp/actual-leaves-output/fictional.txt','utf8'),'Fictional archive');
 const express=require(root+'express'),parser=require(root+'body-parser'),qs=require(root+'qs');
 const app=express();app.use(parser.json({limit:'1kb'}));app.use(parser.urlencoded({extended:true,limit:'1kb'}));app.post('/check',(req,res)=>res.json(req.body));
 app.use((error,req,res,next)=>res.status(error.status||500).json({error:'expected rejection'}));
 const server=http.createServer(app);await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  assert.deepEqual((await axios.post(base+'/check',{label:'Fictional café'})).data,{label:'Fictional café'});
  assert.deepEqual((await axios.post(base+'/check','item[label]=example', {headers:{'content-type':'application/x-www-form-urlencoded'}})).data,{item:{label:'example'}});
  assert.equal((await fetch(base+'/check',{method:'POST',headers:{'content-type':'application/json'},body:'{invalid'})).status,400);
  assert.equal((await fetch(base+'/check',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({label:'x'.repeat(2000)})})).status,413);
  const {request}=require('/usr/local/lib/node_modules/npm/node_modules/undici');const response=await request(base+'/check',{method:'POST',headers:{'content-type':'application/json'},body:'{"label":"example"}'});assert.equal(response.statusCode,200);assert.deepEqual(await response.body.json(),{label:'example'});
 }finally{server.close();}
 qs.parse('__proto__[utilibrePollution]=bad&constructor[prototype][utilibrePollution]=bad');assert.equal({}.utilibrePollution,undefined);
 console.log('Actual leaf versions, Express/body-parser valid/malformed/oversize input, Axios and npm Undici loopback HTTP passed');
})().catch(e=>{console.error(e);process.exitCode=1});
