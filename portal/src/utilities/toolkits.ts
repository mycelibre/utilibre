import type { Language } from '../i18n';

export const toolkitKey = 'portal.toolkits.v1';
export const toolkitLimit = 32768;
export interface Collection { id: string; label: string; tools: string[]; }
export interface Toolkit { version: 1; language: Language; start: string; collections: Collection[]; }
export interface SharedCollection { version: 1; language: Language; collection: Omit<Collection, 'id'>; }
const idPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k))) throw new Error('schema');
  return value as Record<string, unknown>;
}
function language(value: unknown): Language { if (value !== 'en' && value !== 'es') throw new Error('language'); return value; }
function label(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 80 || [...value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) throw new Error('label');
  return value.trim();
}
function identifier(value: unknown): string { if (typeof value !== 'string' || !idPattern.test(value)) throw new Error('id'); return value; }
function toolIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 64) throw new Error('tools');
  const ids = value.map(identifier); if (new Set(ids).size !== ids.length) throw new Error('duplicates'); return ids;
}
function parse(text: string, max = toolkitLimit): unknown { if (text.length > max) throw new Error('size'); return JSON.parse(text); }
export function parseToolkit(text: string): Toolkit {
  const v = record(parse(text), ['version', 'language', 'start', 'collections']);
  if (v.version !== 1 || !Array.isArray(v.collections) || !v.collections.length || v.collections.length > 12) throw new Error('version/collections');
  const collections = v.collections.map(item => { const c = record(item, ['id', 'label', 'tools']); return { id: identifier(c.id), label: label(c.label), tools: toolIds(c.tools) }; });
  const start = identifier(v.start);
  if (new Set(collections.map(c => c.id)).size !== collections.length || !collections.some(c => c.id === start) || collections.reduce((n,c) => n+c.tools.length,0) > 256) throw new Error('collections');
  return { version: 1, language: language(v.language), start, collections };
}
export function parseShared(text: string): SharedCollection {
  const v = record(parse(text, 8192), ['version', 'language', 'collection']);
  if (v.version !== 1) throw new Error('version');
  const c = record(v.collection, ['label', 'tools']);
  return { version: 1, language: language(v.language), collection: { label: label(c.label), tools: toolIds(c.tools) } };
}
export function shareFragment(collection: Collection, lang: Language): string {
  const text = JSON.stringify(parseShared(JSON.stringify({ version: 1, language: lang, collection: { label: collection.label, tools: collection.tools } })));
  const binary = Array.from(new TextEncoder().encode(text), byte => String.fromCharCode(byte)).join('');
  return '#collection=' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function readSharedFragment(hash: string): SharedCollection | null {
  if (!hash) return null;
  if (!hash.startsWith('#collection=') || hash.length > 11000 || !/^[A-Za-z0-9_-]+$/.test(hash.slice(12))) throw new Error('fragment');
  const binary = atob(hash.slice(12).replace(/-/g, '+').replace(/_/g, '/'));
  return parseShared(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, c => c.charCodeAt(0))));
}
export function emptyToolkit(lang: Language): Toolkit {
  return { version: 1, language: lang, start: 'default', collections: [{ id: 'default', label: lang === 'es' ? 'Mis herramientas' : 'My tools', tools: [] }] };
}
export function moveTool(collection: Collection, id: string, direction: -1 | 1): void {
  const i = collection.tools.indexOf(id); const next = i + direction;
  if (i < 0 || next < 0 || next >= collection.tools.length) return;
  [collection.tools[i], collection.tools[next]] = [collection.tools[next]!, collection.tools[i]!];
}
export function loadToolkit(storage: Pick<Storage, 'getItem'>, lang: Language): { value: Toolkit; failed: boolean } {
  try { const raw = storage.getItem(toolkitKey); return { value: raw ? parseToolkit(raw) : emptyToolkit(lang), failed: false }; }
  catch { return { value: emptyToolkit(lang), failed: true }; }
}
export function saveToolkit(storage: Pick<Storage, 'setItem'>, value: Toolkit): boolean {
  try { storage.setItem(toolkitKey, JSON.stringify(parseToolkit(JSON.stringify(value)))); return true; } catch { return false; }
}
export function resetToolkit(storage: Pick<Storage, 'removeItem'>): boolean {
  try { storage.removeItem(toolkitKey); return true; } catch { return false; }
}

/** Read fresh on every save, so another tab's selections are not overwritten. */
export function pinToStartingCollection(storage: Pick<Storage, 'getItem' | 'setItem'>, lang: Language, id: string): { status: 'saved' | 'already' | 'full' | 'unavailable'; label?: string } {
  if (!idPattern.test(id)) return { status: 'unavailable' };
  const loaded = loadToolkit(storage, lang);
  if (loaded.failed) return { status: 'unavailable' };
  const current = loaded.value.collections.find(c => c.id === loaded.value.start)!;
  if (current.tools.includes(id)) return { status: 'already', label: current.label };
  if (current.tools.length >= 64 || loaded.value.collections.reduce((n, c) => n + c.tools.length, 0) >= 256) return { status: 'full' };
  current.tools.push(id);
  return saveToolkit(storage, loaded.value) ? { status: 'saved', label: current.label } : { status: 'unavailable' };
}
