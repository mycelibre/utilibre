// GET-only configuration audit: never fetch analytics reports or visitor logs.
// Credentials, other site names and account/zone identifiers stay out of output.
import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

const bool = value => typeof value === 'boolean' ? value : null;
export function summarizeSite(site) {
  return {enabled:bool(site.ruleset?.enabled), autoInstall:bool(site.auto_install),
    lite:bool(site.ruleset?.lite)};
}

// Bounded pagination; a partial/failed response must never imply "disabled".
export async function readAnalyticsPages(request, account, domain, maxPages = 20) {
  const seen = new Set(), matching = [];
  let total = null, complete = false, pages = 0, status = null, errors = [];
  for (let page = 1; page <= maxPages; page++) {
    const response = await request(`/accounts/${account}/rum/site_info/list?page=${page}&per_page=100`);
    pages++; status = response.status;
    const data = response.data;
    errors = (data.errors || []).map(e => ({code:e.code}));
    if (!data.success || !Array.isArray(data.result)) break;
    const count = data.result_info?.total_count;
    if (!Number.isSafeInteger(count) || count < 0 || (total !== null && total !== count)) break;
    total = count;
    const before = seen.size;
    let missingIdentity = false;
    for (const site of data.result) {
      const id = site.site_tag;
      if (typeof id !== 'string' || !id) { missingIdentity = true; continue; }
      if (seen.has(id)) continue;
      seen.add(id);
      if (site.zone_name === domain || site.ruleset?.zone_name === domain)
        matching.push(summarizeSite(site));
    }
    if (missingIdentity) break;
    if (seen.size === total) { complete = true; break; }
    if (seen.size > total || seen.size === before || data.result.length === 0) break;
  }
  return {check:'web-analytics-config', status, success:complete, errors,
    pages, returnedSites:seen.size, totalSites:total, complete, matchingSites:matching,
    effectiveState:!complete || !matching.length || matching.some(s => s.enabled === null)
      ? 'unknown' : matching.some(s => s.enabled) ? 'enabled' : 'disabled'};
}

export function logpullAvailable(plan) {
  // Official product availability, not an inference from an API denial.
  if (/enterprise/i.test(plan || '')) return true;
  if (/^(free|pro|business)( website)?$/i.test(plan || '')) return false;
  return null;
}

async function main() {
  const args = process.argv.slice(2);
  const ownerNoLogpush = args.includes('--logpush-owner-not-used');
  const paths = args.filter(a => a !== '--logpush-owner-not-used');
  assert(paths.length <= 1 && paths.every(p => !p.startsWith('-')),
    'Usage: node scripts/check-cloudflare-privacy.mjs [new-report-path] [--logpush-owner-not-used]');
  const root = '/opt/utilibre/provider-secrets';
  const token = (await readFile(`${root}/cloudflare-token`, 'utf8')).trim();
  const {id:zone, account_id:account} = JSON.parse(await readFile(`${root}/cloudflare-zone.json`, 'utf8'));
  assert(token.length >= 20 && /^[a-f0-9]{32}$/.test(zone) && /^[a-f0-9]{32}$/.test(account),
    'Missing or invalid retained credentials');
  const request = async path => {
    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
        headers:{Authorization:`Bearer ${token}`}, signal:AbortSignal.timeout(20000)});
      return {status:response.status, data:await response.json()};
    } catch {
      // Do not print remote messages, request paths or fetch error stacks.
      return {status:null, data:{success:false, errors:[{code:'request-failed'}]}};
    }
  };
  const rows = [];
  const record = row => { rows.push(row); console.log(JSON.stringify(row)); };
  async function get(name, path, summarize) {
    const {status, data} = await request(path);
    const row = {check:name, status, success:data.success === true,
      errors:(data.errors || []).map(e => ({code:e.code}))};
    if (data.success && summarize) Object.assign(row, summarize(data.result));
    // No phase entrypoint is different from inaccessible configuration.
    if (name.endsWith('-entrypoint') && status === 404 && data.errors?.some(e => e.code === 10003)) {
      row.success = true; row.state = 'no-phase-entrypoint';
    }
    record(row);
    return data;
  }
  const verified = await get('token', '/user/tokens/verify', r => ({active:r.status === 'active'}));
  assert(verified.success && verified.result.status === 'active', 'Token not active');
  const identity = await get('zone-identity', `/zones/${zone}`, r => ({zoneIsUtilibre:r.name === 'utilibre.org',
    accountMatches:r.account?.id === account, plan:r.plan?.name || null}));
  assert(identity.success && identity.result.name === 'utilibre.org' && identity.result.account?.id === account,
    'Wrong zone/account; remaining reads cancelled');
  for (const setting of ['browser_check','security_level','browser_cache_ttl','cache_level','nel'])
    await get(setting, `/zones/${zone}/settings/${setting}`, r => ({value:r.value}));
  for (const phase of ['http_request_cache_settings','http_request_firewall_custom'])
    await get(`${phase}-entrypoint`, `/zones/${zone}/rulesets/phases/${phase}/entrypoint`, r => ({
      rules:(r.rules || []).map(rule => ({enabled:bool(rule.enabled), action:rule.action,
        matchedRequestLogging:bool(rule.logging?.enabled)}))}));
  if (logpullAvailable(identity.result.plan?.name) === false)
    record({check:'logpull-retention', success:true, state:'not-available-on-this-plan',
      scope:'Logpull only; provider operational/security retention is not established'});
  else
    await get('logpull-retention', `/zones/${zone}/logs/control/retention/flag`, r => ({configuration:r}));
  record(await readAnalyticsPages(request, account, 'utilibre.org'));
  if (ownerNoLogpush)
    record({check:'logpush', success:true, state:'owner-reported-not-used', independentlyVerified:false});
  else {
    for (const [scope, id] of [['zones',zone],['accounts',account]])
      await get(`${scope}-logpush`, `/${scope}/${id}/logpush/jobs`, r => ({
        jobs:r.map(job => ({enabled:bool(job.enabled), dataset:job.dataset}))}));
  }
  const report = {checkedAt:new Date().toISOString(),
    method:'GET-only configuration; no visitor logs, analytics reports or mutations', checks:rows,
    limits:['Settings are not a provider-wide zero-logging certification.',
      'Provider operational/security retention and separate Caddy runtime configuration remain unverified.']};
  const serialized = JSON.stringify(report, null, 2) + '\n';
  for (const secret of [token, zone, account, verified.result.id].filter(Boolean))
    assert(!serialized.includes(secret), 'Report contains a private identifier');
  if (paths[0]) await writeFile(paths[0], serialized, {flag:'wx', mode:0o600});
  if (rows.some(r => !r.success)) process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main().catch(() => { console.error('Configuration audit failed; no private response or credential printed.'); process.exitCode = 1; });
