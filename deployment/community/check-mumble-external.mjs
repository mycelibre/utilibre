// Run from a genuinely external network. No server passwords or other secrets.
// UDP ping replies are intentionally disabled: sending a datagram is NOT proof
// of delivery. Match the nonce in a narrowly filtered capture on the app VM.
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createSocket } from 'node:dgram';
import { connect } from 'node:tls';

const host = 'mumble.utilibre.org';
const port = 64738;
const fingerprint = '83:FA:6A:F8:C6:79:77:E0:FE:4E:DA:3B:1F:6C:83:D6:E5:B2:49:60:CA:96:9E:DD:87:FD:86:E1:4C:38:EB:01';
function frame(type, body) {
  const header = Buffer.alloc(6);
  header.writeUInt16BE(type); header.writeUInt32BE(body.length, 2);
  return Buffer.concat([header, body]);
}
function field(number, value) {
  const bytes = Buffer.from(value);
  assert.ok(bytes.length < 128);
  return Buffer.concat([Buffer.from([number * 8 + 2, bytes.length]), bytes]);
}

await new Promise((resolve, reject) => {
  const socket = connect({host, port, servername: host, rejectUnauthorized: false});
  const timer = setTimeout(() => finish(Error('External Mumble TLS/authentication timed out')), 15000);
  let pending = Buffer.alloc(0), done = false;
  function finish(error) {
    if (done) return;
    done = true; clearTimeout(timer); socket.destroy();
    error ? reject(error) : resolve();
  }
  socket.once('error', finish);
  socket.once('close', () => { if (!done) finish(Error('Mumble closed before rejecting the test credentials')); });
  socket.once('secureConnect', () => {
    if (socket.getPeerCertificate().fingerprint256 !== fingerprint) {
      finish(Error('Mumble certificate fingerprint mismatch')); return;
    }
    console.log('Public TCP/TLS reached the pinned Utilibre Mumble server.');
    socket.write(frame(2, Buffer.concat([
      field(1, 'Utilibre-external-check'),
      field(2, `invalid-${randomBytes(24).toString('hex')}`),
      Buffer.from([40, 1]),
    ])));
  });
  socket.on('data', chunk => {
    pending = Buffer.concat([pending, chunk]);
    if (pending.length > 1024 * 1024) { finish(Error('Oversized Mumble response')); return; }
    while (pending.length >= 6) {
      const type = pending.readUInt16BE(), length = pending.readUInt32BE(2);
      if (length > 1024 * 1024) { finish(Error('Oversized Mumble frame')); return; }
      if (pending.length < length + 6) return;
      pending = pending.subarray(length + 6);
      if (type === 5) { finish(Error('Invalid credentials were accepted')); return; }
      if (type === 4) { console.log('Public server rejects invalid credentials.'); finish(); return; }
    }
  });
});

const nonce = Buffer.concat([Buffer.from('Util'), randomBytes(4)]);
const ping = Buffer.concat([Buffer.alloc(4), nonce]);
const udp = createSocket('udp4');
try {
  await new Promise((resolve, reject) => {
    udp.once('error', reject);
    udp.connect(port, host, resolve);
  });
  console.log(`UDP diagnostic nonce: ${nonce.toString('hex')}`);
  console.log(`UDP destination: ${udp.remoteAddress().address}:${port}`);
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((resolve, reject) => udp.send(ping, error => error ? reject(error) : resolve()));
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('Sent 3 small UDP probes. Confirm arrival on the VM; no UDP reachability/audio claim is made by this script.');
} finally { udp.close(); }
