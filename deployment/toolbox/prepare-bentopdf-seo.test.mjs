import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeDescriptions } from './prepare-bentopdf-seo.mjs';
test('keeps the tool description, social tags and application code verbatim', () => {
  const input = '<html><head><meta name="description" content="Generic promotion"><meta property="og:description" content="Social"><meta content="Extract PDF pages." name="description"></head><body><script>const a="description";</script></body></html>';
  const result = normalizeDescriptions(input);
  assert.equal(result, input.replace('<meta name="description" content="Generic promotion">', ''));
  assert.equal(normalizeDescriptions(result), result);
});
test('accepts casing and single quotes while refusing an empty final description', () => {
  const input = "<head><meta name='Description' content='Old'><meta name='description' content='Useful'></head>";
  assert.equal(normalizeDescriptions(input), "<head><meta name='description' content='Useful'></head>");
  assert.throws(() => normalizeDescriptions('<head><meta name="description" content="Old"><meta name="description" content=""></head>'), /Empty tool description/);
});
