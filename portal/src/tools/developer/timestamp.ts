export type TimestampUnit = 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';
export type TimestampInputUnit = TimestampUnit | 'auto';

export interface ParsedTimestamp {
  date: Date;
  detectedUnit: TimestampUnit | 'iso';
  unixSeconds: string;
  unixMilliseconds: string;
  unixMicroseconds: string;
  unixNanoseconds: string;
  iso: string;
}

const UNIT_DIVISORS: Readonly<Record<TimestampUnit, bigint>> = {
  seconds: 1n,
  milliseconds: 1_000n,
  microseconds: 1_000_000n,
  nanoseconds: 1_000_000_000n,
};

export function parseTimestamp(value: string, unit: TimestampInputUnit = 'auto'): ParsedTimestamp {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('Enter a timestamp or an ISO date.');

  if (/^[+-]?\d+$/.test(trimmed)) {
    const integer = BigInt(trimmed);
    const detectedUnit = unit === 'auto' ? detectTimestampUnit(integer) : unit;
    return fromIntegerTimestamp(integer, detectedUnit);
  }
  if (unit !== 'auto' && unit !== 'seconds') throw new Error('Fractional values are supported only for seconds.');
  if (/^[+-]?(?:\d+\.\d+|\d+\.)$/.test(trimmed)) {
    const seconds = Number(trimmed);
    if (!Number.isFinite(seconds)) throw new Error('The timestamp is outside the supported date range.');
    return fromDate(new Date(seconds * 1_000), 'seconds');
  }

  if (unit !== 'auto') throw new Error('The selected unit can be used only with a numeric timestamp.');
  const milliseconds = Date.parse(trimmed);
  if (!Number.isFinite(milliseconds)) throw new Error('The date or timestamp is invalid.');
  return fromDate(new Date(milliseconds), 'iso');
}

export function timestampFromDate(date: Date): ParsedTimestamp {
  if (!Number.isFinite(date.getTime())) throw new Error('The date is invalid.');
  return fromDate(date, 'iso');
}

export function detectTimestampUnit(value: bigint): TimestampUnit {
  const absolute = value < 0n ? -value : value;
  if (absolute < 100_000_000_000n) return 'seconds';
  if (absolute < 100_000_000_000_000n) return 'milliseconds';
  if (absolute < 100_000_000_000_000_000n) return 'microseconds';
  return 'nanoseconds';
}

function fromIntegerTimestamp(value: bigint, unit: TimestampUnit): ParsedTimestamp {
  const nanoseconds = value * (1_000_000_000n / UNIT_DIVISORS[unit]);
  const milliseconds = nanoseconds / 1_000_000n;
  const millisecondsNumber = Number(milliseconds);
  if (!Number.isSafeInteger(millisecondsNumber)) throw new Error('The timestamp is outside the supported date range.');
  return buildResult(new Date(millisecondsNumber), unit, nanoseconds);
}

function fromDate(date: Date, detectedUnit: ParsedTimestamp['detectedUnit']): ParsedTimestamp {
  if (!Number.isFinite(date.getTime())) throw new Error('The timestamp is outside the supported date range.');
  const nanoseconds = BigInt(Math.trunc(date.getTime())) * 1_000_000n;
  return buildResult(date, detectedUnit, nanoseconds);
}

function buildResult(date: Date, detectedUnit: ParsedTimestamp['detectedUnit'], nanoseconds: bigint): ParsedTimestamp {
  if (!Number.isFinite(date.getTime())) throw new Error('The timestamp is outside the supported date range.');
  return {
    date,
    detectedUnit,
    unixSeconds: decimalQuotient(nanoseconds, 1_000_000_000n),
    unixMilliseconds: decimalQuotient(nanoseconds, 1_000_000n),
    unixMicroseconds: decimalQuotient(nanoseconds, 1_000n),
    unixNanoseconds: nanoseconds.toString(),
    iso: date.toISOString(),
  };
}

function decimalQuotient(value: bigint, divisor: bigint): string {
  const quotient = value / divisor;
  const remainder = value % divisor;
  if (remainder === 0n) return quotient.toString();
  const sign = value < 0n && quotient === 0n ? '-' : '';
  const fraction = (remainder < 0n ? -remainder : remainder)
    .toString()
    .padStart(divisor.toString().length - 1, '0')
    .replace(/0+$/, '');
  return `${sign}${quotient}.${fraction}`;
}
