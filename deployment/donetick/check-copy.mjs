import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { createHmac } from 'node:crypto';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';

const out = '/opt/utilibre/reports/native-navigation-20261009';
const users = JSON.parse(await readFile('/opt/utilibre/identity-data/data/private/native-navigation-qa.json', 'utf8'));
const user = users.find(value => value.username === 'utilibre-navigation-20261009-b');
assert(user && !user.retired);
const copy = {
  en: 'Add a task to get started. It will appear here when it needs you.',
  es: 'Añadí una tarea para empezar. Aparecerá aquí cuando necesite tu atención.',
};
function otp(key) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const hash = createHmac('sha1', Buffer.from(key, 'hex')).update(counter).digest();
  return String((hash.readUInt32BE(hash[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const context = await browser.newContext({ locale: 'en-US', viewport: { width: 1440, height: 1000 } });
context.setDefaultTimeout(30000);
const errors = [], failedAssets = [], hosts = new Set();
try {
  const page = await context.newPage();
  page.on('request', request => hosts.add(new URL(request.url()).hostname));
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => {
    if (response.status() >= 400 && ['script', 'stylesheet', 'font', 'image'].includes(response.request().resourceType())) {
      failedAssets.push({ status: response.status(), path: new URL(response.url()).pathname });
    }
  });
  await page.goto('https://chores.utilibre.org/login');
  await page.getByRole('button', { name: 'Utilibre', exact: true }).click();
  await page.getByRole('textbox', { name: /username|email/i }).fill(user.username);
  await page.getByRole('button', { name: /continue|log in|sign in/i }).click();
  await page.locator('input[type=password]').waitFor();
  await page.waitForTimeout(700);
  await page.locator('input[type=password]').fill(user.password);
  await page.locator('input[type=password]').press('Enter');
  const code = page.locator('input[autocomplete="one-time-code"],input[name="code"]').first();
  await code.waitFor();
  await code.fill(otp(user.totpKey));
  await page.getByRole('button', { name: /continue|verify|sign in|log in/i }).click();
  await page.waitForURL('https://chores.utilibre.org/', { timeout: 45000 });
  await page.getByText(copy.en, { exact: true }).waitFor();
  await writeFile(out + '/donetick-browser-state.json', JSON.stringify(await context.storageState()), { mode: 0o600 });
  const token = await page.evaluate(() => localStorage.getItem('token'));
  const profileResponse = await context.request.get('https://chores.utilibre.org/api/v1/users/profile', { headers: { Authorization: 'Bearer ' + token } });
  assert(profileResponse.ok());
  const profile = (await profileResponse.json()).res;
  assert.equal(profile.username, user.username);
  await writeFile(out + '/donetick-fixture.json', JSON.stringify({ id: profile.id, username: profile.username, circleID: profile.circleID }), { mode: 0o600 });
  for (const [language, text] of Object.entries(copy)) {
    if (language === 'es') {
      await page.goto('https://chores.utilibre.org/settings/localization');
      await page.getByRole('combobox').first().click();
      await page.getByRole('option', { name: 'Español (Spanish)', exact: true }).click();
      await page.goto('https://chores.utilibre.org/');
    }
    await page.getByText(text, { exact: true }).waitFor();
    assert(!/Type it, say it, or scan it/.test(await page.locator('body').innerText()));
    const response = await context.request.get('https://chores.utilibre.org/locales/' + language + '/common.json');
    assert(response.ok());
    assert.equal((await response.json()).home.firstTask.description, text);
    for (const [size, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
      await page.setViewportSize(viewport);
      await page.getByText(text, { exact: true }).waitFor();
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: out + '/donetick-copy-' + language + '-' + size + '.png', fullPage: true });
    }
  }
  assert.deepEqual([...hosts].filter(host => !['auth.utilibre.org', 'chores.utilibre.org'].includes(host)), []);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  await writeFile(out + '/donetick-copy.json', JSON.stringify({ publicOidcMfa: true, nativeEmptyAccountCopy: copy, desktopMobile: true, noHorizontalOverflow: true, errors, failedAssets, hosts: [...hosts] }, null, 2));
  console.log('Public native OIDC/MFA and EN/ES empty-account copy passed on desktop and mobile.');
} finally {
  await context.close();
  await browser.close();
}
