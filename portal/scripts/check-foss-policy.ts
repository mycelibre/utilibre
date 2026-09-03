import { readFileSync, readdirSync } from 'node:fs';
import { catalog } from '../src/catalog/catalog.ts';
import { assertFossCatalogPolicy, reviewedFossProviders } from '../src/catalog/upstreams.ts';
import { parseRoute } from '../src/routes.ts';

const retiredRoutes: ReadonlyArray<readonly [string, string]> = [
  ['image-resize', 'redimensionar-imagen'],
  ['image-compress', 'comprimir-imagen'],
  ['image-convert', 'convertir-imagen'],
  ['remove-image-metadata', 'quitar-metadatos-imagen'],
  ['pdf-merge', 'combinar-pdf'],
  ['pdf-extract', 'extraer-paginas-pdf'],
  ['pdf-rotate', 'rotar-paginas-pdf'],
  ['pdf-reorder', 'reordenar-pdf'],
  ['file-hashes', 'hashes-archivo'],
  ['file-information', 'informacion-archivo'],
  ['json', 'json'],
  ['base64', 'base64'],
  ['url-encoding', 'codificacion-url'],
  ['uuid', 'uuid'],
  ['qr-generate', 'generar-qr'],
  ['qr-read', 'leer-qr'],
  ['webhook-signature', 'verificar-firma-webhook'],
  ['openapi', 'openapi'],
  ['jwt-inspect', 'inspeccionar-jwt'],
  ['jwt-generate', 'generar-jwt'],
  ['http-curl', 'http-curl'],
  ['regex', 'expresiones-regulares'],
  ['cron', 'cron'],
  ['timestamp', 'marcas-de-tiempo'],
  ['text-hashes', 'hashes-texto'],
  ['http-request', 'solicitud-http'],
  ['http-headers', 'cabeceras-http'],
  ['websocket', 'websocket'],
  ['sse', 'eventos-sse'],
  ['webhook-inbox', 'buzon-webhook'],
  ['dns-lookup', 'consulta-dns'],
];

assertFossCatalogPolicy(catalog);

const referencedProviders = new Set(catalog.map((entry) => entry.providerId));
for (const [providerId, provider] of Object.entries(reviewedFossProviders)) {
  assert(referencedProviders.has(providerId), `Reviewed provider ${providerId} is not represented in the catalog`);
  assert(provider.role === 'public-application', `Provider ${providerId} is not a complete public application`);
  assert(provider.maintainer === 'independent-upstream', `Provider ${providerId} is not independently maintained`);
  assert(provider.selfHostable, `Provider ${providerId} is not reviewed as self-hostable`);
  assert(provider.reviewedSourceUrl.startsWith('https://'), `Provider ${providerId} has no HTTPS source evidence`);
  assert(!/\/(?:main|master|current|latest)(?:\/|$)/i.test(provider.reviewedSourceUrl), `Provider ${providerId} source review is not immutable`);
  assert(provider.licenseEvidenceUrls.length > 0 && provider.licenseEvidenceUrls.every((url) => url.startsWith('https://')), `Provider ${providerId} has no HTTPS license evidence`);
  assert(provider.selfHostingEvidenceUrl.startsWith('https://'), `Provider ${providerId} has no self-hosting evidence`);
  assert(provider.maintenanceEvidenceUrl.startsWith('https://'), `Provider ${providerId} has no maintenance evidence`);
  assert(Boolean(provider.reviewDocument), `Provider ${providerId} has no local review document`);
  assert(!/(?:^|[:/])latest(?:$|[@:/])/i.test(provider.artifactReference), `Provider ${providerId} artifact is not immutable`);
}

const toolFiles = walkFiles(new URL('../src/tools/', import.meta.url)).sort();
assert(toolFiles.join('\n') === 'media.ts\nprivate-router.ts', `Unexpected portal-native tool implementation found:\n${toolFiles.join('\n')}`);

const serverSource = readFileSync(new URL('../server/server.mjs', import.meta.url), 'utf8');
assert(!/\/_portal\/developer|webhook-inbox|webhook-inboxes|dnsLookup|DNS_LOOKUP/.test(serverSource), 'Retired developer API behavior remains in the portal server');

assert(retiredRoutes.length === 31, 'The retired-route regression list changed unexpectedly');
for (const [english, spanish] of retiredRoutes) {
  assert(parseRoute(`/en/tools/${english}`)?.page === 'not-found', `Retired route /en/tools/${english} is public again`);
  assert(parseRoute(`/es/herramientas/${spanish}`)?.page === 'not-found', `Retired route /es/herramientas/${spanish} is public again`);
}

console.warn(`FOSS policy gate passed for ${catalog.length} catalog records and ${retiredRoutes.length} retired routes`);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function walkFiles(directory: URL, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return walkFiles(new URL(`${entry.name}/`, directory), `${relative}/`);
    return entry.isFile() ? [relative] : [];
  });
}
