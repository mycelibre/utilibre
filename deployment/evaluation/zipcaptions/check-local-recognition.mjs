// Run inside an unshare --net namespace. No microphone access or remote fallback.
import { chromium } from '/home/ubuntu/freetools/portal/node_modules/playwright/index.mjs';
import { writeFile } from 'node:fs/promises';

const mode = process.argv[2] ?? 'full-headless';
const output = process.argv[3];
const report = { mode, date: new Date().toISOString(), requests: [], microphoneCalls: 0 };
const browser = await chromium.launch({
  ...(mode === 'shell' ? {} : { channel: 'chromium' }),
  headless: mode !== 'full-headed',
  args: ['--disable-background-networking', '--disable-component-update', '--lang=en-US'],
});
report.version = browser.version();
const context = await browser.newContext({ locale: 'en-US' });
const page = await context.newPage();
page.on('crash', () => { report.rendererCrashed = true; });
await page.route('**/*', async (route) => {
  const url = route.request().url();
  report.requests.push(url);
  if (url === 'https://zipcaptions.invalid/') {
    await route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Owned fictional compatibility fixture</title><button id="check">Check local engine</button>' });
  } else await route.abort();
});
await page.goto('https://zipcaptions.invalid/');
let timeout;
try {
  report.result = await Promise.race([
    page.evaluate(async () => {
      const C = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!C) return { supported: false, captureStarted: false };
      const recognition = new C();
      const result = { processLocallySupported: 'processLocally' in recognition,
        availableMethod: typeof C.available, installMethod: typeof C.install,
        captureStarted: false, languages: {} };
      if (!result.processLocallySupported || typeof C.available !== 'function') return result;
      recognition.processLocally = true;
      for (const language of ['en-US', 'es-ES']) {
        try {
          const status = await C.available({ langs: [language], processLocally: true });
          result.languages[language] = { status };
        } catch (error) {
          result.languages[language] = { error: error.name + ': ' + error.message };
        }
      }
      // Exercise the native installation API while OS egress is disabled.
      // No downloaded pack is accepted or used without a verified FOSS grant.
      document.querySelector('#check').onclick = async () => {
        try { window.localInstallResult = await C.install({ langs: ['en-US'], processLocally: true }); }
        catch (error) { window.localInstallResult = error.name + ': ' + error.message; }
      };
      return result;
    }),
    new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Native availability check exceeded 15 seconds')), 15_000); }),
  ]);
  clearTimeout(timeout);
  if (report.result?.languages) {
    await page.click('#check');
    await page.waitForFunction(() => window.localInstallResult !== undefined, { timeout: 5_000 }).catch(() => {});
    report.installWithNetworkDisabled = await page.evaluate(() => window.localInstallResult ?? 'unresolved after 5 seconds');
  }
} catch (error) { report.error = error.message; }
clearTimeout(timeout);
await browser.close().catch(() => {});
if (output) await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
