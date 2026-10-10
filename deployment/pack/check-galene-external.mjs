// Two synthetic clients on an external runner. Use an expiring, disposable room
// with two presentation-only synthetic usernames and no persistent content.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(process.env.GALENE_PLAYWRIGHT_PACKAGE || new URL('../../portal/package.json', import.meta.url));
const { chromium } = require('playwright-core');
const room = process.env.GALENE_CHECK_GROUP;
assert.match(room || '', /^connectivity-[a-f0-9]{16}$/);
const relay = process.env.GALENE_FORCE_RELAY === 'auto' ? '' : process.env.GALENE_FORCE_RELAY || '';
assert(['', 'udp', 'tcp', 'tls'].includes(relay));
const count = Number(process.env.GALENE_CHECK_CLIENTS || 2);
assert([2, 4].includes(count));
const browser = await chromium.launch({
  ...(process.env.GALENE_CHROME ? { executablePath: process.env.GALENE_CHROME } : {}),
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', ...(process.env.GALENE_CHECK_LOCAL_TURN === '1' ? ['--force-webrtc-ip-handling-policy=default_public_interface_only'] : [])],
});
const pages = [];
async function stats(page) {
  return page.evaluate(async () => {
    const streams = Object.values(serverConnection?.down || {});
    const media = [], pairs = [];
    for (const stream of streams) {
      const reports = await stream.pc.getStats();
      for (const report of reports.values()) {
        if (report.type === 'inbound-rtp') media.push({ kind: report.kind, bytes: report.bytesReceived, frames: report.framesDecoded });
        if (report.type === 'transport' && report.selectedCandidatePairId) {
          const pair = reports.get(report.selectedCandidatePairId);
          const local = reports.get(pair?.localCandidateId);
          pairs.push({ local: local?.candidateType, remote: reports.get(pair?.remoteCandidateId)?.candidateType, relayProtocol: local?.relayProtocol, policy: stream.pc.getConfiguration().iceTransportPolicy });
        }
      }
    }
    return { media, pairs, states: streams.map(stream => stream.pc.iceConnectionState) };
  });
}
try {
  for (const username of ['SyntheticA', 'SyntheticB', 'SyntheticC', 'SyntheticD'].slice(0, count)) {
    const context = await browser.newContext({ permissions: ['camera', 'microphone'] });
    if (relay) await context.addInitScript(({ relay, local }) => {
      const Native = window.RTCPeerConnection;
      window.RTCPeerConnection = class extends Native {
        constructor(config, constraints) {
          const iceServers = (config?.iceServers || []).flatMap(server => {
            let urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(url =>
              relay === 'tls' ? url?.startsWith('turns:') : url?.startsWith('turn:') && url.endsWith(`transport=${relay}`));
            if (relay === 'tcp' && !urls.length) urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter(url => url?.startsWith('turn:') && url.endsWith('transport=udp')).map(url => url.replace('transport=udp','transport=tcp'));
            return urls.length ? [{ ...server, urls: local ? urls.map(url => url.replace('turn.utilibre.org', '10.10.1.43')) : urls }] : [];
          });
          super({ ...config, iceTransportPolicy: 'relay', iceServers }, constraints);
          window.__utilibreIceErrors ||= [];
          this.addEventListener('icecandidateerror', event => window.__utilibreIceErrors.push({code:event.errorCode,text:event.errorText}));
        }
      };
    }, { relay, local: process.env.GALENE_CHECK_LOCAL_TURN === '1' });
    if (process.env.GALENE_SIMULCAST === 'off') await context.addInitScript(() => sessionStorage.setItem('settings', JSON.stringify({simulcast:'off'})));
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => console.log(`Synthetic browser error: ${error.message.slice(0,160)}`));
    page.on('websocket', socket => socket.on('framereceived', frame => {
      try {
        const message=JSON.parse(String(frame.payload));
        if (['fail','error','kicked'].includes(message.kind)) console.log(JSON.stringify({syntheticUser:username,serverEvent:message.type,kind:message.kind,error:message.error,message:message.message,value:typeof message.value==='string'?message.value.slice(0,160):undefined}));
      } catch { /* Binary or unrelated frames carry no diagnostic output. */ }
    }));
    page.setDefaultTimeout(15000);
    await page.goto(`https://meet.utilibre.org/group/${room}/`);
    await page.locator('#username').fill(username);
    await page.locator('#password').fill('');
    await page.locator('#presentboth').check();
    await page.locator('#connectbutton').click();
    try { await page.locator('#unpresentbutton').waitFor(); }
    catch (error) {
      console.log(JSON.stringify({joining:username,diagnostic:await page.evaluate(()=>({group:serverConnection?.group,permissions:serverConnection?.permissions,users:Object.keys(serverConnection?.users||{}).length,toasts:Array.from(document.querySelectorAll('.toastify')).map(el=>el.textContent)}))}));
      throw error;
    }
    console.log(`Synthetic participant ${pages.length}/${count} joined.`);
    const permissions = await page.evaluate(() => serverConnection.permissions);
    assert(!permissions.some(value => ['op', 'record', 'token'].includes(value)));
    if (relay) assert(await page.evaluate(() => (serverConnection.rtcConfiguration?.iceServers || []).some(server => (Array.isArray(server.urls) ? server.urls : [server.urls]).some(url => url.startsWith('turn')))), 'Live Galene ICE configuration must contain TURN');
  }
  let results;
  for (let attempt = 0; attempt < 25; attempt++) {
    results = await Promise.all(pages.map(stats));
    if (results.every(result => result.media.filter(m => m.kind === 'audio' && m.bytes > 0).length >= count - 1 && result.media.filter(m => m.kind === 'video' && m.frames >= 3).length >= count - 1)) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), scope: process.env.GITHUB_ACTIONS === 'true' ? 'external runner' : 'local dry run', forcedRelay: relay || false, simulcast: process.env.GALENE_SIMULCAST || 'default', clients: results }));
  if (relay) console.log(JSON.stringify({iceErrorCounts:await Promise.all(pages.map(page=>page.evaluate(()=>(window.__utilibreIceErrors||[]).reduce((counts,error)=>({...counts,[error.code]:(counts[error.code]||0)+1}),{}))))}));
  if (results.some(result=>!result.media.length)) console.log(JSON.stringify({connectionDiagnostics:await Promise.all(pages.map(page=>page.evaluate(async()=>{
    const result=[];
    for(const direction of ['up','down'])for(const stream of Object.values(serverConnection[direction]||{})){
      const all=await stream.pc.getStats();
      const candidates=[],pairs=[];
      for(const r of all.values()){
        if(r.type==='local-candidate'||r.type==='remote-candidate')candidates.push({id:r.id,side:r.type,type:r.candidateType,protocol:r.protocol,port:r.port});
        if(r.type==='candidate-pair')pairs.push({state:r.state,nominated:r.nominated,local:r.localCandidateId,remote:r.remoteCandidateId,sent:r.bytesSent,received:r.bytesReceived});
      }
      result.push({direction,state:stream.pc.iceConnectionState,connection:stream.pc.connectionState,candidates,pairs});
    }
    return result;
  })))}));
  assert(results.every(result => result.media.filter(m => m.kind === 'audio' && m.bytes > 0).length >= count - 1), 'Every client must receive audio from every other client');
  assert(results.every(result => result.media.filter(m => m.kind === 'video' && m.frames >= 3).length >= count - 1), 'Every client must decode video from every other client');
  // A relay behind the same NAT as Galene can be classified as peer-reflexive
  // after discovery of its private address. The selected relayProtocol plus
  // relay-only policy proves the transport without mistaking it for a direct call.
  if (relay) assert(results.every(result => result.pairs.length >= count - 1 && result.pairs.every(pair => ['relay','prflx'].includes(pair.local) && pair.policy === 'relay' && pair.relayProtocol === (relay === 'udp' ? 'udp' : relay === 'tls' ? 'tls' : 'tcp'))), 'Every receiving connection must select the requested relay transport');
  console.log('PASS: all synthetic clients received audio and decoded video; no real account or device used.');
} finally { await browser.close(); }
