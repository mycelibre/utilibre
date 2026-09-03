import { describe, expect, it } from 'vitest';
import { catalog, catalogEntry } from '../../src/catalog/catalog';
import {
  allEntries,
  discoverEntries,
  discoveryGroups,
  entryLaunch,
  featuredEntries,
  groupEntries,
  launchableEntries,
  normalizeCatalogSearch,
  searchEntries,
} from '../../src/catalog/discovery';
import type { PublicConfig } from '../../src/config';

const baseConfig: PublicConfig = {
  projectName: 'Utilibre', projectTagline: '', projectTaglineEn: '', projectTaglineEs: '',
  sourceCodeUrl: '', supportUrl: '', contactUrl: '', publicSearchUrl: '', publicRedditUrl: '',
  publicYoutubeUrl: '', publicImgurUrl: '', publicNtfyUrl: '', publicPdfUrl: '',
  publicConvertUrl: '', publicToolsUrl: '', publicMonitorUrl: '', publicSendUrl: '',
  publicRssUrl: '', publicFeedsUrl: '', publicPasteUrl: '', publicWakapiUrl: '',
  enabledServices: [], defaultLanguage: 'en',
};

function config(overrides: Partial<PublicConfig> = {}): PublicConfig {
  return { ...baseConfig, ...overrides };
}

const featuredConfig = config({
  enabledServices: ['searxng', 'vert', 'pairdrop', 'privatebin', 'cobalt', 'bentopdf', 'omnitools'],
  publicSearchUrl: 'https://search.example.test/',
  publicConvertUrl: 'https://convert.example.test/',
  publicSendUrl: 'https://send.example.test/',
  publicPasteUrl: 'https://paste.example.test/',
  publicPdfUrl: 'https://pdf.example.test/',
  publicToolsUrl: 'https://tools.example.test/',
});

describe('catalog discovery metadata', () => {
  it('assigns a task group and preserves the broad editorial feature order', () => {
    expect(catalog.every((entry) => discoveryGroups.includes(entry.discoveryGroup))).toBe(true);
    expect(catalog
      .filter((entry) => entry.featuredOrder !== undefined)
      .sort((left, right) => (left.featuredOrder ?? 0) - (right.featuredOrder ?? 0))
      .map((entry) => entry.id))
      .toEqual(['searxng', 'vert', 'pairdrop', 'privatebin', 'cobalt', 'bentopdf', 'omnitools']);
  });
});

describe('config-gated catalog discovery', () => {
  it('exposes only approved, enabled, configured, deployed applications and available glue', () => {
    const entries = launchableEntries(config({
      enabledServices: ['searxng', 'cobalt', 'redlib', 'vert', 'invidious'],
      publicSearchUrl: 'https://search.example.test/',
      publicRedditUrl: 'https://reddit.example.test/',
      publicYoutubeUrl: 'https://video.example.test/',
    }));
    const ids = entries.map((entry) => entry.id);

    expect(ids).toEqual(expect.arrayContaining(['searxng', 'cobalt', 'redlib', 'private-router']));
    expect(ids).not.toEqual(expect.arrayContaining(['vert', 'invidious', 'rimgo']));
  });

  it('returns featured applications in explicit order and no unconfigured defaults', () => {
    expect(featuredEntries(featuredConfig).map((entry) => entry.id))
      .toEqual(['searxng', 'vert', 'pairdrop', 'privatebin', 'cobalt', 'bentopdf', 'omnitools']);
    expect(featuredEntries(baseConfig)).toEqual([]);
  });

  it('resolves only the two portal integration routes internally', () => {
    const configured = config({
      enabledServices: ['cobalt', 'redlib', 'vert'],
      publicRedditUrl: 'https://reddit.example.test/',
      publicConvertUrl: 'https://convert.example.test/',
    });
    expect(entryLaunch(catalogEntry('cobalt')!, 'en', configured))
      .toEqual({ href: '/en/tools/download-media', external: false });
    expect(entryLaunch(catalogEntry('private-router')!, 'es', configured))
      .toEqual({ href: '/es/herramientas/abrir-con-privacidad', external: false });
    expect(entryLaunch(catalogEntry('vert')!, 'en', configured))
      .toEqual({ href: 'https://convert.example.test/', external: true });
    expect(entryLaunch(catalogEntry('searxng')!, 'en', configured)).toBeNull();
  });
});

describe('localized catalog filtering', () => {
  it('normalizes case and diacritics in both product languages', () => {
    expect(normalizeCatalogSearch('  BÚSQUEDA  ', 'es')).toBe('busqueda');
    expect(normalizeCatalogSearch('Résumé', 'en')).toBe('resume');
    expect(searchEntries(featuredConfig, 'es', 'BUSQUEDA').map((entry) => entry.id)).toContain('searxng');
    expect(searchEntries(featuredConfig, 'es', 'PDF').map((entry) => entry.id)).toContain('bentopdf');
    expect(searchEntries(featuredConfig, 'en', '   ')).toEqual([]);
  });

  it('returns localized task and A-Z views', () => {
    expect(groupEntries(featuredConfig, 'en', 'documents').map((entry) => entry.id)).toEqual(['bentopdf']);
    const all = allEntries(featuredConfig, 'es');
    const names = all.map((entry) => entry.name.es);
    expect(names).toEqual([...names].sort(new Intl.Collator('es', { sensitivity: 'base' }).compare));
  });

  it('prioritizes query, then group, then all, with featured as the default', () => {
    expect(discoverEntries(featuredConfig, 'en').map((entry) => entry.id))
      .toEqual(['searxng', 'vert', 'pairdrop', 'privatebin', 'cobalt', 'bentopdf', 'omnitools']);
    expect(discoverEntries(featuredConfig, 'en', { view: 'all', group: 'documents' }))
      .toEqual(groupEntries(featuredConfig, 'en', 'documents'));
    expect(discoverEntries(featuredConfig, 'en', { query: 'PDF' }).map((entry) => entry.id)).toEqual(['bentopdf']);
  });
});
