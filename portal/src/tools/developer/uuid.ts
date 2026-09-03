import { secureRandomUuid } from '../../utilities/random';

export type UuidVariant = 'ncs' | 'rfc-4122' | 'microsoft' | 'future';

export interface UuidInspection {
  valid: boolean;
  normalized: string | null;
  version: number | null;
  variant: UuidVariant | null;
  kind: 'nil' | 'max' | 'uuid' | null;
}

const UUID_PATTERN = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i;
const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const MAX_UUID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

export function generateUuidV4(count = 1): string[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > 1_000) {
    throw new Error('Generate between 1 and 1,000 UUIDs at a time.');
  }
  return Array.from({ length: count }, () => secureRandomUuid());
}

export function inspectUuid(value: string): UuidInspection {
  const normalized = normalizeUuid(value);
  const match = normalized.match(UUID_PATTERN);
  if (!match) return { valid: false, normalized: null, version: null, variant: null, kind: null };
  if (normalized === NIL_UUID) return { valid: true, normalized, version: null, variant: 'ncs', kind: 'nil' };
  if (normalized === MAX_UUID) return { valid: true, normalized, version: null, variant: 'future', kind: 'max' };

  const versionCharacter = match[3]?.[0];
  const variantCharacter = match[4]?.[0];
  if (!versionCharacter || !variantCharacter) return { valid: false, normalized: null, version: null, variant: null, kind: null };
  return {
    valid: true,
    normalized,
    version: Number.parseInt(versionCharacter, 16),
    variant: uuidVariant(Number.parseInt(variantCharacter, 16)),
    kind: 'uuid',
  };
}

function normalizeUuid(value: string): string {
  let normalized = value.trim().toLowerCase();
  if (normalized.startsWith('urn:uuid:')) normalized = normalized.slice('urn:uuid:'.length);
  if (normalized.startsWith('{') && normalized.endsWith('}')) normalized = normalized.slice(1, -1);
  return normalized;
}

function uuidVariant(nibble: number): UuidVariant {
  if ((nibble & 0b1000) === 0) return 'ncs';
  if ((nibble & 0b1100) === 0b1000) return 'rfc-4122';
  if ((nibble & 0b1110) === 0b1100) return 'microsoft';
  return 'future';
}
