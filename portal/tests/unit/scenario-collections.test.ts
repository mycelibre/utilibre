import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseHTML } from 'linkedom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { catalog, catalogEntry } from '../../src/catalog/catalog.ts';
import type { PublicConfig } from '../../src/config.ts';
import { collectionPath, scenarioCollections } from '../../src/pages/scenario-collection-data.ts';
import { practicalGuides } from '../../src/pages/practical-guide-data.ts';
import { renderCollectionLinks, renderScenarioCollection } from '../../src/pages/scenario-collections.ts';
import { readSharedFragment } from '../../src/utilities/toolkits.ts';

function configuration(enabled = true): PublicConfig {
  return {
    ...Object.fromEntries(catalog.filter(entry => entry.configUrlKey).map(entry => [entry.configUrlKey!, `https://${entry.providerId}.example.test/`])),
    publicPortalOrigin: 'https://utilibre.example.test', contactUrl: '',
    enabledServices: enabled ? [...new Set(catalog.map(entry => entry.serviceId ?? entry.id))] : [],
    listedServices: [],
  } as unknown as PublicConfig;
}

beforeEach(() => {
  const { document } = parseHTML('<!doctype html><html><body></body></html>');
  vi.stubGlobal('document', document);
});
afterEach(() => vi.unstubAllGlobals());

describe('curated everyday collections', () => {
  it('uses distinct localized paths and existing public catalogue tools and guides', () => {
    const routes = new Set<string>();
    for (const collection of scenarioCollections) {
      expect(collection.tools.length).toBeGreaterThanOrEqual(3);
      expect(collection.tools.length).toBeLessThanOrEqual(4);
      expect(new Set(collection.tools.map(tool => tool.id)).size).toBe(collection.tools.length);
      for (const tool of collection.tools) {
        const entry = catalogEntry(tool.id);
        expect(entry, tool.id).toBeDefined();
        expect(entry!.operationalStatus).toBe('operational');
        expect(entry!.accountAccess).toBeUndefined();
        if (tool.guide !== 'qr') expect(practicalGuides.some(guide => guide.id === tool.guide)).toBe(true);
      }
      for (const language of ['en', 'es'] as const) {
        const path = collectionPath(collection.id, language);
        expect(path.startsWith(`/${language}/`)).toBe(true);
        expect(routes.has(path)).toBe(false); routes.add(path);
        expect(existsSync(resolve('public/examples', collection.example.sample.replace('{lang}', language)))).toBe(true);
      }
    }
    expect(() => collectionPath('missing', 'en')).toThrow();
  });

  it('opens a correctly localized shared preview without storing or replacing preferences', () => {
    const setItem = vi.fn(); vi.stubGlobal('localStorage', { setItem });
    for (const collection of scenarioCollections) for (const language of ['en', 'es'] as const) {
      const main = renderScenarioCollection(collection.id, language, configuration());
      const save = main.querySelector<HTMLAnchorElement>('a[href*="#collection="]')!;
      const url = new URL(save.href, 'https://utilibre.example.test');
      expect(url.pathname).toBe(`/${language}/${language === 'es' ? 'mi-utilibre' : 'my-utilibre'}`);
      expect(readSharedFragment(url.hash)).toEqual({ version: 1, language, collection: { label: collection.title[language], tools: collection.tools.map(tool => tool.id) } });
      expect(main.querySelectorAll('.collection-tools-list > li')).toHaveLength(collection.tools.length);
      expect(main.querySelectorAll('.collection-tools-list a[target="_blank"]')).toHaveLength(collection.tools.length);
      expect(main.querySelector('header a[href*="#collection="]')).not.toBeNull();
      expect([...main.querySelectorAll('a[href*="#collection="]')].map(a => a.getAttribute('href'))).toEqual([save.getAttribute('href'), save.getAttribute('href')]);
      expect(main.children[1]?.id).toBe('collection-example');
      expect(main.children[2]?.id).toBe('collection-tools');
      expect(main.querySelector<HTMLButtonElement>('button')!.hidden).toBe(true);
    }
    expect(setItem).not.toHaveBeenCalled();
  });

  it('does not render launch links for disabled services, while preserving their explanation and guides', () => {
    const main = renderScenarioCollection('workshop', 'es', configuration(false));
    expect(main.querySelectorAll('.collection-tools-list > li')).toHaveLength(4);
    expect(main.querySelectorAll('.collection-tools-list a[target="_blank"]')).toHaveLength(0);
    expect(main.querySelector('.collection-tools-list a[href="/es/codigos-qr"]')).not.toBeNull();
    expect(main.querySelector('.collection-access')!.textContent).toContain('no estar disponible');
  });

  it('copies the canonical page URL without query attribution or private collection fields', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const main = renderScenarioCollection('documents', 'en', configuration(), true);
    const copy = main.querySelector<HTMLButtonElement>('button')!;
    expect(copy.hidden).toBe(false); copy.click();
    await Promise.resolve(); await Promise.resolve();
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith('https://utilibre.example.test/en/collections/documents-and-applications');
    expect(main.querySelector('[role="status"]')?.textContent).toBe('Link copied.');
  });

  it('offers an ordinary selected URL when clipboard permission fails', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const main = renderScenarioCollection('study', 'es', configuration(), true);
    const input = main.querySelector<HTMLInputElement>('input')!;
    input.select = vi.fn(); input.focus = vi.fn();
    main.querySelector<HTMLButtonElement>('button')!.click();
    await Promise.resolve(); await Promise.resolve();
    expect(input.parentElement!.hidden).toBe(false);
    expect(input.select).toHaveBeenCalledOnce();
    expect(input.value).toBe('https://utilibre.example.test/es/colecciones/estudio-y-presentaciones');
    expect(main.querySelector('[role="status"]')?.textContent).toContain('manualmente');
  });

  it('keeps the survey preview consistent with the downloadable source data', () => {
    for (const language of ['en', 'es'] as const) {
      const main = renderScenarioCollection('study', language, configuration());
      const rows = [...main.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('th, td')].map(cell => cell.textContent).join(','));
      const csv = readFileSync(resolve(`public/examples/survey-${language}.csv`), 'utf8').trim().split('\n').slice(1);
      expect(rows).toEqual(csv);
    }
  });

  it('links each compact collection entry to its own localized landing page', () => {
    for (const language of ['en', 'es'] as const) {
      const section = renderCollectionLinks(language);
      expect(section.querySelector('h2')).not.toBeNull();
      expect([...section.querySelectorAll('a')].map(a => a.getAttribute('href'))).toEqual(scenarioCollections.map(collection => collectionPath(collection.id, language)));
    }
  });
});
