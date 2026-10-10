import { localized, type CatalogEntry } from '../catalog/catalog';
import { accessText, accountRecoveryText, pilotIds, privacyAnswers } from '../catalog/guidance';
import { entryLaunch } from '../catalog/discovery';
import { localizedServiceUrl } from '../catalog/locale-links';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { append, element, type Translate } from '../utilities/dom';
import { privacyLabels } from './privacy-labels';
import { practicalGuides, practicalGuidePath } from '../pages/guide-index';
import { routePath } from '../routes';
import { pinToStartingCollection } from '../utilities/toolkits';

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
  if (entry.limitation) content.append(element('p', 'catalog-ledger-limitation', `${t('home.catalog.limitation')}: ${entry.limitation[language]}`));
  const guide = (entry.id === 'bentopdf' ? practicalGuides.find(g => g.id === 'scan') : undefined)
    ?? practicalGuides.find((guide) => guide.id !== 'starting-projects' && (guide.tools.some(tool => tool.id === entry.id) || (entry.id === 'omni-compress-image' && guide.id === 'image')))
    ?? practicalGuides.find((guide) => guide.tools.some(tool => tool.id === entry.id));
  const details = element('details', 'catalog-help');
  details.append(element('summary', '', t('home.catalog.help')));
  if (pilotIds.has(entry.id) || entry.operationalStatus !== 'operational') content.append(element('p', 'catalog-ledger-access', pilotIds.has(entry.id) ? (language === 'es' ? 'Piloto: uso completo aún no verificado' : 'Pilot: complete workflow not yet verified') : t(`status.${entry.operationalStatus}`)));
  if (options.showSource && entry.upstreamSourceUrl) {
    const sourceText = `${t('home.catalog.source')}: ${entry.upstreamProject || name}`;
    const attribution = element('p', 'catalog-ledger-attribution');
    const source = element('a', 'catalog-ledger-upstream', sourceText);
    source.href = entry.upstreamSourceUrl;
    source.target = '_blank';
    source.rel = 'noopener noreferrer';
    source.setAttribute('aria-label', sourceText);
    attribution.append(source);
    details.append(attribution);
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
    const launchText = entry.id === 'galene' ? specificLabel : entry.id === 'fmd' ? (language === 'es' ? 'Abrir FMD' : 'Open FMD') : entry.accountAccess ? t('home.catalog.signIn') : actionName || specificLabel;
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
    if (entry.accountAccess === 'invite-required') {
      const request = element('a', 'catalog-guide-link', entry.id === 'galene'
        ? (language === 'es' ? 'Solicitar acceso para organizar' : 'Request hosting access')
        : (language === 'es' ? 'Solicitar acceso' : 'Request access'));
      const subject = `${language === 'es' ? 'Solicitud de acceso' : 'Access request'}: ${name}`;
      const body = language === 'es'
        ? 'Quiero usar esta herramienta.\nNombre que prefiero usar:\n¿Ya tengo cuenta de Utilibre?:\n\nNo incluyás contraseñas, invitaciones ni documentos privados.'
        : 'I would like to use this tool.\nPreferred name:\nDo I already have a Utilibre account?:\n\nDo not include passwords, invitations or private documents.';
      request.href = `mailto:admin@utilibre.org?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      request.setAttribute('aria-label', `${request.textContent}: ${name}`);
      action.append(request);
    }
    const shortcuts = element('div', 'catalog-shortcuts');
    for (const shortcut of entry.quickLinks ?? []) {
      const quick = element('a', 'catalog-quick-link', localized(shortcut.label, language));
      quick.href = localizedServiceUrl(entry.id, launch.href, language, shortcut.path);
      quick.target = '_blank';
      quick.rel = 'noopener noreferrer';
      quick.setAttribute('aria-label', `${localized(shortcut.label, language)} (${t('a11y.opensNewTab')})`);
      shortcuts.append(quick);
    }
    if (shortcuts.childElementCount) content.append(shortcuts);
  }
  if (guide) { const a = element('a', 'catalog-guide-link', `${language === 'es' ? 'Guía' : 'Guide'}: ${guide.copy[language].title}`); a.href = practicalGuidePath(guide.id, language); details.append(a); }
  const exampleGuides: Record<string, string> = { bentopdf: 'scan', minipaint: 'image', 'omni-compress-image': 'image', drawio: 'starting-projects', excalidraw: 'starting-projects', markmap: 'mindmap', rawgraphs: 'chart', pairdrop: 'transfer' };
  const exampleGuide = practicalGuides.find(item => item.id === exampleGuides[entry.id]);
  if (launch && exampleGuide?.hasSamples) {
    const example = element('a', 'catalog-example-link', language === 'es' ? 'Probalo con un ejemplo' : 'Try an example');
    example.href = `${practicalGuidePath(exampleGuide.id, language)}#practice`;
    example.setAttribute('aria-label', `${example.textContent}: ${name}`);
    content.append(example);
  }
  if (entry.bestFor) details.append(element('p', 'catalog-ledger-best-for', `${t('home.catalog.bestFor')}: ${entry.bestFor[language]}`));
  if (entry.help) details.append(element('p', '', localized(entry.help, language)));
  if (entry.accountAccess === 'invite-required') {
    details.append(element('p', '', accountRecoveryText(entry, language)), element('p', '', language === 'es'
      ? 'La aprobación es manual. Si no tenés una aplicación de correo configurada, escribí a admin@utilibre.org e indicá la herramienta. No mandés contraseñas ni documentos privados.'
      : 'Approval is manual. If no email application is configured, write to admin@utilibre.org and name the tool. Never send passwords or private documents.'));
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
  if (['cryptpad', 'liberaforms', 'galene'].includes(entry.id) && config.publicPdfUrl) {
    const source = element('a', 'text-link', t('software.documents.sourceBundle'));
    source.href = new URL(`/utilibre-source/${entry.id}-utilibre.tar.gz`, config.publicPdfUrl).href;
    source.target = '_blank'; source.rel = 'noopener noreferrer'; details.append(source);
  }
  // A normal link remains a usable route when JavaScript is unavailable.
  const save = element('a', 'catalog-save', language === 'es' ? 'Guardar en Mi Utilibre' : 'Save to My Utilibre');
  save.href = routePath('my', language);
  save.setAttribute('aria-label', `${save.textContent}: ${name}`);
  const saved = element('p', 'catalog-save-status'); saved.role = 'status'; saved.hidden = true;
  let justSaved = false;
  save.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || justSaved) return;
    event.preventDefault();
    let result: ReturnType<typeof pinToStartingCollection> = { status: 'unavailable' };
    try { result = pinToStartingCollection(localStorage, language, entry.id); } catch { /* blocked storage */ }
    saved.hidden = false;
    if (result.status === 'saved' || result.status === 'already') {
      justSaved = true;
      saved.textContent = language === 'es' ? `Guardado en «${result.label}», solo en este navegador.` : `Saved in “${result.label}”, only in this browser.`;
      save.textContent = language === 'es' ? 'Ver en Mi Utilibre' : 'View in My Utilibre';
      save.setAttribute('aria-label', `${save.textContent}: ${name}`);
    } else {
      saved.textContent = result.status === 'full'
        ? (language === 'es' ? 'Colección llena. Quitá una herramienta en Mi Utilibre e intentá otra vez.' : 'Collection full. Remove a tool in My Utilibre and try again.')
        : (language === 'es' ? 'No se guardó. Revisá el almacenamiento en Mi Utilibre; tus colecciones existentes no cambiaron.' : 'Not saved. Check storage in My Utilibre; existing collections were not changed.');
    }
  });
  action.append(save);
  content.append(saved);
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
