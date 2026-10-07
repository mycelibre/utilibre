import { parseHTML } from 'linkedom';
import { renderHeader, renderFooter } from './components/shell';
import { renderStaticPage } from './pages/pages';
import { translate } from './i18n';
import type { PublicConfig } from './config';
import type { Route } from './routes';
export { parseRoute } from './routes';
export { pageSeo, serializeStructuredData } from './seo';

// This bundle stays OUTSIDE dist/ and is never served to visitors. LinkeDOM
// creates nodes only: no script execution, asset loading, or network requests.
// Rendering is synchronous so a document cannot leak across concurrent requests.
export function renderPublicShell(route: Route, config: PublicConfig, search = ''): string {
  if (route.page === 'tool' || route.page === 'status') return '';
  const previous = globalThis.document;
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>');
  globalThis.document = document;
  try {
    const t = (key: Parameters<typeof translate>[1]) => translate(route.language, key);
    const shell = document.createElement('div');
    shell.className = 'site-shell';
    shell.append(renderHeader(route, config, t, { search }), renderStaticPage(route, config, t, new URLSearchParams(search)), renderFooter(route, config, t));
    return shell.outerHTML;
  } finally {
    if (previous) globalThis.document = previous;
    else Reflect.deleteProperty(globalThis, 'document');
  }
}
