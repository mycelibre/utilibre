// Bounded synthetic lifecycle check on the installed native Galene client.
// Never uses the real community room, administrator account, or user media.
import assert from 'node:assert/strict';
import {randomBytes, pbkdf2Sync} from 'node:crypto';
import {writeFile, chown, unlink} from 'node:fs/promises';
import {chromium} from '../../portal/node_modules/playwright-core/index.mjs';

const seconds = Number(process.env.GALENE_SOAK_SECONDS || 180);
assert(Number.isInteger(seconds) && seconds >= 30 && seconds <= 600);
const room = `lifecycle-${randomBytes(8).toString('hex')}`;
const localLab=process.env.GALENE_LIFECYCLE_LAB==='1';
const file = `${localLab?'/opt/utilibre/galene-lifecycle-lab':'/opt/utilibre/pack-data/galene'}/groups/${room}.json`;
const password = randomBytes(24).toString('base64url');
const salt = randomBytes(16);
const verifier = {type:'pbkdf2', hash:'sha-256', salt:salt.toString('hex'),
  key:pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex'), iterations:600000};
const origin = localLab?'http://127.0.0.1:3349':'https://meet.utilibre.org';
let browser;
const external = new Set(), failures = [], closes = [], streamCloseEvents=[];
let deliberateDisconnect = false;
const report = (event, data={}) => console.log(JSON.stringify({at:new Date().toISOString(), event, ...data}));

async function join(page, username) {
  await page.goto(`${origin}/group/${room}/`);
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#presentboth').check();
  await page.locator('#connectbutton').click();
  await page.locator('#unpresentbutton').waitFor({timeout:20000});
}
async function media(page, label) {
  return page.evaluate(async label => {
    const values=[];
    for (const stream of Object.values(serverConnection.down)) {
      if (label && stream.label !== label) continue;
      for (const r of (await stream.pc.getStats()).values()) {
        if(r.type === 'inbound-rtp') values.push({kind:r.kind, bytes:r.bytesReceived||0, frames:r.framesDecoded||0, label:stream.label});
      }
    }
    return values;
  }, label);
}
async function received(page, label) {
  for(let i=0; i<30; i++) {
    const values=await media(page, label);
    if(values.some(r=>r.kind==='video' && r.frames>=3) &&
      (label==='screenshare' || values.some(r=>r.kind==='audio' && r.bytes>0))) return values;
    await page.waitForTimeout(1000);
  }
  throw new Error(`Synthetic ${label||'camera'} media did not arrive`);
}

try {
  await writeFile(file, JSON.stringify({public:false, 'max-clients':2,
    'max-history-age':0, 'allow-recording':false, 'auto-subgroups':false,
    'unrestricted-tokens':false, autolock:true, autokick:true,
    expires:new Date(Date.now()+20*60*1000).toISOString(),
    users:{SyntheticHost:{password:verifier,permissions:'op'},
      SyntheticGuest:{password:verifier,permissions:'present'}}}), {flag:'wx', mode:0o640});
  await chown(file,4003,4003);
  browser=await chromium.launch({args:['--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream', '--auto-select-desktop-capture-source=Entire screen']});
  const contexts=await Promise.all([1,2].map(()=>browser.newContext({permissions:['camera','microphone']})));
  for(const context of contexts) context.on('request',request=>{
    if(/^https?:/.test(request.url()) && new URL(request.url()).origin!==origin) external.add(new URL(request.url()).origin);
  });
  const pages=await Promise.all(contexts.map(context=>context.newPage()));
  for(const page of pages) {
    page.setDefaultTimeout(20000);
    page.on('pageerror',()=>failures.push('browser exception'));
    page.on('websocket',socket=>{
      socket.on('close',()=>closes.push({expected:deliberateDisconnect}));
      for(const direction of ['framesent','framereceived']) socket.on(direction,frame=>{
        try { const m=JSON.parse(String(frame.payload)); if(['close','abort','pong','ping'].includes(m.type)) streamCloseEvents.push({client:pages.indexOf(page),direction,type:m.type,id:m.id?.slice(0,8)}); } catch {}
      });
    });
  }
  const [host,guest]=pages;
  await join(host,'SyntheticHost');
  await host.locator('#input').fill('/unlock');
  await host.locator('#inputbutton').click();
  await join(guest,'SyntheticGuest');
  assert(!(await guest.evaluate(()=>serverConnection.permissions)).includes('op'));
  await Promise.all(pages.map(page=>received(page)));
  report('two-client-camera-and-audio-pass');
  await host.locator('#sharebutton').click();
  const screen=await received(guest,'screenshare');
  report('native-screen-share-pass',{received:screen});
  await host.locator('#input').fill('/unsharescreen');
  await host.locator('#inputbutton').click();
  await guest.waitForFunction(()=>!Object.values(serverConnection.down).some(s=>s.label==='screenshare'),null,{timeout:15000}).catch(async error=>{report('stop-failure',{streamCloseEvents,guestMedia:await media(guest,'screenshare'),hostSocket:await host.evaluate(()=>serverConnection.socket?.readyState)});throw error;});
  report('native-screen-stop-pass');
  deliberateDisconnect=true;
  await join(guest,'SyntheticGuest'); // Full page navigation closes the prior session.
  await Promise.all(pages.map(page=>received(page)));
  deliberateDisconnect=false;
  report('guest-rejoin-pass');
  let previous=await Promise.all(pages.map(page=>media(page)));
  const start=Date.now();
  while(Date.now()-start<seconds*1000) {
    await host.waitForTimeout(Math.min(30000,seconds*1000-(Date.now()-start)));
    const current=await Promise.all(pages.map(page=>media(page)));
    for(let i=0;i<pages.length;i++) {
      assert(await pages[i].evaluate(()=>serverConnection.socket?.readyState===WebSocket.OPEN),'Signaling disconnected');
      for(const kind of ['audio','video']) {
        const sum=rows=>rows.filter(r=>r.kind===kind).reduce((n,r)=>n+(kind==='video'?r.frames:r.bytes),0);
        assert(sum(current[i])>sum(previous[i]),`${kind} stopped advancing`);
      }
    }
    previous=current;
    report('soak-progress',{seconds:Math.round((Date.now()-start)/1000)});
  }
  deliberateDisconnect=true;
  await host.close();
  await guest.waitForFunction(()=>!serverConnection?.group);
  assert.deepEqual([...external],[],'Unexpected browser HTTP origins');
  assert.deepEqual(failures,[]);
  assert(!closes.some(close=>!close.expected),'Unexpected signaling closure');
  report('PASS',{soakSeconds:seconds, externalHttpOrigins:0,
    scope:'Linux Chromium; two isolated browser contexts; same-host clients; fake camera and browser screen capture, not a real phone or external-network test'});
} finally {
  deliberateDisconnect=true;
  await browser?.close();
  await unlink(file).catch(error=>{if(error.code!=='ENOENT') throw error;});
}
