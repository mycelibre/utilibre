// Executes inside an isolated exact-image container, never against live peers.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {once} from 'node:events';
const hash = b => createHash('sha256').update(b).digest('hex');
const mode = process.argv[2];
const timeout = setTimeout(() => {console.error('Bounded component test timed out'); process.exit(1);}, 20000);

if (mode === 'rsshub') {
  const rows = fs.readdirSync('/app/dist').filter(f => f.endsWith('.mjs')).sort().map(f => [f, hash(fs.readFileSync('/app/dist/' + f))]);
  const removed = rows.filter(([name]) => /^(frontend|gouhuo|heibaizhibo|tencent-lemon|netease-news-data)(?:-|\.)/.test(name));
  const huxiu = rows.filter(([name]) => name.startsWith('huxiu-'));
  const unsafe = huxiu.some(([name]) => /(?:\beval\s*\(|\bFunction\s*\(|__INITIAL_STATE__)/.test(fs.readFileSync('/app/dist/' + name, 'utf8')));
  const revision = execFileSync('git', ['-C', '/app', 'rev-parse', 'HEAD'], {encoding: 'utf8'}).trim();
  console.log(JSON.stringify({passed: true, revision, moduleCount: rows.length, moduleDigest: hash(JSON.stringify(rows)),
    removedModulesAbsent: removed.length === 0, huxiuModuleCount: huxiu.length, huxiuUnsafeEvaluationAbsent: !unsafe}));
  clearTimeout(timeout);
} else if (mode === 'tracker') {
  const require = createRequire('/app/package.json');
  const ip = require('ip');
  const rows = [], imports = [];
  function walk(dir) {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) walk(p);
      else if (/\.(?:[cm]?js|json)$/.test(p)) {
        const body = fs.readFileSync(p);
        rows.push([p, hash(body)]);
        if (/\.[cm]?js$/.test(p) && !p.startsWith('/app/node_modules/ip/') && /(?:from\s*["']ip["']|require\(["']ip["']\))/.test(body.toString())) imports.push(p);
      }
    }
  }
  walk('/app');
  rows.sort((a, b) => a[0].localeCompare(b[0]));
  assert.deepEqual(imports, ['/app/node_modules/bittorrent-tracker/lib/server/parse-udp.js']);
  const udp = fs.readFileSync(imports[0], 'utf8');
  const ipApis = [...udp.matchAll(/\bipLib\.(\w+)/g)].map(m => m[1]);
  assert.deepEqual(ipApis, ['toString']);
  let classifierCalls = 0;
  for (const key of ['isPublic', 'isPrivate', 'address']) ip[key] = () => {classifierCalls++; throw new Error('Unexpected vulnerable classifier use');};
  const {default: Server} = await import('/app/node_modules/bittorrent-tracker/server.js');
  const {default: WebSocket} = await import('/app/node_modules/ws/wrapper.mjs');
  const originalListen = Server.prototype.listen;
  let server;
  Server.prototype.listen = function (...args) {server = this; return originalListen.apply(this, args);};
  await import('/app/tracker.mjs');
  assert(server);
  if (!server.listening) await once(server, 'listening');
  assert.equal(server.udp4, null);
  assert.equal(server.udp6, null);
  const options = {origin: 'https://chat.utilibre.org'};
  const a = new WebSocket('ws://127.0.0.1:8000', options), b = new WebSocket('ws://127.0.0.1:8000', options);
  try {
    await Promise.all([once(a, 'open'), once(b, 'open')]);
    const announce = peer => ({action: 'announce', info_hash: 'f'.repeat(20), peer_id: peer.repeat(20), left: 1, event: 'started', offers: []});
    const responseA = once(a, 'message');
    a.send(JSON.stringify(announce('a')));
    assert.equal(JSON.parse((await responseA)[0]).action, 'announce');
    const offer = once(a, 'message'), responseB = once(b, 'message');
    b.send(JSON.stringify({...announce('b'), offers: [{offer: {type: 'offer', sdp: 'fictional-local-test'}, offer_id: 'o'.repeat(20)}]}));
    assert.equal(JSON.parse((await responseB)[0]).action, 'announce');
    const delivered = JSON.parse((await offer)[0]);
    assert.equal(delivered.offer.sdp, 'fictional-local-test');
    assert.equal(delivered.peer_id, 'b'.repeat(20));
    assert.equal(classifierCalls, 0);
    console.log(JSON.stringify({passed: true, fileCount: rows.length, treeDigest: hash(JSON.stringify(rows)),
      ipVersion: require('ip/package.json').version, onlyIpImport: imports[0], ipApis, udpDisabled: true,
      classifierCalls, websocketAnnouncements: 2, offerRoundtrip: true, network: 'none; loopback synthetic peers only'}));
  } finally {
    a.terminate(); b.terminate();
    await new Promise(resolve => server.close(resolve));
    clearTimeout(timeout);
  }
  process.exit(0);
} else throw new Error('Unsupported component test');
