// The source directory is mounted read-only on several application origins.
// Keep its favicon same-origin; do not inherit an application's root favicon
// or weaken its CSP to fetch the portal's icon across origins.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export function publishSourceIndex(destination = '/opt/utilibre/toolbox-public') {
  mkdirSync(destination, { recursive: true });
  const stage = mkdtempSync(resolve(destination, '../source-index-update-'));
  const files = [
    ['portal/public/brand/favicon/favicon.ico', 'utilibre-favicon.ico'],
    ['portal/public/brand/favicon/utilibre-appicon-simple.svg', 'utilibre-appicon-simple.svg'],
    ['deployment/toolbox/source-index.html', 'index.html'],
  ];
  for (const [source, name] of files) {
    if (existsSync(`${destination}/${name}`)) copyFileSync(`${destination}/${name}`, `${stage}/previous-${name}`);
    copyFileSync(`${root}/${source}`, `${stage}/${name}`);
  }
  // Assets arrive before the HTML that refers to them. Preserve prior files.
  for (const [, name] of files) renameSync(`${stage}/${name}`, `${destination}/${name}`);
  return stage;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Source index published; previous files retained in ${publishSourceIndex()}.`);
}
