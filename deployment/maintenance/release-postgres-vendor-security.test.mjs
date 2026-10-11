// No Docker, database access, filesystem writes, or real polling delays.
import assert from 'node:assert/strict';
import test from 'node:test';
import {releaseReviewedRow} from './release-postgres-vendor-security.mjs';

const healthy = image => ({
  Image: image,
  State: {Running: true, Health: {Status: 'healthy'}},
});

function fixture() {
  const row = {
    name: 'fixture-db', oldRef: 'old:reviewed',
    oldImage: 'sha256:old', newImage: 'sha256:new',
  };
  const calls = {start: 0, rollback: 0, save: 0, inspect: 0, delay: 0};
  const receipts = [];
  let live = healthy(row.oldImage);
  const ops = {
    delay: async () => { calls.delay++; },
    save: async () => { calls.save++; receipts.push(structuredClone(row)); },
    inspect: async name => {
      calls.inspect++;
      return name === row.oldRef ? {Id: row.oldImage} : live;
    },
    start: async () => { calls.start++; live = healthy(row.newImage); },
    rollback: async () => { calls.rollback++; live = healthy(row.oldImage); },
  };
  return {row, calls, receipts, ops, setLive: value => { live = value; }};
}

test('success verifies the exact candidate and never rolls back', async () => {
  const f = fixture();
  await releaseReviewedRow(f.row, f.row.oldImage, f.ops);
  assert.equal(f.row.status, 'passed');
  assert.equal(f.calls.start, 1);
  assert.equal(f.calls.rollback, 0);
  assert.deepEqual(f.receipts.map(r => r.status), ['applying', 'passed']);
});

test('compose start failure enters verified rollback with sanitized receipt', async () => {
  const f = fixture();
  f.ops.start = async () => { f.calls.start++; throw Error('secret-fixture-value'); };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), error => {
    assert.match(error.message, /exact old same-engine image is running and healthy/);
    assert.doesNotMatch(error.message, /secret-fixture-value/);
    return true;
  });
  assert.equal(f.row.failurePhase, 'start');
  assert.equal(f.row.rollback.status, 'verified');
  assert.equal(f.calls.rollback, 1);
  assert.doesNotMatch(JSON.stringify(f.receipts), /secret-fixture-value/);
  assert.equal(f.receipts.at(-1).status, 'failed');
});

test('candidate inspection exception enters rollback', async () => {
  const f = fixture();
  const inspect = f.ops.inspect;
  let fail = true;
  f.ops.inspect = async name => {
    if (name === f.row.name && fail) { fail = false; throw Error('private-output'); }
    return inspect(name);
  };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /release failed during healthcheck/);
  assert.equal(f.row.rollback.status, 'verified');
  assert.equal(f.calls.rollback, 1);
  assert.doesNotMatch(JSON.stringify(f.receipts), /private-output/);
});

test('healthy wrong image cannot establish candidate or rollback success', async () => {
  const f = fixture();
  f.ops.start = async () => f.setLive(healthy('sha256:wrong'));
  f.ops.rollback = async () => { f.calls.rollback++; f.setLive(healthy('sha256:wrong')); };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /rollback NOT verified/);
  assert.equal(f.row.rollback.status, 'unverified');
  assert.equal(f.calls.rollback, 1);
  assert.equal(f.calls.inspect, 81); // 40 candidate + old tag + 40 rollback.
  assert.equal(f.calls.delay, 78);
});

test('the exact old image must also be healthy', async () => {
  const f = fixture();
  f.ops.start = async () => { throw Error('start'); };
  f.ops.rollback = async () => f.setLive({
    Image: f.row.oldImage, State: {Running: true, Health: {Status: 'unhealthy'}},
  });
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /rollback NOT verified/);
  assert.equal(f.row.rollback.status, 'unverified');
  assert.equal(f.calls.inspect, 41);
});

test('a moved old tag prevents rollback mutation', async () => {
  const f = fixture();
  f.ops.start = async () => { throw Error('start'); };
  f.ops.inspect = async name => name === f.row.oldRef
    ? {Id: 'sha256:unexpected'} : healthy(f.row.oldImage);
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /rollback NOT verified/);
  assert.equal(f.calls.rollback, 0);
  assert.equal(f.row.rollback.status, 'unverified');
});

test('rollback command error is recorded but verified running state is decisive', async () => {
  const f = fixture();
  f.ops.start = async () => { throw Error('start'); };
  f.ops.rollback = async () => { f.setLive(healthy(f.row.oldImage)); throw Error('rollback'); };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /exact old same-engine image is running and healthy/);
  assert.equal(f.row.rollback.commandFailed, true);
  assert.equal(f.row.rollback.status, 'verified');
});

test('rollback command and health failures stay unverified', async () => {
  const f = fixture();
  f.ops.start = async () => f.setLive({Image: f.row.newImage, State: {Running: false}});
  f.ops.rollback = async () => { throw Error('rollback'); };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /rollback NOT verified/);
  assert.equal(f.row.rollback.status, 'unverified');
  assert.equal(f.row.rollback.commandFailed, true);
});

test('initial receipt failure prevents mutation', async () => {
  const f = fixture();
  f.ops.save = async () => { throw Error('unwritable receipt'); };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /unwritable receipt/);
  assert.equal(f.calls.start, 0);
  assert.equal(f.calls.rollback, 0);
  assert.equal(f.calls.inspect, 0);
});

test('post-mutation receipt failure cannot bypass rollback', async () => {
  const f = fixture();
  let saves = 0;
  f.ops.save = async () => { if (++saves > 1) throw Error('receipt'); };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /Receipt write also failed/);
  assert.equal(f.row.failurePhase, 'receipt');
  assert.equal(f.row.rollback.status, 'verified');
  assert.equal(f.row.receiptWriteFailed, true);
  assert.equal(f.calls.rollback, 1);
});

test('already-deployed candidate is health checked without a restart', async () => {
  const f = fixture();
  f.setLive(healthy(f.row.newImage));
  // A rerun must clear stale failure fields before recording the new result.
  Object.assign(f.row, {failurePhase: 'start', rollback: {status: 'unverified'}, receiptWriteFailed: true});
  await releaseReviewedRow(f.row, f.row.newImage, f.ops);
  assert.equal(f.calls.start, 0);
  assert.equal(f.calls.inspect, 1);
  assert.equal(f.row.status, 'passed');
  for (const key of ['failurePhase', 'rollback', 'receiptWriteFailed']) assert.equal(key in f.row, false);
});

test('rollback retries a transient inspection failure', async () => {
  const f = fixture();
  const inspect = f.ops.inspect;
  let recovering = false;
  let fail = true;
  f.ops.start = async () => { throw Error('start'); };
  f.ops.rollback = async () => { recovering = true; };
  f.ops.inspect = async name => {
    if (recovering && name === f.row.name && fail) { fail = false; throw Error('transient'); }
    return inspect(name);
  };
  await assert.rejects(releaseReviewedRow(f.row, f.row.oldImage, f.ops), /exact old same-engine image is running and healthy/);
  assert.equal(f.row.rollback.status, 'verified');
  assert.equal(f.calls.delay, 1);
});
