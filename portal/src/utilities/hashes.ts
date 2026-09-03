import { sha256, sha512 } from '@noble/hashes/sha2.js';

export async function sha2Digests(bytes: ArrayBuffer, forceFallback = false): Promise<[Uint8Array, Uint8Array]> {
  if (!forceFallback && globalThis.crypto?.subtle) {
    const [native256, native512] = await Promise.all([
      globalThis.crypto.subtle.digest('SHA-256', bytes),
      globalThis.crypto.subtle.digest('SHA-512', bytes),
    ]);
    return [new Uint8Array(native256), new Uint8Array(native512)];
  }
  const input = new Uint8Array(bytes);
  return [sha256(input), sha512(input)];
}
