import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditSeo, readPublic } from './check-seo.mjs';

// This is a PUBLIC ownership-proof token, not an account password or API secret.
// It grants no login, indexing guarantee, or access to user information.
const key = (await readFile(new URL('../public/762286d5852bc4de75b655217cccce8b.txt', import.meta.url), 'utf8')).trim();
assert(/^[a-f0-9]{32}$/.test(key));
const origin = 'https://utilibre.org';
// A confirmed stale robots cache may delay discovery of an otherwise valid
// sitemap. This explicit option skips ONLY its advertisement check, not page
// status, canonical, noindex, CSP, origin or private-route checks.
const audit = await auditSeo(origin, { allowUnadvertisedSitemap: process.argv.includes('--allow-unadvertised-sitemap') });
if (!audit.robotsSitemapAdvertised) console.warn('Public pages passed; the cached robots.txt still needs a targeted purge or expiry.');
const keyLocation = `${origin}/${key}.txt`;
assert.equal((await readPublic(keyLocation)).text.trim(), key, 'Public ownership proof is not live');
const payload = { host: new URL(origin).hostname, key, keyLocation, urlList: audit.urls };
if (!process.argv.includes('--submit')) {
  console.log(`Dry run: ${audit.pages} audited public URLs. Add --submit to notify IndexNow once.`);
} else {
  const response = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  assert([200, 202].includes(response.status), `IndexNow rejected the notification: HTTP ${response.status}`);
  console.log(JSON.stringify({ status: response.status, submitted: audit.pages, note: 'Notification accepted; indexing is not guaranteed.' }));
}
