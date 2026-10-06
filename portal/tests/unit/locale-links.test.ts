import { describe, expect, it } from 'vitest';
import { localizedServiceUrl, localizedSupportUrl } from '../../src/catalog/locale-links';

describe('donation language links', () => {
  it('preserves the operator recipient and donation path across language changes', () => {
    expect(localizedSupportUrl('https://liberapay.com/mycelibre/donate', 'es')).toBe('https://es.liberapay.com/mycelibre/donate');
    expect(localizedSupportUrl('https://es.liberapay.com/mycelibre/donate', 'en')).toBe('https://en.liberapay.com/mycelibre/donate');
  });
  it('does not rewrite other providers or similar-looking domains', () => {
    for (const url of ['https://support.example/project', 'https://liberapay.com.example/project']) {
      expect(localizedSupportUrl(url, 'es')).toBe(url);
    }
  });
});

describe('verified upstream language links', () => {
  it('selects Offline QR Spanish through the deployed language parameter', () => {
    expect(localizedServiceUrl('qr-offline', 'https://qrtools.test/', 'es')).toBe('https://qrtools.test/?lang=es');
    expect(localizedServiceUrl('qr-offline', 'https://qrtools.test/', 'en')).toBe('https://qrtools.test/?lang=en');
  });
  it('sets the native TransLite translation target, without inventing a UI locale', () => {
    expect(localizedServiceUrl('translite', 'https://translate.test/', 'es')).toBe('https://translate.test/?tl=es');
    expect(localizedServiceUrl('translite', 'https://translate.test/', 'en')).toBe('https://translate.test/?tl=en');
  });
  it('uses the native Rallly locale cookie handoff', () => {
    expect(localizedServiceUrl('rallly', 'https://poll.test/', 'es')).toBe('https://poll.test/utilibre-language?lang=es');
  });
  it('restores a complete valid Priviblur preference set for Spanish', () => {
    expect(localizedServiceUrl('priviblur', 'https://tumblr.test/', 'es')).toBe('https://tumblr.test/settings/restore?language=es&theme=auto&expand_posts=off&version=1');
  });
  it('uses real Bento language pages, including task shortcuts', () => {
    expect(localizedServiceUrl('bentopdf', 'https://pdf.test/', 'es')).toBe('https://pdf.test/es/');
    expect(localizedServiceUrl('bentopdf', 'https://pdf.test/es/', 'en', 'ocr-pdf.html')).toBe('https://pdf.test/ocr-pdf.html');
    expect(localizedServiceUrl('bentopdf', 'https://pdf.test/es/', 'es', 'ocr-pdf.html')).toBe('https://pdf.test/es/ocr-pdf.html');
  });
  it('sets supported query parameters without losing the task', () => {
    expect(localizedServiceUrl('omnitools', 'https://tools.test/', 'es', '/json-prettify')).toBe('https://tools.test/json-prettify?lng=es');
    expect(localizedServiceUrl('ntfy', 'https://notify.test/', 'es')).toBe('https://notify.test/?lng=es');
    expect(localizedServiceUrl('drawio', 'https://draw.test/', 'es')).toBe('https://draw.test/?lang=es');
    expect(localizedServiceUrl('reactive-resume', 'https://cv.test/', 'es')).toBe('https://cv.test/?locale=es-ES');
  });
  it('uses a fixed handoff for local preference apps and does not guess for unsupported apps', () => {
    for (const id of ['vert', 'ittools', 'yopass', 'pairdrop', 'uptime-kuma', 'penpot', 'pollaris', 'safetwitch']) {
      expect(localizedServiceUrl(id, 'https://tool.test/', 'es')).toBe('https://tool.test/utilibre-language.html?lang=es');
    }
    for (const id of ['miniqr', 'hatsh', 'rssbridge', 'redlib']) {
      expect(localizedServiceUrl(id, 'https://tool.test/', 'es')).toBe('https://tool.test/');
    }
  });
});
