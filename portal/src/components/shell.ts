import type { PublicConfig } from '../config';
import type { Language, TranslationKey } from '../i18n';
import { routePath, translatedPath, type Route } from '../routes';
import { append, element, type Translate } from '../utilities/dom';

export type Theme = 'system' | 'light' | 'dark';
interface ShellOptions {
  theme?: Theme;
  search?: string;
  hash?: string;
  interactive?: boolean;
  onLanguage?: (language: Language) => void;
  onTheme?: (theme: Theme) => void;
}

export function renderHeader(currentRoute: Route, config: PublicConfig, t: Translate, options: ShellOptions = {}): HTMLElement {
  let activeTheme = options.theme ?? 'system';
  const header = element('header', 'site-header');
  if (options.interactive) header.dataset.interactive = 'true';
  const inner = element('div', 'header-inner');
  const brand = element('a', 'brand');
  brand.href = routePath('home', currentRoute.language);
  brand.setAttribute('aria-label', t('a11y.home'));
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
  const tagline = currentRoute.language === 'es' ? config.projectTaglineEs : config.projectTaglineEn;
  const purpose = element('p', 'header-purpose', tagline || config.projectTagline || t('nav.tagline'));
  const toggle = element('button', 'menu-toggle', t('nav.menu'));
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'main-navigation');
  const nav = element('nav', 'main-nav');
  nav.id = 'main-navigation';
  nav.setAttribute('aria-label', t('a11y.menu'));
  const links: Array<[Parameters<typeof routePath>[0], TranslationKey]> = [
    ['home', 'nav.catalog'], ['my', 'nav.my'], ['guides', 'nav.guides'], ['privacy', 'nav.privacy'], ['status', 'nav.status'],
  ];
  for (const [page, key] of links) {
    if (page === 'support' && !config.supportUrl) continue;
    const link = element('a', '', t(key));
    link.href = routePath(page, currentRoute.language);
    if (currentRoute.page === page || (page === 'guides' && currentRoute.page === 'guide')) link.setAttribute('aria-current', 'page');
    nav.append(link);
  }
  const controls = element('div', 'header-controls');
  const language = element('nav', 'language-switch');
  language.setAttribute('aria-label', t('a11y.language'));
  for (const [index, code] of (['en', 'es'] as Language[]).entries()) {
    if (index > 0) {
      const separator = element('span', 'language-separator', '/');
      separator.setAttribute('aria-hidden', 'true');
      language.append(separator);
    }
    const link = element('a', '', code.toUpperCase());
    link.lang = code;
    link.href = `${translatedPath(currentRoute, code)}${options.search ?? ''}${options.hash ?? ''}`;
    if (code === currentRoute.language) link.setAttribute('aria-current', 'page');
    link.setAttribute('hreflang', code);
    link.addEventListener('click', () => options.onLanguage?.(code));
    language.append(link);
  }
  const theme = element('button', 'theme-toggle', themeText(activeTheme, t));
  theme.type = 'button';
  theme.setAttribute('aria-label', themeAccessibleLabel(activeTheme, t));
  theme.addEventListener('click', () => {
    const next = activeTheme === 'system' ? 'light' : activeTheme === 'light' ? 'dark' : 'system';
    activeTheme = next;
    options.onTheme?.(next);
    theme.textContent = themeText(next, t);
    theme.setAttribute('aria-label', themeAccessibleLabel(next, t));
  });
  theme.disabled = !options.interactive;
  toggle.disabled = !options.interactive;
  append(controls, language, theme);
  if (config.supportUrl) {
    const donate = element('a', 'donate-button', t('footer.support'));
    donate.href = routePath('support', currentRoute.language);
    controls.append(donate);
  }
  append(inner, brand, purpose, toggle, nav, controls);
  header.append(inner);
  toggle.addEventListener('click', () => {
    const open = toggle.ariaExpanded !== 'true';
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? t('nav.close') : t('nav.menu');
    nav.dataset.open = String(open);
  });
  return header;
}

export function renderFooter(currentRoute: Route, config: PublicConfig, t: Translate): HTMLElement {
  const footer = element('footer', 'site-footer');
  const inner = element('div', 'footer-inner');
  const links = element('nav', 'footer-links');
  links.setAttribute('aria-label', t('a11y.footer'));
  const items: Array<[Parameters<typeof routePath>[0], TranslationKey]> = [
    ['about', 'footer.about'], ['transparency', 'nav.transparency'], ['privacy', 'nav.privacy'], ['acceptable', 'footer.acceptable'], ['security', 'footer.security'], ['your-data', 'yourData.title'], ['support', 'footer.support'], ['status', 'nav.status'], ['software', 'footer.software'], ['labels', 'footer.labels'],
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


function themeText(theme: Theme, t: Translate): string { return t(`theme.${theme}`); }
function themeAccessibleLabel(theme: Theme, t: Translate): string { return `${t('a11y.theme')}: ${themeText(theme, t)}`; }
