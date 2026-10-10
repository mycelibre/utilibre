import { describe, expect, it } from 'vitest';
import process from 'node:process';
import { parseStatusServices, mumbleStatusFromKuma } from '../../server/status-targets.mjs';

describe('bounded status targets', () => {
  it('checks native entry pages without admitting arbitrary probe paths', () => {
    for (const [id, host] of [['family-chess', 'chess'], ['donetick', 'chores'], ['beaverhabits', 'habits'], ['projects', 'projects'], ['trip', 'trip'], ['addy', 'aliases']]) {
      const root = `https://${host}.utilibre.org/${['beaverhabits', 'addy'].includes(id) ? 'login' : ''}`;
      expect(parseStatusServices(`${id}=${root}`, '10.10.1.43')).toMatchObject([{ id, require2xx: true }]);
      expect(parseStatusServices(`${id}=${root}private`, '10.10.1.43')).toEqual([]);
      expect(parseStatusServices(`${id}=https://evil.example/`, '10.10.1.43')).toEqual([]);
    }
  });
  it('uses Beaver’s login page instead of treating its normal root redirect as failure', () => {
    expect(parseStatusServices('beaverhabits=https://habits.utilibre.org/login', '10.10.1.43')).toMatchObject([{ id: 'beaverhabits', require2xx: true }]);
    for (const suffix of ['/', '/login?next=http://internal/', '/login/private', '/login#fragment']) {
      expect(parseStatusServices(`beaverhabits=https://habits.utilibre.org${suffix}`, '10.10.1.43')).toEqual([]);
    }
  });

  it('restricts Addy readiness to its exact login page without following redirects', () => {
    expect(parseStatusServices('addy=https://aliases.utilibre.org/login', '10.10.1.43')).toMatchObject([{ id: 'addy', require2xx: true }]);
    for (const target of ['https://aliases.utilibre.org/', 'https://aliases.utilibre.org/login?next=http://internal/', 'https://aliases.utilibre.org/login#fragment', 'https://user:pass@aliases.utilibre.org/login', 'http://aliases.utilibre.org/login']) {
      expect(parseStatusServices(`addy=${target}`, '10.10.1.43')).toEqual([]);
    }
  });

  it('checks each new static app only at its configured public entry page', () => {
    for (const id of ['kokoro-web', 'knit', 'newton', 'rustpad', 'autoredact', 'gravity', 'one-file-core', 'tiddlywiki', 'moocup']) {
      const root = `https://tools.utilibre.org/apps/${id}/`;
      expect(parseStatusServices(`${id}=${root}`, '10.10.1.43')).toMatchObject([{ id, require2xx: true }]);
      for (const target of [`${root}?url=http://internal/`, `${root}private`, 'https://evil.example/']) {
        expect(parseStatusServices(`${id}=${target}`, '10.10.1.43')).toEqual([]);
      }
    }
  });
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
  it('admits the four missing public roots only with their matching IDs and exact URLs', () => {
    for (const [id, host] of [['wbo', 'collab'], ['mapshaper', 'maps'], ['numbat', 'calc'], ['super-productivity', 'plan']]) {
      expect(parseStatusServices(`${id}=https://${host}.utilibre.org/`, '10.10.1.43')).toMatchObject([{ id, require2xx: true }]);
      for (const suffix of ['/other', '/?url=http://internal/', '/#fragment', ':8443/']) {
        expect(parseStatusServices(`${id}=https://${host}.utilibre.org${suffix}`, '10.10.1.43')).toEqual([]);
      }
      expect(parseStatusServices(`${id}=https://evil.example/`, '10.10.1.43')).toEqual([]);
    }
  });
  it('restricts Mumble to the configured native monitor API rather than a fake HTTP voice check', () => {
    expect(parseStatusServices('mumble=http://10.10.1.43:3125/api/status-page/heartbeat/utilibre', '10.10.1.43')).toHaveLength(1);
    for (const target of ['http://10.10.1.43:64738/', 'http://other:3125/api/status-page/heartbeat/utilibre', 'https://status.utilibre.org/api/status-page/heartbeat/utilibre', 'http://10.10.1.43:3125/api/status-page/heartbeat/utilibre?url=http://internal/']) {
      expect(parseStatusServices(`mumble=${target}`, '10.10.1.43')).toEqual([]);
    }
  });
});

describe('native Mumble monitor observation', () => {
  const now = Date.parse('2026-10-08T23:55:00.000Z');
  const page = { publicGroupList: [{ monitorList: [{ id: 38, name: 'Mumble · private TCP listener', type: 'port' }] }] };
  const heartbeat = (status = 1, time = '2026-10-08 23:50:00.000') => ({ heartbeatList: { 38: [{ status, time }] } });
  it('uses UTC despite the portal timezone and preserves the native observation time', () => {
    const prior = process.env.TZ;
    try {
      process.env.TZ = 'America/Guatemala';
      expect(mumbleStatusFromKuma(page, heartbeat(), now)).toEqual({ status: 'operational', check: 'tcp-listener', checkedAt: '2026-10-08T23:50:00.000Z' });
    } finally { if (prior === undefined) delete process.env.TZ; else process.env.TZ = prior; }
  });
  it('preserves failed, pending and maintenance observations', () => {
    for (const [status, expected] of [[0, 'unavailable'], [2, 'degraded'], [3, 'maintenance']]) {
      expect(mumbleStatusFromKuma(page, heartbeat(status), now).status).toBe(expected);
    }
  });
  it('never substitutes snapshot time for stale, future, malformed or absent heartbeat evidence', () => {
    for (const health of [undefined, {}, { heartbeatList: { 38: [] } }, heartbeat(1, '2026-10-08 23:44:59.999'), heartbeat(1, '2026-10-08 23:55:00.001'), heartbeat(1, '2026-02-30 23:50:00.000'), heartbeat(1, 'invalid'), heartbeat('1'), heartbeat(9)]) {
      expect(mumbleStatusFromKuma(page, health, now)).toEqual({ status: 'unknown', check: 'tcp-listener' });
    }
  });
  it('requires exactly one matching native TCP monitor and its own heartbeat', () => {
    const monitor = page.publicGroupList[0].monitorList[0];
    for (const metadata of [undefined, {}, { publicGroupList: [] }, ...[
      [{ ...monitor, name: 'Mumble' }], [{ ...monitor, type: 'http' }],
      [{ ...monitor, id: 39 }], [{ ...monitor, id: '38' }], [monitor, { ...monitor, id: 39 }],
    ].map(monitorList => ({ publicGroupList: [{ monitorList }] }))]) {
      expect(mumbleStatusFromKuma(metadata, heartbeat(), now)).toEqual({ status: 'unknown', check: 'tcp-listener' });
    }
  });
});
