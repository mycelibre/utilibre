import test from 'node:test';
import assert from 'node:assert/strict';
import {runtimePolicy, rsshubFix, rsshubRevision, rsshubDigest, trackerDigest} from './runtime-policy.mjs';
const imageId = 'sha256:' + 'a'.repeat(64);
const rssItem = {id: 'CVE-2021-21278', package: 'rsshub', installed: '1.0.0', scope: 'runtime-image', artifact: imageId};
const rss = {passed: true, imageId, revision: rsshubRevision, moduleCount: 4378, moduleDigest: rsshubDigest,
  removedModulesAbsent: true, huxiuModuleCount: 8, huxiuUnsafeEvaluationAbsent: true,
  ancestry: {status: 'ahead', behind_by: 0, merge_base_commit: {sha: rsshubFix}}};
const ipItem = {id: 'CVE-2024-29415', package: 'ip', installed: '2.0.1', scope: 'runtime-image', artifact: imageId};
const ip = {passed: true, imageId, fileCount: 517, treeDigest: trackerDigest, ipVersion: '2.0.1',
  onlyIpImport: '/app/node_modules/bittorrent-tracker/lib/server/parse-udp.js', ipApis: ['toString'], udpDisabled: true,
  classifierCalls: 0, websocketAnnouncements: 2, offerRoundtrip: true};
test('RSSHub needs reviewed compiled bytes and fixed source ancestry, not a newer date or generic version', () => {
  assert(runtimePolicy(rssItem, rss));
  for (const change of [{revision: 'b'.repeat(40)}, {moduleDigest: 'c'.repeat(64)}, {removedModulesAbsent: false},
    {huxiuUnsafeEvaluationAbsent: false}, {moduleCount: 4377}, {ancestry: {status: 'diverged'}}]) assert.equal(runtimePolicy(rssItem, {...rss, ...change}), null);
});
test('node-ip runtime attribution fails on classifier use, another caller, enabled UDP, or changed tree', () => {
  assert(runtimePolicy(ipItem, ip));
  for (const change of [{classifierCalls: 1}, {ipApis: ['isPublic']}, {onlyIpImport: '/app/server.js'}, {udpDisabled: false},
    {treeDigest: 'b'.repeat(64)}, {websocketAnnouncements: 1}, {offerRoundtrip: false}]) assert.equal(runtimePolicy(ipItem, {...ip, ...change}), null);
});
test('no copied image reviews, unknown advisories, or tracked build-input exemptions', () => {
  assert.equal(runtimePolicy({...ipItem, scope: 'tracked-build-input'}, ip), null);
  assert.equal(runtimePolicy({...ipItem, id: 'CVE-2026-99999'}, ip), null);
  assert.equal(runtimePolicy(ipItem, {...ip, imageId: 'sha256:' + 'b'.repeat(64)}), null);
  assert.equal(runtimePolicy(ipItem, {...ip, passed: false}), null);
  assert.equal(runtimePolicy(rssItem, null), null);
});
