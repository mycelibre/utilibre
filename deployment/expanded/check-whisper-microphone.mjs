// Real browser MediaRecorder/decoder, simulated microphone input. Never real
// users' audio. Inference is optional; device/Windows support is not inferred.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin=process.env.WHISPER_CHECK_URL||'http://127.0.0.1:3347';
assert(['http://127.0.0.1:3347','https://transcribe.utilibre.org'].includes(origin));
const baseline=process.argv.includes('--baseline');
const inference=process.argv.includes('--inference');
const output=await mkdtemp('/tmp/utilibre-whisper-microphone-');
function wav(channels,{silent=false,quiet=false,samples=null,rate=16000}={}){
 const frames=samples?.length??rate*3,b=Buffer.alloc(44+frames*channels*2);
 b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(channels,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*channels*2,28);b.writeUInt16LE(channels*2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);
 for(let i=0;i<frames;i++)for(let c=0;c<channels;c++)b.writeInt16LE(samples?Math.round(Math.max(-1,Math.min(1,samples[i]))*32767):silent?0:Math.round((quiet?8:8000)*Math.sin(2*Math.PI*440*i/rate)*(c%2?-1:1)),44+(i*channels+c)*2);
 return b;
}
let mic=wav(1),duration=3;
if(inference){
 const rows=await(await fetch('https://datasets-server.huggingface.co/first-rows?dataset=PolyAI%2Fminds14&config=es-ES&split=train',{signal:AbortSignal.timeout(30000)})).json();
 mic=Buffer.from(await(await fetch(rows.rows[0].row.audio[0].src,{signal:AbortSignal.timeout(30000)})).arrayBuffer());
 assert.equal(createHash('sha256').update(mic).digest('hex'),'8a350c47afd69d9fc7f01f6a7bdfa4ccec3515e2d0bdef218e7e2c17468f99b4');
 // Chromium's fake input accepts PCM, not this corpus's G.711 container.
 // Decode/resample using the browser's native decoder, not a new codec.
 const decoder=await chromium.launch();
 try {const page=await decoder.newPage();const samples=await page.evaluate(async bytes=>{const c=new AudioContext({sampleRate:48000});try{return Array.from((await c.decodeAudioData(new Uint8Array(bytes).buffer)).getChannelData(0));}finally{await c.close();}},[...mic]);mic=wav(1,{samples,rate:48000});}finally{await decoder.close();}
}
await writeFile(output+'/microphone.wav',mic);
const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${output}/microphone.wav`]});
const reports=[];
try{
 for(const width of baseline?[1280]:[1280,390]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'es-GT',permissions:['microphone'],serviceWorkers:'block'});
  const external=new Set(),uploads=[],errors=[];let modelRequests=0;
  context.on('request',r=>{if(!/^https?:/.test(r.url()))return;if(new URL(r.url()).origin!==origin)external.add(new URL(r.url()).origin);if(!['GET','HEAD'].includes(r.method()))uploads.push(r.method());if(r.url().includes('/models/'))modelRequests++;});
  await context.addInitScript(()=>{
   window.qaStreams=[];window.qaCaptureOnly=true;window.qaAudio=[];window.qaConstraints=[];
   const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async c=>{window.qaConstraints.push(c);const s=await get(c);window.qaStreams.push(s);return s;};
   const post=Worker.prototype.postMessage;
   Worker.prototype.postMessage=function(data,...rest){
    if(data.audio){let e=0;for(const v of data.audio)e+=v*v;const rms=Math.sqrt(e/data.audio.length);window.qaAudio.push({samples:data.audio.length,rms});
     if(window.qaCaptureOnly){this.dispatchEvent(new MessageEvent('message',{data:{status:'error',data:{code:rms<=0.00001?'no_signal':'qa_capture_only'}}}));return;}}
    return post.call(this,data,...rest);
   };
  });
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
  async function upload(bytes,name){const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'From file',exact:true}).click();await(await chooser).setFiles({name,mimeType:'audio/wav',buffer:bytes});await page.getByRole('button',{name:'Transcribe Audio',exact:true}).waitFor();}
  await upload(wav(2),'fictional-opposite-phase.wav');await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();await page.getByRole('alert').waitFor();
  const phase=await page.evaluate(()=>window.qaAudio.at(-1));
  if(baseline){assert(phase.rms<0.00001);console.log('Reproduced live p4 defect: audible opposite-phase stereo becomes below-threshold model input.');reports.push({baseline:true,phase});await context.close();continue;}
  assert(phase.rms>0.1,'Audible stereo became silence');
  await upload(wav(1,{quiet:true}),'fictional-quiet.wav');await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();await page.getByRole('alert').waitFor();
  assert((await page.evaluate(()=>window.qaAudio.at(-1).rms))>0.00001);
  await upload(wav(1,{silent:true}),'fictional-silence.wav');await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();await page.getByRole('alert').filter({hasText:'silent or almost silent'}).waitFor();
  assert.equal(modelRequests,0);
  await page.getByRole('button',{name:'Record',exact:true}).click();
  const noiseControl=page.getByRole('checkbox',{name:'Reduce background noise / Reducir ruido de fondo',exact:true});
  assert(!(await noiseControl.isChecked()));await noiseControl.focus();await page.keyboard.press('Space');assert(await noiseControl.isChecked());
  await page.getByRole('button',{name:'Start Recording',exact:true}).click();
  await page.getByRole('button',{name:/Stop Recording/}).waitFor();await page.waitForFunction(()=>Number(document.querySelector('#microphone-level')?.value)>0);
  await page.getByRole('status').filter({hasText:'Sound detected'}).waitFor();
  assert(await noiseControl.isChecked());assert(await noiseControl.isDisabled());
  const constraints=await page.evaluate(()=>window.qaConstraints.at(-1));assert.equal(constraints.audio.echoCancellation,false);assert.equal(constraints.audio.noiseSuppression,true);assert.equal(constraints.audio.autoGainControl,true);
  // Test the accepted native settings, not only the requested constraints.
  const processing=await page.evaluate(()=>{const s=window.qaStreams.at(-1).getAudioTracks()[0].getSettings();return {autoGainControl:s.autoGainControl,echoCancellation:s.echoCancellation,noiseSuppression:s.noiseSuppression};});
  assert.deepEqual(processing,{autoGainControl:true,echoCancellation:false,noiseSuppression:true});
  await page.waitForTimeout(400);await page.screenshot({path:`${output}/recording-${width}.png`});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.waitForTimeout(duration*1000);await page.getByRole('button',{name:/Stop Recording/}).click();
  assert(await page.evaluate(()=>window.qaStreams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));
  assert((await page.locator('#microphone-input option').count())>1);
  await noiseControl.focus();await page.keyboard.press('Space');assert(!(await noiseControl.isChecked()));
  const device=await page.locator('#microphone-input option').last().getAttribute('value');await page.locator('#microphone-input').selectOption(device);
  await page.getByRole('button',{name:'Start Recording',exact:true}).click();await page.getByRole('button',{name:/Stop Recording/}).waitFor();
  assert.equal(await page.evaluate(()=>window.qaConstraints.at(-1).audio.deviceId.exact),device);
  assert.equal(await page.evaluate(()=>window.qaStreams.at(-1).getAudioTracks()[0].getSettings().noiseSuppression),false);
  assert.equal(await page.evaluate(()=>window.qaStreams.at(-1).getAudioTracks()[0].getSettings().autoGainControl),true);
  await page.waitForTimeout(1500);await page.getByRole('button',{name:/Stop Recording/}).click();await page.getByRole('button',{name:'Use recording / Usar grabación',exact:true}).click();
  await page.getByRole('dialog').waitFor({state:'hidden'});await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();await page.getByRole('alert').waitFor();
  const captured=await page.evaluate(()=>window.qaAudio.at(-1));assert(captured.samples>16000&&captured.rms>0.00001);
  reports.push({width,phaseRepaired:true,quietInput:true,silenceStillRejected:true,microphoneMeter:true,deviceSelection:true,nativeRecordedSignal:true,nativeProcessing:processing,keyboardNoiseOptOut:true,tracksReleased:true});
  if(inference&&width===1280){
   // Feed the whole verified Spanish fixture through actual MediaRecorder,
   // not just file-upload decoding. Start on a new fake-device session.
   duration=await page.evaluate(async bytes=>{const c=new AudioContext();try{return(await c.decodeAudioData(new Uint8Array(bytes).buffer)).duration;}finally{await c.close();}},[...mic]);
   assert(duration>0&&duration<30);
   await page.getByRole('button',{name:'Record',exact:true}).click();await page.getByRole('button',{name:'Start Recording',exact:true}).click();await page.getByRole('button',{name:/Stop Recording/}).waitFor();await page.waitForTimeout((duration+0.4)*1000);await page.getByRole('button',{name:/Stop Recording/}).click();await page.getByRole('button',{name:'Use recording / Usar grabación',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.evaluate(()=>{window.qaCaptureOnly=false;});await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();await page.getByRole('button',{name:'Export TXT',exact:true}).waitFor({timeout:180000});
   const ready=page.waitForEvent('download');await page.getByRole('button',{name:'Export TXT',exact:true}).click();const stream=await(await ready).createReadStream(),parts=[];for await(const chunk of stream)parts.push(chunk);const transcript=Buffer.concat(parts).toString().toLowerCase();
   for(const phrase of ['tengo un problema','transferencia bancaria'])assert(transcript.includes(phrase),`Missing Spanish phrase ${phrase}`);
   reports.at(-1).spanishRecordedTranscriptionAndTxt=true;
   await page.evaluate(()=>{window.qaCaptureOnly=true;});duration=3;
  }
  assert.deepEqual([...external],[]);assert.deepEqual(uploads,[]);assert.deepEqual(errors,[]);await context.close();
 }
 await writeFile(output+'/report.json',JSON.stringify({checkedAt:new Date().toISOString(),origin,environment:'Linux Chromium with simulated microphone WAV; desktop and narrow viewport; NOT Windows/Opera hardware',reports},null,2)+'\n');
 console.log(JSON.stringify(reports));console.log('Evidence: '+output);
}finally{await browser.close();}
