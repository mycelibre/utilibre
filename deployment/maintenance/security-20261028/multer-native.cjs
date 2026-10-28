// Synthetic no-network compatibility checks. Regression adapted from upstream
// MIT test/async-file-filter-teardown-crash.js, commit 80a2d9df1dfd63b5fab631b8b9966164ed647adf.
// Copyright expressjs/multer contributors; original MIT license ships with package.
const assert=require('node:assert/strict'),{PassThrough}=require('node:stream'),fs=require('node:fs'),vm=require('node:vm');
const multer=require(process.argv[2]),mode=process.argv[3],boundary='SyntheticUtilibreBoundary';
const version=JSON.parse(fs.readFileSync(process.argv[2]+'/package.json')).version;
function part(name,value,file,mime='text/plain'){return '--'+boundary+'\r\nContent-Disposition: form-data; name="'+name+'"'+(file?'; filename="'+file+'"':'')+'\r\n'+(file?'Content-Type: '+mime+'\r\n':'')+'\r\n'+value+'\r\n';}
function request(upload,body){return new Promise((resolve,reject)=>{const req=new PassThrough();req.headers={'content-type':'multipart/form-data; boundary='+boundary,'content-length':Buffer.byteLength(body)};const timer=setTimeout(()=>reject(Error('Fixture timeout')),3000);upload(req,null,err=>{clearTimeout(timer);resolve({req,err})});req.end(body);});}
async function normal(){
 const body=part('label','Ficción')+part('upload','fictional bytes','fixture.txt')+'--'+boundary+'--\r\n';let checks=0;
 let r=await request(multer().single('upload'),body);assert.ifError(r.err);assert.equal(r.req.body.label,'Ficción');assert.equal(r.req.file.buffer.toString(),'fictional bytes');checks++;
 r=await request(multer({fileFilter:(req,file,cb)=>setImmediate(()=>cb(null,true))}).single('upload'),body);assert.ifError(r.err);assert.equal(r.req.file.originalname,'fixture.txt');checks++;
 r=await request(multer({fileFilter:(req,file,cb)=>cb(null,false)}).single('upload'),body);assert.ifError(r.err);assert.equal(r.req.file,undefined);checks++;
 r=await request(multer({limits:{fileSize:3}}).single('upload'),body);assert.equal(r.err.code,'LIMIT_FILE_SIZE');checks++;
 r=await request(multer().single('other'),body);assert.equal(r.err.code,'LIMIT_UNEXPECTED_FILE');checks++;
 r=await request(multer({limits:{fieldSize:3}}).none(),part('label','toolong')+'--'+boundary+'--\r\n');assert.equal(r.err.code,'LIMIT_FIELD_VALUE');checks++;
 r=await request(multer({limits:{files:1}}).any(),part('a','a','a.txt')+part('b','b','b.txt')+'--'+boundary+'--\r\n');assert.equal(r.err.code,'LIMIT_FILE_COUNT');checks++;
 fs.mkdirSync('/tmp/multer-fixture',{recursive:true});r=await request(multer({dest:'/tmp/multer-fixture'}).single('upload'),body);assert.ifError(r.err);assert.equal(fs.readFileSync(r.req.file.path,'utf8'),'fictional bytes');fs.unlinkSync(r.req.file.path);assert.deepEqual(fs.readdirSync('/tmp/multer-fixture'),[]);checks++;
 console.log(JSON.stringify({passed:true,version,normalChecks:checks}));
}
async function regression(){
 const req=new PassThrough(),filterError=new Error('fictional rejected file');let resumeFilter,busboy,nextCalls=0;
 const body=part('first','a','first.txt')+part('second','b','second.txt');
 const timer=setTimeout(()=>{throw Error('Regression fixture timeout')},3000);
 const upload=multer({fileHwm:1,streamHandler:(req,parser)=>{busboy=parser;req.pipe(parser)},fileFilter:(req,file,cb)=>{if(file.fieldname==='first')resumeFilter=cb;else req.once('end',()=>setImmediate(()=>cb(filterError)))}}).any();
 req.headers={'content-type':'multipart/form-data; boundary='+boundary,'content-length':Buffer.byteLength(body)};
 upload(req,null,err=>{nextCalls++;assert.equal(err,filterError);assert.equal(typeof resumeFilter,'function');setImmediate(()=>{busboy.once('close',()=>{assert.equal(nextCalls,1);assert.deepEqual(req.files,[]);clearTimeout(timer);console.log(JSON.stringify({passed:true,version,regressionSurvived:true}))});resumeFilter(null,true)});});req.end(body);
}
async function consumer(){
 let checks=0;const sources=[];
 for(const route of ['event','group']){
  const text=fs.readFileSync('/srv/gathio/dist/routes/'+route+'.js','utf8'),start=text.indexOf('const storage = multer.memoryStorage();'),end=text.indexOf(route==='event'?'const collectCustomQuestionAnswers':'const router = Router();',start);assert(start>=0&&end>start);
  const code=text.slice(start,end);assert(code.includes('limits: { fileSize: 10 * 1024 * 1024 }'));const ctx={multer};vm.runInNewContext(code+';globalThis.checkUpload=upload;'+(route==='event'?'globalThis.checkIcs=icsUpload;':''),ctx,{timeout:1000,contextCodeGeneration:{strings:false,wasm:false}});
  // Parser bytes only. Image decoding/resize is an unchanged later Gathio stage.
  const payload='fictional image payload',body=part('imageUpload',payload,'fictional.png','image/png')+'--'+boundary+'--\r\n';let r=await request(ctx.checkUpload.single('imageUpload'),body);assert.ifError(r.err);assert.equal(r.req.file.buffer.toString(),payload);checks++;
  r=await request(ctx.checkUpload.single('imageUpload'),part('imageUpload','fictional','fixture.txt')+'--'+boundary+'--\r\n');assert.match(r.err.message,/Only JPEG, PNG and GIF/);checks++;
  if(route==='event'){r=await request(ctx.checkIcs.single('icsUpload'),part('icsUpload','BEGIN:VCALENDAR\r\nEND:VCALENDAR','fictional.ics','text/calendar')+'--'+boundary+'--\r\n');assert.ifError(r.err);assert.match(r.req.file.buffer.toString(),/BEGIN:VCALENDAR/);checks++;}
  sources.push({route,sha256:require('node:crypto').createHash('sha256').update(code).digest('hex')});
 }
 console.log(JSON.stringify({passed:true,version,consumerChecks:checks,sources}));
}
assert(['normal','regression','consumer'].includes(mode));(mode==='normal'?normal():mode==='consumer'?consumer():regression()).catch(e=>{console.error(e);process.exitCode=1});
