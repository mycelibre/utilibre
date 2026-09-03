import {
  base64UrlToBytes,
  bytesToBase64Url,
  utf8Bytes,
  utf8Text,
} from './encoding';
import {
  hmacSign,
  hmacVerify,
  jwtHmacAlgorithm,
  type JwtHmacAlgorithm,
} from './hmac';

export type JsonObject = Record<string, unknown>;

export interface DecodedJwt {
  header: JsonObject;
  payload: JsonObject;
  signature: Uint8Array;
  encodedHeader: string;
  encodedPayload: string;
  encodedSignature: string;
}

export type JwtTimeState = 'past' | 'future' | 'now';

export interface JwtClaimInspection {
  name: string;
  value: unknown;
  kind: 'audience' | 'identifier' | 'issuer' | 'numeric-date' | 'subject' | 'other';
  isoDate?: string;
  timeState?: JwtTimeState;
}

export interface JwtVerificationResult {
  valid: boolean;
  algorithm: JwtHmacAlgorithm | null;
  reason?: 'malformed' | 'unsupported-algorithm' | 'algorithm-mismatch' | 'invalid-signature';
}

const NUMERIC_DATE_CLAIMS = new Set(['exp', 'iat', 'nbf']);
const JWT_PART_PATTERN = /^[A-Za-z0-9_-]+$/;

export function decodeJwt(token: string): DecodedJwt {
  const normalized = token.trim();
  const parts = normalized.split('.');
  if (parts.length !== 3 || parts.some((part) => !JWT_PART_PATTERN.test(part))) {
    throw new Error('A JWT must contain three non-empty Base64URL parts.');
  }

  const encodedHeader = parts[0];
  const encodedPayload = parts[1];
  const encodedSignature = parts[2];
  if (encodedHeader === undefined || encodedPayload === undefined || encodedSignature === undefined) {
    throw new Error('A JWT must contain three parts.');
  }

  return {
    header: parseJsonObject(base64UrlToBytes(encodedHeader), 'header'),
    payload: parseJsonObject(base64UrlToBytes(encodedPayload), 'payload'),
    signature: base64UrlToBytes(encodedSignature),
    encodedHeader,
    encodedPayload,
    encodedSignature,
  };
}

export function inspectJwtClaims(payload: JsonObject, nowSeconds = Date.now() / 1_000): JwtClaimInspection[] {
  return Object.entries(payload).map(([name, value]) => {
    if (NUMERIC_DATE_CLAIMS.has(name) && typeof value === 'number' && Number.isFinite(value)) {
      const milliseconds = value * 1_000;
      const date = new Date(milliseconds);
      return {
        name,
        value,
        kind: 'numeric-date',
        isoDate: Number.isFinite(date.getTime()) ? date.toISOString() : undefined,
        timeState: value < nowSeconds ? 'past' : value > nowSeconds ? 'future' : 'now',
      };
    }

    return {
      name,
      value,
      kind: claimKind(name),
    };
  });
}

export async function signJwt(
  payload: JsonObject,
  secret: string | Uint8Array,
  algorithm: JwtHmacAlgorithm = 'HS256',
  header: JsonObject = {},
): Promise<string> {
  const webCryptoAlgorithm = jwtHmacAlgorithm(algorithm);
  if (!webCryptoAlgorithm) throw new Error('Unsupported JWT HMAC algorithm.');

  const normalizedHeader: JsonObject = { ...header, typ: header.typ ?? 'JWT', alg: algorithm };
  const encodedHeader = encodeJwtObject(normalizedHeader);
  const encodedPayload = encodeJwtObject(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSign(utf8Bytes(signingInput), secret, webCryptoAlgorithm);
  return `${signingInput}.${bytesToBase64Url(signature)}`;
}

export async function verifyJwtHmac(
  token: string,
  secret: string | Uint8Array,
  expectedAlgorithm?: JwtHmacAlgorithm,
): Promise<JwtVerificationResult> {
  let decoded: DecodedJwt;
  try {
    decoded = decodeJwt(token);
  } catch {
    return { valid: false, algorithm: null, reason: 'malformed' };
  }

  const headerAlgorithm = typeof decoded.header.alg === 'string' ? decoded.header.alg : '';
  const webCryptoAlgorithm = jwtHmacAlgorithm(headerAlgorithm);
  if (!webCryptoAlgorithm) return { valid: false, algorithm: null, reason: 'unsupported-algorithm' };
  const algorithm = headerAlgorithm as JwtHmacAlgorithm;
  if (expectedAlgorithm && algorithm !== expectedAlgorithm) {
    return { valid: false, algorithm, reason: 'algorithm-mismatch' };
  }

  const input = utf8Bytes(`${decoded.encodedHeader}.${decoded.encodedPayload}`);
  const valid = await hmacVerify(input, decoded.signature, secret, webCryptoAlgorithm);
  return valid
    ? { valid: true, algorithm }
    : { valid: false, algorithm, reason: 'invalid-signature' };
}

function parseJsonObject(bytes: Uint8Array, part: string): JsonObject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(utf8Text(bytes));
  } catch {
    throw new Error(`The JWT ${part} is not valid UTF-8 JSON.`);
  }
  if (!isJsonObject(parsed)) throw new Error(`The JWT ${part} must be a JSON object.`);
  return parsed;
}

function encodeJwtObject(value: JsonObject): string {
  return bytesToBase64Url(utf8Bytes(JSON.stringify(value)));
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function claimKind(name: string): JwtClaimInspection['kind'] {
  if (name === 'aud') return 'audience';
  if (name === 'iss') return 'issuer';
  if (name === 'sub') return 'subject';
  if (name === 'jti') return 'identifier';
  return 'other';
}
