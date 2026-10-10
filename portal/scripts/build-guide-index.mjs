import { writeFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { practicalGuides } from '../src/pages/practical-guide-data.ts';

// Derived navigation metadata only. Full instructions stay in the guide route
// chunk and in server-rendered HTML, not every visitor's first download.
const summaries = practicalGuides.map(({ id, paths, tools, samples, copy }) => ({
  id, paths, tools: tools.map(({ id }) => ({ id })), hasSamples: samples.length > 0,
  copy: Object.fromEntries(Object.entries(copy).map(([language, { title, intro }]) => [language, { title, intro }])),
}));
await writeFile(new URL('../src/pages/guide-index.generated.json', import.meta.url), `${JSON.stringify(summaries)}\n`);
