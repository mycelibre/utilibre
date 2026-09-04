import { loadPublicConfig, type PublicConfig } from './config';
import { preferredLanguage, setLanguagePreference, translate, type Language } from './i18n';
import { pageMeta, renderPage } from './pages/pages';
import { availableRoute, parseRoute, routePath, translatedPath, type Route } from './routes';
import { append, element } from './utilities/dom';
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
  shell.append(renderHeader(routeSnapshot, t), page, renderFooter(routeSnapshot, t));
  app.replaceChildren(shell);
  try { sessionStorage.removeItem(staleChunkReloadKey); } catch { /* Optional recovery state only. */ }
  updateMetadata(routeSnapshot, t);
  if (pendingSkipFocus) {
    pendingSkipFocus = false;
    focusMainContent(page);
  } else if (focusAfter) {
    focusHashTarget(focusAfter);
  }
}

function renderHeader(currentRoute: Route, t: (key: Parameters<typeof translate>[1]) => string): HTMLElement {
  const header = element('header', 'site-header');
  const inner = element('div', 'header-inner');
  const brand = element('a', 'brand');
  brand.href = routePath('home', currentRoute.language);
  brand.ariaLabel = t('a11y.home');
  const coralLogo = element('img', 'brand-logo brand-logo-coral');
  coralLogo.src = '/brand/svg/utilibre-logo-coral.svg';
  coralLogo.alt = '';
  coralLogo.width = 301;
  coralLogo.height = 82;
  coralLogo.setAttribute('aria-hidden', 'true');
  const whiteLogo = element('img', 'brand-logo brand-logo-white');
  whiteLogo.src = '/brand/svg/utilibre-logo-white.svg';
  whiteLogo.alt = '';
  whiteLogo.width = 301;
  whiteLogo.height = 82;
  whiteLogo.setAttribute('aria-hidden', 'true');
  brand.append(coralLogo, whiteLogo);
  const purpose = element('p', 'header-purpose', t('nav.tagline'));
  const toggle = element('button', 'menu-toggle', t('nav.menu'));
  toggle.type = 'button';
  toggle.ariaExpanded = 'false';
  toggle.setAttribute('aria-controls', 'main-navigation');
  const nav = element('nav', 'main-nav');
  nav.id = 'main-navigation';
  nav.ariaLabel = t('a11y.menu');
  const links: Array<[Parameters<typeof routePath>[0], Parameters<typeof translate>[1]]> = [
    ['home', 'nav.catalog'], ['privacy', 'nav.privacy'], ['about', 'footer.about'], ['status', 'nav.status'], ['support', 'footer.support'],
  ];
  for (const [page, key] of links) {
    if (page === 'support' && !config.supportUrl) continue;
    const link = element('a', '', t(key));
    link.href = routePath(page, currentRoute.language);
    if (currentRoute.page === page) link.ariaCurrent = 'page';
    nav.append(link);
  }
  const controls = element('div', 'header-controls');
  const language = element('nav', 'language-switch');
  language.ariaLabel = t('a11y.language');
  for (const [index, code] of (['en', 'es'] as Language[]).entries()) {
    if (index > 0) {
      const separator = element('span', 'language-separator', '/');
      separator.ariaHidden = 'true';
      language.append(separator);
    }
    const link = element('a', '', code.toUpperCase());
    link.lang = code;
    link.href = `${translatedPath(currentRoute, code)}${window.location.search}`;
    if (code === currentRoute.language) link.ariaCurrent = 'page';
    link.addEventListener('click', () => setLanguagePreference(code));
    language.append(link);
  }
  const theme = element('button', 'theme-toggle', themeText(activeTheme, t));
  theme.type = 'button';
  theme.ariaLabel = themeAccessibleLabel(activeTheme, t);
  theme.addEventListener('click', () => {
    const next = activeTheme === 'system' ? 'light' : activeTheme === 'light' ? 'dark' : 'system';
    activeTheme = next;
    try { localStorage.setItem('portal.theme', next); } catch { /* The theme still applies for this page view. */ }
    applyTheme(next);
    theme.textContent = themeText(next, t);
    theme.ariaLabel = themeAccessibleLabel(next, t);
  });
  append(controls, language, theme);
  append(inner, brand, purpose, toggle, nav, controls);
  header.append(inner);
  toggle.addEventListener('click', () => {
    const open = toggle.ariaExpanded !== 'true';
    toggle.ariaExpanded = String(open);
    toggle.textContent = open ? t('nav.close') : t('nav.menu');
    nav.dataset.open = String(open);
  });
  return header;
}

function renderFooter(currentRoute: Route, t: (key: Parameters<typeof translate>[1]) => string): HTMLElement {
  const footer = element('footer', 'site-footer');
  const inner = element('div', 'footer-inner');
  const links = element('nav', 'footer-links');
  links.ariaLabel = t('a11y.menu');
  const items: Array<[Parameters<typeof routePath>[0], Parameters<typeof translate>[1]]> = [
    ['about', 'footer.about'], ['transparency', 'nav.transparency'], ['privacy', 'nav.privacy'], ['acceptable', 'footer.acceptable'], ['support', 'footer.support'], ['status', 'nav.status'], ['software', 'footer.software'], ['labels', 'footer.labels'],
  ];
  for (const [page, key] of items) {
    if (page === 'support' && !config.supportUrl) continue;
    const link = element('a', '', t(key));
    link.href = routePath(page, currentRoute.language);
    links.append(link);
  }
  if (config.sourceCodeUrl) {
    const source = element('a', '', t('footer.source'));
    source.href = config.sourceCodeUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    links.append(source);
  }
  if (config.contactUrl) {
    const contact = element('a', '', t('footer.contact'));
    contact.href = config.contactUrl;
    contact.target = '_blank';
    contact.rel = 'noopener noreferrer';
    links.append(contact);
  }
  append(inner, links, element('p', 'footer-statement', t('footer.statement')));
  footer.append(inner);
  return footer;
}

function updateMetadata(currentRoute: Route, t: (key: Parameters<typeof translate>[1]) => string): void {
  const meta = pageMeta(currentRoute, config, t);
  document.title = `${meta.title} — ${config.projectName}`;
  setMeta('description', meta.description);
  setMeta('robots', meta.robots);
  setPropertyMeta('og:title', meta.title);
  setPropertyMeta('og:description', meta.description);
  setPropertyMeta('og:type', 'website');
  setCanonical(new URL(translatedPath(currentRoute, currentRoute.language), window.location.origin).href);
  for (const existing of document.head.querySelectorAll('link[rel="alternate"][hreflang]')) existing.remove();
  for (const language of ['en', 'es'] as Language[]) {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = language;
    link.href = new URL(translatedPath(currentRoute, language), window.location.origin).href;
    document.head.append(link);
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

type Theme = 'system' | 'light' | 'dark';
function savedTheme(): Theme {
  try {
    const value = localStorage.getItem('portal.theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
function applyTheme(theme: Theme): void { if (theme === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme; }
function themeText(theme: Theme, t: (key: Parameters<typeof translate>[1]) => string): string { return t(`theme.${theme}`); }
function themeAccessibleLabel(theme: Theme, t: (key: Parameters<typeof translate>[1]) => string): string { return `${t('a11y.theme')}: ${themeText(theme, t)}`; }
