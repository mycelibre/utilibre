// Local-only browser test; no secrets, session cookies or MFA QR codes in output.
// This verifies password acceptance/MFA gating, NOT public edge TLS or SSO apps.
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { chromium } from '../../portal/node_modules/playwright/index.mjs';
const owner = JSON.parse(readFileSync(new URL('../../secrets/authentik-admin.json', import.meta.url), 'utf8'));
const proxy = http.createServer((request, response) => {
  const upstream = http.request({ hostname: '10.10.1.43', port: 3138, path: request.url, method: request.method, headers: request.headers }, received => {
    response.writeHead(received.statusCode, received.headers);
    received.pipe(response);
  });
  upstream.on('error', () => { response.writeHead(502); response.end(); });
  request.pipe(upstream);
});
await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  const outside = new Set();
  const stages = [];
  page.on('response', async response => {
    if (!response.url().includes('/api/v3/flows/executor/')) return;
    try { const body = await response.json(); stages.push({status: response.status(), component: body.component || body.type}); } catch { stages.push({status: response.status()}); }
  });
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.protocol.startsWith('http') && url.hostname !== 'localhost') outside.add(url.hostname);
  });
  await page.goto(`http://localhost:${proxy.address().port}/if/flow/default-authentication-flow/`, { waitUntil: 'networkidle' });
  await page.locator('input[name="uidField"]').fill(owner.email);
  await page.getByRole('button', { name: 'Log in', exact: true }).click();
  await page.locator('ak-stage-password input[name="password"]:visible').fill(owner.password);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  try {
    await page.locator('ak-stage-authenticator-totp').waitFor({ state: 'visible', timeout: 15000 });
  } catch (error) {
    console.log('Challenge components only:', stages);
    console.log('Current button labels:', await page.getByRole('button').allTextContents());
    console.log('Visible input validation:', await page.locator('input:visible').evaluateAll(inputs => inputs.map(input => ({name: input.name, valid: input.validity.valid, missing: input.validity.valueMissing}))));
    throw error;
  }
  if (outside.size) throw new Error('Unexpected external network contact in the login flow.');
  console.log('Administrator password accepted; authenticator setup required; no external browser requests.');
  console.log('No MFA enrollment submitted or secret captured; the real owner must enroll their device.');
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => proxy.close(resolve));
}
