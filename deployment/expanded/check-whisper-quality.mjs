// Regression evidence, not an accuracy certification: synthetic silence, one
// public Spanish fixture and explicitly injected worker error states.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin=process.env.WHISPER_CHECK_URL||'https://transcribe.utilibre.org';
assert.ok(['https://transcribe.utilibre.org','http://127.0.0.1:3347'].includes(origin));
const rows=await(await fetch('https://datasets-server.huggingface.co/first-rows?dataset=PolyAI%2Fminds14&config=es-ES&split=train',{signal:AbortSignal.timeout(30000)})).json();
const sample=Buffer.from(await(await fetch(rows.rows[0].row.audio[0].src,{signal:AbortSignal.timeout(30000)})).arrayBuffer());
assert.equal(createHash('sha256').update(sample).digest('hex'),'8a350c47afd69d9fc7f01f6a7bdfa4ccec3515e2d0bdef218e7e2c17468f99b4');
const silence=Buffer.alloc(44+96000*2);
silence.write('RIFF');silence.writeUInt32LE(silence.length-8,4);silence.write('WAVEfmt ',8);silence.writeUInt32LE(16,16);silence.writeUInt16LE(1,20);silence.writeUInt16LE(1,22);silence.writeUInt32LE(16000,24);silence.writeUInt32LE(32000,28);silence.writeUInt16LE(2,32);silence.writeUInt16LE(16,34);silence.write('data',36);silence.writeUInt32LE(silence.length-44,40);
const output=await mkdtemp('/tmp/utilibre-whisper-quality-');
const browser=await chromium.launch();
try{
 const context=await browser.newContext({locale:'es-GT',viewport:{width:1280,height:900}});
 const external=new Set(),uploads=[],errors=[];let modelRequests=0;
 context.on('request',request=>{if(!/^https?:/.test(request.url()))return;if(new URL(request.url()).origin!==origin)external.add(new URL(request.url()).origin);if(!['GET','HEAD'].includes(request.method()))uploads.push(request.method());if(request.url().includes('/models/'))modelRequests++;});
 await context.addInitScript(()=>{
  const original=Worker.prototype.postMessage;
  Worker.prototype.postMessage=function(data,...args){
   if(data.audio&&window.qaErrorCode){this.dispatchEvent(new MessageEvent('message',{data:{status:'error',data:{code:window.qaErrorCode}}}));return;}
   return original.call(this,data,...args);
  };
 });
 const page=await context.newPage();page.setDefaultTimeout(180000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(origin);
 assert.equal(await page.locator('#spoken-language').inputValue(),'es');
 assert.equal(await page.locator('#speech-model').inputValue(),'Xenova/whisper-small');
 console.log('Spanish locale and Small default verified.');
 async function upload(bytes,name){const ready=page.waitForEvent('filechooser');await page.getByRole('button',{name:'From file',exact:true}).click();await(await ready).setFiles({name,mimeType:'audio/wav',buffer:bytes});await page.getByRole('button',{name:'Transcribe Audio',exact:true}).waitFor();}
 await upload(silence,'six-seconds-silence.wav');
 await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();
 await page.getByRole('alert').filter({hasText:'No usable audio signal'}).waitFor();
 assert.equal(modelRequests,0,'Silence must not trigger model downloads');
 assert.equal(await page.getByRole('button',{name:'Export TXT',exact:true}).count(),0);
 console.log('Digital silence rejected without a model download.');
 await upload(sample,'public-spanish-test.wav');
 for(const [code,message] of [['repetition','excessive repetition'],['empty_transcript','No transcript was produced']]){
  await page.evaluate(code=>{window.qaErrorCode=code;},code);
  await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();
  await page.getByRole('alert').filter({hasText:message}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Export TXT',exact:true}).count(),0);
 }
 for(const [name,width]of [['desktop',1280],['mobile',390]]){
  await page.setViewportSize({width,height:900});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:output+'/'+name+'.png',fullPage:true});
 }
 await page.evaluate(()=>{window.qaErrorCode=null;});
 console.log('Injected error recovery verified; starting real Spanish transcription.');
 await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();
 await page.getByRole('button',{name:'Export TXT',exact:true}).waitFor();
 const ready=page.waitForEvent('download');await page.getByRole('button',{name:'Export TXT',exact:true}).click();
 const stream=await(await ready).createReadStream(),chunks=[];for await(const chunk of stream)chunks.push(chunk);
 const text=Buffer.concat(chunks).toString();
 for(const phrase of ['tengo un problema','vuestra aplicación','transferencia bancaria','cuenta conocida']) assert.ok(text.toLowerCase().includes(phrase),`Spanish fixture must retain: ${phrase}`);
 assert.equal(await page.getByRole('alert').count(),0);
 assert.deepEqual([...external],[]);assert.deepEqual(uploads,[]);assert.deepEqual(errors,[]);
 console.log('Whisper: six-second silence rejected before model loading; injected repetition/empty-result errors hide export and allow recovery; real Spanish Small transcription/TXT anchors passed.');
 console.log('No browser audio uploads or third-party requests. Screenshots: '+output);
 console.log('Chromium/Linux and mobile emulation only: this does not certify the reported Windows/Opera clip or general accuracy.');
}finally{await browser.close();}
