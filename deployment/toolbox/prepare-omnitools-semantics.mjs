// Two semantic props on pinned upstream components plus initial-HTML metadata.
// Equivalent readable changes are in omnitools-semantics.patch.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile, rename } from 'node:fs/promises';
const file = 'assets/index-C4ntK_xt-utilibre-p6.js';
let js = await readFile(file, 'utf8');
assert.equal(createHash('sha256').update(js).digest('hex'),
  'f23ab316f34669e5b1ddc776a3e2cf2c8b640aa29935a18da9cecb4e75c49a6f', 'Review changed upstream components');
for (const [old, replacement] of [
  ['k.jsx(Ot,{mb:2,fontSize:30,color:"primary",children:t})', 'k.jsx(Ot,{component:"h1",mb:2,fontSize:30,color:"primary",children:t})'],
  ['k.jsx("img",{src:i.palette.mode==="light"?BR:UR,width:s?"120px":"200px"})', 'k.jsx("img",{alt:"OmniTools",src:i.palette.mode==="light"?BR:UR,width:s?"120px":"200px"})'],
]) {
  assert.equal(js.split(old).length, 2, 'Expected one reviewed component');
  js = js.replace(old, replacement);
}
await writeFile(file, js);
const names = (await readdir('assets')).filter(n => /\.(js|css)$/.test(n));
const versions = new Map(names.map(n => [n, n.replace(/-utilibre-p6\.(js|css)$/, '-utilibre-p7.$1')]));
for (const path of ['index.html', ...names.map(n => 'assets/' + n)]) {
  let text = await readFile(path, 'utf8');
  if (path === 'index.html') {
    assert(!/<meta\b[^>]*name=["']description["']/i.test(text), 'Review existing description');
    assert(text.includes('</head>'), 'Missing head');
    text = text.replace('</head>', '<meta name="description" content="Edit and compress images, trim audio, and work with text and data using OmniTools in your browser. Hosted by Utilibre.">\n</head>');
  }
  for (const [old, replacement] of versions) text = text.replaceAll(old, replacement);
  await writeFile(path, text);
}
for (const [old, replacement] of versions) if (old !== replacement) await rename('assets/' + old, 'assets/' + replacement);
console.log('OmniTools: native task heading, named logo and description; JS/CSS revision p7.');
