import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {assertCurrentGoRelease} from './superseded-go.mjs';
const rules = JSON.parse(fs.readFileSync(new URL('./superseded-go.json', import.meta.url)));
for (const rule of rules.releaseEntries) {
  for (const profile of rule.profiles || ['']) {
    test(`${rule.entry}/${profile}: all superseded selections fail closed`, () => {
      for (const app of rule.applications) {
        assert.throws(() => assertCurrentGoRelease(rule.entry, [app], profile), /Superseded Go release blocked/);
        assert.throws(() => assertCurrentGoRelease(rule.entry, ['unrelated', app], profile), /Superseded Go release blocked/);
      }
      assert.doesNotThrow(() => assertCurrentGoRelease(rule.entry, ['unrelated'], profile));
    });
  }
}
test('current xnet activation still relies on its own unchanged approval gates', () => {
  for (const profile of ['xnet','xnet-caddy','vendor-debian','oauth','symfony']) {
    assert.doesNotThrow(() => assertCurrentGoRelease('package-release', ['rimgo','ferretdb'], profile));
  }
});
const invocations = [
  ['go-final/release.mjs', []],
  ['go-final/release.mjs', ['--oct28']],
  ['go-leaf-final/release.mjs', ['mezzo']],
  ['go-leaf-final/release.mjs', ['--batch=security-20261024','vikunja']],
  ['closure-review/release.mjs', ['anubis']],
  ['closure-review/release.mjs', ['ferretdb']],
  ['security-20261028/release-brotli.mjs', ['--codec','rimgo']],
  ['security-20261028/release-brotli.mjs', ['--codec','ferretdb']],
  ['security-20261028/release-brotli.mjs', ['--jose-leaf','wakapi']],
  ['security-20261028/release-brotli.mjs', ['--jose','ntfy']],
  ['security-20261028/release-brotli.mjs', ['--go-services','donetick']],
  ['security-20261028/release-brotli.mjs', ['--go-helpers','ntfy']],
];
for (const [file, args] of invocations) {
  for (const mode of ['prepare','apply']) {
    test(`actual CLI ${file} ${mode} ${args.join(' ')} stops before Docker`, () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'utilibre-retired-cli-'));
      try {
        const sentinel = path.join(dir, 'called');
        fs.writeFileSync(path.join(dir, 'docker'), '#!/bin/sh\n: > "$UTILIBRE_FORBIDDEN_CALL"\nexit 85\n', {mode:0o700});
        const run = cp.spawnSync(process.execPath, [new URL('../'+file, import.meta.url).pathname, mode, ...args], {
          cwd: new URL('../../../', import.meta.url), timeout:10000, encoding:'utf8', maxBuffer:65536,
          env:{PATH:dir+':/usr/bin:/bin', LANG:'C.UTF-8', UTILIBRE_FORBIDDEN_CALL:sentinel},
        });
        assert(!run.error, run.error?.message);
        assert.notEqual(run.status, 0);
        assert.match(run.stderr, /Superseded Go release blocked/);
        assert(!fs.existsSync(sentinel), 'A retired activation reached Docker');
      } finally { fs.rmSync(dir, {recursive:true, force:true}); }
    });
  }
}
