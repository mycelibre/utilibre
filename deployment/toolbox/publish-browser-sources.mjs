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
  for (const name of ['prepare-browser-build.mjs', 'rawgraphs.yarn.lock', 'Dockerfile.browser', 'Dockerfile.rawgraphs', 'Dockerfile.audiomass', 'compose.browser.yaml', 'nginx-browser.conf', 'security-browser.conf', 'security-audio.conf', 'browser-manifest.json']) copyFileSync(root + name, `${integration}/${name}`);
  writeFileSync(`${integration}/BUILD.txt`, 'Utilibre integration, 7 October 2026. Upstream source and notices are preserved. Apply prepare-browser-build.mjs inside the upstream directory before building, as specified in the Dockerfile. RAWGraphs uses the supplied hardened yarn.lock. Compose documents private ports; adapt absolute source/integration paths for your system. No production secrets or visitor data are required.\n');
  const archive = `${app.id}-utilibre.tar.gz`;
  execFileSync('tar', ['-czf', `${stage}/${archive}`, '-C', stage, app.id]);
  if (existsSync(`${destination}/${archive}`)) copyFileSync(`${destination}/${archive}`, `${stage}/previous-${archive}`);
  renameSync(`${stage}/${archive}`, `${destination}/${archive}`);
  copyFileSync(`${source}/${app.licenseFile}`, `${destination}/${app.id}-LICENSE.txt`);
  console.log(`Published ${archive} (${app.revision})`);
}
copyFileSync('/opt/utilibre/src/audiomass/THIRD_PARTY_NOTICES.md', `${destination}/audiomass-THIRD_PARTY_NOTICES.txt`);
copyFileSync(root + 'source-index.html', `${destination}/index.html`);
