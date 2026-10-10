import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const integration = fileURLToPath(new URL('./', import.meta.url));
const source = '/opt/utilibre/src/moocup';
const revision = '70623d81ba502a464fdd2b98c6c21b1c5ab973bc';
const stage = mkdtempSync('/opt/utilibre/moocup-source-');
try {
  execFileSync('git', ['archive', '--format=tar', '--prefix=moocup/', '--output', stage + '/upstream.tar', revision], { cwd: source });
  execFileSync('tar', ['-xf', stage + '/upstream.tar', '-C', stage]);
  mkdirSync(stage + '/moocup/utilibre');
  cpSync(integration, stage + '/moocup/utilibre/moocup', { recursive: true });
  cpSync(source + '/node_modules/@fontsource-variable/recursive/LICENSE', stage + '/moocup/utilibre/recursive-OFL.txt');
  writeFileSync(stage + '/moocup/utilibre/BUILD.txt', 'Upstream Moocup tag 1.0.50, revision ' + revision + ', MIT. Utilibre 1.0.50-p1 removes analytics, packages Recursive locally, scopes storage/base paths, adds a portal link and accessible mobile control labels; compatible pinned dependency updates. Apply utilibre/moocup/local-source.patch with git apply --unidiff-zero to the unmodified source. Then Node 24, npm exec --yes --package=pnpm@10.20.0 -- pnpm install --frozen-lockfile; pnpm check; pnpm build. build.sh requires a git checkout of the pinned commit. Output is static build/ at /apps/moocup/. No credentials required. Recursive is OFL-1.1; html2canvas is MIT. No server application, image upload endpoint or user database is deployed.\n');
  execFileSync('tar', ['-czf', stage + '/moocup-utilibre.tar.gz', '-C', stage, 'moocup']);
  renameSync(stage + '/moocup-utilibre.tar.gz', '/opt/utilibre/toolbox-public/moocup-utilibre.tar.gz');
} finally { rmSync(stage, { recursive: true, force: true }); }
