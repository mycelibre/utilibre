// Native public-browser export check. Creates and deletes ONLY its own disposable account.
// No phone, push command, mail, real location, or external map-provider request is used.
// Node 24 invocation: node --js-base-64 deployment/community/check-fmd-export.mjs
import assert from 'node:assert/strict';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

process.umask(0o077);
assert.equal(typeof Uint8Array.prototype.toHex, 'function', 'Enable native Uint8Array hex support with --js-base-64 on Node 24');
const source = '/opt/utilibre/community-src/fmd-server-utilibre-p1';
const revision = '224b60c0756ff363bc19063082a8a1543559cf96';
const origin = 'https://fmd.utilibre.org';
const report = mkdtempSync('/opt/utilibre/reports/fmd-native-export-' + new Date().toISOString().slice(0, 10).replaceAll('-', '') + '-');
const temporary = report + '/native-crypto';
mkdirSync(temporary);
const nativeHashes = {};
for (const name of ['crypto.ts', 'cryptov2.ts']) {
  const relative = 'web/src/lib/' + name;
  const original = readFileSync(source + '/' + relative);
  assert.deepEqual(original, execFileSync('git', ['show', revision + ':' + relative], { cwd: source }));
  nativeHashes[name] = createHash('sha256').update(original).digest('hex');
  const adapted = original.toString().replace("'./crypto'", "'./crypto.ts'")
    .replace("'./cryptov2'", "'./cryptov2.ts'")
    .replace("'@noble/hashes/argon2.js'", JSON.stringify(pathToFileURL(source + '/web/node_modules/@noble/hashes/argon2.js').href));
  writeFileSync(temporary + '/' + name, adapted);
}
const { hashPasswordForLogin, base64Encode } = await import(pathToFileURL(temporary + '/crypto.ts').href);
const { deriveAuthKeyAndPreMasterKey, decryptMasterKey, deriveKeks, encryptDataV2, hash } = await import(pathToFileURL(temporary + '/cryptov2.ts').href);
const JSZip = createRequire(source + '/web/package.json')('jszip');
const config = readFileSync('/opt/utilibre/community-data/fmd-private/config.yml', 'utf8');
const registrationToken = JSON.parse(config.match(/^RegistrationToken:\s*("[^"]+")$/m)?.[1] || 'null');
assert.ok(registrationToken, 'Private invitation configuration must be present');
const username = 'utilibrezip' + randomBytes(8).toString('hex');
const password = randomBytes(32).toString('base64url');
const encoder = new TextEncoder();
const salt64 = randomBytes(16).toString('base64');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
// Obvious synthetic tile: a transparent one-pixel PNG cannot prove visible map rendering.
const mapTile = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#d4e9f5"/><path d="M0 80H256M90 0V256" stroke="#385777" stroke-width="12"/><rect x="120" y="115" width="100" height="65" fill="#75a87b"/><text x="12" y="230" font-family="sans-serif" font-size="18" fill="#15293d">FICTIONAL TEST TILE</text></svg>');
const locations = [
  { lat: 0, lon: 0, bat: 75, date: 1791504000000, time: '2026-10-09T00:00:00.000Z', provider: 'fictional-export-fixture', accuracy: 5, altitude: 12, speed: 2, bearing: 90 },
  { lat: 0, lon: 0, bat: 0, date: 1791504060000, time: '2026-10-09T00:01:00.000Z', provider: 'fictional-zero-fixture', accuracy: 0, altitude: 0, speed: 0, bearing: 0 },
  { lat: 0, lon: 0, bat: 50, date: 1791504120000, time: '2026-10-09T00:02:00.000Z', provider: 'fictional-absent-fixture' },
];
let token, browser, deleted = false, fixtureTiles = 0;
const externalHosts = new Set(), pageErrors = [], responseStatuses = [], milestones = [];
const tilePolicyErrors = [];
const result = { checkedAt: new Date().toISOString(), origin, revision, nativeHashes,
  scope: 'Native API-created encrypted fictional records; normal public browser login, decryption, ZIP download and local ZIP reopening. No Android, push, or account import test.',
  tileBoundary: 'Only OpenStreetMap tile requests are fulfilled with a local, visibly fictional SVG tile; no real map provider requests are part of this test.' };
async function request(path, method = 'GET', body, useToken = token) {
  return fetch(origin + '/api/v2' + path, { method, signal: AbortSignal.timeout(20000),
    headers: { 'Content-Type': 'application/json', ...(useToken ? { Authorization: `Bearer ${useToken}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body) });
}
async function getOwnCount(type) {
  const response = await request('/data/' + type);
  assert.equal(response.status, 200);
  return ((await response.json()).items || []).length;
}
try {
  const publicPage = await fetch(origin, { signal: AbortSignal.timeout(20000) });
  assert.equal(publicPage.status, 200);
  assert.match(publicPage.headers.get('referrer-policy') || '', /no-referrer\s*$/);
  assert.match(publicPage.headers.get('content-security-policy') || '', /img-src[^;]*https:\/\/tile\.openstreetmap\.org(?:;|\s)/);
  assert.equal(await (await request('/tileServerUrl', 'GET', undefined, null)).text(), 'https://tile.openstreetmap.org/{z}/{x}/{y}.png');
  const passwordKey = await hashPasswordForLogin(2, username, password, salt64);
  const [authKey, preMasterKey] = await deriveAuthKeyAndPreMasterKey(username, passwordKey.buffer);
  // The native web client decrypts this standard v2 wrapper; Android normally creates it.
  const masterBytes = randomBytes(32), iv = randomBytes(12);
  const additionalData = new Uint8Array([...encoder.encode('fmd_v2_master'), ...await hash(encoder.encode(username))]);
  const wrapped = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData }, preMasterKey, masterBytes);
  const encMasterKey64 = Buffer.concat([iv, Buffer.from(wrapped)]).toString('base64');
  const [masterKey] = await decryptMasterKey(username, preMasterKey, encMasterKey64);
  const [, locationKek, pictureKek] = await deriveKeks(username, masterKey);
  const response = await request('/account/register', 'POST', {
    username, salt64, passwordHash64: base64Encode(authKey), encMasterKey64, protoVersion: 2, registrationToken,
  }, null);
  assert.equal(response.status, 200, 'Disposable native registration');
  token = (await response.json()).accessToken;
  assert.ok(token);
  // Recovery handle for this exact fixture only, removed once native cleanup is verified.
  writeFileSync(report + '/fixture-recovery.private.json', JSON.stringify({ username, token }));
  for (const [type, kek, records] of [
    ['location', locationKek, locations],
    ['picture', pictureKek, [{ raw64: png.toString('base64'), mimeType: 'image/png' }]],
  ]) {
    const items = [];
    for (const record of records) {
      const [clientItemIdHex, unixMillis, ciphertext64] = await encryptDataV2(username, kek, type, encoder.encode(JSON.stringify(record)));
      items.push({ clientItemIdHex, unixMillis, ciphertext64 });
    }
    assert.equal((await request('/data/' + type, 'POST', { items })).status, 200);
  }
  assert.equal(await getOwnCount('location'), 3);
  assert.equal(await getOwnCount('picture'), 1);
  assert.equal((await (await request('/account/push_url')).json()).url, '');
  milestones.push('Encrypted fictional native API records created; no push endpoint set');
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await context.route(/^https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\//, async route => {
    fixtureTiles += 1;
    const request = route.request();
    const headers = await request.allHeaders();
    if (new URL(request.url()).hostname !== 'tile.openstreetmap.org') tilePolicyErrors.push('Noncanonical tile host');
    if (headers.referer !== origin + '/') tilePolicyErrors.push('Tile Referer was not exactly the public HTTPS origin');
    await route.fulfill({ status: 200, contentType: 'image/svg+xml', body: mapTile });
  });
  context.on('request', req => {
    const url = new URL(req.url());
    if (url.protocol === 'https:' && url.origin !== origin && !/^(?:[abc]\.)?tile\.openstreetmap\.org$/.test(url.hostname)) externalHosts.add(url.hostname);
    assert.ok(!url.pathname.endsWith('/data/command'), 'No command or push may be submitted');
  });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.name));
  page.on('response', res => { if (res.url().startsWith(origin) && res.status() >= 400) responseStatuses.push(res.status()); });
  await page.goto(origin, { waitUntil: 'networkidle', timeout: 45000 });
  await page.locator('input[autocomplete="username"]').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.locator('#rememberMe').check();
  const login = page.waitForResponse(res => res.url().endsWith('/api/v2/account/login') && res.request().method() === 'POST', { timeout: 120000 });
  await page.locator('button[type="submit"]').click();
  assert.equal((await login).status(), 200);
  await page.getByTitle('Settings', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('img.leaflet-tile')).some(img => img.complete && img.naturalWidth > 0));
  assert.ok(fixtureTiles > 0, 'The actual map must request tiles');
  assert.deepEqual(tilePolicyErrors, []);
  assert.ok((await page.locator('.leaflet-control-attribution').innerText()).includes('OpenStreetMap contributors'));
  assert.ok(await page.locator('img.leaflet-tile').evaluateAll(images => images.every(img => img.referrerPolicy === 'strict-origin')));
  await page.screenshot({ path: report + '/native-map-desktop.png', fullPage: true });
  result.mapPolicy = { canonicalTileHost: true, originOnlyReferer: true, pageWideNoReferrerPreserved: true, visibleAttribution: true, syntheticTilesOnly: true };
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByTitle('Settings', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForFunction(() => Array.from(document.querySelectorAll('img.leaflet-tile')).some(img => img.complete && img.naturalWidth === 256 && getComputedStyle(img).visibility === 'visible' && Number(getComputedStyle(img).opacity) > 0));
  result.mapPolicy.savedSessionReload = true;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const map = document.querySelector('.leaflet-container');
    const bounds = map?.getBoundingClientRect();
    return bounds?.width > 200 && bounds?.height > 200 && Array.from(map.querySelectorAll('img.leaflet-tile')).some(img => img.complete && img.naturalWidth === 256 && getComputedStyle(img).visibility === 'visible');
  });
  await page.screenshot({ path: report + '/native-map-mobile.png', fullPage: true });
  result.mapPolicy.mobileViewport = '390x844, simulated Chromium; not a physical phone';
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByTitle('Settings', { exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByRole('button', { name: 'Export data', exact: true }).waitFor();
  await page.screenshot({ path: report + '/native-settings-desktop.png', fullPage: true });
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await settings.getByRole('button', { name: 'Export data', exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /^fmd-export-\d{4}-\d{2}-\d{2}\.zip$/);
  await download.saveAs(report + '/fictional-export.zip');
  const zipBytes = readFileSync(report + '/fictional-export.zip');
  const zip = await JSZip.loadAsync(zipBytes, { checkCRC32: true });
  assert.deepEqual(Object.keys(zip.files).sort(), ['info.json', 'locations.csv', 'pictures/', 'pictures/0.png']);
  const info = JSON.parse(await zip.file('info.json').async('string'));
  assert.deepEqual(info, { fmdId: username, pushUrl: '' });
  const csv = await zip.file('locations.csv').async('string');
  const rows = csv.trimEnd().split('\n');
  assert.equal(rows[0], 'Date,Provider,Battery,Latitude,Longitude,Accuracy,Altitude,Speed,Bearing');
  assert.equal(rows.length, 4);
  assert.ok(rows.includes('2026-10-09T00:00:00.000Z,fictional-export-fixture,75,0,0,5,12,2,90'));
  assert.ok(rows.includes('2026-10-09T00:01:00.000Z,fictional-zero-fixture,0,0,0,0,0,0,0'), 'Zero optional accuracy/altitude/speed/bearing values must survive export');
  assert.ok(rows.includes('2026-10-09T00:02:00.000Z,fictional-absent-fixture,50,0,0,,,,'), 'Absent optional accuracy/altitude/speed/bearing values must stay blank');
  assert.deepEqual(await zip.file('pictures/0.png').async('nodebuffer'), png);
  result.zip = { entries: Object.keys(zip.files).sort(), locationRows: 3, pictures: 1, accountIdMatched: true, pushUrlEmpty: true,
    pngBytesMatched: true, crcPassed: true, sha256: createHash('sha256').update(zipBytes).digest('hex'), bytes: zipBytes.length,
    optionalNumericFields: 'Nonzero and zero accuracy, altitude, speed and bearing are retained; absent values remain blank.' };
  milestones.push('Native public browser password login, decryption, ZIP download, CRC and exact fixture contents passed');
  await page.getByRole('dialog', { name: 'Loading', exact: true }).waitFor({ state: 'hidden' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: report + '/native-settings-mobile.png', fullPage: true });
  for (const [button, title, path, type] of [
    ['Delete locations', 'Delete all locations?', '/data/location/all', 'location'],
    ['Delete photos', 'Delete all photos?', '/data/picture/all', 'picture'],
  ]) {
    await settings.getByRole('button', { name: button, exact: true }).click();
    const deletion = page.waitForResponse(res => res.url().endsWith('/api/v2' + path) && res.request().method() === 'DELETE');
    await page.getByRole('dialog', { name: title, exact: true }).getByRole('button', { name: button, exact: true }).click();
    assert.equal((await deletion).status(), 200);
    assert.equal(await getOwnCount(type), 0);
  }
  await settings.getByRole('button', { name: 'Delete account', exact: true }).click();
  const accountDeletion = page.waitForResponse(res => res.url().endsWith('/api/v2/account') && res.request().method() === 'DELETE');
  await page.getByRole('dialog', { name: 'Delete account?', exact: true }).getByRole('button', { name: 'Delete account', exact: true }).click();
  assert.equal((await accountDeletion).status(), 200);
  assert.equal((await request('/account/' + username + '/salt', 'GET', undefined, null)).status, 404);
  assert.ok([400, 401, 403].includes((await request('/data/location')).status));
  deleted = true;
  milestones.push('Native browser location, picture and account deletion passed; former token denied and own salt endpoint absent');
  assert.deepEqual([...externalHosts], []);
  assert.deepEqual(pageErrors, []);
  result.passed = true;
} finally {
  if (browser) await browser.close();
  if (token && !deleted) {
    const absent = await request('/account/' + username + '/salt', 'GET', undefined, null);
    if (absent.status !== 404) assert.equal((await request('/account', 'DELETE')).status, 200, 'Exact disposable account cleanup');
    assert.equal((await request('/account/' + username + '/salt', 'GET', undefined, null)).status, 404);
    deleted = true;
  }
  if (deleted) rmSync(report + '/fixture-recovery.private.json', { force: true });
  rmSync(temporary, { recursive: true, force: true });
  Object.assign(result, { finishedAt: new Date().toISOString(), fixtureAccountDeleted: deleted, fixtureTiles,
    unexpectedExternalHosts: [...externalHosts], pageErrors, publicErrorStatuses: responseStatuses, milestones });
  writeFileSync(report + '/result.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.passed === true, fixtureAccountDeleted: deleted, report }));
}
