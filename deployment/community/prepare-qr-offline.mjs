import { readFileSync, writeFileSync } from 'node:fs';
// Mechanical packaging patch. Keep the upstream cache strategy.
const root = process.argv[2];
if (!root) throw new Error('Pass the image webroot');
let html = readFileSync(`${root}/index.html`, 'utf8');
if (!html.includes('</body>')) throw new Error('QR HTML changed; review insertion');
html = html.replace('</body>', '<script src="/js/utilibre-offline.js?v=p3" defer></script></body>');
writeFileSync(`${root}/index.html`, html);
let sw = readFileSync(`${root}/sw.js`, 'utf8');
if (!sw.includes("const VERSION = '1.0.1-utilibre-p2';") || !sw.includes('const STATIC_FILES = [')) throw new Error('QR worker changed; review patch');
sw = sw.replace("const VERSION = '1.0.1-utilibre-p2';", "const VERSION = '1.0.1-utilibre-p3';").replace('const STATIC_FILES = [', "const STATIC_FILES = [\n  '/js/utilibre-offline.js?v=p3',");
// Failed preparation must not activate an incomplete replacement worker.
sw = sw.replace("console.error('Error during install:', error);", "console.error('Error during install:', error); throw error;");
sw = sw.replace('const STATIC_FILES = [', "const STATIC_FILES = [\n  '/js/libs/FileSaver.min.js',");
writeFileSync(`${root}/sw.js`, sw);
