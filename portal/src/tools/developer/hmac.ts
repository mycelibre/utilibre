import { utf8Bytes } from './encoding';

export type HmacAlgorithm = 'SHA-256' | 'SHA-384' | 'SHA-512';
export type JwtHmacAlgorithm = 'HS256' | 'HS384' | 'HS512';

const JWT_TO_WEB_CRYPTO: Readonly<Record<JwtHmacAlgorithm, HmacAlgorithm>> = {
  HS256: 'SHA-256',
  HS384: 'SHA-384',
  HS512: 'SHA-512',
};

export function jwtHmacAlgorithm(value: string): HmacAlgorithm | null {
  return Object.hasOwn(JWT_TO_WEB_CRYPTO, value)
    ? JWT_TO_WEB_CRYPTO[value as JwtHmacAlgorithm]
    : null;
}

export async function hmacSign(
  value: Uint8Array,
  secret: string | Uint8Array,
  algorithm: HmacAlgorithm,
): Promise<Uint8Array> {
  const key = await importHmacKey(secret, algorithm, ['sign']);
  return new Uint8Array(await globalThis.crypto.subtle.sign('HMAC', key, webCryptoBytes(value)));
}

export async function hmacVerify(
  value: Uint8Array,
  signature: Uint8Array,
  secret: string | Uint8Array,
  algorithm: HmacAlgorithm,
): Promise<boolean> {
  const key = await importHmacKey(secret, algorithm, ['verify']);
  return globalThis.crypto.subtle.verify('HMAC', key, webCryptoBytes(signature), webCryptoBytes(value));
}

async function importHmacKey(
  secret: string | Uint8Array,
  algorithm: HmacAlgorithm,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  const bytes = webCryptoBytes(typeof secret === 'string' ? utf8Bytes(secret) : secret);
  if (bytes.length === 0) throw new Error('The HMAC secret cannot be empty.');
  return globalThis.crypto.subtle.importKey(
    'raw',
    bytes,
    { name: 'HMAC', hash: algorithm },
    false,
    usages,
  );
}

function webCryptoBytes(value: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(value.byteLength);
  copy.set(value);
  return copy;
}
