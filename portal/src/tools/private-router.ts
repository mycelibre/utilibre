import type { PublicConfig } from '../config';
import { actionButton, append, element, labelledInput, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';

type PrivateTarget = 'youtube' | 'reddit' | 'imgur';

interface RoutedUrl { target: PrivateTarget; path: string; search: string; }

export function renderPrivateRouter(t: Translate, config: PublicConfig): HTMLElement {
  const panel = toolPanel();
  const field = labelledInput(t('router.label'), 'url', { placeholder: t('router.placeholder') });
  const check = actionButton(t('router.button'));
  const status = statusRegion(t('router.explanation'));
  const result = element('div', 'router-result');

  check.addEventListener('click', () => {
    result.replaceChildren();
    if (!validPublicUrlShape(field.input.value)) return setStatus(status, t('router.invalid'), 'error');
    const routed = routePrivateUrl(field.input.value);
    if (!routed) return setStatus(status, t('router.unsupported'), 'error');
    const serviceId = routed.target === 'youtube' ? 'invidious' : routed.target === 'reddit' ? 'redlib' : 'rimgo';
    const configured = config.enabledServices.includes(serviceId);
    const base = configured ? (routed.target === 'youtube' ? config.publicYoutubeUrl : routed.target === 'reddit' ? config.publicRedditUrl : config.publicImgurUrl) : '';
    if (!base) return setStatus(status, t('router.notDeployed'), 'error');
    try {
      const destination = new URL(base);
      destination.pathname = joinPaths(destination.pathname, routed.path);
      destination.search = routed.search;
      const label = element('p', '', `${t('router.destination')}: ${destination.hostname}`);
      const link = element('a', 'button', t('router.continue'));
      link.href = destination.href;
      link.rel = 'noopener noreferrer';
      append(result, label, link);
      setStatus(status, t('router.ready'), 'success');
    } catch { setStatus(status, t('router.notDeployed'), 'error'); }
  });

  append(panel, field.wrapper, check, status, result, element('p', 'notice', t('router.explanation')));
  return panel;
}

export function routePrivateUrl(value: string): RoutedUrl | null {
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host)) {
    const output = new URL('https://local.invalid/');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
      output.pathname = '/watch';
      output.searchParams.set('v', id);
      copyAllowedParameters(url, output, ['t', 'start', 'list', 'index']);
    } else {
      const path = safePath(url.pathname);
      if (!path) return null;
      output.pathname = path;
      copyAllowedParameters(url, output, ['v', 't', 'start', 'list', 'index']);
    }
    return { target: 'youtube', path: output.pathname, search: output.search };
  }
  if (['reddit.com', 'www.reddit.com', 'old.reddit.com', 'new.reddit.com', 'np.reddit.com', 'redd.it'].includes(host)) {
    const output = new URL('https://local.invalid/');
    const path = safePath(url.pathname);
    if (!path) return null;
    output.pathname = path;
    copyAllowedParameters(url, output, ['sort', 't', 'context', 'depth', 'after', 'before']);
    return { target: 'reddit', path: output.pathname, search: output.search };
  }
  if (['imgur.com', 'www.imgur.com', 'm.imgur.com', 'i.imgur.com'].includes(host)) {
    const path = safePath(url.pathname);
    return path ? { target: 'imgur', path, search: '' } : null;
  }
  return null;
}

function safePath(value: string): string | null {
  try {
    return `/${value.split('/').filter(Boolean).map((segment) => encodeURIComponent(decodeURIComponent(segment))).join('/')}`;
  } catch {
    return null;
  }
}

function validPublicUrlShape(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return false;
    for (const segment of url.pathname.split('/')) decodeURIComponent(segment);
    return true;
  } catch {
    return false;
  }
}

function copyAllowedParameters(input: URL, output: URL, allowed: string[]): void {
  for (const key of allowed) for (const value of input.searchParams.getAll(key).slice(0, 1)) output.searchParams.set(key, value.slice(0, 200));
}

function joinPaths(base: string, path: string): string {
  return `${base.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
