import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../secrets/', import.meta.url);
const anubisKeyFile = new URL('anubis-ed25519-key.hex', directory);

await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);

if (!existsSync(anubisKeyFile)) {
  await writeFile(anubisKeyFile, `${randomBytes(32).toString('hex')}\n`, { mode: 0o444, flag: 'wx' });
  process.stdout.write('Generated the Anubis signing key.\n');
} else {
  const key = (await readFile(anubisKeyFile, 'utf8')).trim();
  if (!/^[0-9a-f]{64}$/.test(key)) {
    throw new Error('The existing Anubis signing key is not exactly 32 lowercase hexadecimal bytes.');
  }
  await chmod(anubisKeyFile, 0o444);
  process.stdout.write('Existing Anubis signing key is valid; nothing changed.\n');
}
