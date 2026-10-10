// Packaging metadata only; no editor state, scripts or indexing policy changes.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
const descriptions = {
  gravity: 'Explore gravity and orbital motion with an interactive browser simulation. Follow the built-in tour and try its examples.',
  knit: 'Follow a knitting pattern and track the current row in your browser. Save the complete page link to keep your pattern settings.',
  'one-file-core': 'Download a standalone diagram editor. Edit your diagram locally and save an editable HTML copy on your device.',
  'one-file-core-es': 'Descargá un editor de diagramas independiente. Editá tu diagrama localmente y guardá una copia HTML editable en tu dispositivo.',
};
const [kind, path] = process.argv.slice(2);
assert(Object.hasOwn(descriptions, kind) && path, 'Choose a supported application and a staged index.html');
const html = readFileSync(path, 'utf8');
const tag = `<meta name="description" content="${descriptions[kind]}">`;
if (!html.includes(tag)) {
  assert(!/<meta\b[^>]*name=["']description["']/i.test(html), 'Review existing description');
  assert(html.includes('</head>'), 'Missing HTML head');
  writeFileSync(path, html.replace('</head>', `${tag}\n</head>`));
}
