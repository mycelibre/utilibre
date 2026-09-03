import { createServer, request as nodeHttpRequest, type Server } from 'node:http';
import { createConnection } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createDeveloperApi,
  HTTP_HEADER_INSPECTOR_ASSESSMENT,
  type DeveloperApi,
  type DeveloperApiOptions,
} from '../../server/developer-api.mjs';

interface RunningApi {
  api: DeveloperApi;
  baseUrl: string;
  close: () => Promise<void>;
}

const running = new Set<RunningApi>();

afterEach(async () => {
  await Promise.all([...running].map((instance) => instance.close()));
  running.clear();
});

describe('developer API security boundaries', () => {
  it('creates an opaque, short-lived inbox only for allowed same-origin requests', async () => {
    const instance = await startApi();
    const denied = await fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes`, { method: 'POST' });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: 'origin_not_allowed' });

    const response = await createInbox(instance);
    expect(response.status).toBe(201);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('pragma')).toBe('no-cache');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const payload = await response.json() as {
      inbox: { id: string; receivePath: string; eventsPath: string; expiresAt: string; limits: Record<string, number> };
      readToken: string;
    };
    expect(payload.inbox.id).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(payload.readToken).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(payload.inbox.receivePath).toBe(`/_portal/developer/webhooks/${payload.inbox.id}`);
    expect(payload.inbox.eventsPath).toBe(`/_portal/developer/webhook-inboxes/${payload.inbox.id}/events`);
    expect(payload.inbox.limits).toEqual({ bodyBytes: 12_288, events: 25, retainedBytes: 1_048_576 });
    expect(instance.api.stats()).toMatchObject({ inboxes: 1, events: 0, eventBytes: 0 });
  });

  it('separates the public receiver URL from token-protected event access', async () => {
    const instance = await startApi();
    const created = await createInboxPayload(instance);
    const received = await fetch(`${instance.baseUrl}${created.inbox.receivePath}?delivery=42`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sender-secret',
        Cookie: 'session=sender-secret',
        'Content-Type': 'application/json; charset=utf-8',
        'X-Hub-Signature-256': 'sha256=abc123',
        'X-Forwarded-For': '10.0.0.8',
      },
      body: JSON.stringify({ event: 'created' }),
    });
    expect(received.status).toBe(202);
    expect(await received.json()).toEqual({ received: true, eventId: expect.stringMatching(/^[A-Za-z0-9_-]{16}$/) });

    const missingToken = await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`);
    const wrongToken = await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, { headers: { Authorization: 'Bearer AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' } });
    const missingInbox = await fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/events`, { headers: managementHeaders(created.readToken) });
    expect([missingToken.status, wrongToken.status, missingInbox.status]).toEqual([404, 404, 404]);

    const listed = await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, { headers: managementHeaders(created.readToken) });
    expect(listed.status).toBe(200);
    const events = await listed.json() as {
      events: Array<{ sequence: number; method: string; query: string; headers: Record<string, string>; body: { encoding: string; value: string } }>;
      nextCursor: number;
    };
    expect(events.nextCursor).toBe(1);
    expect(events.events).toHaveLength(1);
    expect(events.events[0]).toMatchObject({
      sequence: 1,
      method: 'POST',
      query: 'delivery=42',
      body: { encoding: 'utf-8', value: '{"event":"created"}' },
    });
    expect(events.events[0]?.headers['x-hub-signature-256']).toBe('sha256=abc123');
    expect(events.events[0]?.headers.authorization).toBeUndefined();
    expect(events.events[0]?.headers.cookie).toBeUndefined();
    expect(events.events[0]?.headers['x-forwarded-for']).toBeUndefined();

    const after = await fetch(`${instance.baseUrl}${created.inbox.eventsPath}?after=1`, { headers: managementHeaders(created.readToken) });
    expect((await after.json() as { events: unknown[] }).events).toEqual([]);
  });

  it('omits connection-nominated, forwarding, proxy, and client-address headers', async () => {
    const instance = await startApi();
    const created = await createInboxPayload(instance);
    const status = await sendNodeHttpRequest(`${instance.baseUrl}${created.inbox.receivePath}`, {
      Connection: 'x-connection-secret, keep-alive',
      'X-Connection-Secret': 'not retained',
      'Proxy-Connection': 'not retained',
      'X-Forwarded-Port': '443',
      'X-Forwarded-Server': 'edge.internal',
      'True-Client-IP': '192.0.2.10',
      'CF-Connecting-IPv6': '2001:db8::1',
      'CF-Pseudo-IPv4': '192.0.2.11',
      'X-Envoy-External-Address': '192.0.2.12',
      Via: '1.1 intermediary',
      'X-Hub-Signature-256': 'sha256=retained',
    });
    expect(status).toBe(202);

    const listed = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, {
      headers: managementHeaders(created.readToken),
    })).json() as { events: Array<{ headers: Record<string, string> }> };
    const retained = listed.events[0]?.headers ?? {};
    expect(retained['x-hub-signature-256']).toBe('sha256=retained');
    for (const hidden of [
      'connection', 'x-connection-secret', 'proxy-connection', 'x-forwarded-port',
      'x-forwarded-server', 'true-client-ip', 'cf-connecting-ipv6', 'cf-pseudo-ipv4',
      'x-envoy-external-address', 'via',
    ]) expect(retained[hidden], hidden).toBeUndefined();
  });

  it('reports retained-header truncation without hiding later small headers unnecessarily', async () => {
    const instance = await startApi();
    const created = await createInboxPayload(instance);
    const status = await sendNodeHttpRequest(`${instance.baseUrl}${created.inbox.receivePath}`, {
      'X-Oversized-Test': 'x'.repeat(5_000),
      'X-Hub-Signature-256': 'sha256=still-retained',
    });
    expect(status).toBe(202);

    const listed = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, {
      headers: managementHeaders(created.readToken),
    })).json() as { events: Array<{ headers: Record<string, string>; headersTruncated: boolean }> };
    expect(listed.events[0]?.headersTruncated).toBe(true);
    expect(listed.events[0]?.headers['x-oversized-test']).toHaveLength(4_096);
    expect(listed.events[0]?.headers['x-hub-signature-256']).toBe('sha256=still-retained');
  });

  it('omits a header nominated late in a long Connection field', async () => {
    const instance = await startApi();
    const created = await createInboxPayload(instance);
    const fillerTokens = Array.from({ length: 1_100 }, (_, index) => `x${index}`);
    const status = await sendNodeHttpRequest(`${instance.baseUrl}${created.inbox.receivePath}`, {
      Connection: [...fillerTokens, 'x-late-secret'].join(','),
      'X-Late-Secret': 'not retained',
      'X-Hub-Signature-256': 'sha256=retained',
    });
    expect(status).toBe(202);

    const listed = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, {
      headers: managementHeaders(created.readToken),
    })).json() as { events: Array<{ headers: Record<string, string> }> };
    expect(listed.events[0]?.headers['x-late-secret']).toBeUndefined();
    expect(listed.events[0]?.headers['x-hub-signature-256']).toBe('sha256=retained');
  });

  it('retains empty header values and flags unsupported header-name truncation', async () => {
    const instance = await startApi();
    const created = await createInboxPayload(instance);
    const overlongName = `X-${'a'.repeat(70)}`;
    const status = await sendNodeHttpHeaderPairs(`${instance.baseUrl}${created.inbox.receivePath}`, [
      ['X-Empty-Test', ''],
      [overlongName, 'not retained'],
      ['__proto__', 'retained as an ordinary header'],
    ]);
    expect(status).toBe(202);

    const listed = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, {
      headers: managementHeaders(created.readToken),
    })).json() as { events: Array<{ headers: Record<string, string>; headersTruncated: boolean }> };
    expect(listed.events[0]?.headers['x-empty-test']).toBe('');
    expect(listed.events[0]?.headers.__proto__).toBe('retained as an ordinary header');
    expect(listed.events[0]?.headers[overlongName.toLowerCase()]).toBeUndefined();
    expect(listed.events[0]?.headersTruncated).toBe(true);
  });

  it('enforces body, per-inbox event, aggregate, and global memory bounds', async () => {
    const instance = await startApi({
      limits: {
        webhookBodyBytes: 16,
        webhookEventsPerInbox: 2,
        webhookBytesPerInbox: 2_000,
        globalWebhookEvents: 2,
        globalWebhookBytes: 4_000,
      },
    });
    const created = await createInboxPayload(instance);
    const oversized = await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body: 'x'.repeat(17) });
    expect(oversized.status).toBe(413);
    expect(await oversized.json()).toEqual({ error: 'request_too_large' });

    for (const body of ['one', 'two', 'three']) {
      const response = await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body,
      });
      expect(response.status).toBe(202);
    }
    const listed = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, { headers: managementHeaders(created.readToken) })).json() as {
      events: Array<{ sequence: number; body: { value: string } }>;
    };
    expect(listed.events.map((event) => [event.sequence, event.body.value])).toEqual([[2, 'two'], [3, 'three']]);
    expect(instance.api.stats()).toMatchObject({ events: 2 });

    const second = await createInboxPayload(instance);
    const atGlobalCapacity = await fetch(`${instance.baseUrl}${second.inbox.receivePath}`, { method: 'POST', body: 'four' });
    expect(atGlobalCapacity.status).toBe(503);
    expect(await atGlobalCapacity.json()).toEqual({ error: 'capacity_reached' });
  });

  it('bounds and times out in-flight webhook request bodies', async () => {
    const instance = await startApi({
      limits: { webhookBodyReadTimeoutMs: 100, webhookConcurrent: 2, webhookConcurrentPerInbox: 1 },
    });
    const created = await createInboxPayload(instance);
    const slow = openSlowRequest(`${instance.baseUrl}${created.inbox.receivePath}`, 1);
    await waitFor(() => instance.api.stats().activeWebhookRequests === 1);

    const busy = await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body: 'x' });
    expect(busy.status).toBe(503);
    expect(await busy.json()).toEqual({ error: 'busy' });
    expect(await slow.response).toBe(408);
    await waitFor(() => instance.api.stats().activeWebhookRequests === 0);

    const accepted = await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body: 'x' });
    expect(accepted.status).toBe(202);
  });

  it('does not retain phantom capacity when an inbox is deleted during body upload', async () => {
    const instance = await startApi({ limits: { webhookBodyReadTimeoutMs: 1_000 } });
    const created = await createInboxPayload(instance);
    const slow = openSlowRequest(`${instance.baseUrl}${created.inbox.receivePath}`, 1);
    await waitFor(() => instance.api.stats().activeWebhookRequests === 1);

    const deleted = await fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes/${created.inbox.id}`, {
      method: 'DELETE',
      headers: managementHeaders(created.readToken),
    });
    expect(deleted.status).toBe(204);
    slow.request.end('x');
    expect(await slow.response).toBe(404);
    expect(instance.api.stats()).toMatchObject({ inboxes: 0, events: 0, eventBytes: 0, activeWebhookRequests: 0 });
  });

  it('keeps existing events when a replacement would exceed global capacity', async () => {
    const instance = await startApi({
      limits: { webhookEventsPerInbox: 1, webhookBytesPerInbox: 2_000, globalWebhookBytes: 1_200 },
    });
    const first = await createInboxPayload(instance);
    const second = await createInboxPayload(instance);
    expect((await fetch(`${instance.baseUrl}${first.inbox.receivePath}`, { method: 'POST', body: 'old' })).status).toBe(202);
    expect((await fetch(`${instance.baseUrl}${second.inbox.receivePath}`, { method: 'POST', body: 'other' })).status).toBe(202);
    const before = instance.api.stats();

    const rejected = await fetch(`${instance.baseUrl}${first.inbox.receivePath}`, { method: 'POST', body: 'x'.repeat(1_100) });
    expect(rejected.status).toBe(503);
    expect(instance.api.stats()).toMatchObject({ events: before.events, eventBytes: before.eventBytes });
    const listed = await (await fetch(`${instance.baseUrl}${first.inbox.eventsPath}`, {
      headers: managementHeaders(first.readToken),
    })).json() as { events: Array<{ body: { value: string } }> };
    expect(listed.events.map((event) => event.body.value)).toEqual(['old']);
  });

  it('pages webhook events and does not let denied reads consume the authorized bucket', async () => {
    const instance = await startApi({
      limits: {
        webhookListEvents: 2,
        managementRequestsPerWindow: 2,
        managementIpRequestsPerWindow: 10,
        managementDeniedRequestsPerWindow: 1,
      },
    });
    const created = await createInboxPayload(instance);
    for (const body of ['one', 'two', 'three']) {
      expect((await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body })).status).toBe(202);
    }

    const wrongHeaders = managementHeaders('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    expect((await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, { headers: wrongHeaders })).status).toBe(404);
    expect((await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, { headers: wrongHeaders })).status).toBe(429);

    const firstPage = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, {
      headers: managementHeaders(created.readToken),
    })).json() as { events: Array<{ sequence: number }>; nextCursor: number; truncated: boolean };
    expect(firstPage.events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(firstPage).toMatchObject({ nextCursor: 2, truncated: true });
    const secondPage = await (await fetch(`${instance.baseUrl}${created.inbox.eventsPath}?after=2`, {
      headers: managementHeaders(created.readToken),
    })).json() as { events: Array<{ sequence: number }>; nextCursor: number; truncated: boolean };
    expect(secondPage.events.map((event) => event.sequence)).toEqual([3]);
    expect(secondPage).toMatchObject({ nextCursor: 3, truncated: false });
  });

  it('expires inboxes without persistence and deletes retained event data', async () => {
    let timestamp = Date.parse('2026-09-03T12:00:00Z');
    const instance = await startApi({ now: () => timestamp, limits: { inboxTtlMs: 1_000 } });
    const created = await createInboxPayload(instance);
    await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body: 'temporary' });
    expect(instance.api.stats()).toMatchObject({ inboxes: 1, events: 1 });

    timestamp += 1_001;
    const expired = await fetch(`${instance.baseUrl}${created.inbox.eventsPath}`, { headers: managementHeaders(created.readToken) });
    expect(expired.status).toBe(404);
    expect(instance.api.stats()).toMatchObject({ inboxes: 0, events: 0, eventBytes: 0 });

    const replacement = await createInboxPayload(instance);
    const deleted = await fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes/${replacement.inbox.id}`, {
      method: 'DELETE',
      headers: managementHeaders(replacement.readToken),
    });
    expect(deleted.status).toBe(204);
    expect(instance.api.stats()).toMatchObject({ inboxes: 0 });
  });

  it('rate-limits inbox creation and ingestion independently', async () => {
    const instance = await startApi({
      limits: { createRequestsPerWindow: 1, ingestRequestsPerIpWindow: 1, ingestRequestsPerInboxWindow: 1 },
    });
    const created = await createInboxPayload(instance);
    const limitedCreate = await createInbox(instance);
    expect(limitedCreate.status).toBe(429);
    expect(limitedCreate.headers.get('retry-after')).toBe('900');

    expect((await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body: 'first' })).status).toBe(202);
    const limitedIngest = await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method: 'POST', body: 'second' });
    expect(limitedIngest.status).toBe(429);
    expect(limitedIngest.headers.get('retry-after')).toBe('60');
  });

  it('limits active inboxes per derived client and releases the allowance on deletion', async () => {
    const instance = await startApi({ limits: { webhookInboxesPerClient: 2 } });
    const first = await createInboxPayload(instance);
    await createInboxPayload(instance);
    const atCapacity = await createInbox(instance);
    expect(atCapacity.status).toBe(503);
    expect(await atCapacity.json()).toEqual({ error: 'capacity_reached' });

    const deleted = await fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes/${first.inbox.id}`, {
      method: 'DELETE',
      headers: managementHeaders(first.readToken),
    });
    expect(deleted.status).toBe(204);
    expect((await createInbox(instance)).status).toBe(201);
  });

  it('enforces per-client event and byte ceilings across inboxes without discarding retained events', async () => {
    const countInstance = await startApi({ limits: { webhookEventsPerClient: 2 } });
    const countFirst = await createInboxPayload(countInstance);
    const countSecond = await createInboxPayload(countInstance);
    expect((await fetch(`${countInstance.baseUrl}${countFirst.inbox.receivePath}`, { method: 'POST', body: 'first' })).status).toBe(202);
    expect((await fetch(`${countInstance.baseUrl}${countSecond.inbox.receivePath}`, { method: 'POST', body: 'second' })).status).toBe(202);
    const countRejected = await fetch(`${countInstance.baseUrl}${countSecond.inbox.receivePath}`, { method: 'POST', body: 'rejected' });
    expect(countRejected.status).toBe(503);
    expect(countInstance.api.stats()).toMatchObject({ events: 2 });
    const countListed = await (await fetch(`${countInstance.baseUrl}${countSecond.inbox.eventsPath}`, {
      headers: managementHeaders(countSecond.readToken),
    })).json() as { events: Array<{ body: { value: string } }> };
    expect(countListed.events.map((event) => event.body.value)).toEqual(['second']);
    expect((await fetch(`${countInstance.baseUrl}/_portal/developer/webhook-inboxes/${countFirst.inbox.id}`, {
      method: 'DELETE',
      headers: managementHeaders(countFirst.readToken),
    })).status).toBe(204);
    expect((await fetch(`${countInstance.baseUrl}${countSecond.inbox.receivePath}`, { method: 'POST', body: 'after-delete' })).status).toBe(202);

    const byteInstance = await startApi({ limits: { webhookBytesPerClient: 1_100 } });
    const byteFirst = await createInboxPayload(byteInstance);
    const byteSecond = await createInboxPayload(byteInstance);
    expect((await fetch(`${byteInstance.baseUrl}${byteFirst.inbox.receivePath}`, { method: 'POST', body: 'a'.repeat(600) })).status).toBe(202);
    const beforeByteRejection = byteInstance.api.stats();
    const byteRejected = await fetch(`${byteInstance.baseUrl}${byteSecond.inbox.receivePath}`, { method: 'POST', body: 'b'.repeat(600) });
    expect(byteRejected.status).toBe(503);
    expect(byteInstance.api.stats()).toMatchObject({
      events: beforeByteRejection.events,
      eventBytes: beforeByteRejection.eventBytes,
    });
    expect((await fetch(`${byteInstance.baseUrl}/_portal/developer/webhook-inboxes/${byteFirst.inbox.id}`, {
      method: 'DELETE',
      headers: managementHeaders(byteFirst.readToken),
    })).status).toBe(204);
    expect((await fetch(`${byteInstance.baseUrl}${byteSecond.inbox.receivePath}`, { method: 'POST', body: 'b'.repeat(600) })).status).toBe(202);
  });

  it('normalizes public IDNs, allows only explicit record types, and caps DNS results', async () => {
    const calls: Array<[string, string, number]> = [];
    const instance = await startApi({
      limits: { dnsRecords: 2 },
      resolveDns: async (hostname, type, timeoutMs) => {
        calls.push([hostname, type, timeoutMs]);
        return ['192.0.2.1', '192.0.2.2', '192.0.2.3'];
      },
    });
    const response = await dnsRequest(instance, { hostname: 'BÜCHER.example.org.', type: 'a' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      hostname: 'bücher.example.org',
      asciiHostname: 'xn--bcher-kva.example.org',
      type: 'A',
      records: ['192.0.2.1', '192.0.2.2'],
      truncated: true,
    });
    expect(calls).toEqual([['xn--bcher-kva.example.org', 'A', 4_000]]);

    for (const hostname of ['localhost', 'cobalt', '127.0.0.1', 'printer.local', 'service.internal', 'example.test']) {
      const rejected = await dnsRequest(instance, { hostname, type: 'A' });
      expect(rejected.status, hostname).toBe(400);
      expect(await rejected.json()).toEqual({ error: 'invalid_hostname' });
    }
    const any = await dnsRequest(instance, { hostname: 'utilibre.org', type: 'ANY' });
    expect(any.status).toBe(400);
    expect(await any.json()).toEqual({ error: 'unsupported_record_type' });
  });

  it('maps DNS failures without returning resolver or infrastructure details', async () => {
    const failure = Object.assign(new Error('resolver 192.0.2.53 refused private-zone.example'), { code: 'SERVFAIL' });
    const instance = await startApi({ resolveDns: async () => { throw failure; } });
    const response = await dnsRequest(instance, { hostname: 'public.example.org', type: 'TXT' });
    expect(response.status).toBe(502);
    const responseText = await response.text();
    expect(JSON.parse(responseText)).toEqual({ error: 'lookup_failed' });
    expect(responseText).not.toContain('192.0.2.53');
  });

  it('returns the single object produced by Node for SOA records', async () => {
    const soa = {
      nsname: 'ns1.example.org',
      hostmaster: 'hostmaster.example.org',
      serial: 2026090301,
      refresh: 7200,
      retry: 3600,
      expire: 1209600,
      minttl: 3600,
    };
    const instance = await startApi({ resolveDns: async () => soa });
    const response = await dnsRequest(instance, { hostname: 'example.org', type: 'SOA' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      hostname: 'example.org',
      asciiHostname: 'example.org',
      type: 'SOA',
      records: [soa],
      truncated: false,
    });
  });

  it('does not expose an unpinned server-side HTTP inspection proxy', async () => {
    const instance = await startApi();
    const response = await fetch(`${instance.baseUrl}/_portal/developer/http-headers`, {
      method: 'POST',
      headers: managementHeaders(),
      body: JSON.stringify({ url: 'http://127.0.0.1/admin' }),
    });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
    expect(HTTP_HEADER_INSPECTOR_ASSESSMENT.serverProxyImplemented).toBe(false);
    expect(HTTP_HEADER_INSPECTOR_ASSESSMENT.reason).toContain('SSRF');
  });

  it('can disable webhook and DNS surfaces independently without stopping the portal', async () => {
    const instance = await startApi({ webhookEnabled: false, dnsEnabled: false });
    const inbox = await fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes`, {
      method: 'POST',
      headers: { Origin: instance.baseUrl },
    });
    const dns = await dnsRequest(instance, { hostname: 'utilibre.org', type: 'A' });
    expect(inbox.status).toBe(404);
    expect(dns.status).toBe(404);
    expect(await inbox.json()).toEqual({ error: 'not_found' });
    expect(await dns.json()).toEqual({ error: 'not_found' });
  });

  it('returns false for routes outside its namespace and 405 for owned routes', async () => {
    const instance = await startApi();
    expect((await fetch(`${instance.baseUrl}/healthz`)).status).toBe(418);
    const wrongMethod = await fetch(`${instance.baseUrl}/_portal/developer/dns`, { method: 'GET' });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get('allow')).toBe('POST');

    const created = await createInboxPayload(instance);
    for (const method of ['GET', 'HEAD']) {
      const receiver = await fetch(`${instance.baseUrl}${created.inbox.receivePath}`, { method });
      expect(receiver.status, method).toBe(405);
      expect(receiver.headers.get('allow')).toBe('POST, PUT, PATCH, DELETE');
    }
    expect(instance.api.stats()).toMatchObject({ events: 0 });
  });
});

async function startApi(options: DeveloperApiOptions = {}): Promise<RunningApi> {
  let baseUrl = '';
  const api = createDeveloperApi({
    ...options,
    allowManagementRequest: options.allowManagementRequest ?? ((request) => request.headers.origin === baseUrl),
    getClientKey: options.getClientKey ?? (() => 'test-client'),
  });
  const server: Server = createServer(async (request, response) => {
    const handled = await api.handle(request, response, new URL(request.url ?? '/', 'http://portal.invalid'));
    if (!handled) {
      response.writeHead(418, { 'Content-Type': 'text/plain' });
      response.end('outside developer API');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('test server did not bind to TCP');
  baseUrl = `http://127.0.0.1:${address.port}`;
  let closed = false;
  const instance: RunningApi = {
    api,
    baseUrl,
    close: async () => {
      if (closed) return;
      closed = true;
      api.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      running.delete(instance);
    },
  };
  running.add(instance);
  return instance;
}

function createInbox(instance: RunningApi): Promise<Response> {
  return fetch(`${instance.baseUrl}/_portal/developer/webhook-inboxes`, {
    method: 'POST',
    headers: { Origin: instance.baseUrl },
  });
}

async function createInboxPayload(instance: RunningApi): Promise<{
  inbox: { id: string; receivePath: string; eventsPath: string };
  readToken: string;
}> {
  const response = await createInbox(instance);
  expect(response.status).toBe(201);
  return await response.json() as {
    inbox: { id: string; receivePath: string; eventsPath: string };
    readToken: string;
  };
}

function managementHeaders(token = ''): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function dnsRequest(instance: RunningApi, payload: Record<string, string>): Promise<Response> {
  return fetch(`${instance.baseUrl}/_portal/developer/dns`, {
    method: 'POST',
    headers: { Origin: instance.baseUrl, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

function sendNodeHttpRequest(url: string, headers: Record<string, string>): Promise<number> {
  return new Promise((resolve, reject) => {
    const request = nodeHttpRequest(url, { method: 'POST', headers }, (response) => {
      response.resume();
      response.on('end', () => resolve(response.statusCode ?? 0));
    });
    request.on('error', reject);
    request.end('header test');
  });
}

function sendNodeHttpHeaderPairs(url: string, headers: Array<[string, string]>): Promise<number> {
  return new Promise((resolve, reject) => {
    const destination = new URL(url);
    const socket = createConnection({ host: destination.hostname, port: Number(destination.port) });
    let response = '';
    socket.setEncoding('utf8');
    socket.setTimeout(2_000, () => socket.destroy(new Error('raw HTTP request timed out')));
    socket.on('connect', () => {
      const headerLines = headers.map(([name, value]) => `${name}: ${value}`).join('\r\n');
      socket.end(`POST ${destination.pathname}${destination.search} HTTP/1.1\r\nHost: ${destination.host}\r\nContent-Length: 11\r\nConnection: close\r\n${headerLines}\r\n\r\nheader test`);
    });
    socket.on('data', (chunk) => { response += chunk; });
    socket.on('end', () => {
      const status = Number.parseInt(response.match(/^HTTP\/1\.1 (\d{3}) /)?.[1] ?? '0', 10);
      resolve(status);
    });
    socket.on('error', reject);
  });
}

function openSlowRequest(url: string, contentLength: number): { request: ReturnType<typeof nodeHttpRequest>; response: Promise<number> } {
  let resolveResponse: (status: number) => void = () => undefined;
  let rejectResponse: (error: Error) => void = () => undefined;
  const response = new Promise<number>((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });
  const request = nodeHttpRequest(url, {
    method: 'POST',
    headers: { 'Content-Length': String(contentLength) },
  }, (incoming) => {
    incoming.resume();
    incoming.on('end', () => resolveResponse(incoming.statusCode ?? 0));
  });
  request.on('error', rejectResponse);
  request.flushHeaders();
  return { request, response };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error('condition was not reached');
}
