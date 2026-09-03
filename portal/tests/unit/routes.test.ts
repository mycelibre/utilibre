import { describe, expect, it } from 'vitest';
import { parseRoute, toolPath, translatedPath } from '../../src/routes';

describe('language-aware routes', () => {
  it('parses translated tool slugs', () => {
    expect(parseRoute('/en/tools/open-privately')?.toolId).toBe('private-router');
    expect(parseRoute('/es/herramientas/abrir-con-privacidad')?.toolId).toBe('private-router');
  });

  it('preserves the current tool when languages change', () => {
    const route = parseRoute('/en/tools/download-media');
    expect(route).not.toBeNull();
    expect(translatedPath(route!, 'es')).toBe('/es/herramientas/descargar-contenido');
    expect(toolPath('cobalt', 'en')).toBe('/en/tools/download-media');
  });

  it('does not accept a path without a supported language prefix', () => {
    expect(parseRoute('/tools/json')).toBeNull();
  });
});
