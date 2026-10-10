/** Verify native .penpot export/import on a disposable, blank 2.18.2 stack only. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const directory = path.resolve(process.argv[2] || '');
assert.match(directory, /^\/opt\/utilibre\/reports\/penpot-native-roundtrip-[a-z0-9_]+$/);
const metadata = JSON.parse(await readFile(path.join(directory, 'metadata.json'), 'utf8'));
assert.equal(metadata.report, directory);
assert.match(metadata.name, /^utilibre-penpot-roundtrip-[a-z0-9_]+$/);
assert(Number.isInteger(metadata.port) && metadata.port > 1024);
const origin = `http://127.0.0.1:${metadata.port}`;
for (const service of ['penpot-backend', 'penpot-frontend', 'penpot-db', 'penpot-valkey']) {
  const [container] = JSON.parse(execFileSync('docker', ['inspect', `${metadata.name}-${service}-1`]));
  assert.equal(container.Config.Labels['com.docker.compose.project'], metadata.name);
  assert.deepEqual(Object.keys(container.NetworkSettings.Networks), [`${metadata.name}_isolated`]);
  assert(container.Mounts.every(mount => !mount.Source?.startsWith('/opt/utilibre/expanded-data')));
}
const [network] = JSON.parse(execFileSync('docker', ['network', 'inspect', `${metadata.name}_isolated`]));
assert.equal(network.Internal, true);
const secret = async (name, data) => writeFile(path.join(directory, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2), { mode: 0o600 });
async function rpc(method, body = {}, cookie, multipart = false, expectedStatus = 200) {
  const response = await fetch(`${origin}/api/main/methods/${method}`, {
    method: 'POST', signal: AbortSignal.timeout(30000),
    headers: { accept: 'application/json', ...(cookie ? { cookie: `auth-token=${cookie}` } : {}), ...(multipart ? {} : { 'content-type': 'application/json' }) },
    body: multipart ? body : JSON.stringify(body),
  });
  const text = await response.text();
  assert.equal(response.status, expectedStatus, `${method} failed: ${text}`);
  return { text, cookie: response.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1] };
}
async function json(method, body, cookie, expectedStatus) {
  return JSON.parse((await rpc(method, body, cookie, false, expectedStatus)).text);
}
function sseResult(text) {
  const event = text.split(/\r?\n\r?\n/).find(block => block.includes('event: end'));
  assert.ok(event, text);
  return JSON.parse(event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n'));
}
const accounts = [];
for (let index = 0; index < 2; index++) {
  const credentials = await json('create-demo-profile', { skipOnboarding: true });
  const login = await rpc('login-with-password', credentials);
  assert.ok(login.cookie);
  accounts.push({ profile: JSON.parse(login.text), cookie: login.cookie });
}
await secret('checker-accounts.json', accounts);
const file = await json('create-file', { name: 'Utilibre fictional export', projectId: accounts[0].profile.defaultProjectId }, accounts[0].cookie);
const pageId = file.data.pages[0], zero = '00000000-0000-0000-0000-000000000000';
const shape = {
  ...file.data.pagesIndex[pageId].objects[zero], id: randomUUID(), type: 'rect', name: 'Fictional blue card',
  x: 120, y: 150, width: 240, height: 160,
  selrect: { x: 120, y: 150, width: 240, height: 160, x1: 120, y1: 150, x2: 360, y2: 310 },
  points: [{ x: 120, y: 150 }, { x: 360, y: 150 }, { x: 360, y: 310 }, { x: 120, y: 310 }],
  fills: [{ fillColor: '#2F80ED', fillOpacity: 1 }], proportion: 1.5,
};
delete shape.shapes;
await json('update-file', {
  id: file.id, sessionId: randomUUID(), revn: file.revn, vern: file.vern,
  changes: [{ type: 'add-obj', pageId, id: shape.id, parentId: zero, frameId: zero, componentsV2: true, obj: shape }],
}, accounts[0].cookie);
const exported = await rpc('export-binfile', { fileId: file.id, includeLibraries: false, embedAssets: true }, accounts[0].cookie);
await secret('checker-export.sse', exported.text);
const result = sseResult(exported.text), asset = typeof result === 'string' ? result : result['~#uri'];
assert.ok(asset.startsWith(`${origin}/assets/by-id/`));
const download = await fetch(asset, { signal: AbortSignal.timeout(30000), headers: { cookie: `auth-token=${accounts[0].cookie}` } });
assert.equal(download.status, 200);
const bytes = Buffer.from(await download.arrayBuffer());
assert(bytes.length > 100 && bytes.length < 5 * 1024 * 1024);
await writeFile(path.join(directory, 'checker-fictional-design.penpot'), bytes, { mode: 0o600 });
const form = new FormData();
form.set('name', 'Utilibre fictional imported');
form.set('project-id', accounts[1].profile.defaultProjectId);
form.set('file', new Blob([bytes], { type: 'application/zip' }), 'fictional-design.penpot');
const imported = await rpc('import-binfile', form, accounts[1].cookie, true);
await secret('checker-import.sse', imported.text);
const importedId = sseResult(imported.text)[0].replace(/^~u/, '');
const design = await json('get-file', { id: importedId }, accounts[1].cookie);
assert.equal(design.projectId, accounts[1].profile.defaultProjectId);
assert.equal(design.data.pages.length, file.data.pages.length);
assert.equal(design.data.pagesIndex[design.data.pages[0]].name, file.data.pagesIndex[pageId].name);
const findShape = data => Object.values(data.data.pagesIndex[data.data.pages[0]].objects).find(item => item.name === shape.name);
const recovered = findShape(design);
for (const key of ['name', 'type', 'x', 'y', 'width', 'height', 'fills']) assert.deepEqual(recovered[key], shape[key]);
await json('get-file', { id: importedId }, accounts[0].cookie, 404);
await secret('checker-files.json', { original: file.id, imported: importedId });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
context.setDefaultTimeout(20000);
await context.addCookies([{ name: 'auth-token', value: accounts[1].cookie, url: origin }]);
const outside = [], errors = [];
await context.route('**/*', route => {
  if (new URL(route.request().url()).origin === origin) return route.continue();
  outside.push(route.request().url());
  return route.abort();
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(`${origin}/#/workspace/${design.projectId}/${design.id}`);
  await page.getByText(shape.name, { exact: true }).waitFor();
  await page.getByText(shape.name, { exact: true }).click();
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  let changed;
  for (let attempt = 0; attempt < 30; attempt++) {
    changed = findShape(await json('get-file', { id: importedId }, accounts[1].cookie));
    if (changed.x === 121) break;
    await page.waitForTimeout(200);
  }
  assert.equal(changed.x, 121, 'native keyboard edit must be saved');
  await page.reload();
  await page.getByText(shape.name, { exact: true }).waitFor();
  assert.equal(findShape(await json('get-file', { id: importedId }, accounts[1].cookie)).x, 121);
  await page.getByText(shape.name, { exact: true }).click();
  await page.screenshot({ path: path.join(directory, 'checker-import-edited.png') });
  assert.deepEqual(errors, []);
  assert.deepEqual(outside, []);
} finally {
  await browser.close();
}
for (const [id, account] of [[file.id, accounts[0]], [importedId, accounts[1]]]) {
  await rpc('delete-file', { id }, account.cookie, false, 204);
  await json('get-file', { id }, account.cookie, 404);
}
await secret('result.json', {
  version: '2.18.2', checkedAt: new Date().toISOString(), isolated: true,
  nativeExportImport: true, independentAccount: true, preserved: ['page', 'rectangle', 'name', 'position', 'size', 'fill'],
  editableBrowserReopen: true, editSavedAfterReload: true, otherAccountDenied: true,
  nativeFileDeletion: true, archiveBytes: bytes.length, archiveSha256: createHash('sha256').update(bytes).digest('hex'),
  errors, outside, exclusions: ['shared-library migration', 'images', 'fonts', 'comments', 'version history', 'account/team permissions'],
});
console.log('PASS: native .penpot round trip, editable browser reopen, account boundary and native file deletion.');
