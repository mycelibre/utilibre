import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import test from 'node:test';

test('pre-Docker firewall parses IPv4 without an interactive Node environment', () => {
  const source = fs.readFileSync(new URL('./firewall.sh', import.meta.url), 'utf8');
  const command = source.match(/^public_ip=\$\((.+)\)$/m)?.[1];
  assert(command?.startsWith('/usr/bin/python3 '));
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'utilibre-turn-parser-'));
  const file = path.join(directory, 'settings.json');
  try {
    for (const [value, accepted] of [['203.0.113.8', true], ['::1', false], ['example.org', false], ['127.0.0.1; id', false], ['010.0.0.1', false], [null, false]]) {
      fs.writeFileSync(file, JSON.stringify({publicIp: value}));
      const result = cp.spawnSync('/bin/sh', ['-c', command.replace('"/opt/utilibre/turn/settings.json"', JSON.stringify(file))], {
        encoding: 'utf8', timeout: 2000, env: {PATH: '/usr/bin:/bin'},
      });
      assert.equal(result.status === 0, accepted);
      if (accepted) assert.equal(result.stdout.trim(), value);
    }
    fs.writeFileSync(file, '{');
    assert.notEqual(cp.spawnSync('/bin/sh', ['-c', command.replace('"/opt/utilibre/turn/settings.json"', JSON.stringify(file))], {timeout: 2000, env: {PATH: '/usr/bin:/bin'}}).status, 0);
  } finally {
    fs.rmSync(directory, {recursive: true});
  }
});
