import { readFile, stat } from 'node:fs/promises';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';

const repository = new URL('../', import.meta.url);

const services = [
  { id: 'degoog', hostKey: 'PUBLIC_DEGOOG_HOST', urlKey: 'PUBLIC_DEGOOG_URL', portKey: 'DEGOOG_GATEWAY_PORT' },
  { id: 'searxng', hostKey: 'PUBLIC_SEARCH_HOST', urlKey: 'PUBLIC_SEARCH_URL', portKey: 'SEARXNG_PORT' },
  { id: 'redlib', hostKey: 'PUBLIC_REDDIT_HOST', urlKey: 'PUBLIC_REDDIT_URL', portKey: 'REDLIB_PORT' },
  { id: 'freshrss', hostKey: 'PUBLIC_RSS_HOST', urlKey: 'PUBLIC_RSS_URL', portKey: 'FRESHRSS_PORT' },
  { id: 'privatebin', hostKey: 'PUBLIC_PASTE_HOST', urlKey: 'PUBLIC_PASTE_URL', portKey: 'PRIVATEBIN_PORT' },
  { id: 'bentopdf', hostKey: 'PUBLIC_PDF_HOST', urlKey: 'PUBLIC_PDF_URL', portKey: 'BENTOPDF_PORT' },
  { id: 'vert', hostKey: 'PUBLIC_CONVERT_HOST', urlKey: 'PUBLIC_CONVERT_URL', portKey: 'VERT_PORT' },
  { id: 'omnitools', hostKey: 'PUBLIC_TOOLS_HOST', urlKey: 'PUBLIC_TOOLS_URL', portKey: 'OMNITOOLS_PORT' },
  { id: 'ittools', hostKey: 'PUBLIC_DEVELOPER_TOOLS_HOST', urlKey: 'PUBLIC_DEVELOPER_TOOLS_URL', portKey: 'ITTOOLS_PORT' },
  { id: 'hatsh', hostKey: 'PUBLIC_ENCRYPT_HOST', urlKey: 'PUBLIC_ENCRYPT_URL', portKey: 'HATSH_PORT' },
  { id: 'drawio', hostKey: 'PUBLIC_DRAW_HOST', urlKey: 'PUBLIC_DRAW_URL', portKey: 'DRAWIO_PORT' },
  { id: 'miniqr', hostKey: 'PUBLIC_QR_HOST', urlKey: 'PUBLIC_QR_URL', portKey: 'MINIQR_PORT' },
  { id: 'rssbridge', hostKey: 'PUBLIC_BRIDGE_HOST', urlKey: 'PUBLIC_BRIDGE_URL', portKey: 'RSSBRIDGE_PORT' },
  { id: 'ntfy', hostKey: 'PUBLIC_NOTIFY_HOST', urlKey: 'PUBLIC_NOTIFY_URL', portKey: 'NTFY_PORT' },
  { id: 'yopass', hostKey: 'PUBLIC_SECRET_HOST', urlKey: 'PUBLIC_SECRET_URL', portKey: 'YOPASS_PORT' },
  { id: 'pairdrop', hostKey: 'PUBLIC_DROP_HOST', urlKey: 'PUBLIC_DROP_URL', portKey: 'PAIRDROP_PORT' },
  { id: 'uptime-kuma', hostKey: 'PUBLIC_STATUS_HOST', urlKey: 'PUBLIC_STATUS_URL', portKey: 'KUMA_PUBLIC_PORT' },
  { id: 'jupyterlite', hostKey: 'PUBLIC_PYTHON_HOST', urlKey: 'PUBLIC_PYTHON_URL', portKey: 'JUPYTERLITE_PORT' },
  { id: 'whisper-web', hostKey: 'PUBLIC_TRANSCRIBE_HOST', urlKey: 'PUBLIC_TRANSCRIBE_URL', portKey: 'WHISPER_PORT' },
  { id: 'wakapi', hostKey: 'PUBLIC_WAKAPI_HOST', urlKey: 'PUBLIC_WAKAPI_URL', portKey: 'WAKAPI_PORT' },
  { id: 'reactive-resume', hostKey: 'PUBLIC_RESUME_HOST', urlKey: 'PUBLIC_RESUME_URL', portKey: 'RESUME_PORT' },
  { id: 'penpot', hostKey: 'PUBLIC_DESIGN_HOST', urlKey: 'PUBLIC_DESIGN_URL', portKey: 'PENPOT_PORT' },
  { id: 'actual', hostKey: 'PUBLIC_BUDGET_HOST', urlKey: 'PUBLIC_BUDGET_URL', portKey: 'ACTUAL_PORT' },
  { id: 'rallly', hostKey: 'PUBLIC_POLL_HOST', urlKey: 'PUBLIC_POLL_URL', portKey: 'RALLLY_PORT' },
  { id: 'priviblur', hostKey: 'PUBLIC_TUMBLR_HOST', urlKey: 'PUBLIC_TUMBLR_URL', portKey: 'PRIVIBLUR_PORT' },
  { id: 'mezzo', hostKey: 'PUBLIC_TENOR_HOST', urlKey: 'PUBLIC_TENOR_URL', portKey: 'MEZZO_PORT' },
  { id: 'fmd', hostKey: 'PUBLIC_FMD_HOST', urlKey: 'PUBLIC_FMD_URL', portKey: 'FMD_PORT' },
  { id: 'pollaris', hostKey: 'PUBLIC_POLLARIS_HOST', urlKey: 'PUBLIC_POLLARIS_URL', portKey: 'POLLARIS_PORT' },
  { id: 'binternet', hostKey: 'PUBLIC_BINTERNET_HOST', urlKey: 'PUBLIC_BINTERNET_URL', portKey: 'BINTERNET_PORT' },
  { id: 'gothub', hostKey: 'PUBLIC_GOTHUB_HOST', urlKey: 'PUBLIC_GOTHUB_URL', portKey: 'GOTHUB_PORT' },
  { id: 'translite', hostKey: 'PUBLIC_TRANSLATE_HOST', urlKey: 'PUBLIC_TRANSLATE_URL', portKey: 'TRANSLITE_PORT' },
  { id: 'biblioreads', hostKey: 'PUBLIC_BOOKS_HOST', urlKey: 'PUBLIC_BOOKS_URL', portKey: 'BIBLIOREADS_PORT' },
  { id: 'qr-offline', hostKey: 'PUBLIC_QRTOOLS_HOST', urlKey: 'PUBLIC_QRTOOLS_URL', portKey: 'QR_OFFLINE_PORT' },
  { id: 'kittygram', hostKey: 'PUBLIC_INSTAGRAM_HOST', urlKey: 'PUBLIC_INSTAGRAM_URL', portKey: 'KITTYGRAM_PORT' },
  { id: 'fourget', hostKey: 'PUBLIC_FOURGET_HOST', urlKey: 'PUBLIC_FOURGET_URL', portKey: 'FOURGET_PORT' },
  { id: 'anonymousoverflow', hostKey: 'PUBLIC_OVERFLOW_HOST', urlKey: 'PUBLIC_OVERFLOW_URL', portKey: 'OVERFLOW_PORT' },
  { id: 'safetwitch', hostKey: 'PUBLIC_TWITCH_HOST', urlKey: 'PUBLIC_TWITCH_URL', portKey: 'SAFETWITCH_PORT' },
];
const allowedServices = new Set([...services.map(({ id }) => id), 'mumble']);
const listableServices = new Set([...allowedServices, 'reactive-resume', 'penpot', 'actual', 'rallly', 'breezewiki', 'dumb', 'libremdb', 'degoog', 'fourget', 'safetwitch', 'anonymousoverflow', 'gothub', 'binternet', 'rimgo', 'mumble']);

// Stale settings should fail loudly instead of silently republishing a service
// that the project deliberately retired.
const retiredSettings = [
  'PUBLIC_MEDIA_HOST', 'COBALT_PUBLIC_API_URL', 'PORTAL_COBALT_BROWSER_URL',
  'PORTAL_COBALT_RESULT_SOURCE_URL', 'PUBLIC_YOUTUBE_HOST', 'PUBLIC_YOUTUBE_URL',
  'PUBLIC_IMGUR_HOST', 'PUBLIC_IMGUR_URL', 'PUBLIC_NTFY_HOST', 'PUBLIC_NTFY_URL',
  'PUBLIC_OPENAPI_HOST', 'PUBLIC_OPENAPI_URL',
  'PUBLIC_MONITOR_HOST', 'PUBLIC_MONITOR_URL', 'PUBLIC_SEND_HOST', 'PUBLIC_SEND_URL',
  'PUBLIC_FEEDS_HOST', 'PUBLIC_FEEDS_URL',
  'INVIDIOUS_DB_USER', 'INVIDIOUS_DB_PASSWORD', 'INVIDIOUS_DB_NAME',
];

export async function loadValidatedEnvironment({ launch = false } = {}) {
  const environmentFile = new URL('.env', repository);
  const [source, metadata] = await Promise.all([
    readFile(environmentFile, 'utf8'),
    stat(environmentFile),
  ]);
  if ((metadata.mode & 0o077) !== 0) {
    throw new Error('.env must not be readable or writable by group/other users; run chmod 600 .env.');
  }
  const fileValues = parseEnv(source);
  const values = { ...fileValues };
  // Docker Compose gives exported shell variables precedence over .env.
  for (const key of Object.keys(fileValues)) if (process.env[key] !== undefined) values[key] = process.env[key];
  return validateEnvironmentValues(values, { launch, assignedAddresses: await localAddresses() });
}

export function validateEnvironmentValues(values, { launch = false, assignedAddresses = null } = {}) {
  const errors = [];

  const projectName = (values.PROJECT_NAME ?? '').trim();
  if (projectName.length > 80) errors.push('PROJECT_NAME must be at most 80 characters.');
  if (launch && (!projectName || isPlaceholder(projectName))) errors.push('PROJECT_NAME must be replaced with the chosen public name for launch.');
  else if (!projectName || isPlaceholder(projectName)) process.stderr.write('Warning: PROJECT_NAME is not final; set it before launch.\n');

  const previewSetting = values.PRIVATE_PREVIEW ?? '0';
  if (!['0', '1'].includes(previewSetting)) errors.push('PRIVATE_PREVIEW must be 0 or 1.');
  const privatePreview = previewSetting === '1';
  if (launch && privatePreview) errors.push('PRIVATE_PREVIEW must be 0 for public launch.');

  const bindIp = normalizedIp(values.PRIVATE_BIND_IP ?? '');
  const edgeIp = normalizedIp(values.EDGE_PROXY_IP ?? '');
  validatePrivateIp('PRIVATE_BIND_IP', bindIp, errors);
  if (!privatePreview || edgeIp) validatePrivateIp('EDGE_PROXY_IP', edgeIp, errors);
  if (bindIp && edgeIp && bindIp === edgeIp) errors.push('PRIVATE_BIND_IP and EDGE_PROXY_IP must identify different machines.');
  if (assignedAddresses) {
    if (isIP(bindIp) && !assignedAddresses.has(bindIp)) errors.push('PRIVATE_BIND_IP is not assigned to a local network interface.');
    if (isIP(edgeIp) && assignedAddresses.has(edgeIp)) errors.push('EDGE_PROXY_IP is assigned to this application VM instead of the separate edge VM.');
  } else {
    process.stderr.write('Warning: local interface enumeration was unavailable; verify PRIVATE_BIND_IP ownership manually.\n');
  }

  const portalPreviewSetting = values.PORTAL_PRIVATE_PREVIEW ?? previewSetting;
  if (!['0', '1'].includes(portalPreviewSetting)) errors.push('PORTAL_PRIVATE_PREVIEW must be 0 or 1 when set.');
  const portalPrivatePreview = portalPreviewSetting === '1';
  const portalEdgeIp = normalizedIp(values.PORTAL_EDGE_PROXY_IP ?? edgeIp);
  if (!portalPrivatePreview || portalEdgeIp) validatePrivateIp('PORTAL_EDGE_PROXY_IP', portalEdgeIp, errors);
  if (bindIp && portalEdgeIp && bindIp === portalEdgeIp) errors.push('PRIVATE_BIND_IP and PORTAL_EDGE_PROXY_IP must identify different machines.');
  if (assignedAddresses && isIP(portalEdgeIp) && assignedAddresses.has(portalEdgeIp)) {
    errors.push('PORTAL_EDGE_PROXY_IP is assigned to this application VM instead of the separate edge VM.');
  }
  if (launch && portalPrivatePreview) errors.push('PORTAL_PRIVATE_PREVIEW must be 0 for public launch.');

  const portalOrigin = values.PORTAL_PUBLIC_ORIGIN || values.PUBLIC_PORTAL_ORIGIN;
  if (portalPrivatePreview) {
    validatePreviewServiceUrl('PORTAL_PUBLIC_ORIGIN', portalOrigin, bindIp, values.PORTAL_PORT ?? defaultPort('PORTAL_PORT'), false, errors);
  } else {
    const portalHost = validateHostname('PUBLIC_PORTAL_HOST', values.PUBLIC_PORTAL_HOST || hostnameFromUrl(portalOrigin), true, launch, errors);
    validateServiceUrl('PORTAL_PUBLIC_ORIGIN', portalOrigin, portalHost, false, errors);
  }

  const secret = values.SEARXNG_SECRET ?? '';
  if (values.SEARXNG_IMAGE && !/^(?:docker\.io\/)?searxng\/searxng(?::[A-Za-z0-9_.-]+)?@sha256:[0-9a-f]{64}$/.test(values.SEARXNG_IMAGE)) {
    errors.push('SEARXNG_IMAGE must be an immutable official SearXNG image reference.');
  }
  if (!/^[a-f0-9]{64}$/i.test(secret) || isPlaceholder(secret)) {
    errors.push('SEARXNG_SECRET must be a non-placeholder 32-byte hexadecimal secret (64 characters).');
  }

  const enabled = csv(values.ENABLED_SERVICES ?? 'searxng,redlib,freshrss,privatebin');
  if (new Set(enabled).size !== enabled.length) errors.push('ENABLED_SERVICES must not contain duplicate IDs.');
  for (const id of enabled) if (!allowedServices.has(id)) errors.push(`ENABLED_SERVICES contains unsupported or retired ID: ${id}`);
  const listed = csv(values.LISTED_SERVICES || '');
  for (const id of listed) {
    if (!listableServices.has(id)) errors.push(`LISTED_SERVICES contains unsupported or retired ID: ${id}`);
  }
  if (!enabled.includes('searxng')) errors.push('ENABLED_SERVICES must include searxng.');
  if (enabled.includes('mumble') || values.PUBLIC_MUMBLE_URL) {
    if (values.PUBLIC_MUMBLE_URL !== 'mumble://mumble.utilibre.org:64738/') errors.push('PUBLIC_MUMBLE_URL must be the exact credential-free Utilibre Mumble client URL.');
    if (!enabled.includes('mumble') && !listed.includes('mumble')) errors.push('PUBLIC_MUMBLE_URL requires mumble to be enabled or explicitly listed.');
  }

  const composeProfiles = csv(values.COMPOSE_PROFILES ?? '');
  if (enabled.includes('redlib') !== composeProfiles.includes('privacy-frontends')) {
    errors.push('Redlib requires both ENABLED_SERVICES=...redlib... and the privacy-frontends entry in COMPOSE_PROFILES; enable or disable both together.');
  }
  const unknownProfiles = composeProfiles.filter((profile) => profile !== 'privacy-frontends');
  if (unknownProfiles.length) errors.push(`COMPOSE_PROFILES contains unsupported entries: ${unknownProfiles.join(', ')}`);
  if (!['en', 'es'].includes(values.DEFAULT_LANGUAGE ?? 'en')) errors.push('DEFAULT_LANGUAGE must be en or es.');

  if (launch) {
    if (!(values.PUBLIC_PORTAL_HOST ?? '').trim()) errors.push('PUBLIC_PORTAL_HOST must be set explicitly for launch.');
    for (const service of services) if (enabled.includes(service.id) && !(values[service.hostKey] ?? '').trim()) {
      errors.push(`${service.hostKey} must be set explicitly for launch.`);
    }
    validateLaunchUrl('SOURCE_CODE_URL', values.SOURCE_CODE_URL, errors);
    validateLaunchUrl('CONTACT_URL', values.CONTACT_URL, errors);
  }
  if ((values.SUPPORT_URL ?? '').trim()) validateLaunchUrl('SUPPORT_URL', values.SUPPORT_URL, errors);

  const configured = service => Boolean((values[service.urlKey] ?? '').trim() || (values[service.hostKey] ?? '').trim());
  for (const service of services) {
    // Explicitly listed installations may have a prepared address without a
    // public launch. The portal still requires ENABLED_SERVICES separately.
    if (enabled.includes(service.id) || listed.includes(service.id) && configured(service)) {
      if (privatePreview && !launch) {
        validatePreviewHostname(service.hostKey, values[service.hostKey], bindIp, errors);
        validatePreviewOrPublicServiceUrl(
          service.urlKey,
          values[service.urlKey],
          bindIp,
          values[service.portKey] ?? defaultPort(service.portKey),
          true,
          errors,
        );
      } else {
        const host = validateHostname(service.hostKey, values[service.hostKey] || hostnameFromUrl(values[service.urlKey]), true, launch, errors);
        validateServiceUrl(service.urlKey, values[service.urlKey], host, true, errors);
      }
    } else if ((values[service.urlKey] ?? '').trim() || (values[service.hostKey] ?? '').trim()) {
      errors.push(`${service.urlKey} and ${service.hostKey} must stay empty while ${service.id} is disabled.`);
    }
  }

  if (enabled.includes('redlib')) validateAnubis(values, { launch }, errors);

  const ports = [
    'PORTAL_PORT',
    ...services.filter(service => enabled.includes(service.id) || listed.includes(service.id) && configured(service)).map(({ portKey }) => portKey),
  ];
  const seenPorts = new Map();
  for (const key of ports) {
    const value = values[key] ?? defaultPort(key);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) errors.push(`${key} must be an integer from 1 through 65535.`);
    else if (seenPorts.has(value)) errors.push(`${key} conflicts with ${seenPorts.get(value)} on host port ${value}.`);
    else seenPorts.set(value, key);
  }

  for (const key of ['STATUS_CACHE_SECONDS', 'REDLIB_PIDS_LIMIT', 'DOCKER_LOG_MAX_FILES']) {
    if (values[key] !== undefined && (!/^\d+$/.test(values[key]) || Number(values[key]) < 1)) errors.push(`${key} must be a positive integer.`);
  }
  const valkeyLimit = memoryBytes(values.VALKEY_MEMORY_LIMIT ?? '128M');
  const valkeyMaximum = memoryBytes(values.VALKEY_MAXMEMORY ?? '96mb');
  if (!valkeyLimit || !valkeyMaximum) errors.push('VALKEY_MEMORY_LIMIT and VALKEY_MAXMEMORY must use positive K/M/G/T-style memory values.');
  else if (valkeyLimit < valkeyMaximum + 32 * 1024 * 1024) errors.push('VALKEY_MEMORY_LIMIT must leave at least 32 MiB above VALKEY_MAXMEMORY for process overhead.');
  if (enabled.includes('redlib')) {
    const redlibLimit = memoryBytes(values.REDLIB_MEMORY_LIMIT ?? '256M');
    const redlibReservation = memoryBytes(values.REDLIB_MEMORY_RESERVATION ?? '32M');
    const redlibTmpfs = memoryBytes(values.REDLIB_TMPFS_SIZE ?? '32m');
    if (!redlibLimit || !redlibReservation || !redlibTmpfs) {
      errors.push('REDLIB_MEMORY_LIMIT, REDLIB_MEMORY_RESERVATION, and REDLIB_TMPFS_SIZE must use positive K/M/G/T-style memory values.');
    } else if (redlibReservation > redlibLimit) {
      errors.push('REDLIB_MEMORY_RESERVATION must not exceed REDLIB_MEMORY_LIMIT.');
    }
  }
  if (values.REDLIB_SFW_ONLY !== undefined && !['on', 'off'].includes(values.REDLIB_SFW_ONLY)) {
    errors.push('REDLIB_SFW_ONLY must be on or off.');
  }

  for (const key of retiredSettings) if ((values[key] ?? '').trim()) {
    errors.push(`${key} belongs to a retired service and must be removed or left empty.`);
  }

  if (errors.length) throw new Error(`Configuration validation failed:\n- ${errors.join('\n- ')}`);
  return values;
}

function validateAnubis(values, { launch }, errors) {
  let expectedAnubisHost = '';
  try { expectedAnubisHost = normalizeHost(new URL(values.PUBLIC_REDDIT_URL ?? '').hostname); } catch { /* URL validation reports this. */ }
  const anubisHost = normalizeHost(values.ANUBIS_PUBLIC_HOST ?? '');
  if (!anubisHost || (expectedAnubisHost && anubisHost !== expectedAnubisHost)) {
    errors.push('ANUBIS_PUBLIC_HOST must be the exact hostname used by PUBLIC_REDDIT_URL.');
  }
  const cookieSecure = values.ANUBIS_COOKIE_SECURE ?? 'true';
  const cookiePartitioned = values.ANUBIS_COOKIE_PARTITIONED ?? 'true';
  if (!['true', 'false'].includes(cookieSecure)) errors.push('ANUBIS_COOKIE_SECURE must be true or false.');
  if (!['true', 'false'].includes(cookiePartitioned)) errors.push('ANUBIS_COOKIE_PARTITIONED must be true or false.');
  if (launch && cookieSecure !== 'true') errors.push('ANUBIS_COOKIE_SECURE must be true for public launch.');
  if (cookieSecure === 'false' && cookiePartitioned !== 'false') {
    errors.push('ANUBIS_COOKIE_PARTITIONED must be false when ANUBIS_COOKIE_SECURE is false.');
  }
}

function validatePrivateIp(name, value, errors) {
  if (!isIP(value)) return errors.push(`${name} must be one exact IP address.`);
  if (!isPrivateAddress(value)) errors.push(`${name} must be a private or Tailscale address, never a wildcard, loopback, or public address.`);
}

function isPrivateAddress(value) {
  if (isIP(value) === 6) return /^(?:fc|fd)/i.test(value);
  const parts = value.split('.').map(Number);
  return parts[0] === 10
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127);
}

function validateHostname(name, value, required, requireReal, errors) {
  const hostname = (value ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (!hostname && !required) return '';
  if (!hostname) {
    errors.push(`${name} must be replaced with a real public hostname.`);
    return hostname;
  }
  if (requireReal && (isPlaceholder(hostname) || isReservedHostname(hostname))) {
    errors.push(`${name} must be replaced with a real public hostname.`);
    return hostname;
  }
  if (!requireReal && isPlaceholder(hostname)) return hostname;
  if (isIP(hostname) || !isDnsHostname(hostname)) {
    errors.push(`${name} must contain a hostname only, without a scheme, path, port, or IP literal.`);
  }
  return hostname;
}

function validateServiceUrl(name, value, expectedHost, trailingSlash, errors) {
  let url;
  try { url = new URL(value ?? ''); } catch { return errors.push(`${name} must be a valid HTTPS URL.`); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search || url.hash || url.hostname.toLowerCase() !== expectedHost) {
    errors.push(`${name} must use HTTPS and the matching PUBLIC_*_HOST, with no credentials, port, query, or fragment.`);
  }
  if (url.pathname !== '/') errors.push(`${name} must not contain a path.`);
  if (trailingSlash && !(value ?? '').endsWith('/')) errors.push(`${name} must end with a slash.`);
  if (!trailingSlash && (value ?? '').endsWith('/')) errors.push(`${name} must be an origin without a trailing slash.`);
}

function validatePreviewHostname(name, value, bindIp, errors) {
  if (normalizedIp(value ?? '') !== bindIp) errors.push(`${name} must equal PRIVATE_BIND_IP while PRIVATE_PREVIEW=1.`);
}

function validatePreviewServiceUrl(name, value, bindIp, expectedPort, trailingSlash, errors) {
  let url;
  try { url = new URL(value ?? ''); } catch { return errors.push(`${name} must be a valid direct private-preview HTTP URL.`); }
  const effectivePort = url.port || (url.protocol === 'http:' ? '80' : '');
  if (url.protocol !== 'http:' || url.username || url.password || url.search || url.hash
      || normalizedIp(url.hostname) !== bindIp || effectivePort !== String(expectedPort)) {
    errors.push(`${name} must use direct HTTP on PRIVATE_BIND_IP and its configured service port while PRIVATE_PREVIEW=1.`);
  }
  if (url.pathname !== '/') errors.push(`${name} must not contain a path.`);
  if (trailingSlash && !(value ?? '').endsWith('/')) errors.push(`${name} must end with a slash.`);
  if (!trailingSlash && (value ?? '').endsWith('/')) errors.push(`${name} must be an origin without a trailing slash.`);
}

function validatePreviewOrPublicServiceUrl(name, value, bindIp, expectedPort, trailingSlash, errors) {
  let url;
  try { url = new URL(value ?? ''); } catch { return errors.push(`${name} must be a valid service URL.`); }
  if (url.protocol !== 'https:') return validatePreviewServiceUrl(name, value, bindIp, expectedPort, trailingSlash, errors);
  const hostname = validateHostname(`${name}_HOST`, url.hostname, true, true, errors);
  return validateServiceUrl(name, value, hostname, trailingSlash, errors);
}

function hostnameFromUrl(value) {
  try { return new URL(value ?? '').hostname; } catch { return ''; }
}

function validateLaunchUrl(name, value, errors) {
  try {
    const url = new URL(value ?? '');
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || isIP(hostname) || !isDnsHostname(hostname) || isReservedHostname(hostname)) throw new Error('unsafe');
  } catch {
    errors.push(`${name} must be a configured public HTTPS URL without credentials or an IP/reserved hostname.`);
  }
}

async function localAddresses() {
  const addresses = new Set();
  try {
    for (const entries of Object.values(networkInterfaces())) {
      for (const entry of entries ?? []) addresses.add(normalizedIp(entry.address));
    }
    return addresses;
  } catch {
    try {
      const ipv4 = await readFile('/proc/net/fib_trie', 'utf8');
      for (const match of ipv4.matchAll(/\|--\s+(\d+\.\d+\.\d+\.\d+)\s*\n\s+\/32 host LOCAL/g)) addresses.add(normalizedIp(match[1]));
      const ipv6 = await readFile('/proc/net/if_inet6', 'utf8');
      for (const line of ipv6.trim().split(/\r?\n/)) {
        const hex = line.trim().split(/\s+/)[0] ?? '';
        if (/^[a-f0-9]{32}$/i.test(hex)) addresses.add(normalizedIp(hex.match(/.{4}/g).join(':')));
      }
      return addresses.size ? addresses : null;
    } catch {
      return null;
    }
  }
}

function normalizedIp(value) {
  const cleaned = String(value).trim().replace(/^\[|\]$/g, '').replace(/%.+$/, '');
  if (isIP(cleaned) !== 6) return cleaned;
  try { return new URL(`http://[${cleaned}]`).hostname.replace(/^\[|\]$/g, '').toLowerCase(); } catch { return cleaned.toLowerCase(); }
}
function normalizeHost(value) { return String(value).trim().replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase(); }
function isPlaceholder(value) { return /REPLACE_|example\.org/i.test(value); }
function isDnsHostname(value) { return /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value); }
function isReservedHostname(value) { return /(?:^|\.)(?:example|test|invalid|localhost|local|internal|onion)$|(?:^|\.)example\.(?:com|net|org)$|(?:^|\.)home\.arpa$/i.test(value); }
function csv(value) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function defaultPort(key) {
  return ({
    PORTAL_PORT: '8080',
    SEARXNG_PORT: '8888',
    REDLIB_PORT: '3002',
    FRESHRSS_PORT: '3106',
    PRIVATEBIN_PORT: '3108',
    BENTOPDF_PORT: '3101', VERT_PORT: '3102', OMNITOOLS_PORT: '3103',
    ITTOOLS_PORT: '3109', HATSH_PORT: '3110', DRAWIO_PORT: '3111', MINIQR_PORT: '3112',
    RSSBRIDGE_PORT: '3120', NTFY_PORT: '3121', YOPASS_PORT: '3122', PAIRDROP_PORT: '3124', KUMA_PUBLIC_PORT: '3125',
    JUPYTERLITE_PORT: '3133', WHISPER_PORT: '3137',
    WAKAPI_PORT: '3136', RESUME_PORT: '3130', PENPOT_PORT: '3131', ACTUAL_PORT: '3132',
    RALLLY_PORT: '3123', PRIVIBLUR_PORT: '3139', MEZZO_PORT: '3140', FMD_PORT: '3141',
  })[key];
}
function memoryBytes(value) {
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)\s*([kmgt])(?:i?b)?$/i);
  if (!match) return 0;
  return Number(match[1]) * (1024 ** ({ k: 1, m: 2, g: 3, t: 4 })[match[2].toLowerCase()]);
}

function parseEnv(source) {
  const output = {};
  for (const original of source.split(/\r?\n/)) {
    const line = original.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    output[key] = value;
  }
  return output;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const launch = process.argv.includes('--launch');
  await loadValidatedEnvironment({ launch });
  process.stdout.write(`${launch ? 'Launch' : 'Private-deployment'} configuration values and cross-field relationships are valid.\n`);
}
