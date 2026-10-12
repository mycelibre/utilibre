import assert from 'node:assert/strict';
import test from 'node:test';
import {componentPolicy, exactInventory, sha256} from './policy.mjs';

const dir = path => ({type: 'directory', path});
const file = (path, magic = '23232323') => ({type: 'regular', path, magic, sha256: 'a'.repeat(64)});
const base = [dir('/.'), dir('/usr')];
test('GDAL plugins must contain only the reviewed data payload, never a decoder', () => {
  const item = {id: 'CVE-2026-8087', package: 'gdal-plugins', installed: '3.13.2+dfsg-1.pgdg12+1'};
  const records = [...base, file('/usr/lib/x86_64-linux-gnu/gdalplugins/drivers.ini')];
  assert(componentPolicy(item, records));
  for (const path of ['/usr/lib/x86_64-linux-gnu/gdalplugins/gdal_HDF4.so', '/usr/lib/libgdal.so.32'])
    assert.equal(componentPolicy(item, [...records, file(path, '7f454c46')]), null);
  assert.equal(componentPolicy({...item, package: 'libgdal32'}, records), null);
  assert.equal(componentPolicy(item, [...records, file('/usr/share/doc/gdal-plugins/native', '7f454c46')]), null);
});
test('MariaDB server/CONNECT plugins or service units cannot qualify as client-only', () => {
  const item = {id: 'CVE-2026-107815', package: 'libmariadb3', installed: '1:10.11.18-0+deb12u1'};
  const records = [...base, file('/usr/lib/x86_64-linux-gnu/libmariadb.so.3', '7f454c46')];
  for (const id of ['CVE-2026-107815', 'CVE-2026-107818', 'CVE-2026-107823']) assert(componentPolicy({...item, id}, records));
  for (const path of ['/usr/lib/mysql/plugin/ha_connect.so', '/usr/sbin/mariadbd', '/usr/lib/systemd/system/mariadb.service'])
    assert.equal(componentPolicy(item, [...records, file(path)]), null);
  assert.equal(componentPolicy({...item, package: 'mariadb-server'}, records), null);
});
test('PostGIS review never exempts its actual vulnerable native package', () => {
  const item = {id: 'CVE-2026-73515', package: 'postgresql-17-postgis-3-scripts', installed: '3.6.0+dfsg-3.pgdg12+1'};
  const records = [...base, ...Array.from({length: 101}, (_, i) => file(`/usr/share/postgresql/17/extension/postgis--${i}.sql`))];
  assert(componentPolicy(item, records));
  assert.equal(componentPolicy({...item, package: 'postgresql-17-postgis-3'}, records), null);
  assert.equal(componentPolicy(item, [...records, file('/usr/lib/postgresql/17/lib/postgis-3.so', '7f454c46')]), null);
});
test('dracut shell modules never qualify as the native copy helper', () => {
  const item = {id: 'CVE-2026-6893', package: 'dracut-install', installed: '106-6'};
  const records = [...base, file('/usr/lib/dracut/dracut-install', '7f454c46')];
  assert(componentPolicy(item, records));
  for (const path of ['/usr/lib/dracut/modules.d/80base/dracut-lib.sh', '/usr/lib/dracut/modules.d/35network-legacy/dhclient-script.sh'])
    assert.equal(componentPolicy(item, [...records, file(path)]), null);
  assert.equal(componentPolicy({...item, package: 'dracut-core'}, records), null);
});
test('cryptography excludes exactly the absent new verification component, not older cryptography bugs', () => {
  const item = {id: 'CVE-2026-69249', package: 'python3-cryptography', installed: '38.0.4-3+deb12u1'};
  const records = [...base, file('/usr/lib/python3/dist-packages/cryptography/hazmat/bindings/_rust.abi3.so', '7f454c46'),
    ...Array.from({length: 81}, (_, i) => file(`/usr/lib/python3/dist-packages/cryptography/example${i}.py`))];
  assert(componentPolicy(item, records));
  assert.equal(componentPolicy({...item, installed: '43.0.0-3+deb13u1'}, records), null);
  assert.equal(componentPolicy({...item, id: 'CVE-2023-50782'}, records), null);
  assert.equal(componentPolicy(item, [...records, file('/usr/lib/python3/dist-packages/cryptography/x509/verification.py')]), null);
});
test('exact content/type/link fingerprint changes require renewed review', () => {
  const item = {id: 'CVE-2026-6893', package: 'dracut-install', installed: '106-6'};
  const records = [...base, file('/usr/lib/dracut/dracut-install', '7f454c46')];
  const spec = {package: item.package, installed: item.installed, inventorySha256: sha256(JSON.stringify(records))};
  assert(exactInventory(item, records, spec));
  assert.equal(exactInventory(item, [...records, file('/usr/share/doc/dracut-install/copyright')], spec), null);
  assert.equal(exactInventory(item, records, {...spec, installed: '106-7'}), null);
});
test('missing non-documentation payload, unknown advisories, malformed evidence fail closed', () => {
  const item = {id: 'CVE-2026-107815', package: 'mariadb-common', installed: '1:10.11.18-0+deb12u1'};
  const records = [...base, file('/etc/mysql/mariadb.cnf')];
  assert(componentPolicy(item, records));
  assert.equal(componentPolicy({...item, id: 'CVE-2026-99999'}, records), null);
  assert.equal(componentPolicy(item, [...base, {type: 'missing', path: '/etc/mysql/mariadb.cnf'}]), null);
  for (const bad of [null, [], [{type: 'regular', path: 'relative'}], [{type: 'unknown', path: '/usr'}]]) assert.equal(componentPolicy(item, bad), null);
});
