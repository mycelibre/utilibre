import test from 'node:test';
import assert from 'node:assert/strict';
import { selectedIceModes, waitForIceModes } from './pairdrop-stats.mjs';
const rows = () => [
  { id: 'local', type: 'local-candidate', candidateType: 'host' },
  { id: 'remote', type: 'remote-candidate', candidateType: 'host' },
  { id: 'pair', type: 'candidate-pair', state: 'succeeded', localCandidateId: 'local', remoteCandidateId: 'remote' },
];
test('transport selection establishes a pair without the optional nomination field', () => {
  const report = [...rows(), { id: 'transport', type: 'transport', selectedCandidatePairId: 'pair' }];
  assert.deepEqual(selectedIceModes([report]), [{ local: 'host', remote: 'host' }]);
});
test('nomination fallback requires a succeeded pair and both candidate records', () => {
  const report = rows(); report[2].nominated = true;
  assert.deepEqual(selectedIceModes([report]), [{ local: 'host', remote: 'host' }]);
  assert.deepEqual(selectedIceModes([report.slice(1)]), []);
  report[2].state = 'in-progress'; assert.deepEqual(selectedIceModes([report]), []);
});
test('unselected success and conflicting nomination cannot certify the transfer mode', () => {
  const report = rows(); assert.deepEqual(selectedIceModes([report]), []);
  report[2].nominated = true;
  report.push({ id: 'transport', type: 'transport', selectedCandidatePairId: 'other' });
  assert.deepEqual(selectedIceModes([report]), []);
});
test('relay candidate types remain distinguishable from direct transport', () => {
  const report = rows(); report[0].candidateType = 'relay'; report[2].nominated = true;
  assert.deepEqual(selectedIceModes([report]), [{ local: 'relay', remote: 'host' }]);
});
test('delayed statistics are retried without repeating a file transfer', async () => {
  let reads = 0; const report = rows(); report[2].nominated = true;
  const result = await waitForIceModes(async () => ++reads < 3 ? [[]] : [report], { timeoutMs: 1000, intervalMs: 1 });
  assert.equal(reads, 3); assert.equal(result.length, 1);
});
test('absent statistics and collector failures remain failures', async () => {
  await assert.rejects(waitForIceModes(async () => [[]], { timeoutMs: 10, intervalMs: 1 }), /deadline/);
  await assert.rejects(waitForIceModes(async () => { throw Error('browser closed'); }), /browser closed/);
});
