// One reviewed image-retirement batch, not an automatic age-based policy.
// Dry-run creates an exact-ID plan. Apply rechecks containers/configuration and never uses --force.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, statfsSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = '/home/ubuntu/freetools';
// Latest and documented previous release. See docs/seo-catalog-2026-10-09.md,
// service-pack.md, native-wording-2026-10-09.md, wbo-ram-update-2026-10-09.md,
// frontend-reliability-2026-10-09.md. Older historical rollback notes are superseded.
const reviewed = {
  'public-utility-portal': ['0.1.0-404-20261010', '0.1.0-service-semantics-20261010'],
  'utilibre-qr-offline': ['0fde700-p5', '0fde700-p4'],
  'utilibre-liberaforms': ['4.11.1-p6', '4.11.1-p5'],
  'utilibre-omnitools': ['0.6.0-p7', '0.6.0-p6'],
  'utilibre-bentopdf': ['2.8.8-p4', '2.8.8-p3'],
  'utilibre-drawio': ['32.0.2-p4', '32.0.2-p3'],
  'utilibre-whisper': ['81869ed-p7', '81869ed-p6'],
  'utilibre-wbo': ['2.9.0-p3', '2.9.0-p2'],
  'utilibre-translite': ['7b4b8e5-p3', '7b4b8e5-p2'],
  'utilibre-lrclib': ['f37c070-p3', 'f37c070-p2'],
  'utilibre-breezewiki': ['6d09507-p3', '6d09507-p2'],
  'utilibre-chhoto': ['7.8.3-p3', '7.8.3-p2'],
};
const docker = args => execFileSync('docker', args, { encoding: 'utf8', maxBuffer: 16 * 1024 ** 2, timeout: 120000 });
const list = args => [...new Set(docker(args).trim().split('\n').filter(Boolean))];
const free = () => { const d = statfsSync('/opt/utilibre'); return d.bavail * d.bsize; };
const imageRepo = tag => tag.slice(0, tag.lastIndexOf(':'));
function inventory() {
  const images = JSON.parse(docker(['image', 'inspect', ...list(['image', 'ls', '-aq', '--no-trunc'])]));
  const containers = JSON.parse(docker(['inspect', ...list(['ps', '-aq', '--no-trunc'])]));
  return { images, containers };
}
function protection({ images, containers }) {
  const protectedIds = new Set(containers.map(c => c.Image));
  const files = new Set(execFileSync('git', ['ls-files', '-z', 'deployment', 'compose.yaml'],
    { cwd: root, encoding: 'utf8' }).split('\0').filter(f => f && !/\.(md|json|patch)$/.test(f)).map(f => resolve(root, f)));
  // Inspect only known deployment files; never print their content or environments.
  files.add(`${root}/.env`);
  for (const c of containers) {
    for (const file of (c.Config.Labels?.['com.docker.compose.project.config_files'] || '').split(',').filter(Boolean)) files.add(file);
  }
  const texts = [...files].filter(existsSync).map(f => readFileSync(f, 'utf8'));
  for (const image of images) {
    if ([...(image.RepoTags || []), ...(image.RepoDigests || [])].some(ref => texts.some(text => text.includes(ref)))) protectedIds.add(image.Id);
  }
  for (const [repo, tags] of Object.entries(reviewed)) {
    for (const tag of tags) {
      const image = images.find(i => i.RepoTags?.includes(`${repo}:${tag}`));
      assert(image, `Required retained image missing: ${repo}:${tag}`);
      protectedIds.add(image.Id);
    }
  }
  return protectedIds;
}
function eligible(image, state, protectedIds) {
  if (protectedIds.has(image.Id) || !image.RepoTags?.length) return false;
  return image.RepoTags.every(tag => {
    const repo = imageRepo(tag), pair = reviewed[repo];
    if (!pair || pair.includes(tag.slice(repo.length + 1))) return false;
    const rollback = state.images.find(i => i.RepoTags?.includes(`${repo}:${pair[1]}`));
    return new Date(image.Created) < new Date(rollback.Created);
  });
}

process.umask(0o077);
assert.equal(process.cwd(), root, 'Run from the project root');
assert.equal(process.getuid(), 0, 'Run as root');
const args = process.argv.slice(2);
const state = inventory(), protectedIds = protection(state);
if (!args.length) {
  const dir = mkdtempSync('/opt/utilibre/reports/image-cleanup-');
  const candidates = state.images.filter(i => eligible(i, state, protectedIds))
    .map(({ Id, RepoTags, Created, Size }) => ({ id: Id, tags: RepoTags, created: Created, size: Size }));
  const plan = { createdAt: new Date().toISOString(), freeBytesBefore: free(), reviewed,
    containers: state.containers.map(c => ({ id: c.Id, image: c.Image, running: c.State.Running, startedAt: c.State.StartedAt })),
    protectedImages: [...protectedIds], candidates };
  writeFileSync(`${dir}/plan.json`, JSON.stringify(plan, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ plan: `${dir}/plan.json`, count: candidates.length, candidates: candidates.map(c => c.tags) }, null, 2));
} else {
  assert.equal(args.length, 2); assert.equal(args[0], '--apply');
  assert.match(args[1], /^\/opt\/utilibre\/reports\/image-cleanup-[A-Za-z0-9]+\/plan\.json$/);
  const plan = JSON.parse(readFileSync(args[1], 'utf8'));
  assert(Date.now() - Date.parse(plan.createdAt) < 3600000, 'Plan is stale');
  assert.deepEqual(plan.reviewed, reviewed);
  for (const c of plan.candidates) {
    const current = state.images.find(i => i.Id === c.id);
    assert(current && eligible(current, state, protectedIds), 'Candidate is no longer safe to remove');
    assert.deepEqual(current.RepoTags, c.tags);
  }
  const result = { date: new Date().toISOString(), freeBytesBefore: free(), removed: [], failures: [] };
  const resultPath = args[1].replace('plan.json', 'result.json');
  const record = () => writeFileSync(resultPath, JSON.stringify(result, null, 2), { mode: 0o600 });
  record();
  for (const c of plan.candidates) {
    try {
      // Container reference recheck immediately before each removal; Docker also refuses conflicts.
      const used = new Set(JSON.parse(docker(['inspect', ...list(['ps', '-aq'])])).map(container => container.Image));
      assert(!used.has(c.id));
      for (const tag of c.tags) assert.equal(JSON.parse(docker(['image', 'inspect', tag]))[0].Id, c.id);
      docker(['image', 'rm', '--no-prune', ...c.tags]);
      result.removed.push(c);
    } catch { result.failures.push({ id: c.id, tags: c.tags }); record(); break; }
    record();
  }
  const after = inventory();
  result.retainedImagesPresent = [...protectedIds].every(id => after.images.some(i => i.Id === id));
  result.containersUnchanged = state.containers.every(before => after.containers.some(c =>
    c.Id === before.Id && c.Image === before.Image && c.State.Running === before.State.Running && c.State.StartedAt === before.State.StartedAt));
  result.freeBytesAfter = free(); record();
  console.log(JSON.stringify({ report: resultPath, removed: result.removed.length, failures: result.failures.length,
    retainedImagesPresent: result.retainedImagesPresent, containersUnchanged: result.containersUnchanged,
    freeGiB: result.freeBytesAfter / 1024 ** 3, recoveredGiB: (result.freeBytesAfter - result.freeBytesBefore) / 1024 ** 3 }));
  assert(!result.failures.length && result.retainedImagesPresent && result.containersUnchanged, 'Cleanup verification needs review');
}
