// Publish pinned upstream source and the exact integration/build recipes together.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, copyFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('./', import.meta.url));
const { apps } = JSON.parse(readFileSync(root + 'browser-manifest.json'));
const stage = mkdtempSync('/opt/utilibre/browser-source-');
const destination = '/opt/utilibre/toolbox-public';
for (const app of apps) {
  const source = `/opt/utilibre/src/${app.id}`;
  if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: source, encoding: 'utf8' }).trim() !== app.revision) throw Error(`Source pin mismatch: ${app.id}`);
  const tar = `${stage}/${app.id}.tar`;
  execFileSync('git', ['archive', '--format=tar', `--prefix=${app.id}/`, '--output', tar, app.revision], { cwd: source });
  execFileSync('tar', ['-xf', tar, '-C', stage]);
  const integration = `${stage}/${app.id}/utilibre`;
  mkdirSync(integration);
  for (const name of ['prepare-creative-build.mjs', 'harden-creative-deps.mjs', 'cyberchef-local.js', 'excalidraw-LICENSE.txt', 'Dockerfile.excalidraw', 'Dockerfile.svgedit', 'Dockerfile.cyberchef', 'Dockerfile.image-scrubber', 'check-creative-tools.mjs']) copyFileSync(root + name, `${integration}/${name}`);
  if (app.id === 'cyberchef') writeFileSync(`${integration}/RELEASE.txt`, `Official release artifact: https://github.com/gchq/CyberChef/releases/download/${app.release}/${app.asset}\nSHA-256: ${app.sha256}\nPlace it in the compose artifacts build context. Docker verifies the checksum before extraction.\n`);
  for (const name of ['prepare-browser-build.mjs', 'rawgraphs.yarn.lock', 'Dockerfile.browser', 'Dockerfile.rawgraphs', 'Dockerfile.audiomass', 'compose.browser.yaml', 'nginx-browser.conf', 'security-browser.conf', 'security-audio.conf', 'browser-manifest.json']) copyFileSync(root + name, `${integration}/${name}`);
  writeFileSync(`${integration}/BUILD.txt`, 'Utilibre integration, 7 October 2026. Upstream source and notices are preserved. Use the application-specific Dockerfile selected in compose.browser.yaml: it applies prepare-browser-build.mjs or prepare-creative-build.mjs inside the source directory. Excalidraw/SVGEdit use harden-creative-deps.mjs before installing; all replacement package versions and integrity hashes are fixed. RAWGraphs uses the supplied hardened yarn.lock. CyberChef uses the checksum-verified official release plus the included configuration adapter. Compose documents private ports; adapt absolute source/integration paths for your system. No production secrets or visitor data are required.\n');
  const archive = `${app.id}-utilibre.tar.gz`;
  execFileSync('tar', ['-czf', `${stage}/${archive}`, '-C', stage, app.id]);
  if (existsSync(`${destination}/${archive}`)) copyFileSync(`${destination}/${archive}`, `${stage}/previous-${archive}`);
  renameSync(`${stage}/${archive}`, `${destination}/${archive}`);
  copyFileSync(`${source}/${app.licenseFile}`, `${destination}/${app.id}-LICENSE.txt`);
  console.log(`Published ${archive} (${app.revision})`);
}
copyFileSync('/opt/utilibre/src/audiomass/THIRD_PARTY_NOTICES.md', `${destination}/audiomass-THIRD_PARTY_NOTICES.txt`);
copyFileSync(root + 'source-index.html', `${destination}/index.html`);
