export type FossProviderId = 'addy' | 'trip' | 'donetick' | 'beaverhabits' | 'projects' | 'kokoro-web' | 'family-chess' | 'newton' | 'knit' | 'gravity' | 'autoredact' | 'rustpad' | 'moocup' | 'one-file-core' | 'tiddlywiki' | 'newsletters' | 'unfurl' | '13ft' | 'razzia' | 'chhoto' | 'chitchatter' | 'gathio' | 'link-cleaner' | 'calino' | 'radicale' | 'spliit' | 'wishlist' | 'kitchenowl' | 'opengist' | 'linkding' | 'vikunja' | 'bytestash' | 'openresume' | 'moodist' | 'sketchforge' | 'chartdb' | 'drawdb' | 'bookbinder' | 'cryptpad' | 'liberaforms' | 'galene' | 'super-productivity' | 'mapshaper' | 'numbat' | 'wbo' | 'markmap' | 'excalidraw' | 'svgedit' | 'cyberchef' | 'image-scrubber' | 'zip-manager' | 'rawgraphs' | 'audiomass' | 'minipaint' | 'searxng' | 'redlib' | 'freshrss' | 'privatebin' | 'bentopdf' | 'vert' | 'hatsh' | 'omnitools' | 'ittools' | 'drawio' | 'miniqr' | 'rssbridge' | 'ntfy' | 'yopass' | 'pairdrop' | 'uptime-kuma' | 'jupyterlite' | 'whisper-web' | 'reactive-resume' | 'penpot' | 'actual' | 'rallly' | 'breezewiki' | 'wakapi' | 'priviblur' | 'mezzo' | 'fmd' | 'lrclib' | 'libremdb' | 'degoog' | 'fourget' | 'safetwitch' | 'anonymousoverflow' | 'gothub' | 'pollaris' | 'binternet' | 'translite' | 'biblioreads' | 'qr-offline' | 'kittygram' | 'rimgo' | 'mumble';

// Explicit human descriptions below are not SPDX identifiers. They retain the
// verified GNU licence family without inventing an -only / -or-later grant.
// See docs/license-review.md for pinned evidence and the remaining scope question.
export type ReviewedLicense =
  | 'GNU AGPLv3 (version scope unconfirmed)'
  | 'AGPL-3.0-only'
  | 'AGPL-3.0-or-later'
  | 'MIT'
  | 'GNU GPLv3 (version scope unconfirmed)'
  | 'GPL-3.0-only'
  | 'GPL-3.0-or-later'
  | 'GPL-2.0-or-later'
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
  reviewDocument: 'docs/addy-deployment-2026-10-09.md' | 'docs/privatebin-discovery-2026-10-09.md' | 'docs/trip-review-2026-10-09.md' | 'docs/donetick-deployment-2026-10-09.md' | 'docs/beaverhabits-deployment-2026-10-09.md' | 'docs/projects-deployment-2026-10-09.md' | 'docs/kokoro-web-deployment-2026-10-09.md' | 'docs/family-chess-deployment-2026-10-09.md' | 'docs/gravity-deployment-2026-10-09.md' | 'docs/knit-deployment-2026-10-09.md' | 'docs/newton-deployment-2026-10-09.md' | 'docs/autoredact-deployment-2026-10-09.md' | 'docs/rustpad-deployment-2026-10-09.md' | 'docs/moocup-deployment-2026-10-09.md' | 'docs/services.md' | 'docs/toolbox-review.md' | 'docs/service-pack.md' | 'docs/newsletters-deployment-2026-10-09.md' | 'docs/one-file-core-deployment-2026-10-09.md' | 'docs/tiddlywiki-deployment-2026-10-09.md';
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
  addy: { ...browserProvider('addy.io', 'anonaddy/anonaddy', '150983e3331e80bb72b619984dc5e3f5390ddb93', 'AGPL-3.0-or-later', 'LICENSE.md', '1.7.3'), integration: 'container', reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/addy-deployment-2026-10-09.md', artifactReference: 'source:150983e3331e80bb72b619984dc5e3f5390ddb93+deployment/addy/compose.yaml', licenseEvidenceUrls: ['https://github.com/anonaddy/anonaddy/blob/150983e3331e80bb72b619984dc5e3f5390ddb93/LICENSE.md', 'https://github.com/anonaddy/anonaddy/blob/150983e3331e80bb72b619984dc5e3f5390ddb93/composer.json#L8'], selfHostingEvidenceUrl: 'https://github.com/anonaddy/docker/tree/ec7934b4835518fe6a520dedf7ce97464cacd7cd' },
  trip: { ...browserProvider('TRIP', 'itskovacs/trip', '856b1edfe81a735fce4b544c2e16a6518cebf164', 'MIT', 'license.txt', '1.50.1-p2'), reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/trip-review-2026-10-09.md', artifactReference: 'source:856b1edfe81a735fce4b544c2e16a6518cebf164+deployment/trip/restricted.patch' },
  donetick: { ...browserProvider('Donetick', 'donetick/donetick', 'e88d8bea62405ca02288f93dd70efab8c0f1ff2c', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE.md', '0.1.80-p3 · frontend1.2.55'), reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/donetick-deployment-2026-10-09.md', artifactReference: 'source:e88d8bea62405ca02288f93dd70efab8c0f1ff2c+deployment/donetick/backend.patch', licenseEvidenceUrls: ['https://github.com/donetick/donetick/blob/e88d8bea62405ca02288f93dd70efab8c0f1ff2c/LICENSE.md', 'https://github.com/donetick/frontend/blob/19c6a13dbfcfb7bc3110688554a45e29472a17b1/LICENSE.md'] },
  beaverhabits: { ...browserProvider('Beaver Habit Tracker', 'daya0576/beaverhabits', '4b3bc6d64548feb3c0a431d70f307be1117a820c', 'BSD-3-Clause', 'LICENSE', '0.10.0-p7'), reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/beaverhabits-deployment-2026-10-09.md', artifactReference: 'source:4b3bc6d64548feb3c0a431d70f307be1117a820c+deployment/beaverhabits/upstream.patch' },
  projects: { ...browserProvider('La Suite Projects', 'suitenumerique/projects', '455aa274b44e63efa42840997ea4924b43eed533', 'AGPL-3.0-only', 'LICENSE', '1.3.0-455aa274-p2'), reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/projects-deployment-2026-10-09.md', artifactReference: 'source:455aa274b44e63efa42840997ea4924b43eed533+deployment/projects/native-login.patch', licenseEvidenceUrls: ['https://github.com/suitenumerique/projects/blob/455aa274b44e63efa42840997ea4924b43eed533/LICENSE', 'https://github.com/suitenumerique/projects/blob/455aa274b44e63efa42840997ea4924b43eed533/package.json#L10'] },
  'kokoro-web': { ...browserProvider('Kokoro Web', 'eduardolat/kokoro-web', '2cb9d771a549870e7220783a53bdb2e99ed2f421', 'MIT', 'LICENSE', '0.1.3-p1 · local q8 model'), reviewedOn: '2026-10-09', reviewDocument: 'docs/kokoro-web-deployment-2026-10-09.md', artifactReference: 'source:2cb9d771a549870e7220783a53bdb2e99ed2f421+deployment/kokoro-web/local-source.patch' },
  'family-chess': { ...browserProvider('Family Chess', 'kelvinq/family-chess', 'f6e50932df60c531933dab4e07c6642cfee55e2d', 'Apache-2.0', 'LICENSE', 'f6e5093-p1 · Django 5.2.18'), reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/family-chess-deployment-2026-10-09.md', artifactReference: 'source:f6e50932df60c531933dab4e07c6642cfee55e2d+deployment/family-chess/source.patch' },
  rustpad: { ...browserProvider('Rustpad', 'ekzhang/rustpad', '54e4a9383c84d7317af42a7ddb177ce8bcba058d', 'MIT', 'LICENSE', '54e4a93-p1 · temporary shared editor'), reviewStatus: 'deployed', reviewedOn: '2026-10-09', reviewDocument: 'docs/rustpad-deployment-2026-10-09.md', artifactReference: 'source:54e4a9383c84d7317af42a7ddb177ce8bcba058d+deployment/rustpad/apply-patches.py' },
  autoredact: { ...browserProvider('AutoRedact', 'karant-dev/AutoRedact', '360fc18b976b9278b73d00e2c49e26c76de6557a', 'GPL-3.0-only', 'LICENSE', '2.1.3-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/autoredact-deployment-2026-10-09.md', artifactReference: 'source:360fc18b976b9278b73d00e2c49e26c76de6557a+deployment/toolbox/autoredact/local-source.patch', licenseEvidenceUrls: ['https://github.com/karant-dev/AutoRedact/blob/360fc18b976b9278b73d00e2c49e26c76de6557a/LICENSE', 'https://github.com/karant-dev/AutoRedact/blob/360fc18b976b9278b73d00e2c49e26c76de6557a/package.json#L18'] },
  gravity: { ...browserProvider('Gravity', 'qunabu/Gravity', '28e912b8f6808a4bf892fa0f1ffacf857b0faa3a', 'GNU GPLv3 (version scope unconfirmed)', 'LICENSE', '1.0.0-28e912b-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/gravity-deployment-2026-10-09.md', artifactReference: 'source:28e912b8f6808a4bf892fa0f1ffacf857b0faa3a+deployment/toolbox/gravity/local-source.patch', licenseEvidenceUrls: ['https://github.com/qunabu/Gravity/blob/28e912b8f6808a4bf892fa0f1ffacf857b0faa3a/LICENSE', 'https://github.com/qunabu/Gravity/blob/28e912b8f6808a4bf892fa0f1ffacf857b0faa3a/package.json#L15'] },
  knit: { ...browserProvider('Knit', 'alefore/knit', '42be1d858273e2e1dad3c6b379a4219057b5176d', 'GNU GPLv3 (version scope unconfirmed)', 'LICENSE', '1.0.0-42be1d8-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/knit-deployment-2026-10-09.md', artifactReference: 'source:42be1d858273e2e1dad3c6b379a4219057b5176d+deployment/knit/local-static.patch', licenseEvidenceUrls: ['https://github.com/alefore/knit/blob/42be1d858273e2e1dad3c6b379a4219057b5176d/LICENSE', 'https://github.com/alefore/knit/blob/42be1d858273e2e1dad3c6b379a4219057b5176d/package.json#L15'] },
  newton: { ...browserProvider('NewTon DC Tournament Manager', 'skrodahl/NewTon', '226d6080ea40e1dcc67c628e355bc826a7848858', 'BSD-3-Clause', 'LICENSE', '5.4.0-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/newton-deployment-2026-10-09.md', artifactReference: 'source:226d6080ea40e1dcc67c628e355bc826a7848858+deployment/newton/local-static.patch' },
  moocup: { ...browserProvider('Moocup', 'jellydeck/moocup', '70623d81ba502a464fdd2b98c6c21b1c5ab973bc', 'MIT', 'LICENSE', '1.0.50-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/moocup-deployment-2026-10-09.md', artifactReference: 'source:70623d81ba502a464fdd2b98c6c21b1c5ab973bc+deployment/toolbox/moocup/local-source.patch' },
  'one-file-core': { ...browserProvider('The One File Core', 'gelatinescreams/The-One-File', 'b988be00cc35fe1a7d7756543b326287f2e4ebf5', 'Unlicense', 'LICENSE', '4.1.5-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/one-file-core-deployment-2026-10-09.md', artifactReference: 'source:b988be00cc35fe1a7d7756543b326287f2e4ebf5+deployment/one-file-core/standalone.patch' },
  tiddlywiki: { ...browserProvider('TiddlyWiki', 'TiddlyWiki/TiddlyWiki5', 'd391595836e2aead565480763f9bf9eb52e29e75', 'BSD-3-Clause', 'license', '5.4.1-p1'), reviewedOn: '2026-10-09', reviewDocument: 'docs/tiddlywiki-deployment-2026-10-09.md', artifactReference: 'source:d391595836e2aead565480763f9bf9eb52e29e75+deployment/tiddlywiki/build.py' },
  newsletters: { ...browserProvider('Kill the Newsletter!', 'leafac/kill-the-newsletter', 'c2d7cf8f7d9927fd19a36ea9beaf0ced67afcefc', 'MIT', 'LICENSE.md', '2.1.3-p2 web · p1 SMTP/jobs'), reviewedOn: '2026-10-09', reviewDocument: 'docs/newsletters-deployment-2026-10-09.md', artifactReference: 'source:c2d7cf8f7d9927fd19a36ea9beaf0ced67afcefc+deployment/newsletters/operator-copy.patch' },
  unfurl: { ...browserProvider('Unfurl', 'RyanDFIR/unfurl', '42aecfdc2407e82faf6d7acdc611f7d697fa2524', 'Apache-2.0', 'LICENSE', '2026.10-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:42aecfdc2407e82faf6d7acdc611f7d697fa2524+deployment/unfurl/source.patch' },
  '13ft': { ...browserProvider('13ft', 'wasi-master/13ft', 'd03b120c41d2558d3ce2a45e049ccbea8785ff7a', 'MIT', 'LICENSE', '0.5.0-public1'), reviewedOn: '2026-10-09', artifactReference: 'source:d03b120c41d2558d3ce2a45e049ccbea8785ff7a+deployment/13ft/public-reader.patch' },
  razzia: { ...browserProvider('Razzia', 'Ralex91/Razzia', '277a33849827c0847ec85e99f2135888f72bd0c1', 'MIT', 'LICENSE', '3.1.0-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:277a33849827c0847ec85e99f2135888f72bd0c1+deployment/razzia/security-dependencies.patch' },
  chhoto: { ...browserProvider('Chhoto URL', 'SinTan1729/chhoto-url', 'e18a8a0111e94be03145e95c30dcd7f41891633d', 'MIT', 'LICENSE', '7.8.3-p3'), reviewedOn: '2026-10-09', artifactReference: 'source:e18a8a0111e94be03145e95c30dcd7f41891633d+deployment/chhoto/no-analytics-local-assets.patch+deployment/chhoto/layout.patch' },
  chitchatter: { ...browserProvider('Chitchatter', 'jeremyckahn/chitchatter', '23b62a8d95be003e490e5a050335e1dea4b79cc7', 'GPL-2.0-or-later', 'package.json', '23b62a8-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:23b62a8d95be003e490e5a050335e1dea4b79cc7+deployment/chitchatter/source.patch' },
  gathio: { ...browserProvider('Gathio', 'lowercasename/gathio', '98a5e9b719120e2f3e72f712a78c97fba1eff8e7', 'GPL-3.0-or-later', 'LICENSE', '1.6.7-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:98a5e9b719120e2f3e72f712a78c97fba1eff8e7+deployment/calendar/gathio/privacy-security.patch' },
  'link-cleaner': { ...browserProvider('URL Parameter Cleaner', 'loganpendragonmultiverse/url-parameter-cleaner', '3b114cc94f728f0a6a3bed1e30fb63345abe5df4', 'MIT', 'LICENSE', '1.1.0-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:3b114cc94f728f0a6a3bed1e30fb63345abe5df4+deployment/link-cleaner/source.patch' },
  calino: { ...browserProvider('Calino', 'Ivan-Malinovski/calino', '20a41e0d7b498e607cf8a5011bb8b14f506eaf79', 'MIT', 'LICENSE', '0.39.1-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:20a41e0d7b498e607cf8a5011bb8b14f506eaf79+deployment/calendar/calino-browser-ai.patch' },
  radicale: { ...toolboxProvider('Radicale', 'Kozea/Radicale', 'd2ca557a6270b6a3a510572372f794df27cb9b89', 'GPL-3.0-or-later', '3.8.3', 'source:d2ca557a6270b6a3a510572372f794df27cb9b89+deployment/calendar/Dockerfile.radicale'), reviewedOn: '2026-10-09', licenseEvidenceUrls: ['https://github.com/Kozea/Radicale/blob/d2ca557a6270b6a3a510572372f794df27cb9b89/COPYING.md', 'https://github.com/Kozea/Radicale/blob/d2ca557a6270b6a3a510572372f794df27cb9b89/radicale/config.py'] },
  spliit: { ...toolboxProvider('Spliit', 'spliit-app/spliit', 'd3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a', 'MIT', '1.29.0-p1', 'source:d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a+deployment/spliit/rebuild.sh'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },
  wishlist: { ...toolboxProvider('Wishlist', 'cmintey/wishlist', 'a5150c73620abb912a802afdcfb51e403230fff3', 'MIT', '0.67.1-p2', 'source:a5150c73620abb912a802afdcfb51e403230fff3+deployment/wishlist/rebuild.sh'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },
  kitchenowl: { ...toolboxProvider('KitchenOwl', 'TomBursch/kitchenowl', '09aaf5fbd2343fcc10b12e906c63c3764dd38919', 'GNU AGPLv3 (version scope unconfirmed)', '0.7.10-p1', 'source:09aaf5fbd2343fcc10b12e906c63c3764dd38919+deployment/kitchenowl/Dockerfile'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },
  opengist: { ...toolboxProvider('Opengist', 'thomiceli/opengist', '5afef9ac76d2d69ba11a888bb7a095b1d14e7c9d', 'GNU AGPLv3 (version scope unconfirmed)', '1.15.2', 'ghcr.io/thomiceli/opengist:1.15.2@sha256:7edc91273ee7d10a17406da8a08c803158baaff984c39b789c1313473d068f21'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },
  linkding: { ...toolboxProvider('linkding', 'sissbruecker/linkding', '24b5ad6cc9bde497b5d1b1e86aed5a2fb7d25c2f', 'MIT', '1.47.0', 'sissbruecker/linkding:1.47.0@sha256:e35cb50e0581178f245125ffaa909c565416c94c9f22ace305a7d234a4345522'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },
  vikunja: { ...toolboxProvider('Vikunja', 'go-vikunja/vikunja', 'a16be96aa454671fdf213b0fbe411dd38a098418', 'AGPL-3.0-or-later', '2.7.0', 'vikunja/vikunja:2.7.0@sha256:e2204a1c1c6a81e833c2b3a5442be182ca2335b54c2e7e37578cc3fe12a27cfc'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },
  bytestash: { ...toolboxProvider('ByteStash', 'jordan-dalby/ByteStash', '72adce8872414e4a11ea193d4374309f72b3990c', 'GNU GPLv3 (version scope unconfirmed)', '1.5.14-p1', 'source:72adce8872414e4a11ea193d4374309f72b3990c+deployment/community/bytestash/privacy.patch'), reviewedOn: '2026-10-09', reviewStatus: 'deployed', licenseEvidenceUrls: ['https://github.com/jordan-dalby/ByteStash/blob/72adce8872414e4a11ea193d4374309f72b3990c/LICENSE', 'https://github.com/jordan-dalby/ByteStash/blob/72adce8872414e4a11ea193d4374309f72b3990c/client/package.json#L4', 'https://github.com/jordan-dalby/ByteStash/blob/72adce8872414e4a11ea193d4374309f72b3990c/server/package.json#L13'] },
  openresume: { ...toolboxProvider('OpenResume', 'xitanggg/open-resume', '4f8255a2c763479837f69f1dccf2a3338730cd79', 'GNU AGPLv3 (version scope unconfirmed)', '4f8255a-p1', 'source:4f8255a2c763479837f69f1dccf2a3338730cd79+deployment/community/openresume/build.py'), reviewedOn: '2026-10-09', reviewStatus: 'deployed' },

  moodist: { ...browserProvider('Moodist', 'remvze/moodist', '11c0be2200116a3635880d600fd6953899cc51a3', 'MIT', 'LICENSE', '3.1.1-p2'), reviewedOn: '2026-10-10', artifactReference: 'source:11c0be2200116a3635880d600fd6953899cc51a3+deployment/toolbox/moodist-local-source.patch' },
  sketchforge: { ...browserProvider('SketchForge 3D', 'Formsmith746/SketchForge-3D', 'e9cb8e8681f92e12f6044e046046cf1d363f6811', 'AGPL-3.0-only', 'LICENSE', '1.0.9-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:e9cb8e8681f92e12f6044e046046cf1d363f6811+deployment/toolbox/sketchforge-local-source.patch' },
  chartdb: { ...browserProvider('ChartDB', 'chartdb/chartdb', 'c24936a402bb3e24b4858f05282d69a04fcfe25b', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE', '1.20.1-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:c24936a402bb3e24b4858f05282d69a04fcfe25b+deployment/toolbox/chartdb-local-source.patch' },

  drawdb: { ...browserProvider('drawDB', 'drawdb-io/drawdb', 'e4e696f2d2b1a17ac99ad1d062927582ff994a3c', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE', '1.8.2-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:e4e696f2d2b1a17ac99ad1d062927582ff994a3c+deployment/toolbox/drawdb-local-source.patch' },
  bookbinder: { ...browserProvider('Bookbinder JS', 'momijizukamori/bookbinder-js', '7df532dc29f6bbf4204d62796f4ff537594f5097', 'MPL-2.0', 'LICENSE', '1.7.0-p1'), reviewedOn: '2026-10-09', artifactReference: 'source:7df532dc29f6bbf4204d62796f4ff537594f5097+deployment/toolbox/bookbinder-local-source.patch' },
  cryptpad: { ...browserProvider('CryptPad', 'cryptpad/cryptpad', 'c4a257e46919ba2e4e710c26f7e5dc067686e2b5', 'AGPL-3.0-or-later', 'LICENSE', '2026.9.0 · Office 9.3.2+3'), reviewedOn: '2026-10-08', reviewDocument: 'docs/service-pack.md', artifactReference: 'source:c4a257e46919ba2e4e710c26f7e5dc067686e2b5+deployment/pack/prepare-cryptpad.mjs' },
  liberaforms: { ...forgeEvaluationProvider('LiberaForms', 'https://codeberg.org/LiberaForms/server', '4d5967411a8c53742501c84142cdcf9aeca0860e', 'AGPL-3.0-or-later', 'LICENSES/AGPL-3.0-or-later.txt', '4.11.1-p5 · encrypted answers; invited creators', 'source:4d5967411a8c53742501c84142cdcf9aeca0860e+deployment/pack/Dockerfile.liberaforms'), reviewedOn: '2026-10-08', reviewStatus: 'deployed', reviewDocument: 'docs/service-pack.md' },
  galene: { ...browserProvider('Galene', 'jech/galene', '6d9338e909fdecdd906150e4dda34e10d9869654', 'MIT', 'LICENCE', '1.2.1 · invited four-person meetings'), reviewedOn: '2026-10-08', reviewStatus: 'deployed', reviewDocument: 'docs/service-pack.md', artifactReference: 'source:6d9338e909fdecdd906150e4dda34e10d9869654+deployment/pack/Dockerfile.galene' },
  'super-productivity': { ...browserProvider('Super Productivity', 'super-productivity/super-productivity', '42ded9f31a132bf92633b0c78ad4ebf1d87c0f71', 'MIT', 'LICENSE', '19.1.0-p1 · local-data web application'), reviewDocument: 'docs/service-pack.md', reviewedOn: '2026-10-08', artifactReference: 'source:42ded9f31a132bf92633b0c78ad4ebf1d87c0f71+deployment/pack/prepare-static.mjs', reviewStatus: 'deployed' },
  mapshaper: { ...browserProvider('Mapshaper', 'mbloch/mapshaper', '9e39193444f70a48eeffda20d8d44f82567e6d54', 'MPL-2.0', 'LICENSE', '0.7.80-p1 · local geographic files; no basemaps'), reviewDocument: 'docs/service-pack.md', artifactReference: 'source:9e39193444f70a48eeffda20d8d44f82567e6d54+deployment/pack/prepare-static.mjs' },
  numbat: { ...browserProvider('Numbat', 'sharkdp/numbat', '79046422203060e296da41c8c762c506200d2c93', 'MIT', 'LICENSE-MIT', '1.24.0-p1 · local units; explicit sharing; no currency rates'), reviewDocument: 'docs/service-pack.md', artifactReference: 'source:79046422203060e296da41c8c762c506200d2c93+deployment/pack/prepare-static.mjs', licenseEvidenceUrls: ['https://github.com/sharkdp/numbat/blob/79046422203060e296da41c8c762c506200d2c93/LICENSE-MIT', 'https://github.com/sharkdp/numbat/blob/79046422203060e296da41c8c762c506200d2c93/LICENSE-APACHE'] },
  wbo: { ...toolboxProvider('WBO', 'lovasoa/whitebophir', 'f37875a6b427397e579e2a869caf073ae87ee264', 'AGPL-3.0-or-later', '2.9.0-p3 · temporary shared whiteboard', 'source:f37875a6b427397e579e2a869caf073ae87ee264+deployment/community/wbo'), reviewedOn: '2026-10-09' },
  markmap: { ...browserProvider('Markmap', 'markmap/markmap', '205367a24603dc187f67da1658940c6cade20dce', 'MIT', 'LICENSE', '0.18.12-p1 · restricted editor; AGPL-3.0-or-later Utilibre integration'), artifactReference: 'source:205367a24603dc187f67da1658940c6cade20dce+deployment/toolbox/markmap', reviewStatus: 'deployed' },
  excalidraw: creativeProvider('Excalidraw', 'excalidraw/excalidraw', '53973c3a423fbd75a4ce68107786b4fcb90e4968', 'MIT', 'LICENSE', '53973c3-p1 · local-only'),
  svgedit: creativeProvider('SVGEdit', 'SVG-Edit/svgedit', 'c44f061d2f9a626d2771cc931298af5a45522d87', 'MIT', 'LICENSE-MIT.txt', '7.4.2-p1 · includes Apache-2.0, ISC, LGPL-3.0-or-later and X11 components'),
  cyberchef: creativeProvider('CyberChef', 'gchq/CyberChef', '8cd426dd4f40f1423912d5fad91b578a86a65112', 'Apache-2.0', 'LICENSE', '11.5.0-p1 · network operations and RSA Verify disabled'),
  'image-scrubber': creativeProvider('Image Scrubber', 'everestpipkin/image-scrubber', '390b166cfc61326476ed9d6cb376291f87e35c23', 'MIT', 'LICENSE', '390b166-p1 · metadata display security fixes'),
  'zip-manager': browserProvider('ZIP Manager', 'gildas-lormeau/zip-manager', '3b77a599d823691cc3b7b81e0715b4655423e578', 'MIT', 'LICENSE.txt', '3b77a59-p1'),
  rawgraphs: browserProvider('RAWGraphs', 'rawgraphs/rawgraphs-app', 'b7b2909111cc029ccf418dc3e7d079e0f4c50d6f', 'Apache-2.0', 'LICENSE', '2.0.1-p1 · local data only'),
  audiomass: browserProvider('AudioMass', 'pkalogiros/AudioMass', '21f5ee1362a47be6f0dbe6e4969a15e43d21b044', 'MIT', 'LICENSE', '21f5ee1-p1'),
  minipaint: browserProvider('miniPaint', 'viliusle/miniPaint', 'a79733eb803fc97084ef0ee4faa96b031e69e1c0', 'MIT', 'MIT-LICENSE.txt', '4.14.3-p1 · local images and fonts'),
  lrclib: { ...toolboxProvider('LRCLIB', 'tranxuanthang/lrclib-homepage', 'f37c07042be1af5fdcc7932d090af32141089751', 'MIT', 'f37c070-p3 · cached read-only API · replaces Dumb', 'source:f37c07042be1af5fdcc7932d090af32141089751+deployment/community/lrclib-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  kittygram: { ...forgeEvaluationProvider('Kittygram', 'https://codeberg.org/irelephant/kittygram', '5931c21c0990d4b216e97166dd78c03c9965567a', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE', '5931c21-p1 · public profile/post/video tested', 'source:5931c21c0990d4b216e97166dd78c03c9965567a+deployment/community/kittygram-source.patch'), reviewStatus: 'deployed' },
  rimgo: forgeEvaluationProvider('Rimgo', 'https://codeberg.org/rimgo/rimgo', 'd2be8e221522dfe7a06452e2002dcf6dad569d1a', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE', 'd2be8e2-p3 · shared cooldown · Imgur media rate-limited', 'source:d2be8e221522dfe7a06452e2002dcf6dad569d1a+deployment/community/rimgo-source.patch'),
  mumble: { ...toolboxProvider('Mumble', 'mumble-voip/mumble', 'v1.5.915', 'BSD-3-Clause', '1.5.915 · password-protected · TCP voice and UDP loopback verified', 'mumblevoip/mumble-server:v1.5.915@sha256:018ad3515932e513d8fdc970df918373a2664c4da32b09a89a4aaee28eb7507a'), reviewStatus: 'deployed' },
  'qr-offline': { ...toolboxProvider('QR Generator Offline', 'jmarc9901/qr-code-generator-pwa', '0fde7004a08aac6a218e5d5e03c8a3c760eec1fa', 'MIT', '0fde700-p4 · localized options and offline controls', 'source:0fde7004a08aac6a218e5d5e03c8a3c760eec1fa+deployment/community/qr-offline-source.patch+deployment/community/prepare-qr-offline.mjs'), reviewStatus: 'deployed', integration: 'source-build' },
  biblioreads: { ...toolboxProvider('BiblioReads', 'nesaku/BiblioReads', '9508abc64c6b35eef366e041fef47554f0ee888a', 'AGPL-3.0-or-later', '4.1.1-p1 · Node 24 · local library', 'source:9508abc64c6b35eef366e041fef47554f0ee888a+deployment/community/biblioreads-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  translite: { ...forgeEvaluationProvider('TransLite', 'https://codeberg.org/gospodin/translite', '7b4b8e51359338219463f14c2a06211b6998a11e', 'Unlicense', 'LICENSE', '7b4b8e5-p3 · PHP 8.5 · four tested providers', 'source:7b4b8e51359338219463f14c2a06211b6998a11e+deployment/community/translite-source.patch'), reviewStatus: 'deployed' },
  binternet: { ...toolboxProvider('Binternet', 'Ahwxorg/Binternet', '9bb70ef26c8b79a315e77b79bfd346433d55cbb6', 'GNU GPLv3 (version scope unconfirmed)', '9bb70ef-p1 · HTTPS and Tor access', 'source:9bb70ef26c8b79a315e77b79bfd346433d55cbb6+deployment/community/binternet-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
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
  degoog: { ...toolboxProvider('DeGoog', 'degoog-org/degoog', '4a9bcc74f0fceaa33efbab4777f063274cce23d6', 'GNU AGPLv3 (version scope unconfirmed)', '1.0.0 · four native SearXNG engines', 'ghcr.io/degoog-org/degoog:1.0.0@sha256:e1ce8ee724a4514d269b74088424e579322bdfcf718256c1c5dd2cbb5aaf510c'), reviewStatus: 'deployed' },
  anonymousoverflow: { ...toolboxProvider('AnonymousOverflow', 'httpjamesm/AnonymousOverflow', '937cfeefd6dcbab92ef572671f16d4d3be6abad3', 'MPL-2.0', '937cfee-p1 · hardened build', 'source:937cfeefd6dcbab92ef572671f16d4d3be6abad3+deployment/community/anonymousoverflow-source.patch'), reviewStatus: 'deployed', integration: 'source-build' },
  fourget: { ...forgeEvaluationProvider('4get', 'https://git.lolcat.ca/lolcat/4get', '03ba5d7b5ed3dc91b3e7d8b6278d8f52818a99ae', 'AGPL-3.0-only', 'license.txt', '03ba5d7-p2 · hardened build', 'source:03ba5d7b5ed3dc91b3e7d8b6278d8f52818a99ae+deployment/community/fourget-source.patch'), reviewStatus: 'deployed' },
  safetwitch: { ...forgeEvaluationProvider('SafeTwitch', 'https://codeberg.org/SafeTwitch/safetwitch', 'ddee63ebbe8b7b74d8f6ed3869cd7958934746d7', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE', 'ddee63e-p2 · hardened build', 'source:ddee63ebbe8b7b74d8f6ed3869cd7958934746d7+deployment/community/safetwitch-source.patch'), reviewStatus: 'deployed' },
  gothub: { ...forgeEvaluationProvider('GotHub', 'https://codeberg.org/gothub/gothub', '24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2', 'GNU AGPLv3 (version scope unconfirmed)', 'LICENSE', '24bedc8-p2 · public reader · static compression fixed', 'source:24bedc80bed5fc4f72a8f140c97cb38fc2e67ed2+deployment/community/gothub-source.patch'), reviewStatus: 'deployed' },
  'reactive-resume': toolboxProvider('Reactive Resume', 'reactive-resume/reactive-resume', 'bc71f636c02a80ac6d731e17d2ee13501275295c', 'MIT', '6.0.0-p1 · visitor analytics disabled', 'ghcr.io/reactive-resume/reactive-resume:v6.0.0@sha256:29f418bd46d23f1d7cd9a73ec7f6bc46681926cb1ff617ac388064f45ee790d0+deployment/expanded/Dockerfile.resume'),
  penpot: toolboxProvider('Penpot', 'penpot/penpot', 'cf46b53bcb61c2a9be8f202bec03647a5470d43d', 'MPL-2.0', '2.18.2 · approved-account pilot', 'penpotapp/frontend:2.18.2@sha256:3619f48cbdd0c9197ad23bd3db1c9b4391d7c9c3137e22e806cd7f9c945c1c8e'),
  actual: { ...toolboxProvider('Actual Budget', 'actualbudget/actual', 'v26.10.0', 'MIT', '26.10.0 · approved-account pilot', 'actualbudget/actual-server:26.10.0@sha256:24645e971da6bb1a1f953d6859e307a0b29be1e8b4130a35b3220c209b5b860c'), licenseEvidenceUrls: ['https://github.com/actualbudget/actual/blob/v26.10.0/LICENSE.txt'] },
  rallly: { ...toolboxProvider('Rallly', 'lukevella/rallly', '4b61a00b1abcbe480d6b3992b5d98b01754e90c6', 'AGPL-3.0-or-later', '4.15.4 · approved-account organizers', 'lukevella/rallly:4.15.4@sha256:8f29eccdc2fbb856001ea3c97d1c1d85556095274ad21a8de0c0125f29303938'), reviewedOn: '2026-10-08', licenseEvidenceUrls: ['https://github.com/lukevella/rallly/blob/4b61a00b1abcbe480d6b3992b5d98b01754e90c6/LICENSE', 'https://github.com/lukevella/rallly/blob/4b61a00b1abcbe480d6b3992b5d98b01754e90c6/README.md#-license'] },
  priviblur: toolboxProvider('Priviblur', 'syeopite/priviblur', '251a8e67c64d792b3c8c141860ccaa227ce62e4d', 'GNU AGPLv3 (version scope unconfirmed)', '251a8e6 · security dependency updates', 'source:251a8e67c64d792b3c8c141860ccaa227ce62e4d+deployment/community/Dockerfile.priviblur'),
  mezzo: {
    ...toolboxProvider('Mezzo', 'fsky/mezzo', 'v1.4.0', 'AGPL-3.0-or-later', '1.4.0', 'gitfield.org/fsky/mezzo@sha256:f8643c2525c96b3c5708bb737f71759bfc4c01a745301a8a7dbcba609f9c6416'),
    sourceUrl: 'https://gitfield.org/fsky/mezzo', reviewedSourceUrl: 'https://gitfield.org/fsky/mezzo/src/commit/9cb99bd6a8570bb104021a094b1e598c8dda49db',
    licenseEvidenceUrls: ['https://gitfield.org/fsky/mezzo/src/tag/v1.4.0/LICENSE'],
    selfHostingEvidenceUrl: 'https://gitfield.org/fsky/mezzo#run-your-own-instance', maintenanceEvidenceUrl: 'https://gitfield.org/fsky/mezzo/releases', reviewStatus: 'deployed',
  },
  fmd: {
    ...toolboxProvider('FMD Server', 'fmd-foss/fmd-server', 'v0.17.0', 'GPL-3.0-or-later', '0.17.0-p2 · native API; corrected CSV export and local privacy notes', 'registry.gitlab.com/fmd-foss/fmd-server@sha256:e4a7f5538aa3febe938159ee2db337ccdb50d340d7009784c5a851f152df48e0+deployment/community/prepare-fmd-web.mjs'),
    sourceUrl: 'https://gitlab.com/fmd-foss/fmd-server', reviewedSourceUrl: 'https://gitlab.com/fmd-foss/fmd-server/-/tree/v0.17.0',
    licenseEvidenceUrls: ['https://gitlab.com/fmd-foss/fmd-server/-/blob/v0.17.0/LICENSE'],
    selfHostingEvidenceUrl: 'https://fmd-foss.org/docs/fmd-server/installation/overview/', maintenanceEvidenceUrl: 'https://gitlab.com/fmd-foss/fmd-server/-/tags', reviewStatus: 'deployed',
  },
  wakapi: { ...toolboxProvider('Wakapi', 'muety/wakapi', '347f1f45ae2863d9499236471317a76630c5308f', 'MIT', '2.18.1 · local copy and empty-state fixes', 'source:347f1f45ae2863d9499236471317a76630c5308f+deployment/expanded/Dockerfile.wakapi'), integration: 'source-build' },
  breezewiki: {
    project: 'BreezeWiki', sourceUrl: 'https://gitdab.com/cadence/breezewiki',
    reviewedSourceUrl: 'https://gitdab.com/cadence/breezewiki/src/commit/6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4',
    license: 'GNU AGPLv3 (version scope unconfirmed)', licenseEvidenceUrls: ['https://gitdab.com/cadence/breezewiki/src/commit/6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4/LICENSE'],
    selfHostingEvidenceUrl: 'https://docs.breezewiki.com/Running_BreezeWiki.html', maintenanceEvidenceUrl: 'https://gitdab.com/cadence/breezewiki/commits/branch/master',
    artifactReference: 'source:6d09507b6e7ecec0cbac4c2c4eb223c10ccc23a4+deployment/expanded/breezewiki-source.patch',
    installedVersion: '6d09507-p3 · native tabs fixed; image CDN still denies requests',
    integration: 'source-build', reviewStatus: 'deployed', reviewDocument: 'docs/toolbox-review.md', role: 'public-application',
    maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-09',
  },
  jupyterlite: { ...toolboxProvider('JupyterLite', 'jupyterlite/jupyterlite', 'bf64167c041060af9025f5c5b5485f871fe90bb6', 'BSD-3-Clause', '0.8.5-p5 · kernel 0.8.6 · local Pyodide 314.0.6', 'source:bf64167c041060af9025f5c5b5485f871fe90bb6+deployment/expanded/Dockerfile.jupyter'), reviewedOn: '2026-10-08', reviewDocument: 'docs/service-pack.md', licenseEvidenceUrls: ['https://github.com/jupyterlite/jupyterlite/blob/bf64167c041060af9025f5c5b5485f871fe90bb6/LICENSE'] },
  'whisper-web': toolboxProvider('Whisper Web', 'xenova/whisper-web', '81869ed62970ff4373509b6004a6c9a3f0c5b64d', 'MIT', '81869ed-p3 · local models pilot', 'source:81869ed62970ff4373509b6004a6c9a3f0c5b64d+deployment/expanded/whisper-source.patch'),
  rssbridge: { ...toolboxProvider('RSS-Bridge', 'RSS-Bridge/rss-bridge', 'b39964cee3e4b0babe739d47a604c2323fd270f0', 'Unlicense', '2025-08-05', 'rssbridge/rss-bridge:2025-08-05@sha256:569f01f3faecd0d34d702e01b34eb0a769f7bedb84caf6dff29821d18b46f971'), licenseEvidenceUrls: ['https://github.com/RSS-Bridge/rss-bridge/blob/b39964cee3e4b0babe739d47a604c2323fd270f0/UNLICENSE'] },
  ntfy: toolboxProvider('ntfy', 'binwiederhier/ntfy', '10cb6506f836dbb00bb77e3b52669f6ace37f555', 'Apache-2.0', '2.28.0', 'binwiederhier/ntfy:v2.28.0@sha256:6ef4b819f722fccdc036af611c4774cfdc2de821ab74fdd48bbf4c9d6f8973da'),
  yopass: toolboxProvider('Yopass', 'jhaals/yopass', '34d8bbcc4aac14dbf326d46dc69d26895b7f5282', 'Apache-2.0', '14.10.0', 'jhaals/yopass:14.10.0@sha256:6c33d9c813f77bae70787e1bce76710840ff654f454998b01f8dacc0a7988fd3'),
  pairdrop: { ...toolboxProvider('PairDrop', 'schlagmichdoch/PairDrop', '4862ba3067be1a0f2e0d1e94861dc9200b5bfeea', 'GNU GPLv3 (version scope unconfirmed)', '1.11.2', 'ghcr.io/schlagmichdoch/pairdrop:v1.11.2@sha256:c4b30977264a76e335740089e693a52a0d0d616330dec7f93c7b96beef7b4a02'), licenseEvidenceUrls: ['https://github.com/schlagmichdoch/PairDrop/blob/4862ba3067be1a0f2e0d1e94861dc9200b5bfeea/LICENSE', 'https://github.com/schlagmichdoch/PairDrop/blob/4862ba3067be1a0f2e0d1e94861dc9200b5bfeea/package.json#L12'] },
  'uptime-kuma': toolboxProvider('Uptime Kuma', 'louislam/uptime-kuma', 'c98982ac60eccb74cdab1d04c30e18057895ce87', 'MIT', '2.5.5', 'louislam/uptime-kuma:2.5.5@sha256:c74379ac4509ce2d2c2633f509e67003ee2e45b6e995c5e43fc101f45a0e1fbe'),
  bentopdf: { ...toolboxProvider('BentoPDF', 'alam00000/bentopdf', 'f96cd4e5166f3d51393dfe9f3c440b5bb77802f1', 'AGPL-3.0-only', '2.8.8-p3 · local PDF/OCR runtimes', 'source:f96cd4e5166f3d51393dfe9f3c440b5bb77802f1+deployment/toolbox/Dockerfile.bentopdf'), integration: 'source-build', reviewedOn: '2026-10-08', reviewDocument: 'docs/service-pack.md', licenseEvidenceUrls: ['https://github.com/alam00000/bentopdf/blob/f96cd4e5166f3d51393dfe9f3c440b5bb77802f1/LICENSE', 'https://github.com/alam00000/bentopdf/blob/f96cd4e5166f3d51393dfe9f3c440b5bb77802f1/package.json'] },
  vert: toolboxProvider('VERT', 'VERT-sh/VERT', 'c7b9f3921d6f8722c1dc1515799b461622777068', 'GNU AGPLv3 (version scope unconfirmed)', 'c7b9f39 · local processing build', 'source:c7b9f3921d6f8722c1dc1515799b461622777068+deployment/toolbox/Dockerfile.vert'),
  hatsh: toolboxProvider('hat.sh', 'sh-dv/hat.sh', '540d3ccfd2a12b4ed96b78a776c764f899678b6c', 'MIT', '2.3.6', 'source:540d3ccfd2a12b4ed96b78a776c764f899678b6c+deployment/toolbox/Dockerfile.hatsh'),
  omnitools: { ...toolboxProvider('OmniTools', 'iib0011/omni-tools', '922b28ce154e8f22da4a721472889717a95f7562', 'MIT', '0.6.0-p6 · local runtimes; secure password generator', 'docker.io/iib0011/omni-tools:0.6.0@sha256:ceb5acc317daf387634f7f212cefe4722fd1243ad1cba74203f25254195b6c69+deployment/toolbox/Dockerfile.omnitools'), reviewedOn: '2026-10-08', reviewDocument: 'docs/service-pack.md' },
  ittools: toolboxProvider('IT Tools', 'CorentinTh/it-tools', '5732483fc24a6e6818839060bdf3cc7d9d324b9f', 'GNU GPLv3 (version scope unconfirmed)', '2024.10.22-p2 · secure token generator', 'docker.io/corentinth/it-tools:2024.10.22-7ca5933@sha256:8b8128748339583ca951af03dfe02a9a4d7363f61a216226fc28030731a5a61f+deployment/toolbox/Dockerfile.ittools'),
  drawio: toolboxProvider('draw.io', 'jgraph/drawio', 'v32.0.2', 'Apache-2.0', '32.0.2-p3 · local files', 'release:v32.0.2+deployment/toolbox/Dockerfile.drawio'),
  miniqr: toolboxProvider('Mini QR', 'lyqht/mini-qr', 'fe46504853c597e44b2e39d3decb5df2184c6605', 'GNU GPLv3 (version scope unconfirmed)', '0.33.0', 'release:v0.33.0+deployment/toolbox/Dockerfile.miniqr'),
  searxng: {
    project: 'SearXNG', sourceUrl: 'https://github.com/searxng/searxng',
    reviewedSourceUrl: 'https://github.com/searxng/searxng/tree/6671d89bede8c9fc108b17bb98916170f5657650',
    license: 'AGPL-3.0-or-later', licenseEvidenceUrls: ['https://github.com/searxng/searxng/blob/6671d89bede8c9fc108b17bb98916170f5657650/LICENSE', 'https://github.com/searxng/searxng/blob/6671d89bede8c9fc108b17bb98916170f5657650/searx/__init__.py#L1'],
    selfHostingEvidenceUrl: 'https://docs.searxng.org/admin/installation-docker.html', maintenanceEvidenceUrl: 'https://github.com/searxng/searxng/commits/master/',
    artifactReference: 'docker.io/searxng/searxng:2026.10.7-6671d89be@sha256:cc026dbee25b864d7f9731957cd5ef36ba2e2d61abd2996d57f1b863483e7409',
    installedVersion: '2026.10.7-6671d89be + local log redaction hook', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/services.md',
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
    project: 'FreshRSS', sourceUrl: 'https://github.com/FreshRSS/FreshRSS', reviewedSourceUrl: 'https://github.com/FreshRSS/FreshRSS/tree/b2c50115baa36c217e939ee3ea8ecfae52f91abd',
    license: 'AGPL-3.0-only', licenseEvidenceUrls: ['https://github.com/FreshRSS/FreshRSS/blob/b2c50115baa36c217e939ee3ea8ecfae52f91abd/LICENSE.txt', 'https://github.com/FreshRSS/FreshRSS/blob/b2c50115baa36c217e939ee3ea8ecfae52f91abd/composer.json#L6'],
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
    installedVersion: '2.0.6', integration: 'container', reviewStatus: 'deployed', reviewDocument: 'docs/privatebin-discovery-2026-10-09.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-09',
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
  'GNU AGPLv3 (version scope unconfirmed)', 'AGPL-3.0-only', 'AGPL-3.0-or-later', 'Zlib', 'MIT', 'GNU GPLv3 (version scope unconfirmed)', 'GPL-3.0-only', 'GPL-3.0-or-later', 'GPL-2.0-or-later', 'Apache-2.0', 'Unlicense', 'BSD-3-Clause', 'MPL-2.0',
]);

function creativeProvider(project: string, repo: string, revision: string, license: ReviewedLicense, licenseFile: string, version: string): ReviewedFossProvider {
  return { ...browserProvider(project, repo, revision, license, licenseFile, version), artifactReference: `source:${revision}+deployment/toolbox/prepare-creative-build.mjs` };
}

function browserProvider(project: string, repo: string, revision: string, license: ReviewedLicense, licenseFile: string, version: string): ReviewedFossProvider {
  const provider = toolboxProvider(project, repo, revision, license, version, `source:${revision}+deployment/toolbox/prepare-browser-build.mjs`);
  return { ...provider, reviewedOn: '2026-10-07', reviewStatus: 'deployed', licenseEvidenceUrls: [`${provider.sourceUrl}/blob/${revision}/${licenseFile}`] };
}

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

/** Localize the explicit uncertainty; verified SPDX identifiers stay language-neutral. */
export function licenseText(license: string, language: 'en' | 'es'): string {
  if (language !== 'es') return license;
  if (license === 'GNU AGPLv3 (version scope unconfirmed)') return 'GNU AGPLv3 (alcance de versiones sin confirmar)';
  if (license === 'GNU GPLv3 (version scope unconfirmed)') return 'GNU GPLv3 (alcance de versiones sin confirmar)';
  return license;
}
