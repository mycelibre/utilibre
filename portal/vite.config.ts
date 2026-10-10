import { defineConfig } from 'vitest/config';
import { writeFile } from 'node:fs/promises';
import { catalog } from './src/catalog/catalog.ts';
import { en } from './src/i18n/en.ts';
import { es } from './src/i18n/es.ts';
import { routePath, toolPath, translatedPath, type StaticPage } from './src/routes.ts';
import { practicalGuides, practicalGuidePath } from './src/pages/practical-guide-data.ts';

const dictionaries = { en, es } as const;
const staticPages: Array<Exclude<StaticPage, 'not-found'>> = ['home', 'services', 'tools', 'about', 'transparency', 'privacy', 'security', 'your-data', 'acceptable', 'support', 'status', 'software', 'labels', 'pdf', 'qr', 'guides', 'my', 'offline'];
const descriptionKeys = {
  home: 'meta.home.description', services: 'services.intro', tools: 'tools.intro', about: 'about.body1',
  transparency: 'transparency.why.body', privacy: 'privacy.intro', security: 'meta.security.description', 'your-data': 'meta.your-data.description', acceptable: 'acceptable.intro',
  support: 'support.body', status: 'status.intro', software: 'software.intro', labels: 'labels.intro',
  pdf: 'meta.pdf.description', qr: 'meta.qr.description', guides: 'meta.guides.description',
  my: 'meta.my.description', offline: 'meta.offline.description',
} as const;

export default defineConfig({
  plugins: [{
    name: 'bilingual-static-metadata',
    async closeBundle() {
      const output: Record<string, unknown> = {};
      for (const language of ['en', 'es'] as const) {
        const dictionary = dictionaries[language];
        output[`__not-found-${language}`] = {
          language,
          title: dictionary['common.notFound.title'],
          description: dictionary['common.notFound.body'],
          robots: 'noindex,nofollow',
          alternates: { en: routePath('home', 'en'), es: routePath('home', 'es') },
        };
        for (const page of staticPages) {
          const route = { language, page } as const;
          output[metadataPath(routePath(page, language))] = {
            language,
            title: dictionary[`meta.${page}.title`],
            description: dictionary[descriptionKeys[page]],
            robots: ['services', 'tools', 'status'].includes(page) ? 'noindex,nofollow' : 'index,follow',
            alternates: { en: translatedPath(route, 'en'), es: translatedPath(route, 'es') },
          };
        }
        for (const guide of practicalGuides) {
          output[metadataPath(practicalGuidePath(guide.id, language))] = {
            language, title: guide.copy[language].title, description: guide.copy[language].intro,
            robots: 'index,follow', alternates: { en: practicalGuidePath(guide.id, 'en'), es: practicalGuidePath(guide.id, 'es') },
          };
        }
        for (const entry of catalog.filter((item) => item.slug)) {
          const route = { language, page: 'tool', toolId: entry.id } as const;
          output[metadataPath(toolPath(entry.id, language))] = {
            language,
            title: entry.name[language],
            description: entry.description[language],
            robots: 'noindex,nofollow',
            alternates: { en: translatedPath(route, 'en'), es: translatedPath(route, 'es') },
          };
        }
      }
      await writeFile(new URL('./dist/page-metadata.json', import.meta.url), `${JSON.stringify(output)}\n`);
    },
  }],
  build: {
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: true,
  },
  server: {
    strictPort: true,
  },
  test: {
    include: ['tests/unit/**/*.test.{ts,js}'],
  },
});

function metadataPath(path: string): string {
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}
