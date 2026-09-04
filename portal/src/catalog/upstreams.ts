export type FossProviderId = 'searxng' | 'redlib' | 'freshrss' | 'privatebin';

export type ReviewedLicense =
  | 'AGPL-3.0'
  | 'AGPL-3.0-only'
  | 'AGPL-3.0-or-later'
  | 'Zlib';

export interface ReviewedFossProvider {
  project: string;
  sourceUrl: string;
  reviewedSourceUrl: string;
  license: ReviewedLicense;
  licenseEvidenceUrls: readonly string[];
  selfHostingEvidenceUrl: string;
  maintenanceEvidenceUrl: string;
  artifactReference: string;
  installedVersion: string;
  integration: 'container' | 'source-build';
  reviewStatus: 'deployed';
  reviewDocument: 'docs/services.md';
  role: 'public-application';
  maintainer: 'independent-upstream';
  selfHostable: true;
  reviewedOn: string;
}

/**
 * Closed registry for applications Utilibre actually presents as hosted
 * services. A reviewed project with no public Utilibre service does not belong
 * in this visitor-facing inventory.
 */
export const reviewedFossProviders: Record<FossProviderId, ReviewedFossProvider> = {
  searxng: {
    project: 'SearXNG', sourceUrl: 'https://github.com/searxng/searxng',
    reviewedSourceUrl: 'https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce',
    license: 'AGPL-3.0-or-later', licenseEvidenceUrls: ['https://github.com/searxng/searxng/blob/9fea41204fdfa7a5cfa15b0ebd12904c520478ce/LICENSE'],
    selfHostingEvidenceUrl: 'https://docs.searxng.org/admin/installation-docker.html', maintenanceEvidenceUrl: 'https://github.com/searxng/searxng/commits/master/',
    artifactReference: 'docker.io/searxng/searxng:2026.8.22-9fea41204@sha256:11a9b34cdc0b1ec2b991470a2762ecb5a1a531898289fb51dcd015260450729e',
    installedVersion: '2026.8.22-9fea41204 + local log redaction hook', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/services.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  redlib: {
    project: 'Redlib', sourceUrl: 'https://github.com/redlib-org/redlib',
    reviewedSourceUrl: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/redlib-org/redlib/blob/a4d36e954cf1bd64f209cd8868c5a29edc81b374/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374#deployment', maintenanceEvidenceUrl: 'https://github.com/redlib-org/redlib/commits/main/',
    artifactReference: 'source:a4d36e954cf1bd64f209cd8868c5a29edc81b374+config/redlib/patches/0001-reject-scheme-relative-settings-redirects.patch',
    installedVersion: 'a4d36e9 + local redirect hardening', integration: 'source-build', reviewStatus: 'deployed', reviewDocument: 'docs/services.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  freshrss: {
    project: 'FreshRSS', sourceUrl: 'https://github.com/FreshRSS/FreshRSS', reviewedSourceUrl: 'https://github.com/FreshRSS/FreshRSS/tree/1.29.1',
    license: 'AGPL-3.0', licenseEvidenceUrls: ['https://github.com/FreshRSS/FreshRSS/blob/1.29.1/LICENSE.txt'],
    selfHostingEvidenceUrl: 'https://github.com/FreshRSS/FreshRSS/blob/1.29.1/README.md#installation', maintenanceEvidenceUrl: 'https://github.com/FreshRSS/FreshRSS/commits/edge/',
    artifactReference: 'docker.io/freshrss/freshrss:1.29.1@sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d',
    installedVersion: '1.29.1', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/services.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  privatebin: {
    project: 'PrivateBin', sourceUrl: 'https://github.com/PrivateBin/PrivateBin', reviewedSourceUrl: 'https://github.com/PrivateBin/PrivateBin/tree/2.0.6',
    license: 'Zlib', licenseEvidenceUrls: ['https://github.com/PrivateBin/PrivateBin/blob/2.0.6/LICENSE.md'],
    selfHostingEvidenceUrl: 'https://github.com/PrivateBin/PrivateBin/wiki/Installation', maintenanceEvidenceUrl: 'https://github.com/PrivateBin/PrivateBin/commits/master/',
    artifactReference: 'docker.io/privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8',
    installedVersion: '2.0.6', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/services.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
};

export interface FossCatalogRecord {
  id: string;
  providerId: FossProviderId;
  kind: 'service' | 'integration';
  implementation: 'upstream-application' | 'integration-glue';
  portalSurface: 'upstream-interface' | 'integration-glue';
  operationalStatus: string;
  license: string;
  upstreamProject: string;
  upstreamSourceUrl: string;
  installedVersion: string;
}

const reviewedLicenses = new Set<ReviewedLicense>([
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'Zlib',
]);

export function assertFossCatalogPolicy(entries: readonly FossCatalogRecord[]): void {
  for (const entry of entries) {
    const provider = reviewedFossProviders[entry.providerId];
    if (!provider || provider.role !== 'public-application' || provider.maintainer !== 'independent-upstream' || !provider.selfHostable) {
      throw new Error(`Catalog entry ${entry.id} has no reviewed independent self-hostable FOSS application provider`);
    }
    if (!reviewedLicenses.has(provider.license) || provider.licenseEvidenceUrls.length === 0) {
      throw new Error(`Catalog provider ${entry.providerId} has no recognized reviewed FOSS license evidence`);
    }
    const evidenceUrls = [provider.reviewedSourceUrl, ...provider.licenseEvidenceUrls, provider.selfHostingEvidenceUrl, provider.maintenanceEvidenceUrl];
    if (evidenceUrls.some((url) => !url.startsWith('https://'))) {
      throw new Error(`Catalog provider ${entry.providerId} has incomplete HTTPS review evidence`);
    }
    if (!provider.artifactReference || /(?:^|[:/])latest(?:$|[@:/])/i.test(provider.artifactReference)) {
      throw new Error(`Catalog provider ${entry.providerId} has no immutable reviewed artifact`);
    }
    if (entry.kind === 'integration' && (entry.implementation !== 'integration-glue' || entry.portalSurface !== 'integration-glue')) {
      throw new Error(`Catalog integration ${entry.id} must be glue only`);
    }
    if (entry.kind === 'service' && entry.implementation !== 'upstream-application') {
      throw new Error(`Catalog service ${entry.id} must be provided by its upstream application`);
    }
    if (entry.license !== provider.license || entry.upstreamProject !== provider.project || entry.upstreamSourceUrl !== provider.sourceUrl || entry.installedVersion !== provider.installedVersion) {
      throw new Error(`Catalog entry ${entry.id} disagrees with its reviewed provider record`);
    }
  }
}
