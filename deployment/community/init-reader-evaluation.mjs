import { mkdir, writeFile, chmod, access } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
const directory = '/opt/utilibre/community-data/overflow-private';
await mkdir(directory, { recursive: true, mode: 0o700 });
await chmod(directory, 0o700);
const file = `${directory}/runtime.env`;
let exists = true;
try { await access(file); } catch { exists = false; }
if (!exists) await writeFile(file, `JWT_SIGNING_SECRET=${randomBytes(48).toString('base64url')}\n`, { flag: 'wx', mode: 0o600 });
console.log('AnonymousOverflow evaluation signing secret prepared privately.');
