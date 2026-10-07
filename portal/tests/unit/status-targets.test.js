import { describe, expect, it } from 'vitest';
import { parseStatusServices } from '../../server/status-targets.mjs';

describe('bounded status targets', () => {
  it('admits only the exact creative-tool roots', () => {
    const pairs = [['excalidraw', 'whiteboard'], ['svgedit', 'svg'], ['cyberchef', 'cyberchef'], ['image-scrubber', 'scrub']];
    for (const [id, host] of pairs) {
      expect(parseStatusServices(`${id}=https://${host}.utilibre.org/`, '10.10.1.43')).toHaveLength(1);
      expect(parseStatusServices(`${id}=https://${host}.utilibre.org/private`, '10.10.1.43')).toEqual([]);
    }
  });
  it('retains private HTTP checks and admits only the four exact HTTPS roots', () => {
    const entries = parseStatusServices('searxng=http://searxng:8080/healthz,redlib=http://10.10.1.43:3002/settings,zip-manager=https://zip.utilibre.org/,rawgraphs=https://charts.utilibre.org/,audiomass=https://audio.utilibre.org/,minipaint=https://paint.utilibre.org/', '10.10.1.43');
    expect(entries.map(({ id }) => id)).toEqual(['searxng', 'redlib', 'zip-manager', 'rawgraphs', 'audiomass', 'minipaint']);
    expect(entries.map(({ require2xx }) => require2xx)).toEqual([false, false, true, true, true, true]);
  });
  it('rejects public substitutions, credentials, paths, parameters and fragments', () => {
    const invalid = [
      'rawgraphs=https://evil.example/', 'searxng=https://charts.utilibre.org/',
      'rawgraphs=https://charts.utilibre.org.evil.example/',
      'rawgraphs=https://charts.utilibre.org/private', 'rawgraphs=https://charts.utilibre.org/?q=private',
      'rawgraphs=https://charts.utilibre.org/#private', 'rawgraphs=http://charts.utilibre.org/',
      'rawgraphs=https://user:pass@charts.utilibre.org/', 'rawgraphs=https://charts.utilibre.org:8443/',
      'redlib=http://user:pass@10.10.1.43:3002/', 'redlib=http://1.1.1.1/',
    ];
    expect(parseStatusServices(invalid.join(','), '10.10.1.43')).toEqual([]);
  });
});
