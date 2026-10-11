// Run on stdin inside each exact candidate, with --network none.
const assert = require('node:assert/strict');
const proxy = require('proxy-addr');
assert.equal(require('proxy-addr/package.json').version, '2.0.8');
for (const subnet of ['::ffff:10.0.0.0/8', '::/1']) {
  assert.equal(proxy.compile([subnet])('203.0.113.9', 0), false);
}
for (const subnet of ['10.0.0.0/8', '::ffff:10.0.0.0/104']) {
  const trust = proxy.compile([subnet]);
  assert.equal(trust('10.1.2.3', 0), true);
  assert.equal(trust('203.0.113.9', 0), false);
}
const request = {socket: {remoteAddress: '203.0.113.9'}, headers: {'x-forwarded-for': '10.1.2.3'}};
assert.equal(proxy(request, proxy.compile(['::ffff:10.0.0.0/8'])), '203.0.113.9');
request.socket.remoteAddress = '10.1.2.3';
request.headers['x-forwarded-for'] = '203.0.113.9';
assert.equal(proxy(request, proxy.compile(['10.0.0.0/8'])), '203.0.113.9');
// Exercise the actual installed Express resolver, not a separately fetched copy.
const app = require('express')();
app.set('trust proxy', ['127.0.0.0/8']);
app.get('/', (req, res) => res.json({ip: req.ip}));
const server = app.listen(0, '127.0.0.1', async () => {
  try {
    const r = await fetch('http://127.0.0.1:' + server.address().port, {headers: {'X-Forwarded-For': '203.0.113.9'}});
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), {ip: '203.0.113.9'});
    console.log('IPv4/mapped IPv6 spoof regression and native Express forwarding passed.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
  finally { server.close(); }
});
