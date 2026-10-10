// Local aggregate capacity telemetry. Never collect request bodies, URLs,
// environment variables, credentials, database contents or visitor identifiers.
import { readFileSync, writeFileSync, renameSync, mkdirSync, appendFileSync,
  existsSync, readdirSync, unlinkSync, statSync, statfsSync, createReadStream } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { pathToFileURL } from 'node:url';

export const directory = '/var/lib/utilibre-performance';
const round = n => Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
const pairs = text => Object.fromEntries(text.trim().split('\n').map(line => {
  const [key, value] = line.trim().split(/\s+/); return [key, Number(value)];
}));
const read = file => readFileSync(file, 'utf8').trim();
const delta = (now, before) => Number.isFinite(now) && Number.isFinite(before) && now >= before ? now - before : null;

export function hostSnapshot() {
  const cpu = read('/proc/stat').split('\n')[0].split(/\s+/).slice(1, 9).map(Number);
  const memory = pairs(read('/proc/meminfo').replaceAll(':', ''));
  const disk = statfsSync('/opt/utilibre');
  return { boot: read('/proc/sys/kernel/random/boot_id'), uptime: Number(read('/proc/uptime').split(' ')[0]),
    cpuTotal: cpu.reduce((a, b) => a + b, 0), cpuIdle: cpu[3] + cpu[4], cpuSteal: cpu[7],
    availableMiB: round(memory.MemAvailable / 1024), totalMiB: round(memory.MemTotal / 1024),
    diskFreeGiB: round(disk.bavail * disk.bsize / 1024 ** 3) };
}

export function containerInventory() {
  const ids = execFileSync('docker', ['ps', '-q'], { encoding: 'utf8', timeout: 10000 }).trim().split('\n').filter(Boolean);
  if (!ids.length) throw Error('No running containers found');
  const format = '{"id":{{json .Id}},"name":{{json .Name}},"pid":{{.State.Pid}},"startedAt":{{json .State.StartedAt}},"restarts":{{.RestartCount}},"health":{{with index .State "Health"}}{{json .Status}}{{else}}null{{end}}}';
  return execFileSync('docker', ['inspect', '--format', format, ...ids], { encoding: 'utf8', timeout: 10000, maxBuffer: 2 * 1024 ** 2 })
    .trim().split('\n').map(line => {
      const item = JSON.parse(line);
      item.name = item.name.replace(/^\//, '');
      try { item.path = '/sys/fs/cgroup' + read(`/proc/${item.pid}/cgroup`).match(/^0::(.+)$/m)[1]; }
      catch { item.path = null; }
      return item;
    });
}

export function containerSnapshots(inventory) {
  return inventory.map(({ name, id, startedAt, restarts, health, path }) => {
    const base = { name, id, startedAt, restarts, health };
    try {
      const cpu = pairs(read(`${path}/cpu.stat`));
      const [quota, period] = read(`${path}/cpu.max`).split(' ');
      const current = Number(read(`${path}/memory.current`));
      const memory = pairs(read(`${path}/memory.stat`));
      const limit = read(`${path}/memory.max`);
      return { ...base, usage: cpu.usage_usec, periods: cpu.nr_periods, throttled: cpu.nr_throttled,
        throttledUsec: cpu.throttled_usec, quota: quota === 'max' ? null : Number(quota) / Number(period),
        memoryMiB: round(current / 1024 ** 2), workingMiB: round(Math.max(0, current - (memory.inactive_file || 0)) / 1024 ** 2),
        limitMiB: limit === 'max' ? null : round(Number(limit) / 1024 ** 2),
        oomKills: pairs(read(`${path}/memory.events`)).oom_kill, pids: Number(read(`${path}/pids.current`)) };
    } catch { return { ...base, unavailable: true }; }
  });
}

export function containerMetrics(current, previous, seconds) {
  const same = previous && current.id === previous.id && current.startedAt === previous.startedAt && seconds > 0;
  const usage = same ? delta(current.usage, previous.usage) : null;
  const periods = same ? delta(current.periods, previous.periods) : null;
  const throttled = same ? delta(current.throttled, previous.throttled) : null;
  const throttleTime = same ? delta(current.throttledUsec, previous.throttledUsec) : null;
  const cores = usage === null ? null : usage / 1e6 / seconds;
  return { name: current.name, quota: current.quota ?? null, cores: round(cores),
    quotaPercent: cores !== null && current.quota ? round(100 * cores / current.quota) : null,
    throttledPercent: periods > 0 && throttled !== null ? round(100 * throttled / periods) : null,
    throttledSeconds: throttleTime === null ? null : round(throttleTime / 1e6),
    memoryMiB: current.memoryMiB ?? null, workingMiB: current.workingMiB ?? null, limitMiB: current.limitMiB ?? null,
    memoryPercent: current.limitMiB ? round(100 * current.workingMiB / current.limitMiB) : null,
    oomDelta: same ? delta(current.oomKills, previous.oomKills) : null,
    restartDelta: previous?.id === current.id ? delta(current.restarts, previous.restarts) : null,
    pids: current.pids ?? null, health: current.health, unavailable: Boolean(current.unavailable) };
}

export function probeMetrics(page, health, now = Date.now()) {
  const monitors = page.publicGroupList?.flatMap(group => group.monitorList) || [];
  if (!monitors.length) throw Error('No public monitors');
  return monitors.map(monitor => {
    const beat = health.heartbeatList?.[monitor.id]?.at(-1);
    const timestamp = beat ? Date.parse(beat.time.replace(' ', 'T') + 'Z') : NaN;
    return { id: monitor.id, name: monitor.name, at: Number.isFinite(timestamp) ? timestamp : null,
      status: beat?.status ?? null, ms: typeof beat?.ping === 'number' ? beat.ping : null,
      stale: !Number.isFinite(timestamp) || now - timestamp > 20 * 60 * 1000 };
  });
}

export function evaluate(metrics, previous = {}, consecutive = true) {
  const streaks = {}, issues = [];
  function streak(key, condition, fresh = true) {
    const old = consecutive ? previous.streaks?.[key] || 0 : 0;
    streaks[key] = condition ? (fresh ? Math.min(3, old + 1) : old) : 0;
    return streaks[key] >= 3;
  }
  for (const c of metrics.containers) {
    if (c.unavailable) issues.push(`${c.name}: resource sample unavailable`);
    if (c.health === 'unhealthy') issues.push(`${c.name}: unhealthy`);
    if (c.restartDelta > 0) issues.push(`${c.name}: ${c.restartDelta} new restart(s)`);
    if (c.oomDelta > 0) issues.push(`${c.name}: ${c.oomDelta} new OOM kill(s)`);
    if (streak(`cpu:${c.name}`, c.quotaPercent >= 85)) issues.push(`${c.name}: sustained CPU usage above 85% of quota; inspect latency and throttling`);
    if (streak(`memory:${c.name}`, c.memoryPercent >= 85)) issues.push(`${c.name}: sustained memory working set above 85% of limit`);
  }
  for (const probe of metrics.probes) {
    if (probe.stale || probe.status !== 1) issues.push(`${probe.name}: ${probe.stale ? 'stale' : 'failed'} availability probe`);
    const fresh = previous.probes?.find(p => p.id === probe.id)?.at !== probe.at;
    if (streak(`probe:${probe.id}`, !probe.stale && probe.status === 1 && probe.ms > 1000, fresh)) issues.push(`${probe.name}: three distinct probes slower than 1000ms`);
  }
  if (streak('host:cpu', metrics.host.cpuPercent >= 85)) issues.push('Host: sustained CPU usage above 85%');
  if (metrics.host.availableMiB < metrics.host.totalMiB * .1) issues.push('Host: available memory below 10%');
  if (metrics.host.diskFreeGiB < 15) issues.push('Host: application disk has less than 15 GiB free');
  if (metrics.probeError) issues.push('Kuma: probe telemetry unavailable');
  return { streaks, issues: issues.sort() };
}

function atomic(file, value) {
  writeFileSync(file + '.tmp', JSON.stringify(value) + '\n', { mode: 0o600 });
  renameSync(file + '.tmp', file);
}

export function retainHistory(root, now = Date.now()) {
  const today = new Date(now).toISOString().slice(0, 10);
  const oldest = new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10);
  for (const name of readdirSync(root)) {
    if (/^\d{4}-\d{2}-\d{2}\.jsonl$/.test(name) && name.slice(0, 10) < oldest) unlinkSync(`${root}/${name}`);
  }
}

export async function collect() {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const previous = existsSync(`${directory}/state.json`) ? JSON.parse(read(`${directory}/state.json`)) : {};
  const host = hostSnapshot(), containers = containerSnapshots(containerInventory());
  const seconds = previous.host?.boot === host.boot ? host.uptime - previous.host.uptime : 0;
  const consecutive = seconds > 0 && seconds <= 150;
  const old = new Map((previous.containers || []).map(c => [c.name, c]));
  const total = delta(host.cpuTotal, previous.host?.cpuTotal), idle = delta(host.cpuIdle, previous.host?.cpuIdle);
  const steal = delta(host.cpuSteal, previous.host?.cpuSteal);
  const sample = { at: Date.now(), intervalSeconds: round(seconds),
    host: { cpuPercent: consecutive && total > 0 ? round(100 * (1 - idle / total)) : null,
      stealPercent: consecutive && total > 0 ? round(100 * steal / total) : null,
      availableMiB: host.availableMiB, totalMiB: host.totalMiB, diskFreeGiB: host.diskFreeGiB },
    containers: containers.map(c => containerMetrics(c, consecutive ? old.get(c.name) : undefined, seconds)), probes: [] };
  try {
    const fetchJSON = async path => {
      const response = await fetch(`http://127.0.0.1:3135/api/status-page/${path}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw Error('Kuma unavailable');
      return response.json();
    };
    sample.probes = probeMetrics(...await Promise.all([fetchJSON('utilibre'), fetchJSON('heartbeat/utilibre')]));
  } catch { sample.probeError = true; }
  const { streaks, issues } = evaluate(sample, previous.latest, consecutive);
  for (const c of previous.containers || []) if (!containers.some(now => now.name === c.name)) issues.push(`${c.name}: no longer running`);
  issues.sort(); sample.issues = issues;
  const today = new Date(sample.at).toISOString().slice(0, 10);
  retainHistory(directory, sample.at);
  let historyAt = previous.historyAt || 0;
  if (sample.at - historyAt >= 5 * 60 * 1000) {
    const file = `${directory}/${today}.jsonl`, line = JSON.stringify(sample) + '\n';
    if ((existsSync(file) ? statSync(file).size : 0) + Buffer.byteLength(line) <= 32 * 1024 ** 2) {
      appendFileSync(file, line, { mode: 0o600 }); historyAt = sample.at;
    } else { sample.issues.push('Performance history daily size limit reached'); }
  }
  atomic(`${directory}/latest.json`, sample);
  atomic(`${directory}/state.json`, { host, containers, historyAt, latest: { probes: sample.probes, streaks, issues: sample.issues } });
  if (JSON.stringify(sample.issues) !== JSON.stringify(previous.latest?.issues || [])) console.warn(JSON.stringify({ performanceIssues: sample.issues }));
  console.log(`Sampled ${containers.length} containers and ${sample.probes.length} probes; ${sample.issues.length} local issue(s).`);
  return sample;
}

export async function report() {
  const latest = JSON.parse(read(`${directory}/latest.json`));
  const stale = Date.now() - latest.at > 180000;
  console.log(`Latest: ${new Date(latest.at).toISOString()}${stale ? ' — COLLECTOR STALE' : ''}`);
  console.log(`Host CPU ${latest.host.cpuPercent ?? 'warming up'}%; available RAM ${round(latest.host.availableMiB / 1024)} GiB; free disk ${latest.host.diskFreeGiB} GiB.`);
  console.log('CPU quota is a ceiling, not a reservation. 1 core = 100% of one virtual CPU.');
  console.table([...latest.containers].sort((a, b) => (b.quotaPercent || 0) - (a.quotaPercent || 0)).slice(0, 12)
    .map(c => ({ service: c.name, cores: c.cores, quota: c.quota, 'quota %': c.quotaPercent, 'throttled periods %': c.throttledPercent, 'memory %': c.memoryPercent })));
  const probes = new Map(); let samples = 0;
  for (const file of readdirSync(directory).filter(n => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(n)).sort()) {
    const input = createInterface({ input: createReadStream(`${directory}/${file}`), crlfDelay: Infinity });
    for await (const line of input) {
      let sample; try { sample = JSON.parse(line); } catch { continue; }
      samples++;
      for (const p of sample.probes) {
        const values = probes.get(p.id) || { name: p.name, observations: new Map() };
        if (p.at !== null) values.observations.set(p.at, { ms: p.ms, failed: p.status !== 1 });
        probes.set(p.id, values);
      }
    }
  }
  console.log(`${samples} retained five-minute samples. Unique synthetic probes (not visitor latency or request error rates):`);
  console.table([...probes.values()].map(p => {
    const values = [...p.observations.values()], ms = values.map(v => v.ms).filter(Number.isFinite).sort((a, b) => a - b);
    return { service: p.name, probes: values.length, failed: values.filter(v => v.failed).length, p95ms: ms.length ? ms[Math.ceil(ms.length * .95) - 1] : null };
  }).sort((a, b) => b.failed - a.failed || (b.p95ms || 0) - (a.p95ms || 0)).slice(0, 10));
  console.log(latest.issues.length ? latest.issues.join('\n') : 'No sustained resource or probe issues observed.');
  if (stale) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const command = process.argv[2] || 'report';
  if (command === 'collect') await collect();
  else if (command === 'report') await report();
  else throw Error('Usage: performance-monitor.mjs [collect|report]');
}
