import { createHash, randomBytes as secureRandomBytes, timingSafeEqual } from 'node:crypto';
import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';
import { clearInterval, clearTimeout, setInterval, setTimeout } from 'node:timers';
import { domainToASCII } from 'node:url';

const API_ROOT = '/_portal/developer';
const INBOX_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const CURSOR_PATTERN = /^\d{1,16}$/;
const DNS_TYPES = new Set(['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NS', 'SOA', 'SRV', 'TXT']);
const MAX_RETAINED_WEBHOOK_HEADERS = 32;
const MAX_RETAINED_WEBHOOK_HEADER_BYTES = 32 * 1024;
const MAX_CONNECTION_HEADER_BYTES = 16 * 1024;
const SPECIAL_USE_SUFFIXES = [
  'arpa',
  'alt',
  'corp',
  'example',
  'home',
  'home.arpa',
  'internal',
  'invalid',
  'lan',
  'local',
  'localdomain',
  'localhost',
  'onion',
  'test',
];
const HIDDEN_WEBHOOK_HEADERS = new Set([
  'authorization',
  'cf-connecting-ip',
  'cf-connecting-ipv6',
  'cf-ipcountry',
  'cf-pseudo-ipv4',
  'cf-ray',
  'cf-visitor',
  'cdn-loop',
  'client-ip',
  'connection',
  'cookie',
  'fastly-client-ip',
  'fly-client-ip',
  'forwarded',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'true-client-ip',
  'upgrade',
  'via',
  'x-client-ip',
  'x-cluster-client-ip',
  'x-envoy-external-address',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-forwarded-server',
  'x-original-forwarded-for',
  'x-proxyuser-ip',
  'x-real-ip',
]);

export const DEFAULT_DEVELOPER_API_LIMITS = Object.freeze({
  inboxTtlMs: 15 * 60_000,
  // The deployed edge currently caps request bodies at 16 KiB. Keeping this
  // below that limit leaves room for edge parsing overhead and avoids a proxy
  // configuration change for the initial release.
  webhookBodyBytes: 12 * 1024,
  webhookBodyReadTimeoutMs: 10_000,
  webhookConcurrent: 32,
  webhookConcurrentPerInbox: 4,
  webhookEventsPerInbox: 25,
  webhookBytesPerInbox: 1024 * 1024,
  webhookListEvents: 10,
  webhookListBytes: 192 * 1024,
  webhookListConcurrent: 32,
  webhookListConcurrentPerInbox: 2,
  webhookInboxesPerClient: 3,
  webhookEventsPerClient: 75,
  webhookBytesPerClient: 2 * 1024 * 1024,
  globalInboxes: 100,
  globalWebhookEvents: 2048,
  globalWebhookBytes: 16 * 1024 * 1024,
  createRequestsPerWindow: 10,
  createWindowMs: 15 * 60_000,
  ingestRequestsPerIpWindow: 240,
  ingestRequestsPerInboxWindow: 120,
  ingestWindowMs: 60_000,
  managementRequestsPerWindow: 120,
  managementIpRequestsPerWindow: 600,
  managementDeniedRequestsPerWindow: 60,
  managementWindowMs: 60_000,
  dnsRequestsPerWindow: 60,
  dnsWindowMs: 5 * 60_000,
  dnsConcurrent: 8,
  dnsTimeoutMs: 4_000,
  dnsRecords: 100,
  dnsResponseBytes: 64 * 1024,
  limiterKeys: 4096,
});

/**
 * Creates an isolated, memory-only developer API.
 *
 * Call `await api.handle(request, response, requestUrl)` before the server's
 * generic /_portal 404. A false return means the route does not belong to this
 * module. `allowManagementRequest` must enforce the portal's same-origin policy
 * for inbox creation and DNS requests. `getClientKey` should use only a trusted
 * edge-proxy header; the default uses the directly connected peer address.
 */
export function createDeveloperApi(options = {}) {
  const limits = normalizeLimits(options.limits);
  const webhookEnabled = options.webhookEnabled !== false;
  const dnsEnabled = options.dnsEnabled !== false;
  const now = typeof options.now === 'function' ? options.now : Date.now;
  const randomBytes = typeof options.randomBytes === 'function' ? options.randomBytes : secureRandomBytes;
  const allowManagementRequest = typeof options.allowManagementRequest === 'function'
    ? options.allowManagementRequest
    : defaultSameOriginRequest;
  const getClientKey = typeof options.getClientKey === 'function'
    ? options.getClientKey
    : (request) => request.socket?.remoteAddress || 'unknown';
  const resolveDns = typeof options.resolveDns === 'function' ? options.resolveDns : systemResolveDns;
  const inboxes = new Map();
  const rateBuckets = new Map();
  const rateSalt = randomBytes(32);
  const dummyTokenHash = hashToken(randomBytes(32).toString('base64url'));
  let globalEventCount = 0;
  let globalEventBytes = 0;
  let activeWebhookRequests = 0;
  let activeWebhookListResponses = 0;
  let activeDnsRequests = 0;

  const sweepTimer = setInterval(() => sweep(), Math.max(1_000, Math.min(limits.inboxTtlMs, 60_000)));
  sweepTimer.unref();

  async function handle(request, response, requestUrl) {
    if (!(requestUrl instanceof URL)) throw new TypeError('A validated request URL is required');
    const pathname = requestUrl.pathname;
    if (pathname !== API_ROOT && !pathname.startsWith(`${API_ROOT}/`)) return false;

    setApiHeaders(response);
    sweep();

    if (!webhookEnabled && (pathname.startsWith(`${API_ROOT}/webhook-inboxes`) || pathname.startsWith(`${API_ROOT}/webhooks/`))) {
      return rejectRequest(request, response, 404, { error: 'not_found' });
    }
    if (!dnsEnabled && pathname === `${API_ROOT}/dns`) return rejectRequest(request, response, 404, { error: 'not_found' });

    if (pathname === `${API_ROOT}/webhook-inboxes`) {
      if (request.method !== 'POST') return methodNotAllowed(request, response, ['POST']);
      return await createInbox(request, response);
    }

    const eventMatch = pathname.match(/^\/_portal\/developer\/webhook-inboxes\/([^/]+)\/events$/);
    if (eventMatch) {
      if (request.method !== 'GET') return methodNotAllowed(request, response, ['GET']);
      return listEvents(request, response, requestUrl, eventMatch[1]);
    }

    const inboxMatch = pathname.match(/^\/_portal\/developer\/webhook-inboxes\/([^/]+)$/);
    if (inboxMatch) {
      if (request.method !== 'DELETE') return methodNotAllowed(request, response, ['DELETE']);
      return deleteInbox(request, response, inboxMatch[1]);
    }

    const receiveMatch = pathname.match(/^\/_portal\/developer\/webhooks\/([^/]+)$/);
    if (receiveMatch) {
      if (!['DELETE', 'PATCH', 'POST', 'PUT'].includes(request.method || '')) {
        return methodNotAllowed(request, response, ['POST', 'PUT', 'PATCH', 'DELETE']);
      }
      return await receiveWebhook(request, response, requestUrl, receiveMatch[1]);
    }

    if (pathname === `${API_ROOT}/dns`) {
      if (request.method !== 'POST') return methodNotAllowed(request, response, ['POST']);
      return await lookupDns(request, response);
    }

    return rejectRequest(request, response, 404, { error: 'not_found' });
  }

  async function createInbox(request, response) {
    if (!allowManagementRequest(request)) return rejectRequest(request, response, 403, { error: 'origin_not_allowed' });
    const client = clientHash(getClientKey(request));
    if (!takeRateToken(`create:${client}`, limits.createRequestsPerWindow, limits.createWindowMs)) {
      return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.createWindowMs));
    }
    if (ownerUsage(client).inboxes >= limits.webhookInboxesPerClient) {
      return rejectRequest(request, response, 503, { error: 'capacity_reached' }, { 'Retry-After': '60' });
    }
    if (inboxes.size >= limits.globalInboxes) return rejectRequest(request, response, 503, { error: 'capacity_reached' }, { 'Retry-After': '60' });

    // A body is unnecessary and accepting one creates an avoidable parsing surface.
    const contentLength = parseContentLength(request.headers['content-length']);
    if (contentLength === null || contentLength > 0 || request.headers['transfer-encoding']) {
      request.resume();
      return rejectRequest(request, response, 400, { error: 'invalid_request' });
    }

    const id = uniqueOpaqueId(inboxes, randomBytes);
    if (!id) return rejectRequest(request, response, 503, { error: 'capacity_reached' }, { 'Retry-After': '60' });
    const readToken = randomBytes(24).toString('base64url');
    const createdAt = now();
    const inbox = {
      id,
      ownerKey: client,
      readTokenHash: hashToken(readToken),
      createdAt,
      expiresAt: createdAt + limits.inboxTtlMs,
      nextSequence: 1,
      events: [],
      bytes: 0,
      activeReceivers: 0,
      activeReaders: 0,
    };
    inboxes.set(id, inbox);
    return sendJson(response, 201, {
      inbox: {
        id,
        receivePath: `${API_ROOT}/webhooks/${id}`,
        eventsPath: `${API_ROOT}/webhook-inboxes/${id}/events`,
        expiresAt: new Date(inbox.expiresAt).toISOString(),
        limits: {
          bodyBytes: limits.webhookBodyBytes,
          events: limits.webhookEventsPerInbox,
          retainedBytes: limits.webhookBytesPerInbox,
        },
      },
      readToken,
    });
  }

  async function receiveWebhook(request, response, requestUrl, id) {
    if (!INBOX_ID_PATTERN.test(id)) return rejectRequest(request, response, 404, { error: 'not_found' });
    const client = clientHash(getClientKey(request));
    if (!takeRateToken(`ingest-ip:${client}`, limits.ingestRequestsPerIpWindow, limits.ingestWindowMs)) {
      return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.ingestWindowMs));
    }
    const inbox = inboxes.get(id);
    if (!inbox || inbox.expiresAt <= now()) return rejectRequest(request, response, 404, { error: 'not_found' });
    if (!takeRateToken(`ingest-inbox:${id}`, limits.ingestRequestsPerInboxWindow, limits.ingestWindowMs)) {
      return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.ingestWindowMs));
    }

    if (requestUrl.search.length > 4_097) return rejectRequest(request, response, 414, { error: 'request_uri_too_long' });
    const contentLength = parseContentLength(request.headers['content-length']);
    if (contentLength === null) return rejectRequest(request, response, 400, { error: 'invalid_request' });
    if (contentLength > limits.webhookBodyBytes) {
      request.resume();
      return rejectRequest(request, response, 413, { error: 'request_too_large' });
    }
    if (activeWebhookRequests >= limits.webhookConcurrent
      || inbox.activeReceivers >= limits.webhookConcurrentPerInbox) {
      return rejectRequest(request, response, 503, { error: 'busy' }, { 'Retry-After': '5' });
    }

    activeWebhookRequests += 1;
    inbox.activeReceivers += 1;
    try {
      let body;
      try {
        body = await readLimitedBuffer(request, limits.webhookBodyBytes, limits.webhookBodyReadTimeoutMs);
      } catch (error) {
        if (error instanceof Error && error.message === 'too_large') {
          return rejectRequest(request, response, 413, { error: 'request_too_large' });
        }
        if (error instanceof Error && error.message === 'body_timeout') {
          return rejectRequest(request, response, 408, { error: 'request_timeout' });
        }
        if (response.destroyed || response.writableEnded) return true;
        return rejectRequest(request, response, 400, { error: 'invalid_request' });
      }

      const currentInbox = inboxes.get(id);
      if (currentInbox !== inbox || inbox.expiresAt <= now()) {
        if (currentInbox === inbox) removeInbox(inbox);
        return sendJson(response, 404, { error: 'not_found' });
      }

      const retainedHeaders = safeWebhookHeaders(request);
      const bodyValue = webhookBody(body, String(request.headers['content-type'] || ''));
      const event = {
        id: randomBytes(12).toString('base64url'),
        sequence: inbox.nextSequence,
        receivedAt: new Date(now()).toISOString(),
        method: request.method,
        query: requestUrl.search.slice(1),
        contentType: publicHeaderValue(request.headers['content-type'], 256),
        headers: retainedHeaders.values,
        headersTruncated: retainedHeaders.truncated,
        body: bodyValue,
      };
      const storedBytes = Buffer.byteLength(bodyValue.value, 'utf8')
        + Buffer.byteLength(JSON.stringify({ ...event, body: undefined }), 'utf8');
      if (storedBytes > limits.webhookBytesPerInbox) {
        return sendJson(response, 503, { error: 'capacity_reached' }, { 'Retry-After': '30' });
      }

      let evictCount = 0;
      let reclaimedBytes = 0;
      while (evictCount < inbox.events.length && (
        inbox.events.length - evictCount >= limits.webhookEventsPerInbox
        || inbox.bytes - reclaimedBytes + storedBytes > limits.webhookBytesPerInbox
      )) {
        reclaimedBytes += inbox.events[evictCount].storedBytes;
        evictCount += 1;
      }
      const projectedGlobalCount = globalEventCount - evictCount + 1;
      const projectedGlobalBytes = globalEventBytes - reclaimedBytes + storedBytes;
      const owner = ownerUsage(inbox.ownerKey);
      const projectedOwnerCount = owner.events - evictCount + 1;
      const projectedOwnerBytes = owner.bytes - reclaimedBytes + storedBytes;
      if (projectedGlobalCount > limits.globalWebhookEvents
        || projectedGlobalBytes > limits.globalWebhookBytes
        || projectedOwnerCount > limits.webhookEventsPerClient
        || projectedOwnerBytes > limits.webhookBytesPerClient) {
        return sendJson(response, 503, { error: 'capacity_reached' }, { 'Retry-After': '30' });
      }

      for (let index = 0; index < evictCount; index += 1) removeOldestEvent(inbox);
      inbox.nextSequence += 1;
      inbox.events.push({ ...event, storedBytes });
      inbox.bytes += storedBytes;
      globalEventCount += 1;
      globalEventBytes += storedBytes;
      return sendJson(response, 202, { received: true, eventId: event.id });
    } finally {
      activeWebhookRequests -= 1;
      inbox.activeReceivers -= 1;
    }
  }

  function listEvents(request, response, requestUrl, id) {
    const client = clientHash(getClientKey(request));
    const inbox = authorizedInbox(request, id);
    if (!inbox) {
      if (!takeRateToken(`manage-denied:${client}`, limits.managementDeniedRequestsPerWindow, limits.managementWindowMs)) {
        return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.managementWindowMs));
      }
      return rejectRequest(request, response, 404, { error: 'not_found' });
    }
    if (!takeRateToken(`manage-inbox:${id}`, limits.managementRequestsPerWindow, limits.managementWindowMs)
      || !takeRateToken(`manage-ip:${client}`, limits.managementIpRequestsPerWindow, limits.managementWindowMs)) {
      return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.managementWindowMs));
    }
    if (requestHasBody(request)) return rejectRequest(request, response, 400, { error: 'invalid_request' });

    const rawAfter = requestUrl.searchParams.get('after') || '0';
    if (!CURSOR_PATTERN.test(rawAfter)) return rejectRequest(request, response, 400, { error: 'invalid_cursor' });
    const after = Number(rawAfter);
    if (!Number.isSafeInteger(after)) return rejectRequest(request, response, 400, { error: 'invalid_cursor' });
    if (activeWebhookListResponses >= limits.webhookListConcurrent
      || inbox.activeReaders >= limits.webhookListConcurrentPerInbox) {
      return rejectRequest(request, response, 503, { error: 'busy' }, { 'Retry-After': '5' });
    }

    const candidates = inbox.events.filter((event) => event.sequence > after);
    const events = [];
    let responseBytes = 2;
    let truncated = false;
    for (const event of candidates) {
      const publicEvent = {
        id: event.id,
        sequence: event.sequence,
        receivedAt: event.receivedAt,
        method: event.method,
        query: event.query,
        contentType: event.contentType,
        headers: event.headers,
        headersTruncated: event.headersTruncated,
        body: event.body,
      };
      const eventBytes = Buffer.byteLength(JSON.stringify(publicEvent), 'utf8') + (events.length ? 1 : 0);
      if (events.length >= limits.webhookListEvents || responseBytes + eventBytes > limits.webhookListBytes) {
        truncated = true;
        break;
      }
      events.push(publicEvent);
      responseBytes += eventBytes;
    }

    activeWebhookListResponses += 1;
    inbox.activeReaders += 1;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      activeWebhookListResponses -= 1;
      inbox.activeReaders -= 1;
    };
    response.setTimeout(10_000, () => response.destroy());
    response.once('finish', release);
    response.once('close', release);
    try {
      return sendJson(response, 200, {
        id: inbox.id,
        expiresAt: new Date(inbox.expiresAt).toISOString(),
        events,
        nextCursor: events.at(-1)?.sequence ?? after,
        truncated: truncated || candidates.length > events.length,
      });
    } catch (error) {
      release();
      throw error;
    }
  }

  function deleteInbox(request, response, id) {
    const client = clientHash(getClientKey(request));
    const inbox = authorizedInbox(request, id);
    if (!inbox) {
      if (!takeRateToken(`manage-denied:${client}`, limits.managementDeniedRequestsPerWindow, limits.managementWindowMs)) {
        return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.managementWindowMs));
      }
      return rejectRequest(request, response, 404, { error: 'not_found' });
    }
    if (!takeRateToken(`manage-inbox:${id}`, limits.managementRequestsPerWindow, limits.managementWindowMs)
      || !takeRateToken(`manage-ip:${client}`, limits.managementIpRequestsPerWindow, limits.managementWindowMs)) {
      return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.managementWindowMs));
    }
    if (requestHasBody(request)) return rejectRequest(request, response, 400, { error: 'invalid_request' });
    removeInbox(inbox);
    response.writeHead(204);
    response.end();
    return true;
  }

  async function lookupDns(request, response) {
    if (!allowManagementRequest(request)) return rejectRequest(request, response, 403, { error: 'origin_not_allowed' });
    const client = clientHash(getClientKey(request));
    if (!takeRateToken(`dns:${client}`, limits.dnsRequestsPerWindow, limits.dnsWindowMs)) {
      return rejectRequest(request, response, 429, { error: 'rate_limited' }, retryHeader(limits.dnsWindowMs));
    }
    if (activeDnsRequests >= limits.dnsConcurrent) {
      return rejectRequest(request, response, 503, { error: 'busy' }, { 'Retry-After': '5' });
    }

    const contentLength = parseContentLength(request.headers['content-length']);
    if (contentLength === null) return rejectRequest(request, response, 400, { error: 'invalid_request' });
    if (contentLength > 4_096) return rejectRequest(request, response, 413, { error: 'request_too_large' });

    activeDnsRequests += 1;
    try {
      let input;
      try {
        input = JSON.parse((await readLimitedBuffer(request, 4_096, limits.webhookBodyReadTimeoutMs)).toString('utf8'));
      } catch (error) {
        if (error instanceof Error && error.message === 'too_large') {
          return rejectRequest(request, response, 413, { error: 'request_too_large' });
        }
        if (error instanceof Error && error.message === 'body_timeout') {
          return rejectRequest(request, response, 408, { error: 'request_timeout' });
        }
        if (response.destroyed || response.writableEnded) return true;
        return rejectRequest(request, response, 400, { error: 'invalid_request' });
      }
      const type = typeof input?.type === 'string' ? input.type.toUpperCase() : 'A';
      if (!DNS_TYPES.has(type)) return sendJson(response, 400, { error: 'unsupported_record_type' });
      const hostname = normalizePublicHostname(input?.hostname);
      if (!hostname) return sendJson(response, 400, { error: 'invalid_hostname' });

      try {
        const rawRecords = await resolveDns(hostname.ascii, type, limits.dnsTimeoutMs);
        const normalizedRecords = Array.isArray(rawRecords)
          ? rawRecords
          : rawRecords && typeof rawRecords === 'object' ? [rawRecords] : [];
        const allRecords = normalizedRecords.map(safeDnsValue).filter((value) => value !== null);
        const records = boundedDnsRecords(allRecords, limits.dnsRecords, limits.dnsResponseBytes);
        return sendJson(response, 200, {
          hostname: hostname.display,
          asciiHostname: hostname.ascii,
          type,
          records: records.values,
          truncated: records.truncated,
        });
      } catch (error) {
        const mapped = mapDnsError(error);
        return sendJson(response, mapped.status, { error: mapped.error });
      }
    } finally {
      activeDnsRequests -= 1;
    }
  }

  function authorizedInbox(request, id) {
    const wellFormed = INBOX_ID_PATTERN.test(id);
    const inbox = wellFormed ? inboxes.get(id) : undefined;
    const candidate = bearerToken(request.headers.authorization);
    const candidateHash = hashToken(candidate);
    const expected = inbox?.readTokenHash ?? dummyTokenHash;
    const matches = candidate.length > 0 && timingSafeEqual(candidateHash, expected);
    return inbox && inbox.expiresAt > now() && matches ? inbox : null;
  }

  function clientHash(value) {
    return createHash('sha256')
      .update(rateSalt)
      .update(String(value || 'unknown').slice(0, 256))
      .digest('base64url');
  }

  function takeRateToken(key, limit, windowMs) {
    const timestamp = now();
    const current = rateBuckets.get(key);
    if (current && current.resetAt > timestamp) {
      if (current.count >= limit) return false;
      current.count += 1;
      return true;
    }
    if (!current && rateBuckets.size >= limits.limiterKeys) return false;
    rateBuckets.set(key, { count: 1, resetAt: timestamp + windowMs });
    return true;
  }

  function ownerUsage(ownerKey) {
    const usage = { inboxes: 0, events: 0, bytes: 0 };
    for (const inbox of inboxes.values()) {
      if (inbox.ownerKey !== ownerKey) continue;
      usage.inboxes += 1;
      usage.events += inbox.events.length;
      usage.bytes += inbox.bytes;
    }
    return usage;
  }

  function removeOldestEvent(inbox) {
    const removed = inbox.events.shift();
    if (!removed) return;
    inbox.bytes -= removed.storedBytes;
    globalEventCount -= 1;
    globalEventBytes -= removed.storedBytes;
  }

  function removeInbox(inbox) {
    if (inboxes.get(inbox.id) !== inbox) return;
    for (const event of inbox.events) {
      globalEventCount -= 1;
      globalEventBytes -= event.storedBytes;
    }
    inboxes.delete(inbox.id);
    inbox.events.length = 0;
    inbox.bytes = 0;
  }

  function sweep() {
    const timestamp = now();
    for (const inbox of inboxes.values()) if (inbox.expiresAt <= timestamp) removeInbox(inbox);
    for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= timestamp) rateBuckets.delete(key);
  }

  function close() {
    clearInterval(sweepTimer);
    for (const inbox of [...inboxes.values()]) removeInbox(inbox);
    rateBuckets.clear();
  }

  function stats() {
    sweep();
    return {
      inboxes: inboxes.size,
      events: globalEventCount,
      eventBytes: globalEventBytes,
      activeWebhookRequests,
      activeWebhookListResponses,
      activeDnsRequests,
      rateBuckets: rateBuckets.size,
    };
  }

  return { close, handle, limits: Object.freeze({ ...limits }), stats };
}

export const HTTP_HEADER_INSPECTOR_ASSESSMENT = Object.freeze({
  serverProxyImplemented: false,
  reason: 'The current portal has no established, audited per-hop DNS validation and connection-pinning layer. A browser-direct inspector keeps the server out of SSRF scope and must disclose CORS limitations.',
});

async function systemResolveDns(hostname, type, timeoutMs) {
  const resolver = new Resolver({ timeout: timeoutMs, tries: 1 });
  let timer;
  try {
    return await Promise.race([
      resolver.resolve(hostname, type),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          resolver.cancel();
          const error = new Error('dns_timeout');
          error.code = 'ETIMEOUT';
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeLimits(overrides) {
  const requested = overrides && typeof overrides === 'object' ? overrides : {};
  return {
    inboxTtlMs: boundedInt(requested.inboxTtlMs, DEFAULT_DEVELOPER_API_LIMITS.inboxTtlMs, 1_000, 60 * 60_000),
    webhookBodyBytes: boundedInt(requested.webhookBodyBytes, DEFAULT_DEVELOPER_API_LIMITS.webhookBodyBytes, 1, 12 * 1024),
    webhookBodyReadTimeoutMs: boundedInt(requested.webhookBodyReadTimeoutMs, DEFAULT_DEVELOPER_API_LIMITS.webhookBodyReadTimeoutMs, 100, 30_000),
    webhookConcurrent: boundedInt(requested.webhookConcurrent, DEFAULT_DEVELOPER_API_LIMITS.webhookConcurrent, 1, 128),
    webhookConcurrentPerInbox: boundedInt(requested.webhookConcurrentPerInbox, DEFAULT_DEVELOPER_API_LIMITS.webhookConcurrentPerInbox, 1, 16),
    webhookEventsPerInbox: boundedInt(requested.webhookEventsPerInbox, DEFAULT_DEVELOPER_API_LIMITS.webhookEventsPerInbox, 1, 25),
    webhookBytesPerInbox: boundedInt(requested.webhookBytesPerInbox, DEFAULT_DEVELOPER_API_LIMITS.webhookBytesPerInbox, 1, 1024 * 1024),
    webhookListEvents: boundedInt(requested.webhookListEvents, DEFAULT_DEVELOPER_API_LIMITS.webhookListEvents, 1, 25),
    webhookListBytes: boundedInt(requested.webhookListBytes, DEFAULT_DEVELOPER_API_LIMITS.webhookListBytes, 1_024, 256 * 1024),
    webhookListConcurrent: boundedInt(requested.webhookListConcurrent, DEFAULT_DEVELOPER_API_LIMITS.webhookListConcurrent, 1, 128),
    webhookListConcurrentPerInbox: boundedInt(requested.webhookListConcurrentPerInbox, DEFAULT_DEVELOPER_API_LIMITS.webhookListConcurrentPerInbox, 1, 8),
    webhookInboxesPerClient: boundedInt(requested.webhookInboxesPerClient, DEFAULT_DEVELOPER_API_LIMITS.webhookInboxesPerClient, 1, 10),
    webhookEventsPerClient: boundedInt(requested.webhookEventsPerClient, DEFAULT_DEVELOPER_API_LIMITS.webhookEventsPerClient, 1, 250),
    webhookBytesPerClient: boundedInt(requested.webhookBytesPerClient, DEFAULT_DEVELOPER_API_LIMITS.webhookBytesPerClient, 1, 4 * 1024 * 1024),
    globalInboxes: boundedInt(requested.globalInboxes, DEFAULT_DEVELOPER_API_LIMITS.globalInboxes, 1, 100),
    globalWebhookEvents: boundedInt(requested.globalWebhookEvents, DEFAULT_DEVELOPER_API_LIMITS.globalWebhookEvents, 1, 2048),
    globalWebhookBytes: boundedInt(requested.globalWebhookBytes, DEFAULT_DEVELOPER_API_LIMITS.globalWebhookBytes, 1, 16 * 1024 * 1024),
    createRequestsPerWindow: boundedInt(requested.createRequestsPerWindow, DEFAULT_DEVELOPER_API_LIMITS.createRequestsPerWindow, 1, 100),
    createWindowMs: boundedInt(requested.createWindowMs, DEFAULT_DEVELOPER_API_LIMITS.createWindowMs, 1_000, 60 * 60_000),
    ingestRequestsPerIpWindow: boundedInt(requested.ingestRequestsPerIpWindow, DEFAULT_DEVELOPER_API_LIMITS.ingestRequestsPerIpWindow, 1, 1_000),
    ingestRequestsPerInboxWindow: boundedInt(requested.ingestRequestsPerInboxWindow, DEFAULT_DEVELOPER_API_LIMITS.ingestRequestsPerInboxWindow, 1, 1_000),
    ingestWindowMs: boundedInt(requested.ingestWindowMs, DEFAULT_DEVELOPER_API_LIMITS.ingestWindowMs, 1_000, 60 * 60_000),
    managementRequestsPerWindow: boundedInt(requested.managementRequestsPerWindow, DEFAULT_DEVELOPER_API_LIMITS.managementRequestsPerWindow, 1, 1_000),
    managementIpRequestsPerWindow: boundedInt(requested.managementIpRequestsPerWindow, DEFAULT_DEVELOPER_API_LIMITS.managementIpRequestsPerWindow, 1, 5_000),
    managementDeniedRequestsPerWindow: boundedInt(requested.managementDeniedRequestsPerWindow, DEFAULT_DEVELOPER_API_LIMITS.managementDeniedRequestsPerWindow, 1, 1_000),
    managementWindowMs: boundedInt(requested.managementWindowMs, DEFAULT_DEVELOPER_API_LIMITS.managementWindowMs, 1_000, 60 * 60_000),
    dnsRequestsPerWindow: boundedInt(requested.dnsRequestsPerWindow, DEFAULT_DEVELOPER_API_LIMITS.dnsRequestsPerWindow, 1, 1_000),
    dnsWindowMs: boundedInt(requested.dnsWindowMs, DEFAULT_DEVELOPER_API_LIMITS.dnsWindowMs, 1_000, 60 * 60_000),
    dnsConcurrent: boundedInt(requested.dnsConcurrent, DEFAULT_DEVELOPER_API_LIMITS.dnsConcurrent, 1, 32),
    dnsTimeoutMs: boundedInt(requested.dnsTimeoutMs, DEFAULT_DEVELOPER_API_LIMITS.dnsTimeoutMs, 100, 10_000),
    dnsRecords: boundedInt(requested.dnsRecords, DEFAULT_DEVELOPER_API_LIMITS.dnsRecords, 1, 100),
    dnsResponseBytes: boundedInt(requested.dnsResponseBytes, DEFAULT_DEVELOPER_API_LIMITS.dnsResponseBytes, 256, 64 * 1024),
    limiterKeys: boundedInt(requested.limiterKeys, DEFAULT_DEVELOPER_API_LIMITS.limiterKeys, 16, 16_384),
  };
}

function uniqueOpaqueId(inboxes, randomBytes) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const id = randomBytes(24).toString('base64url');
    if (INBOX_ID_PATTERN.test(id) && !inboxes.has(id)) return id;
  }
  return null;
}

function normalizePublicHostname(value) {
  if (typeof value !== 'string' || value.length > 512) return null;
  const display = value.trim().replace(/\.$/, '').toLowerCase();
  if (!display || display.includes('/') || display.includes(':') || /\s/.test(display)) return null;
  const ascii = domainToASCII(display).toLowerCase();
  if (!ascii || ascii.length > 253 || isIP(ascii) !== 0 || !ascii.includes('.')) return null;
  const labels = ascii.split('.');
  if (labels.some((label) => !validDnsLabel(label))) return null;
  if (SPECIAL_USE_SUFFIXES.some((suffix) => ascii === suffix || ascii.endsWith(`.${suffix}`))) return null;
  return { ascii, display };
}

function validDnsLabel(label) {
  if (label.length < 1 || label.length > 63) return false;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?|_[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?)$/.test(label);
}

function safeDnsValue(value, depth = 0) {
  if (depth > 3) return null;
  if (typeof value === 'string') return value.slice(0, 4_096);
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 32).map((item) => safeDnsValue(item, depth + 1)).filter((item) => item !== null);
  if (!value || typeof value !== 'object') return null;
  const safe = {};
  for (const [key, item] of Object.entries(value).slice(0, 16)) {
    if (!/^[a-z][a-z0-9]{0,31}$/i.test(key)) continue;
    const sanitized = safeDnsValue(item, depth + 1);
    if (sanitized !== null) safe[key] = sanitized;
  }
  return safe;
}

function boundedDnsRecords(records, maxRecords, maxBytes) {
  const values = [];
  let bytes = 2;
  let truncated = records.length > maxRecords;
  for (const record of records.slice(0, maxRecords)) {
    const encoded = JSON.stringify(record);
    const nextBytes = Buffer.byteLength(encoded, 'utf8') + (values.length ? 1 : 0);
    if (bytes + nextBytes > maxBytes) {
      truncated = true;
      break;
    }
    values.push(record);
    bytes += nextBytes;
  }
  return { values, truncated };
}

function mapDnsError(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (['ENODATA', 'ENOTFOUND', 'ENONAME'].includes(code)) return { status: 404, error: 'no_records' };
  if (['ETIMEOUT', 'ECANCELLED', 'EAI_AGAIN'].includes(code)) return { status: 504, error: 'lookup_timeout' };
  return { status: 502, error: 'lookup_failed' };
}

function safeWebhookHeaders(request) {
  const output = Object.create(null);
  let retainedCount = 0;
  let retainedBytes = 2;
  let truncated = false;
  const pairs = rawWebhookHeaderPairs(request);
  const rawConnection = pairs
    .filter(([name]) => name.toLowerCase() === 'connection')
    .map(([, value]) => value)
    .join(', ');
  // Connection-nominated fields are security metadata, not display data. Parse
  // the complete header accepted by Node so a late token cannot bypass
  // omission. If a different server configuration ever admits more than this
  // bounded value, retain no optional headers rather than guessing.
  if (Buffer.byteLength(rawConnection, 'utf8') > MAX_CONNECTION_HEADER_BYTES) {
    return { values: output, truncated: true };
  }
  const connectionTokens = new Set(
    rawConnection
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter((value) => /^[a-z0-9!#$%&'*+.^_`|~-]{1,64}$/.test(value)),
  );
  const grouped = new Map();
  for (const [rawName, rawValue] of pairs) {
    const name = rawName.toLowerCase();
    if (
      HIDDEN_WEBHOOK_HEADERS.has(name)
      || connectionTokens.has(name)
      || name.startsWith('proxy-')
      || name.startsWith('x-forwarded-')
    ) continue;
    if (!/^[a-z0-9!#$%&'*+.^_`|~-]{1,64}$/.test(name)) {
      truncated = true;
      continue;
    }
    const values = grouped.get(name) ?? [];
    values.push(rawValue.replace(/[\r\n\0]/g, ''));
    grouped.set(name, values);
  }
  for (const [name, values] of grouped) {
    const rawText = values.join(', ');
    const value = rawText.slice(0, 4_096);
    if (rawText.length > 4_096) truncated = true;
    const nextBytes = Buffer.byteLength(JSON.stringify(name), 'utf8')
      + Buffer.byteLength(JSON.stringify(value), 'utf8') + 2;
    if (retainedCount >= MAX_RETAINED_WEBHOOK_HEADERS
      || retainedBytes + nextBytes > MAX_RETAINED_WEBHOOK_HEADER_BYTES) {
      truncated = true;
      continue;
    }
    output[name] = value;
    retainedCount += 1;
    retainedBytes += nextBytes;
  }
  return { values: output, truncated };
}

function rawWebhookHeaderPairs(request) {
  if (Array.isArray(request.rawHeaders) && request.rawHeaders.length > 0) {
    const pairs = [];
    for (let index = 0; index + 1 < request.rawHeaders.length; index += 2) {
      pairs.push([String(request.rawHeaders[index]), String(request.rawHeaders[index + 1])]);
    }
    return pairs;
  }
  return Object.entries(request.headers).flatMap(([name, value]) => {
    if (Array.isArray(value)) return value.map((item) => [name, item]);
    return typeof value === 'string' ? [[name, value]] : [];
  });
}

function publicHeaderValue(value, limit) {
  const text = Array.isArray(value) ? value.join(', ') : typeof value === 'string' ? value : '';
  return text.slice(0, limit).replace(/[\r\n\0]/g, '');
}

function webhookBody(body, contentType) {
  if (isTextContent(contentType) && isValidUtf8(body)) return { encoding: 'utf-8', value: body.toString('utf8') };
  return { encoding: 'base64', value: body.toString('base64') };
}

function isTextContent(contentType) {
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  return mediaType.startsWith('text/')
    || mediaType === 'application/json'
    || mediaType.endsWith('+json')
    || mediaType === 'application/xml'
    || mediaType.endsWith('+xml')
    || mediaType === 'application/x-www-form-urlencoded'
    || mediaType === 'application/graphql';
}

function isValidUtf8(buffer) {
  return Buffer.from(buffer.toString('utf8'), 'utf8').equals(buffer);
}

async function readLimitedBuffer(request, limit, timeoutMs = 10_000) {
  const chunks = [];
  let bytes = 0;
  let timer;
  try {
    return await Promise.race([
      (async () => {
        for await (const chunk of request) {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          bytes += buffer.byteLength;
          if (bytes > limit) throw new Error('too_large');
          chunks.push(buffer);
        }
        return Buffer.concat(chunks, bytes);
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('body_timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function parseContentLength(value) {
  if (value === undefined) return 0;
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string' || !/^\d{1,12}$/.test(text)) return null;
  const length = Number(text);
  return Number.isSafeInteger(length) ? length : null;
}

function requestHasBody(request) {
  const contentLength = parseContentLength(request.headers['content-length']);
  return contentLength === null || contentLength > 0 || Boolean(request.headers['transfer-encoding']);
}

function bearerToken(value) {
  const text = Array.isArray(value) ? value[0] : value;
  if (typeof text !== 'string' || !text.startsWith('Bearer ')) return '';
  const token = text.slice(7);
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : '';
}

function hashToken(token) {
  return createHash('sha256').update(token).digest();
}

function defaultSameOriginRequest(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  if (typeof origin !== 'string' || typeof host !== 'string' || origin === 'null') return false;
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.host === host;
  } catch {
    return false;
  }
}

function setApiHeaders(response) {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function sendJson(response, status, payload, additionalHeaders = {}) {
  if (response.destroyed || response.writableEnded) return true;
  if (response.headersSent) {
    response.destroy();
    return true;
  }
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...additionalHeaders });
  response.end(JSON.stringify(payload));
  return true;
}

function rejectRequest(request, response, status, payload, additionalHeaders = {}) {
  if (!request.complete) {
    request.resume();
    response.shouldKeepAlive = false;
    response.once('finish', () => {
      if (!request.complete && !request.destroyed) request.destroy();
    });
    return sendJson(response, status, payload, { Connection: 'close', ...additionalHeaders });
  }
  return sendJson(response, status, payload, additionalHeaders);
}

function methodNotAllowed(request, response, methods) {
  return rejectRequest(request, response, 405, { error: 'method_not_allowed' }, { Allow: methods.join(', ') });
}

function retryHeader(windowMs) {
  return { 'Retry-After': String(Math.max(1, Math.ceil(windowMs / 1000))) };
}

function boundedInt(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : fallback;
}
