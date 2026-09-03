import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(root, 'public', 'vendor', 'zxing_full.wasm');
await mkdir(dirname(destination), { recursive: true });
await copyFile(join(root, 'node_modules', 'zxing-wasm', 'dist', 'full', 'zxing_full.wasm'), destination);

for (const [sourceName, destinationName] of [
  ['LICENSE', 'LICENSE.txt'],
  ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.txt'],
]) {
  try {
    const legalDestination = join(root, 'public', 'legal', destinationName);
    await mkdir(dirname(legalDestination), { recursive: true });
    await copyFile(join(root, '..', sourceName), legalDestination);
  } catch (error) {
    // The Docker build context is portal/; committed synchronized copies are
    // already present there. A host/repository build has the parent files and
    // refreshes them before tests or image creation.
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
  }
}
