import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { reportedServiceIssues } from './seo-service-targets.mjs';

// Read-only, one request at a time, fixed owner-supplied pages. No cookies,
// scripts, assets, third-party redirects, authentication or generated URLs.
const urls = [...new Set(Object.values(reportedServiceIssues).flat())];
const rows = [];
for (const url of urls) {
  assert(/^https:\/\/(?:[a-z-]+\.)?utilibre\.org\//.test(url));
  let target = url;
  try {
    let response;
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(15_000),
        headers: { 'User-Agent': 'Utilibre-public-SEO-check/1.0' } });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const next = new URL(response.headers.get('location'), target);
      await response.body?.cancel();
      if (next.origin !== new URL(url).origin || hop === 3) break;
      target = next.href;
    }
    const row = { url, finalUrl: target, status: response.status,
      xRobots: response.headers.get('x-robots-tag'), contentType: response.headers.get('content-type') };
    if (row.status === 200 && row.contentType?.includes('text/html')) {
      let bytes = 0; const chunks = [];
      for await (const chunk of response.body) {
        bytes += chunk.length; assert(bytes <= 2_097_152, 'Response-size limit'); chunks.push(chunk);
      }
      const { document: d } = parseHTML(Buffer.concat(chunks).toString('utf8'));
      const descriptions = [...d.querySelectorAll('meta')].filter(e => e.getAttribute('name')?.toLowerCase() === 'description');
      Object.assign(row, { title: d.querySelector('title')?.textContent || '', descriptions: descriptions.map(e => e.getAttribute('content')),
        h1: [...d.querySelectorAll('h1')].map(e => e.textContent.trim()),
        robots: d.querySelector('meta[name="robots"]')?.getAttribute('content') || null,
        missingAlt: [...d.querySelectorAll('img:not([alt])')].map(e => e.getAttribute('src')),
        emptyAltCount: d.querySelectorAll('img[alt=""]').length });
    } else if (!response.bodyUsed) await response.body?.cancel();
    rows.push(row);
  } catch { rows.push({ url, error: 'Fetch or parsing failed; no success inferred' }); }
  if (rows.length % 10 === 0) console.log(`Checked ${rows.length}/${urls.length} fixed public pages`);
  await new Promise(resolve => setTimeout(resolve, 250));
}
const report = { checkedAt: new Date().toISOString(), method: 'Initial HTML, not rendered applications or account workflows', rows };
if (process.argv[2]) await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
