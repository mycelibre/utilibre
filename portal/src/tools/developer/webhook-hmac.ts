import { base64ToBytes, bytesToBase64, hexToBytes, utf8Bytes } from './encoding';
import { hmacVerify, type HmacAlgorithm } from './hmac';

export type SignatureEncoding = 'hex' | 'base64';
export type WebhookPayloadEncoding = 'utf-8' | 'base64';

export const WEBHOOK_PAYLOAD_MAX_BYTES = 1_048_576;
export const WEBHOOK_BASE64_MAX_CHARACTERS = 4 * Math.ceil(WEBHOOK_PAYLOAD_MAX_BYTES / 3);

export interface ParsedWebhookSignature {
  bytes: Uint8Array;
  prefix: string | null;
}

export interface WebhookHmacVerification {
  valid: boolean;
  prefix: string | null;
}

const EXPECTED_PREFIXES: Readonly<Record<HmacAlgorithm, readonly string[]>> = {
  'SHA-256': ['sha256', 'sha-256'],
  'SHA-384': ['sha384', 'sha-384'],
  'SHA-512': ['sha512', 'sha-512'],
};

export function decodeWebhookPayload(
  value: string,
  encoding: WebhookPayloadEncoding,
  maximumBytes = WEBHOOK_PAYLOAD_MAX_BYTES,
): Uint8Array {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 0) throw new Error('The payload byte limit is invalid.');
  if (encoding === 'utf-8') {
    if (value.length > maximumBytes) throw new Error(`The payload exceeds ${maximumBytes} bytes.`);
    const bytes = utf8Bytes(value);
    if (bytes.byteLength > maximumBytes) throw new Error(`The payload exceeds ${maximumBytes} bytes.`);
    return bytes;
  }

  const maximumBase64Characters = 4 * Math.ceil(maximumBytes / 3);
  if (value.length > maximumBase64Characters) throw new Error(`The decoded payload exceeds ${maximumBytes} bytes.`);
  if (/\s/.test(value)) throw new Error('The Base64 payload must not contain whitespace.');
  const bytes = base64ToBytes(value);
  if (bytes.byteLength > maximumBytes) throw new Error(`The decoded payload exceeds ${maximumBytes} bytes.`);
  if (bytesToBase64(bytes) !== value) throw new Error('The Base64 payload is not in canonical padded form.');
  return bytes;
}

export function parseWebhookSignature(value: string, encoding: SignatureEncoding): ParsedWebhookSignature {
  const trimmed = value.trim();
  const prefixed = trimmed.match(/^(sha-?(?:256|384|512))=(.+)$/i);
  const prefix = prefixed?.[1]?.toLowerCase() ?? null;
  const encoded = prefixed?.[2]?.trim() ?? trimmed;
  if (!encoded) throw new Error('The signature cannot be empty.');

  return {
    bytes: encoding === 'hex' ? hexToBytes(encoded) : base64ToBytes(encoded),
    prefix,
  };
}

export async function verifyWebhookHmac(
  payload: string | Uint8Array,
  signature: string,
  secret: string | Uint8Array,
  algorithm: HmacAlgorithm,
  encoding: SignatureEncoding,
): Promise<WebhookHmacVerification> {
  const parsed = parseWebhookSignature(signature, encoding);
  if (parsed.prefix && !EXPECTED_PREFIXES[algorithm].includes(parsed.prefix)) {
    return { valid: false, prefix: parsed.prefix };
  }
  const bytes = typeof payload === 'string' ? utf8Bytes(payload) : payload;
  return {
    valid: await hmacVerify(bytes, parsed.bytes, secret, algorithm),
    prefix: parsed.prefix,
  };
}
