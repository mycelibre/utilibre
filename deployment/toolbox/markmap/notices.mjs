// Build-time only: retain license texts from every resolved npm package.
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
let notices = 'Utilibre Markmap integration, AGPL-3.0-or-later (same license as the Utilibre repository). Upstream Markmap 0.18.12, MIT.\nSource, license text and reproducible build: /utilibre-source/markmap-utilibre.tar.gz\n\n';
for (const name of Object.keys(lock.packages).filter((name) => name.startsWith('node_modules/')).sort()) {
  if (!existsSync(join(name, 'package.json'))) continue;
  const pkg = JSON.parse(readFileSync(join(name, 'package.json'), 'utf8'));
  notices += `\n=== ${pkg.name}@${pkg.version} (${pkg.license || 'See upstream notices'}) ===\n`;
  for (const file of readdirSync(name).filter((file) => /^(?:licen[sc]e|copying|notice|ofl)(?:[.\-_]|$)/i.test(file))) {
    try { notices += readFileSync(join(name, file), 'utf8') + '\n'; } catch { /* Some packages use a license directory. */ }
  }
}
writeFileSync('dist/THIRD_PARTY_NOTICES.txt', notices);
