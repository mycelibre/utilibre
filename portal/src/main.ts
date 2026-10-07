import { loadPublicConfig, type PublicConfig } from './config';
import { preferredLanguage, setLanguagePreference, translate } from './i18n';
import { renderPage } from './pages/pages';
import { availableRoute, parseRoute, routePath, type Route } from './routes';
import { pageSeo, serializeStructuredData } from './seo';
import { element } from './utilities/dom';
import { renderHeader, renderFooter, type Theme } from './components/shell';
import '@fontsource-variable/newsreader/wght.css';
import '@fontsource-variable/atkinson-hyperlegible-next/wght.css';
import './styles/main.css';

const staleChunkReloadKey = 'portal.stale-chunk-reload';

// A page left open across a deployment can still reference lazy chunks from the
// previous build. Vite exposes this event specifically so production clients can
// recover after those hashed files have been replaced.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  try {
    if (sessionStorage.getItem(staleChunkReloadKey) === window.location.pathname) return;
    sessionStorage.setItem(staleChunkReloadKey, window.location.pathname);
  } catch { /* Reload recovery still works when session storage is unavailable. */ }
  window.location.reload();
});

const applicationRoot = document.querySelector<HTMLDivElement>('#app');
if (!applicationRoot) throw new Error('Missing application root');
const app: HTMLDivElement = applicationRoot;
let pendingSkipFocus = false;
let firstRenderComplete = false;

function focusMainContent(main: HTMLElement): void {
  main.focus();
  main.scrollIntoView({ block: 'start' });
}

function focusHashTarget(hash: string): boolean {
  if (!hash.startsWith('#') || hash.length < 2) return false;
  let id: string;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return false; }
  const target = document.getElementById(id);
  if (!target) return false;
  if (target.tabIndex < 0) target.tabIndex = -1;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'start' });
  return true;
}

// Register this before configuration loading or the first render. A keyboard
// user can reach the skip link while the module is still awaiting configuration,
// and its target does not exist until the application has rendered.
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', (event) => {
  event.preventDefault();
  // SSR makes the target available before configuration finishes. Preserve
  // that user's focus when the initial interactive shell replaces the HTML.
  if (!firstRenderComplete) pendingSkipFocus = true;
  const main = document.querySelector<HTMLElement>('#main-content');
  if (!main) {
    pendingSkipFocus = true;
    return;
  }
  focusMainContent(main);
});

const config: PublicConfig = await loadPublicConfig();
let route = resolveInitialRoute();
let renderSequence = 0;
let activeTheme = savedTheme();
applyTheme(activeTheme);
await render();

window.addEventListener('popstate', () => {
  route = availableRoute(
    parseRoute(window.location.pathname) ?? { language: preferredLanguage(config.defaultLanguage), page: 'home' },
    Boolean(config.supportUrl),
  );
  void render(window.location.hash || undefined);
});

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;
  const anchor = event.target.closest<HTMLAnchorElement>('a[href]');
  if (!anchor || anchor.target || anchor.download || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  if (anchor.classList.contains('skip-link')) return;
  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return;
  const parsed = parseRoute(destination.pathname);
  if (!parsed) return;
  if (destination.pathname === window.location.pathname
    && destination.search === window.location.search
    && destination.hash) {
    event.preventDefault();
    history.pushState({}, '', destination.href);
    focusHashTarget(destination.hash);
    return;
  }
  event.preventDefault();
  history.pushState({}, '', destination.href);
  route = availableRoute(parsed, Boolean(config.supportUrl));
  void render(destination.hash || '#main-content');
});

function resolveInitialRoute(): Route {
  const parsed = parseRoute(window.location.pathname);
  if (parsed) return availableRoute(parsed, Boolean(config.supportUrl));
  const language = preferredLanguage(config.defaultLanguage);
  if (window.location.pathname !== '/') return { language, page: 'not-found' };
  const destination = routePath('home', language);
  history.replaceState({}, '', destination);
  return { language, page: 'home' };
}

async function render(focusAfter?: string): Promise<void> {
  const sequence = ++renderSequence;
  const routeSnapshot = { ...route };
  const t = (key: Parameters<typeof translate>[1]) => translate(routeSnapshot.language, key);
  const page = await renderPage(routeSnapshot, config, t, new URLSearchParams(window.location.search));
  if (sequence !== renderSequence) return;
  document.documentElement.lang = routeSnapshot.language;
  document.querySelector<HTMLElement>('.skip-link')!.textContent = t('a11y.skip');
  const shell = element('div', 'site-shell');
  shell.append(renderHeader(routeSnapshot, config, t, {
    theme: activeTheme, search: window.location.search, interactive: true,
    onLanguage: setLanguagePreference,
    onTheme: (next) => {
      activeTheme = next;
      try { localStorage.setItem('portal.theme', next); } catch { /* Optional local preference. */ }
      applyTheme(next);
    },
  }), page, renderFooter(routeSnapshot, config, t));
  app.replaceChildren(shell);
  firstRenderComplete = true;
  try { sessionStorage.removeItem(staleChunkReloadKey); } catch { /* Optional recovery state only. */ }
  updateMetadata(routeSnapshot);
  if (pendingSkipFocus) {
    pendingSkipFocus = false;
    focusMainContent(page);
  } else if (focusAfter) {
    focusHashTarget(focusAfter);
  }
}

function updateMetadata(currentRoute: Route): void {
  const meta = pageSeo(currentRoute, config, window.location.search, window.location.origin);
  document.title = meta.title;
  setMeta('description', meta.description);
  setMeta('robots', meta.robots);
  setPropertyMeta('og:title', meta.title);
  setPropertyMeta('og:description', meta.description);
  setPropertyMeta('og:type', 'website');
  setPropertyMeta('og:site_name', config.projectName);
  setPropertyMeta('og:url', meta.canonical);
  setPropertyMeta('og:image', meta.image);
  setPropertyMeta('og:image:alt', `${config.projectName} logo`);
  setMeta('twitter:card', 'summary');
  if (meta.canonical) setCanonical(meta.canonical);
  else document.querySelector('link[rel="canonical"]')?.remove();
  for (const existing of document.head.querySelectorAll('link[rel="alternate"][hreflang]')) existing.remove();
  for (const [language, href] of Object.entries(meta.alternates)) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = language;
    link.href = href;
    document.head.append(link);
  }
  document.getElementById('public-structured-data')?.remove();
  if (meta.structuredData) {
    const data = document.createElement('script');
    data.id = 'public-structured-data';
    data.type = 'application/ld+json';
    data.textContent = serializeStructuredData(meta.structuredData);
    document.head.append(data);
  }
}

function setMeta(name: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta) { meta = document.createElement('meta'); meta.name = name; document.head.append(meta); }
  meta.content = content;
}

function setPropertyMeta(property: string, content: string): void {
  let meta = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!meta) { meta = document.createElement('meta'); meta.setAttribute('property', property); document.head.append(meta); }
  meta.content = content;
}

function setCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.append(link); }
  link.href = href;
}

function savedTheme(): Theme {
  try {
    const value = localStorage.getItem('portal.theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
function applyTheme(theme: Theme): void { if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; }
