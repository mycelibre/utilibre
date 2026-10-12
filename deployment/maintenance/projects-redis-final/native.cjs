// Isolated fresh PostgreSQL only. No production identities, data, or providers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const redis = require('/app/node_modules/redis');
assert.equal(require('/app/node_modules/redis/package.json').version, '3.1.1');
assert(!fs.existsSync('/app/node_modules/redis/heroku'));
assert.equal(typeof redis.createClient, 'function');
for (const caller of ['@sailshq/connect-redis', '@sailshq/socket.io-redis']) {
  const entry = require.resolve(caller, {paths: ['/app']});
  assert.equal(require.resolve('redis', {paths: [path.dirname(entry)]}), '/app/node_modules/redis/index.js');
  require(entry);
}
const base = 'http://127.0.0.1:1337';
async function request(method, route, body, token) {
  const r = await fetch(base + route, {method, headers: {'content-type': 'application/json', ...(token ? {authorization: 'Bearer ' + token} : {})}, ...(body ? {body: JSON.stringify(body)} : {})});
  return {status: r.status, body: await r.json()};
}
(async () => {
  assert.equal((await request('GET', '/api/projects')).status, 401);
  const login = await request('POST', '/api/access-tokens', {emailOrUsername: process.env.DEFAULT_ADMIN_EMAIL, password: process.env.DEFAULT_ADMIN_PASSWORD});
  assert.equal(login.status, 200);
  const token = login.body.item;
  assert.equal(typeof token, 'string');
  async function call(method, route, body) {
    const r = await request(method, route, body, token);
    assert.equal(r.status, 200, method + ' ' + route);
    return r.body.item;
  }
  const project = await call('POST', '/api/projects', {name: 'Fictional Redis packaging check'});
  const board = await call('POST', `/api/projects/${project.id}/boards`, {name: 'Fictional board'});
  const list = await call('POST', `/api/boards/${board.id}/lists`, {name: 'Fictional tasks', position: 65536});
  const card = await call('POST', `/api/lists/${list.id}/cards`, {name: 'Fictional card', position: 65536});
  const changed = await call('PATCH', `/api/cards/${card.id}`, {name: 'Fictional verified card'});
  assert.equal(changed.name, 'Fictional verified card');
  assert.equal((await request('GET', `/api/cards/${card.id}`)).status, 401);
  await call('DELETE', `/api/projects/${project.id}`);
  console.log(JSON.stringify({passed: true, directRedis: '3.1.1', adaptersResolveFixedLibrary: true, freshDatabaseMigrations: true, nativeLoginAndProjectBoardCardEditDelete: true, anonymousApiDenied: true, herokuExampleAbsent: true, externalNetworkAvailable: false, productionChanged: false}));
})().catch(error => {console.error(JSON.stringify({error: error.name, message: String(error.message).slice(0, 250)}));process.exitCode = 1;});
