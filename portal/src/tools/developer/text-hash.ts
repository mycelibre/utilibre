import { bytesToBase64, bytesToHex, utf8Bytes } from './encoding';

export type TextHashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';
export type HashEncoding = 'hex' | 'base64';

export async function hashText(
  value: string,
  algorithm: TextHashAlgorithm,
  encoding: HashEncoding = 'hex',
): Promise<string> {
  const bytes = utf8Bytes(value);
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const digest = new Uint8Array(await globalThis.crypto.subtle.digest(algorithm, input));
  return encoding === 'hex' ? bytesToHex(digest) : bytesToBase64(digest);
}
