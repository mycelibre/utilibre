// Native public HTTPS verification with the public1009 synthetic identities only.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';

const base = 'https://projects.utilibre.org';
const privateDir = '/opt/utilibre/projects/private/public-20261009';
const reportDir = '/opt/utilibre/reports/projects-public-20261009';
await mkdir(reportDir, { recursive: true, mode: 0o700 });
const users = JSON.parse(await readFile(privateDir + '/check-users.json', 'utf8'));
assert.deepEqual(users.map(u => u.username), ['a', 'b', 'denied'].map(s => 'utilibre-projects-check-' + s + '-public1009'));
const report = { checkedAt: new Date().toISOString(), transport: 'Real public HTTPS through Cloudflare and Caddy; no hostname override', checks: [], errors: [], externalHosts: [] };
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const sessions = [];
const fixtures = [];
function otp(key) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hmac = createHmac('sha1', Buffer.from(key, 'hex')).update(counter).digest();
  return String((hmac.readUInt32BE(hmac[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
async function call(session, method, path, body, options = {}) {
  const response = await session.context.request.fetch(base + path, {
    method, headers: { Authorization: 'Bearer ' + session.token }, ...options,
    ...(body === undefined ? {} : { data: body }),
  });
  assert(response.ok(), `${method} native endpoint returned ${response.status()}`);
  return (await response.json()).item;
}
try {
  for (const [index, user] of users.entries()) {
    const context = await browser.newContext({ locale: index === 1 ? 'es-ES' : 'en-US', viewport: { width: index === 1 ? 390 : 1280, height: 850 } });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('request', r => {
      if (!['http:', 'https:'].includes(new URL(r.url()).protocol)) return;
      const host = new URL(r.url()).hostname;
      if (!['projects.utilibre.org', 'auth.utilibre.org'].includes(host)) report.externalHosts.push(host);
    });
    await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
    await page.locator('input[name="uidField"]').fill(user.username);
    await page.getByRole('button', { name: /^(Log in|Iniciar sesión|Acceder)$/ }).click();
    await page.locator('ak-stage-password input[name="password"]:visible').fill(user.password);
    await page.getByRole('button', { name: /^(Continue|Continuar)$/ }).click();
    await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(user.totpKey));
    await page.getByRole('button', { name: /^(Continue|Continuar)$/ }).click();
    await page.waitForURL('**/if/user/**');
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    assert((await response.allHeaders())['x-robots-tag'].includes('noindex'));
    await page.getByRole('button', { name: /Continue with Utilibre|Continuá con Utilibre/ }).click();
    if (index === 2) {
      await page.getByText(/not have permission|Permission denied|not allowed|Access denied/i).first().waitFor();
      report.checks.push('Unapproved synthetic identity rejected by public native OIDC gate');
      await context.close();
      continue;
    }
    await page.waitForURL(base + '/', { timeout: 30000 });
    await page.waitForTimeout(1200);
    const cookies = await context.cookies(base);
    const token = cookies.find(c => c.name === 'accessToken')?.value;
    assert(token, 'Public native OIDC session absent');
    const session = { context, page, token };
    session.user = await call(session, 'GET', '/api/users/me');
    assert.equal(session.user.email, user.email);
    assert.equal(session.user.isAdmin, false);
    sessions.push(session);
    await writeFile(`${privateDir}/session-${index}.json`, JSON.stringify({ token, user: session.user }), { mode: 0o600 });
    await call(session, 'PATCH', '/api/users/' + session.user.id, { language: index === 1 ? 'es-ES' : 'en-US' });
    report.checks.push(`Public MFA/OIDC login and non-admin application session ${index + 1}`);
  }
  for (const [index, session] of sessions.entries()) {
    const project = await call(session, 'POST', '/api/projects', { name: `Fictional public verification ${index}` });
    const fixture = { project, index };
    fixtures.push(fixture);
    fixture.board = await call(session, 'POST', `/api/projects/${project.id}/boards`, { name: 'Fictional public board' });
    const todo = await call(session, 'POST', `/api/boards/${fixture.board.id}/lists`, { name: 'Fictional To do', position: 65536 });
    const done = await call(session, 'POST', `/api/boards/${fixture.board.id}/lists`, { name: 'Fictional Done', position: 131072 });
    fixture.card = await call(session, 'POST', `/api/lists/${todo.id}/cards`, { name: `Fictional public card ${index}`, description: 'Fictional public-edge verification only.', position: 65536 });
    const moved = await call(session, 'PATCH', `/api/cards/${fixture.card.id}`, { listId: done.id, position: 65536 });
    assert.equal(moved.listId, done.id);
    fixture.attachment = await call(session, 'POST', `/api/cards/${fixture.card.id}/attachments`, undefined, {
      multipart: { file: { name: 'fictional-public.txt', mimeType: 'text/plain', buffer: Buffer.from('Fictional public-edge attachment.\n') } },
    });
    fixture.download = `/attachments/${fixture.attachment.id}/download/fictional-public.txt`;
    const ownFile = await session.context.request.get(base + fixture.download, { headers: { Authorization: 'Bearer ' + session.token } });
    assert.equal(await ownFile.text(), 'Fictional public-edge attachment.\n');
    const other = sessions[1 - index];
    for (const path of [`/api/projects/${project.id}`, `/api/boards/${fixture.board.id}`, `/api/cards/${fixture.card.id}`, fixture.download]) {
      const denied = await other.context.request.get(base + path, { headers: { Authorization: 'Bearer ' + other.token } });
      assert.equal(denied.status(), 404);
    }
    const { page } = session;
    await page.goto(base + '/boards/' + fixture.board.id, { waitUntil: 'networkidle' });
    await page.getByText(fixture.card.name, { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `${reportDir}/board-${index}.png`, fullPage: true });
    const actions = page.locator('[class*="BoardActions_wrapper"]').getByRole('button').filter({ has: page.getByText('more_horiz', { exact: true }) });
    await actions.first().click();
    const pendingDownload = page.waitForEvent('download');
    await page.getByText(/Export as CSV|Exportar.*CSV/i).click();
    const download = await pendingDownload;
    const target = `${reportDir}/fictional-board-${index}.csv`;
    await download.saveAs(target);
    const csv = await readFile(target, 'utf8');
    assert(csv.includes(fixture.card.name) && csv.includes('Fictional Done'));
    assert(!csv.includes('Fictional public-edge attachment.'));
    report.checks.push(`Public native project/card/move/attachment, cross-account denial, CSV download and ${index ? 'ES390' : 'EN1280'} layout ${index + 1}`);
    await writeFile(privateDir + '/fixtures.json', JSON.stringify(fixtures), { mode: 0o600 });
  }
  const owner = sessions[0], member = sessions[1], fixture = fixtures[0];
  const membership = await call(owner, 'POST', `/api/boards/${fixture.board.id}/memberships`, { userId: member.user.id, role: 'viewer', canComment: false });
  const shared = await member.context.request.get(base + fixture.download, { headers: { Authorization: 'Bearer ' + member.token } });
  assert.equal(shared.status(), 200);
  const cannotEdit = await member.context.request.patch(base + '/api/cards/' + fixture.card.id, { headers: { Authorization: 'Bearer ' + member.token }, data: { name: 'Unauthorized fictional edit' } });
  assert([403, 404].includes(cannotEdit.status()));
  await call(owner, 'DELETE', '/api/board-memberships/' + membership.id);
  const revoked = await member.context.request.get(base + fixture.download, { headers: { Authorization: 'Bearer ' + member.token } });
  assert.equal(revoked.status(), 404);
  report.checks.push('Native viewer sharing grants file read, denies edit, and membership removal revokes file access');
  assert.deepEqual(report.errors, []);
  assert.deepEqual([...new Set(report.externalHosts)], []);
  report.passed = true;
} finally {
  for (const fixture of fixtures) {
    const session = sessions[fixture.index];
    if (fixture.attachment) await call(session, 'DELETE', '/api/attachments/' + fixture.attachment.id);
    await call(session, 'DELETE', '/api/projects/' + fixture.project.id);
    const response = await session.context.request.get(base + '/api/projects/' + fixture.project.id, { headers: { Authorization: 'Bearer ' + session.token } });
    assert.equal(response.status(), 404);
  }
  for (const session of sessions) {
    await call(session, 'DELETE', '/api/access-tokens/me');
    const denied = await session.context.request.get(base + '/api/projects', { headers: { Authorization: 'Bearer ' + session.token } });
    assert.equal(denied.status(), 401);
  }
  report.nativeFixtureCleanup = fixtures.length;
  report.nativeTokenRevocation = sessions.length;
  await browser.close();
  await writeFile(reportDir + '/public-check.json', JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify(report));
}
