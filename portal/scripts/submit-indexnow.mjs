import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { auditSeo, readPublic } from './check-seo.mjs';
import { PUBLIC_ORIGIN, parseSelection, selectAuditedUrls, assertRemovedResponse } from './indexnow-selection.mjs';

const help = `Usage: node scripts/submit-indexnow.mjs [selectors] [--submit]
  --url URL       One meaningfully new or changed canonical public page; repeatable
  --urls URL,URL  A comma-separated set of meaningfully new or changed pages
  --removed URL  A retired public page (or comma-separated set); requires HTTP 404/410
  --dry-run      Audit and print the exact selection without notifying (default)
  --submit       Send the explicitly selected URLs to IndexNow once
  --allow-unadvertised-sitemap  Skip only a confirmed stale robots sitemap notice
  --help         Show this help without making requests

No selector means no requests or submission. Never resubmit the unchanged sitemap.
Only reviewed https://utilibre.org documents are accepted; no queries or private tools.
Dry runs read public pages and the ownership proof but make no IndexNow request.`;

export async function runIndexNow(args, {
  audit = auditSeo,
  read = readPublic,
  request = fetch,
  readKey = () => readFile(new URL('../public/762286d5852bc4de75b655217cccce8b.txt', import.meta.url), 'utf8'),
  log = console.log,
} = {}) {
  const selection = parseSelection(args);
  if (selection.help || selection.changed.length + selection.removed.length === 0) {
    log(help);
    return { submitted: 0, requests: 0 };
  }
  const audited = await audit(PUBLIC_ORIGIN, { allowUnadvertisedSitemap: selection.allowUnadvertisedSitemap });
  const urlList = selectAuditedUrls(selection, audited);
  for (const url of selection.removed) {
    const response = await request(url, {
      redirect: 'manual', signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Utilibre-public-SEO-check/1.0' },
    });
    try { assertRemovedResponse(url, response); } finally { await response.body?.cancel(); }
  }
  // Public ownership proof only: no account credential, visitor data, or logs.
  const key = (await readKey()).trim();
  assert(/^[a-f0-9]{32}$/.test(key), 'Invalid public ownership-proof key');
  const keyLocation = `${PUBLIC_ORIGIN}/${key}.txt`;
  assert.equal((await read(keyLocation)).text.trim(), key, 'Public ownership proof is not live');
  const payload = { host: 'utilibre.org', key, keyLocation, urlList };
  const result = {
    mode: selection.submit ? 'submit' : 'dry-run',
    auditedPages: audited.pages,
    changed: selection.changed,
    removed: selection.removed,
    robotsSitemapAdvertised: audited.robotsSitemapAdvertised,
    submitted: 0,
  };
  if (selection.submit) {
    const response = await request('https://api.indexnow.org/indexnow', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    try {
      if (![200, 202].includes(response.status)) {
        // Keep the diagnostic code, never an arbitrary remote message/body.
        const data = await response.json().catch(() => null);
        const code = typeof data?.errorCode === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(data.errorCode) ? ` (${data.errorCode})` : '';
        const advice = response.status === 403 ? ' Ownership verification failed; check the exact public proof URL and edge challenges before retrying.'
          : response.status === 429 ? ' Rate limited; do not retry automatically.' : '';
        throw new Error(`IndexNow rejected the notification: HTTP ${response.status}${code}.${advice}`);
      }
      result.status = response.status;
      result.submitted = urlList.length;
      result.verificationPending = response.status === 202;
    } finally { if (!response.bodyUsed) await response.body?.cancel(); }
  }
  log(JSON.stringify({
    ...result,
    note: selection.submit ? result.verificationPending
      ? 'Notification received; ownership verification is pending. Indexing is not guaranteed.'
      : 'Notification accepted; indexing is not guaranteed.' : 'No IndexNow notification sent. Add --submit only for this reviewed meaningful change.',
  }, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await runIndexNow(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
