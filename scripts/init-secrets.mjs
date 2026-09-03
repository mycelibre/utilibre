import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises';

const directory = new URL('../secrets/', import.meta.url);
const gatewayFile = new URL('portal-cobalt-key', directory);
const keysFile = new URL('cobalt-keys.json', directory);
const anubisKeyFile = new URL('anubis-ed25519-key.hex', directory);
const gatewayExists = existsSync(gatewayFile);
const keysExist = existsSync(keysFile);
const generatedServices = ['youtube', 'tiktok', 'twitter', 'instagram', 'reddit', 'pinterest', 'bsky', 'dailymotion', 'facebook'];

if (gatewayExists !== keysExist) {
  throw new Error('Only one Cobalt secret file exists. Reconcile or remove the incomplete pair manually; nothing was overwritten.');
}

await mkdir(directory, { recursive: true, mode: 0o700 });
// mkdir's mode does not tighten a directory that already exists.
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
if (!gatewayExists) {
  const key = randomUUID();
  const keyDatabase = {
    [key]: {
      name: 'portal-gateway',
      allowedServices: generatedServices,
    },
  };
  // Compose implements local secrets as bind-mounted files. The enclosing
  // directory is 0700 on the host; 0444 lets the containers' non-root users
  // read the mounted files without making the directory traversable locally.
  await writeFile(gatewayFile, `${key}\n`, { mode: 0o444, flag: 'wx' });
  await writeFile(keysFile, `${JSON.stringify(keyDatabase, null, 2)}\n`, { mode: 0o444, flag: 'wx' });
  process.stdout.write('Generated matching Cobalt secrets.\n');
} else {
  const key = (await readFile(gatewayFile, 'utf8')).trim();
  const database = JSON.parse(await readFile(keysFile, 'utf8'));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key) || !Object.hasOwn(database, key)) {
    throw new Error('Existing Cobalt secret files do not contain a matching UUIDv4.');
  }
  if (Object.keys(database).length !== 1) {
    throw new Error('The managed Cobalt key database must contain exactly the one portal gateway key.');
  }
  const details = database[key];
  if (!details || typeof details !== 'object' || Array.isArray(details) || details.name !== 'portal-gateway') {
    throw new Error('The managed Cobalt key must have the exact portal-gateway identity.');
  }
  let migrated = false;
  if (details?.name === 'portal-gateway' && Object.hasOwn(details, 'limit')) {
    // A per-key limit overrides Cobalt's documented RATELIMIT_MAX setting.
    // This managed key deliberately inherits the operator's environment limit.
    delete details.limit;
    migrated = true;
  }
  if (details?.name === 'portal-gateway' && Array.isArray(details.allowedServices) && details.allowedServices.includes('bluesky')) {
    details.allowedServices = details.allowedServices.map((service) => service === 'bluesky' ? 'bsky' : service);
    migrated = true;
  }
  const fields = Object.keys(details).sort();
  const allowed = Array.isArray(details.allowedServices) ? [...new Set(details.allowedServices)] : [];
  if (fields.length !== 2 || fields[0] !== 'allowedServices' || fields[1] !== 'name') {
    throw new Error('The managed Cobalt key contains an unexpected field; only name and allowedServices are permitted.');
  }
  if (allowed.length !== generatedServices.length || generatedServices.some((service) => !allowed.includes(service))) {
    throw new Error('The managed Cobalt key must contain exactly the reviewed allowedServices set.');
  }
  if (migrated) {
    await chmod(keysFile, 0o600);
    await writeFile(keysFile, `${JSON.stringify(database, null, 2)}\n`, { mode: 0o444 });
    process.stdout.write('Migrated the managed Cobalt key to the current exact schema.\n');
  }
  await Promise.all([chmod(gatewayFile, 0o444), chmod(keysFile, 0o444)]);
  process.stdout.write(migrated ? 'Managed matching Cobalt secrets are valid after migration.\n' : 'Existing matching Cobalt secrets are valid; nothing changed.\n');
}
