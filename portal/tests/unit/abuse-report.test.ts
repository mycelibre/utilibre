import { parseHTML } from 'linkedom';
import { describe, expect, it } from 'vitest';
import type { PublicConfig } from '../../src/config';
import { parseRoute, translatedPath } from '../../src/routes';
import { renderPublicShell } from '../../src/server-render';
import { pageSeo } from '../../src/seo';

const config = {
  projectName: 'Utilibre', publicPortalOrigin: 'https://utilibre.org',
  enabledServices: [], listedServices: [], defaultLanguage: 'en',
} as unknown as PublicConfig;

describe('public abuse reporting', () => {
  for (const [language, path, label] of [
    ['en', '/en/abuse', 'Report abuse'],
    ['es', '/es/denunciar-abuso', 'Denunciá abusos'],
  ] as const) {
    it(`renders the ${language} report route without JavaScript or an account`, () => {
      const route = parseRoute(path)!;
      expect(route).toEqual({ language, page: 'abuse' });
      const html = renderPublicShell(route, config, '?url=SHOULD_NOT_BE_COPIED#SECRET');
      const { document } = parseHTML(html);
      expect(document.querySelector('main h1')?.textContent).toBe(label);
      const email = document.querySelector('main a[href^="mailto:"]')!;
      expect(email.textContent).toBe('admin@utilibre.org');
      const url = new URL(email.getAttribute('href')!);
      expect(url.pathname).toBe('admin@utilibre.org');
      expect([...url.searchParams.keys()]).toEqual(['subject']);
      expect(document.querySelector('main')!.textContent).not.toMatch(/SHOULD_NOT_BE_COPIED|SECRET/);
      expect(document.querySelector('main form, main iframe, main script, main input')).toBeNull();
      expect(document.querySelector('main')!.textContent).toContain('links.utilibre.org');
      const footer = document.querySelector(`footer a[href="${path}"]`)!;
      expect(footer.textContent).toBe(label);
      expect(footer.getAttribute('rel')).toBe('noreferrer');
      expect(footer.getAttribute('referrerpolicy')).toBe('no-referrer');
      const metadata = pageSeo(route, config);
      expect(metadata.canonical).toBe(`https://utilibre.org${path}`);
      expect(metadata.alternates.es).toBe('https://utilibre.org/es/denunciar-abuso');
      expect(translatedPath(route, 'en')).toBe('/en/abuse');
    });
  }
});
