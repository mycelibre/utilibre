import { catalog, localized, type CatalogEntry, type DiscoveryGroup } from './catalog';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { toolPath } from '../routes';

export const discoveryGroups: readonly DiscoveryGroup[] = [
  'find',
  'files',
  'documents',
  'text-data',
  'feeds-monitoring',
  'developer',
];

export interface CatalogLaunch {
  href: string;
  external: boolean;
}

export interface CatalogDiscoveryState {
  query?: string;
  group?: DiscoveryGroup | null;
  view?: 'featured' | 'all';
}

export function serviceEnabled(config: PublicConfig, id: string): boolean {
  return config.enabledServices.includes(id);
}

export function serviceConfigured(config: PublicConfig, entry: CatalogEntry): boolean {
  if (entry.kind !== 'service' || !serviceEnabled(config, entry.id)) return false;
  if (!entry.configUrlKey) return true;
  return Boolean(configValue(config, entry.configUrlKey));
}

export function privateRouterAvailable(config: PublicConfig): boolean {
  return (
    (serviceEnabled(config, 'invidious') && Boolean(config.publicYoutubeUrl))
    || (serviceEnabled(config, 'redlib') && Boolean(config.publicRedditUrl))
    || (serviceEnabled(config, 'rimgo') && Boolean(config.publicImgurUrl))
  );
}

export function entryLaunch(entry: CatalogEntry, language: Language, config: PublicConfig): CatalogLaunch | null {
  if (!entryLaunchable(entry, config)) return null;

  if (entry.kind === 'tool' || entry.id === 'cobalt') {
    return { href: toolPath(entry.id, language), external: false };
  }

  const href = entry.configUrlKey ? configValue(config, entry.configUrlKey) : '';
  return href ? { href, external: /^https?:\/\//i.test(href) } : null;
}

export function entryLaunchable(entry: CatalogEntry, config: PublicConfig): boolean {
  if (entry.id === 'private-router') return privateRouterAvailable(config);
  if (entry.configBooleanKey && !config[entry.configBooleanKey]) return false;
  if (entry.kind === 'tool') return true;
  return entry.operationalStatus !== 'not-deployed' && serviceConfigured(config, entry);
}

export function launchableEntries(config: PublicConfig): CatalogEntry[] {
  return catalog.filter((entry) => entryLaunchable(entry, config));
}

export function featuredEntries(config: PublicConfig): CatalogEntry[] {
  return launchableEntries(config)
    .filter((entry) => entry.featuredOrder !== undefined)
    .sort((left, right) => (left.featuredOrder ?? Number.MAX_SAFE_INTEGER) - (right.featuredOrder ?? Number.MAX_SAFE_INTEGER));
}

export function allEntries(config: PublicConfig, language: Language): CatalogEntry[] {
  return sortByName(launchableEntries(config), language);
}

export function groupEntries(config: PublicConfig, language: Language, group: DiscoveryGroup): CatalogEntry[] {
  return sortByName(launchableEntries(config).filter((entry) => entry.discoveryGroup === group), language);
}

export function searchEntries(config: PublicConfig, language: Language, query: string): CatalogEntry[] {
  const normalizedQuery = normalizeCatalogSearch(query, language);
  if (!normalizedQuery) return [];
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  return allEntries(config, language).filter((entry) => {
    const searchable = normalizeCatalogSearch([
      entry.id,
      localized(entry.name, language),
      localized(entry.description, language),
    ].join(' '), language);
    return terms.every((term) => searchable.includes(term));
  });
}

export function discoverEntries(config: PublicConfig, language: Language, state: CatalogDiscoveryState = {}): CatalogEntry[] {
  if (state.query?.trim()) return searchEntries(config, language, state.query);
  if (state.group) return groupEntries(config, language, state.group);
  if (state.view === 'all') return allEntries(config, language);
  return featuredEntries(config);
}

export function normalizeCatalogSearch(value: string, language: Language): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLocaleLowerCase(language)
    .trim();
}

function sortByName(entries: CatalogEntry[], language: Language): CatalogEntry[] {
  const collator = new Intl.Collator(language, { sensitivity: 'base', usage: 'sort' });
  return [...entries].sort((left, right) => collator.compare(localized(left.name, language), localized(right.name, language)));
}

function configValue(config: PublicConfig, key: string): string {
  const value = config[key as keyof PublicConfig];
  return typeof value === 'string' ? value : '';
}
