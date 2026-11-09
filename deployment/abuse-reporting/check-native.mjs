// Local ephemeral fixtures only. Never point this check at public applications.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const out = process.argv[2];
assert(out?.startsWith('/var/lib/utilibre-maintenance/') || out?.startsWith('/tmp/'));
const browser = await chromium.launch({headless:true});
const checks = [], outside = new Set(), errors = [];
async function view(base, path, label) {
  const context = await browser.newContext({viewport:{width:390,height:844}, locale:'en-US'});
  const page = await context.newPage();
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) && url.hostname !== '127.0.0.1') outside.add(url.origin);
  });
  page.on('pageerror', error => errors.push(`${label}: ${error.message}`));
  await page.goto(base + path);
  const links = page.locator('#utilibre-abuse-report a');
  await links.first().waitFor();
  assert.equal(await links.count(), 2);
  assert.equal(await links.nth(0).getAttribute('href'), 'https://utilibre.org/en/abuse');
  assert.equal(await links.nth(1).getAttribute('href'), 'https://utilibre.org/es/denunciar-abuso');
  assert.equal(await links.first().getAttribute('referrerpolicy'), 'no-referrer');
  await page.screenshot({path:`${out}/${label}.png`, fullPage:true});
  checks.push({surface:label, reportLinks:2, referrerSuppressed:true});
  return {context, page};
}
try {
  const paste = await view('http://127.0.0.1:43911', '/', 'privatebin-home');
  const text = 'Synthetic abuse-notice compatibility check. No real content.';
  await paste.page.locator('#message').fill(text);
  const response = paste.page.waitForResponse(r => r.request().method() === 'POST');
  await paste.page.locator('#sendbutton').click();
  const receipt = await (await response).json();
  assert.equal(receipt.status, 0, receipt.message);
  await paste.page.waitForFunction(() => location.hash.length > 15);
  const localLink = paste.page.url();
  await paste.context.close();
  const reader = await view('http://127.0.0.1:43911', localLink.slice('http://127.0.0.1:43911'.length), 'privatebin-shared');
  await reader.page.getByText(text, {exact:true}).waitFor();
  await reader.context.close();
  const home = await view('http://127.0.0.1:43912', '/', 'wbo-home');
  await home.context.close();
  const board = await view('http://127.0.0.1:43912', '/boards/fictional-abuse-notice-check', 'wbo-shared');
  const dialog = board.page.locator('#utilibre-notice');
  if (await dialog.isVisible()) await dialog.getByRole('button').click();
  await board.page.locator('#utilibre-abuse-report').screenshot({path:`${out}/wbo-report-control.png`});
  assert(await board.page.locator('#utilibre-abuse-report').isVisible());
  await board.context.close();
  const result = {checks, externalRequests:[...outside], browserErrors:errors, isolatedEphemeralDataOnly:true};
  await writeFile(`${out}/native-browser.json`, JSON.stringify(result, null, 2));
  assert.equal(outside.size, 0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
