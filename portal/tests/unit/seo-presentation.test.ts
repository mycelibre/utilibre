import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import type { PublicConfig } from '../../src/config';
import { pageSeo, serializeStructuredData } from '../../src/seo';
import { renderPublicShell } from '../../src/server-render';
import { practicalGuides, practicalGuidePath } from '../../src/pages/practical-guide-data';
import { scenarioCollections, collectionPath } from '../../src/pages/scenario-collection-data';
import { parseRoute, routePath, type Route } from '../../src/routes';

const origin = 'https://public.example';
const config = {
  publicPortalOrigin: origin, projectName: 'Utilibre', defaultLanguage: 'en',
  projectTagline: '', projectTaglineEn: '', projectTaglineEs: '',
  supportUrl: '', contactUrl: '', sourceCodeUrl: '', enabledServices: [], listedServices: [],
} as unknown as PublicConfig;

describe('search presentation follows real bilingual content', () => {
  it('uses the visible guide/collection hierarchy and canonical URLs in breadcrumbs', () => {
    for (const language of ['en', 'es'] as const) {
      const paths = [
        ...practicalGuides.map(guide => practicalGuidePath(guide.id, language)),
        ...scenarioCollections.map(collection => collectionPath(collection.id, language)),
      ];
      for (const path of paths) {
        const route = parseRoute(path)!;
        const seo = pageSeo(route, config, '?utm_source=fictional');
        const graph = JSON.parse(serializeStructuredData(seo.structuredData))['@graph'];
        const breadcrumb = graph.find((node: { '@type': string }) => node['@type'] === 'BreadcrumbList');
        const page = graph.find((node: { '@type': string }) => node['@type'] === 'WebPage');
        const { document } = parseHTML(renderPublicShell(route, config));
        const links = new Set([...document.querySelectorAll('a[href]')].map(link => new URL(link.getAttribute('href')!, origin + path).href));
        expect(breadcrumb['@id'], path).toBe(origin + path + '#breadcrumb');
        expect(page.breadcrumb, path).toEqual({ '@id': breadcrumb['@id'] });
        const items = breadcrumb.itemListElement;
        expect(items, path).toHaveLength(route.page === 'guide' ? 3 : 2);
        expect(items[0].item, path).toBe(origin + routePath('home', language));
        if (route.page === 'guide') expect(items[1].item, path).toBe(origin + routePath('guides', language));
        for (const [index, item] of items.entries()) {
          expect(item.position, path).toBe(index + 1);
          expect(item['@type'], path).toBe('ListItem');
          expect(item.name.trim().length, path).toBeGreaterThan(0);
          expect(new URL(item.item).origin, path).toBe(origin);
          expect(new URL(item.item).search, path).toBe('');
          if (index < items.length - 1) expect(links.has(item.item), `${path}: visible ancestor ${item.item}`).toBe(true);
        }
        expect(items.at(-1).item, path).toBe(origin + path);
        expect(items.at(-1).name, path).toBe(document.querySelector('h1')!.textContent);
      }
    }
  });

  it('keeps edited search titles and descriptions aligned in build, browser and server metadata', () => {
    const metadata = JSON.parse(readFileSync(new URL('../../dist/page-metadata.json', import.meta.url), 'utf8'));
    for (const guide of practicalGuides) for (const language of ['en', 'es'] as const) {
      const path = practicalGuidePath(guide.id, language);
      const copy = guide.copy[language];
      const seo = pageSeo(parseRoute(path)!, config);
      expect(metadata[path].title, path).toBe(copy.seoTitle || copy.title);
      expect(metadata[path].description, path).toBe(copy.seoDescription || copy.intro);
      expect(seo.title, path).toBe(`${metadata[path].title} | Utilibre`);
      expect(seo.description, path).toBe(metadata[path].description);
    }
  });

  it('never advertises breadcrumb search markup for private previews, filters or missing pages', () => {
    const route: Route = { language: 'es', page: 'guide', guideId: 'scan' };
    expect(pageSeo(route, { ...config, publicPortalOrigin: '' }).structuredData).toBeNull();
    expect(pageSeo({ language: 'en', page: 'home' }, config, '?q=private').structuredData).toBeNull();
    expect(pageSeo({ language: 'en', page: 'not-found' }, config).structuredData).toBeNull();
    expect(pageSeo({ language: 'en', page: 'status' }, config).structuredData).toBeNull();
  });
});
