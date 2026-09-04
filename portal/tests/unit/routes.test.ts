import { describe, expect, it } from 'vitest';
import { availableRoute, parseRoute, toolPath, translatedPath } from '../../src/routes';

describe('language-aware routes', () => {
  it('parses translated tool slugs', () => {
    expect(parseRoute('/en/tools/open-privately')?.toolId).toBe('private-router');
    expect(parseRoute('/es/herramientas/abrir-con-privacidad')?.toolId).toBe('private-router');
  });

  it('preserves the current tool when languages change', () => {
    const route = parseRoute('/en/tools/open-privately');
    expect(route).not.toBeNull();
    expect(translatedPath(route!, 'es')).toBe('/es/herramientas/abrir-con-privacidad');
    expect(toolPath('private-router', 'en')).toBe('/en/tools/open-privately');
  });

  it('returns localized not-found routes for the removed Cobalt adapter', () => {
    expect(parseRoute('/en/tools/download-media')?.page).toBe('not-found');
    expect(parseRoute('/es/herramientas/descargar-contenido')?.page).toBe('not-found');
  });

  it('does not accept a path without a supported language prefix', () => {
    expect(parseRoute('/tools/json')).toBeNull();
  });

  it('makes donation routes unavailable until a destination is configured', () => {
    const english = parseRoute('/en/support')!;
    const spanish = parseRoute('/es/apoyar')!;
    expect(availableRoute(english, false)).toEqual({ language: 'en', page: 'not-found' });
    expect(availableRoute(spanish, false)).toEqual({ language: 'es', page: 'not-found' });
    expect(availableRoute(english, true)).toBe(english);
    expect(availableRoute(spanish, true)).toBe(spanish);
  });
});
