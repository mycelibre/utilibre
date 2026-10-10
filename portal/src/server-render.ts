import { catalogEntry, localized } from './catalog/catalog';
import { element } from './utilities/dom';
import { parseHTML } from 'linkedom';
import { renderHeader, renderFooter } from './components/shell';
import { renderStaticPage } from './pages/pages';
import { renderPracticalGuides } from './pages/practical-guides';
import { renderMyUtilibre } from './pages/my-utilibre';
import { translate } from './i18n';
import type { PublicConfig } from './config';
import type { Route } from './routes';
export { parseRoute } from './routes';
export { pageSeo, serializeStructuredData } from './seo';

// This bundle stays OUTSIDE dist/ and is never served to visitors. LinkeDOM
// creates nodes only: no script execution, asset loading, or network requests.
// Rendering is synchronous so a document cannot leak across concurrent requests.
export function renderPublicShell(route: Route, config: PublicConfig, search = ''): string {
  const previous = globalThis.document;
  const { document } = parseHTML('<!doctype html><html><head></head><body></body></html>');
  globalThis.document = document;
  try {
    const t = (key: Parameters<typeof translate>[1]) => translate(route.language, key);
    const shell = document.createElement('div');
    shell.className = 'site-shell';
    let main: HTMLElement;
    if (route.page === 'tool' || route.page === 'status') {
      main = element('main', 'page-shell'); main.id = 'main-content'; main.tabIndex = -1;
      const entry = route.toolId ? catalogEntry(route.toolId) : undefined;
      main.append(element('h1', '', entry ? localized(entry.name, route.language) : t('status.title')));
      main.append(element('p', '', t('common.needsJavaScript')));
    } else if (route.page === 'guide' || route.page === 'guides') {
      main = renderPracticalGuides(route.language, config, route.guideId);
    } else if (route.page === 'my') {
      main = renderMyUtilibre(route.language, config);
    } else main = renderStaticPage(route, config, t, new URLSearchParams(search));
    shell.append(renderHeader(route, config, t, { search }), main, renderFooter(route, config, t));
    return shell.outerHTML;
  } finally {
    if (previous) globalThis.document = previous;
    else Reflect.deleteProperty(globalThis, 'document');
  }
}
