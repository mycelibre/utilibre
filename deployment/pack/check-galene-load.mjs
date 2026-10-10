// External, synthetic four-person meetings. Only explicitly provisioned,
// expiring loadcheck rooms are accepted; never log ICE credentials or content.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import os from 'node:os';
const require = createRequire(process.env.GALENE_PLAYWRIGHT_PACKAGE || new URL('../../portal/package.json', import.meta.url));
const {chromium} = require('playwright-core');
const plan = JSON.parse(process.env.GALENE_LOAD_PLAN || '{}');
const worker = Number(process.env.GALENE_LOAD_WORKER);
assert(Number.isInteger(worker) && worker >= 0 && worker < 8);
assert(Array.isArray(plan.stages) && plan.stages.length > 0 && plan.stages.length <= 4);
assert(plan.startAt > Date.now() - 10000 && plan.startAt < Date.now() + 600000, 'Plan must start soon');
const allRooms = new Set();
for (const stage of plan.stages) {
  assert(stage.rooms.length > 0 && stage.rooms.length <= 8);
  assert(['auto','udp','tls'].includes(stage.relay));
  assert(Number.isInteger(stage.seconds) && stage.seconds >= 60 && stage.seconds <= 300);
  assert(Number.isInteger(stage.warmupSeconds ?? 45) && (stage.warmupSeconds ?? 45)>=45 && (stage.warmupSeconds ?? 45)<=120);
  for (const room of stage.rooms) {
    assert.match(room, /^loadcheck-[a-f0-9]{16}$/);
    assert(!allRooms.has(room), 'Use fresh rooms for every stage'); allRooms.add(room);
  }
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, Math.max(0, ms)));
const emit = value => console.log('GALENE_LOAD ' + JSON.stringify({at: Date.now(), worker, ...value}));
const round = n => Math.round(n * 100) / 100;
function generator() {
  const cpu = os.cpus().map(c => c.times).reduce((out, c) => ({idle: out.idle+c.idle, total: out.total+Object.values(c).reduce((a,b)=>a+b,0)}), {idle:0,total:0});
  return {...cpu, availableMiB: os.freemem()/1024**2};
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const reports = [], pairs = [], states = [], outbound = [];
    for (const direction of ['up','down']) for (const stream of Object.values(serverConnection[direction] || {})) {
      states.push({direction, state: stream.pc.iceConnectionState});
      const all = await stream.pc.getStats();
      for (const r of all.values()) {
        if (direction === 'down' && r.type === 'inbound-rtp') reports.push({
          id: stream.id + ':' + r.id, kind: r.kind, bytes: r.bytesReceived || 0,
          packets: r.packetsReceived || 0, lost: r.packetsLost || 0,
          frames: r.framesDecoded || 0, dropped: r.framesDropped || 0,
          width: r.frameWidth, height: r.frameHeight, jitter: r.jitter || 0,
          concealed: r.concealedSamples || 0, samples: r.totalSamplesReceived || 0,
          freezes: r.freezeCount || 0, freezeSeconds: r.totalFreezesDuration || 0,
        });
        if (direction === 'up' && r.type === 'outbound-rtp') outbound.push({id:r.id,kind:r.kind,bytes:r.bytesSent||0,frames:r.framesEncoded||0,width:r.frameWidth,height:r.frameHeight,quality:r.qualityLimitationReason});
        if (r.type === 'transport' && r.selectedCandidatePairId) {
          const pair = all.get(r.selectedCandidatePairId), local = all.get(pair?.localCandidateId);
          pairs.push({direction, local:local?.candidateType, relayProtocol:local?.relayProtocol,
            policy:stream.pc.getConfiguration().iceTransportPolicy, rtt:pair?.currentRoundTripTime || 0});
        }
      }
    }
    return {reports, pairs, states, outbound, users:Object.keys(serverConnection.users || {}).length,
      signaling:window.__loadSignaling, socketState:serverConnection.socket?.readyState,
      iceErrors:(window.__loadIceErrors || []).reduce((out, code)=>(out[code]=(out[code]||0)+1,out),{})};
  });
}
function interval(current, previous, seconds) {
  const before = new Map(previous.flatMap((c,i)=>c.reports.map(r=>[i+':'+r.id,r])));
  const media = current.flatMap((c,i)=>c.reports.map(r=> {
    const p = before.get(i+':'+r.id);
    if (!p) return {...r, fresh:true};
    const packets = Math.max(0,r.packets-p.packets), lost = Math.max(0,r.lost-p.lost);
    return {kind:r.kind, fps:round((r.frames-p.frames)/seconds), kbps:round(8*(r.bytes-p.bytes)/seconds/1000),
      packets,lost,loss:round(100*lost/Math.max(1,packets+lost)),jitterMs:round(r.jitter*1000),
      width:r.width,height:r.height,freezes:r.freezes-p.freezes,freezeSeconds:round(r.freezeSeconds-p.freezeSeconds),
      concealed:Math.max(0,r.concealed-p.concealed),samples:Math.max(0,r.samples-p.samples)};
  }));
  const video = media.filter(r=>r.kind==='video'), audio = media.filter(r=>r.kind==='audio');
  const loss = media.reduce((s,r)=>s+(r.lost||0),0), received = media.reduce((s,r)=>s+(r.packets||0),0);
  return {media, videoCount:video.length, audioCount:audio.length,
    minFps:Math.min(...video.map(r=>r.fps ?? 0)), receiveMbps:round(media.reduce((s,r)=>s+(r.kbps||0),0)/1000),
    lossPercent:round(100*loss/Math.max(1,loss+received)),
    maxRttMs:round(Math.max(0,...current.flatMap(c=>c.pairs.map(p=>p.rtt*1000))))};
}
let scheduled = plan.startAt;
emit({event:'generator',cpus:os.cpus().length,totalMiB:round(os.totalmem()/1024**2),plan});
for (let stageIndex = 0; stageIndex < plan.stages.length; stageIndex++) {
  const stage = plan.stages[stageIndex], start = scheduled;
  // Allow external browser startup and ICE negotiation before a shared window.
  const measureAt = start + (stage.warmupSeconds ?? 45)*1000, end = measureAt + stage.seconds*1000;
  scheduled = end + 20000;
  if (worker >= stage.rooms.length) { await sleep(scheduled-Date.now()); continue; }
  const room = stage.rooms[worker];
  await sleep(start-Date.now());
  assert(Date.now() < start+10000, 'Runner missed the shared stage start');
  const browser = await chromium.launch({executablePath:process.env.GALENE_CHROME || '/usr/bin/google-chrome', args:[
    '--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream',
    '--disable-background-timer-throttling','--disable-renderer-backgrounding',
    ...(process.env.GALENE_VIDEO_FILE ? [`--use-file-for-fake-video-capture=${process.env.GALENE_VIDEO_FILE}`] : []),
    ...(process.env.GALENE_AUDIO_FILE ? [`--use-file-for-fake-audio-capture=${process.env.GALENE_AUDIO_FILE}`] : []),
  ]});
  const pages = [];
  let failed = false;
  try {
    for (const username of ['SyntheticA','SyntheticB','SyntheticC','SyntheticD']) {
      const context = await browser.newContext({permissions:['camera','microphone']});
      await context.addInitScript(relay => {
        sessionStorage.setItem('settings', JSON.stringify({resolution:[1280,720],preprocessing:false}));
        const Socket = window.WebSocket;
        window.__loadSignaling = {received:0,sent:0,events:[]};
        window.WebSocket = class extends Socket {
          constructor(...args) {
            super(...args);
            const d=window.__loadSignaling;
            this.addEventListener('open',()=>d.opened=Date.now());
            this.addEventListener('close',e=>d.events.push({at:Date.now(),event:'close',code:e.code,reason:e.reason.slice(0,160),clean:e.wasClean}));
            this.addEventListener('error',()=>d.events.push({at:Date.now(),event:'socket-error'}));
            this.addEventListener('message',e=> {
              d.received++;d.lastReceived=Date.now();
              try {
                const m=JSON.parse(e.data);
                if(['ping','pong'].includes(m.type))d.lastKeepalive=Date.now();
                if(['fail','error','kicked'].includes(m.kind)&&d.events.length<20)d.events.push({at:Date.now(),event:'server-error',type:m.type,kind:m.kind,error:m.error});
              }catch{/* Never retain signaling bodies, ICE credentials or content. */}
            });
          }
          send(data) {window.__loadSignaling.sent++;window.__loadSignaling.lastSent=Date.now();return super.send(data);}
        };
        const Native = window.RTCPeerConnection;
        window.RTCPeerConnection = class extends Native {
          constructor(config, constraints) {
            if (relay !== 'auto') config = {...config, iceTransportPolicy:'relay', iceServers:(config?.iceServers || []).flatMap(s=> {
              const urls = (Array.isArray(s.urls)?s.urls:[s.urls]).filter(u=>relay==='tls'?u?.startsWith('turns:'):u?.startsWith('turn:')&&u.endsWith('transport=udp'));
              return urls.length?[{...s,urls}]:[];
            })};
            super(config,constraints);
            this.addEventListener('icecandidateerror', e=>(window.__loadIceErrors ||= []).push(e.errorCode));
          }
        };
      }, stage.relay);
      const page = await context.newPage(); pages.push(page); page.setDefaultTimeout(12000);
      page.on('pageerror',error=>emit({event:'browser-error',stage:stageIndex,message:error.message.slice(0,160)}));
      await page.goto(`https://meet.utilibre.org/group/${room}/`);
      await page.locator('#username').fill(username); await page.locator('#password').fill('');
      await page.locator('#presentboth').check(); await page.locator('#connectbutton').click();
      await page.locator('#unpresentbutton').waitFor();
      emit({event:'joined',stage:stageIndex,participant:pages.length,elapsedSeconds:round((Date.now()-start)/1000)});
      assert(await page.evaluate(()=>!serverConnection.permissions.some(p=>['op','record','token'].includes(p))), 'Fixture must be presentation only');
    }
    let current;
    do {
      current = await Promise.all(pages.map(snapshot));
      if (current.every(c=>c.reports.filter(r=>r.kind==='video'&&r.frames>3).length===3 && c.reports.filter(r=>r.kind==='audio'&&r.bytes>0).length===3)) break;
      await sleep(1000);
    } while (Date.now()<measureAt);
    emit({event:'ready',stage:stageIndex,rooms:stage.rooms.length,relay:stage.relay,clients:current});
    assert(current.every(c=>c.users===4 && c.reports.filter(r=>r.kind==='video'&&r.frames>3).length===3 && c.reports.filter(r=>r.kind==='audio'&&r.bytes>0).length===3), 'Incomplete four-person media');
    assert(Date.now() < measureAt+1000, 'Warmup exceeded shared measurement start');
    await sleep(measureAt-Date.now());
    let previous = await Promise.all(pages.map(snapshot)), last = Date.now(), previousGenerator = generator();
    let intervals = 0, bad = 0;
    while (Date.now()<end-100) {
      await sleep(Math.min(5000,end-Date.now()));
      current = await Promise.all(pages.map(snapshot));
      const at = Date.now(), seconds = (at-last)/1000, resource = generator();
      const result = interval(current,previous,seconds);
      const generatorCpu = 100*(1-(resource.idle-previousGenerator.idle)/(resource.total-previousGenerator.total));
      const connected = current.every(c=>c.users===4 && c.states.length===4 && c.states.every(s=>['connected','completed'].includes(s.state)));
      const relayed = stage.relay==='auto' || current.every(c=>c.pairs.length===4 && c.pairs.every(p=>p.policy==='relay' && ['relay','prflx'].includes(p.local) && p.relayProtocol===stage.relay));
      // All 12 video/audio subscriptions must progress throughout the call.
      const healthy = connected && relayed && result.videoCount===12 && result.audioCount===12 && result.minFps>=15 && result.lossPercent<2 && result.media.every(r=>!r.fresh&&r.kbps>0) && generatorCpu<85;
      if (!healthy) bad++;
      emit({event:'sample',stage:stageIndex,rooms:stage.rooms.length,relay:stage.relay,seconds:round(seconds),healthy,connected,relayed,
        generatorCpu:round(generatorCpu),generatorFreeMiB:round(resource.availableMiB),...result});
      intervals++; previous=current; last=at; previousGenerator=resource;
      if (!connected) throw Error('Stop: participant or media connection lost');
      if (bad>=3 || resource.availableMiB<1024) throw Error('Stop: repeated media degradation or generator pressure');
    }
    emit({event:'result',stage:stageIndex,rooms:stage.rooms.length,relay:stage.relay,seconds:stage.seconds,intervals,bad,pass:bad===0});
    assert(bad===0, 'Media degraded during measurement');
  } catch(error) {
    failed=true;
    emit({event:'failure',stage:stageIndex,error:error.message.slice(0,200),clients:await Promise.all(pages.map(p=>snapshot(p).catch(()=>null)))});
  } finally {
    // Let Chrome send TURN deallocations before terminating its processes.
    await Promise.all(pages.map(page=>page.evaluate(()=> {
      for (const direction of ['up','down']) for (const stream of Object.values(serverConnection?.[direction] || {})) stream.pc.close();
      serverConnection?.close();
    }).catch(()=>{})));
    await sleep(3000);
    await browser.close();
  }
  if (failed) { process.exitCode=1; break; }
}
