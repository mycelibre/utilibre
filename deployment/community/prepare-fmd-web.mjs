// Build a versioned native FMD web override; do not change the running container.
// Node 24 and Corepack are required. pnpm and all web dependencies use upstream pins.
import { execFileSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const revision = '224b60c0756ff363bc19063082a8a1543559cf96';
const source = process.env.UTILIBRE_FMD_WEB_SOURCE || '/opt/utilibre/community-src/fmd-server-utilibre-p1';
const output = resolve(process.argv[2] || '/opt/utilibre/community-data/fmd-web-v0.17.0-p3');
if (existsSync(output)) throw new Error('Refusing to overwrite a versioned web directory; choose a new output path.');
if (!existsSync(source)) {
  mkdirSync(dirname(source), { recursive: true });
  execFileSync('git', ['clone', '--no-checkout', 'https://gitlab.com/fmd-foss/fmd-server.git', source], { stdio: 'inherit' });
  execFileSync('git', ['-C', source, 'checkout', '--detach', revision], { stdio: 'inherit' });
}
if (execFileSync('git', ['-C', source, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== revision) throw new Error('Unexpected FMD source revision.');
for (const name of ['fmd-privacy-source.patch', 'fmd-export-zero-source.patch', 'fmd-map-policy-source.patch']) {
  const patch = resolve(here, name);
  try {
    execFileSync('git', ['-C', source, 'apply', '--reverse', '--check', patch], { stdio: 'pipe' });
  } catch {
    execFileSync('git', ['-C', source, 'apply', '--check', patch], { stdio: 'inherit' });
    execFileSync('git', ['-C', source, 'apply', patch], { stdio: 'inherit' });
  }
}
const web = resolve(source, 'web');
const packageManager = JSON.parse(readFileSync(resolve(web, 'package.json'), 'utf8')).packageManager;
if (packageManager !== 'pnpm@11.20.0') throw new Error('Unexpected FMD package manager pin.');
for (const args of [['pnpm', 'install', '--frozen-lockfile'], ['pnpm', 'run', 'build']]) {
  execFileSync('corepack', args, { cwd: web, env: { ...process.env, CI: 'true' }, stdio: 'inherit' });
}
cpSync(resolve(web, 'dist'), output, { recursive: true, errorOnExist: true, force: false });
// All files in this output are public frontend assets; the native server runs as UID 1000.
function publicAssetPermissions(directory) {
  chmodSync(directory, 0o755);
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) publicAssetPermissions(path);
    else if (entry.isFile()) chmodSync(path, 0o644);
    else throw new Error('Unexpected non-file in native frontend output.');
  }
}
publicAssetPermissions(output);
console.log(`Prepared native FMD web override: ${output}`);
console.log('Keep the upstream server image and mount this directory read-only with its native --web-dir option.');
