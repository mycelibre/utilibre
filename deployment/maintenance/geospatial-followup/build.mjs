#!/usr/bin/env node
// Source verification and build orchestration only. No production deployment.
import { readFileSync, writeFileSync, mkdirSync, statfsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const recipe = fileURLToPath(new URL('.', import.meta.url)).replace(/\/$/, '');
const spec = JSON.parse(readFileSync(`${recipe}/spec.json`));
const run = (args, opts = {}) => {
  const p = spawnSync(args[0], args.slice(1), { encoding: 'utf8', maxBuffer: 16e6, ...opts });
  if (p.status !== 0) {
    writeFileSync(`${spec.work}/last-error.log`, `${p.stdout || ''}\n${p.stderr || ''}`, { mode: 0o600 });
    throw new Error(`${args[0]} ${args[1]} failed; see ${spec.work}/last-error.log`);
  }
  return p.stdout;
};
const hash = x => createHash('sha256').update(x).digest('hex');
const fs = statfsSync(spec.work);
if (fs.bavail * fs.bsize < spec.freeDiskFloorBytes + 5 * 1024 ** 3) throw new Error('Insufficient build/recovery disk budget');
if (run(['docker', 'inspect', '-f', '{{.Image}}', spec.targetContainer]).trim() !== spec.baseImage) throw new Error('Production base changed; rebase and repeat preservation checks');
const name = 'maintenance-postgis-native-20261012';
const action = process.argv[2] || '--prepare';
if (action === '--prepare') {
  mkdirSync(`${spec.work}/out`, { recursive: true, mode: 0o700 });
  const key = run(['docker', 'exec', spec.targetContainer, 'cat', '/usr/local/share/keyrings/postgres.gpg.asc']);
  if (hash(key) !== spec.pgdgKeySha256) throw new Error('Unexpected PGDG public key');
  writeFileSync(`${spec.work}/source/pgdg.asc`, key);
  const patch = readFileSync(`${spec.work}/source/upstream.patch`);
  if (hash(patch) !== spec.patchSha256) throw new Error('Unexpected upstream patch');
  writeFileSync(`${spec.work}/source/upstream.patch`, patch);
  run(['docker', 'run', '-d', '--name', name, '--cpus', String(spec.cpuLimit), '--memory', spec.memoryLimit,
    '--memory-swap', spec.memoryLimit, '--pids-limit', '256', '--security-opt', 'no-new-privileges', '--log-driver', 'none',
    '--mount', `type=bind,src=${spec.work},dst=/work`, '--mount', `type=bind,src=${recipe},dst=/recipe,readonly`,
    '--tmpfs', '/tmp:rw,size=256m', '--entrypoint', 'sleep', spec.builderImage, 'infinity']);
  const result = run(['docker', 'exec', name, 'sh', '/recipe/prepare.sh']);
  writeFileSync(`${spec.work}/prepare.log`, result);
  process.stdout.write('Builder prepared and archive Release signature authenticated.\n');
} else if (action === '--authenticate') {
  // Unsigned .dsc files in PGDG archive are authenticated via signed Release →
  // Sources.bz2 → exact source entry → each downloaded source file.
  run(['docker', 'exec', name, 'gpgv', '--keyring', '/work/pgdg.gpg', '/work/source/InRelease']);
  const release = readFileSync(`${spec.work}/source/InRelease`, 'utf8');
  const sum = release.split('SHA256:\n')[1]?.split('SHA512:')[0]?.match(/^ ([a-f0-9]{64})\s+\d+ main\/source\/Sources\.bz2$/m)?.[1];
  if (!sum || hash(readFileSync(`${spec.work}/source/Sources.bz2`)) !== sum) throw new Error('Archive source index digest mismatch');
  const sources = run(['bzip2', '-dc', `${spec.work}/source/Sources.bz2`]);
  const entry = sources.split('\n\n').filter(x => x.includes(`Package: ${spec.sourcePackage}\n`) && x.includes(`Version: ${spec.originalVersion}\n`));
  if (entry.length !== 1) throw new Error('Source version absent or ambiguous');
  const section = entry[0].split('Checksums-Sha256:')[1]?.split(/\n(?=[A-Z])/)[0];
  const receipts = [...(section || '').matchAll(/^ ([a-f0-9]{64})\s+(\d+) ([a-zA-Z0-9+_.-]+)$/gm)].map(([, sha256, size, filename]) => {
    const b = readFileSync(`${spec.work}/source/${filename}`);
    if (hash(b) !== sha256 || b.length !== Number(size)) throw new Error(`Source checksum mismatch: ${filename}`);
    return { filename, sha256, size: b.length };
  });
  if (receipts.length !== 3) throw new Error('Incomplete source receipt');
  writeFileSync(`${spec.work}/source/authenticated.json`, JSON.stringify({ date: new Date().toISOString(), origin: spec.sourceOrigin, distribution: spec.sourceDistribution, releaseSha256: hash(release), indexSha256: sum, keySha256: spec.pgdgKeySha256, receipts }, null, 2) + '\n');
  process.stdout.write('Exact PGDG source authenticated through signed archive index.\n');
} else throw new Error('Use --prepare or --authenticate');
