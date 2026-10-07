// Exact upstream source plus this integration, never runtime data or secrets.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, cpSync, copyFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./', import.meta.url));
const revision = '205367a24603dc187f67da1658940c6cade20dce'; // npm 0.18.12 gitHead
const stage = mkdtempSync('/opt/utilibre/markmap-source-');
execFileSync('git', ['archive', '--format=tar', '--prefix=markmap/', '--output', `${stage}/upstream.tar`, revision], { cwd: '/opt/utilibre/src/markmap' });
execFileSync('tar', ['-xf', `${stage}/upstream.tar`, '-C', stage]);
const integration = `${stage}/markmap/utilibre`;
mkdirSync(integration);
cpSync(root + 'markmap', `${integration}/markmap`, { recursive: true, filter: source => !/(?:^|\/)(?:node_modules|dist|test-results)(?:\/|$)/.test(source) });
for (const name of ['Dockerfile.markmap', 'security-markmap.conf', 'nginx-browser.conf', 'compose.browser.yaml', 'check-markmap.mjs', 'publish-markmap-source.mjs']) copyFileSync(root + name, `${integration}/${name}`);
copyFileSync(root + '../../LICENSE', `${integration}/LICENSE`);
copyFileSync(root + '../../docs/licenses.md', `${integration}/LICENSE_DETAILS.md`);
mkdirSync(`${integration}/branding/svg`, { recursive: true });
copyFileSync(root + '../../portal/public/brand/svg/utilibre-logo-coral.svg', `${integration}/branding/svg/utilibre-logo-coral.svg`);
copyFileSync(root + '../../portal/public/brand/README.txt', `${integration}/branding/README.txt`);
writeFileSync(`${integration}/BUILD.txt`, 'Utilibre integration is AGPL-3.0-or-later; upstream Markmap remains MIT. npm 0.18.12 source gitHead: ' + revision + '. Use npm ci --ignore-scripts && npm run build in utilibre/markmap, or Dockerfile.markmap with markmap as context. Lockfile pins all npm dependencies. No runtime secrets are needed. Public assets and dependency license notices are in dist/. Serve using the included nginx and CSP configuration. Keep remote images, plugins and frontmatter asset loading disabled.\n');
const destination = '/opt/utilibre/toolbox-public/markmap-utilibre.tar.gz';
execFileSync('tar', ['-czf', `${stage}/markmap-utilibre.tar.gz`, '-C', stage, 'markmap']);
if (existsSync(destination)) copyFileSync(destination, `${stage}/previous.tar.gz`);
renameSync(`${stage}/markmap-utilibre.tar.gz`, destination);
console.log(`Published ${destination}; source ${revision}; previous artifact retained in ${stage}`);
