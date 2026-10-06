export type FossProviderId = 'searxng' | 'redlib' | 'freshrss' | 'privatebin' | 'bentopdf' | 'vert' | 'hatsh' | 'omnitools' | 'ittools' | 'drawio' | 'miniqr' | 'rssbridge' | 'ntfy' | 'yopass' | 'pairdrop' | 'uptime-kuma' | 'jupyterlite' | 'whisper-web' | 'reactive-resume' | 'penpot' | 'actual' | 'rallly' | 'breezewiki' | 'wakapi' | 'priviblur' | 'mezzo' | 'fmd' | 'lrclib' | 'libremdb' | 'degoog' | 'fourget' | 'safetwitch' | 'anonymousoverflow' | 'gothub' | 'pollaris' | 'binternet' | 'translite' | 'biblioreads' | 'qr-offline' | 'kittygram' | 'rimgo' | 'mumble';

export type ReviewedLicense =
  | 'AGPL-3.0'
  | 'AGPL-3.0-only'
  | 'AGPL-3.0-or-later'
  | 'MIT'
  | 'GPL-3.0'
  | 'GPL-3.0-or-later'
  | 'Apache-2.0'
  | 'Unlicense'
  | 'BSD-3-Clause'
  | 'MPL-2.0'
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
  reviewStatus: 'deployed' | 'staged';
  reviewDocument: 'docs/services.md' | 'docs/toolbox-review.md';
  role: 'public-application';
  maintainer: 'independent-upstream';
  selfHostable: true;
  reviewedOn: string;
}

/**
 * Closed registry for applications Utilibre actually presents as hosted
 * services or explicitly requested, labeled pending services. Being listed
 * never enables a public route or opens registrations.
 */
export const reviewedFossProviders: Record<FossProviderId, ReviewedFossProvider> = {
  lrclib: { ...toolboxProvider('LRCLIB', 'tranxuanthang/lrclib-homepage', 'f37c07042be1af5fdcc7932d090af32141089751', 'MIT', 'f37c070-p1 · cached read-only API · replaces Dumb', 'source:f37c07042be1af5fdcc7932d090af32141089751+deployment/community/lrclib-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  kittygram: { ...forgeEvaluationProvider('Kittygram', 'https://codeberg.org/irelephant/kittygram', '5931c21c0990d4b216e97166dd78c03c9965567a', 'AGPL-3.0', 'LICENSE', '5931c21-p1 · public profile/post/video tested', 'source:5931c21c0990d4b216e97166dd78c03c9965567a+deployment/community/kittygram-source.patch'), reviewStatus: 'deployed' },
  rimgo: forgeEvaluationProvider('Rimgo', 'https://codeberg.org/rimgo/rimgo', 'd2be8e221522dfe7a06452e2002dcf6dad569d1a', 'AGPL-3.0', 'LICENSE', 'd2be8e2-p3 · shared cooldown · Imgur media rate-limited', 'source:d2be8e221522dfe7a06452e2002dcf6dad569d1a+deployment/community/rimgo-source.patch'),
  mumble: { ...toolboxProvider('Mumble', 'mumble-voip/mumble', 'v1.5.915', 'BSD-3-Clause', '1.5.915 · password-protected · TCP voice verified', 'mumblevoip/mumble-server:v1.5.915@sha256:018ad3515932e513d8fdc970df918373a2664c4da32b09a89a4aaee28eb7507a'), reviewStatus: 'deployed' },
  'qr-offline': { ...toolboxProvider('QR Generator Offline', 'jmarc9901/qr-code-generator-pwa', '0fde7004a08aac6a218e5d5e03c8a3c760eec1fa', 'MIT', '0fde700-p2 · centered codes · local processing', 'source:0fde7004a08aac6a218e5d5e03c8a3c760eec1fa+deployment/community/qr-offline-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  biblioreads: { ...toolboxProvider('BiblioReads', 'nesaku/BiblioReads', '9508abc64c6b35eef366e041fef47554f0ee888a', 'AGPL-3.0-or-later', '4.1.1-p1 · Node 24 · local library', 'source:9508abc64c6b35eef366e041fef47554f0ee888a+deployment/community/biblioreads-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  translite: { ...forgeEvaluationProvider('TransLite', 'https://codeberg.org/gospodin/translite', '7b4b8e51359338219463f14c2a06211b6998a11e', 'Unlicense', 'LICENSE', '7b4b8e5-p1 · PHP 8.5 · four tested providers', 'source:7b4b8e51359338219463f14c2a06211b6998a11e+deployment/community/translite-source.patch'), reviewStatus: 'deployed' },
  binternet: { ...toolboxProvider('Binternet', 'Ahwxorg/Binternet', '9bb70ef26c8b79a315e77b79bfd346433d55cbb6', 'GPL-3.0', '9bb70ef-p1 · HTTPS and Tor access', 'source:9bb70ef26c8b79a315e77b79bfd346433d55cbb6+deployment/community/binternet-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  pollaris: {
    project: 'Pollaris', sourceUrl: 'https://framagit.org/pollaris/pollaris',
    reviewedSourceUrl: 'https://framagit.org/pollaris/pollaris/-/tree/b6ab5b3309e858a02c042350be82cc7a9c599246',
    license: 'AGPL-3.0-or-later', licenseEvidenceUrls: ['https://framagit.org/pollaris/pollaris/-/blob/b6ab5b3309e858a02c042350be82cc7a9c599246/LICENSE.txt'],
    selfHostingEvidenceUrl: 'https://framagit.org/pollaris/pollaris/-/blob/1.2.3/docs/administrators/install.md',
    maintenanceEvidenceUrl: 'https://framagit.org/pollaris/pollaris/-/releases',
    artifactReference: 'source:b6ab5b3309e858a02c042350be82cc7a9c599246+deployment/community/Dockerfile.pollaris',
    installedVersion: '1.2.3 · PHP 8.5 · account-free polls', integration: 'source-build',
    reviewStatus: 'deployed', reviewDocument: 'docs/toolbox-review.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-06',
  },
  libremdb: { ...toolboxProvider('LibreMDB', 'darlopvil/libremdb-fork', 'b233f4e24acfb4afbe55b7c13798832ca8068086', 'AGPL-3.0-or-later', 'b233f4e-p1 · Node 24 / Next 16 · private tests passed', 'source:b233f4e24acfb4afbe55b7c13798832ca8068086+deployment/community/libremdb-private-source.patch'), reviewStatus: 'staged', integration: 'source-build' },
  degoog: { ...toolboxProvider('DeGoog', 'degoog-org/degoog', '4a9bcc74f0fceaa33efbab4777f063274cce23d6', 'AGPL-3.0', '1.0.0 · three licensed SearXNG engines', 'ghcr.io/degoog-org/degoog:1.0.0@sha256:e1ce8ee724a4514d269b74088424e579322bdfcf718256c1c5dd2cbb5aaf510c'), reviewStatus: 'deployed' },
  anonymousoverflow: { ...toolboxProvider('AnonymousOverflow', 'httpjamesm/AnonymousOverflow', '937cfeefd6dcbab92ef572671f16d4d3be6abad3', 'MPL-2.0', '937cfee-p1 · hardened build', 'source:937cfeefd6dcbab92ef572671f16d4d3be6abad3+deployment/community/anonymousoverflow-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  fourget: { ...forgeEvaluationProvider('4get', 'https://git.lolcat.ca/lolcat/4get', '03ba5d7b5ed3dc91b3e7d8b6278d8f52818a99ae', 'AGPL-3.0-only', 'license.txt', '03ba5d7-p2 · hardened build', 'source:03ba5d7b5ed3dc91b3e7d8b6278d8f52818a99ae+deployment/community/fourget-source.patch'), reviewStatus: 'deployed' },
  safetwitch: { ...forgeEvaluationProvider('SafeTwitch', 'https://codeberg.org/SafeTwitch/safetwitch', 'ddee63ebbe8b7b74d8f6ed3869cd7958934746d7', 'AGPL-3.0', 'LICENSE', 'ddee63e-p2 · hardened build', 'source:ddee63ebbe8b7b74d8f6ed3869cd7958934746d7+deployment/community/safetwitch-source.patch'), reviewStatus: 'deployed' },
  gothub: { ...forgeEvaluationProvider('GotHub', 'https://codeberg.org/gothub/gothub', '24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2', 'AGPL-3.0', 'LICENSE', '24bedc8-p2 · public reader · static compression fixed', 'source:24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2+deployment/community/gothub-source.patch'), reviewStatus: 'deployed' },
  'reactive-resume': toolboxProvider('Reactive Resume', 'reactive-resume/reactive-resume', 'bc71f636c02a80ac6d731e17d2ee13501275295c', 'MIT', '6.0.0 · approved-account pilot', 'ghcr.io/reactive-resume/reactive-resume:v6.0.0@sha256:29f418bd46d23f1d7cd9a73ec7f6bc46681926cb1ff617ac388064f45ee790d0'),
  penpot: toolboxProvider('Penpot', 'penpot/penpot', 'cf46b53bcb61c2a9be8f202bec03647a5470d43d', 'MPL-2.0', '2.18.2 · approved-account pilot', 'penpotapp/frontend:2.18.2@sha256:3619f48cbdd0c9197ad23bd3db1c9b4391d7c9c3137e22e806cd7f9c945c1c8e'),
  actual: { ...toolboxProvider('Actual Budget', 'actualbudget/actual', 'v26.10.0', 'MIT', '26.10.0 · approved-account pilot', 'actualbudget/actual-server:26.10.0@sha256:24645e971da6bb1a1f953d6859e307a0b29be1e8b4130a35b3220c209b5b860c'), licenseEvidenceUrls: ['https://github.com/actualbudget/actual/blob/v26.10.0/LICENSE.txt'] },
  rallly: toolboxProvider('Rallly', 'lukevella/rallly', '1e5d48ad410daac9700c38c1947aad94c362ab82', 'AGPL-3.0', '4.15.3 · approved-account organizers', 'lukevella/rallly:4.15.3@sha256:8cd979aefe8d06e1822bc67054eb2d31088cdb831aa3f7b5615b3768f35431d9'),
  priviblur: toolboxProvider('Priviblur', 'syeopite/priviblur', '251a8e67c64d792b3c8c141860ccaa227ce62e4d', 'AGPL-3.0', '251a8e6 · security dependency updates', 'source:251a8e67c64d792b3c8c141860ccaa227ce62e4d+deployment/community/Dockerfile.priviblur'),
  mezzo: {
    ...toolboxProvider('Mezzo', 'fsky/mezzo', 'v1.4.0', 'AGPL-3.0-or-later', '1.4.0', 'gitfield.org/fsky/mezzo@sha256:f8643c2525c96b3c5708bb737f71759bfc4c01a745301a8a7dbcba609f9c6416'),
    sourceUrl: 'https://gitfield.org/fsky/mezzo', reviewedSourceUrl: 'https://gitfield.org/fsky/mezzo/src/commit/9cb99bd6a8570bb104021a094b1e598c8dda49db',
    licenseEvidenceUrls: ['https://gitfield.org/fsky/mezzo/src/tag/v1.4.0/LICENSE'],
    selfHostingEvidenceUrl: 'https://gitfield.org/fsky/mezzo#run-your-own-instance', maintenanceEvidenceUrl: 'https://gitfield.org/fsky/mezzo/releases', reviewStatus: 'deployed',
  },
  fmd: {
    ...toolboxProvider('FMD Server', 'fmd-foss/fmd-server', 'v0.17.0', 'GPL-3.0-or-later', '0.17.0 · invitation-only device pilot', 'registry.gitlab.com/fmd-foss/fmd-server@sha256:e4a7f5538aa3febe938159ee2db337ccdb50d340d7009784c5a851f152df48e0'),
    sourceUrl: 'https://gitlab.com/fmd-foss/fmd-server', reviewedSourceUrl: 'https://gitlab.com/fmd-foss/fmd-server/-/tree/v0.17.0',
    licenseEvidenceUrls: ['https://gitlab.com/fmd-foss/fmd-server/-/blob/v0.17.0/LICENSE'],
    selfHostingEvidenceUrl: 'https://fmd-foss.org/docs/fmd-server/installation/overview/', maintenanceEvidenceUrl: 'https://gitlab.com/fmd-foss/fmd-server/-/tags', reviewStatus: 'deployed',
  },
  wakapi: { ...toolboxProvider('Wakapi', 'muety/wakapi', '347f1f45ae2863d9499236471317a76630c5308f', 'MIT', '2.18.1 · local copy and empty-state fixes', 'source:347f1f45ae2863d9499236471317a76630c5308f+deployment/expanded/Dockerfile.wakapi'), integration: 'source-build' },
  breezewiki: {
    project: 'BreezeWiki', sourceUrl: 'https://gitdab.com/cadence/breezewiki',
    reviewedSourceUrl: 'https://gitdab.com/cadence/breezewiki/src/commit/6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4',
    license: 'AGPL-3.0', licenseEvidenceUrls: ['https://gitdab.com/cadence/breezewiki/src/commit/6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4/LICENSE'],
    selfHostingEvidenceUrl: 'https://docs.breezewiki.com/Running_BreezeWiki.html', maintenanceEvidenceUrl: 'https://gitdab.com/cadence/breezewiki/commits/branch/master',
    artifactReference: 'source:6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4+deployment/expanded/breezewiki-source.patch',
    installedVersion: '6d09507-p2 · bounded rejection backoff; image CDN still denies requests',
    integration: 'source-build', reviewStatus: 'deployed', reviewDocument: 'docs/toolbox-review.md', role: 'public-application',
    maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-06',
  },
  jupyterlite: { ...toolboxProvider('JupyterLite', 'jupyterlite/jupyterlite', 'bf64167c041060af9025f5c5b5485f871fe90bb6', 'BSD-3-Clause', '0.8.5 · Python kernel 0.8.6', 'source:bf64167c041060af9025f5c5b5485f871fe90bb6+deployment/expanded/Dockerfile.jupyter'), licenseEvidenceUrls: ['https://github.com/jupyterlite/jupyterlite/blob/bf64167c041060af9025f5c5b5485f871fe90bb6/LICENSE'] },
  'whisper-web': toolboxProvider('Whisper Web', 'xenova/whisper-web', '81869ed62970ff4373509b6004a6c9a3f0c5b64d', 'MIT', '81869ed-p2 · local models pilot', 'source:81869ed62970ff4373509b6004a6c9a3f0c5b64d+deployment/expanded/whisper-source.patch'),
  rssbridge: { ...toolboxProvider('RSS-Bridge', 'RSS-Bridge/rss-bridge', 'b39964cee3e4b0babe739d47a604c2323fd270f0', 'Unlicense', '2025-08-05', 'rssbridge/rss-bridge:2025-08-05@sha256:569f01f3faecd0d34d702e01b34eb0a769f7bedb84caf6dff29821d18b46f971'), licenseEvidenceUrls: ['https://github.com/RSS-Bridge/rss-bridge/blob/b39964cee3e4b0babe739d47a604c2323fd270f0/UNLICENSE'] },
  ntfy: toolboxProvider('ntfy', 'binwiederhier/ntfy', '10cb6506f836dbb00bb77e3b52669f6ace37f555', 'Apache-2.0', '2.28.0', 'binwiederhier/ntfy:v2.28.0@sha256:6ef4b819f722fccdc036af611c4774cfdc2de821ab74fdd48bbf4c9d6f8973da'),
  yopass: toolboxProvider('Yopass', 'jhaals/yopass', '34d8bbcc4aac14dbf326d46dc69d26895b7f5282', 'Apache-2.0', '14.10.0', 'jhaals/yopass:14.10.0@sha256:6c33d9c813f77bae70787e1bce76710840ff654f454998b01f8dacc0a7988fd3'),
  pairdrop: toolboxProvider('PairDrop', 'schlagmichdoch/PairDrop', '4862ba3067be1a0f2e0d1e94861dc9200b5bfeea', 'GPL-3.0', '1.11.2', 'ghcr.io/schlagmichdoch/pairdrop:v1.11.2@sha256:c4b30977264a76e335740089e693a52a0d0d616330dec7f93c7b96beef7b4a02'),
  'uptime-kuma': toolboxProvider('Uptime Kuma', 'louislam/uptime-kuma', 'c98982ac60eccb74cdab1d04c30e18057895ce87', 'MIT', '2.5.5', 'louislam/uptime-kuma:2.5.5@sha256:c74379ac4509ce2d2c2633f509e67003ee2e45b6e995c5e43fc101f45a0e1fbe'),
  bentopdf: toolboxProvider('BentoPDF', 'alam00000/bentopdf', 'f96cd4e5166f3d51393dfe9f3c440b5bb77802f1', 'AGPL-3.0', '2.8.8', 'ghcr.io/alam00000/bentopdf-simple:2.8.8@sha256:3d62b8f8eece5fe947026ac3925ff08fda245b3d6ba2c3916b94da91e0010c74'),
  vert: toolboxProvider('VERT', 'VERT-sh/VERT', 'c7b9f3921d6f8722c1dc1515799b461622777068', 'AGPL-3.0', 'c7b9f39 · local processing build', 'source:c7b9f3921d6f8722c1dc1515799b461622777068+deployment/toolbox/Dockerfile.vert'),
  hatsh: toolboxProvider('hat.sh', 'sh-dv/hat.sh', '540d3ccfd2a12b4ed96b78a776c764f899678b6c', 'MIT', '2.3.6', 'source:540d3ccfd2a12b4ed96b78a776c764f899678b6c+deployment/toolbox/Dockerfile.hatsh'),
  omnitools: toolboxProvider('OmniTools', 'iib0011/omni-tools', '922b28ce154e8f22da4a721472889717a95f7562', 'MIT', '0.6.0', 'docker.io/iib0011/omni-tools:0.6.0@sha256:ceb5acc317daf387634f7f212cefe4722fd1243ad1cba74203f25254195b6c69'),
  ittools: toolboxProvider('IT Tools', 'CorentinTh/it-tools', '5732483fc24a6e6818839060bdf3cc7d9d324b9f', 'GPL-3.0', '2024.10.22', 'docker.io/corentinth/it-tools:2024.10.22-7ca5933@sha256:8b8128748339583ca951af03dfe02a9a4d7363f61a216226fc28030731a5a61f'),
  drawio: toolboxProvider('draw.io', 'jgraph/drawio', 'v32.0.2', 'Apache-2.0', '32.0.2-p3 · local files', 'release:v32.0.2+deployment/toolbox/Dockerfile.drawio'),
  miniqr: toolboxProvider('Mini QR', 'lyqht/mini-qr', 'v0.33.0', 'GPL-3.0', '0.33.0', 'release:v0.33.0+deployment/toolbox/Dockerfile.miniqr'),
  searxng: {
    project: 'SearXNG', sourceUrl: 'https://github.com/searxng/searxng',
    reviewedSourceUrl: 'https://github.com/searxng/searxng/tree/d48c4b555421e824342c51d68482dd0898e54d0f',
    license: 'AGPL-3.0-or-later', licenseEvidenceUrls: ['https://github.com/searxng/searxng/blob/4e2c1ea7f468c9d1b16206e9d4079999a2eb0627/LICENSE'],
    selfHostingEvidenceUrl: 'https://docs.searxng.org/admin/installation-docker.html', maintenanceEvidenceUrl: 'https://github.com/searxng/searxng/commits/master/',
    artifactReference: 'docker.io/searxng/searxng:2026.10.4-d48c4b555@sha256:76b0bf285aca014c7191fc4d9234c4bfb358624ac33d8883833d496c059ec072',
    installedVersion: '2026.10.4-d48c4b555 + local log redaction hook', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/services.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-06',
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
  'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'Zlib', 'MIT', 'GPL-3.0', 'GPL-3.0-or-later', 'Apache-2.0', 'Unlicense', 'BSD-3-Clause', 'MPL-2.0',
]);

function toolboxProvider(project: string, repo: string, revision: string, license: ReviewedLicense, installedVersion: string, artifactReference: string): ReviewedFossProvider {
  const sourceUrl = `https://github.com/${repo}`;
  return {
    project, sourceUrl, reviewedSourceUrl: `${sourceUrl}/tree/${revision}`, license,
    licenseEvidenceUrls: [`${sourceUrl}/blob/${revision}/LICENSE`],
    selfHostingEvidenceUrl: `${sourceUrl}/tree/${revision}#readme`,
    maintenanceEvidenceUrl: `${sourceUrl}/commits`, artifactReference, installedVersion,
    integration: artifactReference.startsWith('source:') || artifactReference.startsWith('release:') ? 'source-build' : 'container',
    reviewStatus: 'deployed', reviewDocument: 'docs/toolbox-review.md', role: 'public-application',
    maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-05',
  };
}

function forgeEvaluationProvider(project: string, sourceUrl: string, revision: string, license: ReviewedLicense, licenseFile: string, installedVersion: string, artifactReference: string): ReviewedFossProvider {
  const reviewedSourceUrl = `${sourceUrl}/src/commit/${revision}`;
  return {
    project, sourceUrl, reviewedSourceUrl, license, licenseEvidenceUrls: [`${reviewedSourceUrl}/${licenseFile}`],
    selfHostingEvidenceUrl: `${sourceUrl}#readme`, maintenanceEvidenceUrl: `${sourceUrl}/commits/branch/master`,
    artifactReference, installedVersion, integration: artifactReference.startsWith('source:') ? 'source-build' : 'container',
    reviewStatus: 'staged', reviewDocument: 'docs/toolbox-review.md', role: 'public-application',
    maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-06',
  };
}

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
