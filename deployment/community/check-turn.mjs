import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
// Synthetic loopback only. Never print credentials or peer candidate addresses.
const rtc = JSON.parse(await readFile('/opt/utilibre/turn-lab/rtc.json','utf8'));
const iceServers = [rtc.iceServers[1]];
const browser = await chromium.launch();
try {
  const page = await browser.newPage(); await page.goto('http://127.0.0.1:3169/');
  const result = await page.evaluate(async iceServers => {
    const a = new RTCPeerConnection({ iceServers, iceTransportPolicy:'relay' });
    const b = new RTCPeerConnection({ iceServers, iceTransportPolicy:'relay' });
    const failures=[]; const types=[];
    a.onicecandidate = e => { if(e.candidate) { types.push(e.candidate.type); b.addIceCandidate(e.candidate).catch(()=>failures.push('candidate')); } };
    b.onicecandidate = e => { if(e.candidate) { types.push(e.candidate.type); a.addIceCandidate(e.candidate).catch(()=>failures.push('candidate')); } };
    const got = new Promise((resolve,reject) => { const timer=setTimeout(()=>reject(new Error('Relay did not transfer within 20s')),20000); b.ondatachannel = e => { e.channel.onmessage = m => { clearTimeout(timer); resolve(m.data); }; }; });
    const channel=a.createDataChannel('synthetic'); channel.onopen=()=>channel.send('Utilibre synthetic relay sample');
    await a.setLocalDescription(await a.createOffer()); await b.setRemoteDescription(a.localDescription); await b.setLocalDescription(await b.createAnswer()); await a.setRemoteDescription(b.localDescription);
    try {
      const received=await got; const stats=await a.getStats(); let selected;
      for(const report of stats.values()) if(report.type==='candidate-pair' && report.state==='succeeded' && report.nominated) selected=stats.get(report.localCandidateId)?.candidateType;
      return {received, types, selected, failures};
    } finally {a.close();b.close();}
  }, iceServers);
  assert.equal(result.received,'Utilibre synthetic relay sample'); assert.equal(result.selected,'relay'); assert(result.types.every(t=>t==='relay')); assert.deepEqual(result.failures,[]);
  // Closed browser connections can leave allocations until their refresh expires.
  // Reset ONLY the disposable loopback lab between the two independent checks.
  execFileSync('docker',['compose','-f','deployment/community/compose.turn.yaml','--profile','lab','restart','turn-lab'],{stdio:'ignore'});
  const quota = await page.evaluate(async server => {
    const peers=[], results=[];
    try {
      for(let i=0;i<5;i++){
        const pc=new RTCPeerConnection({iceTransportPolicy:'relay',iceServers:[{...server,urls:server.urls[0]}]});peers.push(pc);pc.createDataChannel('quota');
        const got=new Promise(resolve=>{let timer=setTimeout(()=>resolve('none'),4000);pc.onicecandidate=e=>{if(e.candidate?.type==='relay'){clearTimeout(timer);resolve('relay')}};pc.onicecandidateerror=e=>{if(e.errorCode===486){clearTimeout(timer);resolve('quota')}}});
        await pc.setLocalDescription(await pc.createOffer());results.push(await got);
      }
      return results;
    } finally {peers.forEach(p=>p.close())}
  },iceServers[0]);
  // A browser can reserve more than one allocation across its interfaces.
  // An allocation quota is not a promise of four simultaneous users.
  assert.equal(quota[0],'relay');assert(quota.includes('quota'));assert(quota.filter(v=>v==='relay').length<=4);
  console.log(JSON.stringify({at:new Date().toISOString(),result:'PASS',checks:['exact synthetic payload','forced relay selected via WebRTC stats','allocation quota refusal observed (486)'],candidateGatheringResults:quota,configuredLimits:{allocations:4,perAllocationBytesPerSecond:128000,totalBytesPerSecond:256000},limitations:['loopback only','allocations are not users; browsers reserve multiple candidates','public NAT/TLS/firewalls untested','bandwidth ceilings configured, not throughput-tested; not a monthly budget']}));
} finally {await browser.close();}
