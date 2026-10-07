import test from 'node:test';
import assert from 'node:assert/strict';
import { reportSearchAggregates, exampleInput } from './report-search-aggregates.mjs';

const window = { start: '2026-10-01', end: '2026-10-07', timeZone: 'UTC' };
function source(name, metrics, extra = {}) {
  return {
    source: name, window: { ...window },
    coverage: { scope: 'portal-property', limitations: ['Synthetic aggregate test fixture; not observed traffic.'] },
    metrics, ...extra,
  };
}
const report = (...sources) => reportSearchAggregates({ schemaVersion: 1, sources });

test('example contains unknowns, never fabricated zero traffic or completions', () => {
  const result = reportSearchAggregates(exampleInput);
  assert.equal(result.searchTotals.clicks, null);
  assert.equal(result.searchTotals.ctr, null);
  for (const row of result.sources) {
    assert(Object.values(row.metrics).every((value) => value === null));
    assert.equal(row.completionRate.ratio, null);
  }
});

test('CTR is weighted by totals, not the arithmetic mean of source rates', () => {
  const result = report(
    source('google-search-console', { impressions: 100, clicks: 10 }),
    source('bing-webmaster-tools', { impressions: 900, clicks: 9 }),
  );
  assert.equal(result.searchTotals.impressions, 1000);
  assert.equal(result.searchTotals.clicks, 19);
  assert.equal(result.searchTotals.ctr, 0.019);
  assert.equal(result.sources[0].metrics.visits, null);
  assert.equal(result.sources[0].metrics.completions, null);
});

test('missing counts propagate as unknown while explicit zero stays zero', () => {
  const result = report(
    source('google-search-console', { impressions: 100, clicks: 0 }),
    source('bing-webmaster-tools', { impressions: null }),
  );
  assert.equal(result.sources[0].ctr, 0);
  assert.equal(result.sources[1].metrics.clicks, null);
  assert.equal(result.searchTotals.clicks, null);
  assert.equal(result.searchTotals.impressions, null);
  assert.equal(result.searchTotals.ctr, null);
  assert.equal(report(source('google-search-console', { impressions: 0, clicks: 0 })).sources[0].ctr, null);
});

test('different source windows, time zones or scopes cannot produce a combined rate', () => {
  for (const extra of [
    { window: { ...window, end: '2026-10-06' } },
    { window: { ...window, timeZone: 'America/Los_Angeles' } },
    { coverage: { scope: 'public-guide-pages', limitations: ['Only the selected public guide pages.'] } },
  ]) {
    const result = report(
      source('google-search-console', { impressions: 100, clicks: 10 }),
      source('bing-webmaster-tools', { impressions: 100, clicks: 10 }, extra),
    );
    assert.equal(result.searchTotals.comparable, false);
    assert.equal(result.searchTotals.ctr, null);
    assert.equal(result.sources[1].ctr, 0.1);
  }
});

test('AI visibility stays separate from traffic and search CTR', () => {
  const result = report(
    source('google-search-console', { impressions: 100, clicks: 10 }),
    source('google-generative-ai', { aiImpressions: 800 }, { aiImpressionsProvenance: 'verified-count' }),
    source('bing-ai-performance', { aiCitations: 20 }),
  );
  assert.equal(result.searchTotals.impressions, 100);
  assert.equal(result.searchTotals.ctr, 0.1);
  assert.equal(result.sources[1].metrics.visits, null);
  assert.equal(result.sources[1].metrics.clicks, null);
  assert.equal(result.sources[1].ctr, null);
  assert.equal(result.sources[2].ctr, null);
  assert.equal(result.sources[2].metrics.aiImpressions, null);
  assert.throws(() => report(source('bing-ai-performance', { aiImpressions: 20 })), /does not establish/);
  assert.throws(() => report(source('google-generative-ai', { aiCitations: 20 }, { aiImpressionsProvenance: 'unavailable' })), /does not establish/);
  assert.throws(() => report(source('google-generative-ai', { clicks: 20 }, { aiImpressionsProvenance: 'unavailable' })), /does not establish/);
  assert.throws(() => report(source('bing-ai-performance', { visits: 20 })), /does not establish/);
  assert.throws(() => report(source('google-search-console', { completions: 10 })), /does not establish/);
});

test('Google AI unavailable display values and ambiguous export zeros stay unknown with provenance', () => {
  for (const provenance of ['unavailable', 'unverified-export-zero']) {
    for (const value of [null, 0]) {
      const result = report(source('google-generative-ai', { aiImpressions: value }, { aiImpressionsProvenance: provenance }));
      assert.equal(result.sources[0].metrics.aiImpressions, null);
      assert.equal(result.sources[0].aiImpressionsProvenance, provenance);
      assert(result.sources[0].coverage.limitations.some((text) => /export.*zero/.test(text)));
      assert.equal(result.sources[0].ctr, null);
      assert.equal(result.searchTotals.impressions, null);
    }
  }
  assert.equal(report(source('google-generative-ai', { aiImpressions: 0 }, { aiImpressionsProvenance: 'verified-count' })).sources[0].metrics.aiImpressions, 0);
  assert.throws(() => report(source('google-generative-ai', { aiImpressions: 0 })), /explicit aiImpressionsProvenance/);
  assert.throws(() => report(source('google-generative-ai', {}, { aiImpressionsProvenance: 'verified-count' })), /known count/);
  assert.throws(() => report(source('google-generative-ai', { aiImpressions: 20 }, { aiImpressionsProvenance: 'unavailable' })), /must be null/);
  assert.throws(() => report(source('google-generative-ai', { aiImpressions: '~' }, { aiImpressionsProvenance: 'unavailable' })), /integer counts/);
});

test('completion ratios require supplied counts, a definition, and a named visits denominator', () => {
  const extra = { completionDefinition: 'Completed task events within the supplied aggregate cohort.', conversionDenominator: 'visits' };
  const result = report(source('operator-aggregate', { visits: 50, completions: 5 }, extra));
  assert.deepEqual(result.sources[0].completionRate, { numerator: 'completions', denominator: 'visits', ratio: 0.1 });
  assert.equal(report(source('operator-aggregate', { completions: 5 }, extra)).sources[0].completionRate.ratio, null);
  assert.throws(() => report(source('operator-aggregate', { completions: 5 })), /definition and named/);
  assert.throws(() => report(source('operator-aggregate', { visits: 50, completions: 5 }, { ...extra, conversionDenominator: 'clicks' })), /denominator/);
});

test('unbounded, invalid, or duplicate counts and source metadata fail closed', () => {
  for (const value of [-1, 0.5, '12', Number.MAX_SAFE_INTEGER + 1, true]) {
    assert.throws(() => report(source('google-search-console', { clicks: value })), /integer counts/);
  }
  assert.throws(() => report(source('google-search-console', {}), source('google-search-console', {})), /Duplicate/);
  assert.throws(() => report(source('unknown', {})), /Unsupported source/);
  assert.throws(() => report(source(['google-search-console'], {})), /Unsupported source/);
  assert.throws(() => report(source('google-search-console', {}, { window: { ...window, start: '2026-02-30' } })), /invalid date/);
  assert.throws(() => report(source('google-search-console', {}, { window: { ...window, start: '2026-10-08' } })), /start/);
  assert.throws(() => report(source('google-search-console', {}, { coverage: { scope: 'portal-property', limitations: [] } })), /limitations/);
  assert.throws(() => report(source('google-search-console', {}, { window: undefined })), /Window/);
  assert.throws(() => report(source('google-search-console', { impressions: Number.MAX_SAFE_INTEGER }), source('bing-webmaster-tools', { impressions: 1 })), /precision/);
});

test('raw queries, identifiers, IPs and additional export dimensions are rejected', () => {
  for (const extra of [{ queries: ['private query'] }, { userId: 'a-person' }, { ip: '192.0.2.1' }, { urls: ['/en/?q=private'] }]) {
    assert.throws(() => report(source('google-search-console', {}, extra)), /unsupported fields/);
  }
  assert.throws(() => report(source('google-search-console', { rawQueries: 1 })), /unsupported fields/);
  for (const limitation of ['Identifier test@example.com', 'Client 192.0.2.1', 'Client 2001:db8::1', 'https://utilibre.org/en/?q=private']) {
    assert.throws(() => report(source('google-search-console', {}, { coverage: { scope: 'portal-property', limitations: [limitation] } })), /methodology only/);
  }
});
