// Candidate image creation only. Never changes a running service or compose pin.
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync, readFileSync, statfsSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

process.umask(0o077);
const recipe = fileURLToPath(new URL('.', import.meta.url));
const dependencyReview = process.argv[2] === '--dependencies';
assert(!process.argv[2] || dependencyReview, 'Use no argument or --dependencies');
const directory = '/var/lib/utilibre-maintenance/gosu-security-20261011' + (dependencyReview ? '/dependencies' : '');
const artifact = directory + '/artifact';
const compiler = 'golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade';
const images = JSON.parse(readFileSync(recipe + 'images.json'));
if (dependencyReview) for (const image of images) image.candidate += '-p2';
mkdirSync(artifact, {recursive: true, mode: 0o700});
function space() {
  const s = statfsSync(directory);
  assert(s.bavail * s.bsize >= 8 * 1024 ** 3, 'Preserve 8 GiB recovery floor');
}
function docker(args) {
  try { return execFileSync('docker', args, {encoding: 'utf8', timeout: 300000, maxBuffer: 4 * 1024 ** 2, stdio: ['ignore', 'pipe', 'pipe']}); }
  catch (error) {
    // Compiler output is code-only; don't print Docker invocation/environment.
    writeFileSync(directory + '/build-error.txt', ('Exit: ' + error.status + '\n' + String(error.stdout || '') + String(error.stderr || '')).slice(0, 64000), {mode: 0o600});
    throw Error('Gosu candidate build failed; inspect private build diagnostic.');
  }
}
space();
for (const image of images) assert.equal(JSON.parse(docker(['image', 'inspect', image.base]))[0].Id, image.baseId, 'Base image changed: ' + image.kind);
docker(['run', '--rm', '--name', 'maintenance-gosu-build', '--cpus', '1', '--memory', '2g', '--pids-limit', '128', '--log-driver', 'none', '--read-only',
  '--tmpfs', '/work:rw,exec,size=1200m', '--tmpfs', '/tmp:rw,exec,size=128m',
  '--mount', 'type=bind,src=' + recipe.replace(/\/$/, '') + ',dst=/recipe,readonly',
  '--mount', 'type=bind,src=' + artifact + ',dst=/out', '-e', 'GOSU_DEPENDENCY_REVIEW=' + (dependencyReview ? '1' : '0'), '--entrypoint', 'sh', compiler, '/recipe/compile.sh']);
const binarySha256 = createHash('sha256').update(readFileSync(artifact + '/gosu')).digest('hex');
const rows = [];
for (const image of images) {
  space();
  docker(['build', '--pull=false', '-f', recipe + 'Dockerfile', '--build-arg', 'BASE=' + image.base, '-t', image.candidate, artifact]);
  const candidate = JSON.parse(docker(['image', 'inspect', image.candidate]))[0];
  rows.push({...image, candidateId: candidate.Id});
  console.log('Built helper-only candidate: ' + image.candidate);
}
writeFileSync(directory + '/build.json', JSON.stringify({date: new Date().toISOString(), status: 'built-not-tested', deployed: false,
  compiler, dependencyReview, source: 'https://github.com/tianon/gosu/tree/1.19', sourceCommit: '6456aaa0f3c854d199d0f037f068eb97515b7513',
  sourceArchiveSha256: 'cd9719b775dbfedae53923c9b0dc792b66d42c51e0b36652ed6f747fbadc0164', binarySha256, rows}, null, 2) + '\n', {mode: 0o600});
console.log('Candidate images only; native checks and release decision remain required.');
