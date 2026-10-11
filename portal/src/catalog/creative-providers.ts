import type { ReviewedFossProvider, ReviewedLicense } from './upstreams.ts';
function reviewed(project: string, repo: string, revision: string, license: ReviewedLicense, licenseFile: string, version: string, deployed = true): ReviewedFossProvider {
  return { project, sourceUrl: `https://github.com/${repo}`, reviewedSourceUrl: `https://github.com/${repo}/tree/${revision}`,
    license, licenseEvidenceUrls: [`https://github.com/${repo}/blob/${revision}/${licenseFile}`],
    selfHostingEvidenceUrl: `https://github.com/${repo}/tree/${revision}`, maintenanceEvidenceUrl: `https://github.com/${repo}/commits`,
    artifactReference: `source:${revision}+deployment/creative-batch`, installedVersion: version,
    integration: 'source-build', reviewStatus: deployed ? 'deployed' : 'staged', reviewDocument: 'docs/creative-batch-2026-10-11.md',
    role: 'public-application', maintainer: 'independent-upstream', selfHostable: true, reviewedOn: '2026-10-11' };
}
export const creativeProviders = {
  grist: { ...reviewed('Grist', 'gristlabs/grist-core', '6dfae2fa33af6ef057b5de676afc85e6f3026fc6', 'Apache-2.0', 'LICENSE.txt', '1.7.21'), integration: 'container', artifactReference: 'gristlabs/grist-oss:1.7.21@sha256:73e4815fcc1b5dfff6cd47b37a3ec2bb80d3c70b27efba4c8714a57781d414d1' },
  candlr: { ...reviewed('Candlr', 'ellite/candlr', 'c8ac0eb11703e92c6daa3ad7908f2f219265e1a3', 'GNU GPLv3 (version scope unconfirmed)', 'LICENSE.md', '2.0.0-p1'), artifactReference: 'source:c8ac0eb11703e92c6daa3ad7908f2f219265e1a3+deployment/candlr' },
  bookplate: { ...reviewed('Bookplate', 'LeoPhh/bookplate', '47e53a7aec56aa9e76d4cf425deb48102e4a2fd7', 'Apache-2.0', 'LICENSE', '1.1.0-p1'), artifactReference: 'source:47e53a7aec56aa9e76d4cf425deb48102e4a2fd7+deployment/bookplate' },
  openreel: reviewed('OpenReel', 'Augani/openreel-video', 'c9340465e5d37e684cc25bdbe746c4ccd45e165c', 'MIT', 'LICENSE', '0.1.2-p1'),
  openplan3d: reviewed('OpenPlan3D', 'laanlabs/openPlan3D', 'd68cadf703578f2cd3a7c77f820e18d342580c32', 'MIT', 'LICENSE', '0.9.0-p1'),
  blockbench: reviewed('Blockbench', 'JannisX11/blockbench', '7c92e27d237e365110030d73e92c5d1605f0d311', 'GPL-3.0-or-later', 'LICENSE.MD', '5.2.2-p1'),
  glyphr: reviewed('Glyphr Studio', 'glyphr-studio/Glyphr-Studio-2', 'e12bb922f74a2e410c5ac580eebcb485aff0ad51', 'GPL-3.0-or-later', 'LICENSE-gpl-3.0.txt', '2.10.6-p1'),
  graphite: reviewed('Graphite', 'GraphiteEditor/Graphite', '7477cd2fab315494e4c2613bc446c707733e6e7b', 'Apache-2.0', 'LICENSE-APACHE', '7477cd2-p1 · alpha', false),
  jscad: reviewed('JSCAD', 'jscad/OpenJSCAD.org', 'f245ea3a5072024b789f276c6fb9ce6c3eb3fd0d', 'MIT', 'LICENSE', 'Web 2.6.13'),
  grid: reviewed('GridSpace', 'GridSpace/grid-apps', 'd138275bbe9d4e4030d8cb8b2dcf66607da9295a', 'MIT', 'license.md', '4.7.0-p1'),
  fossflow: reviewed('FossFLOW', 'jravenel/fossflow', 'a3c5b7cafb8f2573e26a8dd086d51f037feb9fb6', 'MIT', 'LICENSE', '1.4.0'),
  vvveb: reviewed('VvvebJs', 'givanz/VvvebJs', '1acbab7ebfe3e7b004f1f18c039d26550fc04bd8', 'Apache-2.0', 'LICENSE', '1acbab7-p1'),
  microstudio: reviewed('microStudio', 'pmgl/microstudio', 'b59d904b56a8cdbdde1b08a1b107c90bab59b31f', 'MIT', 'LICENSE.txt', 'b59d904 · security review; not deployed', false),
} satisfies Record<string, ReviewedFossProvider>;
