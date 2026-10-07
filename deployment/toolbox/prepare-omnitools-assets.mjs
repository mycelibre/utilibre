// Native upstream assets mirrored locally; no task data leaves the browser.
// Run inside Docker, with a fresh copy of the pinned upstream distribution.
import { readdir, readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = 'https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/';
const digest = '4e2a359d0436f1e55cb0e4e29a1c943f5d86d639ba4f4b5ea874a699b1f742d3';
async function download(path, expected) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw Error(`Model asset HTTP ${response.status}: ${path}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash('sha256').update(bytes).digest('hex') !== expected) throw Error(`Model asset checksum: ${path}`);
  await writeFile('vendor/imgly/' + path, bytes);
  return bytes;
}
await mkdir('vendor/imgly', { recursive: true });
const manifest = JSON.parse(await download('resources.json', digest));
const chunks = new Map(Object.values(manifest).flatMap(v => v.chunks).map(c => [c.name, c.hash]));
// Two downloads at a time; fixed release and hashes, no remote code at runtime.
const pending = [...chunks];
await Promise.all([0, 1].map(async () => { while (pending.length) { const [name, hash] = pending.pop(); if (!/^[a-f0-9]{64}$/.test(name)) throw Error('Unsafe asset name'); await download(name, hash); } }));
const assetNames = (await readdir('assets')).filter(n => /\.(js|css)$/.test(n));
const renameMap = new Map(assetNames.map(n => [n, n.replace(/\.(js|css)$/, '-utilibre-p2.$1')]));
let patched = 0;
for (const path of ['index.html', ...assetNames.map(n => 'assets/' + n)]) {
  let text = await readFile(path, 'utf8');
  const modelUrl = 'https://staticimgly.com/@imgly/background-removal-data/${PACKAGE_VERSION}/dist/';
  if (text.includes(modelUrl)) { text = text.replaceAll(modelUrl, 'https://tools.utilibre.org/vendor/imgly/'); patched++; }
  for (const [oldName, newName] of renameMap) text = text.replaceAll(oldName, newName);
  if (path === 'index.html') {
    text = text.replace('</body>', '<footer style="padding:1rem;font:14px/1.5 system-ui;text-align:center"><a href="/utilibre-source/">OmniTools source and licenses · Código fuente y licencias</a></footer></body>');
  }
  await writeFile(path, text);
}
if (patched !== 1) throw Error(`Expected one model path, found ${patched}`);
for (const [oldName, newName] of renameMap) await rename('assets/' + oldName, 'assets/' + newName);
console.log(`Mirrored ${chunks.size} checksum-verified model/runtime chunks; versioned all JS/CSS URLs.`);
