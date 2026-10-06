// Execute only the shipped synthetic example; no server-side Python or user data.
import assert from 'node:assert/strict';
import { chromium } from '../../portal/node_modules/playwright-core/index.mjs';
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto('https://python.utilibre.org/es/lab/index.html?path=Empeza-aqui.ipynb');
  await page.locator('.jp-CodeCell').first().waitFor({timeout:45000});
  await page.locator('.jp-CodeCell .cm-content').first().click();
  await page.keyboard.press('Control+Enter');
  await page.getByText('Promedio: 7.25',{exact:true}).waitFor({timeout:120000});
  await page.locator('.jp-CodeCell .cm-content').nth(1).click();
  await page.keyboard.press('Control+Enter');
  await page.locator('.jp-OutputArea img').waitFor({timeout:120000});
  assert.ok(await page.locator('.jp-OutputArea img').first().evaluate(img=>img.naturalWidth>0));
  console.log('JupyterLite public HTTPS: Python/Pyodide calculation, pandas CSV and matplotlib chart passed.');
  console.log('Only synthetic notebook data used; this closes and discards the test browser storage.');
} finally { await browser.close(); }
