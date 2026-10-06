import type { Language } from '../i18n';

/** Liberapay publishes these language-specific hosts for the same recipient. */
export function localizedSupportUrl(base: string, language: Language): string {
  const url = new URL(base);
  if (['liberapay.com', 'en.liberapay.com', 'es.liberapay.com'].includes(url.hostname)) {
    url.hostname = `${language}.liberapay.com`;
  }
  return url.href;
}

/** Verified against deployed upstream versions, not guessed universal lang parameters. */
export function localizedServiceUrl(id: string, base: string, language: Language, path?: string): string {
  const url = new URL(path ?? base, base);
  if (id === 'jupyterlite') {
    url.pathname = language === 'es' ? '/es/lab/index.html' : '/lab/index.html';
    url.search = new URLSearchParams({ path: language === 'es' ? 'Empeza-aqui.ipynb' : 'Start-here.ipynb' }).toString();
  } else if (id === 'priviblur' && !path) {
    url.pathname = '/settings/restore';
    // Upstream requires all boolean preferences even for a language change.
    url.search = new URLSearchParams({ language: language === 'es' ? 'es' : 'en_US', theme: 'auto', expand_posts: 'off', version: '1' }).toString();
  } else if (id === 'bentopdf') {
    url.pathname = url.pathname.replace(/^\/(en|es)(?=\/|$)/, '');
    // English pages are at the root; this release has no /en directory.
    url.pathname = `${language === 'es' ? '/es' : ''}${url.pathname || '/'}`;
  } else if (id === 'omnitools' || id === 'ntfy') {
    url.searchParams.set('lng', language);
  } else if (id === 'drawio') {
    url.searchParams.set('lang', language);
  } else if (id === 'reactive-resume') {
    url.searchParams.set('locale', language === 'es' ? 'es-ES' : 'en-US');
  } else if (['vert', 'ittools', 'yopass', 'pairdrop', 'uptime-kuma', 'penpot'].includes(id) && !path) {
    url.pathname = '/utilibre-language.html';
    url.search = new URLSearchParams({ lang: language }).toString();
    url.hash = '';
  }
  return url.href;
}
