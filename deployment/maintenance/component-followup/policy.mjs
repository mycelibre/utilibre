// Narrow binary-component attribution. This is not a source-package waiver.
// Changes to a package version or inventory require another explicit review.
import {createHash} from 'node:crypto';

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const advisorySources = {
  'CVE-2026-49014': 'https://github.com/OSGeo/gdal/commit/c49254dc6380af2f02ff43ca79e3cf7c1bc82f01',
  'CVE-2026-8086': 'https://github.com/OSGeo/gdal/commit/9491e794f1757f08063ea2f7a274ad2994afa636',
  'CVE-2026-8087': 'https://github.com/OSGeo/gdal/commit/184f77dbcc74118c062c05e464c88161d3c37b9b',
  'CVE-2026-107815': 'https://github.com/MariaDB/server/commit/b369925f6855d3e1f0ebcf453492724b99fda6f8',
  'CVE-2026-107818': 'https://github.com/MariaDB/server/commit/e3d62d4e78fd4941cef3f5053e6a50d0b32d740e',
  'CVE-2026-107823': 'https://github.com/MariaDB/server/commit/8a642bc8103aadc6b2087d781ba8e1595616a2c4',
  'CVE-2026-73515': 'https://github.com/postgis/postgis/commit/53e273faeb440176eee83f76319b48afb0b86834',
  'CVE-2026-15816': 'https://github.com/dracut-ng/dracut/commit/c4d555716d569038ca38365741e94ee07908f261',
  'CVE-2026-16445': 'https://bugzilla.redhat.com/show_bug.cgi?id=2459963',
  'CVE-2026-6893': 'https://github.com/dracut-ng/dracut/pull/2469',
  'CVE-2026-69249': 'https://github.com/pyca/cryptography/security/advisories/GHSA-jwv3-5hgf-82ww',
};

const gdalIds = ['CVE-2026-49014', 'CVE-2026-8086', 'CVE-2026-8087'];
const mariaIds = ['CVE-2026-107815', 'CVE-2026-107818', 'CVE-2026-107823'];
const dracutIds = ['CVE-2026-15816', 'CVE-2026-16445', 'CVE-2026-6893'];
export function componentPolicy(item, records) {
  if (!Array.isArray(records) || records.length < 2 || records.some(r =>
    !r || !['directory', 'regular', 'symlink', 'missing'].includes(r.type) || !r.path?.startsWith('/') ||
    (r.type === 'missing' && !/^\/usr\/share\/(?:doc|lintian)\//.test(r.path)) ||
    r.path.includes('\n') || (r.type === 'regular' && !/^[a-f0-9]{64}$/.test(r.sha256)))) return null;
  const files = records.filter(r => r.type !== 'directory');
  const noNative = files.every(r => r.type !== 'regular' || r.magic !== '7f454c46');
  const docs = path => /^\/usr\/share\/(?:doc|lintian)\//.test(path);
  if (gdalIds.includes(item.id) && item.installed === '3.13.2+dfsg-1.pgdg12+1') {
    if (item.package === 'gdal-data' && noNative && files.length > 100 && files.every(r => docs(r.path) || r.path.startsWith('/usr/share/gdal/')))
      return 'GDAL netCDF/HDF4 C/C++ decoder, not its installed reference-data files; libgdal32 remains a separate unresolved finding';
    if (item.package === 'gdal-plugins' && noNative && files.some(r => r.path === '/usr/lib/x86_64-linux-gnu/gdalplugins/drivers.ini') &&
      files.every(r => docs(r.path) || r.path === '/usr/lib/x86_64-linux-gnu/gdalplugins/drivers.ini'))
      return 'GDAL netCDF/HDF4 C/C++ decoder; this exact plugins package has only drivers.ini and documentation, not any native plugin';
  }
  if (mariaIds.includes(item.id) && item.installed === '1:10.11.18-0+deb12u1') {
    if (item.package === 'mariadb-common' && noNative && files.every(r => docs(r.path) || r.path === '/etc/mysql/mariadb.cnf'))
      return 'MariaDB CONNECT engine / server service unit / SQL view parser, not the configuration-only mariadb-common package';
    if (item.package === 'libmariadb3' && files.some(r => r.path === '/usr/lib/x86_64-linux-gnu/libmariadb.so.3') && files.every(r => docs(r.path) ||
      /^\/usr\/lib\/x86_64-linux-gnu\/(?:libmariadb\.so\.3|libmariadb3\/plugin\/(?:caching_sha2_password|client_ed25519|dialog|mysql_clear_password|sha256_password)\.so)$/.test(r.path)))
      return 'MariaDB CONNECT engine / server service unit / SQL view parser, not the Connector/C client library and its reviewed authentication plugins';
  }
  if (item.id === 'CVE-2026-73515' && item.package === 'postgresql-17-postgis-3-scripts' && item.installed === '3.6.0+dfsg-3.pgdg12+1' && noNative &&
    files.length > 100 && files.every(r => docs(r.path) || /^\/usr\/share\/postgresql\/17\/(?:extension\/(?:postgis|address_standardizer)[^/]*\.(?:sql|control)|contrib\/postgis-3\.6\/[^/]+\.sql)$/.test(r.path)))
    return 'PostGIS native FlatGeobuf property decoder, not SQL extension definitions; the installed postgresql-17-postgis-3 native library remains unresolved';
  if (dracutIds.includes(item.id) && item.package === 'dracut-install' && item.installed === '106-6' &&
    files.some(r => r.path === '/usr/lib/dracut/dracut-install' && r.magic === '7f454c46') &&
    files.every(r => docs(r.path) || r.path === '/usr/lib/dracut/dracut-install'))
    return 'dracut initramfs emergency/DHCP shell modules, not the separately compiled dracut-install C file-copy helper';
  if (item.id === 'CVE-2026-69249' && item.package === 'python3-cryptography' && item.installed === '38.0.4-3+deb12u1' &&
    files.length > 80 && !records.some(r => /verification/i.test(r.path)) &&
    files.some(r => /\/cryptography\/hazmat\/bindings\/_rust\.abi3\.so$/.test(r.path)))
    return 'the Rust X.509 verification API introduced in cryptography 42.0.0; the verified 38.0.4 package predates this component (not an exemption for other cryptography CVEs)';
  return null;
}

export function exactInventory(item, records, reviewed) {
  const component = componentPolicy(item, records);
  if (!component || !reviewed || reviewed.package !== item.package || reviewed.installed !== item.installed ||
    reviewed.inventorySha256 !== sha256(JSON.stringify(records))) return null;
  return component;
}
