import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const publishedDocuments = [
  { repository: '../../../LICENSE', published: '../../public/legal/LICENSE.txt' },
  { repository: '../../../THIRD_PARTY_NOTICES.md', published: '../../public/legal/THIRD_PARTY_NOTICES.txt' },
] as const;

describe('published legal documents', () => {
  for (const document of publishedDocuments) {
    it(`keeps ${document.published.split('/').at(-1)} byte-for-byte equal to the repository document`, async () => {
      const [repository, published] = await Promise.all([
        readFile(new URL(document.repository, import.meta.url)),
        readFile(new URL(document.published, import.meta.url)),
      ]);
      expect(published).toEqual(repository);
    });
  }
});
