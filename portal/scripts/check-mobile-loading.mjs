import assert from 'node:assert/strict';
import process from 'node:process';
import { log } from 'node:console';
import { chromium, devices } from 'playwright-core';

// Explicit, bounded laboratory test of two public portal pages. Not analytics,
// not a real-device/field measurement, and never a load test of upstream tools.
assert.deepEqual(process.argv.slice(2), ['--run'], 'Use --run for six clean-profile public page loads.');
const browser = await chromium.launch();
try {
  for (const path of ['/es/', '/es/colecciones/documentos-y-tramites']) {
    const runs = [];
    for (let run = 0; run < 3; run++) {
      const context = await browser.newContext({ ...devices['Pixel 7'], viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      let encodedResponseBytes = 0;
      cdp.on('Network.loadingFinished', event => { encodedResponseBytes += event.encodedDataLength; });
      await page.addInitScript(() => {
        globalThis.labMetrics = { lcp: 0, cls: 0, longTasks: 0 };
        new globalThis.PerformanceObserver(list => {
          for (const entry of list.getEntries()) globalThis.labMetrics.lcp = entry.startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        new globalThis.PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) globalThis.labMetrics.cls += entry.value;
        }).observe({ type: 'layout-shift', buffered: true });
        new globalThis.PerformanceObserver(list => { globalThis.labMetrics.longTasks += list.getEntries().length; })
          .observe({ type: 'longtask', buffered: true });
      });
      await page.goto(`https://utilibre.org${path}`, { waitUntil: 'load' });
      await page.waitForSelector('[data-interactive="true"]');
      await page.waitForTimeout(3500);
      const metrics = await page.evaluate(() => ({ ...globalThis.labMetrics,
        overflow: globalThis.document.documentElement.scrollWidth - globalThis.innerWidth,
        scripts: globalThis.performance.getEntriesByType('resource').filter(item => item.initiatorType === 'script').length,
      }));
      runs.push({ ...metrics, encodedResponseBytes });
      await context.close();
    }
    log(JSON.stringify({ checkedAt: new Date().toISOString(), path, browser: browser.version(),
      conditions: 'Chromium Pixel 7 emulation, 390×844, fresh context, 4× CPU slowdown, 150ms configured latency, 1.6Mbps download',
      medianLcpMs: runs.map(run => run.lcp).sort((a, b) => a - b)[1], runs,
      limitation: 'Laboratory diagnostics only; no field INP or real-device coverage.' }));
  }
} finally { await browser.close(); }
