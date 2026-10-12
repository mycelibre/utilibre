// Prepare exact, expiring review decisions; never change the scanner or ledger.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {inventory, command} from './inventory.mjs';
import {exactInventory, advisorySources, sha256} from './policy.mjs';
import {validateDecision} from '../triage.mjs';

const root = '/var/lib/utilibre-maintenance';
const output = root + '/component-followup-20261012';
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const reviewed = read(new URL('./reviewed-inventories.json', import.meta.url));

export function run() {
  process.umask(0o077);
  fs.mkdirSync(output, {recursive: true, mode: 0o700});
  const scan = read(root + '/security.json');
  const queue = read(root + '/security-queue.json');
  assert.equal(scan.status, 'checked');
  assert.equal(queue.scanDate, scan.completedAt);
  assert(Date.now() - Date.parse(scan.completedAt) < 86400000, 'Fresh completed scan required');
  const decisions = [], evidence = [], skipped = [], cache = new Map();
  for (const item of queue.items) {
    if (item.status !== 'needs-review' || !['host-os', 'runtime-image'].includes(item.scope) || item.type !== 'debian') continue;
    const spec = reviewed.find(s => s.package === item.package && s.installed === item.installed && s.ids.includes(item.id));
    if (!spec) continue;
    const cacheKey = [item.scope, item.artifact, item.package, item.installed].join('|');
    if (!cache.has(cacheKey)) {
      try {
        let container;
        if (item.scope === 'runtime-image') {
          assert.equal(scan.images.find(i => i.id === item.artifact)?.status, 'checked');
          [container] = item.containers;
          assert(container);
          assert.equal(command('docker', ['inspect', '--format', '{{.Image}}', container]), item.artifact);
        } else assert.equal(scan.host.status, 'checked');
        const result = inventory(item.package, container);
        assert.equal(result.installed, item.installed);
        assert(exactInventory(item, result.records, spec), 'Reviewed inventory or component changed');
        if (container) assert.equal(command('docker', ['inspect', '--format', '{{.Image}}', container]), item.artifact, 'Live deployment changed during inventory');
        const runtime = {};
        if (item.package === 'dracut-install') {
          assert.equal(item.scope, 'host-os');
          assert(!fs.existsSync('/usr/lib/dracut/modules.d'), 'Unexpected dracut boot modules');
          runtime.initramfsTools = command('dpkg-query', ['-W', '-f=${db:Status-Status} ${Version}', 'initramfs-tools']);
          assert(runtime.initramfsTools.startsWith('installed '));
          runtime.dracutModulesAbsent = true;
        }
        if (item.package === 'python3-cryptography') {
          assert(container, 'Only reviewed isolated image runtime is supported');
          runtime.cryptography = JSON.parse(command('docker', ['exec', container, 'python3', '-c',
            'import cryptography,importlib.util,json;from cryptography.hazmat.bindings import _rust;print(json.dumps({"version":cryptography.__version__,"module":cryptography.__file__,"verificationModule":importlib.util.find_spec("cryptography.x509.verification") is not None,"rustVerification":hasattr(_rust,"x509_verification") or hasattr(_rust.x509,"PolicyBuilder")}))']));
          assert.equal(runtime.cryptography.version, '38.0.4');
          assert.equal(runtime.cryptography.module, '/usr/lib/python3/dist-packages/cryptography/__init__.py');
          assert.equal(runtime.cryptography.verificationModule, false);
          assert.equal(runtime.cryptography.rustVerification, false);
        }
        cache.set(cacheKey, {result, runtime});
        evidence.push({artifact: item.artifact, scope: item.scope, ...result, inventorySha256: spec.inventorySha256, runtime});
      } catch (error) {
        cache.set(cacheKey, null);
        skipped.push({artifact: item.artifact, package: item.package, reason: error.message.split('\n')[0]});
      }
    }
    const record = cache.get(cacheKey);
    if (!record) continue;
    const component = exactInventory(item, record.result.records, spec);
    assert(component);
    const reason = `Exact binary-component attribution: ${component}. Installed ${item.package} ${item.installed}; full package path/type/content/link inventory SHA256 ${spec.inventorySha256}, rechecked in this scanned runtime. Primary evidence ${advisorySources[item.id]}. Actual vulnerable sibling packages and unrelated CVEs remain open. This is not a whole-image safety claim and not a new package repair.`;
    decisions.push(validateDecision({key: item.key, status: 'not-affected', reason, expiresAt: new Date(Date.now() + 7 * 86400000).toISOString()}));
  }
  // A concurrent deployment/rescan invalidates this read-only review run.
  assert.equal(read(root + '/security.json').completedAt, scan.completedAt);
  const report = {date: new Date().toISOString(), scanDate: scan.completedAt, applied: false, decisions, skipped, evidenceSha256: sha256(JSON.stringify(evidence))};
  fs.writeFileSync(output + '/binary-evidence.json', JSON.stringify({date: report.date, scanDate: report.scanDate, evidence}, null, 2) + '\n', {mode: 0o600});
  fs.writeFileSync(output + '/binary-reviews.json', JSON.stringify(report, null, 2) + '\n', {mode: 0o600});
  console.log(JSON.stringify({decisions: decisions.length, inventoryGroups: evidence.length, skipped, applied: false}));
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
