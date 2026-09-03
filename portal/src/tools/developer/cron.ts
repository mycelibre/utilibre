export interface CronField {
  values: ReadonlySet<number>;
  wildcard: boolean;
}

export interface CronSchedule {
  source: string;
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

export interface NextCronRunOptions {
  count?: number;
  maxSearchMinutes?: number;
}

export interface CronRunSearchResult {
  runs: Date[];
  complete: boolean;
  searchedMinutes: number;
}

const MONTH_NAMES: Readonly<Record<string, number>> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const DAY_NAMES: Readonly<Record<string, number>> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};
const ALIASES: Readonly<Record<string, string>> = {
  '@hourly': '0 * * * *',
  '@daily': '0 0 * * *',
  '@midnight': '0 0 * * *',
  '@weekly': '0 0 * * 0',
  '@monthly': '0 0 1 * *',
  '@yearly': '0 0 1 1 *',
  '@annually': '0 0 1 1 *',
};
const DEFAULT_MAX_SEARCH_MINUTES = 5 * 366 * 24 * 60;

export function parseCronExpression(expression: string): CronSchedule {
  const trimmed = expression.trim().toLowerCase();
  const normalized = ALIASES[trimmed] ?? trimmed;
  const parts = normalized.split(/\s+/);
  if (parts.length !== 5) throw new Error('Use a five-field cron expression: minute hour day-of-month month day-of-week.');

  const minute = parts[0];
  const hour = parts[1];
  const dayOfMonth = parts[2];
  const month = parts[3];
  const dayOfWeek = parts[4];
  if ([minute, hour, dayOfMonth, month, dayOfWeek].some((part) => part === undefined)) {
    throw new Error('The cron expression is incomplete.');
  }

  return {
    source: expression,
    minute: parseCronField(minute ?? '', 0, 59),
    hour: parseCronField(hour ?? '', 0, 23),
    dayOfMonth: parseCronField(dayOfMonth ?? '', 1, 31),
    month: parseCronField(month ?? '', 1, 12, MONTH_NAMES),
    dayOfWeek: parseCronField(dayOfWeek ?? '', 0, 7, DAY_NAMES, (value) => value === 7 ? 0 : value),
  };
}

export function nextCronRuns(
  schedule: CronSchedule,
  after: Date,
  options: NextCronRunOptions = {},
): Date[] {
  return searchNextCronRuns(schedule, after, options).runs;
}

/**
 * Performs a bounded minute-by-minute search in UTC. Run this in a disposable
 * worker for arbitrary schedules and check `complete`: rare schedules can fall
 * outside the horizon without being invalid.
 */
export function searchNextCronRuns(
  schedule: CronSchedule,
  after: Date,
  options: NextCronRunOptions = {},
): CronRunSearchResult {
  if (!Number.isFinite(after.getTime())) throw new Error('The starting date is invalid.');
  const count = options.count ?? 5;
  const maxSearchMinutes = options.maxSearchMinutes ?? DEFAULT_MAX_SEARCH_MINUTES;
  if (!Number.isSafeInteger(count) || count < 1 || count > 100) throw new Error('Request between 1 and 100 future runs.');
  if (!Number.isSafeInteger(maxSearchMinutes) || maxSearchMinutes < 1) throw new Error('The search limit must be a positive number of minutes.');

  const cursor = new Date(after.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  const runs: Date[] = [];
  let searchedMinutes = 0;
  for (; searchedMinutes < maxSearchMinutes && runs.length < count; searchedMinutes += 1) {
    if (matchesCron(schedule, cursor)) runs.push(new Date(cursor.getTime()));
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  return { runs, complete: runs.length === count, searchedMinutes };
}

export function matchesCron(schedule: CronSchedule, date: Date): boolean {
  if (!Number.isFinite(date.getTime())) return false;
  if (!schedule.minute.values.has(date.getUTCMinutes())) return false;
  if (!schedule.hour.values.has(date.getUTCHours())) return false;
  if (!schedule.month.values.has(date.getUTCMonth() + 1)) return false;

  const dayOfMonthMatches = schedule.dayOfMonth.values.has(date.getUTCDate());
  const dayOfWeekMatches = schedule.dayOfWeek.values.has(date.getUTCDay());
  if (schedule.dayOfMonth.wildcard && schedule.dayOfWeek.wildcard) return true;
  if (schedule.dayOfMonth.wildcard) return dayOfWeekMatches;
  if (schedule.dayOfWeek.wildcard) return dayOfMonthMatches;
  return dayOfMonthMatches || dayOfWeekMatches;
}

function parseCronField(
  source: string,
  minimum: number,
  maximum: number,
  names: Readonly<Record<string, number>> = {},
  normalize: (value: number) => number = (value) => value,
): CronField {
  const values = new Set<number>();
  if (!source || source.split(',').some((part) => part.length === 0)) throw new Error(`Invalid cron field: ${source || '(empty)'}.`);

  for (const listPart of source.split(',')) {
    const stepParts = listPart.split('/');
    if (stepParts.length > 2) throw new Error(`Invalid cron step: ${listPart}.`);
    const base = stepParts[0] ?? '';
    const step = stepParts[1] === undefined ? 1 : parseInteger(stepParts[1], names);
    if (step < 1 || step > maximum - minimum + 1) throw new Error(`Invalid cron step: ${listPart}.`);

    let start: number;
    let end: number;
    if (base === '*') {
      start = minimum;
      end = maximum;
    } else {
      const range = base.split('-');
      if (range.length > 2) throw new Error(`Invalid cron range: ${base}.`);
      start = parseInteger(range[0] ?? '', names);
      end = range.length === 2 ? parseInteger(range[1] ?? '', names) : start;
    }
    if (start < minimum || start > maximum || end < minimum || end > maximum || start > end) {
      throw new Error(`Cron value outside ${minimum}–${maximum}: ${base}.`);
    }
    for (let value = start; value <= end; value += step) values.add(normalize(value));
  }

  const fullDomain = new Set<number>();
  for (let value = minimum; value <= maximum; value += 1) fullDomain.add(normalize(value));
  const wildcard = values.size === fullDomain.size && [...fullDomain].every((value) => values.has(value));
  return { values, wildcard };
}

function parseInteger(value: string, names: Readonly<Record<string, number>>): number {
  const named = names[value.toLowerCase()];
  if (named !== undefined) return named;
  if (!/^\d+$/.test(value)) throw new Error(`Invalid cron value: ${value || '(empty)'}.`);
  return Number.parseInt(value, 10);
}
