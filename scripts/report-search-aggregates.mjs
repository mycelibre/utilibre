import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

// OFFLINE ONLY. Accept deliberately supplied aggregate counts, never exports
// containing rows of queries, referrers, visitors, requests, identifiers or IPs.
// This module has no network client, collector, endpoint, or browser dependency.
const metricNames = ['impressions', 'clicks', 'visits', 'completions', 'aiImpressions', 'aiCitations'];
const supportedMetrics = {
  'google-search-console': ['impressions', 'clicks'],
  'bing-webmaster-tools': ['impressions', 'clicks'],
  'google-generative-ai': ['aiImpressions'],
  'bing-ai-performance': ['aiCitations'],
  'operator-aggregate': ['visits', 'completions'],
};
const scopes = ['portal-property', 'public-guide-pages'];

function objectWithKeys(value, keys, context) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${context} must be an object`);
  assert(Object.keys(value).every((key) => keys.includes(key)), `${context} contains unsupported fields; only aggregate report fields are allowed`);
}

function methodologyText(value, context) {
  assert(typeof value === 'string' && value.trim().length > 0 && value.length <= 500, `${context} needs a short methodology statement`);
  // Metadata is only for coverage/methodology, never pasted visitor content.
  // Reject obvious identifiers as well as unsupported raw-data fields. No
  // validator can infer whether arbitrary prose secretly contains a query.
  assert(!/[\u0000-\u001f\u007f@]|https?:\/\/|www\.|[?&][^\s=]+=/i.test(value)
    && !/\b(?:\d{1,3}\.){3}\d{1,3}\b|(?:[a-f\d]{0,4}:){2,}[a-f\d:]*/i.test(value),
  `${context} must contain methodology only, without URLs, identifiers, IPs, or raw queries`);
  return value.trim();
}

function dateOnly(value) {
  assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value), 'Window dates must use YYYY-MM-DD');
  const date = new Date(`${value}T00:00:00.000Z`);
  assert(!Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value, 'Window contains an invalid date');
  return value;
}

function normalizeWindow(value) {
  objectWithKeys(value, ['start', 'end', 'timeZone'], 'Window');
  const start = dateOnly(value.start);
  const end = dateOnly(value.end);
  assert(start <= end, 'Window start must not follow its end');
  assert(typeof value.timeZone === 'string' && value.timeZone.length <= 64, 'Window needs its source reporting time zone');
  try { new Intl.DateTimeFormat('en', { timeZone: value.timeZone }); }
  catch { assert.fail('Window needs a valid reporting time zone'); }
  return { start, end, timeZone: value.timeZone };
}

function normalizeSource(record) {
  objectWithKeys(record, ['source', 'window', 'coverage', 'metrics', 'completionDefinition', 'conversionDenominator', 'aiImpressionsProvenance'], 'Source record');
  assert(typeof record.source === 'string' && Object.hasOwn(supportedMetrics, record.source), 'Unsupported source; use an allowlisted aggregate source');
  const window = normalizeWindow(record.window);
  objectWithKeys(record.coverage, ['scope', 'limitations'], 'Coverage');
  assert(scopes.includes(record.coverage.scope), 'Coverage scope must be portal-property or public-guide-pages');
  assert(Array.isArray(record.coverage.limitations) && record.coverage.limitations.length >= 1 && record.coverage.limitations.length <= 8,
    'Each source needs one to eight explicit coverage limitations');
  const coverage = {
    scope: record.coverage.scope,
    limitations: record.coverage.limitations.map((value) => methodologyText(value, 'Coverage limitation')),
  };
  objectWithKeys(record.metrics, metricNames, 'Metrics');
  const metrics = {};
  for (const name of metricNames) {
    const value = record.metrics[name] ?? null;
    assert(value === null || (Number.isSafeInteger(value) && value >= 0), 'Metrics must be nonnegative safe integer counts or null');
    assert(value === null || supportedMetrics[record.source].includes(name), 'This source does not establish that metric; leave it null');
    metrics[name] = value;
  }
  const aiImpressionsProvenance = record.aiImpressionsProvenance ?? null;
  if (record.source === 'google-generative-ai') {
    assert(['verified-count', 'unavailable', 'unverified-export-zero'].includes(aiImpressionsProvenance),
      'Google AI impressions require explicit aiImpressionsProvenance: verified-count, unavailable, or unverified-export-zero');
    if (aiImpressionsProvenance === 'verified-count') {
      assert(metrics.aiImpressions !== null, 'Verified Google AI impressions need a known count checked against the source report');
    } else {
      assert(metrics.aiImpressions === null || metrics.aiImpressions === 0, 'Unavailable Google AI impressions must be null; an ambiguous exported zero may be normalized');
      metrics.aiImpressions = null;
      coverage.limitations.push(aiImpressionsProvenance === 'unverified-export-zero'
        ? 'The Google AI export zero was not verified against the source report; unavailable display values can export as zero, so this count remains null.'
        : 'Google AI impressions are unavailable. Display values ~ or - can export as zero; unavailable values remain null.');
    }
  } else {
    assert(aiImpressionsProvenance === null, 'AI impression provenance applies only to google-generative-ai');
  }
  const completionDefinition = record.completionDefinition == null ? null : methodologyText(record.completionDefinition, 'Completion definition');
  const conversionDenominator = record.conversionDenominator ?? null;
  assert(conversionDenominator === null || conversionDenominator === 'visits', 'The completion denominator must be explicitly named visits, or null');
  assert(record.source === 'operator-aggregate' || (completionDefinition === null && conversionDenominator === null),
    'Search-engine clicks or AI citations do not establish visits or completed tasks');
  assert((completionDefinition === null) === (conversionDenominator === null), 'Completion definition and denominator must be supplied together');
  assert(metrics.completions === null || completionDefinition !== null, 'Known completions need a definition and named conversion denominator');
  return { source: record.source, window, coverage, metrics, completionDefinition, conversionDenominator, aiImpressionsProvenance };
}

function ratio(numerator, denominator) {
  return numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;
}

function sumKnown(values) {
  if (values.length === 0 || values.some((value) => value === null)) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  assert(Number.isSafeInteger(sum), 'Aggregate sum exceeds safe integer precision');
  return sum;
}

export function reportSearchAggregates(input) {
  objectWithKeys(input, ['schemaVersion', 'sources'], 'Report');
  assert.equal(input.schemaVersion, 1, 'Unsupported aggregate report schemaVersion');
  assert(Array.isArray(input.sources) && input.sources.length >= 1 && input.sources.length <= 5, 'Supply one to five aggregate sources');
  const sources = input.sources.map(normalizeSource);
  assert.equal(new Set(sources.map((record) => record.source)).size, sources.length, 'Duplicate source totals would double-count the same reporting window');
  const searchSources = sources.filter(({ source }) => ['google-search-console', 'bing-webmaster-tools'].includes(source));
  const first = searchSources[0];
  const comparable = first !== undefined && searchSources.every((record) => JSON.stringify(record.window) === JSON.stringify(first.window)
    && record.coverage.scope === first.coverage.scope);
  const impressions = comparable ? sumKnown(searchSources.map(({ metrics }) => metrics.impressions)) : null;
  const clicks = comparable ? sumKnown(searchSources.map(({ metrics }) => metrics.clicks)) : null;
  return {
    schemaVersion: 1,
    mode: 'offline-aggregate-report',
    sources: sources.map((record) => ({
      ...record,
      ctr: ratio(record.metrics.clicks, record.metrics.impressions),
      completionRate: {
        numerator: 'completions',
        denominator: record.conversionDenominator,
        ratio: record.conversionDenominator === null ? null : ratio(record.metrics.completions, record.metrics.visits),
      },
    })),
    searchTotals: {
      sources: searchSources.map(({ source }) => source),
      comparable,
      window: comparable ? first.window : null,
      scope: comparable ? first.coverage.scope : null,
      impressions,
      clicks,
      ctr: ratio(clicks, impressions),
      reason: comparable
        ? 'CTR uses total clicks divided by total impressions, never an average of source CTRs. Missing counts remain unknown.'
        : 'No combined search total: no search sources, or their windows, time zones, or coverage scopes differ.',
    },
    limitations: [
      'Only deliberately supplied aggregate counts are analyzed. This report collects no data and verifies no provider account or export.',
      'Null means unknown or unavailable; zero means an explicitly supplied zero count. Ratios with unknown or zero denominators are null.',
      'Search clicks are not visits, unique people, or completed tasks. AI impressions and citations are visibility, not traffic.',
      'Google generative-AI impressions and Bing AI citations are separate measures; neither establishes AI clicks or an AI CTR. Google AI export zeros need provenance because unavailable display values can become zero on export.',
      'Provider counts can have different definitions, privacy omissions, sampling, reporting delays, or coverage; read every source limitation.',
      'Completion rates use only the operator aggregate and its named visits denominator. They are event ratios, not proof of search attribution or unique-user conversion.',
      'Missing visits or completions are expected without separate approved aggregate evidence. Do not add tracking or infer them from clicks.',
    ],
  };
}

export const exampleInput = {
  schemaVersion: 1,
  sources: Object.keys(supportedMetrics).map((source) => ({
    source,
    window: { start: '2026-10-01', end: '2026-10-07', timeZone: source.startsWith('google-') ? 'America/Los_Angeles' : 'UTC' },
    coverage: {
      scope: 'portal-property',
      limitations: [source === 'operator-aggregate'
        ? 'No independently supplied aggregate evidence of visits or completed tasks is available; no tracking is installed.'
        : 'No provider aggregate report has been supplied. Confirm dates, reporting time zone, finalization and coverage before entering counts.'],
    },
    metrics: Object.fromEntries(metricNames.map((name) => [name, null])),
    completionDefinition: null,
    conversionDenominator: null,
    aiImpressionsProvenance: source === 'google-generative-ai' ? 'unavailable' : null,
  })),
};

const help = `Usage: node scripts/report-search-aggregates.mjs INPUT.json
       node scripts/report-search-aggregates.mjs --example

Offline only. Prints a validated JSON report to stdout; --example prints an empty
input template, not observed measurements. No accounts, APIs, logs or telemetry.

Schema v1: { schemaVersion: 1, sources: [ source records ] }
Each record requires source, window { start, end, timeZone }, coverage
{ scope, limitations: [ methodology only ] }, and metrics { count fields }.
Dates are inclusive YYYY-MM-DD; use each provider's actual reporting time zone.
Sources (one record each, up to five): google-search-console, bing-webmaster-tools,
google-generative-ai, bing-ai-performance, operator-aggregate.
Scope: portal-property or public-guide-pages.
Metrics: impressions, clicks, visits, completions, aiImpressions, aiCitations.
Omitted metrics become null. Search providers accept impressions/clicks only;
Google generative AI accepts aiImpressions only; Bing AI accepts aiCitations only;
operator aggregate accepts visits/completions only. AI counts never supply a CTR.
Unknown fields and raw query/visitor dimensions fail.

Google AI requires aiImpressionsProvenance: "verified-count", "unavailable", or
"unverified-export-zero". Use verified-count only for a numeric count checked
against the source report. Google display values ~ or - can export as zero:
enter null with unavailable, or mark an unchecked export zero as
unverified-export-zero. Both unknown states normalize zero/null to null and add
a provenance limitation. Other sources must omit this field or set it to null.

For known operator completions supply completionDefinition and
conversionDenominator: "visits". Otherwise both may be null. Count definitions
and coverage limitations are mandatory methodology, never pasted visitor content.
Ratios are fractions (0.1 means 10%). Combined CTR is weighted by impressions;
incompatible reporting windows, time zones or coverage scopes are not combined.
Input is limited to 64 KiB. This is not a privacy scrubber for raw exports: provide
only already aggregated counts without queries, user identifiers, IPs or URLs.`;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    assert(args.length === 1, 'Provide one input file, --example, or --help');
    if (args[0] === '--help') process.stdout.write(`${help}\n`);
    else if (args[0] === '--example') process.stdout.write(`${JSON.stringify(exampleInput, null, 2)}\n`);
    else {
      assert(!args[0].startsWith('--'), 'Unknown option; use --help');
      const info = await stat(args[0]);
      assert(info.isFile() && info.size <= 65_536, 'Input must be a local aggregate JSON file of at most 64 KiB');
      const contents = await readFile(args[0], 'utf8');
      assert(contents.length <= 65_536, 'Input exceeds the aggregate report size limit');
      let input;
      try { input = JSON.parse(contents); } catch { assert.fail('Input must be valid JSON containing aggregate counts only'); }
      process.stdout.write(`${JSON.stringify(reportSearchAggregates(input), null, 2)}\n`);
    }
  } catch (error) {
    // Validation messages describe the schema, never echo rejected raw values.
    const message = error.code === 'ERR_ASSERTION' ? error.message : 'Could not read the local aggregate input file';
    process.stderr.write(`Aggregate report rejected: ${message}\n`);
    process.exitCode = 1;
  }
}
