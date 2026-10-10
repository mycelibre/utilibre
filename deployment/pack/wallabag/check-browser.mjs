// ONLY the private, network-isolated rehearsal with upstream synthetic accounts.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtemp, readFile, writeFile} from 'node:fs/promises';
import {chromium} from '../../../portal/node_modules/playwright-core/index.mjs';
const origin = 'http://127.0.0.1:33177';
const seed = JSON.parse(execFileSync('docker', ['exec', '-i', 'utilibre-wallabag-review-app-1', 'php'], {
  input: await readFile(new URL('./seed-browser-review.php', import.meta.url)), encoding: 'utf8',
}));
assert(seed.syntheticOnly && Number.isSafeInteger(seed.entryId));
const output = await mkdtemp('/tmp/utilibre-wallabag-browser-');
const browser = await chromium.launch();
const outsideResponses = new Set(), scriptErrors = [], failedAssets = [];
async function context(width) {
  const ctx = await browser.newContext({viewport: {width, height: 900}, serviceWorkers: 'block'});
  ctx.setDefaultTimeout(15000);
  ctx.setDefaultNavigationTimeout(20000);
  ctx.on('response', response => {
    if (new URL(response.url()).origin !== origin) outsideResponses.add(new URL(response.url()).origin);
    if (response.status() >= 400 && /\.(js|css|woff2?)(\?|$)/.test(response.url())) failedAssets.push(new URL(response.url()).pathname);
  });
  ctx.on('page', page => page.on('pageerror', e => scriptErrors.push(e.message)));
  return ctx;
}
async function login(page, username) {
  await page.goto(`${origin}/login`);
  await page.locator('input[name="_username"]').fill(username);
  await page.locator('input[name="_password"]').fill('mypassword');
  await Promise.all([page.waitForURL(url => url.pathname !== '/login'), page.locator('button[name="send"]').click()]);
}
function otp() {
  return execFileSync('docker', ['exec', 'utilibre-wallabag-review-app-1', 'php', '-r',
    'require "vendor/autoload.php"; echo OTPHP\\TOTP::create("JBSWY3DPEHPK3PXP")->now();'], {encoding:'utf8'});
}
try {
  const admin = await context(1280), page = await admin.newPage();
  await login(page, 'admin');
  await page.locator('#_auth_code').waitFor();
  assert.equal(await page.locator('input[name="_csrf_token"]').count(), 1);
  await page.screenshot({path: `${output}/mfa-desktop.png`});
  await page.setViewportSize({width: 390, height: 844});
  await page.screenshot({path: `${output}/mfa-mobile.png`});
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#_auth_code').fill(otp());
  await Promise.all([page.waitForURL(url => !url.pathname.startsWith('/2fa')), page.locator('button[name="send"]').click()]);
  const response = await page.goto(`${origin}/view/${seed.entryId}`);
  assert.equal(response.status(), 200);
  assert.equal(response.headers()['referrer-policy'], 'no-referrer');
  assert.match(await page.locator('#article').innerText(), /Fictional local article/);
  await page.waitForTimeout(400);
  await page.screenshot({path: `${output}/article-mobile.png`});
  await page.setViewportSize({width: 1280, height: 900});
  await page.screenshot({path: `${output}/article-desktop.png`});
  const exported = await admin.request.get(`${origin}/export/${seed.entryId}.json`);
  assert.equal(exported.status(), 200);
  assert.match(await exported.text(), /Fictional local article/);

  // One real, operator-owned public page through the native article fetcher.
  await page.goto(`${origin}/new`);
  await page.locator('.toggle-add-url').click();
  await page.locator('#entry_url').fill('https://utilibre.org/en/');
  await page.locator('#entry_url').press('Enter');
  await page.waitForURL(url => url.pathname !== '/new');
  await page.goto(`${origin}/unread/list`);
  await page.locator('a[href^="/view/"]').filter({hasText:/Free online tools/}).first().click();
  assert.match(await page.locator('#article').innerText(), /Utilibre/);
  assert.doesNotMatch(await page.locator('#article').innerText(), /can't retrieve contents/);

  const other = await context(1280), otherPage = await other.newPage();
  await login(otherPage, 'bob');
  assert.equal((await otherPage.goto(`${origin}/view/${seed.entryId}`)).status(), 404);
  assert.equal((await other.request.get(`${origin}/export/${seed.entryId}.json`)).status(), 404);
  const anonymous = await context(390), anonPage = await anonymous.newPage();
  await anonPage.goto(`${origin}/view/${seed.entryId}`);
  await anonPage.locator('input[name="_password"]').waitFor();
  for (const path of ['/assets/images/example.jpg', '/share/fictional', '/feed/fictional', '/register/']) {
    assert.equal((await anonymous.request.get(origin+path)).status(), 404);
  }
  assert.deepEqual([...outsideResponses], [], 'Unexpected outside HTTP response');
  assert.deepEqual(failedAssets, [], 'Broken local runtime assets');
  assert.deepEqual(scriptErrors, [], 'Browser execution errors');
  const report = {checkedAt:new Date().toISOString(),environment:'Linux Chromium; 1280px desktop / 390px emulation; isolated loopback',
    mfaLogin:true,privateRead:true,privateJsonExport:true,secondAccountDenied:true,anonymousDenied:true,
    remoteResourcesBlocked:true,ownedPublicArticleFetched:true,externalResponses:[...outsideResponses],scriptErrors,failedAssets,
    untested:['physical devices','production TLS','production backup restore']};
  await writeFile(`${output}/report.json`, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  console.log(`Screenshots: ${output}`);
} finally { await browser.close(); }
