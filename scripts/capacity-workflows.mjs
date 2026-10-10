// Small, bounded public-HTTPS workflows with synthetic fixtures and native
// cleanup. This is not a thousands-of-active-users capacity measurement.
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { hostSnapshot, containerInventory, containerSnapshots, containerMetrics } from './performance-monitor.mjs';
import { targets, request, safeAssetPaths, phase } from './capacity-check.mjs';

const suite = process.argv[2], label = process.argv[3] || 'baseline';
const scripts = {
  fmd: 'deployment/community/check-fmd.mjs', pollaris: 'deployment/community/check-pollaris.mjs',
  pairdrop: 'deployment/community/check-pairdrop.mjs', qr: 'deployment/community/check-qr-offline.mjs',
  python: 'deployment/expanded/check-jupyter.mjs', resume: 'scripts/check-capacity-resume.mjs',
};
if (!(suite in scripts || suite === 'penpot-static') || !/^[a-z0-9-]+$/.test(label)) throw Error('Choose fmd, pollaris, pairdrop, qr, python, resume or penpot-static, plus a lowercase label');
const cwd = fileURLToPath(new URL('..', import.meta.url));
const directory = `/opt/utilibre/reports/workflows-${new Date().toISOString().replace(/[:.]/g, '-')}-${suite}-${label}`;
mkdirSync(directory, { recursive: true, mode: 0o700 });
const report = { suite, label, at: new Date().toISOString(), scope: 'Synthetic workflows from the application VM. Host CPU includes browser/load generation; container CPU isolates each service. No provider searches, real accounts or real documents.', stages: [] };
const save = () => writeFileSync(`${directory}/results.json`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
const round = n => Math.round(n * 100) / 100;
let interrupted = false;
// Allow each active workflow's finally block to clean up; stop escalation.
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { interrupted = true; });
async function run(script, env = {}) {
  const started = performance.now();
  return new Promise(resolve => {
    const child = spawn(process.execPath, [script], { cwd, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    const collect = chunk => { output = (output + chunk.toString()).slice(-6000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    child.on('error', () => resolve({ ok: false, ms: round(performance.now() - started), output: 'Workflow could not start' }));
    child.on('close', code => resolve({ ok: code === 0, ms: round(performance.now() - started),
      output: output.replace(/https?:\/\/\S+/g, '[URL]').slice(-4000) }));
  });
}

async function workload(concurrency) {
  if (suite === 'penpot-static') {
    const target = targets.find(t => t.id === 'design');
    const root = await request(target, '/', 'origin', true);
    if (root.status !== 200) throw Error('Penpot preflight failed');
    const paths = ['/'];
    for (const asset of safeAssetPaths(root.body, target)) {
      const result = await request(target, asset);
      if (result.status === 200 && result.bytes <= 1024 ** 2) { paths.push(asset); break; }
    }
    const result = await phase({ name: label, pool: [{ target, paths }], mode: 'origin', rate: 100, seconds: 10, maxInflight: 100 });
    return [{ ok: !result.errors && !result.stopped && !result.droppedVisits, ...result }];
  }
  if (suite === 'resume') {
    const runID = Date.now().toString(36), env = { UTILIBRE_CAPACITY_CHECK_RUN: runID };
    report.syntheticIdentityRun = runID; save();
    const result = execFileSync('docker', ['exec', '-i', '-e', `UTILIBRE_CAPACITY_CHECK_RUN=${runID}`, 'utilibre-identity-server-1', 'ak', 'shell', '-c', 'import sys; exec(sys.stdin.read())'],
      { input: readFileSync(`${cwd}/deployment/identity/capacity-users.py`), encoding: 'utf8', maxBuffer: 2 * 1024 ** 2 });
    if (!result.includes('Two synthetic capacity identities created;')) throw Error('Synthetic identity provisioning failed');
    const results = [];
    try {
      const login = await run('deployment/identity/check-apps.mjs', { ...env, CHECK_APP: 'resume' }); results.push(login);
      if (login.ok) results.push(await run(scripts.resume, env));
    } finally { results.push(await run('scripts/retire-capacity-users.mjs', env)); }
    return results;
  }
  return Promise.all(Array.from({ length: concurrency }, () => run(scripts[suite])));
}

try {
  // Pollaris allows 12 writes/minute per IP plus a burst of 12. Two complete
  // synthetic workflows fit its burst; four do not model distinct visitors.
  for (const concurrency of suite === 'fmd' ? [1, 2, 4] : suite === 'pollaris' ? [1, 2] : [1]) {
    if (interrupted) break;
    const inventory = containerInventory(), before = containerSnapshots(inventory), startHost = hostSnapshot();
    if (startHost.availableMiB < 4096 || before.some(c => c.health === 'unhealthy')) throw Error('Preflight resource/health guard');
    const stage = { concurrency, samples: [], peakContainers: {}, resourceGuard: false }, start = performance.now();
    let previousHost = startHost, previousContainers = before, highCPU = 0;
    const sample = () => {
      const host = hostSnapshot(), current = containerSnapshots(inventory), seconds = host.uptime - previousHost.uptime;
      const cpu = 100 * (1 - (host.cpuIdle - previousHost.cpuIdle) / (host.cpuTotal - previousHost.cpuTotal));
      stage.samples.push({ seconds: round((performance.now() - start) / 1000), hostCPUPercent: round(cpu), availableMiB: host.availableMiB });
      const old = new Map(previousContainers.map(c => [c.name, c]));
      for (const c of current) {
        const m = containerMetrics(c, old.get(c.name), seconds), peak = stage.peakContainers[c.name] ||= { quotaPercent: 0, workingMiB: 0, throttledPercent: 0 };
        peak.quotaPercent = Math.max(peak.quotaPercent, m.quotaPercent || 0);
        peak.workingMiB = Math.max(peak.workingMiB, m.workingMiB || 0);
        peak.throttledPercent = Math.max(peak.throttledPercent, m.throttledPercent || 0);
      }
      highCPU = cpu > 85 ? highCPU + 1 : 0;
      if (host.availableMiB < 4096 || highCPU >= 3) stage.resourceGuard = true;
      previousHost = host; previousContainers = current;
    };
    const timer = setInterval(sample, 1000);
    try { stage.results = await workload(concurrency); }
    finally { clearInterval(timer); sample(); }
    const end = hostSnapshot(), seconds = (performance.now() - start) / 1000, old = new Map(before.map(c => [c.name, c]));
    stage.elapsedSeconds = round(seconds);
    stage.averageHostCPUPercent = round(100 * (1 - (end.cpuIdle - startHost.cpuIdle) / (end.cpuTotal - startHost.cpuTotal)));
    stage.containers = containerSnapshots(inventory).map(c => ({ ...containerMetrics(c, old.get(c.name), seconds),
      cpuSeconds: round(Math.max(0, c.usage - (old.get(c.name)?.usage || 0)) / 1e6), peak: stage.peakContainers[c.name] }))
      .sort((a, b) => b.cpuSeconds - a.cpuSeconds);
    delete stage.peakContainers;
    report.stages.push(stage); save();
    const passed = stage.results.every(r => r.ok);
    console.log(JSON.stringify({ suite, concurrency, passed, seconds: stage.elapsedSeconds, averageHostCPUPercent: stage.averageHostCPUPercent,
      containers: stage.containers.filter(c => c.cpuSeconds > .01).slice(0, 6) }));
    if (!passed || stage.resourceGuard) { report.stopped = !passed ? 'workflow-failure' : 'host-resource-guard'; process.exitCode = 1; break; }
    if (suite === 'pollaris' && concurrency === 1) {
      console.log('Allowing the per-IP write bucket to refill before the next stage.');
      await new Promise(resolve => setTimeout(resolve, 70000));
    } else await new Promise(resolve => setTimeout(resolve, 3000));
  }
} catch (error) { report.stopped = String(error.message).replace(/https?:\/\/\S+/g, '[URL]').slice(0, 400); process.exitCode = 1; }
finally { if (interrupted) { report.stopped = 'operator-interruption'; process.exitCode = 1; } report.finishedAt = new Date().toISOString(); save(); console.log(`REPORT ${directory}/results.json`); }
