// Publish only reviewed, Git-indexed integration source; never runtime state.
import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdirSync, mkdtempSync, renameSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean).filter((file) =>
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
execFileSync('tar', ['-czf', `${stage}/utilibre-integration.tar.gz`, '--null', '-T', '-'], {
  cwd: root, input: files.join('\0') + '\0', stdio: ['pipe', 'inherit', 'inherit'],
});
renameSync(`${stage}/utilibre-integration.tar.gz`, destination);
copyFileSync(`${root}/deployment/toolbox/source-index.html`, `${stage}/index.html`);
renameSync(`${stage}/index.html`, '/opt/utilibre/toolbox-public/index.html');
console.log(`Published ${files.length} Git-indexed source files; previous archive preserved in ${stage}.`);
