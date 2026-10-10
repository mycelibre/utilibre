import { describe, expect, it } from 'vitest';
import { practicalGuides, practicalGuidePath } from '../../src/pages/practical-guide-data';
import { practicalGuides as summaries, practicalGuidePath as summaryPath } from '../../src/pages/guide-index';

describe('derived lightweight guide navigation', () => {
  it('matches the canonical content without shipping walkthroughs in navigation', () => {
    expect(summaries).toEqual(practicalGuides.map(({ id, paths, tools, samples, copy }) => ({
      id, paths, tools: tools.map(({ id }) => ({ id })), hasSamples: samples.length > 0,
      copy: Object.fromEntries(Object.entries(copy).map(([language, { title, intro }]) => [language, { title, intro }])),
    })));
    for (const guide of practicalGuides) for (const language of ['en', 'es'] as const) {
      expect(summaryPath(guide.id, language)).toBe(practicalGuidePath(guide.id, language));
    }
    expect(summaryPath('missing', 'es')).toBe('/es/guias');
  });
});
