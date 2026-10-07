import type { PublicConfig } from './config';
import { translate } from './i18n';
import { pageMeta } from './pages/pages';
import { translatedPath, type Route } from './routes';

// One source for browser navigation and the initial HTTP document. The origin
// comes from operator configuration, never Host/X-Forwarded-Host or a query.
export function pageSeo(route: Route, config: PublicConfig, search = '', fallbackOrigin = '') {
  const meta = pageMeta(route, config, (key) => translate(route.language, key));
  const origin = config.publicPortalOrigin || fallbackOrigin;
  const notFound = route.page === 'not-found' || (route.page === 'support' && !config.supportUrl);
  const params = new URLSearchParams(search);
  const filtered = route.page === 'home' && ['q', 'group', 'view'].some((key) => params.has(key));
  const robots = !config.publicPortalOrigin ? 'noindex,nofollow' : filtered ? 'noindex,follow' : meta.robots;
  const canonical = !notFound && origin ? new URL(translatedPath(route, route.language), origin).href : '';
  const alternates = !notFound && origin ? {
    en: new URL(translatedPath(route, 'en'), origin).href,
    es: new URL(translatedPath(route, 'es'), origin).href,
    'x-default': new URL(translatedPath(route, config.defaultLanguage), origin).href,
  } : {};
  const title = `${meta.title} — ${config.projectName}`;
  const image = origin ? `${origin}/brand/png/icon-512.png` : '';
  const structuredData = robots === 'index,follow' && canonical ? {
    '@context': 'https://schema.org',
    '@graph': [
      ...(route.page === 'home' ? [{ '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: config.projectName, inLanguage: ['en', 'es'] }] : []),
      { '@type': 'WebPage', '@id': canonical, url: canonical, name: title, description: meta.description, inLanguage: route.language, isPartOf: { '@id': `${origin}/#website` } },
    ],
  } : null;
  return { ...meta, title, robots, canonical, alternates, image, structuredData };
}

// Safe even when an operator-provided name contains markup or script endings.
export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}
