import { catalog, catalogEntry, localized, reviewedServices, type CatalogEntry, type DiscoveryGroup, type OperationalStatus } from '../catalog/catalog';
import { discoveryGroups, discoverEntries, entryLaunchable, serviceConfigured, type CatalogDiscoveryState } from '../catalog/discovery';
import { renderCatalogList } from '../components/catalog-ledger';
import { privacyLabels } from '../components/privacy-labels';
import type { PublicConfig } from '../config';
import type { Language, TranslationKey } from '../i18n';
import { routePath, type Route, type StaticPage } from '../routes';
import { append, disableActionButton, element, type Translate } from '../utilities/dom';

export async function renderPage(route: Route, config: PublicConfig, t: Translate, searchParams = new URLSearchParams()): Promise<HTMLElement> {
  if (route.page === 'tool' && route.toolId) return renderToolPage(route.toolId, route.language, config, t);
  if (route.page === 'home') return renderHome(route.language, config, t, searchParams);
  if (route.page === 'services') return renderServices(route.language, config, t);
  if (route.page === 'tools') return renderTools(route.language, config, t);
  if (route.page === 'transparency') return renderTransparency(route.language, config, t);
  if (route.page === 'privacy') return renderPrivacy(config, t);
  if (route.page === 'about') return prosePage(t('about.title'), '', [['about.title', 'about.body1'], ['about.upstream.title', 'about.body2'], ['transparency.why.title', 'transparency.why.body']], t, true);
  if (route.page === 'acceptable') return renderAcceptable(config, t);
  if (route.page === 'support') return renderSupport(route.language, config, t);
  if (route.page === 'status') return renderStatus(route.language, config, t);
  if (route.page === 'software') return renderSoftware(config, t);
  if (route.page === 'labels') return renderLabelGuide(t);
  return renderNotFound(route.language, t);
}

function renderHome(language: Language, config: PublicConfig, t: Translate, searchParams: URLSearchParams): HTMLElement {
  const main = pageContainer('home-page');
  const layout = element('div', 'home-ledger-layout');
  const state = discoveryState(searchParams);
  const entries = discoverEntries(config, language, state);
  const isFeaturedDefault = !state.query && !state.group && state.view !== 'all';

  const index = element('aside', 'ledger-index');
  index.ariaLabel = t('home.catalog.taskIndex');
  const guideword = element('p', 'ledger-guideword', t('home.catalog.taskIndex'));
  const taskCue = element('p', 'task-scroll-cue', t('home.catalog.taskCue'));
  const taskNav = element('nav', 'task-navigation');
  taskNav.ariaLabel = t('home.catalog.taskIndex');
  const taskList = element('ol', 'task-index-list');
  discoveryGroups.forEach((group, position) => {
    const item = element('li');
    const link = element('a');
    link.href = catalogUrl(language, { group });
    if (state.group === group && !state.query) link.ariaCurrent = 'page';
    append(
      link,
      element('span', 'task-number', String(position + 1).padStart(2, '0')),
      element('span', 'task-label', discoveryGroupLabel(group, t)),
    );
    item.append(link);
    taskList.append(item);
  });
  taskNav.append(taskList);

  const note = element('p', 'ledger-index-note', t('home.catalog.indexNote'));
  const references = element('nav', 'ledger-reference-links');
  references.ariaLabel = t('home.catalog.title');
  const featured = element('a', 'catalog-mode-link', t('home.catalog.featured'));
  featured.href = catalogUrl(language, {});
  if (isFeaturedDefault) featured.ariaCurrent = 'page';
  const all = element('a', 'catalog-mode-link', t('home.catalog.all'));
  all.href = catalogUrl(language, { view: 'all' });
  if (!state.query && !state.group && state.view === 'all') all.ariaCurrent = 'page';
  const labels = element('a', 'catalog-context-link', t('footer.labels'));
  labels.href = routePath('labels', language);
  const software = element('a', 'catalog-context-link', t('footer.software'));
  software.href = routePath('software', language);
  append(references, featured, all, labels, software);
  const folio = element('p', 'ledger-folio', `UTILIBRE · ${String(discoveryGroups.length).padStart(2, '0')} ${t('home.catalog.taskGroups')}`);
  append(index, guideword, taskCue, taskNav, note, references, folio);

  const workspace = element('div', 'ledger-workspace');
  const finder = element('section', 'ledger-finder');
  const finderCopy = element('div', 'ledger-finder-copy');
  const localizedTagline = language === 'es' ? config.projectTaglineEs : config.projectTaglineEn;
  append(finderCopy, element('h1', '', t('home.title')), element('p', '', localizedTagline || config.projectTagline || t('home.lead')));
  const form = element('form', 'catalog-search');
  form.setAttribute('role', 'search');
  form.method = 'get';
  form.action = routePath('home', language);
  const label = element('label', '', t('home.catalog.searchLabel'));
  label.htmlFor = 'catalog-query';
  const searchControl = element('div', 'catalog-search-control');
  const input = element('input');
  input.id = 'catalog-query';
  input.name = 'q';
  input.type = 'search';
  input.value = state.query ?? '';
  input.placeholder = t('home.catalog.searchPlaceholder');
  const submit = element('button', '', t('home.catalog.searchButton'));
  submit.type = 'submit';
  append(searchControl, input, submit);
  append(form, label, searchControl);
  append(finder, finderCopy, form);

  const catalogSection = element('section', 'catalog-ledger');
  catalogSection.id = 'catalog';
  catalogSection.tabIndex = -1;
  catalogSection.setAttribute('aria-labelledby', 'catalog-title');
  const catalogHeader = element('header', 'catalog-ledger-header');
  const stateLabel = catalogStateLabel(state, t);
  const stateCode = element('span', 'catalog-ledger-code', catalogStateCode(state));
  stateCode.ariaHidden = 'true';
  const heading = element('div', 'catalog-ledger-heading');
  const title = element('h2', '', stateLabel);
  title.id = 'catalog-title';
  heading.append(title);
  if (isFeaturedDefault) heading.append(element('p', 'catalog-editorial-note', t('home.catalog.intro')));
  const processing = element('span', 'catalog-ledger-column-label', t('home.catalog.processing'));
  const launch = element('span', 'catalog-ledger-column-label catalog-ledger-column-action', t('home.catalog.open'));
  processing.ariaHidden = 'true';
  launch.ariaHidden = 'true';
  append(catalogHeader, stateCode, heading, processing, launch);
  const resultCount = element('p', 'catalog-result-count', `${entries.length} ${entries.length === 1 ? t('home.catalog.oneResult') : t('home.catalog.results')}`);
  resultCount.setAttribute('role', 'status');
  resultCount.setAttribute('aria-live', 'polite');
  const list = renderCatalogList(entries, language, config, t, {
    ariaLabel: stateLabel,
    emptyText: t('home.catalog.empty'),
    headingLevel: 3,
    processingNote: 'summary',
    showSource: true,
  });
  append(catalogSection, catalogHeader, resultCount, list);
  if (state.query || state.group || state.view === 'all') {
    const clear = element('a', 'catalog-clear', t('home.catalog.clear'));
    clear.href = catalogUrl(language, {});
    catalogSection.append(clear);
  }
  append(workspace, finder, catalogSection);

  const support = element('aside', 'ledger-support');
  const supportLink = element('a', '', t('home.support.link'));
  supportLink.href = routePath('support', language);
  append(support, element('h2', '', t('home.support.title')), element('p', '', t('home.support.body')), supportLink);

  append(layout, index, workspace, support);
  main.append(layout);
  return main;
}

function renderServices(language: Language, config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('services.title'), t('services.intro'));
  const deployed = element('section', 'section');
  deployed.append(element('h2', '', t('services.deployedTitle')));
  deployed.append(renderCatalogList(deployedEntries(config), language, config, t, {
    ariaLabel: t('services.deployedTitle'),
    emptyText: t('home.noServices'),
    headingLevel: 3,
    processingNote: 'full',
    showSource: true,
  }));
  main.append(deployed);
  return main;
}

function renderTools(language: Language, config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('tools.title'), t('tools.intro'));
  for (const group of discoveryGroups) {
    const entries = catalog.filter((item) => item.discoveryGroup === group && entryLaunchable(item, config));
    if (!entries.length) continue;
    const section = element('section', 'section');
    const label = discoveryGroupLabel(group, t);
    section.append(element('h2', '', label));
    section.append(renderCatalogList(entries, language, config, t, { ariaLabel: label, headingLevel: 3, processingNote: 'summary', showSource: true }));
    main.append(section);
  }
  return main;
}

function renderPrivacy(config: PublicConfig, t: Translate): HTMLElement {
  const redlibSections: Array<[TranslationKey, TranslationKey]> = redlibConfigured(config)
    ? [
        ['privacy.redlib.challenge.title', 'privacy.redlib.challenge.body'],
        ['privacy.redlib.upstream.title', 'privacy.redlib.upstream.body'],
        ['privacy.redlib.logs.title', 'privacy.redlib.logs.body'],
      ]
    : [['privacy.redlib.title', 'privacy.redlib.disabled']];

  return prosePage(t('privacy.title'), t('privacy.intro'), [
    ['privacy.portal.title', 'privacy.portal.body'],
    ['privacy.local.title', 'privacy.local.body'],
    ['privacy.search.title', 'privacy.search.body'],
    ...redlibSections,
    ['privacy.logs.title', 'privacy.logs.body'],
    ['privacy.storage.title', 'privacy.storage.body'],
  ], t);
}

async function renderToolPage(id: string, language: Language, config: PublicConfig, t: Translate): Promise<HTMLElement> {
  const entry = catalogEntry(id);
  if (!entry) return prosePage(t('common.notFound.title'), t('common.notFound.body'), [], t);
  const main = pageHeader(localized(entry.name, language), localized(entry.description, language), 'tool-page');
  const disclosure = element('section', 'tool-disclosure');
  append(disclosure, privacyLabels(entry.labels, t), element('p', '', localized(entry.dataFlow, language)));
  if (entry.upstreamSourceUrl) {
    const sourceText = entry.upstreamProject
      ? `${entry.upstreamProject} · ${t('home.catalog.source')}`
      : t('home.catalog.source');
    disclosure.append(externalLink(entry.upstreamSourceUrl, sourceText));
  }
  main.append(disclosure);
  let tool: HTMLElement;
  if (id === 'private-router') tool = (await import('../tools/private-router')).renderPrivateRouter(t, config);
  else tool = element('p', 'notice', t('tool.error.generic'));
  main.append(tool);
  return main;
}

function renderTransparency(language: Language, config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('transparency.title'), '');
  main.append(
    infoSection(t('transparency.why.title'), t('transparency.why.body')),
    infoSection(t('transparency.model.title'), t('transparency.model.body')),
    infoSection(t('transparency.development.title'), t('transparency.development.body')),
  );
  const infrastructure = infoSection(t('transparency.infrastructure.title'), t('transparency.infrastructure.body'));
  const diagram = element('pre', 'architecture-diagram', t('transparency.infrastructure.diagram'));
  infrastructure.append(diagram);
  main.append(infrastructure);
  const inventory = element('section', 'section');
  inventory.append(element('h2', '', t('transparency.catalog.title')));
  for (const entry of catalog) {
    const details = element('details', 'inventory-entry');
    const summary = element('summary');
    append(summary, element('span', '', localized(entry.name, language)), privacyLabels(entry.labels, t));
    const list = element('dl', 'result-list result-list-wide');
    append(list,
      dataRow(t('transparency.field.flow'), localized(entry.dataFlow, language)),
      dataRow(t('transparency.field.upload'), entry.filesUploaded ? t('transparency.yes') : t('transparency.no')),
      dataRow(t('transparency.field.temporary'), localized(entry.temporaryStorage, language)),
      dataRow(t('transparency.field.retention'), localized(entry.retention, language)),
      dataRow(t('transparency.field.logging'), localized(entry.logging, language)),
      dataRow(t('transparency.field.upstream'), entry.upstreamServices.join(', ') || '—'),
      dataRow(t('transparency.field.project'), entry.upstreamProject || t('transparency.portalProject')),
      dataRow(t('transparency.field.license'), entry.license),
      dataRow(t('transparency.field.version'), entry.installedVersion),
      dataRow(t('transparency.field.modified'), entry.modified ? t('transparency.yes') : t('transparency.no')),
    );
    details.append(summary, list);
    if (entry.upstreamSourceUrl) details.append(externalLink(entry.upstreamSourceUrl, entry.upstreamSourceUrl));
    inventory.append(details);
  }
  main.append(inventory);
  if (config.supportUrl) {
    const link = externalLink(config.supportUrl, t('support.link'));
    main.append(infoSection(t('support.title'), t('support.body'), link));
  }
  return main;
}

function renderAcceptable(config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('acceptable.title'), t('acceptable.intro'));
  const section = element('section', 'prose section');
  section.append(element('p', '', t('acceptable.list')));
  if (config.contactUrl) section.append(externalLink(config.contactUrl, t('acceptable.contact')));
  main.append(section);
  return main;
}

function renderSupport(language: Language, config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('support.title'), t('support.body'));
  const section = element('section', 'section');
  section.append(element('p', '', t('support.conditions')));
  section.append(config.supportUrl ? externalLink(config.supportUrl, t('support.link'), 'button') : element('p', 'notice', t('support.unconfigured')));
  main.append(section);
  const upstreamLink = element('a', 'text-link', t('support.upstream.link'));
  upstreamLink.href = routePath('software', language);
  main.append(infoSection(t('support.upstream.title'), t('support.upstream.body'), upstreamLink));
  return main;
}

function renderStatus(language: Language, config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('status.title'), t('status.intro'));
  const section = element('section', 'section');
  const list = element('div', 'status-list');
  const message = element('p', 'status-message', t('status.loading'));
  message.role = 'status';
  const refresh = element('button', 'button button-secondary', t('status.refresh'));
  refresh.type = 'button';
  append(section, list, refresh, message);
  main.append(section);
  const load = async (): Promise<void> => {
    const finishAction = disableActionButton(refresh);
    message.textContent = t('status.loading');
    try {
      const response = await fetch('/_portal/status', { credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw new Error('status');
      const payload = await response.json() as unknown;
      const states = observedStatusStates(payload);
      list.replaceChildren();
      for (const entry of reviewedServices) {
        const configured = serviceConfigured(config, entry);
        const observed = states.get(entry.id) ?? 'unknown';
        const state = configured ? moreSevereStatus(entry.operationalStatus, observed) : 'not-deployed';
        list.append(statusItem(localized(entry.name, language), state, t));
      }
      const locale = language === 'es' ? 'es' : 'en';
      const checkedAt = statusCheckedAt(payload);
      message.textContent = checkedAt ? `${t('status.checked')}: ${new Date(checkedAt).toLocaleString(locale)}` : t('status.checked');
    } catch { message.textContent = t('status.error'); }
    finally { finishAction(); }
  };
  refresh.addEventListener('click', () => { void load(); });
  void load();
  return main;
}

function moreSevereStatus(declared: OperationalStatus, observed: OperationalStatus): OperationalStatus {
  if (observed === 'unknown') return 'unknown';
  const severity: Record<OperationalStatus, number> = {
    operational: 0,
    degraded: 1,
    maintenance: 2,
    unavailable: 3,
    'not-deployed': 4,
    unknown: 5,
  };
  return severity[declared] >= severity[observed] ? declared : observed;
}

const observedStatuses = new Set<OperationalStatus>(['operational', 'degraded', 'unavailable', 'maintenance']);

function observedStatusStates(payload: unknown): Map<string, OperationalStatus> {
  const states = new Map<string, OperationalStatus>();
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { services?: unknown }).services)) return states;
  for (const item of (payload as { services: unknown[] }).services) {
    if (!item || typeof item !== 'object') continue;
    const { id, status } = item as { id?: unknown; status?: unknown };
    if (typeof id === 'string' && typeof status === 'string' && observedStatuses.has(status as OperationalStatus)) {
      states.set(id, status as OperationalStatus);
    }
  }
  return states;
}

function statusCheckedAt(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const checkedAt = (payload as { checkedAt?: unknown }).checkedAt;
  if (typeof checkedAt !== 'string' || !Number.isFinite(Date.parse(checkedAt))) return undefined;
  return checkedAt;
}

function renderSoftware(config: PublicConfig, t: Translate): HTMLElement {
  const main = pageHeader(t('software.title'), t('software.intro'));
  if (config.sourceCodeUrl) main.append(externalLink(config.sourceCodeUrl, t('software.source'), 'button'));
  const legalDocuments = element('ul');
  const licenseItem = element('li');
  const licenseLink = element('a', 'text-link', t('software.documents.license'));
  licenseLink.href = '/legal/LICENSE.txt';
  licenseItem.append(licenseLink);
  const noticesItem = element('li');
  const noticesLink = element('a', 'text-link', t('software.documents.notices'));
  noticesLink.href = '/legal/THIRD_PARTY_NOTICES.txt';
  noticesItem.append(noticesLink);
  legalDocuments.append(licenseItem, noticesItem);
  main.append(infoSection(t('software.documents.title'), t('software.documents.body'), legalDocuments));
  const groups = [
    { id: 'portal', label: t('software.group.portal') },
    { id: 'hosted', label: t('software.group.hosted') },
    { id: 'infrastructure', label: t('software.group.infrastructure') },
    { id: 'browser', label: t('software.group.browser') },
    { id: 'build', label: t('software.group.build') },
  ] as const;
  type SoftwareGroup = (typeof groups)[number]['id'];
  type SoftwareItem = {
    group: SoftwareGroup;
    name: string;
    version: string;
    license: string;
    upstream?: string;
    modifiedSource?: string;
    modification: string;
    purpose: string;
  };
  const inventory: SoftwareItem[] = [
    { group: 'portal', name: t('software.portalName'), version: '0.1.0', license: 'AGPL-3.0-or-later', upstream: config.sourceCodeUrl, modification: t('software.original'), purpose: t('software.purpose.portal') },
    { group: 'portal', name: 'Node.js / Alpine Linux', version: '24.14.0 / 3.23', license: 'MIT / component-specific', upstream: 'https://github.com/nodejs/node/tree/v24.14.0', modification: t('software.notModified'), purpose: t('software.purpose.node') },
    { group: 'hosted', name: 'SearXNG', version: '2026.8.22-9fea41204', license: 'AGPL-3.0-or-later', upstream: 'https://github.com/searxng/searxng', modification: t('software.modified'), modifiedSource: config.sourceCodeUrl, purpose: t('software.purpose.searxng') },
    { group: 'infrastructure', name: 'Valkey', version: '9.1.1-alpine', license: 'BSD-3-Clause', upstream: 'https://github.com/valkey-io/valkey/tree/9.1.1', modification: t('software.notModified'), purpose: t('software.purpose.valkey') },
    { group: 'hosted', name: 'Redlib', version: 'a4d36e9 + local redirect hardening', license: 'AGPL-3.0-only', upstream: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374', modification: t('software.modified'), modifiedSource: config.sourceCodeUrl, purpose: t('software.purpose.redlib') },
    { group: 'hosted', name: 'Anubis', version: '1.27.0', license: 'MIT', upstream: 'https://github.com/TecharoHQ/anubis/tree/v1.27.0', modification: t('software.imageUnmodifiedConfigured'), modifiedSource: config.sourceCodeUrl, purpose: t('software.purpose.anubis') },
    { group: 'hosted', name: 'FreshRSS', version: '1.29.1', license: 'AGPL-3.0', upstream: 'https://github.com/FreshRSS/FreshRSS/tree/1.29.1', modification: t('software.notModified'), purpose: t('software.purpose.freshrss') },
    { group: 'hosted', name: 'PrivateBin', version: '2.0.6', license: 'Zlib', upstream: 'https://github.com/PrivateBin/PrivateBin/tree/2.0.6', modification: t('software.notModified'), purpose: t('software.purpose.privatebin') },
    { group: 'infrastructure', name: 'RSSHub', version: '40aca954', license: 'AGPL-3.0', upstream: 'https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95', modification: t('software.notModified'), purpose: t('software.purpose.rsshub') },
    { group: 'infrastructure', name: 'PostgreSQL', version: '17.11-alpine', license: 'PostgreSQL License', upstream: 'https://github.com/postgres/postgres', modification: t('software.notModified'), purpose: t('software.purpose.postgresql') },
    { group: 'browser', name: 'Newsreader', version: '5.3.0 package', license: 'OFL-1.1', upstream: 'https://github.com/productiontype/Newsreader', modification: t('software.notModified'), purpose: t('software.purpose.fonts') },
    { group: 'browser', name: 'Atkinson Hyperlegible Next', version: '5.3.0 package', license: 'OFL-1.1', upstream: 'https://github.com/googlefonts/atkinson-hyperlegible-next', modification: t('software.notModified'), purpose: t('software.purpose.fonts') },
    { group: 'build', name: 'Vite', version: '8.2.2', license: 'MIT', upstream: 'https://github.com/vitejs/vite', modification: t('software.notModified'), purpose: t('software.purpose.vite') },
    { group: 'build', name: 'TypeScript', version: '6.0.3', license: 'Apache-2.0', upstream: 'https://github.com/microsoft/TypeScript', modification: t('software.notModified'), purpose: t('software.purpose.typescript') },
  ];
  const jump = element('nav', 'software-jump');
  jump.ariaLabel = t('software.jump');
  for (const group of groups) {
    const link = element('a', '', group.label);
    link.href = `#software-${group.id}`;
    jump.append(link);
  }
  main.append(jump);
  for (const group of groups) {
    const section = element('section', 'section software-group');
    const heading = element('h2', '', group.label);
    heading.id = `software-${group.id}`;
    heading.tabIndex = -1;
    section.append(heading);
    const list = element('div', 'software-list');
    for (const itemData of inventory.filter((item) => item.group === group.id)) {
      const item = element('article', 'software-item');
      append(
        item,
        element('h3', '', itemData.name),
        element('p', '', `${itemData.version} · ${itemData.license}`),
        element('p', '', `${t('software.purposeLabel')}: ${itemData.purpose}`),
        element('p', 'software-modification', itemData.modification),
      );
      if (itemData.upstream) item.append(externalLink(itemData.upstream, `${t('software.upstreamSource')}: ${itemData.name}`));
      if (itemData.modifiedSource && itemData.modifiedSource !== itemData.upstream) {
        item.append(externalLink(itemData.modifiedSource, `${t('software.modifiedSource')}: ${itemData.name}`));
      }
      list.append(item);
    }
    section.append(list);
    main.append(section);
  }
  return main;
}

function renderLabelGuide(t: Translate): HTMLElement {
  const main = pageHeader(t('labels.title'), t('labels.intro'));
  const section = element('section', 'section');
  section.append(privacyLabels(['local', 'server', 'proxy', 'external'], t, true));
  main.append(section);
  return main;
}

function renderNotFound(language: Language, t: Translate): HTMLElement {
  const main = pageHeader(t('common.notFound.title'), t('common.notFound.body'));
  const link = element('a', 'button', t('common.notFound.back'));
  link.href = routePath('home', language);
  main.append(link);
  return main;
}

function prosePage(title: string, intro: string, sections: Array<[TranslationKey, TranslationKey]>, t: Translate, suppressDuplicate = false): HTMLElement {
  const main = pageHeader(title, intro);
  for (const [heading, body] of sections) {
    const headingText = suppressDuplicate && t(heading) === title ? '' : t(heading);
    main.append(infoSection(headingText, t(body)));
  }
  return main;
}

function pageContainer(className = ''): HTMLElement {
  const main = element('main', `page-shell ${className}`.trim());
  main.id = 'main-content';
  main.tabIndex = -1;
  return main;
}

function pageHeader(title: string, intro: string, className = ''): HTMLElement {
  const main = pageContainer(className);
  const header = element('header', 'page-header');
  append(header, element('h1', '', title), intro ? element('p', 'hero-lead', intro) : null);
  main.append(header);
  return main;
}

function infoSection(title: string, body: string, extra?: HTMLElement): HTMLElement {
  const section = element('section', 'section prose');
  append(section, title ? element('h2', '', title) : null, element('p', '', body), extra);
  return section;
}

function discoveryState(searchParams: URLSearchParams): CatalogDiscoveryState {
  const query = (searchParams.get('q') ?? '').trim().slice(0, 160);
  const candidateGroup = searchParams.get('group');
  const group = discoveryGroups.includes(candidateGroup as DiscoveryGroup) ? candidateGroup as DiscoveryGroup : null;
  const view = searchParams.get('view') === 'all' ? 'all' : 'featured';
  return { query: query || undefined, group, view };
}

function catalogUrl(language: Language, state: CatalogDiscoveryState): string {
  const params = new URLSearchParams();
  if (state.query?.trim()) params.set('q', state.query.trim());
  else if (state.group) params.set('group', state.group);
  else if (state.view === 'all') params.set('view', 'all');
  const query = params.toString();
  return `${routePath('home', language)}${query ? `?${query}` : ''}#catalog`;
}

function discoveryGroupLabel(group: DiscoveryGroup, t: Translate): string {
  const keys: Record<DiscoveryGroup, TranslationKey> = {
    find: 'discovery.find',
    'text-data': 'discovery.textData',
    'feeds-monitoring': 'discovery.feeds',
  };
  return t(keys[group]);
}

function catalogStateLabel(state: CatalogDiscoveryState, t: Translate): string {
  if (state.query?.trim()) return t('home.catalog.searchLabel');
  if (state.group) return discoveryGroupLabel(state.group, t);
  if (state.view === 'all') return t('home.catalog.all');
  return t('home.catalog.featured');
}

function catalogStateCode(state: CatalogDiscoveryState): string {
  if (state.query?.trim()) return 'Q';
  if (state.group) return String(discoveryGroups.indexOf(state.group) + 1).padStart(2, '0');
  if (state.view === 'all') return 'A–Z';
  return '00';
}

function deployedEntries(config: PublicConfig): CatalogEntry[] {
  return catalog.filter((entry) => entry.kind === 'service' && entryLaunchable(entry, config));
}

function redlibConfigured(config: PublicConfig): boolean {
  const redlib = catalogEntry('redlib');
  return Boolean(redlib && serviceConfigured(config, redlib));
}

function statusItem(name: string, state: OperationalStatus, t: Translate): HTMLElement {
  const item = element('article', 'status-item');
  append(item, element('h2', '', name), element('span', `status-pill status-${state}`, t(`status.${state}` as TranslationKey)));
  return item;
}

function dataRow(term: string, value: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  append(fragment, element('dt', '', term), element('dd', '', value));
  return fragment;
}

function externalLink(href: string, text: string, className = 'text-link'): HTMLAnchorElement {
  const link = element('a', className, text);
  link.href = href;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

export function pageMeta(route: Route, config: PublicConfig, t: Translate): { title: string; description: string; robots: string } {
  if (route.page === 'tool' && route.toolId) {
    const entry = catalogEntry(route.toolId);
    return { title: entry ? localized(entry.name, route.language) : t('common.notFound.title'), description: entry ? localized(entry.description, route.language) : t('common.notFound.body'), robots: 'noindex,nofollow' };
  }
  if (route.page === 'not-found') {
    return { title: t('common.notFound.title'), description: t('common.notFound.body'), robots: 'noindex,nofollow' };
  }
  const key = route.page;
  const titleKey = `meta.${key}.title` as TranslationKey;
  let title: string;
  try { title = t(titleKey); } catch { title = config.projectName; }
  const descriptionKeys: Partial<Record<StaticPage, TranslationKey>> = {
    home: 'meta.home.description',
    services: 'services.intro',
    tools: 'tools.intro',
    about: 'about.body1',
    transparency: 'transparency.why.body',
    privacy: 'privacy.intro',
    acceptable: 'acceptable.intro',
    support: 'support.body',
    status: 'status.intro',
    software: 'software.intro',
    labels: 'labels.intro',
  };
  const descriptionKey = descriptionKeys[route.page as StaticPage];
  const description = descriptionKey ? t(descriptionKey) : title;
  const noIndex: StaticPage[] = ['services', 'tools', 'status', 'not-found'];
  return { title, description, robots: noIndex.includes(route.page as StaticPage) ? 'noindex,nofollow' : 'index,follow' };
}
