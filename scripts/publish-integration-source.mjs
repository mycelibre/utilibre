// Publish only committed integration source; never runtime state or unrelated
// edits left in the shared working tree.
import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { publishSourceIndex } from './publish-source-index.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const revision = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const files = execFileSync('git', ['ls-tree', '-r', '--name-only', '-z', revision], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).filter((file) =>
  /^(config|deployment|docs|portal|scripts|\.github\/workflows)\//.test(file) || /^(?:[^/]+\.md|LICENSE|compose\.yaml|\.env\.example|\.gitignore)$/.test(file));
for (const file of files) {
  if (/(^|\/)(?:secrets|backups|node_modules|dist|private)(\/|$)/.test(file)
      || /(^|\/)\.env(?:\.|$)/.test(file) && !/(^|\/)\.env\.example$/.test(file)
      || lstatSync(`${root}/${file}`).isSymbolicLink()) throw Error(`Unsafe source archive path: ${file}`);
}
if (files.length < 100) throw Error('Unexpectedly incomplete integration source list');
const destination = '/opt/utilibre/toolbox-public/utilibre-integration.tar.gz';
mkdirSync('/opt/utilibre/toolbox-public', { recursive: true });
const stage = mkdtempSync('/opt/utilibre/source-update-');
copyFileSync(destination, `${stage}/previous-utilibre-integration.tar.gz`);
copyFileSync('/opt/utilibre/toolbox-public/index.html', `${stage}/previous-index.html`);
execFileSync('git', ['archive', '--format=tar.gz', `--output=${stage}/utilibre-integration.tar.gz`, revision, '--', ...files], {
  cwd: root, stdio: ['ignore', 'inherit', 'inherit'],
});
renameSync(`${stage}/utilibre-integration.tar.gz`, destination);
publishSourceIndex();
console.log(`Published ${files.length} committed source files at ${revision}; previous archive preserved in ${stage}.`);
