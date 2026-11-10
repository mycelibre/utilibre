// Historical sources remain auditable. These release entry points must not
// activate their superseded Go artifacts; use the separately approved batch.
import fs from 'node:fs';
const manifest = JSON.parse(fs.readFileSync(new URL('./superseded-go.json', import.meta.url)));
export const successorCommand = 'node deployment/maintenance/security-20261028/release-brotli.mjs --batch-20261109 --xnet prepare|apply APP';
export function assertCurrentGoRelease(entry, keys, profile = '') {
  const rule = manifest.releaseEntries.find(row => row.entry === entry);
  if (!rule || (rule.profiles && !rule.profiles.includes(profile))) return;
  const blocked = keys.filter(key => rule.applications.includes(key));
  if (blocked.length) throw Error(`Superseded Go release blocked: ${blocked.join(', ')}. Historical inputs are retained for audit, not activation. Use the exact approved replacement: ${successorCommand}. Rollback requires its own current review.`);
}
