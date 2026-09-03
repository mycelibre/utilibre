import { randomBytes } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';

import { validateEnvironmentValues } from './validate-config.mjs';

const repository = new URL('../', import.meta.url);
const templateFile = new URL('.env.example', repository);
const outputFile = new URL('.env', repository);
const assignedAddresses = new Set(
  Object.values(networkInterfaces()).flatMap((entries) => (entries ?? []).map((entry) => normalizeIp(entry.address))),
);
const requested = normalizeIp(process.argv[2] ?? '');
const bindIp = requested || [...assignedAddresses].find((address) => isPrivateAddress(address));

if (!bindIp || !isPrivateAddress(bindIp) || !assignedAddresses.has(bindIp)) {
  throw new Error('Pass one private IP address currently assigned to this VM, for example: node scripts/init-private-preview.mjs 10.0.0.5');
}

const template = await readFile(templateFile, 'utf8');
const initial = parseEnv(template);
const urlHost = isIP(bindIp) === 6 ? `[${bindIp}]` : bindIp;
const replacements = {
  PROJECT_NAME: 'Private utility preview',
  PRIVATE_PREVIEW: '1',
  PORTAL_PRIVATE_PREVIEW: '1',
  PORTAL_EDGE_PROXY_IP: '',
  PRIVATE_BIND_IP: bindIp,
  EDGE_PROXY_IP: '',
  PUBLIC_PORTAL_HOST: bindIp,
  PUBLIC_MEDIA_HOST: bindIp,
  PUBLIC_SEARCH_HOST: bindIp,
  PUBLIC_REDDIT_HOST: bindIp,
  ANUBIS_PUBLIC_HOST: bindIp,
  PUBLIC_NTFY_HOST: bindIp,
  PUBLIC_PDF_HOST: bindIp,
  PUBLIC_CONVERT_HOST: bindIp,
  PUBLIC_TOOLS_HOST: bindIp,
  PUBLIC_MONITOR_HOST: bindIp,
  PUBLIC_SEND_HOST: bindIp,
  PUBLIC_RSS_HOST: bindIp,
  PUBLIC_FEEDS_HOST: bindIp,
  PUBLIC_PASTE_HOST: bindIp,
  PUBLIC_WAKAPI_HOST: bindIp,
  PUBLIC_PORTAL_ORIGIN: `http://${urlHost}:${initial.PORTAL_PORT || '8080'}`,
  COBALT_PUBLIC_API_URL: `http://${urlHost}:${initial.COBALT_PORT || '9000'}/`,
  PORTAL_PUBLIC_ORIGIN: `http://${urlHost}:${initial.PORTAL_PORT || '8080'}`,
  PORTAL_COBALT_BROWSER_URL: `http://${urlHost}:${initial.COBALT_PORT || '9000'}/`,
  PORTAL_COBALT_RESULT_SOURCE_URL: `http://${urlHost}:${initial.COBALT_PORT || '9000'}/`,
  PUBLIC_SEARCH_URL: `http://${urlHost}:${initial.SEARXNG_PORT || '8888'}/`,
  PUBLIC_REDDIT_URL: `http://${urlHost}:${initial.REDLIB_PORT || '3002'}/`,
  PUBLIC_NTFY_URL: `http://${urlHost}:${initial.NTFY_PORT || '2586'}/`,
  PUBLIC_PDF_URL: `http://${urlHost}:${initial.BENTOPDF_PORT || '3101'}/`,
  PUBLIC_CONVERT_URL: `http://${urlHost}:${initial.VERT_PORT || '3102'}/`,
  PUBLIC_TOOLS_URL: `http://${urlHost}:${initial.OMNITOOLS_PORT || '3103'}/`,
  PUBLIC_MONITOR_URL: `http://${urlHost}:${initial.HEALTHCHECKS_PORT || '3104'}/`,
  PUBLIC_SEND_URL: `http://${urlHost}:${initial.PAIRDROP_PORT || '3105'}/`,
  PUBLIC_RSS_URL: `http://${urlHost}:${initial.FRESHRSS_PORT || '3106'}/`,
  PUBLIC_FEEDS_URL: `http://${urlHost}:${initial.RSSHUB_PORT || '3107'}/`,
  PUBLIC_PASTE_URL: `http://${urlHost}:${initial.PRIVATEBIN_PORT || '3108'}/`,
  PUBLIC_WAKAPI_URL: `http://${urlHost}:${initial.WAKAPI_PORT || '3109'}/`,
  ANUBIS_COOKIE_SECURE: 'false',
  ANUBIS_COOKIE_PARTITIONED: 'false',
  ENABLED_SERVICES: 'cobalt,searxng,redlib,ntfy,bentopdf,vert,omnitools,healthchecks,pairdrop,freshrss,rsshub,privatebin,wakapi',
  SEARXNG_SECRET: randomBytes(32).toString('hex'),
};
let output = template;
for (const [key, value] of Object.entries(replacements)) output = replaceSetting(output, key, value);
const values = parseEnv(output);
validateEnvironmentValues(values, { assignedAddresses });
await writeFile(outputFile, output, { mode: 0o600, flag: 'wx' });
await chmod(outputFile, 0o600);
process.stdout.write(`Created mode-0600 .env for direct private preview at ${values.PUBLIC_PORTAL_ORIGIN}.\n`);

function replaceSetting(source, key, value) {
  const expression = new RegExp(`^${key}=.*$`, 'm');
  if (!expression.test(source)) throw new Error(`Missing ${key} in .env.example.`);
  return source.replace(expression, `${key}=${value}`);
}

function parseEnv(source) {
  const values = {};
  for (const original of source.split(/\r?\n/)) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator > 0) values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

function normalizeIp(value) {
  const cleaned = String(value).trim().replace(/^\[|\]$/g, '').replace(/%.+$/, '');
  if (isIP(cleaned) !== 6) return cleaned;
  try { return new URL(`http://[${cleaned}]`).hostname.replace(/^\[|\]$/g, '').toLowerCase(); } catch { return cleaned.toLowerCase(); }
}

function isPrivateAddress(value) {
  if (isIP(value) === 6) return /^(?:fc|fd)/i.test(value);
  if (isIP(value) !== 4) return false;
  const parts = value.split('.').map(Number);
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
}
