import type { Language } from '../i18n';
import { routePath } from '../routes';
import { element, type Translate } from '../utilities/dom';

export function policySection(title: string, body: string): HTMLElement {
  const section = element('section', 'prose section');
  section.append(element('h2', '', title));
  for (const paragraph of body.split('\n\n')) section.append(element('p', '', paragraph));
  return section;
}

export function renderSecurity(language: Language, t: Translate): HTMLElement {
  const main = element('main', 'page-shell');
  main.id = 'main-content'; main.tabIndex = -1;
  main.append(element('h1', '', t('security.title')));
  const contacts = policySection(t('security.contact.title'), t('security.contact.body'));
  const email = element('a', 'text-link', 'admin@utilibre.org');
  email.href = 'mailto:admin@utilibre.org';
  const github = element('a', 'text-link', t('security.contact.github'));
  github.href = 'https://github.com/mycelibre/utilibre/security/advisories/new';
  const links = element('div', 'guide-links'); links.append(email, github); contacts.append(links);
  main.append(contacts, policySection(t('security.reporting.title'), t('security.reporting.body')));
  const abuse = element('a', 'text-link', t('abuse.title')); abuse.href = `${routePath('acceptable', language)}#abuse`;
  main.append(abuse);
  return main;
}

export function abuseSection(t: Translate): HTMLElement {
  const section = policySection(t('abuse.title'), `${t('abuse.body')}\n\n${t('abuse.action')}`);
  section.id = 'abuse';
  const email = element('a', 'text-link', 'admin@utilibre.org'); email.href = 'mailto:admin@utilibre.org';
  section.append(email, element('p', '', t('abuse.correspondence')));
  return section;
}
