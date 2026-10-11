// Execute only the shipped synthetic example; no server-side Python or user data.
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const origin = 'https://python.utilibre.org';
const stage = process.env.UTILIBRE_JUPYTER_TEST_ORIGIN;
assert.ok(!stage || /^http:\/\/127\.0\.0\.1:\d{4,5}$/.test(stage), 'Use production or an explicit loopback staging backend');
const browser = await chromium.launch();
try {
  const context = await browser.newContext({serviceWorkers:'block'});
  // Keep the native origin/absolute kernel paths/CSP intact while isolating all
  // browser requests to the disposable candidate, never the live application.
  if(stage)await context.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.abort();
    const response=await route.fetch({url:stage+url.pathname+url.search,maxRedirects:0});
    await route.fulfill({response});
  });
  const page = await context.newPage();
  const outside=new Set(),writes=[];
  page.context().on('request',r=>{if(/^https?:/.test(r.url())&&new URL(r.url()).origin!==origin)outside.add(new URL(r.url()).origin);if(!['GET','HEAD'].includes(r.method()))writes.push(r.method())});
  await page.goto(origin+'/es/lab/index.html?path=Empeza-aqui.ipynb');
  await page.locator('.jp-CodeCell').first().waitFor({timeout:45000});
  // Notebook cells appear before the kernel finishes initializing. Sending
  // the shortcut then can be ignored or open the kernel chooser instead.
  const idle = page.getByRole('button').filter({hasText:/^Python \(Pyodide\) \| Idle$/});
  const chooser = page.locator('.jp-Dialog');
  await Promise.race([
    idle.waitFor({state:'visible',timeout:120000}),
    chooser.waitFor({state:'visible',timeout:120000}),
  ]);
  if (await chooser.isVisible()) {
    await chooser.locator('select').selectOption({label:'Python (Pyodide)'});
    await chooser.locator('button.jp-mod-accept').click();
    await chooser.waitFor({state:'hidden'});
  }
  await idle.waitFor({state:'visible',timeout:120000});
  await page.locator('.jp-CodeCell .cm-content').first().click();
  await page.keyboard.press('Control+Enter');
  await page.getByText('Promedio: 7.25',{exact:true}).waitFor({timeout:120000});
  await page.locator('.jp-CodeCell .cm-content').nth(1).click();
  await page.keyboard.press('Control+Enter');
  await page.locator('.jp-OutputArea img').waitFor({timeout:120000});
  assert.ok(await page.locator('.jp-OutputArea img').first().evaluate(img=>img.naturalWidth>0));
  assert.deepEqual([...outside],[]);assert.deepEqual(writes,[]);
  console.log(`JupyterLite ${stage ? 'isolated candidate '+stage : 'public HTTPS'}: Python/Pyodide calculation, pandas CSV and matplotlib chart passed.`);
  console.log('Only synthetic notebook data used; this closes and discards the test browser storage.');
  console.log('No external runtime requests or content uploads in this notebook journey.');
} finally { await browser.close(); }
