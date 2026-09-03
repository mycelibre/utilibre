import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalog } from '../../src/catalog/catalog';
import { assertFossCatalogPolicy, reviewedFossProviders } from '../../src/catalog/upstreams';
import { parseRoute } from '../../src/routes';

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

describe('FOSS-only public capability policy', () => {
  it('accepts only independently maintained, self-hostable FOSS application providers', () => {
    expect(() => assertFossCatalogPolicy(catalog)).not.toThrow();
    expect(catalog).toHaveLength(16);
    expect(catalog.every((entry) => entry.upstreamProject && entry.upstreamSourceUrl && entry.license && entry.installedVersion)).toBe(true);
    expect(catalog.filter((entry) => entry.kind === 'integration').map((entry) => entry.id)).toEqual(['private-router']);
    expect(catalog.find((entry) => entry.id === 'private-router')?.implementation).toBe('integration-glue');
    expect(catalog.filter((entry) => entry.portalSurface === 'integration-glue').map((entry) => entry.id)).toEqual(['cobalt', 'private-router']);

    const referencedProviders = new Set(catalog.map((entry) => entry.providerId));
    expect([...referencedProviders].sort()).toEqual(Object.keys(reviewedFossProviders).sort());
    const repositoryRoot = new URL('../../../', import.meta.url);
    for (const provider of Object.values(reviewedFossProviders)) {
      expect(provider.role).toBe('public-application');
      expect(provider.maintainer).toBe('independent-upstream');
      expect(provider.selfHostable).toBe(true);
      expect(provider.reviewedSourceUrl).toMatch(/(?:\/tree\/|\/src\/tag\/)/);
      expect(provider.reviewedSourceUrl).not.toMatch(/\/(?:main|master|current|latest)(?:\/|$)/i);
      expect(provider.licenseEvidenceUrls.length).toBeGreaterThan(0);
      for (const evidenceUrl of provider.licenseEvidenceUrls) expect(evidenceUrl).toMatch(/^https:\/\//);
      expect(provider.selfHostingEvidenceUrl).toMatch(/^https:\/\//);
      expect(provider.maintenanceEvidenceUrl).toMatch(/^https:\/\//);
      expect(provider.artifactReference).not.toMatch(/(?:^|[:/])latest(?:$|[@:/])/i);
      const localArtifactPath = provider.artifactReference.split('+', 2)[1];
      if (localArtifactPath) expect(existsSync(new URL(localArtifactPath, repositoryRoot))).toBe(true);
      expect(existsSync(new URL(provider.reviewDocument, repositoryRoot))).toBe(true);
      expect(provider.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('keeps original browser and server tool implementations out of the application tree', () => {
    const toolFiles = walkFiles(new URL('../../src/tools/', import.meta.url)).sort();
    expect(toolFiles).toEqual(['media.ts', 'private-router.ts']);

    const serverSource = readFileSync(new URL('../../server/server.mjs', import.meta.url), 'utf8');
    expect(serverSource).not.toMatch(/\/_portal\/developer|webhook-inbox|webhook-inboxes|dnsLookup|DNS_LOOKUP/);
  });

  it('fails closed for every retired bilingual tool route', () => {
    expect(retiredRoutes).toHaveLength(31);
    for (const [english, spanish] of retiredRoutes) {
      expect(parseRoute(`/en/tools/${english}`)?.page).toBe('not-found');
      expect(parseRoute(`/es/herramientas/${spanish}`)?.page).toBe('not-found');
    }
  });
});

function walkFiles(directory: URL, prefix = ''): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) return walkFiles(new URL(`${entry.name}/`, directory), `${relative}/`);
    return entry.isFile() ? [relative] : [];
  });
}
