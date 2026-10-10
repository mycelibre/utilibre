// Native recording with original synthetic speech + artificial hum, not real
// visitor audio. No custom DSP is shipped by this test or by the application.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';
const origin=process.env.WHISPER_CHECK_URL||'http://127.0.0.1:3347';
assert(['http://127.0.0.1:3347','https://transcribe.utilibre.org'].includes(origin));
const output=await mkdtemp('/tmp/utilibre-whisper-noise-');
const fixture=await readFile('/opt/utilibre/reports/kokoro-web-20261009/es-419.wav');
// Generated locally for the earlier Kokoro check: Hola. Esta es una prueba ficticia.
assert.equal(createHash('sha256').update(fixture).digest('hex'),'09ab385affe73e28e871357f5acf710d02d07606e3262ebed43ccd79e5e989ab');
const decoder=await chromium.launch();let speech;
try {const page=await decoder.newPage();speech=await page.evaluate(async bytes=>{const c=new AudioContext({sampleRate:48000});try{return Array.from((await c.decodeAudioData(new Uint8Array(bytes).buffer)).getChannelData(0));}finally{await c.close();}},[...fixture]);}finally{await decoder.close();}
const rate=48000,frames=speech.length+4*rate,wav=Buffer.alloc(44+frames*2);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*2,40);
for(let i=0;i<frames;i++) {const voice=(speech[i-2*rate]??0)*0.15;const hum=0.003*Math.sin(2*Math.PI*60*i/rate)+0.001*Math.sin(2*Math.PI*120*i/rate);wav.writeInt16LE(Math.round(Math.max(-1,Math.min(1,voice+hum))*32767),44+i*2);}
await writeFile(output+'/fictional-quiet-spanish-with-hum.wav',wav);
const browser=await chromium.launch({args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${output}/fictional-quiet-spanish-with-hum.wav`]});
try {
 const results=[];
 for(const noise of [false,true]) {
  const context=await browser.newContext({locale:'es-GT',permissions:['microphone']});
  const outside=new Set(),uploads=[],errors=[];
  context.on('request',r=>{if(!/^https?:/.test(r.url()))return;if(new URL(r.url()).origin!==origin)outside.add(new URL(r.url()).origin);if(!['GET','HEAD'].includes(r.method()))uploads.push(r.method());});
  await context.addInitScript(()=>{const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async c=>{const s=await get(c);window.qaStream=s;const settings=s.getAudioTracks()[0].getSettings();window.qaSettings={gain:settings.autoGainControl,noise:settings.noiseSuppression,echo:settings.echoCancellation};return s;};});
  const page=await context.newPage();page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.getByRole('button',{name:'Record',exact:true}).click();
  await page.getByRole('checkbox',{name:'Reduce background noise / Reducir ruido de fondo',exact:true}).setChecked(noise);
  await page.getByRole('button',{name:'Start Recording',exact:true}).click();await page.getByRole('button',{name:/Stop Recording/}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.qaSettings),{gain:true,noise,echo:false});
  await page.waitForTimeout(frames/rate*1000);await page.getByRole('button',{name:/Stop Recording/}).click();
  await page.locator('audio source[src^="blob:"]').waitFor({state:'attached'});
  const metrics=await page.evaluate(async()=>{
   const blob=await(await fetch(document.querySelector('audio source[src^="blob:"]').src)).arrayBuffer();
   const c=new AudioContext();try {const b=await c.decodeAudioData(blob);const x=b.getChannelData(0);const rms=(start,end)=>{const slice=x.subarray(Math.round(start*b.sampleRate),Math.round(end*b.sampleRate));let energy=0;for(const v of slice)energy+=v*v;return Math.sqrt(energy/slice.length);};let peak=0;for(const v of x)peak=Math.max(peak,Math.abs(v));return {humRms:rms(0.8,1.8),voiceRms:rms(2,4.4),peak,duration:b.duration,tracksReleased:window.qaStream.getTracks().every(t=>t.readyState==='ended')};}finally{await c.close();}
  });
  assert(metrics.peak<0.99&&metrics.voiceRms>0.00005&&metrics.duration>6&&metrics.tracksReleased);
  if(!process.argv.includes('--no-inference')) {
   await page.getByRole('button',{name:'Use recording / Usar grabación',exact:true}).click();await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'Transcribe Audio',exact:true}).click();await page.getByRole('button',{name:'Export TXT',exact:true}).waitFor({timeout:180000});
   const ready=page.waitForEvent('download');await page.getByRole('button',{name:'Export TXT',exact:true}).click();const stream=await(await ready).createReadStream(),parts=[];for await(const chunk of stream)parts.push(chunk);const transcript=Buffer.concat(parts).toString().toLowerCase();
   metrics.transcript=transcript;
   metrics.fixtureWordsPreserved=['hola','prueba','ficticia'].every(word=>transcript.includes(word));
   console.log(JSON.stringify({noise,...metrics}));
  }
  assert.deepEqual([...outside],[]);assert.deepEqual(uploads,[]);assert.deepEqual(errors,[]);
  results.push({noise,...metrics});await writeFile(output+'/comparison.json',JSON.stringify(results,null,2)+'\n');await context.close();
 }
 assert(results[1].humRms<results[0].humRms*0.8,'Hum did not decrease in this fixture');
 assert(results[1].voiceRms/results[1].humRms>results[0].voiceRms/results[0].humRms,'Voice-to-hum contrast did not improve');
 // Unsupported optional constraints must not remove native microphone capture.
 const context=await browser.newContext();await context.addInitScript(()=>{const get=navigator.mediaDevices.getSupportedConstraints.bind(navigator.mediaDevices);navigator.mediaDevices.getSupportedConstraints=()=>{const c=get();delete c.noiseSuppression;return c;};});
 const page=await context.newPage();await page.goto(origin);await page.getByRole('button',{name:'Record',exact:true}).click();const control=page.getByRole('checkbox',{name:'Reduce background noise / Reducir ruido de fondo',exact:true});assert(await control.isDisabled());assert(!(await control.isChecked()));await page.getByRole('button',{name:'Start Recording',exact:true}).click();await page.getByRole('button',{name:/Stop Recording/}).click();await context.close();
 const report={checkedAt:new Date().toISOString(),origin,environment:'Linux Chromium; synthetic Spanish voice attenuated to 15% plus 60/120 Hz artificial hum; NOT physical Windows/Opera',results,unsupportedNoiseFallback:true,outsideRequests:0,audioUploads:0};
 await writeFile(output+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));console.log('Evidence: '+output);
 // Preserve the exact-word result above even when a usable sentence survives.
 // In the initial comparison both modes misheard "Hola" as "Gola".
 if(!process.argv.includes('--no-inference'))for(const result of results)assert(result.transcript.includes('esta es una prueba ficticia'),'The quiet sentence was lost');
} finally {await browser.close();}
