// Version the native deployment configuration and its loader. Cloudflare caches
// stable .js URLs for four hours; replacing their bytes alone delays fixes.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[2];
if (!root) throw new Error('Supply the extracted draw.io web directory');
const config = readFileSync(join(root, 'js/PreConfig.js'), 'utf8');
const revision = createHash('sha256').update(config).digest('hex').slice(0, 16);
const configName = `PreConfig.utilibre-${revision}.js`;
const bootstrapName = `bootstrap.utilibre-${revision}.js`;
const bootstrap = readFileSync(join(root, 'js/bootstrap.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
if (!bootstrap.includes('js/PreConfig.js') || !html.includes('js/bootstrap.js')) {
  throw new Error('Upstream loader changed; review before publishing');
}
writeFileSync(join(root, 'js', configName), config);
writeFileSync(join(root, 'js', bootstrapName), bootstrap.replaceAll('js/PreConfig.js', `js/${configName}`));
writeFileSync(join(root, 'index.html'), html.replaceAll('js/bootstrap.js', `js/${bootstrapName}`));
