import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/@playwright/test/index.mjs';
const base = process.env.RUSTPAD_TEST_URL || 'http://127.0.0.1:3213/apps/rustpad/';
const origin = new URL(base).origin;
const browser = await chromium.launch({ headless: true });
const contexts = await Promise.all([browser.newContext({permissions:['clipboard-read','clipboard-write']}), browser.newContext()]);
const pages = await Promise.all(contexts.map(c => c.newPage()));
const external = [], errors = [], requests = [];
for (const page of pages) {
  page.on('request', req => { requests.push(req.url()); if (/^https?:/.test(req.url()) && new URL(req.url()).origin !== origin) external.push(req.url()); });
  page.on('pageerror', e => errors.push(e.message));
}
try {
  await pages[0].goto(base);
  await pages[0].getByText('You are connected!', {exact:true}).waitFor({timeout:30000});
  const shared = pages[0].url();
  const id = new URL(shared).hash.slice(1);
  assert.match(id, /^[a-f0-9]{32}$/);
  await pages[0].getByRole('button', {name:'Copy',exact:true}).click();
  assert.equal(await pages[0].evaluate(() => navigator.clipboard.readText()), shared);
  await pages[1].goto(shared);
  await pages[1].getByText('You are connected!', {exact:true}).waitFor({timeout:30000});
  await pages[0].locator('.monaco-editor textarea.inputarea').click({force:true});
  await pages[0].keyboard.type('const fictional = 7;');
  await pages[1].locator('.view-lines').getByText('const fictional = 7;', {exact:false}).waitFor();
  await pages[1].locator('.monaco-editor textarea.inputarea').click({force:true});
  await pages[1].keyboard.press('Control+End');
  await pages[1].keyboard.type('\n// Shared example only');
  await pages[0].locator('.view-lines').getByText('// Shared example only', {exact:false}).waitFor();
  const text = await pages[0].request.get(new URL('api/text/' + id, base).href);
  assert.equal(await text.text(), 'const fictional = 7;\n// Shared example only');
  await pages[0].getByRole('combobox').selectOption('typescript');
  await pages[1].getByRole('combobox').selectOption('typescript');
  await pages[0].waitForTimeout(1000);
  assert.equal(external.length,0, 'No third-party editor/worker requests');
  assert.deepEqual(errors, []);
  const response = await pages[0].request.get(base);
  assert.match(response.headers()['content-security-policy'], /worker-src 'self' blob:/);
  assert.match(response.headers()['x-robots-tag'], /noindex/);
  const result={passed:true, twoEditors:true, subpathSharing:true, cryptoIdentifierBits:128, sameOriginRequests:requests.length, externalRequests:external, errors, testedAt:new Date().toISOString()};
  await writeFile(process.env.RUSTPAD_TEST_REPORT || '/opt/utilibre/reports/rustpad-20261009/browser.json', JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result));
} finally { await browser.close(); }
