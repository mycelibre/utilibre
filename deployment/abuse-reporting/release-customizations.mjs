// Finite release of the three reviewed native reporting customizations.
// Uses the existing exclusive release lock and scoped rollback lifecycle.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { createHash } from 'node:crypto';
import { acquireReleaseLock } from '../maintenance/security-20261103/release-lock.mjs';
import { existingComposeArgs, checkExistingGroup, recreateExistingGroup, releaseGroup } from '../maintenance/language-final/release.mjs';
import { checkPublished } from './check-customizations.mjs';

process.umask(0o077);
assert.equal(process.argv[2], '--apply');
const keys = process.argv.slice(3);
assert(keys.length && new Set(keys).size === keys.length && keys.every(k => ['cryptpad', 'gathio', 'rallly'].includes(k)));
const unlock = acquireReleaseLock('/var/lib/utilibre-maintenance/package-release.lock');
process.once('exit', unlock);
const repo = path.resolve(new URL('../..', import.meta.url).pathname);
const evidence = '/var/lib/utilibre-maintenance/security-20261109/abuse-reporting';
const staging = '/tmp/utilibre-abuse-candidates-20261109-final';
const hooksStaging = evidence + '/native-hooks';
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const hooks = read(new URL('native-hooks.json', import.meta.url));
const inputs = read(new URL('inputs.json', import.meta.url));
const names = {cryptpad:'utilibre-pack-cryptpad-cryptpad-1', gathio:'utilibre-gathio-gathio-1', rallly:'utilibre-community-rallly-1'};
const origins = {cryptpad:'https://pad.utilibre.org', gathio:'https://events.utilibre.org', rallly:'https://poll.utilibre.org'};
const command = (exe, args, input) => cp.execFileSync(exe, args, {encoding:'utf8', input, timeout:180000, maxBuffer:16*1024**2, stdio:['pipe','pipe','pipe']});
const docker = (...args) => command('docker', args);
const inspect = name => JSON.parse(docker('inspect', name))[0];
const file = evidence + '/customization-release.json';
const report = fs.existsSync(file) ? read(file) : {status:'partial', groups:[]};
const save = () => {
  report.status = ['cryptpad','gathio','rallly'].every(key => report.groups.some(g => g.key === key && g.status === 'passed')) ? 'passed' : 'partial';
  report.updatedAt = new Date().toISOString(); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
};
function atomicReplace(file, bytes) {
  const stat = fs.statSync(file), temporary = file + '.utilibre-report-' + process.pid;
  const fd = fs.openSync(temporary, 'wx', stat.mode & 0o777);
  try { fs.writeFileSync(fd, bytes); fs.fchmodSync(fd, stat.mode & 0o777); fs.fchownSync(fd, stat.uid, stat.gid); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(temporary, file);
}
function sql(query) {
  return command('docker', ['exec','-i',hooks.rallly.container,'psql','-X','-qAt','-v','ON_ERROR_STOP=1','-U','rallly','-d','rallly'], query);
}
function settings() {
  return JSON.parse(sql("SELECT json_build_object('footer_links', footer_links, 'updated_at', updated_at, 'otherSettingsMd5', md5((to_jsonb(s)-'footer_links'-'updated_at')::text)) FROM instance_settings s WHERE id=1;"));
}
function changeFooter(expected, replacement, restHash, timestamp) {
  const tag = '$utilibre_report_value$';
  const old = JSON.stringify(expected), next = JSON.stringify(replacement);
  assert(!old.includes(tag) && !next.includes(tag) && /^[a-f0-9]{32}$/.test(restHash));
  const time = timestamp ? "'" + timestamp.replaceAll("'", "''") + "'::timestamptz" : 'now()';
  sql(`BEGIN;
DO $guard$
DECLARE current_row jsonb;
BEGIN
 SELECT to_jsonb(s) INTO current_row FROM instance_settings s WHERE id=1 FOR UPDATE;
 IF current_row->'footer_links' IS DISTINCT FROM ${tag}${old}${tag}::jsonb
 OR md5((current_row-'footer_links'-'updated_at')::text) IS DISTINCT FROM '${restHash}' THEN
  RAISE EXCEPTION 'Instance settings changed; no report setting updated';
 END IF;
 UPDATE instance_settings SET footer_links=${tag}${next}${tag}::jsonb, updated_at=${time} WHERE id=1;
END;
$guard$;
COMMIT;`);
}

for (const key of keys) {
  const previous = report.groups.find(g => g.key === key && g.status === 'passed');
  if (previous) { await checkExistingGroup(previous, 'new'); await checkPublished(key, previous.evidence); continue; }
  const failed = report.groups.find(g => g.key === key);
  if (failed) { assert.equal(failed.rollback, 'verified'); (report.previousAttempts ??= []).push(failed); report.groups = report.groups.filter(g => g !== failed); }
  const current = inspect(names[key]), labels = current.Config.Labels;
  const out = `${evidence}/${key}-release-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  fs.mkdirSync(out, {mode:0o700});
  const group = {key, project:labels['com.docker.compose.project'], cwd:labels['com.docker.compose.project.working_dir'], files:labels['com.docker.compose.project.config_files'].split(','), before:[], evidence:out,
    rows:[{name:names[key], service:labels['com.docker.compose.service'], oldImage:current.Image, newImage:current.Image, oldContainerId:current.Id, oldRestartCount:current.RestartCount}]};
  const configHash = () => sha(docker(...existingComposeArgs(group), 'config', '--format', 'json'));
  const originalConfigHash = configHash();
  const siblings = JSON.parse(docker('inspect', ...docker('ps','-q').trim().split(/\s+/)))
    .filter(c => c.Config.Labels?.['com.docker.compose.project'] === group.project && c.Name !== current.Name)
    .map(c => ({name:c.Name.slice(1), id:c.Id}));
  const replacements = [];
  let rowBefore;
  if (key === 'cryptpad') {
    const preview = read(evidence + '/cryptpad-preview.json');
    assert(preview.results.length === 2 && preview.results.every(r => r.footerReportLinks === 2 && r.aboutReportLinks === 2 && r.browserErrors.length === 0 && r.writes.length === 0));
    for (const approved of inputs.services.find(s => s.service === key).files) {
      const mount = current.Mounts.find(m => approved.target.startsWith(m.Destination + '/'));
      assert(mount && mount.Source === '/opt/utilibre/src/cryptpad' && mount.Destination === '/cryptpad');
      const source = mount.Source + approved.target.slice(mount.Destination.length), bytes = fs.readFileSync(source);
      assert([approved.beforeSha256, approved.afterSha256].includes(sha(bytes)), 'Unknown CryptPad source');
      const candidate = fs.readFileSync(`${staging}/cryptpad/${approved.file}`);
      assert.equal(sha(candidate), approved.afterSha256);
      replacements.push({source, before:bytes, after:candidate, target:approved.target});
    }
    group.publicConfigBeforeSha256 = sha(await (await fetch(origins[key] + '/api/config', {signal:AbortSignal.timeout(15000)})).text());
  } else if (key === 'gathio') {
    const source = path.join(repo, hooks.gathio.source), bytes = fs.readFileSync(source);
    assert([hooks.gathio.beforeSha256, hooks.gathio.afterSha256].includes(sha(bytes)), 'Unknown Gathio configuration');
    assert(current.Mounts.some(m => m.Source === source && m.Destination === '/srv/gathio/config/config.toml'));
    const candidate = fs.readFileSync(hooksStaging + '/gathio-config.toml'); assert.equal(sha(candidate), hooks.gathio.afterSha256);
    replacements.push({source, before:bytes, after:candidate, target:'/srv/gathio/config/config.toml'});
  } else {
    rowBefore = settings();
    assert.deepEqual(rowBefore.footer_links, hooks.rallly.before);
    fs.writeFileSync(out + '/footer-before.json', JSON.stringify(rowBefore, null, 2) + '\n');
  }
  group.changedFiles = replacements.map((replacement, index) => {
    const backup = `${out}/before-${index}-${path.basename(replacement.source)}`;
    fs.writeFileSync(backup, replacement.before, {mode:0o600});
    return {source:replacement.source, target:replacement.target, backup, beforeSha256:sha(replacement.before), afterSha256:sha(replacement.after)};
  });
  const diagnosed = async (phase, action) => {
    try { return await action(); }
    catch (error) { fs.writeFileSync(out + '/' + phase + '-error.txt', String(error.stack) + '\n'); throw error; }
  };
  report.groups.push(group); save();
  await releaseGroup(group, {
    save,
    preflight:async () => {
      assert.equal(inspect(names[key]).Image, current.Image); assert.equal(configHash(), originalConfigHash);
      for (const r of replacements) assert.equal(sha(fs.readFileSync(r.source)), sha(r.before));
      if (key === 'rallly') assert.deepEqual(settings(), rowBefore);
    },
    recreate:async () => diagnosed('activate', async () => {
      if (!group.rollback) {
        for (const r of replacements) atomicReplace(r.source, r.after);
        if (key === 'rallly') {
          changeFooter(hooks.rallly.before, hooks.rallly.after, rowBefore.otherSettingsMd5);
          const html = await (await fetch(origins[key] + '/', {signal:AbortSignal.timeout(15000)})).text();
          if (html.includes('https://utilibre.org/en/abuse') && current.RestartCount === 0) { group.restartRequired = false; return; }
        }
      }
      group.restartRequired = true; await recreateExistingGroup(group);
    }),
    gate:async version => diagnosed('gate-' + version, async () => {
      await checkExistingGroup(group, version); assert.equal(configHash(), originalConfigHash);
      for (const sibling of siblings) assert.equal(inspect(sibling.name).Id, sibling.id, 'Unrelated project container changed');
      for (const r of replacements) {
        const expected = version === 'new' ? r.after : r.before;
        assert.equal(sha(fs.readFileSync(r.source)), sha(expected));
        assert.equal(sha(docker('exec', names[key], 'cat', r.target)), sha(expected));
      }
      if (key === 'rallly') {
        const after = settings();
        assert.deepEqual(after.footer_links, version === 'new' ? hooks.rallly.after : rowBefore.footer_links);
        assert.equal(after.otherSettingsMd5, rowBefore.otherSettingsMd5);
        fs.writeFileSync(out + '/footer-' + version + '.json', JSON.stringify(after, null, 2) + '\n');
        group.otherSettingsUnchanged = true;
      }
      if (version === 'new') {
        await checkPublished(key, out);
        if (key === 'cryptpad') {
          group.publicConfigAfterSha256 = sha(await (await fetch(origins[key] + '/api/config', {signal:AbortSignal.timeout(15000)})).text());
          assert.notEqual(group.publicConfigAfterSha256, group.publicConfigBeforeSha256, 'CryptPad fresh asset version did not change');
        }
      } else {
        const response = await fetch(origins[key] + '/', {signal:AbortSignal.timeout(15000)}); assert.equal(response.status, 200); await response.body.cancel();
      }
      group.runtimeConfigurationUnchanged = true; group.otherProjectContainersUnchanged = true;
    }),
    rollbackPins:async () => {
      for (const r of replacements) {
        assert([sha(r.before), sha(r.after)].includes(sha(fs.readFileSync(r.source))), 'Concurrent source change; refuse overwrite');
        atomicReplace(r.source, r.before);
      }
      if (key === 'rallly') {
        const currentSettings = settings();
        assert.equal(currentSettings.otherSettingsMd5, rowBefore.otherSettingsMd5, 'Concurrent unrelated setting change');
        if (JSON.stringify(currentSettings.footer_links) !== JSON.stringify(rowBefore.footer_links)) {
          assert.deepEqual(currentSettings.footer_links, hooks.rallly.after, 'Concurrent footer change');
          changeFooter(hooks.rallly.after, rowBefore.footer_links, rowBefore.otherSettingsMd5, rowBefore.updated_at);
        }
      }
    },
  });
  group.completedAt = new Date().toISOString(); save(); console.log(key + ': reviewed customization live; read-only native browser verification passed.');
}
