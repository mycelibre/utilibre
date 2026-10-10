// Change only native public description/footer. Never run the full bootstrap
// for copy changes, or alter monitors, notifications, retention or analytics.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { statusPageDescription, statusPageFooter } from './status-page-copy.mjs';

const credentials = JSON.parse(readFileSync(new URL('../../secrets/uptime-kuma-admin.json', import.meta.url), 'utf8'));
const backup = `/opt/utilibre/reports/new-services-20261009/kuma-copy-${Date.now()}`;
mkdirSync(backup, { recursive: true, mode: 0o700 });

function native(action) {
  const program = `
const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const socket=io('http://127.0.0.1:3001',{transports:['websocket']});
let stage='connect';
const call=(name,...args)=>{stage=name;return new Promise((resolve,reject)=>socket.timeout(15000).emit(name,...args,(err,r)=>err?reject(Error(name+' timed out')):r?.ok===false?reject(Error(name+' failed')):resolve(r)))};
const state=async()=>({config:(await call('getStatusPage','utilibre')).config,groups:(await(await fetch('http://127.0.0.1:3001/api/status-page/utilibre')).json()).publicGroupList});
const timeout=setTimeout(()=>process.exit(1),45000);
socket.on('connect',async()=>{try{
await call('login',${JSON.stringify(credentials)});
${action}
clearTimeout(timeout);socket.disconnect();process.exit(0);
}catch{console.error('Scoped native status-copy operation failed at '+stage);socket.disconnect();process.exit(1)}});`;
  const result = spawnSync('docker', ['exec', '-i', 'utilibre-community-uptime-kuma-1', 'node', '-'], { input: program, encoding: 'utf8', timeout: 50000, maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr.trim() || 'Native copy operation failed; prior configuration is retained locally');
  return JSON.parse(result.stdout);
}

const before = native('console.log(JSON.stringify(await state()));');
assert(before.groups.length > 0, 'Existing public groups required');
assert.equal(before.config.analyticsType, null, 'Unexpected analytics configuration');
writeFileSync(`${backup}/before.json`, JSON.stringify(before, null, 2), { mode: 0o600 });
const config = { ...before.config, description: statusPageDescription, footerText: statusPageFooter };
const after = native(`
const before=${JSON.stringify(before)};
assert.deepEqual(await state(),before,'Status configuration changed during preparation');
await call('saveStatusPage','utilibre',${JSON.stringify(config)},before.config.icon||'',before.groups);
console.log(JSON.stringify(await state()));`);
assert.deepEqual(after.config, config, 'Only the two selected native copy fields may change');
assert.deepEqual(after.groups, before.groups, 'Public monitor membership/order changed');
writeFileSync(`${backup}/after.json`, JSON.stringify(after, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ result: 'passed', changed: ['description', 'footerText'], publicGroups: after.groups.length, backup }));
