import { describe, it, expect } from 'vitest';
import { emptyToolkit, loadToolkit, moveTool, parseToolkit, parseShared, readSharedFragment, resetToolkit, saveToolkit, shareFragment, toolkitKey } from '../../src/utilities/toolkits';
describe('bounded catalogue preferences', () => {
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
