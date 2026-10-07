import { localized, type CatalogEntry } from '../catalog/catalog';
import { accessText, choiceNote, pilotIds, privacyAnswers } from '../catalog/guidance';
import { entryLaunch } from '../catalog/discovery';
import { localizedServiceUrl } from '../catalog/locale-links';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { append, element, type Translate } from '../utilities/dom';
import { privacyLabels } from './privacy-labels';
import { practicalGuides, practicalGuidePath } from '../pages/practical-guide-data';

export interface CatalogLedgerOptions {
  ariaLabel?: string;
  emptyText?: string;
  headingLevel?: 2 | 3;
  indexOffset?: number;
  processingNote?: 'summary' | 'full';
  showSource?: boolean;
  showDataFlow?: boolean;
}

export function renderCatalogList(
  entries: CatalogEntry[],
  language: Language,
  config: PublicConfig,
  t: Translate,
  options: CatalogLedgerOptions = {},
): HTMLOListElement {
  const list = element('ol', 'catalog-ledger-list');
  if (options.ariaLabel) list.setAttribute('aria-label', options.ariaLabel);

  entries.forEach((entry, index) => {
    list.append(renderCatalogRow(entry, (options.indexOffset ?? 0) + index, language, config, t, options));
  });

  if (!entries.length && options.emptyText) {
    const item = element('li', 'catalog-ledger-empty');
    item.append(element('p', 'notice', options.emptyText));
    list.append(item);
  }

  return list;
}

export function renderCatalogRow(
  entry: CatalogEntry,
  index: number,
  language: Language,
  config: PublicConfig,
  t: Translate,
  options: CatalogLedgerOptions = {},
): HTMLLIElement {
  const item = element('li', 'catalog-ledger-item');
  const article = element('article', 'catalog-ledger-row');
  article.dataset.catalogId = entry.id;
  article.dataset.discoveryGroup = entry.discoveryGroup;

  const coordinate = element('div', 'catalog-ledger-coordinate');
  const number = element('span', 'catalog-ledger-number', String(index + 1).padStart(2, '0'));
  number.setAttribute('aria-hidden', 'true');
  coordinate.append(number);

  const name = localized(entry.name, language);
  const content = element('div', 'catalog-ledger-content');
  const headingTag = options.headingLevel === 2 ? 'h2' : 'h3';
  append(content, element(headingTag, '', name), element('p', 'catalog-ledger-description', localized(entry.description, language)));
  {
    const access = element('p', 'catalog-ledger-access');
    append(
      access,
      element('span', 'catalog-ledger-access-label', `${t('home.catalog.access')}:`),
      ` ${accessText(entry, language)}`,
    );
    content.append(access);
  }
  const note = choiceNote(entry, language);
  if (note) content.append(element('p', 'catalog-ledger-limitation', note));
  const guide = practicalGuides.find((guide) => guide.id !== 'starting-projects' && (guide.tools.some(tool => tool.id === entry.id) || (entry.id === 'omni-compress-image' && guide.id === 'image')))
    ?? practicalGuides.find((guide) => guide.tools.some(tool => tool.id === entry.id));
  if (pilotIds.has(entry.id) || entry.operationalStatus !== 'operational') content.append(element('p', 'catalog-ledger-access', entry.id === 'wbo' ? (language === 'es' ? 'Piloto temporal: exportá antes de salir' : 'Temporary pilot: export before leaving') : pilotIds.has(entry.id) ? (language === 'es' ? 'Piloto: uso completo aún no verificado' : 'Pilot: complete workflow not yet verified') : t(`status.${entry.operationalStatus}`)));
  if (options.showSource && entry.upstreamSourceUrl) {
    const sourceText = `${t('home.catalog.source')}: ${entry.upstreamProject || name}`;
    const attribution = element('p', 'catalog-ledger-attribution');
    const source = element('a', 'catalog-ledger-upstream', sourceText);
    source.href = entry.upstreamSourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.setAttribute('aria-label', sourceText);
    attribution.append(source);
    content.append(attribution);
  }

  const processing = element('div', 'catalog-ledger-processing');
  processing.append(privacyLabels(entry.labels, t));
  if (options.processingNote === 'summary') processing.append(element('p', 'catalog-ledger-flow', processingSummary(entry, t)));
  else if (options.processingNote === 'full' || options.showDataFlow) processing.append(element('p', 'catalog-ledger-flow', localized(entry.dataFlow, language)));

  const action = element('div', 'catalog-ledger-action');
  const launch = entryLaunch(entry, language, config);
  if (!launch) {
    action.append(element('p', 'catalog-ledger-unavailable', t('home.catalog.unavailable')));
    content.append(element('p', 'catalog-ledger-access', entry.unavailableReason ? localized(entry.unavailableReason, language) : t('home.catalog.awaitingAccess')));
  }
  if (launch) {
    const actionNames: Record<string, [string, string]> = { redlib: ['Read Reddit', 'Leer Reddit'], pairdrop: ['Send files', 'Enviar archivos'], rssbridge: ['Create a feed', 'Crear una fuente RSS'], ntfy: ['Send an alert', 'Enviar un aviso'], yopass: ['Share a secret', 'Compartir un secreto'] };
    const actionName = actionNames[entry.id]?.[language === 'es' ? 1 : 0];
    const specificLabel = entry.launchLabel && !['Open tool', 'Open'].includes(entry.launchLabel.en) ? localized(entry.launchLabel, language) : name.split(' · ')[0]!;
    const launchText = entry.id === 'fmd' ? (language === 'es' ? 'Ingresar al piloto' : 'Pilot sign-in') : entry.accountAccess ? t('home.catalog.signIn') : actionName || specificLabel;
    const link = element('a', 'catalog-ledger-launch', launchText);
    link.href = launch.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', `${launchText}: ${name} (${t('a11y.opensNewTab')})`);
    if (launch.href.startsWith('mumble:')) {
      link.removeAttribute('target');
      link.setAttribute('aria-label', `${launchText}: ${name}`);
    }
    if (launch.external) {
      const cue = element('span', 'catalog-ledger-external-cue', '↗');
      cue.setAttribute('aria-hidden', 'true');
      link.append(' ', cue);
    }
    action.append(link);
    for (const shortcut of entry.quickLinks ?? []) {
      const quick = element('a', 'catalog-quick-link', localized(shortcut.label, language));
      quick.href = localizedServiceUrl(entry.id, launch.href, language, shortcut.path);
      quick.target = '_blank';
      quick.rel = 'noopener noreferrer';
      quick.setAttribute('aria-label', `${localized(shortcut.label, language)} (${t('a11y.opensNewTab')})`);
      action.append(quick);
    }
  }
  if (guide) { const a = element('a', 'catalog-guide-link', language === 'es' ? 'Guía paso a paso' : 'Step-by-step guide'); a.href = practicalGuidePath(guide.id, language); a.setAttribute('aria-label', `${language === 'es' ? 'Guía' : 'Guide'}: ${guide.copy[language].title}`); action.append(a); }
  const details = element('details', 'catalog-help');
  details.append(element('summary', '', t('home.catalog.help')));
  if (entry.help) details.append(element('p', '', localized(entry.help, language)));
  if (entry.accountAccess === 'invite-required') {
    const request = element('a', 'text-link', t('home.catalog.requestAccount'));
    request.href = 'mailto:admin@utilibre.org?subject=Utilibre%20account%20request';
    details.append(request, element('p', '', t('home.catalog.accountRecovery')));
  }
  const privacy = element('dl', 'privacy-answers');
  for (const [question, answer] of privacyAnswers(entry, language)) append(privacy, element('dt', '', question), element('dd', '', answer));
  details.append(privacy);
  if (launch && entry.labels.includes('local') && !entry.labels.includes('server')) {
    const source = element('a', 'text-link', t('software.documents.sourceBundle'));
    source.href = new URL('/utilibre-source/', launch.href).href;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    details.append(source);
  }
  append(article, coordinate, content, processing, action, details);
  item.append(article);
  return item;
}

function processingSummary(entry: CatalogEntry, t: Translate): string {
  if (entry.id === 'pairdrop') return t('home.catalog.note.peerTransfer');
  const labels = new Set(entry.labels);
  const local = labels.has('local');
  const server = labels.has('server');
  const proxy = labels.has('proxy');
  const external = labels.has('external');

  if (local && server && proxy) return t('home.catalog.note.browserServerProxy');
  if (server && proxy && external) return t('home.catalog.note.serverProxyExternal');
  if (local && external) return t('home.catalog.note.browserExternal');
  if (local && server) return t('home.catalog.note.browserServer');
  if (server && proxy) return t('home.catalog.note.serverProxy');
  if (server && external) return t('home.catalog.note.serverExternal');
  if (local) return t('home.catalog.note.browser');
  if (server) return t('home.catalog.note.server');
  return t('home.catalog.note.mixed');
}
