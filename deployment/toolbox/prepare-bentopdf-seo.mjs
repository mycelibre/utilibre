// Packaging-only correction for BentoPDF 2.8.8: its build emits a generic
// promotional description before the tool-specific description. Keep the latter.
// No PDF engine, scripts, security headers or tool output is changed.
import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brotliCompressSync, gzipSync } from 'node:zlib';

const descriptionTags = /<meta\b(?=[^>]*\bname\s*=\s*(["'])description\1)[^>]*>/gi;
export function normalizeDescriptions(html) {
  const head = html.match(/<head\b[^>]*>[\s\S]*?<\/head>/i);
  if (!head) return html;
  const tags = [...head[0].matchAll(descriptionTags)];
  if (tags.length < 2) return html;
  const keep = tags.at(-1)[0];
  assert(/\bcontent\s*=\s*(["'])[^"']+\1/i.test(keep), 'Empty tool description: review upstream HTML');
  let position = 0;
  const corrected = head[0].replace(descriptionTags, tag => ++position === tags.length ? tag : '');
  return html.slice(0, head.index) + corrected + html.slice(head.index + head[0].length);
}
export async function prepareBentoSeo(root) {
  let checked = 0, changed = 0;
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      assert(!entry.isSymbolicLink(), 'Static package must not contain symlinks');
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { if (!['assets', 'wasm', 'node_modules'].includes(entry.name)) await walk(path); continue; }
      if (!entry.name.endsWith('.html')) continue;
      checked++;
      const old = await readFile(path, 'utf8'), html = normalizeDescriptions(old);
      if (html === old) continue;
      await writeFile(path, html); changed++;
      // Keep upstream precompressed variants coherent if a server enables them.
      for (const [suffix, compress] of [['.br', brotliCompressSync], ['.gz', gzipSync]]) {
        try { await readFile(path + suffix); await writeFile(path + suffix, compress(Buffer.from(html))); }
        catch (error) { if (error.code !== 'ENOENT') throw error; }
      }
    }
  }
  await walk(root); return { checked, changed };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  assert(process.argv[2], 'Pass a staged static build, never a live user-data directory');
  console.log(JSON.stringify(await prepareBentoSeo(process.argv[2])));
}
