// Generate an external monitor inventory from the public, enabled catalogue.
// Run with Node 24's TypeScript stripping; no credentials or private URLs enter
// the output. Refresh only when deliberately given a current public config.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog } from '../../../portal/src/catalog/catalog.ts';

const here = new URL('./', import.meta.url);
const specialPaths = {
  searxng: '/healthz',
  grist: '/healthz',
  librespeed: '/healthz',
  lrclib: '/healthz',
  ntfy: '/v1/health',
  candlr: '/login',
  bookplate: '/login',
  wallabag: '/login',
  beaverhabits: '/login',
  // The public root has a browser challenge; this native JSON route is exempt.
  gothub: '/api/v1/version',
};
const groupNames = {
  files: 'Documents', documents: 'Documents',
  media: 'Creative', design: 'Creative', creative: 'Creative',
  privacy: 'Sharing', planning: 'Sharing', sharing: 'Sharing',
  find: 'Reading', reading: 'Reading', 'feeds-monitoring': 'Reading',
  'text-data': 'Data', data: 'Data',
};

function publicUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.port || url.username || url.password ||
      url.search || url.hash ||
      (url.hostname !== 'utilibre.org' && !url.hostname.endsWith('.utilibre.org'))) {
    throw new Error('Enabled service has an unsupported public URL');
  }
  return url;
}

export function buildTargets(config) {
  if (!['https://utilibre.org', 'https://utilibre.org/'].includes(config?.publicPortalOrigin) ||
      !Array.isArray(config.enabledServices)) {
    throw new Error('Expected Utilibre public configuration');
  }
  const enabled = new Set(config.enabledServices);
  const targets = new Map();
  const covered = new Set();
  for (const entry of catalog) {
    const serviceId = entry.serviceId ?? entry.id;
    if (entry.kind !== 'service' || !enabled.has(serviceId) ||
        ['not-deployed', 'maintenance', 'unavailable'].includes(entry.operationalStatus) ||
        !entry.configUrlKey || !config[entry.configUrlKey]) continue;
    const base = new URL(config[entry.configUrlKey]);
    if (base.protocol === 'mumble:') {
      if (base.hostname !== 'mumble.utilibre.org' || base.port !== '64738') {
        throw new Error('Unexpected Mumble endpoint');
      }
      covered.add(serviceId);
      targets.set('mumble-tcp', {
        id: 'mumble-tcp', name: 'Mumble TCP listener', group: 'Sharing',
        type: 'port', hostname: base.hostname, port: 64738, interval: 300,
        services: [serviceId],
      });
      continue;
    }
    const url = publicUrl(config[entry.configUrlKey]);
    if (specialPaths[serviceId]) url.pathname = specialPaths[serviceId];
    const key = url.href;
    covered.add(serviceId);
    const prior = targets.get(key);
    if (prior) {
      if (!prior.services.includes(serviceId)) prior.services.push(serviceId);
      continue;
    }
    targets.set(key, {
      id: serviceId, name: entry.upstreamProject, group: groupNames[entry.discoveryGroup] ?? 'Other',
      type: 'http', url: key, interval: serviceId === 'searxng' ? 300 : 600,
      services: [serviceId],
      ...(serviceId === 'gothub' ? { replacesUrl: 'https://gothub.utilibre.org/' } : {}),
    });
  }
  const missing = [...enabled].filter(id => !covered.has(id));
  if (missing.length) throw new Error(`Enabled services without a monitor target: ${missing.join(', ')}`);
  const all = [
    { id: 'portal-health', name: 'Portal health', group: 'Core', type: 'http', url: 'https://utilibre.org/healthz', interval: 120, services: [] },
    { id: 'portal-page', name: 'Portal homepage', group: 'Core', type: 'http', url: 'https://utilibre.org/en/', interval: 300, services: [] },
    ...targets.values(),
  ];
  if (new Set(all.map(target => target.id)).size !== all.length) throw new Error('Duplicate monitor ID');
  return { schemaVersion: 1, source: 'Utilibre public catalogue and /_portal/config',
    enabledServiceCount: enabled.size, targets: all };
}

async function main() {
  const args = process.argv.slice(2);
  const from = args.indexOf('--config');
  const live = args.includes('--live');
  if (live === (from !== -1)) throw new Error('Specify exactly one of --live or --config FILE');
  const config = live
    ? await (async () => {
        const response = await fetch('https://utilibre.org/_portal/config', { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Public config returned ${response.status}`);
        return response.json();
      })()
    : JSON.parse(await readFile(args[from + 1], 'utf8'));
  const out = args.indexOf('--out');
  const output = out === -1 ? new URL('targets.json', here) : args[out + 1];
  const manifest = buildTargets(config);
  await writeFile(output, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${manifest.targets.length} targets cover ${manifest.enabledServiceCount} enabled service IDs.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
