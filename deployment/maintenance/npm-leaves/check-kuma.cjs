const assert=require('node:assert/strict'),http=require('node:http');
const root='/app/node_modules/';
for(const [name,version] of [['axios','0.34.0'],['liquidjs','10.27.2'],['lodash','4.18.1'],['minimatch','9.0.7'],['mysql2','3.23.1'],['ws','8.21.3'],['redbean-node/node_modules/lodash','4.18.1']])assert.equal(require(root+name+'/package.json').version,version);
(async()=>{
 const axios=require(root+'axios'), {Liquid}=require(root+'liquidjs');
 const server=http.createServer((req,res)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify({path:req.url,label:'Fictional café'}));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{assert.equal((await axios.get('http://127.0.0.1:'+server.address().port+'/check')).data.label,'Fictional café');}finally{server.close();}
 assert.equal(await new Liquid().parseAndRender('Hello {{name}}',{name:'fictional'}),'Hello fictional');
 assert(require(root+'minimatch').minimatch('a/example.json','**/*.json'));
 assert.equal(require(root+'mysql2').format('SELECT ? AS label',["fictional'quote"]),"SELECT 'fictional\\'quote' AS label");
 const _=require(root+'redbean-node/node_modules/lodash'); assert.equal(_.get({example:{n:7}},'example.n'),7);
 const glob=require(root+'redbean-node/node_modules/glob');assert(glob.globSync('*.js',{cwd:'/app/server'}).includes('server.js'));
 const npmRoot='/usr/local/lib/node_modules/npm/node_modules/';
 for(const [name,version] of [['brace-expansion','2.1.7'],['ip-address','10.7.2'],['picomatch','4.0.4']])assert.equal(require(npmRoot+name+'/package.json').version,version);
 assert.deepEqual(require(npmRoot+'brace-expansion')('example{1,2}'),['example1','example2']);
 const {Address4,Address6}=require(npmRoot+'ip-address');assert.equal(new Address4('192.0.2.1').correctForm(),'192.0.2.1');assert.equal(new Address6('2001:db8::1').correctForm(),'2001:db8::1');
 assert(require(npmRoot+'picomatch')('*.json')('fictional.json'));
 _.merge({},JSON.parse('{"__proto__":{"utilibrePollution":true}}')); assert.equal({}.utilibrePollution,undefined);
 const {WebSocketServer,WebSocket}=require(root+'ws');
 const wss=new WebSocketServer({host:'127.0.0.1',port:0}); await new Promise(r=>wss.once('listening',r));
 wss.on('connection',ws=>ws.on('message',message=>ws.send(message)));
 await new Promise((resolve,reject)=>{const ws=new WebSocket('ws://127.0.0.1:'+wss.address().port);const timer=setTimeout(()=>reject(Error('WebSocket timeout')),3000);ws.once('open',()=>ws.send('Fictional echo'));ws.once('message',data=>{try{assert.equal(data.toString(),'Fictional echo');clearTimeout(timer);ws.close();resolve();}catch(e){reject(e);}});ws.once('error',reject);});
 await new Promise(r=>wss.close(r));
 console.log('Kuma exact leaves, loopback HTTP/WebSocket, native template, SQL escaping, glob and lodash checks passed');
})().catch(e=>{console.error(e);process.exitCode=1});
