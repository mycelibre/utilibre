import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { containerMetrics, evaluate, probeMetrics, retainHistory } from './performance-monitor.mjs';

const baseline = { name: 'test', id: 'id', startedAt: 'start', usage: 1000000, quota: 2,
  periods: 100, throttled: 10, throttledUsec: 100000, memoryMiB: 100, workingMiB: 80,
  limitMiB: 200, oomKills: 0, restarts: 0, pids: 2, health: 'healthy' };
test('CPU is normalized to quota; throttling uses eligible periods, not wall time', () => {
  const c = containerMetrics({ ...baseline, usage: 91000000, periods: 700, throttled: 310, throttledUsec: 20100000 }, baseline, 60);
  assert.equal(c.cores, 1.5); assert.equal(c.quotaPercent, 75);
  assert.equal(c.throttledPercent, 50); assert.equal(c.throttledSeconds, 20); assert.equal(c.memoryPercent, 40);
});
test('restarts, recreation and counter resets cannot become negative or inflated usage', () => {
  for (const changes of [{ id: 'other' }, { startedAt: 'new' }, { usage: 1 }]) {
    assert.equal(containerMetrics({ ...baseline, ...changes }, baseline, 60).cores, null);
  }
  const restarted = containerMetrics({ ...baseline, startedAt: 'new', restarts: 1 }, baseline, 60);
  assert.equal(restarted.restartDelta, 1); assert.equal(restarted.oomDelta, null);
  assert.equal(containerMetrics(baseline, undefined, 60).cores, null);
  assert.equal(containerMetrics({ ...baseline, quota: null }, baseline, 60).quotaPercent, null);
});
const metrics = (cpu = 90) => ({ containers: [{ name: 'test', quotaPercent: cpu, memoryPercent: 10 }],
  probes: [], host: { cpuPercent: 10, availableMiB: 5000, totalMiB: 10000, diskFreeGiB: 30 } });
test('CPU recommendation needs sustained readings and resets after a gap or recovery', () => {
  let state = evaluate(metrics()); assert.equal(state.issues.length, 0);
  state = evaluate(metrics(), state); assert.equal(state.issues.length, 0);
  state = evaluate(metrics(), state); assert.equal(state.issues.length, 1);
  assert.equal(evaluate(metrics(), state, false).issues.length, 0);
  assert.equal(evaluate(metrics(20), state).issues.length, 0);
});
test('slow probes must be distinct; no repeated counting of the same heartbeat', () => {
  const sample = metrics(10); sample.probes = [{ id: 1, name: 'probe', at: 1, status: 1, stale: false, ms: 1500 }];
  let state = { ...evaluate(sample), probes: structuredClone(sample.probes) };
  for (let i = 0; i < 10; i++) state = { ...evaluate(sample, state), probes: structuredClone(sample.probes) };
  assert.equal(state.issues.length, 0);
  sample.probes[0].at = 2; state = { ...evaluate(sample, state), probes: structuredClone(sample.probes) };
  sample.probes[0].at = 3; assert.match(evaluate(sample, state).issues[0], /three distinct probes/);
});
test('probe collection excludes URLs, response messages and other fields', () => {
  const page = { publicGroupList: [{ monitorList: [{ id: 1, name: 'probe', url: 'secret' }] }] };
  const result = probeMetrics(page, { heartbeatList: { 1: [{ time: '2026-10-08 12:00:00', status: 1, ping: 20, msg: 'private' }] } }, Date.parse('2026-10-08T12:01:00Z'));
  assert.equal(result[0].stale, false); assert.equal(result[0].ms, 20);
  assert.doesNotMatch(JSON.stringify(result), /private|secret/);
  assert.equal(probeMetrics(page, {}, Date.now())[0].stale, true);
});
test('retention removes only expired date-named history; keeps seven calendar days', () => {
  const dir = mkdtempSync(join(tmpdir(), 'utilibre-performance-'));
  try {
    for (const name of ['2026-10-01.jsonl', '2026-10-02.jsonl', '2026-10-08.jsonl', 'state.json', 'notes']) writeFileSync(join(dir, name), '');
    retainHistory(dir, Date.parse('2026-10-08T12:00:00Z'));
    assert.deepEqual(readdirSync(dir).sort(), ['2026-10-02.jsonl', '2026-10-08.jsonl', 'notes', 'state.json']);
  } finally { rmSync(dir, { recursive: true }); }
});
