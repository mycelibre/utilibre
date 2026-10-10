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
  'one-file-core': 'portable html diagram animated nodes connections diagrama portátil animación nodos conexiones',
  tiddlywiki: 'wiki notebook notes single file html cuaderno notas archivo único',
  addy: 'email alias aliases forwarding inbox mask address correo alias reenvío reenviar buzón dirección',
  searxng: 'web search búsqueda buscador internet',
  'reactive-resume': 'cv resume résumé curriculum currículum',
  penpot: 'collaborative design diseño colaborativo prototipo',
  actual: 'personal budget household presupuesto personal hogar',
  jupyterlite: 'python notebooks notebook cuadernos cuaderno',
  freshrss: 'rss feed reader lector fuentes',
  moodist: 'focus noise ambient timer rain birds waves stream fire café concentración ruido ambiente temporizador lluvia pájaros olas arroyo fuego cafetería',
  sketchforge: '3d model cad stl print diseño modelo imprimir',
  chartdb: 'database diagram sql schema tables base datos esquema tablas',
  drawdb: 'sql database schema tables relationships base datos esquema tablas relaciones',
  bookbinder: 'pdf booklet zine signatures imposition print binding cuadernillo folleto fanzine imprimir encuadernar',
  wbo: 'collab whiteboard shared collaboration group pizarra compartida colaborar grupo dibujar',
  markmap: 'mind map outline markdown study notes mapa mental esquema estudiar apuntes ideas',
  bentopdf: 'scan scanned text extract escaneo escaneado texto extraer juntar unir pdf ocr markdown imprimir print booklet folleto cuadernillo imposition imposición',
  vert: 'convert conversion convertir conversión formatos archivos',
  pairdrop: 'phone computer transfer send archivo teléfono celular computadora transferir enviar',
  pollaris: 'meeting date schedule encuesta reunión fecha horario votar poll',
  'omni-compress-image': 'photo image smaller size compress foto imagen comprimir reducir peso tamaño',
  'omni-background': 'remove background transparent quitar fondo transparente',
  'omni-image-editor': 'crop resize recortar redimensionar anotar image imagen foto',
  'image-scrubber': 'redact cover hide exif metadata viewer inspect view visor ver revisar inspeccionar tapar ocultar metadatos foto privacidad',
  drawio: 'flowchart diagram diagrama flujo', excalidraw: 'sketch whiteboard boceto pizarra',
  svgedit: 'vector vectors vectorial vectores svg',
  ittools: 'developer development desarrollo json jwt uuid regex password passphrase token generator contraseña contraseñas clave claves frase palabras generar generador bip39 markdown html convert convertir',
  privatebin: 'pastebin syntax code snippet source share resaltar sintaxis código fuente fragmento pegar compartir texto',
  cyberchef: 'file type identify inspect hash verify checksum sha256 sha 256 archivo tipo identificar inspeccionar verificar comprobar suma huella',
  rawgraphs: 'csv chart graph gráfica grafica gráfico barras datos',
  'qr-offline': 'qr code código cámara crear leer', miniqr: 'qr code código cámara crear leer',
};
function matches(entry: CatalogEntry, query: string, language: Language): boolean {
  const haystack = normalizeCatalogSearch([entry.id, entry.upstreamProject, entry.name.en, entry.name.es, entry.description.en, entry.description.es, synonyms[entry.id] || ''].join(' '), language);
  const terms = normalizeCatalogSearch(query, language).split(/\s+/).filter(Boolean);
  return terms.length > 0 && terms.every(term => haystack.includes(term));
}
// A task's name expresses intent more strongly than a format mentioned in its copy.
// Keep all-term matching, accents/synonyms and access filtering independent of ranking.
export function rankCatalogEntries(entries: readonly CatalogEntry[], language: Language, query: string): CatalogEntry[] {
  const needle = normalizeCatalogSearch(query, language);
  if (!needle) return query.trim() ? [] : sortByName([...entries], language);
  const terms = needle.split(' ');
  const fieldScore = (value: string): number => {
    const field = normalizeCatalogSearch(value, language);
    const words = field.split(' ');
    if (field === needle) return 100;
    if (` ${field} `.includes(` ${needle} `)) return 80;
    if (terms.every(term => words.includes(term))) return 60;
    if (terms.every(term => field.includes(term))) return 40;
    return terms.filter(term => words.includes(term)).length / terms.length * 20;
  };
  const score = (entry: CatalogEntry): number => Math.max(
    fieldScore(entry.name[language]) * 10,
    fieldScore(entry.name[language === 'es' ? 'en' : 'es']) * 8,
    fieldScore(entry.upstreamProject || entry.id) * 4,
    fieldScore(synonyms[entry.id] || '') * 3,
    fieldScore(entry.description[language]),
  );
  const collator = new Intl.Collator(language, { sensitivity: 'base' });
  return entries.filter(entry => matches(entry, needle, language))
    .map(entry => ({ entry, score: score(entry) }))
    .sort((a, b) => b.score - a.score || collator.compare(a.entry.name[language], b.entry.name[language]))
    .map(result => result.entry);
}
export function searchEntries(config: PublicConfig, language: Language, query: string): CatalogEntry[] { return query.trim() ? rankCatalogEntries(allEntries(config, language), language, query) : []; }
export function discoverEntries(config: PublicConfig, language: Language, state: CatalogDiscoveryState = {}): CatalogEntry[] {
  const view = state.view || (state.query?.trim() ? 'all' : 'featured');
  let entries = allEntries(config, language);
  if (view === 'featured' && !state.query && !state.group) entries = featuredEntries(config);
  else if (view === 'public' || view === 'featured') entries = entries.filter(e => immediatelyUsable(e, config));
  else if (view === 'accounts') entries = entries.filter(e => accessMode(e) !== 'anonymous' && !pilotIds.has(e.id));
  else if (view === 'pilots') entries = entries.filter(e => pilotIds.has(e.id) || e.operationalStatus !== 'operational' || !entryLaunchable(e, config));
  if (state.group) entries = entries.filter(e => entryGroup(e) === normalizeGroup(state.group));
  if (state.query?.trim()) entries = rankCatalogEntries(entries, language, state.query);
  return entries;
}
export function normalizeCatalogSearch(value: string, language: Language): string { return value.normalize('NFD').replace(/\p{M}+/gu, '').toLocaleLowerCase(language).replace(/[^\p{L}\p{N}]+/gu, ' ').trim(); }
function sortByName(entries: CatalogEntry[], language: Language): CatalogEntry[] { return [...entries].sort((a, b) => new Intl.Collator(language, { sensitivity: 'base' }).compare(a.name[language], b.name[language])); }
function configValue(config: PublicConfig, key: string): string { const v = config[key as keyof PublicConfig]; return typeof v === 'string' ? v : ''; }
