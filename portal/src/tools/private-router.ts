import type { PublicConfig } from '../config';
import { actionButton, append, element, labelledInput, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';

interface RoutedUrl { target: 'reddit'; path: string; search: string; hash: string; }

export function renderPrivateRouter(t: Translate, config: PublicConfig): HTMLElement {
  const panel = toolPanel();
  const field = labelledInput(t('router.label'), 'url', { placeholder: t('router.placeholder') });
  const check = actionButton(t('router.button'));
  const form = element('form', 'tool-form');
  form.noValidate = true;
  check.type = 'submit';
  const status = statusRegion(t('router.explanation'));
  const result = element('div', 'router-result');
  field.input.maxLength = 8192;
  field.input.addEventListener('input', () => { result.replaceChildren(); setStatus(status, t('router.explanation')); });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    result.replaceChildren();
    if (!validPublicUrlShape(field.input.value)) return setStatus(status, t('router.invalid'), 'error');
    const routed = routePrivateUrl(field.input.value);
    if (!routed) return setStatus(status, t('router.unsupported'), 'error');
    const configured = config.enabledServices.includes('redlib');
    const base = configured ? config.publicRedditUrl : '';
    if (!base) return setStatus(status, t('router.notDeployed'), 'error');
    try {
      const destination = new URL(base);
      destination.pathname = joinPaths(destination.pathname, routed.path);
      destination.search = routed.search;
      destination.hash = routed.hash;
      const label = element('p', '', `${t('router.destination')}: ${destination.hostname}`);
      const link = element('a', 'button', t('router.continue'));
      link.href = destination.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.ariaLabel = `${t('router.continue')} (${t('a11y.opensNewTab')})`;
      const output = labelledInput(t('router.destination'), 'text', { value: destination.href }); output.input.readOnly = true;
      const copy = actionButton(t('router.copy'), true);
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(destination.href); setStatus(status, t('router.copied'), 'success'); } catch { output.input.focus(); output.input.select(); setStatus(status, t('router.copyFallback')); } });
      const original = element('a', 'button button-secondary', t('router.original')); original.href = new URL(field.input.value.trim()).href; original.target = '_blank'; original.rel = 'noopener noreferrer';
      append(result, label, output.wrapper, link, copy, original);
      setStatus(status, t('router.ready'), 'success');
    } catch { setStatus(status, t('router.notDeployed'), 'error'); }
  });

  append(form, field.wrapper, check);
  append(panel, form, status, result, element('p', 'notice', t('router.explanation')));
  return panel;
}

export function routePrivateUrl(value: string): RoutedUrl | null {
  if (!validPublicUrlShape(value)) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com', 'np.reddit.com', 'redd.it'].includes(host)) {
    const output = new URL('https://local.invalid/');
    let path = url.pathname;
    if (host === 'redd.it') {
      if (!/^\/[a-z0-9]{5,12}\/?$/i.test(path)) return null;
      path = `/comments/${path.split('/')[1]}`;
    } else {
      if (!supportedRedditPath(path)) return null;
      // Redlib reads a community's sort from the path, not ?sort=.
      if (/^\/r\/[A-Za-z0-9_-]+\/?$/.test(path) && url.searchParams.has('sort')) {
        const sorts = url.searchParams.getAll('sort');
        if (new Set(sorts).size !== 1 || !['hot', 'new', 'top', 'rising', 'controversial'].includes(sorts[0]!)) return null;
        path = `${path.replace(/\/$/, '')}/${sorts[0]}${path.endsWith('/') ? '/' : ''}`;
      }
    }
    output.pathname = path;
    // Preserve unknown/repeated fields and encoding; strip reviewed tracking only.
    const tracking = new Set(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id', 'share_id', 'rdt']);
    const pairs = url.search.slice(1).split('&').filter(part => !tracking.has(decodeURIComponent(part.split('=')[0]!.replace(/\+/g, ' ')).toLowerCase()));
    output.search = url.search ? pairs.join('&') : '';
    return { target: 'reddit', path: output.pathname, search: output.search, hash: url.hash };
  }
  return null;
}

function supportedRedditPath(path: string): boolean {
  const p = path.replace(/\/$/, '');
  const name = '[A-Za-z0-9_-]{1,64}'; const id = '[A-Za-z0-9]{1,12}'; const slug = '[^/]+';
  return p === '' || p === '/search'
    || new RegExp(`^/r/${name}(?:/(?:hot|new|top|rising|controversial|search))?$`).test(p)
    || new RegExp(`^/(?:r|user|u)/${name}/comments/${id}(?:/${slug}(?:/${id})?)?$`).test(p)
    || new RegExp(`^/comments/${id}(?:/${slug}(?:/${id})?)?$`).test(p)
    || new RegExp(`^/user/${name}(?:/(?:overview|submitted|comments))?$`).test(p)
    || new RegExp(`^/u/${name}$`).test(p);
}

function validPublicUrlShape(value: string): boolean {
  try {
    if (value.length > 8192 || [...value.trim()].some(c => c === '\\' || c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127)) return false;
    const rawPath = value.trim().replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0]!;
    if (rawPath.split('/').some(part => ['.', '..'].includes(decodeURIComponent(part)))) return false;
    const url = new URL(value);
    if (/^https?:\/\/[^/?#]*@/i.test(value.trim())) return false;
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return false;
    for (const segment of url.pathname.split('/')) if ([...decodeURIComponent(segment)].some(c => c === '/' || c === '\\' || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) return false;
    decodeURIComponent(url.search); decodeURIComponent(url.hash);
    return true;
  } catch {
    return false;
  }
}

function joinPaths(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
