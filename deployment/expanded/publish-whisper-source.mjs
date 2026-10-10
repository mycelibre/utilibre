// Publish the complete reviewed upstream tree with local changes, excluding
// generated binaries, models and developer/runtime state. Preserve prior source.
import { execFileSync } from 'node:child_process';
import { copyFileSync, lstatSync, mkdtempSync, renameSync } from 'node:fs';
const source = '/opt/utilibre/expanded-src/whisper-p7';
const revision = '81869ed62970ff4373509b6004a6c9a3f0c5b64d';
if (execFileSync('git', ['rev-parse','HEAD'], {cwd:source,encoding:'utf8'}).trim() !== revision) throw Error('Review the upstream revision first');
const files = execFileSync('git', ['ls-files','-z'], {cwd:source,encoding:'utf8'}).split('\0').filter(Boolean);
for (const file of files) {
  if (/(^|\/)(?:\.git|\.env|node_modules|dist|private|secrets|models|wasm)(\/|$)/.test(file) || lstatSync(`${source}/${file}`).isSymbolicLink()) throw Error(`Unexpected source path: ${file}`);
}
const destination = '/opt/utilibre/toolbox-public/whisper-web-utilibre.tar.gz';
const stage = mkdtempSync('/opt/utilibre/source-update-whisper-');
copyFileSync(destination, `${stage}/previous-whisper-web-utilibre.tar.gz`);
execFileSync('tar', ['-czf', `${stage}/whisper-web-utilibre.tar.gz`, '--null', '-T', '-'], {
  cwd:source,input:files.join('\0')+'\0',stdio:['pipe','inherit','inherit'],
});
renameSync(`${stage}/whisper-web-utilibre.tar.gz`, destination);
console.log(`Whisper source published; prior archive retained in ${stage}.`);
