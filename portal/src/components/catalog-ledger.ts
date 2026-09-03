import { localized, type AccountAccess, type CatalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { append, element, type Translate } from '../utilities/dom';
import { privacyLabels } from './privacy-labels';

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
  if (options.ariaLabel) list.ariaLabel = options.ariaLabel;

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
  number.ariaHidden = 'true';
  coordinate.append(number);

  const name = localized(entry.name, language);
  const content = element('div', 'catalog-ledger-content');
  const headingTag = options.headingLevel === 2 ? 'h2' : 'h3';
  append(content, element(headingTag, '', name), element('p', 'catalog-ledger-description', localized(entry.description, language)));
  if (entry.accountAccess) {
    const access = element('p', 'catalog-ledger-access');
    append(
      access,
      element('span', 'catalog-ledger-access-label', `${t('home.catalog.access')}:`),
      ` ${accountAccessText(entry.accountAccess, t)}`,
    );
    content.append(access);
  }
  if (options.showSource && entry.upstreamSourceUrl) {
    const sourceText = `${t('home.catalog.source')}: ${entry.upstreamProject || name}`;
    const attribution = element('p', 'catalog-ledger-attribution');
    const source = element('a', 'catalog-ledger-upstream', sourceText);
    source.href = entry.upstreamSourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.ariaLabel = sourceText;
    attribution.append(source);
    content.append(attribution);
  }

  const processing = element('div', 'catalog-ledger-processing');
  processing.append(privacyLabels(entry.labels, t));
  if (options.processingNote === 'summary') processing.append(element('p', 'catalog-ledger-flow', processingSummary(entry, t)));
  else if (options.processingNote === 'full' || options.showDataFlow) processing.append(element('p', 'catalog-ledger-flow', localized(entry.dataFlow, language)));

  const action = element('div', 'catalog-ledger-action');
  const launch = entryLaunch(entry, language, config);
  if (launch) {
    const launchText = t('home.catalog.open');
    const link = element('a', 'catalog-ledger-launch', launchText);
    link.href = launch.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.ariaLabel = `${launchText}: ${name} (${t('a11y.opensNewTab')})`;
    action.append(link);
  }
  append(article, coordinate, content, processing, action);
  item.append(article);
  return item;
}

function accountAccessText(access: AccountAccess, t: Translate): string {
  return access === 'invite-required'
    ? t('home.catalog.accessInvite')
    : t('home.catalog.accessClosed');
}

function processingSummary(entry: CatalogEntry, t: Translate): string {
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
