// Disposable synthetic identities only. Prepare a fresh run; retire it afterward.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const run = process.env.UTILIBRE_RALLLY_CHECK_RUN;
assert.match(run || '', /^[a-z0-9]{1,20}$/);
const directory = '/opt/utilibre/identity-data/data/private/';
const users = JSON.parse(readFileSync(`${directory}rallly-check-users-${run}.json`, 'utf8'));
function otp(hex) {
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac('sha1', Buffer.from(hex, 'hex')).update(counter).digest();
  return String((digest.readUInt32BE(digest[19] & 15) & 0x7fffffff) % 1000000).padStart(6, '0');
}
const browser = await chromium.launch();
try {
  for (const user of users.slice(0, 2)) {
    const statePath = `${directory}${user.username}-browser.json`;
    const context = await browser.newContext(existsSync(statePath) ? { storageState: statePath } : {});
    const page = await context.newPage();
    if (!existsSync(statePath)) {
      await page.goto('https://auth.utilibre.org/if/flow/default-authentication-flow/');
      await page.locator('input[name="uidField"]').fill(user.username);
      await page.getByRole('button', { name: 'Log in', exact: true }).click();
      await page.locator('ak-stage-password input[name="password"]:visible').fill(user.password);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.locator('ak-stage-authenticator-validate input[name="code"]:visible').fill(otp(user.totpKey));
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForURL('**/if/user/**');
    }
    await page.goto('https://poll.utilibre.org/login');
    const signIn = page.getByRole('button', { name: /Utilibre/ });
    if (await signIn.count()) await signIn.click();
    await page.waitForTimeout(4000);
    assert.equal(new URL(page.url()).origin, 'https://poll.utilibre.org');
    if (new URL(page.url()).pathname === '/login' && await page.getByText("You're already signed in", { exact: true }).count()) {
      await page.getByRole('link', { name: 'Continue', exact: true }).click();
      await page.waitForTimeout(2500);
    }
    if (new URL(page.url()).pathname === '/setup') {
      await page.getByLabel('Name', { exact: true }).fill(`Utilibre QA ${run} ${user.username.includes('-a-') ? 'A' : 'B'}`);
      await page.getByText('Personal', { exact: true }).click();
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await page.waitForTimeout(4000);
    }
    console.log(user.username, new URL(page.url()).pathname, (await page.locator('body').innerText()).slice(0, 5500));
    writeFileSync(statePath, JSON.stringify(await context.storageState()), { mode: 0o600 });
    await context.close();
  }
} catch (error) {
  console.error('Synthetic Rallly browser check failed:', String(error).replace(/https?:\/\/\S+/g, '[URL]').slice(0, 600));
  process.exitCode = 1;
} finally { await browser.close(); }
