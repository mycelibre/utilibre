import { describe, it, expect } from 'vitest';
import { emptyToolkit, loadToolkit, moveTool, parseToolkit, parseShared, pinToStartingCollection, readSharedFragment, resetToolkit, saveToolkit, shareFragment, toolkitKey } from '../../src/utilities/toolkits';
describe('bounded catalogue preferences', () => {
  it('pins to the chosen starting collection without replacing other data', () => {
    const data = new Map<string, string>([['document', 'private draft']]);
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
    expect(pinToStartingCollection(storage, 'en', 'drawio').status).toBe('saved');
    expect(pinToStartingCollection(storage, 'es', 'drawio').status).toBe('already');
    const value = loadToolkit(storage, 'en').value;
    value.collections.push({ id: 'work', label: 'Work', tools: [] }); value.start = 'work'; saveToolkit(storage, value);
    expect(pinToStartingCollection(storage, 'en', 'bentopdf')).toEqual({ status: 'saved', label: 'Work' });
    expect(loadToolkit(storage, 'en').value.collections.map(c => c.tools)).toEqual([['drawio'], ['bentopdf']]);
    expect(data.get('document')).toBe('private draft');
    value.collections[1]!.tools = Array.from({ length: 64 }, (_, i) => `tool-${i}`); saveToolkit(storage, value);
    expect(pinToStartingCollection(storage, 'en', 'bentopdf').status).toBe('full');
    data.set(toolkitKey, 'malformed');
    expect(pinToStartingCollection(storage, 'en', 'bentopdf').status).toBe('unavailable');
    expect(data.get(toolkitKey)).toBe('malformed');
    expect(pinToStartingCollection({ getItem: () => null, setItem: () => { throw new Error('quota'); } }, 'en', 'bentopdf').status).toBe('unavailable');
  });
  it('round trips exports and Unicode fragment sharing', () => {
    const value = emptyToolkit('es'); value.collections[0]!.label = 'Diseño y café'; value.collections[0]!.tools = ['drawio', 'rawgraphs'];
    expect(parseToolkit(JSON.stringify(value))).toEqual(value);
    expect(readSharedFragment(shareFragment(value.collections[0]!, 'es'))).toEqual({ version: 1, language: 'es', collection: { label: 'Diseño y café', tools: ['drawio', 'rawgraphs'] } });
  });
  it('preserves unknown retired IDs as inert IDs, not URLs', () => {
    const value = emptyToolkit('en'); value.collections[0]!.tools = ['retired-tool']; expect(parseToolkit(JSON.stringify(value))).toEqual(value);
    value.collections[0]!.tools = ['https://evil.example']; expect(() => parseToolkit(JSON.stringify(value))).toThrow();
  });
  it('rejects version, size, duplicates, extra fields and malformed encoding', () => {
    for (const value of [{ version: 2 }, { ...emptyToolkit('en'), url: 'https://x.test' }, { ...emptyToolkit('en'), start: 'missing' }, { ...emptyToolkit('en'), collections: Array(13).fill({ id: 'a', label: 'a', tools: [] }) }]) expect(() => parseToolkit(JSON.stringify(value))).toThrow();
    expect(() => parseToolkit(' '.repeat(32769))).toThrow();
    expect(() => parseShared(JSON.stringify({ version: 1, language: 'en', collection: { label: 'x', tools: ['drawio','drawio'] } }))).toThrow();
    for (const hash of ['#bad', '#collection=%', '#collection=_w', '#collection=' + 'A'.repeat(11000)]) expect(() => readSharedFragment(hash)).toThrow();
  });
  it('reorders without losing data and ignores boundary moves', () => {
    const c = { id: 'x', label: 'x', tools: ['drawio', 'rawgraphs', 'pairdrop'] };
    moveTool(c, 'rawgraphs', -1); expect(c.tools).toEqual(['rawgraphs', 'drawio', 'pairdrop']); moveTool(c, 'rawgraphs', -1); moveTool(c, 'missing', 1); expect(c.tools[0]).toBe('rawgraphs');
  });
  it('handles blocked storage and resets only its own key', () => {
    const blocked = () => { throw new Error('SecurityError'); };
    expect(loadToolkit({ getItem: blocked }, 'en').failed).toBe(true); expect(saveToolkit({ setItem: blocked }, emptyToolkit('en'))).toBe(false); expect(resetToolkit({ removeItem: blocked })).toBe(false);
    const data = new Map([[toolkitKey, 'x'], ['document', 'keep'], ['portal.theme', 'dark']]);
    expect(resetToolkit({ removeItem: key => { data.delete(key); } })).toBe(true); expect([...data.keys()]).toEqual(['document', 'portal.theme']);
  });
});
