import { catalog, type CatalogEntry, type DiscoveryGroup } from './catalog';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { toolPath } from '../routes';
import { localizedServiceUrl } from './locale-links';
import { accessMode, pilotIds, startHereIds } from './guidance';

export const discoveryGroups: readonly DiscoveryGroup[] = ['documents', 'creative', 'sharing', 'reading', 'data'];
const aliases: Record<string, DiscoveryGroup> = { files: 'documents', media: 'creative', design: 'creative', privacy: 'sharing', planning: 'sharing', find: 'reading', 'feeds-monitoring': 'reading', 'text-data': 'data' };
export function normalizeGroup(group?: string | null): DiscoveryGroup | null {
  return group && discoveryGroups.includes(group as DiscoveryGroup) ? group as DiscoveryGroup : aliases[group || ''] || null;
}
export function entryGroup(entry: CatalogEntry): DiscoveryGroup {
  if (entry.id === 'ntfy') return 'sharing';
  if (entry.id === 'actual') return 'documents';
  return normalizeGroup(entry.discoveryGroup)!;
}
export const catalogViews = ['featured', 'public', 'accounts', 'pilots', 'all'] as const;
export type CatalogView = typeof catalogViews[number];
export interface CatalogLaunch { href: string; external: boolean; }
export interface CatalogDiscoveryState { query?: string; group?: DiscoveryGroup | null; view?: CatalogView; }
export function serviceEnabled(config: PublicConfig, id: string): boolean { return config.enabledServices.includes(id); }
export function serviceConfigured(config: PublicConfig, entry: CatalogEntry): boolean {
  return entry.kind === 'service' && serviceEnabled(config, entry.serviceId ?? entry.id) && Boolean(entry.configUrlKey && configValue(config, entry.configUrlKey));
}
export function privateRouterAvailable(config: PublicConfig): boolean { return serviceEnabled(config, 'redlib') && Boolean(config.publicRedditUrl); }
export function entryLaunch(entry: CatalogEntry, language: Language, config: PublicConfig): CatalogLaunch | null {
  if (!entryLaunchable(entry, config)) return null;
  if (entry.kind === 'integration') return { href: toolPath(entry.id, language), external: false };
  const base = entry.configUrlKey ? configValue(config, entry.configUrlKey) : '';
  return base ? { href: localizedServiceUrl(entry.serviceId ?? entry.id, base, language, entry.launchPath), external: /^https?:\/\//i.test(base) } : null;
}
export function entryLaunchable(entry: CatalogEntry, config: PublicConfig): boolean {
  if (entry.id === 'private-router') return privateRouterAvailable(config);
  if (entry.kind === 'integration') return true;
  return !['not-deployed', 'maintenance', 'unavailable'].includes(entry.operationalStatus) && serviceConfigured(config, entry);
}
export function visibleEntries(config: PublicConfig): CatalogEntry[] { return catalog.filter(e => entryLaunchable(e, config) || config.listedServices.includes(e.serviceId ?? e.id)); }
export function launchableEntries(config: PublicConfig): CatalogEntry[] { return catalog.filter(e => entryLaunchable(e, config)); }
export function immediatelyUsable(entry: CatalogEntry, config: PublicConfig): boolean {
  return entry.id !== 'uptime-kuma' && !pilotIds.has(entry.id) && entry.operationalStatus === 'operational' && accessMode(entry) === 'anonymous' && entryLaunchable(entry, config);
}
export function featuredEntries(config: PublicConfig): CatalogEntry[] {
  return startHereIds.flatMap(id => { const e = catalog.find(e => e.id === id); return e && immediatelyUsable(e, config) ? [e] : []; });
}
export function allEntries(config: PublicConfig, language: Language): CatalogEntry[] { return sortByName(visibleEntries(config).filter(e => e.id !== 'uptime-kuma'), language); }
export function groupEntries(config: PublicConfig, language: Language, group: DiscoveryGroup): CatalogEntry[] { return allEntries(config, language).filter(e => entryGroup(e) === normalizeGroup(group)); }
const synonyms: Record<string, string> = {
  wbo: 'whiteboard shared collaboration group pizarra compartida colaborar grupo dibujar',
  markmap: 'mind map outline markdown study notes mapa mental esquema estudiar apuntes ideas',
  bentopdf: 'scan scanned text extract escaneo escaneado texto extraer juntar unir pdf ocr',
  vert: 'convert conversion convertir conversión formatos archivos',
  pairdrop: 'phone computer transfer send archivo teléfono celular computadora transferir enviar',
  pollaris: 'meeting date schedule encuesta reunión fecha horario votar poll',
  'omni-compress-image': 'photo image smaller size compress foto imagen comprimir reducir peso tamaño',
  'omni-background': 'remove background transparent quitar fondo transparente',
  'omni-image-editor': 'crop resize recortar redimensionar anotar image imagen foto',
  'image-scrubber': 'redact cover hide exif metadata tapar ocultar metadatos foto privacidad',
  drawio: 'flowchart diagram diagrama flujo', excalidraw: 'sketch whiteboard boceto pizarra',
  rawgraphs: 'csv chart graph gráfica grafica gráfico barras datos',
  'qr-offline': 'qr code código cámara crear leer', miniqr: 'qr code código cámara crear leer',
};
function matches(entry: CatalogEntry, query: string, language: Language): boolean {
  const haystack = normalizeCatalogSearch([entry.id, entry.upstreamProject, entry.name.en, entry.name.es, entry.description.en, entry.description.es, synonyms[entry.id] || ''].join(' '), language);
  return normalizeCatalogSearch(query, language).split(/\s+/).filter(Boolean).every(term => haystack.includes(term));
}
export function searchEntries(config: PublicConfig, language: Language, query: string): CatalogEntry[] { return query.trim() ? allEntries(config, language).filter(e => matches(e, query, language)) : []; }
export function discoverEntries(config: PublicConfig, language: Language, state: CatalogDiscoveryState = {}): CatalogEntry[] {
  const view = state.view || 'featured';
  let entries = allEntries(config, language);
  if (view === 'featured' && !state.query && !state.group) entries = featuredEntries(config);
  else if (view === 'public' || view === 'featured') entries = entries.filter(e => immediatelyUsable(e, config));
  else if (view === 'accounts') entries = entries.filter(e => accessMode(e) !== 'anonymous' && !pilotIds.has(e.id));
  else if (view === 'pilots') entries = entries.filter(e => pilotIds.has(e.id) || e.operationalStatus !== 'operational' || !entryLaunchable(e, config));
  if (state.group) entries = entries.filter(e => entryGroup(e) === normalizeGroup(state.group));
  if (state.query?.trim()) entries = entries.filter(e => matches(e, state.query!, language));
  return entries;
}
export function normalizeCatalogSearch(value: string, language: Language): string { return value.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase(language).trim(); }
function sortByName(entries: CatalogEntry[], language: Language): CatalogEntry[] { return [...entries].sort((a, b) => new Intl.Collator(language, { sensitivity: 'base' }).compare(a.name[language], b.name[language])); }
function configValue(config: PublicConfig, key: string): string { const v = config[key as keyof PublicConfig]; return typeof v === 'string' ? v : ''; }
