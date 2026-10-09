// Narrow privacy correction. Dry run unless --apply; never alter rule matching,
// security action, ordering or skip targets. The original config stays private.
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp} from 'node:fs/promises';
import {isDeepStrictEqual} from 'node:util';
import {pathToFileURL} from 'node:url';

export function definition(rule) {
  const {id, version, last_updated, ...fields} = rule;
  return fields;
}
export function withoutLogging(rule) {
  assert.equal(rule.action, 'skip');
  assert.equal(rule.enabled, true);
  assert.equal(rule.logging?.enabled, true);
  return {...definition(rule), logging:{...rule.logging, enabled:false}};
}

async function main() {
  assert(process.argv.slice(2).every(a => a === '--apply'), 'Only --apply is supported');
  const apply = process.argv.includes('--apply');
  const root = '/opt/utilibre/provider-secrets';
  const token = (await readFile(`${root}/cloudflare-token`, 'utf8')).trim();
  const {id:zone, account_id:account} = JSON.parse(await readFile(`${root}/cloudflare-zone.json`, 'utf8'));
  assert.match(zone, /^[a-f0-9]{32}$/);
  const api = async (path, body) => {
    const r = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      method:body ? 'PATCH' : 'GET',
      headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'},
      ...(body ? {body:JSON.stringify(body)} : {}), signal:AbortSignal.timeout(20000)});
    const data = await r.json();
    assert(data.success, `Cloudflare request denied/failed (HTTP ${r.status}); no raw response printed`);
    return data.result;
  };
  const identity = await api(`/zones/${zone}`);
  assert(identity.name === 'utilibre.org' && identity.account.id === account);
  const path = `/zones/${zone}/rulesets/phases/http_request_firewall_custom/entrypoint`;
  const before = await api(path);
  const targets = before.rules.filter(r => r.action === 'skip' && r.enabled && r.logging?.enabled === true);
  console.log(JSON.stringify({apply, matchingRules:targets.length}));
  if (!apply || !targets.length) return;
  // This one-time correction is scoped to the single rule observed in the audit.
  assert.equal(targets.length, 1, 'Rules changed; review scope before proceeding');
  const rule = targets[0];
  assert.match(before.id, /^[a-f0-9]{32}$/); assert.match(rule.id, /^[a-f0-9]{32}$/);
  const dir = await mkdtemp('/opt/utilibre/reports/cloudflare-skip-logging-');
  await writeFile(`${dir}/before.json`, JSON.stringify(before), {flag:'wx',mode:0o600});
  // Abort if an operator changed the rules between our inspection and write.
  const fresh = await api(path);
  assert(isDeepStrictEqual(fresh, before), 'Rules changed concurrently; no update sent');
  const desired = withoutLogging(rule);
  await api(`/zones/${zone}/rulesets/${before.id}/rules/${rule.id}`, desired);
  const after = await api(path);
  assert.deepEqual(after.rules.map(r => r.id), before.rules.map(r => r.id));
  for (const old of before.rules) {
    const actual = after.rules.find(r => r.id === old.id);
    assert(isDeepStrictEqual(definition(actual), old.id === rule.id ? desired : definition(old)),
      'Unexpected rule definition change; inspect private snapshot');
  }
  const result = {at:new Date().toISOString(), updatedRules:1, matchedRequestLogging:false,
    ruleDefinitionsOtherwiseUnchanged:true, orderPreserved:true};
  await writeFile(`${dir}/result.json`, JSON.stringify(result,null,2)+'\n', {flag:'wx',mode:0o600});
  console.log(JSON.stringify({...result, privateEvidence:dir}));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(error => {
    console.error(error instanceof assert.AssertionError ? error.message.split('\n')[0] : 'Provider correction failed; no private response printed');
    process.exitCode = 1;
  });
