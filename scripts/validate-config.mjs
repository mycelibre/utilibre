import { readFile, stat } from 'node:fs/promises';
import { isIP } from 'node:net';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';

const repository = new URL('../', import.meta.url);
const linkedServices = [
  { id: 'ntfy', hostKey: 'PUBLIC_NTFY_HOST', urlKey: 'PUBLIC_NTFY_URL', portKey: 'NTFY_PORT' },
  { id: 'bentopdf', hostKey: 'PUBLIC_PDF_HOST', urlKey: 'PUBLIC_PDF_URL', portKey: 'BENTOPDF_PORT' },
  { id: 'vert', hostKey: 'PUBLIC_CONVERT_HOST', urlKey: 'PUBLIC_CONVERT_URL', portKey: 'VERT_PORT' },
  { id: 'omnitools', hostKey: 'PUBLIC_TOOLS_HOST', urlKey: 'PUBLIC_TOOLS_URL', portKey: 'OMNITOOLS_PORT' },
  { id: 'healthchecks', hostKey: 'PUBLIC_MONITOR_HOST', urlKey: 'PUBLIC_MONITOR_URL', portKey: 'HEALTHCHECKS_PORT' },
  { id: 'pairdrop', hostKey: 'PUBLIC_SEND_HOST', urlKey: 'PUBLIC_SEND_URL', portKey: 'PAIRDROP_PORT' },
  { id: 'freshrss', hostKey: 'PUBLIC_RSS_HOST', urlKey: 'PUBLIC_RSS_URL', portKey: 'FRESHRSS_PORT' },
  { id: 'rsshub', hostKey: 'PUBLIC_FEEDS_HOST', urlKey: 'PUBLIC_FEEDS_URL', portKey: 'RSSHUB_PORT' },
  { id: 'privatebin', hostKey: 'PUBLIC_PASTE_HOST', urlKey: 'PUBLIC_PASTE_URL', portKey: 'PRIVATEBIN_PORT' },
  { id: 'wakapi', hostKey: 'PUBLIC_WAKAPI_HOST', urlKey: 'PUBLIC_WAKAPI_URL', portKey: 'WAKAPI_PORT' },
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
  const portalCobaltBrowserUrl = values.PORTAL_COBALT_BROWSER_URL || values.COBALT_PUBLIC_API_URL;
  const portalCobaltResultSourceUrl = values.PORTAL_COBALT_RESULT_SOURCE_URL || values.COBALT_PUBLIC_API_URL;
  if (portalPrivatePreview) {
    validatePreviewServiceUrl('PORTAL_PUBLIC_ORIGIN', portalOrigin, bindIp, values.PORTAL_PORT ?? defaultPort('PORTAL_PORT'), false, errors);
    validatePreviewServiceUrl('PORTAL_COBALT_BROWSER_URL', portalCobaltBrowserUrl, bindIp, values.COBALT_PORT ?? defaultPort('COBALT_PORT'), true, errors);
  } else {
    const portalOriginHost = validateHostname('PORTAL_PUBLIC_ORIGIN_HOST', hostnameFromUrl(portalOrigin), true, true, errors);
    const portalCobaltHost = validateHostname('PORTAL_COBALT_BROWSER_URL_HOST', hostnameFromUrl(portalCobaltBrowserUrl), true, true, errors);
    validateServiceUrl('PORTAL_PUBLIC_ORIGIN', portalOrigin, portalOriginHost, false, errors);
    validateServiceUrl('PORTAL_COBALT_BROWSER_URL', portalCobaltBrowserUrl, portalCobaltHost, true, errors);
  }
  validatePreviewOrPublicServiceUrl(
    'PORTAL_COBALT_RESULT_SOURCE_URL',
    portalCobaltResultSourceUrl,
    bindIp,
    values.COBALT_PORT ?? defaultPort('COBALT_PORT'),
    true,
    errors,
  );

  const secret = values.SEARXNG_SECRET ?? '';
  if (!/^[a-f0-9]{64}$/i.test(secret) || isPlaceholder(secret)) {
    errors.push('SEARXNG_SECRET must be a non-placeholder 32-byte hexadecimal secret (64 characters).');
  }

  const enabled = csv(values.ENABLED_SERVICES ?? 'cobalt,searxng');
  const allowedServices = new Set(['cobalt', 'searxng', 'redlib', 'rimgo', ...linkedServices.map(({ id }) => id)]);
  for (const id of enabled) if (!allowedServices.has(id)) errors.push(`ENABLED_SERVICES contains unsupported ID: ${id}`);
  const composeProfiles = csv(values.COMPOSE_PROFILES ?? '');
  if (enabled.includes('redlib') !== composeProfiles.includes('privacy-frontends')) {
    errors.push('Redlib requires both ENABLED_SERVICES=...redlib... and the privacy-frontends entry in COMPOSE_PROFILES; enable or disable both together.');
  }
  if (!['en', 'es'].includes(values.DEFAULT_LANGUAGE ?? 'en')) errors.push('DEFAULT_LANGUAGE must be en or es.');

  if (launch) {
    for (const id of ['cobalt', 'searxng']) {
      if (!enabled.includes(id)) errors.push(`ENABLED_SERVICES must include ${id} for launch.`);
    }
    if (enabled.includes('rimgo')) {
      errors.push('ENABLED_SERVICES must not include rimgo for launch until an official fixed release is pinned and reviewed.');
    }
    const requiredHosts = ['PUBLIC_PORTAL_HOST', 'PUBLIC_MEDIA_HOST', 'PUBLIC_SEARCH_HOST'];
    if (enabled.includes('redlib')) requiredHosts.push('PUBLIC_REDDIT_HOST');
    for (const service of linkedServices) if (enabled.includes(service.id)) requiredHosts.push(service.hostKey);
    for (const key of requiredHosts) {
      if (!(values[key] ?? '').trim()) errors.push(`${key} must be set explicitly for launch.`);
    }
    validateLaunchUrl('SOURCE_CODE_URL', values.SOURCE_CODE_URL, errors);
    validateLaunchUrl('CONTACT_URL', values.CONTACT_URL, errors);
  }
  if ((values.SUPPORT_URL ?? '').trim()) validateLaunchUrl('SUPPORT_URL', values.SUPPORT_URL, errors);
  const portalPort = values.PORTAL_PORT ?? defaultPort('PORTAL_PORT');
  const cobaltPort = values.COBALT_PORT ?? defaultPort('COBALT_PORT');
  const searxngPort = values.SEARXNG_PORT ?? defaultPort('SEARXNG_PORT');
  const redlibPort = values.REDLIB_PORT ?? defaultPort('REDLIB_PORT');
  if (privatePreview && !launch) {
    validatePreviewHostname('PUBLIC_PORTAL_HOST', values.PUBLIC_PORTAL_HOST, bindIp, errors);
    validatePreviewHostname('PUBLIC_MEDIA_HOST', values.PUBLIC_MEDIA_HOST, bindIp, errors);
    validatePreviewHostname('PUBLIC_SEARCH_HOST', values.PUBLIC_SEARCH_HOST, bindIp, errors);
    validatePreviewServiceUrl('PUBLIC_PORTAL_ORIGIN', values.PUBLIC_PORTAL_ORIGIN, bindIp, portalPort, false, errors);
    validatePreviewServiceUrl('COBALT_PUBLIC_API_URL', values.COBALT_PUBLIC_API_URL, bindIp, cobaltPort, true, errors);
    validatePreviewOrPublicServiceUrl('PUBLIC_SEARCH_URL', values.PUBLIC_SEARCH_URL, bindIp, searxngPort, true, errors);
    if (enabled.includes('redlib')) {
      validatePreviewHostname('PUBLIC_REDDIT_HOST', values.PUBLIC_REDDIT_HOST, bindIp, errors);
      validatePreviewOrPublicServiceUrl('PUBLIC_REDDIT_URL', values.PUBLIC_REDDIT_URL, bindIp, redlibPort, true, errors);
    } else if ((values.PUBLIC_REDDIT_URL ?? '').trim()) {
      errors.push('PUBLIC_REDDIT_URL must stay empty while redlib is not enabled.');
    }
    for (const service of linkedServices) {
      if (enabled.includes(service.id)) {
        validatePreviewHostname(service.hostKey, values[service.hostKey], bindIp, errors);
        validatePreviewOrPublicServiceUrl(service.urlKey, values[service.urlKey], bindIp, values[service.portKey] ?? defaultPort(service.portKey), true, errors);
      } else if ((values[service.urlKey] ?? '').trim()) {
        errors.push(`${service.urlKey} must stay empty while ${service.id} is not enabled.`);
      }
    }
  } else {
    const portalHost = validateHostname('PUBLIC_PORTAL_HOST', values.PUBLIC_PORTAL_HOST || hostnameFromUrl(values.PUBLIC_PORTAL_ORIGIN), true, launch, errors);
    const mediaHost = validateHostname('PUBLIC_MEDIA_HOST', values.PUBLIC_MEDIA_HOST || hostnameFromUrl(values.COBALT_PUBLIC_API_URL), true, launch, errors);
    const searchHost = validateHostname('PUBLIC_SEARCH_HOST', values.PUBLIC_SEARCH_HOST || hostnameFromUrl(values.PUBLIC_SEARCH_URL), true, launch, errors);
    validateServiceUrl('PUBLIC_PORTAL_ORIGIN', values.PUBLIC_PORTAL_ORIGIN, portalHost, false, errors);
    validateServiceUrl('COBALT_PUBLIC_API_URL', values.COBALT_PUBLIC_API_URL, mediaHost, true, errors);
    validateServiceUrl('PUBLIC_SEARCH_URL', values.PUBLIC_SEARCH_URL, searchHost, true, errors);
    if (enabled.includes('redlib')) {
      const redditHost = validateHostname('PUBLIC_REDDIT_HOST', values.PUBLIC_REDDIT_HOST || hostnameFromUrl(values.PUBLIC_REDDIT_URL), true, launch, errors);
      validateServiceUrl('PUBLIC_REDDIT_URL', values.PUBLIC_REDDIT_URL, redditHost, true, errors);
    } else if ((values.PUBLIC_REDDIT_URL ?? '').trim()) {
      errors.push('PUBLIC_REDDIT_URL must stay empty while redlib is not enabled.');
    }
    for (const service of linkedServices) {
      if (enabled.includes(service.id)) {
        const host = validateHostname(service.hostKey, values[service.hostKey] || hostnameFromUrl(values[service.urlKey]), true, launch, errors);
        validateServiceUrl(service.urlKey, values[service.urlKey], host, true, errors);
      } else if ((values[service.urlKey] ?? '').trim()) {
        errors.push(`${service.urlKey} must stay empty while ${service.id} is not enabled.`);
      }
    }
  }

  if (enabled.includes('redlib')) {
    let expectedAnubisHost = '';
    try { expectedAnubisHost = normalizeHost(new URL(values.PUBLIC_REDDIT_URL ?? '').hostname); } catch { /* URL validation above reports this. */ }
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

  if (launch && (values.PUBLIC_IMGUR_URL ?? '').trim()) {
    errors.push('PUBLIC_IMGUR_URL must stay empty for launch until an official fixed rimgo release is pinned and reviewed.');
  } else if (!launch && enabled.includes('rimgo')) {
    const imgurHost = validateHostname('PUBLIC_IMGUR_HOST', values.PUBLIC_IMGUR_HOST, true, launch, errors);
    validateServiceUrl('PUBLIC_IMGUR_URL', values.PUBLIC_IMGUR_URL, imgurHost, true, errors);
  } else if ((values.PUBLIC_IMGUR_URL ?? '').trim()) {
    errors.push('PUBLIC_IMGUR_URL must stay empty while rimgo is not enabled.');
  }
  if ((values.PUBLIC_YOUTUBE_URL ?? '').trim()) errors.push('PUBLIC_YOUTUBE_URL must stay empty because Invidious is deferred in this Compose project.');
  for (const key of ['INVIDIOUS_DB_USER', 'INVIDIOUS_DB_PASSWORD', 'INVIDIOUS_DB_NAME']) {
    if ((values[key] ?? '').trim()) errors.push(`${key} must stay empty because Invidious is deferred in this Compose project.`);
  }

  const ports = [
    'PORTAL_PORT',
    'COBALT_PORT',
    'SEARXNG_PORT',
    ...(enabled.includes('redlib') ? ['REDLIB_PORT'] : []),
    ...(enabled.includes('rimgo') ? ['RIMGO_PORT'] : []),
    ...linkedServices.filter(({ id }) => enabled.includes(id)).map(({ portKey }) => portKey),
  ];
  const seenPorts = new Map();
  for (const key of ports) {
    const value = values[key] ?? defaultPort(key);
    if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) errors.push(`${key} must be an integer from 1 through 65535.`);
    else if (seenPorts.has(value)) errors.push(`${key} conflicts with ${seenPorts.get(value)} on host port ${value}.`);
    else seenPorts.set(value, key);
  }

  for (const key of [
    'COBALT_DURATION_LIMIT_SECONDS',
    'COBALT_TUNNEL_LIFESPAN_SECONDS',
    'COBALT_RATELIMIT_WINDOW_SECONDS',
    'COBALT_RATELIMIT_MAX',
    'COBALT_TUNNEL_RATELIMIT_WINDOW_SECONDS',
    'COBALT_TUNNEL_RATELIMIT_MAX',
    'MEDIA_RATE_WINDOW_SECONDS',
    'MEDIA_RATE_LIMIT',
    'MEDIA_MAX_CONCURRENT',
    'MEDIA_REQUEST_TIMEOUT_SECONDS',
    'STATUS_CACHE_SECONDS',
    'COBALT_PIDS_LIMIT',
    'REDLIB_PIDS_LIMIT',
    'DOCKER_LOG_MAX_FILES',
  ]) {
    if (values[key] !== undefined && (!/^\d+$/.test(values[key]) || Number(values[key]) < 1)) errors.push(`${key} must be a positive integer.`);
  }
  if (values.COBALT_PROCESSING_PRIORITY !== undefined && (!/^\d+$/.test(values.COBALT_PROCESSING_PRIORITY) || Number(values.COBALT_PROCESSING_PRIORITY) > 19)) {
    errors.push('COBALT_PROCESSING_PRIORITY must be an integer from 0 through 19; larger values are invalid and negative values would raise FFmpeg priority.');
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

  if (errors.length) throw new Error(`Configuration validation failed:\n- ${errors.join('\n- ')}`);
  return values;
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
  if (
    url.protocol !== 'http:'
    || url.username
    || url.password
    || url.search
    || url.hash
    || normalizedIp(url.hostname) !== bindIp
    || effectivePort !== String(expectedPort)
  ) errors.push(`${name} must use direct HTTP on PRIVATE_BIND_IP and its configured service port while PRIVATE_PREVIEW=1.`);
  if (url.pathname !== '/') errors.push(`${name} must not contain a path.`);
  if (trailingSlash && !(value ?? '').endsWith('/')) errors.push(`${name} must end with a slash.`);
  if (!trailingSlash && (value ?? '').endsWith('/')) errors.push(`${name} must be an origin without a trailing slash.`);
}

function validatePreviewOrPublicServiceUrl(name, value, bindIp, expectedPort, trailingSlash, errors) {
  let url;
  try { url = new URL(value ?? ''); } catch { return errors.push(`${name} must be a valid service URL.`); }
  if (url.protocol !== 'https:') {
    return validatePreviewServiceUrl(name, value, bindIp, expectedPort, trailingSlash, errors);
  }
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
  const cleaned = value.trim().replace(/^\[|\]$/g, '').replace(/%.+$/, '');
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
    COBALT_PORT: '9000',
    SEARXNG_PORT: '8888',
    REDLIB_PORT: '3002',
    RIMGO_PORT: '3001',
    NTFY_PORT: '2586',
    BENTOPDF_PORT: '3101',
    VERT_PORT: '3102',
    OMNITOOLS_PORT: '3103',
    HEALTHCHECKS_PORT: '3104',
    PAIRDROP_PORT: '3105',
    FRESHRSS_PORT: '3106',
    RSSHUB_PORT: '3107',
    PRIVATEBIN_PORT: '3108',
    WAKAPI_PORT: '3109',
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
