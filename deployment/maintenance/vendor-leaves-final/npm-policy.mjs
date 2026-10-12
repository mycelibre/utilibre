export const npmReview = 'vendor-leaves-final-20261011/npm-review.json';
export const npmContainer = 'utilibre-expanded-penpot-exporter-1';
export const npmVersion = '11.20.0-0';
export const npmArchive = '9982c5a73e2cf556153dd70b7812768cf3679d774c14b4c7f9ece26502247aa5';
export function npmEligible(i) {
 return i?.status === 'needs-review' && i.scope === 'runtime-image' && i.type === 'debian' &&
  i.package === 'npm' && i.id === 'CVE-2026-9496' && ['11.19.1-0', npmVersion].includes(i.installed) &&
  i.containers?.length === 1 && i.containers[0] === npmContainer;
}
