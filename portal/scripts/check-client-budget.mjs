import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { log } from 'node:console';
import { parseHTML } from 'linkedom';

const dist = new URL('../dist/', import.meta.url);
const { document } = parseHTML(await readFile(new URL('index.html', dist), 'utf8'));
const paths = [...new Set([
  ...[...document.querySelectorAll('script[type="module"][src]')].map(node => node.getAttribute('src')),
  ...[...document.querySelectorAll('link[rel="modulepreload"][href]')].map(node => node.getAttribute('href')),
])];
let total = 0;
for (const path of paths) {
  assert(/^\/assets\/[\w-]+\.js$/.test(path), 'Unexpected initial script path');
  assert(!/practical-guides|my-utilibre/.test(path), 'Route-only content returned to the initial download');
  total += gzipSync(await readFile(new URL(path.slice(1), dist))).length;
}
assert(total < 215_000, `Initial JavaScript grew to ${total} gzip bytes (budget 215000)`);
log(JSON.stringify({ initialScriptFiles: paths.length, gzipBytes: total, budget: 215_000,
  note: 'Build regression guard, not field performance or CDN transfer measurement.' }));
