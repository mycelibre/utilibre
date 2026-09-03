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
  projectName: 'Utilibre',
  projectTagline: '',
  projectTaglineEn: '',
  projectTaglineEs: '',
  sourceCodeUrl: '',
  supportUrl: '',
  contactUrl: '',
  publicSearchUrl: '',
  publicRedditUrl: '',
  publicYoutubeUrl: '',
  publicImgurUrl: '',
  publicNtfyUrl: '',
  publicPdfUrl: '',
  publicConvertUrl: '',
  publicToolsUrl: '',
  publicMonitorUrl: '',
  publicSendUrl: '',
  publicRssUrl: '',
  publicFeedsUrl: '',
  publicPasteUrl: '',
  publicWakapiUrl: '',
  enabledServices: [],
  defaultLanguage: 'en',
};

function config(overrides: Partial<PublicConfig> = {}): PublicConfig {
  return { ...baseConfig, ...overrides };
}

describe('catalog discovery metadata', () => {
  it('assigns an explicit discovery group to every entry and preserves the editorial feature order', () => {
    expect(catalog.every((entry) => discoveryGroups.includes(entry.discoveryGroup))).toBe(true);
    expect(catalog
      .filter((entry) => entry.featuredOrder !== undefined)
      .sort((left, right) => (left.featuredOrder ?? 0) - (right.featuredOrder ?? 0))
      .map((entry) => entry.id))
      .toEqual(['searxng', 'vert', 'pairdrop', 'privatebin', 'image-resize', 'pdf-merge', 'qr-generate']);
  });
});

describe('config-gated catalog discovery', () => {
  it('keeps local tools launchable and exposes only enabled, configured, deployed services', () => {
    const entries = launchableEntries(config({
      enabledServices: ['searxng', 'cobalt', 'redlib', 'vert', 'invidious'],
      publicSearchUrl: 'https://search.example.test/',
      publicRedditUrl: 'https://reddit.example.test/',
      publicYoutubeUrl: 'https://video.example.test/',
    }));
    const ids = entries.map((entry) => entry.id);

    expect(ids).toContain('image-resize');
    expect(ids).toContain('searxng');
    expect(ids).toContain('cobalt');
    expect(ids).toContain('redlib');
    expect(ids).toContain('private-router');
    expect(ids).not.toContain('vert');
    expect(ids).not.toContain('invidious');
    expect(ids).not.toContain('rimgo');
  });

  it('returns featured entries in explicit editorial order and skips unavailable services', () => {
    const fullyConfigured = config({
      enabledServices: ['searxng', 'vert', 'pairdrop', 'privatebin'],
      publicSearchUrl: 'https://search.example.test/',
      publicConvertUrl: 'https://convert.example.test/',
      publicSendUrl: 'https://send.example.test/',
      publicPasteUrl: 'https://paste.example.test/',
    });
    expect(featuredEntries(fullyConfigured).map((entry) => entry.id))
      .toEqual(['searxng', 'vert', 'pairdrop', 'privatebin', 'image-resize', 'pdf-merge', 'qr-generate']);
    expect(featuredEntries(baseConfig).map((entry) => entry.id))
      .toEqual(['image-resize', 'pdf-merge', 'qr-generate']);
  });

  it('resolves internal tool routes and hosted service URLs without exposing disabled entries', () => {
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
    expect(entryLaunch(catalogEntry('image-resize')!, 'es', configured))
      .toEqual({ href: '/es/herramientas/redimensionar-imagen', external: false });
    expect(entryLaunch(catalogEntry('searxng')!, 'en', configured)).toBeNull();
  });
});

describe('localized catalog filtering', () => {
  it('normalizes case and diacritics in both product languages', () => {
    expect(normalizeCatalogSearch('  BÚSQUEDA  ', 'es')).toBe('busqueda');
    expect(normalizeCatalogSearch('Résumé', 'en')).toBe('resume');

    const configured = config({ enabledServices: ['searxng'], publicSearchUrl: 'https://search.example.test/' });
    expect(searchEntries(configured, 'es', 'BUSQUEDA').map((entry) => entry.id)).toContain('searxng');
    expect(searchEntries(baseConfig, 'es', 'codigos qr').map((entry) => entry.id)).toContain('qr-generate');
    expect(searchEntries(baseConfig, 'en', 'IMAGE RESIZE').map((entry) => entry.id)).toContain('image-resize');
    expect(searchEntries(baseConfig, 'en', '   ')).toEqual([]);
  });

  it('returns localized A-Z group and all-entry views', () => {
    const documents = groupEntries(baseConfig, 'en', 'documents');
    expect(documents.map((entry) => entry.id).sort())
      .toEqual(['pdf-extract', 'pdf-merge', 'pdf-reorder', 'pdf-rotate']);

    const all = allEntries(baseConfig, 'es');
    const names = all.map((entry) => entry.name.es);
    expect(names).toEqual([...names].sort(new Intl.Collator('es', { sensitivity: 'base' }).compare));
    expect(all.map((entry) => entry.id)).not.toContain('private-router');
  });

  it('prioritizes query, then group, then all, with featured as the default', () => {
    expect(discoverEntries(baseConfig, 'en').map((entry) => entry.id))
      .toEqual(['image-resize', 'pdf-merge', 'qr-generate']);
    expect(discoverEntries(baseConfig, 'en', { view: 'all', group: 'documents' }))
      .toEqual(groupEntries(baseConfig, 'en', 'documents'));
    expect(discoverEntries(baseConfig, 'en', { view: 'all', group: 'documents', query: 'UUID' }).map((entry) => entry.id))
      .toEqual(['uuid']);
  });
});
