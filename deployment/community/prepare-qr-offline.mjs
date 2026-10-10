import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
// Mechanical packaging patch. Keep the upstream cache strategy.
const root = process.argv[2];
if (!root) throw new Error('Pass the image webroot');
let html = readFileSync(`${root}/index.html`, 'utf8');
if (!html.includes('</body>')) throw new Error('QR HTML changed; review insertion');
html = html.replace('</body>', '<script src="/js/utilibre-offline.js?v=p4" defer></script></body>');
// Use the application's existing data-i18n translation mechanism for options.
const choices = [
  ['128', 'size128', '128×128 — Small', '128×128 — Pequeño'],
  ['256', 'size256', '256×256 — Standard', '256×256 — Estándar'],
  ['512', 'size512', '512×512 — Large', '512×512 — Grande'],
  ['1024', 'size1024', '1024×1024 — HD', '1024×1024 — Alta resolución'],
  ['L', 'errorL', 'Low (7%) — More data', 'Baja (7 %) — Más datos'],
  ['M', 'errorM', 'Medium (15%) — Balanced', 'Media (15 %) — Equilibrada'],
  ['Q', 'errorQ', 'High (25%) — More robust', 'Alta (25 %) — Más resistente'],
  ['H', 'errorH', 'Maximum (30%) — Very robust', 'Máxima (30 %) — Muy resistente'],
];
for (const [value, key, en] of choices) {
  const pattern = new RegExp(`(<option value="${value}"(?: selected)?)>([^<]+)</option>`, 'g');
  if (!pattern.test(html)) throw new Error(`QR option changed: ${key}`);
  html = html.replace(pattern, `$1 data-i18n="choice.${key}">${en}</option>`);
}
for (const file of readdirSync(`${root}/js/langs`).filter(file => file.endsWith('.js'))) {
  const path = `${root}/js/langs/${file}`, source = readFileSync(path, 'utf8');
  if (!source.includes('export default {')) throw new Error(`QR translations changed: ${file}`);
  const entries = choices.map(([, key, en, es]) => `  ${JSON.stringify(`choice.${key}`)}: ${JSON.stringify(file === 'es.js' ? es : en)},`).join('\n');
  writeFileSync(path, source.replace('export default {', `export default {\n${entries}`));
}
writeFileSync(`${root}/index.html`, html);
let sw = readFileSync(`${root}/sw.js`, 'utf8');
if (!sw.includes("const VERSION = '1.0.1-utilibre-p2';") || !sw.includes('const STATIC_FILES = [')) throw new Error('QR worker changed; review patch');
sw = sw.replace("const VERSION = '1.0.1-utilibre-p2';", "const VERSION = '1.0.1-utilibre-p4';").replace('const STATIC_FILES = [', "const STATIC_FILES = [\n  '/js/utilibre-offline.js?v=p4',");
// Failed preparation must not activate an incomplete replacement worker.
sw = sw.replace("console.error('Error during install:', error);", "console.error('Error during install:', error); throw error;");
sw = sw.replace('const STATIC_FILES = [', "const STATIC_FILES = [\n  '/js/libs/FileSaver.min.js',");
writeFileSync(`${root}/sw.js`, sw);
