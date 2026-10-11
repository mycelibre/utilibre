// Fixed loopback listener, synthetic two-browser transfer, no production data.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync, readFileSync, statfsSync} from 'node:fs';
process.umask(0o077);
const directory = '/var/lib/utilibre-maintenance/pairdrop-ws-20261011';
mkdirSync(directory, {recursive: true, mode: 0o700});
const space = statfsSync(directory);
assert(space.bavail * space.bsize >= 8 * 1024 ** 3, 'Preserve 8 GiB recovery floor');
const image = 'utilibre-pairdrop:1.11.2-security-20261011-p4';
const previous = 'utilibre-pairdrop:1.11.2-security-20261011-p2';
const previousId = 'sha256:eff40a7085ab7d5dce2f3c3a48b477e8f4c50afca7454e891b1f870025e20f92';
const upstream = 'ghcr.io/schlagmichdoch/pairdrop:v1.11.2@sha256:c4b30977264a76e335740089e693a52a0d0d616330dec7f93c7b96beef7b4a02';
const stage = 'maintenance-pairdrop-ws-stage';
function docker(args, input) {
  try { return execFileSync('docker', args, {input, encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 ** 2, stdio: ['pipe', 'pipe', 'pipe']}); }
  catch { throw Error('Isolated PairDrop command failed; no command/config output retained.'); }
}
const bounded = ['--network', 'none', '--read-only', '--cap-drop', 'ALL', '--cpus', '.5', '--memory', '128m', '--pids-limit', '64', '--log-driver', 'none'];
const inspect = ref => JSON.parse(docker(['image', 'inspect', ref]))[0];
assert.equal(inspect(previous).Id, previousId, 'Previous release changed');
const candidate = inspect(image);
for (const key of ['User', 'Env', 'Cmd', 'Entrypoint', 'WorkingDir', 'ExposedPorts', 'Healthcheck']) assert.deepEqual(candidate.Config[key], inspect(previous).Config[key]);
const hash = (ref, excludeGuard = false) => docker(['run', '--rm', ...bounded, '--entrypoint', 'sh', ref, '-c',
  'find server public -type f ' + (excludeGuard ? '! -path public/scripts/browser-tabs-connector.js ' : '') + '-print0 | sort -z | xargs -0 sha256sum | sha256sum']).trim();
assert.equal(hash(previous), hash(image), 'Previously reviewed application bytes changed');
assert.equal(hash(upstream, true), hash(image, true), 'Unreviewed upstream application changes');
const os = ref => docker(['run', '--rm', ...bounded, '--entrypoint', 'sh', ref, '-c', 'apk info -vv | sort']);
assert.equal(os(previous), os(image), 'Unreviewed operating-system dependency changes');
const lock = ref => JSON.parse(docker(['run', '--rm', ...bounded, '--entrypoint', 'node', ref, '-e', 'console.log(JSON.stringify(require("./package-lock.json")))']));
const originalLock = lock(upstream), previousLock = lock(previous), candidateLock = lock(image);
const reviewedLock = JSON.parse(readFileSync('deployment/community/pairdrop-security/package-lock.json', 'utf8'));
assert.deepEqual(candidateLock, reviewedLock, 'Installed dependency graph differs from source-pinned lock');
assert.equal(candidateLock.packages['node_modules/proxy-addr'].version, '2.0.8');
assert.equal(candidateLock.packages['node_modules/ws'].version, '8.21.0');
assert.equal(previousLock.packages['node_modules/ws'].version, '8.18.1');
const dependencyDelta = {
  'body-parser': ['1.20.3', '1.20.8'],
  'body-parser/node_modules/http-errors': [null, '2.0.1'],
  'body-parser/node_modules/statuses': [null, '2.0.2'],
  'call-bound': ['1.0.3', '1.0.4'], 'es-object-atoms': ['1.1.1', '1.1.2'],
  'express': ['4.21.2', '4.22.3'], 'hasown': ['2.0.2', '2.0.4'],
  'path-to-regexp': ['0.1.12', '0.1.13'], 'qs': ['6.13.0', '6.16.0'],
  'raw-body': ['2.5.2', '2.5.3'],
  'raw-body/node_modules/http-errors': [null, '2.0.1'],
  'raw-body/node_modules/statuses': [null, '2.0.2'],
  'side-channel': ['1.1.0', '1.1.1'], 'side-channel-list': ['1.0.0', '1.0.1'],
  'ws': ['8.18.1', '8.21.0'],
};
const observedDelta = {};
for (const name of new Set([...Object.keys(previousLock.packages), ...Object.keys(candidateLock.packages)])) {
  if (!name) continue;
  const before = previousLock.packages[name], after = candidateLock.packages[name];
  if (before?.version !== after?.version) observedDelta[name.replace(/^node_modules\//, '')] = [before?.version ?? null, after?.version ?? null];
  else for (const property of ['resolved', 'integrity', 'dependencies', 'optionalDependencies', 'peerDependencies', 'engines']) {
    assert.deepEqual(after?.[property], before?.[property], 'Only package metadata may change for unchanged ' + name);
  }
}
assert.deepEqual(observedDelta, dependencyDelta, 'Unexpected native Express 4.x dependency changes');
const rootDependencies = structuredClone(candidateLock.packages[''].dependencies);
rootDependencies.express = originalLock.packages[''].dependencies.express;
rootDependencies.ws = originalLock.packages[''].dependencies.ws;
assert.deepEqual(rootDependencies, originalLock.packages[''].dependencies, 'Unreviewed direct dependency changes');
// Also verify installed package versions, rather than trusting lock metadata.
docker(['run', '--rm', ...bounded, '--entrypoint', 'npm', image, 'ls', '--all', '--omit=dev']);
docker(['run', '--rm', ...bounded, '-v', '/home/ubuntu/freetools/deployment/community/pairdrop-storage-guard.cjs:/tmp/check.cjs:ro', '--entrypoint', 'node', image, '/tmp/check.cjs']);
const wsGate = `
const assert=require('node:assert/strict');
const {WebSocket,WebSocketServer}=require('ws');
assert.equal(require('ws/package.json').version,'8.21.0');
const timer=setTimeout(()=>{console.error('Fragment bound not enforced');process.exit(1)},4000);
const server=new WebSocketServer({host:'127.0.0.1',port:0,maxFragments:2,maxBufferedChunks:8});
let limitError=false;
server.on('connection',peer=>peer.on('error',error=>{assert.equal(error.code,'WS_ERR_TOO_MANY_BUFFERED_PARTS');assert.match(error.message,/Too many message fragments/);limitError=true;}));
server.on('listening',()=>{
 const client=new WebSocket('ws://127.0.0.1:'+server.address().port);
 client.on('error',()=>{});
 client.on('open',()=>{client.send('a',{fin:false});client.send('b',{fin:false});client.send('c',{fin:true});});
 client.on('close',code=>{assert.equal(code,1008);assert(limitError);server.close(()=>{clearTimeout(timer);console.log('Three-byte fragmentation bound passed');});});
});`;
docker(['run', '--rm', '-i', ...bounded, '--entrypoint', 'node', image], wsGate);
// Bounded native routing and parsing fixtures; this does not send hostile traffic
// to production. PairDrop itself has no URL-encoded body parser routes.
const parserGate = `
(async()=>{
 const assert=require('node:assert/strict'),express=require('express');
 assert.equal(require('express/package.json').version,'4.22.3');
 assert.equal(require('body-parser/package.json').version,'1.20.8');
 assert.equal(require('path-to-regexp/package.json').version,'0.1.13');
 const app=express();app.set('trust proxy',1);
 app.use(express.urlencoded({extended:true,limit:'1kb',parameterLimit:4}));
 app.get('/item/:id',(req,res)=>res.json({id:req.params.id,query:req.query,ip:req.ip}));
 app.post('/form',(req,res)=>res.json(req.body));
 app.use((err,req,res,next)=>res.status(err.status||500).json({error:true}));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 try{
  let response=await fetch(origin+'/item/hello%20world?label=uno&label=dos',{headers:{'X-Forwarded-For':'192.0.2.8'}});
  assert.deepEqual(await response.json(),{id:'hello world',query:{label:['uno','dos']},ip:'192.0.2.8'});
  assert.equal((await fetch(origin+'/item/%E0%A4%A')).status,400);
  assert.equal((await fetch(origin+'/missing')).status,404);
  const post=body=>fetch(origin+'/form',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body});
  response=await post('title=Fictional&tag[]=a&tag[]=b');assert.equal(response.status,200);assert.deepEqual(await response.json(),{title:'Fictional',tag:['a','b']});
  assert.equal((await post('a=1&b=2&c=3&d=4&e=5')).status,413);
  assert.equal((await post('a='+'x'.repeat(1025))).status,413);
  const qs=require('qs');assert.deepEqual(qs.parse('__proto__[polluted]=yes&label=ok'),{label:'ok'});assert.equal({}.polluted,undefined);
  console.log('Native Express routing, proxy address, malformed path, parser limits and prototype guard passed');
 }finally{await new Promise(resolve=>server.close(resolve));}
})().catch(()=>process.exit(1));`;
docker(['run', '--rm', '-i', ...bounded, '--entrypoint', 'node', image], parserGate);
let created = false;
const report = {date: new Date().toISOString(), image, imageId: candidate.Id, previous, previousId, deployed: false,
  applicationUnchangedFromP2: true, osInventoryUnchangedFromP2: true, dependencyDelta,
  upstreamTabGuard: true, threeByteFragmentBound: true, routingAndParserFixtures: true, rtc: 'No STUN or TURN for this same-machine direct fixture'};
try {
  docker(['run', '-d', '--name', stage, '--read-only', '--user', '1000:1000', '--cap-drop', 'ALL',
    '--security-opt', 'no-new-privileges:true', '--memory', '256m', '--memory-swap', '256m', '--cpus', '.5', '--pids-limit', '96',
    '--log-driver', 'none', '--tmpfs', '/tmp:size=32m,mode=1777', '-p', '127.0.0.1:33124:3000',
    '-e', 'PORT=3000', '-e', 'RATE_LIMIT=1', '-e', 'DEBUG_MODE=false', '-e', 'WS_FALLBACK=false',
    '-e', 'RTC_CONFIG=/config/rtc.json', '-v', '/home/ubuntu/freetools/deployment/maintenance/pairdrop-ws-rtc.json:/config/rtc.json:ro', image]);
  created = true;
  let ready = false;
  for (let n = 0; n < 30; n++) {
    try { const r = await fetch('http://127.0.0.1:33124/', {signal: AbortSignal.timeout(1500)}); await r.body?.cancel(); if (r.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  assert(ready, 'Synthetic stage readiness');
  const configResponse = await fetch('http://127.0.0.1:33124/config');
  assert.equal(configResponse.status, 200); assert.equal((await configResponse.json()).signalingServer, false);
  const headResponse = await fetch('http://127.0.0.1:33124/', {method: 'HEAD'});
  assert.equal(headResponse.status, 200); assert.match(headResponse.headers.get('content-type'), /text\/html/);
  const fallbackResponse = await fetch('http://127.0.0.1:33124/fixture-missing-path', {redirect: 'manual'});
  assert.equal(fallbackResponse.status, 301); assert.equal(fallbackResponse.headers.get('location'), '/');
  // Existing native two-browser flow checks discovery, accept, download and
  // exact bytes, peer connection stats, JS errors and no outside HTTP requests.
  execFileSync(process.execPath, ['deployment/community/check-pairdrop.mjs'], {stdio: 'inherit', timeout: 180000,
    env: {...process.env, PAIRDROP_CHECK_ORIGIN: 'http://127.0.0.1:33124'}});
  report.twoBrowserNativeTransfer = 'passed'; report.status = 'passed';
} finally {
  if (created) docker(['rm', '-f', stage]);
  report.completedAt = new Date().toISOString();
  report.status ||= 'failed';
  report.limits = 'Two Chromium profiles on one test machine; no physical-phone, different-network or public TURN verification. No production changes.';
  writeFileSync(directory + '/check.json', JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
}
console.log('PairDrop p4: pinned Express 4.x native graph and ws, preserved app/guard/OS, routing and transfer passed.');
