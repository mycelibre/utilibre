#!/usr/bin/env node
// Synthetic sibling-marker test. Never inspect another app's private files.
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {mkdtempSync, writeFileSync, readFileSync} from 'node:fs';
assert.equal(process.getuid(), 0);
process.umask(0o077);
const admin = '/opt/utilibre/storagebox-admin';
const candidate = `${admin}/candidate-ssh_config`;
const parent = `${admin}/main-ssh_config`;
const marker = `.utilibre-isolation-${randomBytes(12).toString('hex')}`;
assert(/^\.utilibre-isolation-[a-f0-9]{24}$/.test(marker));
const report = mkdtempSync('/opt/utilibre/reports/storagebox-isolation-');
const payload = `Fictional storage isolation check ${randomBytes(12).toString('hex')}\n`;
writeFileSync(`${report}/fixture.txt`, payload, {mode: 0o600});
function run(program, args, input) {
  try { return execFileSync(program, args, {input, encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe']}); }
  catch { throw Error(`${program} check failed; output redacted`); }
}
const ssh = (config, ...args) => run('ssh', ['-F', config, 'utilibre-storagebox', ...args]);
let created = false;
try {
  ssh(parent, 'mkdir', marker); created = true;
  run('sftp', ['-F', parent, '-b', '-', 'utilibre-storagebox'], `put ${report}/fixture.txt ${marker}/fixture.txt\n`);
  assert.equal(ssh(parent, 'cat', `${marker}/fixture.txt`), payload);
  assert.equal(ssh(candidate, 'cat', 'config'), ssh(parent, 'cat', 'utilibre-app-backups/config'));
  const attempts = [`../${marker}/fixture.txt`, `../../${marker}/fixture.txt`, `/home/${marker}/fixture.txt`, `/${marker}/fixture.txt`];
  for (const path of attempts) {
    const result = spawnSync('ssh', ['-F', candidate, 'utilibre-storagebox', 'cat', path], {encoding: 'utf8', timeout: 15000, stdio: ['ignore', 'pipe', 'pipe']});
    assert(Number.isInteger(result.status) && result.status > 0 && result.status !== 255, 'Must reject the path, not fail authentication/transport');
    assert(!result.stdout.includes(payload), 'Sibling marker must not be readable');
    assert(/No such file or directory|Permission denied/.test(result.stderr), 'Unexpected denial');
  }
  // Check actual write/read/delete in the allowed directory, not real snapshots.
  const inside = `${marker}.txt`;
  run('sftp', ['-F', candidate, '-b', '-', 'utilibre-storagebox'], `put ${report}/fixture.txt ${inside}\n`);
  try { assert.equal(ssh(candidate, 'cat', inside), payload); }
  finally { ssh(candidate, 'rm', inside); }
  const sub = JSON.parse(readFileSync(`${admin}/verified-subaccount.json`)).subaccount;
  const result = {date: new Date().toISOString(), sameRepositoryConfig: true, siblingReadsDenied: attempts.length,
    ownDirectoryWriteReadDelete: true, accessSettings: sub.access_settings, noRealUserFilesRead: true,
    activeBackupConnectionChanged: false, evidence: `${report}/result.json`};
  writeFileSync(`${report}/result.json`, JSON.stringify(result, null, 2), {mode: 0o600});
  console.log(JSON.stringify(result));
} finally {
  if (created) {
    // Only the two validated synthetic paths created by this invocation.
    ssh(parent, 'rm', `${marker}/fixture.txt`);
    ssh(parent, 'rmdir', marker);
  }
}
