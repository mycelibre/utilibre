import type { Language } from '../i18n';
import { routePath } from '../routes';
import { element } from '../utilities/dom';

// These applications can expose visitor-created content or shared sessions.
// The notice never reads the current URL, document contents or browser storage.
export const reportableServices = new Set([
  'chhoto', 'privatebin', 'yopass', 'wbo', 'cryptpad', 'rustpad', 'opengist',
  'bytestash', 'pollaris', 'rallly', 'liberaforms', 'gathio', 'reactive-resume',
  'linkding', 'penpot', 'grist', 'ntfy', 'galene', 'chitchatter', 'pairdrop',
  'vikunja', 'spliit', 'razzia', 'trip', 'wishlist',
]);

export function abuseReportLink(language: Language, label: string, className = 'text-link'): HTMLAnchorElement {
  const link = element('a', className, label);
  link.href = routePath('abuse', language);
  link.rel = 'noreferrer';
  link.setAttribute('referrerpolicy', 'no-referrer');
  return link;
}

