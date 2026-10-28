// Preserve the upstream healthcheck's loopback HTTP/HTTPS contract.
const assert = require('node:assert/strict');
const http = require('node:http'), https = require('node:https');
const fs = require('node:fs'), cp = require('node:child_process');
const binary = '/app/extra/healthcheck';
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => server.close(resolve));
async function check(port, ssl = false, fallback = false) {
  const env = {...process.env};
  for (const k of ['UPTIME_KUMA_HOST', 'HOST', 'UPTIME_KUMA_PORT', 'PORT', 'UPTIME_KUMA_SSL_KEY', 'UPTIME_KUMA_SSL_CERT', 'SSL_KEY', 'SSL_CERT']) delete env[k];
  env[fallback ? 'PORT' : 'UPTIME_KUMA_PORT'] = String(port);
  if (ssl) { env.SSL_KEY = 'synthetic'; env.SSL_CERT = 'synthetic'; }
  return new Promise((resolve, reject) => {
    const child = cp.spawn(binary, [], {env, stdio: ['ignore', 'pipe', 'pipe'], timeout: 5000});
    let output = ''; child.stdout.on('data', b => { output += b; }); child.stderr.on('data', b => { output += b; });
    child.on('error', reject); child.on('exit', (code, signal) => resolve({code, signal, output}));
  });
}
(async () => {
  let checks = 0;
  for (const status of [200, 404]) {
    const server = http.createServer((request, response) => { response.writeHead(status); response.write('Fictional '); response.end('health response'); });
    await listen(server);
    try { const r = await check(server.address().port, false, status === 404); assert.equal(r.code, 0); assert(r.output.includes('Res Code: ' + status)); checks++; }
    finally { await close(server); }
  }
  const target = http.createServer((_request, response) => response.end('Fictional redirect destination'));
  await listen(target);
  const redirect = http.createServer((_request, response) => { response.writeHead(302, {Location: 'http://127.0.0.1:' + target.address().port + '/'}); response.end(); });
  await listen(redirect);
  try { assert.equal((await check(redirect.address().port)).code, 0); checks++; }
  finally { await close(redirect); await close(target); }
  const tls = https.createServer({key: fs.readFileSync('/fixture-key.pem'), cert: fs.readFileSync('/fixture-cert.pem')}, (_request, response) => response.end('Fictional TLS'));
  await listen(tls);
  try { assert.equal((await check(tls.address().port, true)).code, 0); checks++; }
  finally { const port = tls.address().port; await close(tls); const r = await check(port); assert.equal(r.signal, null); assert.notEqual(r.code, 0); checks++; }
  console.log(JSON.stringify({passed: true, checks, loopbackOnly: true, tls: 'Upstream accepts self-signed local TLS; no certificate-validation guarantee', statusPolicy: 'Upstream treats completed HTTP 404 as connectivity success; behavior preserved'}));
})().catch(e => { console.error(e); process.exitCode = 1; });
