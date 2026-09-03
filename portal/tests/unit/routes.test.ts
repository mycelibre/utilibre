import { describe, expect, it } from 'vitest';
import { parseRoute, toolPath, translatedPath } from '../../src/routes';

describe('language-aware routes', () => {
  it('parses translated tool slugs', () => {
    expect(parseRoute('/en/tools/image-resize')?.toolId).toBe('image-resize');
    expect(parseRoute('/es/herramientas/redimensionar-imagen')?.toolId).toBe('image-resize');
  });

  it('preserves the current tool when languages change', () => {
    const route = parseRoute('/en/tools/pdf-merge');
    expect(route).not.toBeNull();
    expect(translatedPath(route!, 'es')).toBe('/es/herramientas/combinar-pdf');
    expect(toolPath('pdf-merge', 'en')).toBe('/en/tools/pdf-merge');

    const developer = parseRoute('/es/herramientas/verificar-firma-webhook');
    expect(developer?.toolId).toBe('webhook-signature');
    expect(translatedPath(developer!, 'en')).toBe('/en/tools/webhook-signature');
  });

  it('does not accept a path without a supported language prefix', () => {
    expect(parseRoute('/tools/json')).toBeNull();
  });
});
