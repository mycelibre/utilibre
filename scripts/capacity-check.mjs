// Bounded, read-only HTTP capacity checks. No user data or upstream searches.
// This measures selected page/asset delivery, not complete browser workflows.
import http from 'node:http';
import https from 'node:https';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { performance, monitorEventLoopDelay } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

export const targets = [
  ['portal', 4173, '/en/', 'utilibre.org'],
  ['pdf', 3101, '/'], ['convert', 3102, '/'], ['tools', 3103, '/'],
  ['dev', 3109, '/'], ['hat', 3110, '/'], ['draw', 3111, '/'],
  ['qr', 3112, '/'], ['qrtools', 3155, '/'], ['python', 3133, '/lab/index.html'],
  ['budget', 3132, '/'], ['design', 3131, '/'], ['cv', 3130, '/'],
  ['poll', 3123, '/'], ['drop', 3124, '/'], ['fmd', 3141, '/'],
  ['paste', 3108, '/'], ['wakapi', 3136, '/'], ['rss', 3106, '/i/'],
  ['secret', 3122, '/'],
].map(([id, port, path, host]) => ({ id, port, path, host: host || `${id}.utilibre.org` }));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
export const percentile = (values, p) => values.length ? [...values].sort((a,b) => a-b)[Math.min(values.length-1, Math.ceil(values.length*p)-1)] : null;
const rounded = n => n == null ? null : Math.round(n * 100) / 100;
const agents = {
  origin: new http.Agent({ keepAlive: true, maxSockets: 64, maxFreeSockets: 2, timeout: 5000 }),
  edge: new https.Agent({ keepAlive: true, maxSockets: 64, maxFreeSockets: 2, timeout: 5000 }),
  public: new https.Agent({ keepAlive: true, maxSockets: 32, maxFreeSockets: 2, timeout: 5000 }),
};

export function safeAssetPaths(html, target) {
  const base = new URL(target.path, `https://${target.host}`);
  return [...new Set([...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/g)].flatMap(match => {
    try {
      const url = new URL(match[1].replaceAll('&amp;', '&'), base);
      return url.origin === base.origin && !url.username && !url.password && !url.pathname.startsWith('/api/') ? [url.pathname + url.search] : [];
    } catch { return []; }
  }))];
}

export function request(target, path, mode = 'origin', capture = false) {
  if (!agents[mode] || !targets.some(t => t.host === target.host && t.port === target.port) || !path.startsWith('/') || path.startsWith('//')) throw Error('Target not allowlisted');
  return new Promise(resolve => {
    const start = performance.now();
    let bytes = 0, body = '', settled = false;
    const done = result => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve({ ms: performance.now() - start, bytes, ...result });
    };
    const transport = mode === 'origin' ? http : https;
    const req = transport.get({
      hostname: mode === 'origin' ? '10.10.1.43' : mode === 'edge' ? '10.10.1.3' : target.host,
      port: mode === 'origin' ? target.port : 443,
      servername: target.host, path, agent: agents[mode],
      headers: { Host: target.host, 'X-Forwarded-Proto': 'https', 'User-Agent': 'Utilibre-Capacity-Check/1.0', 'Accept-Encoding': 'identity' },
    }, res => {
      res.on('data', chunk => {
        bytes += chunk.length;
        if (capture && body.length < 1024 * 1024) body += chunk.toString('utf8');
        if (bytes > 8 * 1024 * 1024) req.destroy(Error('response-size-cap'));
      });
      res.on('end', () => done({ status: res.statusCode, type: res.headers['content-type'], body: capture ? body : undefined }));
      res.on('error', error => done({ status: 0, error: error.message }));
    });
    const deadline = setTimeout(() => req.destroy(Error('request-deadline')), 5000);
    req.on('error', error => done({ status: 0, error: error.message }));
  });
}

function hostSample() {
  const mem = readFileSync('/proc/meminfo','utf8');
  const cpu = readFileSync('/proc/stat','utf8').split('\n')[0].trim().split(/\s+/).slice(1,9).map(Number);
  return { at: new Date().toISOString(), availableMiB: Number(mem.match(/MemAvailable:\s+(\d+)/)[1])/1024,
    swapUsedMiB: (Number(mem.match(/SwapTotal:\s+(\d+)/)[1])-Number(mem.match(/SwapFree:\s+(\d+)/)[1]))/1024,
    cpuTotal: cpu.reduce((a,b)=>a+b,0), cpuIdle: cpu[3]+cpu[4] };
}

export async function phase({ name, pool, mode, rate, seconds = 20, maxInflight = 80 }) {
  if (!(Number.isFinite(rate) && rate > 0 && rate <= 200 && Number.isFinite(seconds) && seconds > 0 && seconds <= 60 && Number.isInteger(maxInflight) && maxInflight >= 1 && maxInflight <= 100)) throw Error('Unsafe phase bounds');
  if (!agents[mode] || !Array.isArray(pool) || !pool.length) throw Error('Invalid phase target pool or mode');
  const start = performance.now(), end = start + seconds * 1000;
  const stats = { name, mode, scheduledVisitsPerSecond: rate, seconds, modelSecondsBetweenVisits: 10, modelSessionEquivalent: rate*10,
    visitsStarted: 0, completedVisits: 0, droppedVisits: 0, peakInflightVisits: 0, requests: 0, errors: 0, bytes: 0, statuses: {}, byTarget: {}, samples: [], stopped: null };
  const latencies = [], visits = [], pending = new Set();
  let previous = hostSample(), highCpu = 0;
  const loop = monitorEventLoopDelay({ resolution: 20 }); loop.enable();
  const sampler = setInterval(() => {
    const now = hostSample();
    now.cpuBusyPercent = 100 * (1-(now.cpuIdle-previous.cpuIdle)/(now.cpuTotal-previous.cpuTotal));
    previous = now; stats.samples.push(now);
    if (now.availableMiB < 2048) stats.stopped = 'host-memory-below-2GiB';
    highCpu = now.cpuBusyPercent > 85 ? highCpu+1 : 0;
    if (highCpu >= 3) stats.stopped = 'host-CPU-above-85-percent-for-3-seconds';
  }, 1000);
  const visit = async entry => {
    const visitStart = performance.now();
    for (const path of entry.paths) {
      if (stats.stopped) break;
      const result = await request(entry.target, path, mode);
      const expectedType = path === entry.target.path ? /text\/html/ : /javascript|css/;
      const ok = result.status === 200 && result.bytes > 0 && expectedType.test(result.type || '');
      stats.requests++; stats.bytes += result.bytes; stats.errors += Number(!ok);
      stats.statuses[result.status] = (stats.statuses[result.status] || 0)+1;
      const key = entry.target.id;
      const per = stats.byTarget[key] ||= { requests: 0, errors: 0, latencies: [], statuses: {} };
      per.requests++; per.errors += Number(!ok); per.latencies.push(result.ms);
      per.statuses[result.status] = (per.statuses[result.status] || 0)+1;
      latencies.push(result.ms);
      if (stats.bytes > 512*1024*1024) stats.stopped = 'phase-byte-budget-512MiB';
      if (stats.requests >= 100 && stats.errors/stats.requests > 0.02) stats.stopped = 'HTTP-error-rate-above-2-percent';
    }
    stats.completedVisits++; visits.push(performance.now()-visitStart);
  };
  try {
    let slot = 0;
    while (performance.now() < end && !stats.stopped) {
      const due = start + slot * 1000/rate;
      if (performance.now() < due) await pause(due-performance.now());
      if (performance.now() >= end || stats.stopped) break;
      if (performance.now()-due > 200 || pending.size >= maxInflight) stats.droppedVisits++;
      else {
        const item = pool[slot % pool.length];
        stats.visitsStarted++;
        const p = visit(item).finally(() => pending.delete(p)); pending.add(p);
        stats.peakInflightVisits = Math.max(stats.peakInflightVisits, pending.size);
      }
      slot++;
    }
    await Promise.all(pending);
  } finally { clearInterval(sampler); loop.disable(); }
  stats.elapsedSeconds = (performance.now()-start)/1000;
  stats.achievedRequestsPerSecond = rounded(stats.requests/stats.elapsedSeconds);
  stats.responseP50Ms = rounded(percentile(latencies,.5)); stats.responseP95Ms = rounded(percentile(latencies,.95));
  stats.responseP99Ms = rounded(percentile(latencies,.99)); stats.visitP95Ms = rounded(percentile(visits,.95));
  stats.generatorLoopP99Ms = rounded(loop.percentile(99)/1e6);
  for (const per of Object.values(stats.byTarget)) { per.p95Ms=rounded(percentile(per.latencies,.95)); delete per.latencies; }
  if (!stats.stopped && stats.responseP95Ms > 1000) stats.stopped = 'p95-exceeds-1-second-do-not-escalate';
  if (!stats.stopped && stats.droppedVisits > 0) stats.stopped = 'generator-missed-arrivals-do-not-escalate';
  return stats;
}

export function closeAgents() { for (const agent of Object.values(agents)) agent.destroy(); }

async function main() {
  const mode = process.argv[2] || 'origin';
  if (!['origin','edge','public'].includes(mode)) throw Error('Use origin, edge or public');
  const report = { at:new Date().toISOString(), mode, scope:'GET page plus one same-origin JS/CSS asset; no browser execution, logins, user writes, searches, exports, media streaming or upstream fetches. Equal target weighting. Load generator shares app VM. Not a full user-capacity certification.', preflight:[], phases:[] };
  const pool = [];
  try {
    for (const target of targets) {
      const root = await request(target,target.path,mode,true);
      const paths = [target.path];
      const row = {id:target.id,rootStatus:root.status,rootBytes:root.bytes,rootMs:rounded(root.ms),error:root.error};
      if (root.status === 200 && /text\/html/.test(root.type || '') && root.body.includes('<')) {
        const asset = safeAssetPaths(root.body,target)[0];
        if (asset) {
          const result = await request(target,asset,mode);
          row.assetStatus = result.status; row.assetBytes = result.bytes;
          if (result.status === 200 && /javascript|css/.test(result.type || '') && result.bytes <= 1024*1024) paths.push(asset);
          else row.assetSkipped = 'not a successful JS/CSS file under 1MiB';
        }
        pool.push({ target, paths });
        row.testedPaths = paths;
      } else row.skipped = 'preflight did not return an HTML application page';
      report.preflight.push(row); console.log(JSON.stringify({preflight:row}));
    }
    if (pool.length < 10) throw Error('Too few healthy front doors; abort load');
    // Open arrival model: equivalent to 25..1000 sessions visiting once / 10s.
    // No assertion that this creates 1000 concurrent requests or real browsers.
    // Public higher stages are explicit, after the small public run is reviewed.
    const rates = mode === 'public' ? (process.argv[3] === 'higher' ? [25,50,100] : [2.5,5,10]) : [2.5,5,10,25,50,100];
    for (const rate of rates) {
      if (hostSample().availableMiB < 3072) throw Error('Insufficient pre-phase RAM headroom');
      const result = await phase({name:'mixed-read-only-frontdoors',pool,mode,rate});
      report.phases.push(result);
      console.log(JSON.stringify({phase:{...result,samples:undefined,byTarget:undefined}}));
      if (result.stopped) break;
      await pause(3000);
    }
  } finally {
    closeAgents();
    report.finishedAt = new Date().toISOString();
    const directory = `/opt/utilibre/reports/capacity-${report.at.replace(/[:.]/g,'-')}-${mode}`;
    mkdirSync(directory,{recursive:true,mode:0o700});
    writeFileSync(`${directory}/results.json`,JSON.stringify(report,null,2)+'\n',{mode:0o600});
    console.log(`REPORT ${directory}/results.json`);
    const states=JSON.parse(execFileSync('docker',['inspect',...execFileSync('docker',['ps','-q'],{encoding:'utf8'}).trim().split('\n')],{encoding:'utf8',maxBuffer:8*1024*1024}));
    console.log(JSON.stringify({postflight:states.filter(c=>c.State.OOMKilled || c.State.Health?.Status==='unhealthy').map(c=>({name:c.Name,oom:c.State.OOMKilled,health:c.State.Health?.Status}))}));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
