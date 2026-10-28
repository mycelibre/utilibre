// Two isolated browsers, real public HTTPS/WebSocket signaling and WebRTC data.
// Only a synthetic file is sent. Default checks direct mode; explicit relay
// mode is for the activated option from an external authorized runner.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {connect as tcpConnect} from 'node:net';
import {connect as tlsConnect} from 'node:tls';
import {waitForIceModes} from './pairdrop-stats.mjs';
const require = createRequire(process.env.PAIRDROP_PLAYWRIGHT_PACKAGE || new URL('../../portal/package.json', import.meta.url));
const {chromium} = require('playwright-core');

const origin = process.env.PAIRDROP_CHECK_ORIGIN || 'https://drop.utilibre.org';
assert(['https://drop.utilibre.org','http://127.0.0.1:33124'].includes(origin),'Use the public instance or the fixed synthetic staging listener');
const relay = process.env.PAIRDROP_FORCE_RELAY || '';
const receiverDirect = process.env.PAIRDROP_RECEIVER_DIRECT === 'true';
assert(['','udp','tcp','tls'].includes(relay), 'Unsupported relay transport');
assert(!receiverDirect || relay, 'A direct receiver check needs a forced-relay sender');
// Public fixed endpoints only. Do not print addresses, credentials or packets.
if (relay) {
  for (const [port, secure] of [[3479, false], [5350, true]]) {
    await new Promise((resolve, reject) => {
      const socket = (secure ? tlsConnect : tcpConnect)({host:'turn.utilibre.org', port, ...(secure ? {servername:'turn.utilibre.org'} : {})});
      socket.setTimeout(8000, () => socket.destroy(new Error(`TURN ${port} connection timed out`)));
      socket.once('error', () => reject(new Error(`Public TURN ${port} ${secure ? 'TLS validation' : 'TCP connection'} failed`)));
      socket.once(secure ? 'secureConnect' : 'connect', () => {socket.destroy();resolve();});
    });
  }
  console.log('Public TURN TCP 3479 and validated TLS 5350 reachable.');
}
const browser = await chromium.launch(process.env.PAIRDROP_CHROME ? {executablePath:process.env.PAIRDROP_CHROME} : {});
const payload = Buffer.from('Utilibre synthetic file-transfer check.\nSin datos personales.\n');
let pages = [];
try {
  const sender = await browser.newContext({ locale: 'en-US' });
  const receiver = await browser.newContext({ locale: 'es-GT', acceptDownloads: true });
  for (const [index, context] of [sender,receiver].entries()) await context.addInitScript(({relay,direct}) => {
    window.syntheticPeerConnections = [];
    window.syntheticIceSummary = {candidateTypes:[], errorCodes:[]};
    const Native = window.RTCPeerConnection;
    window.RTCPeerConnection = class extends Native {
      constructor(config, ...rest) {
        if (direct) {
          config = {...config, iceServers:config.iceServers.map(server=>({...server,urls:[server.urls].flat().filter(url=>url.startsWith('stun:'))})).filter(server=>server.urls.length)};
        } else if (relay) {
          config = {...config, iceTransportPolicy:'relay', iceServers:config.iceServers.map(server => ({...server,
            urls:[server.urls].flat().filter(url => relay === 'tls' ? url.startsWith('turns:') : url.startsWith('turn:') && url.endsWith(`transport=${relay}`)),
          })).filter(server => server.urls.length)};
        }
        super(config, ...rest); window.syntheticPeerConnections.push(this);
        this.addEventListener('icecandidate', e => {if(e.candidate) window.syntheticIceSummary.candidateTypes.push(e.candidate.type)});
        this.addEventListener('icecandidateerror', e => window.syntheticIceSummary.errorCodes.push(e.errorCode));
      }
    };
  }, {relay,direct:receiverDirect && index === 1});
  pages = await Promise.all([sender.newPage(), receiver.newPage()]);
  const errors = [], external = new Set();
  for (const page of pages) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin) {
        external.add(new URL(request.url()).origin);
      }
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }
  for (const page of pages) {
    await page.locator('x-peer input[type=file]:enabled').waitFor({ state: 'attached', timeout: 45000 });
    assert.equal(await page.locator('x-peer').count(), 1, 'Only the synthetic peer may receive this test');
  }
  await pages[0].locator('x-peer input[type=file]').setInputFiles({
    name: 'utilibre-synthetic.txt', mimeType: 'text/plain', buffer: payload,
  });
  await pages[1].locator('#accept-request').click({ timeout: 30000 });
  const downloadReady = pages[1].waitForEvent('download', { timeout: 30000 });
  await pages[1].locator('#download-btn').click({ timeout: 30000 });
  const download = await downloadReady;
  const stream = await download.createReadStream(), chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  assert.deepEqual(Buffer.concat(chunks), payload, 'Received bytes must match the synthetic file');
  assert.equal(download.suggestedFilename(), 'utilibre-synthetic.txt');
  // The bytes can arrive before getStats publishes its selected pair. Poll
  // observations only, never resend the file or accept an unselected pair.
  const modes = await waitForIceModes(() => pages[0].evaluate(async () => {
    const fields = ['id','type','state','nominated','selectedCandidatePairId','localCandidateId','remoteCandidateId','candidateType'];
    const reports = [];
    for (const peer of window.syntheticPeerConnections.filter(p => p.connectionState === 'connected')) {
      reports.push([...await peer.getStats()].map(([, row]) => Object.fromEntries(fields.filter(k => row[k] !== undefined).map(k => [k, row[k]]))));
    }
    return reports;
  }));
  assert(modes.length>0);assert(modes.every(m=>relay ? m.local === 'relay' : ['host','srflx','prflx'].includes(m.local)),'Selected ICE mode did not match the requested test');
  if(receiverDirect) assert(modes.every(m=>['host','srflx','prflx'].includes(m.remote)),'Receiver unexpectedly used a relay');
  // Chromium denies this optional screen-awake request in a background tab.
  // It does not stop the verified transfer; do not hide any other JS error.
  assert.deepEqual(errors.filter(error => error !== 'Wake Lock permission request denied'), []);
  assert.deepEqual([...external], []);
  console.log(`PairDrop ${origin.startsWith('https:')?'public HTTPS':'loopback staging'}: discovery, approval and exact-byte WebRTC transfer passed; selected ${relay ? `relay (${relay})` : 'direct'} mode confirmed through WebRTC stats.`);
  if(receiverDirect) console.log('Receiver used a direct candidate: public relay UDP range was exercised, not just same-server relay forwarding.');
  console.log('Browsers share this test machine; physical-device and different-client-network behavior are not established by this check.');
} catch (error) {
  // Avoid retaining room identifiers, browser state or visitor content in logs.
  console.error('PairDrop synthetic workflow failed:', String(error.message).replace(/https?:\/\/\S+/g, '[URL]').slice(0,700));
  for (const page of pages) console.error('Synthetic connection summary:', await page.evaluate(() => ({
    peerCount:document.querySelectorAll('x-peer').length,
    candidateTypes:window.syntheticIceSummary?.candidateTypes,
    errorCodes:window.syntheticIceSummary?.errorCodes,
    connectionStates:window.syntheticPeerConnections?.map(p=>p.connectionState),
  })).catch(()=>({unavailable:true})));
  process.exitCode = 1;
} finally {
  await browser.close();
}
