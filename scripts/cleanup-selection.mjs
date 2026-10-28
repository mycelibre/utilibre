// Pure selection rules shared by the existing operator-only cleanup commands.
export function oldEnough(value, hours) {
  const match = /^(\d+) (hours?|days?|weeks?|months?) ago$/.exec(value || '');
  if (!match) return false;
  const unit = match[2].replace(/s$/, '');
  return Number(match[1]) * { hour: 1, day: 24, week: 168, month: 672 }[unit] >= hours;
}

export function retirableDangling(image, protectedIds, now = Date.now()) {
  return /^sha256:[a-f0-9]{64}$/.test(image.Id || '') && !protectedIds.has(image.Id) &&
    (image.RepoTags === null || Array.isArray(image.RepoTags) && !image.RepoTags.length) &&
    (image.RepoDigests === null || Array.isArray(image.RepoDigests) && !image.RepoDigests.length) &&
    now - Date.parse(image.Created) > 7 * 86400000;
}

export function disposableCache(row, olderBuilds, sizeBytes) {
  return row.Reclaimable === true && oldEnough(row.LastUsedAt, olderBuilds ? 168 : 12) &&
    (olderBuilds ? ['regular', 'source.local'].includes(row.Type) :
      row.Shared === false && row.Type === 'regular' && sizeBytes >= 50 * 1024 ** 2);
}
