export const repairs = Object.freeze([
  { kind: 'postgis', package: 'postgresql-17-postgis-3', version: '3.6.0+dfsg-3.pgdg12+1+utilibre1', ids: ['CVE-2026-73515'] },
  { kind: 'gdal', package: 'libgdal32', version: '3.6.2+dfsg-1+utilibre1', ids: ['CVE-2026-49014', 'CVE-2026-8086', 'CVE-2026-8087'] },
]);
export function reviewedRepair(item) {
  if (item.scope !== 'runtime-image' || item.type !== 'debian' || item.status !== 'needs-review' || !Array.isArray(item.containers) || item.containers.length !== 1 || item.containers[0] !== 'utilibre-gathio-postgres-1') return null;
  return repairs.find(s => s.package === item.package && s.version === item.installed && s.ids.includes(item.id)) || null;
}
// The inherited image deliberately omits documentation and lintian metadata.
// Runtime payloads and copyright notices must never use this exception.
export function excludedDocumentation(path, pkg, dpkgConfig) {
  const lines = new Set(dpkgConfig.split('\n').map(line => line.trim()));
  return (path.startsWith('/usr/share/doc/' + pkg + '/') &&
    path.split('/').at(-1) !== 'copyright' &&
    lines.has('path-exclude /usr/share/doc/*') &&
    lines.has('path-include /usr/share/doc/*/copyright')) ||
    (path === '/usr/share/lintian/overrides/' + pkg &&
      lines.has('path-exclude /usr/share/lintian/overrides/*'));
}
