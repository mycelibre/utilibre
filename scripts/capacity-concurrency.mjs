// Bounded static-delivery checks, with actual simultaneous launches and cgroup
// CPU accounting. No searches, writes, browser execution or external providers.
import http from 'node:http';
import https from 'node:https';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { targets, safeAssetPaths, percentile } from './capacity-check.mjs';

const [suite = 'mixed', mode = 'origin', label = 'baseline'] = process.argv.slice(2);
if (!['mixed', 'portal', 'sessions'].includes(suite) || !['origin', 'public'].includes(mode) || !/^[a-z0-9-]+$/.test(label)) throw Error('Invalid suite/mode/label');
const poolTargets = suite === 'portal' ? targets.slice(0, 1) : targets.slice(0, 10);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const round = n => Math.round(n * 100) / 100;
const report = { at: new Date().toISOString(), suite, mode, label,
  scope: 'HTML plus at most one same-origin JS/CSS file under 1MiB, equal weighting. Generator shares the application VM. Bursts are simultaneously launched visits; sessions revisit every 10s. Neither is full browser/application workflow capacity.',
  preflight: [], phases: [] };
const directory = `/opt/utilibre/reports/concurrency-${report.at.replace(/[:.]/g, '-')}-${suite}-${mode}-${label}`;
mkdirSync(directory, { recursive: true, mode: 0o700 });
const save = () => writeFileSync(`${directory}/results.json`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
const containers = JSON.parse(execFileSync('docker', ['inspect', ...execFileSync('docker', ['ps', '-q'], { encoding: 'utf8' }).trim().split('\n')], { encoding: 'utf8', maxBuffer: 8 * 1024 ** 2 })).map(c => ({
  name: c.Name.slice(1), quotaCPUs: c.HostConfig.NanoCpus / 1e9,
  path: '/sys/fs/cgroup' + readFileSync(`/proc/${c.State.Pid}/cgroup`, 'utf8').trim().split('::')[1],
}));
function containerSample() {
  return Object.fromEntries(containers.flatMap(c => {
    try { return [[c.name, Object.fromEntries(readFileSync(`${c.path}/cpu.stat`, 'utf8').trim().split('\n').map(l => { const [k, v] = l.split(' '); return [k, Number(v)]; }))]]; }
    catch { return []; }
  }));
}
function hostSample() {
  const mem = readFileSync('/proc/meminfo', 'utf8');
  const cpu = readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1, 9).map(Number);
  return { availableMiB: Number(mem.match(/MemAvailable:\s+(\d+)/)[1]) / 1024, total: cpu.reduce((a, b) => a + b), idle: cpu[3] + cpu[4] };
}
let agent, phaseStats, totalBytes = 0;
function request(target, path, capture = false) {
  if (!poolTargets.includes(target) || !path.startsWith('/') || path.startsWith('//')) throw Error('Target not allowed');
  return new Promise(resolve => {
    const start = performance.now();
    let bytes = 0, body = '', done = false;
    const finish = extra => {
      if (done) return;
      done = true; clearTimeout(timer);
      if (phaseStats) phaseStats.activeRequests--;
      const result = { ms: performance.now() - start, bytes, body, ...extra };
      // Let the Agent return the completed socket to its pool before a visit
      // asks for its asset; otherwise bursts create unnecessary extra sockets.
      setImmediate(() => resolve(result));
    };
    if (phaseStats) { phaseStats.activeRequests++; phaseStats.peakOutstandingRequests = Math.max(phaseStats.peakOutstandingRequests, phaseStats.activeRequests); }
    const req = (mode === 'origin' ? http : https).get({
      hostname: mode === 'origin' ? '10.10.1.43' : target.host,
      port: mode === 'origin' ? target.port : 443, path, agent,
      headers: { Host: target.host, 'User-Agent': 'Utilibre-Bounded-Concurrency/1.0', 'Accept-Encoding': 'identity' },
    }, res => {
      res.on('data', chunk => {
        bytes += chunk.length; totalBytes += chunk.length;
        if (capture && bytes <= 2 * 1024 ** 2) body += chunk.toString();
        if (bytes > 2 * 1024 ** 2 || totalBytes > 6 * 1024 ** 3) req.destroy(Error('byte-budget'));
      });
      res.on('end', () => finish({ status: res.statusCode, type: res.headers['content-type'] }));
      res.on('error', e => finish({ status: 0, error: e.message }));
    });
    const timer = setTimeout(() => req.destroy(Error('deadline')), 5000);
    req.on('error', e => finish({ status: 0, error: e.message }));
    if (phaseStats) {
      phaseStats.peakAllocatedSockets = Math.max(phaseStats.peakAllocatedSockets, agent.totalSocketCount);
      phaseStats.peakQueuedRequests = Math.max(phaseStats.peakQueuedRequests, Object.values(agent.requests).reduce((n, list) => n + list.length, 0));
    }
  });
}
function newAgent() {
  return new (mode === 'origin' ? http.Agent : https.Agent)({ keepAlive: true, maxSockets: 2048, maxTotalSockets: 4096, maxFreeSockets: 256, timeout: 5000 });
}
async function phase(pool, concurrency, seconds = 0) {
  agent = newAgent();
  const started = performance.now(), before = containerSample();
  const stats = phaseStats = { concurrency, sessionSeconds: seconds, thinkSeconds: seconds ? 10 : 0,
    requests: 0, errors: 0, bytes: 0, visits: 0, completeVisits: 0, statuses: {}, errorsByCode: {}, byTarget: {}, samples: [], activeRequests: 0,
    peakOutstandingRequests: 0, peakAllocatedSockets: 0, peakQueuedRequests: 0, stopped: null };
  const initialHost = hostSample();
  let previous = initialHost, highCPU = 0;
  const latencies = [], visitTimes = [];
  const timer = setInterval(() => {
    const now = hostSample();
    const cpuBusyPercent = 100 * (1 - (now.idle - previous.idle) / (now.total - previous.total));
    previous = now;
    stats.samples.push({ seconds: round((performance.now() - started) / 1000), cpuBusyPercent: round(cpuBusyPercent), availableMiB: round(now.availableMiB) });
    highCPU = cpuBusyPercent > 85 ? highCPU + 1 : 0;
    if (now.availableMiB < 3072 || highCPU >= 6) stats.stopped = 'host-resource-guard';
  }, 500);
  async function visit(i) {
    const entry = pool[i % pool.length], begin = performance.now();
    let successful = 0;
    for (const path of entry.paths) {
      if (stats.stopped) break;
      const r = await request(entry.target, path);
      const ok = r.status === 200 && r.bytes > 0 && (path === entry.target.path ? /text\/html/ : /javascript|css/).test(r.type || '');
      stats.requests++; stats.errors += Number(!ok); stats.bytes += r.bytes;
      successful += Number(ok);
      if (!ok) stats.errorsByCode[r.error || `HTTP-${r.status}`] = (stats.errorsByCode[r.error || `HTTP-${r.status}`] || 0) + 1;
      stats.statuses[r.status] = (stats.statuses[r.status] || 0) + 1; latencies.push(r.ms);
      const per = stats.byTarget[entry.target.id] ||= { requests: 0, errors: 0, latencies: [] };
      per.requests++; per.errors += Number(!ok); per.latencies.push(r.ms);
      if (stats.bytes > 3 * 1024 ** 3 || totalBytes > 6 * 1024 ** 3) stats.stopped = 'byte-budget';
      if (stats.requests >= 100 && stats.errors / stats.requests > .02) stats.stopped = 'error-rate-above-2-percent';
    }
    stats.visits++; stats.completeVisits += Number(successful === entry.paths.length); visitTimes.push(performance.now() - begin);
  }
  try {
    if (seconds) {
      await Promise.all(Array.from({ length: concurrency }, async (_, i) => {
        let due = started + i * 10000 / concurrency;
        while (due < started + seconds * 1000 && !stats.stopped) {
          await pause(Math.max(0, due - performance.now()));
          if (stats.stopped) break;
          await visit(i); due += 10000;
          if (performance.now() > due) { stats.stopped = 'visitor-fell-behind'; break; }
        }
      }));
    } else await Promise.all(Array.from({ length: concurrency }, (_, i) => visit(i)));
  } finally { clearInterval(timer); agent.destroy(); phaseStats = null; }
  stats.elapsedSeconds = round((performance.now() - started) / 1000);
  const finalHost = hostSample();
  stats.averageHostCPUPercent = round(100 * (1 - (finalHost.idle - initialHost.idle) / (finalHost.total - initialHost.total)));
  stats.minimumAvailableMiB = Math.min(initialHost.availableMiB, finalHost.availableMiB, ...stats.samples.map(s => s.availableMiB));
  stats.requestsPerSecond = round(stats.requests / stats.elapsedSeconds);
  stats.responseP95Ms = round(percentile(latencies, .95)); stats.visitP95Ms = round(percentile(visitTimes, .95));
  for (const per of Object.values(stats.byTarget)) { per.p95Ms = round(percentile(per.latencies, .95)); delete per.latencies; }
  const after = containerSample();
  stats.containerCPU = containers.flatMap(c => {
    const a = before[c.name], b = after[c.name];
    if (!a || !b) return [];
    return [{ name: c.name, quotaCPUs: c.quotaCPUs, cpuSeconds: round((b.usage_usec - a.usage_usec) / 1e6),
      throttledSeconds: round((b.throttled_usec - a.throttled_usec) / 1e6), throttledPeriods: b.nr_throttled - a.nr_throttled }];
  }).filter(c => c.cpuSeconds > .01 || c.throttledPeriods).sort((a, b) => b.cpuSeconds - a.cpuSeconds);
  if (!stats.stopped && stats.visitP95Ms > 1000) stats.stopped = 'visit-p95-above-1-second';
  if (!stats.stopped && stats.peakQueuedRequests) stats.stopped = 'generator-socket-queue';
  if (!stats.stopped && Object.values(stats.byTarget).some(p => p.errors)) stats.stopped = 'target-errors';
  report.phases.push(stats); save();
  console.log(JSON.stringify({ ...stats, samples: undefined, containerCPU: stats.containerCPU.slice(0, 5) }));
  return stats;
}
try {
  agent = newAgent();
  const pool = [];
  for (const target of poolTargets) {
    const root = await request(target, target.path, true);
    if (root.status !== 200 || !/text\/html/.test(root.type || '')) throw Error(`Preflight failed: ${target.id}, ${root.status}`);
    const paths = [target.path], asset = safeAssetPaths(root.body, target)[0];
    if (asset) { const r = await request(target, asset); if (r.status === 200 && r.bytes <= 1024 ** 2 && /javascript|css/.test(r.type || '')) paths.push(asset); }
    pool.push({ target, paths }); report.preflight.push({ id: target.id, paths });
  }
  agent.destroy(); save();
  const stages = suite === 'sessions' ? [1000, 2000] : [25, 100, 250, 500, 1000, ...(suite === 'mixed' ? [2000] : [])];
  for (const n of stages) {
    if (hostSample().availableMiB < 4096) throw Error('Insufficient memory headroom');
    const result = await phase(pool, n, suite === 'sessions' ? 60 : 0);
    if (result.stopped) { report.stopped = result.stopped; process.exitCode = 1; break; }
    await pause(3000);
  }
} catch (error) { report.stopped = error.message; process.exitCode = 1; }
finally { agent?.destroy(); report.finishedAt = new Date().toISOString(); save(); console.log(`REPORT ${directory}/results.json`); }
