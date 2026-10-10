// Native Restic policy approved by the owner on 10 October 2026.
// Group by host/tags, NOT changing timestamped source paths. Other groups stay intact.
export const retentionArgs = Object.freeze([
  'forget', '--json', '--host', 'utilibre-vm', '--tag', 'native-app-snapshots',
  '--group-by', 'host,tags', '--keep-daily', '7', '--keep-weekly', '4',
]);

export function validatePlan(raw, protectedSnapshot) {
  const groups = JSON.parse(raw);
  if (!Array.isArray(groups) || groups.length !== 1) throw Error('Unexpected retention groups');
  const group = groups[0];
  const scoped = value => value.hostname === 'utilibre-vm' &&
    Array.isArray(value.tags) && value.tags.length === 1 && value.tags[0] === 'native-app-snapshots';
  if (!scoped({ ...group, hostname: group.host }) || !Array.isArray(group.keep) || !group.keep.length ||
      (group.remove != null && !Array.isArray(group.remove))) throw Error('Unsafe retention scope');
  const keep = group.keep, remove = group.remove || [];
  const seen = new Set();
  for (const snapshot of [...keep, ...remove]) {
    if (!scoped(snapshot) || !/^[a-f0-9]{64}$/.test(snapshot.id) || seen.has(snapshot.id))
      throw Error('Unsafe retention snapshot');
    seen.add(snapshot.id);
  }
  if (!/^[a-f0-9]{8,64}$/.test(protectedSnapshot || '') ||
      !keep.some(snapshot => snapshot.id.startsWith(protectedSnapshot)))
    throw Error('Fresh backup not protected by retention');
  return { keep: keep.map(s => s.id), remove: remove.map(s => s.id) };
}

export function applyRetention(run, protectedSnapshot) {
  const preview = validatePlan(run([...retentionArgs, '--dry-run']), protectedSnapshot);
  // Reapply the exact same native policy after the preview, only following a successful backup/check.
  const applied = validatePlan(run(retentionArgs), protectedSnapshot);
  if (JSON.stringify(applied) !== JSON.stringify(preview)) throw Error('Retention changed since preview');
  // Always retry physical cleanup, including leftovers from an interrupted earlier prune.
  // Cap repacking work; referenced data in all remaining snapshot groups stays protected.
  run(['prune', '--quiet', '--max-repack-size', '256M', '--max-unused', '5%']);
  run(['check', '--quiet']);
  return { policy: '7 daily + 4 weekly; host/tags grouped', kept: applied.keep.length,
    removed: applied.remove, metadataChecked: true };
}
