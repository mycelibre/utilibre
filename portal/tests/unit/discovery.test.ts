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
  publicRssUrl: '', publicPasteUrl: '', enabledServices: [], defaultLanguage: 'en',
  publicPdfUrl: '', publicConvertUrl: '', publicToolsUrl: '', publicDeveloperToolsUrl: '',
  publicEncryptUrl: '', publicDrawUrl: '', publicQrUrl: '',
  publicBridgeUrl: '', publicNotifyUrl: '', publicSecretUrl: '', publicDropUrl: '', publicStatusUrl: '',
  publicPythonUrl: '', publicTranscribeUrl: '', publicWakapiUrl: '', listedServices: [],
  publicResumeUrl: '', publicDesignUrl: '', publicBudgetUrl: '',
};

function config(overrides: Partial<PublicConfig> = {}): PublicConfig {
  return { ...baseConfig, ...overrides };
}

const hostedConfig = config({
  enabledServices: ['searxng', 'redlib', 'freshrss', 'privatebin'],
  publicSearchUrl: 'https://search.example.test/',
  publicRedditUrl: 'https://reddit.example.test/',
  publicRssUrl: 'https://rss.example.test/',
  publicPasteUrl: 'https://paste.example.test/',
});

describe('catalog discovery metadata', () => {
  it('keeps reviewed applications and one narrow integration', () => {
    expect(catalog.map((entry) => entry.id)).toEqual([
      'reactive-resume', 'penpot', 'actual', 'rallly', 'breezewiki', 'wakapi',
      'whisper-web', 'jupyterlite',
      'rssbridge', 'ntfy', 'yopass', 'pairdrop', 'uptime-kuma',
      'bentopdf', 'vert', 'omnitools', 'hatsh', 'drawio', 'miniqr', 'ittools',
      'searxng', 'freshrss', 'redlib', 'privatebin', 'private-router',
    ]);
    expect(catalog.every((entry) => discoveryGroups.includes(entry.discoveryGroup))).toBe(true);
    expect(catalog.filter((entry) => entry.featuredOrder !== undefined)
      .sort((left, right) => (left.featuredOrder ?? 0) - (right.featuredOrder ?? 0))
      .map((entry) => entry.id))
      .toEqual(['bentopdf', 'vert', 'omnitools', 'hatsh', 'drawio', 'miniqr', 'ittools', 'searxng', 'redlib', 'privatebin', 'freshrss', 'rssbridge', 'ntfy', 'yopass', 'pairdrop', 'uptime-kuma', 'whisper-web', 'jupyterlite', 'reactive-resume', 'penpot', 'actual', 'rallly', 'breezewiki', 'wakapi']);
  });

  it('keeps unrequested retired applications out of the catalog', () => {
    const removedIds = ['cobalt', 'healthchecks', 'rsshub', 'swagger-editor'];
    expect(catalog.filter((entry) => removedIds.includes(entry.id))).toEqual([]);
    expect(new Set(catalog.map((entry) => entry.kind))).toEqual(new Set(['service', 'integration']));
  });
});

describe('config-gated catalog discovery', () => {
  it('lists explicitly requested pending services without enabling their launch', () => {
    const listedServices = ['whisper-web', 'jupyterlite', 'reactive-resume', 'penpot', 'actual', 'rallly', 'breezewiki', 'wakapi'];
    const pending = config({ listedServices });
    expect(featuredEntries(pending).map((entry) => entry.id)).toEqual(listedServices);
    for (const entry of featuredEntries(pending)) expect(entryLaunch(entry, 'es', pending)).toBeNull();
    expect(searchEntries(pending, 'en', 'résumé').map((entry) => entry.id)).toContain('reactive-resume');
    expect(featuredEntries(config({ listedServices: ['cobalt', 'not-a-tool'] }))).toEqual([]);
  });

  it('requires an explicit URL for every invitation-only service', () => {
    const pilot = config({ enabledServices: ['wakapi', 'penpot'], listedServices: ['wakapi', 'penpot'], publicWakapiUrl: 'https://wakapi.example.test/' });
    expect(entryLaunch(catalogEntry('wakapi')!, 'en', pilot)?.href).toBe('https://wakapi.example.test/');
    expect(entryLaunch(catalogEntry('penpot')!, 'en', pilot)).toBeNull();
    expect(catalogEntry('wakapi')!.accountAccess).toBe('invite-required');
    const approved = config({ enabledServices: ['reactive-resume', 'penpot', 'actual'], publicResumeUrl: 'https://cv.example.test/', publicDesignUrl: 'https://design.example.test/', publicBudgetUrl: 'https://budget.example.test/' });
    for (const id of ['reactive-resume', 'penpot', 'actual']) {
      expect(entryLaunch(catalogEntry(id)!, 'en', approved)).not.toBeNull();
      expect(catalogEntry(id)!.accountAccess).toBe('invite-required');
    }
  });
  it('exposes only retained, enabled, configured services', () => {
    const entries = launchableEntries(config({
      enabledServices: ['searxng', 'redlib', 'cobalt', 'rsshub'],
      publicSearchUrl: 'https://search.example.test/',
      publicRedditUrl: 'https://reddit.example.test/',
    }));
    expect(entries.map((entry) => entry.id)).toEqual(['searxng', 'redlib', 'private-router']);
  });

  it('returns retained hosted applications in explicit order and no unconfigured defaults', () => {
    expect(featuredEntries(hostedConfig).map((entry) => entry.id))
      .toEqual(['searxng', 'redlib', 'privatebin', 'freshrss']);
    expect(featuredEntries(baseConfig)).toEqual([]);
  });

  it('resolves only the Redlib URL router internally', () => {
    expect(entryLaunch(catalogEntry('private-router')!, 'es', hostedConfig))
      .toEqual({ href: '/es/herramientas/abrir-con-privacidad', external: false });
    expect(entryLaunch(catalogEntry('searxng')!, 'en', hostedConfig))
      .toEqual({ href: 'https://search.example.test/', external: true });
    expect(catalogEntry('cobalt')).toBeUndefined();
  });

  it('gates the Redlib router with the same configured service as Redlib', () => {
    expect(entryLaunch(catalogEntry('private-router')!, 'en', config({
      enabledServices: ['redlib'], publicRedditUrl: 'https://reddit.example.test/',
    }))).not.toBeNull();
    expect(entryLaunch(catalogEntry('private-router')!, 'en', config({ enabledServices: ['redlib'] }))).toBeNull();
  });
});

describe('localized catalog filtering', () => {
  it('normalizes case and diacritics in both product languages', () => {
    expect(normalizeCatalogSearch('  BÚSQUEDA  ', 'es')).toBe('busqueda');
    expect(normalizeCatalogSearch('Résumé', 'en')).toBe('resume');
    expect(searchEntries(hostedConfig, 'es', 'BUSQUEDA').map((entry) => entry.id)).toContain('searxng');
    expect(searchEntries(hostedConfig, 'es', 'RSS').map((entry) => entry.id)).toContain('freshrss');
    expect(searchEntries(hostedConfig, 'en', 'PDF')).toEqual([]);
    expect(searchEntries(hostedConfig, 'en', '   ')).toEqual([]);
  });

  it('returns localized task and A–Z views', () => {
    expect(groupEntries(hostedConfig, 'en', 'feeds-monitoring').map((entry) => entry.id)).toEqual(['freshrss']);
    const all = allEntries(hostedConfig, 'es');
    const names = all.map((entry) => entry.name.es);
    expect(names).toEqual([...names].sort(new Intl.Collator('es', { sensitivity: 'base' }).compare));
  });

  it('prioritizes query, then group, then all, with hosted services as the default', () => {
    expect(discoverEntries(hostedConfig, 'en').map((entry) => entry.id))
      .toEqual(['searxng', 'redlib', 'privatebin', 'freshrss']);
    expect(discoverEntries(hostedConfig, 'en', { view: 'all', group: 'text-data' }))
      .toEqual(groupEntries(hostedConfig, 'en', 'text-data'));
    expect(discoverEntries(hostedConfig, 'en', { query: 'encrypted' }).map((entry) => entry.id))
      .toEqual(['privatebin']);
  });
});
