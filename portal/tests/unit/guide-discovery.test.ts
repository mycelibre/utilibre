import { existsSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PublicConfig } from '../../src/config';
import { discoverGuides, featuredGuideIds } from '../../src/pages/guide-discovery';
import { practicalGuides, practicalGuidePath } from '../../src/pages/practical-guide-data';
import { renderPracticalGuides } from '../../src/pages/practical-guides';
import { readSharedFragment } from '../../src/utilities/toolkits';

const config = { enabledServices: ['bentopdf'], listedServices: [], publicPdfUrl: 'https://pdf.example/' } as unknown as PublicConfig;
function documentFixture() {
  const dom = parseHTML('<!doctype html><html><body></body></html>');
  vi.stubGlobal('document', dom.document);
  return dom;
}
afterEach(() => vi.unstubAllGlobals());

describe('task-first guide discovery', () => {
  it('retains every guide exactly once and puts the selected everyday tasks first', () => {
    for (const language of ['en', 'es'] as const) {
      const result = discoverGuides(practicalGuides, language);
      expect(result.slice(0, featuredGuideIds.length).map(guide => guide.id)).toEqual(featuredGuideIds);
      expect(result).toHaveLength(practicalGuides.length);
      expect(new Set(result.map(guide => guide.id)).size).toBe(practicalGuides.length);
      expect(discoverGuides(practicalGuides, language, practicalGuides[0]!.copy[language].title)[0]).toBe(practicalGuides[0]);
    }
    expect(discoverGuides(practicalGuides, 'es', 'ESCÁNER')[0]?.id).toBe('scan');
    expect(discoverGuides(practicalGuides, 'es', 'teléfono archivo')[0]?.id).toBe('transfer');
    expect(discoverGuides(practicalGuides, 'en', 'CSV chart')[0]?.id).toBe('chart');
    expect(discoverGuides(practicalGuides, 'es', 'imposiblexyz')).toEqual([]);
    expect(discoverGuides(practicalGuides, 'es', '!!!')).toEqual([]);
    expect(discoverGuides(practicalGuides, 'en', '   ')).toHaveLength(practicalGuides.length);
  });

  it('renders crawlable full indexes without JavaScript or an inert search control', () => {
    documentFixture();
    for (const language of ['en', 'es'] as const) {
      const main = renderPracticalGuides(language, config);
      expect(main.querySelector('#guide-search')).toBeNull();
      const paths = [...main.querySelectorAll('.guide-index a')].map(a => a.getAttribute('href'));
      expect(paths).toHaveLength(practicalGuides.length);
      for (const guide of practicalGuides) expect(paths).toContain(practicalGuidePath(guide.id, language));
      expect(main.querySelectorAll('.guide-featured-list a')).toHaveLength(featuredGuideIds.length);
    }
  });

  it('filters in browser memory, announces empty results and resets without requests', () => {
    const { window } = documentFixture();
    const network = vi.fn(); vi.stubGlobal('fetch', network);
    const main = renderPracticalGuides('es', config, undefined, true);
    document.body.append(main);
    const input = main.querySelector<HTMLInputElement>('#guide-search')!;
    expect(main.querySelector('label[for="guide-search"]')).not.toBeNull();
    input.value = 'escáner'; input.dispatchEvent(new window.Event('input'));
    expect([...main.querySelectorAll('.guide-index li:not([hidden])')].map(li => li.getAttribute('data-guide-id'))).toEqual(['scan']);
    input.value = '<img src=x onerror=alert(1)>'; input.dispatchEvent(new window.Event('input'));
    expect(main.querySelectorAll('.guide-index li:not([hidden])')).toHaveLength(0);
    expect(main.querySelector('.guide-index-search [role="status"]')!.textContent).toContain('Sin resultados');
    expect(main.querySelector('img')).toBeNull();
    main.querySelector<HTMLButtonElement>('.guide-index-search button')!.click();
    expect(main.querySelectorAll('.guide-index li:not([hidden])')).toHaveLength(practicalGuides.length);
    expect(input.value).toBe('');
    expect(network).not.toHaveBeenCalled();
  });

  it('uses real practice files, preserves gated launch paths and previews rather than storing collections', () => {
    documentFixture();
    for (const language of ['en', 'es'] as const) for (const id of featuredGuideIds) {
      const guide = practicalGuides.find(item => item.id === id)!;
      const main = renderPracticalGuides(language, config, id);
      expect(main.querySelector('#practice')).not.toBeNull();
      expect(main.querySelector('#steps ol li')).not.toBeNull();
      expect(main.querySelectorAll('.guide-step-overview li')).toHaveLength(3);
      for (const a of main.querySelectorAll<HTMLAnchorElement>('#practice [download]')) {
        expect(existsSync(new URL(`../../public${a.getAttribute('href')}`, import.meta.url))).toBe(true);
      }
      const shared = main.querySelector('.guide-save-collection')!.getAttribute('href')!;
      expect(readSharedFragment('#' + shared.split('#')[1])!.collection.tools).toEqual([...new Set(guide.tools.map(tool => tool.id))]);
      if (id === 'scan') expect(main.querySelector('.guide-actions a')!.getAttribute('href')).toBe(`https://pdf.example/${language === 'es' ? 'es/' : ''}ocr-pdf.html`);
      else expect(main.querySelector('.guide-actions a')).toBeNull();
    }
    expect(renderPracticalGuides('es', config, 'starting-projects').querySelector('#practice [download]')).not.toBeNull();
  });
});
