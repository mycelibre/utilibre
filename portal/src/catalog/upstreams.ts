export type FossProviderId =
  | 'searxng'
  | 'cobalt'
  | 'redlib'
  | 'ntfy'
  | 'bentopdf'
  | 'vert'
  | 'omnitools'
  | 'healthchecks'
  | 'pairdrop'
  | 'freshrss'
  | 'rsshub'
  | 'privatebin'
  | 'wakapi'
  | 'invidious'
  | 'rimgo';

export type ReviewedLicense =
  | 'AGPL-3.0'
  | 'AGPL-3.0-only'
  | 'AGPL-3.0-or-later'
  | 'Apache-2.0 OR GPL-2.0-only'
  | 'BSD-3-Clause'
  | 'GPL-3.0-only'
  | 'MIT'
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
  integration: 'container' | 'source-build' | 'static-app' | 'api-adapter';
  reviewStatus: 'deployed' | 'deferred';
  reviewDocument: 'docs/viability-matrix.md' | 'deployment/utilibre/SOURCE_MANIFEST.md';
  role: 'public-application';
  maintainer: 'independent-upstream';
  selfHostable: true;
  reviewedOn: string;
}

/**
 * Closed registry of reviewed application providers. Membership records a
 * completed FOSS/provider review; only `deployed` records may back a
 * launchable catalog entry. A library or browser API is never eligible.
 */
export const reviewedFossProviders: Record<FossProviderId, ReviewedFossProvider> = {
  searxng: {
    project: 'SearXNG', sourceUrl: 'https://github.com/searxng/searxng',
    reviewedSourceUrl: 'https://github.com/searxng/searxng/tree/9fea41204fdfa7a5cfa15b0ebd12904c520478ce',
    license: 'AGPL-3.0-or-later', licenseEvidenceUrls: ['https://github.com/searxng/searxng/blob/9fea41204fdfa7a5cfa15b0ebd12904c520478ce/LICENSE'],
    selfHostingEvidenceUrl: 'https://docs.searxng.org/admin/installation-docker.html', maintenanceEvidenceUrl: 'https://github.com/searxng/searxng/commits/master/',
    artifactReference: 'docker.io/searxng/searxng:2026.8.22-9fea41204@sha256:11a9b34cdc0b1ec2b991470a2762ecb5a1a531898289fb51dcd015260450729e',
    installedVersion: '2026.8.22-9fea41204 + local log redaction hook', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/viability-matrix.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  cobalt: {
    project: 'Cobalt', sourceUrl: 'https://github.com/imputnet/cobalt',
    reviewedSourceUrl: 'https://github.com/imputnet/cobalt/tree/a636575b09de1fc55d9b8cd98cac88f5f2f16b42',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/imputnet/cobalt/blob/a636575b09de1fc55d9b8cd98cac88f5f2f16b42/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/imputnet/cobalt/blob/a636575b09de1fc55d9b8cd98cac88f5f2f16b42/docs/run-an-instance.md', maintenanceEvidenceUrl: 'https://github.com/imputnet/cobalt/commits/current/',
    artifactReference: 'ghcr.io/imputnet/cobalt:11.7.1-a636575@sha256:63186dd68afd57ce3bb1f62cc4c139f5fa95b9c3e87a3cf5c6e4c7a570523f62',
    installedVersion: '11.7.1-a636575', integration: 'api-adapter', reviewStatus: 'deployed', reviewDocument: 'docs/viability-matrix.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  redlib: {
    project: 'Redlib', sourceUrl: 'https://github.com/redlib-org/redlib',
    reviewedSourceUrl: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/redlib-org/redlib/blob/a4d36e954cf1bd64f209cd8868c5a29edc81b374/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374#deployment', maintenanceEvidenceUrl: 'https://github.com/redlib-org/redlib/commits/main/',
    artifactReference: 'source:a4d36e954cf1bd64f209cd8868c5a29edc81b374+config/redlib/patches/0001-reject-scheme-relative-settings-redirects.patch',
    installedVersion: 'a4d36e9 + local redirect hardening', integration: 'source-build', reviewStatus: 'deployed', reviewDocument: 'docs/viability-matrix.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  ntfy: {
    project: 'ntfy', sourceUrl: 'https://github.com/binwiederhier/ntfy', reviewedSourceUrl: 'https://github.com/binwiederhier/ntfy/tree/v2.28.0',
    license: 'Apache-2.0 OR GPL-2.0-only', licenseEvidenceUrls: ['https://github.com/binwiederhier/ntfy/blob/v2.28.0/LICENSE', 'https://github.com/binwiederhier/ntfy/blob/v2.28.0/LICENSE.GPLv2'],
    selfHostingEvidenceUrl: 'https://docs.ntfy.sh/install/', maintenanceEvidenceUrl: 'https://github.com/binwiederhier/ntfy/commits/main/',
    artifactReference: 'docker.io/binwiederhier/ntfy:v2.28.0@sha256:6ef4b819f722fccdc036af611c4774cfdc2de821ab74fdd48bbf4c9d6f8973da',
    installedVersion: '2.28.0', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  bentopdf: {
    project: 'BentoPDF', sourceUrl: 'https://github.com/alam00000/bentopdf', reviewedSourceUrl: 'https://github.com/alam00000/bentopdf/tree/f96cd4e5166f3d51393dfe9f3c440b5bb77802f1',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/alam00000/bentopdf/blob/v2.8.8/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/alam00000/bentopdf/tree/v2.8.8', maintenanceEvidenceUrl: 'https://github.com/alam00000/bentopdf/commits/main/',
    artifactReference: 'ghcr.io/alam00000/bentopdf:2.8.8@sha256:6ef493c8e3bdbaa26c9bfcec330377ae95116fa00660ca0342769063197b1952',
    installedVersion: '2.8.8', integration: 'static-app', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  vert: {
    project: 'VERT', sourceUrl: 'https://github.com/VERT-sh/VERT', reviewedSourceUrl: 'https://github.com/VERT-sh/VERT/tree/e0ffd34310f9c988b16e22334b13e18de030b0ae',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/VERT-sh/VERT/blob/e0ffd34310f9c988b16e22334b13e18de030b0ae/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/VERT-sh/VERT/tree/e0ffd34310f9c988b16e22334b13e18de030b0ae', maintenanceEvidenceUrl: 'https://github.com/VERT-sh/VERT/commits/main/',
    artifactReference: 'source:e0ffd34310f9c988b16e22334b13e18de030b0ae+deployment/utilibre/config/vert/Dockerfile.utilibre',
    installedVersion: 'e0ffd343', integration: 'source-build', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  omnitools: {
    project: 'OmniTools', sourceUrl: 'https://github.com/iib0011/omni-tools', reviewedSourceUrl: 'https://github.com/iib0011/omni-tools/tree/v0.6.0',
    license: 'MIT', licenseEvidenceUrls: ['https://github.com/iib0011/omni-tools/blob/v0.6.0/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/iib0011/omni-tools/tree/v0.6.0', maintenanceEvidenceUrl: 'https://github.com/iib0011/omni-tools/commits/main/',
    artifactReference: 'docker.io/iib0011/omni-tools:0.6.0@sha256:ceb5acc317daf387634f7f212cefe4722fd1243ad1cba74203f25254195b6c69',
    installedVersion: '0.6.0', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  healthchecks: {
    project: 'Healthchecks', sourceUrl: 'https://github.com/healthchecks/healthchecks', reviewedSourceUrl: 'https://github.com/healthchecks/healthchecks/tree/v4.3',
    license: 'BSD-3-Clause', licenseEvidenceUrls: ['https://github.com/healthchecks/healthchecks/blob/v4.3/LICENSE'],
    selfHostingEvidenceUrl: 'https://healthchecks.io/docs/self_hosted/', maintenanceEvidenceUrl: 'https://github.com/healthchecks/healthchecks/commits/master/',
    artifactReference: 'docker.io/healthchecks/healthchecks:v4.3@sha256:cd7bcd94350818b3944f82eb5995f48bdeab8c8627977578a569ffa73f56f56f',
    installedVersion: '4.3', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  pairdrop: {
    project: 'PairDrop', sourceUrl: 'https://github.com/schlagmichdoch/PairDrop', reviewedSourceUrl: 'https://github.com/schlagmichdoch/PairDrop/tree/v1.11.2',
    license: 'GPL-3.0-only', licenseEvidenceUrls: ['https://github.com/schlagmichdoch/PairDrop/blob/v1.11.2/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/schlagmichdoch/PairDrop/tree/v1.11.2#self-hosting', maintenanceEvidenceUrl: 'https://github.com/schlagmichdoch/PairDrop/commits/master/',
    artifactReference: 'ghcr.io/schlagmichdoch/pairdrop:v1.11.2@sha256:c4b30977264a76e335740089e693a52a0d0d616330dec7f93c7b96beef7b4a02',
    installedVersion: '1.11.2', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  freshrss: {
    project: 'FreshRSS', sourceUrl: 'https://github.com/FreshRSS/FreshRSS', reviewedSourceUrl: 'https://github.com/FreshRSS/FreshRSS/tree/1.29.1',
    license: 'AGPL-3.0', licenseEvidenceUrls: ['https://github.com/FreshRSS/FreshRSS/blob/1.29.1/LICENSE.txt'],
    selfHostingEvidenceUrl: 'https://github.com/FreshRSS/FreshRSS/blob/1.29.1/README.md#installation', maintenanceEvidenceUrl: 'https://github.com/FreshRSS/FreshRSS/commits/edge/',
    artifactReference: 'docker.io/freshrss/freshrss:1.29.1@sha256:ab6b363102ccdbc39f6a62db926f567c61a5289bf25ba460f1c34423d8cc1a4d',
    installedVersion: '1.29.1', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  rsshub: {
    project: 'RSSHub', sourceUrl: 'https://github.com/DIYgod/RSSHub', reviewedSourceUrl: 'https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95',
    license: 'AGPL-3.0', licenseEvidenceUrls: ['https://github.com/DIYgod/RSSHub/blob/40aca9548e99eefd519ff7abbb937560fc037c95/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/DIYgod/RSSHub/blob/40aca9548e99eefd519ff7abbb937560fc037c95/README.md#deployment', maintenanceEvidenceUrl: 'https://github.com/DIYgod/RSSHub/commits/master/',
    artifactReference: 'source:40aca9548e99eefd519ff7abbb937560fc037c95+deployment/utilibre/config/rsshub/rsshub-public-origin.patch',
    installedVersion: '40aca954', integration: 'source-build', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  privatebin: {
    project: 'PrivateBin', sourceUrl: 'https://github.com/PrivateBin/PrivateBin', reviewedSourceUrl: 'https://github.com/PrivateBin/PrivateBin/tree/2.0.6',
    license: 'Zlib', licenseEvidenceUrls: ['https://github.com/PrivateBin/PrivateBin/blob/2.0.6/LICENSE.md'],
    selfHostingEvidenceUrl: 'https://github.com/PrivateBin/PrivateBin/wiki/Installation', maintenanceEvidenceUrl: 'https://github.com/PrivateBin/PrivateBin/commits/master/',
    artifactReference: 'docker.io/privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8',
    installedVersion: '2.0.6', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  wakapi: {
    project: 'Wakapi', sourceUrl: 'https://github.com/muety/wakapi', reviewedSourceUrl: 'https://github.com/muety/wakapi/tree/2.17.6',
    license: 'MIT', licenseEvidenceUrls: ['https://github.com/muety/wakapi/blob/2.17.6/LICENSE'],
    selfHostingEvidenceUrl: 'https://github.com/muety/wakapi/tree/2.17.6#-how-to-use', maintenanceEvidenceUrl: 'https://github.com/muety/wakapi/commits/master/',
    artifactReference: 'ghcr.io/muety/wakapi:2.17.6@sha256:00662767731a6797d4be02cbc6c3f32b7ff8d0c683ee10ec5612856d4efbb3bf',
    installedVersion: '2.17.6', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'deployment/utilibre/SOURCE_MANIFEST.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  invidious: {
    project: 'Invidious', sourceUrl: 'https://github.com/iv-org/invidious', reviewedSourceUrl: 'https://github.com/iv-org/invidious/tree/48c6110a83fc788b4199daf737279b71950cc0db',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/iv-org/invidious/blob/48c6110a83fc788b4199daf737279b71950cc0db/LICENSE'],
    selfHostingEvidenceUrl: 'https://docs.invidious.io/installation/', maintenanceEvidenceUrl: 'https://github.com/iv-org/invidious/commits/master/',
    artifactReference: 'reviewed-source:48c6110a83fc788b4199daf737279b71950cc0db',
    installedVersion: 'reviewed 2.20260804.1; not installed', integration: 'container', reviewStatus: 'deferred', reviewDocument: 'docs/viability-matrix.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-09-03',
  },
  rimgo: {
    project: 'rimgo', sourceUrl: 'https://codeberg.org/rimgo/rimgo', reviewedSourceUrl: 'https://codeberg.org/rimgo/rimgo/src/tag/v1.4.2',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://codeberg.org/rimgo/rimgo/src/tag/v1.4.2/LICENSE'],
    selfHostingEvidenceUrl: 'https://codeberg.org/rimgo/rimgo/src/tag/v1.4.2', maintenanceEvidenceUrl: 'https://codeberg.org/rimgo/rimgo/commits/branch/main',
    artifactReference: 'codeberg.org/rimgo/rimgo:1.4.2@sha256:569800892522c7dd7d47290ce80d5c1fbb451609ce0d983c545a5d203ca93048',
    installedVersion: 'reviewed 1.4.2 optional profile; not public', integration: 'container', reviewStatus: 'deferred', reviewDocument: 'docs/viability-matrix.md',
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
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
  'Apache-2.0 OR GPL-2.0-only', 'BSD-3-Clause', 'GPL-3.0-only', 'MIT', 'Zlib',
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
    if (entry.operationalStatus !== 'not-deployed' && provider.reviewStatus !== 'deployed') {
      throw new Error(`Launchable catalog entry ${entry.id} uses a deferred provider`);
    }
    if (entry.license !== provider.license || entry.upstreamProject !== provider.project || entry.upstreamSourceUrl !== provider.sourceUrl || entry.installedVersion !== provider.installedVersion) {
      throw new Error(`Catalog entry ${entry.id} disagrees with its reviewed provider record`);
    }
  }
}
