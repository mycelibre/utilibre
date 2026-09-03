import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer, type Server, type ServerResponse } from 'node:http';
import { createConnection } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const port = 43891;
const cobaltPort = 43892;
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;
let cobalt: Server;
let lastCobaltAuthorization = '';
let lastCobaltBody: Record<string, unknown> = {};

describe('portal server security boundaries', () => {
  beforeAll(async () => {
    cobalt = createServer(async (request, response) => {
      const chunks: Buffer[] = [];
      for await (const chunk of request) chunks.push(Buffer.from(chunk));
      lastCobaltAuthorization = String(request.headers.authorization ?? '');
      lastCobaltBody = JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
      const sourceUrl = String(lastCobaltBody.url ?? '');
      if (sourceUrl.includes('v=slow')) await new Promise((resolve) => setTimeout(resolve, 1_250));
      if (sourceUrl.includes('v=duration')) return sendFake(response, 400, { error: { code: 'error.api.duration.limit' } });
      if (sourceUrl.includes('v=invalid-response')) { response.writeHead(200, { 'Content-Type': 'text/plain' }); return response.end('not json'); }
      if (sourceUrl.includes('v=private-output')) return sendFake(response, 200, { status: 'redirect', url: 'http://127.0.0.1/private' });
      if (sourceUrl.includes('v=preview-private-path')) return sendFake(response, 200, { status: 'redirect', url: 'http://10.23.0.2:9000/admin' });
      if (sourceUrl.includes('v=preview-tunnel-no-query')) return sendFake(response, 200, { status: 'tunnel', url: 'http://10.23.0.2:9000/tunnel' });
      if (sourceUrl.includes('v=preview-tunnel-other-host')) return sendFake(response, 200, { status: 'tunnel', url: 'http://10.23.0.9:9000/tunnel?token=opaque' });
      if (sourceUrl.includes('v=preview-tunnel')) return sendFake(response, 200, { status: 'tunnel', url: 'http://10.23.0.2:9000/tunnel?token=opaque' });
      return sendFake(response, 200, { status: 'redirect', url: 'https://cdn.example.net/public-media', filename: 'safe\r\nname.mp4' });
    });
    await new Promise<void>((resolve) => cobalt.listen(cobaltPort, '127.0.0.1', resolve));
    server = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        LISTEN_ADDRESS: '127.0.0.1',
        EDGE_PROXY_IP: '127.0.0.1',
        MEDIA_ALLOWED_ORIGINS: base,
        ENABLED_SERVICES: 'cobalt,searxng,ntfy',
        DEFAULT_LANGUAGE: 'es',
        PRIVATE_PREVIEW: '1',
        PRIVATE_BIND_IP: '10.23.0.2',
        PUBLIC_SEARCH_URL: 'http://10.23.0.2:8888/',
        PUBLIC_NTFY_URL: 'http://10.23.0.2:2586/',
        STATUS_SERVICES: 'ntfy=https://evil.example/v1/health',
        COBALT_PUBLIC_API_URL: 'https://media.example.test/',
        COBALT_RESULT_SOURCE_URL: 'http://10.23.0.2:9000/',
        PROJECT_NAME: '<unsafe> utility',
        SUPPORT_URL: 'http://donations.example.net/',
        COBALT_INTERNAL_URL: `http://127.0.0.1:${cobaltPort}/`,
        COBALT_API_KEY: 'server-held-test-key',
        COBALT_ALLOWED_HOSTS: 'youtube.com',
        MEDIA_RATE_LIMIT: '100',
        MEDIA_MAX_CONCURRENT: '2',
        MEDIA_REQUEST_TIMEOUT_SECONDS: '1',
      },
      stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try { if ((await fetch(`${base}/healthz`)).ok) return; } catch { /* Startup is still in progress. */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('server did not start');
  });

  afterAll(async () => {
    server?.kill('SIGTERM');
    await new Promise<void>((resolve) => cobalt?.close(() => resolve()));
  });

  it('serves fixed health and security headers', async () => {
    const response = await fetch(`${base}/healthz`);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    const information = await fetch(`${base}/en/privacy?view=compact`);
    expect(information.headers.get('x-robots-tag')).toBeNull();
    expect(information.headers.get('cache-control')).toBe('no-cache, no-transform');
    const englishShell = await information.text();
    expect(englishShell).toContain('<link rel="canonical" href="/en/privacy" />');
    const englishNoScript = englishShell.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? '';
    expect(englishNoScript).toContain('<main id="main-content" class="page-shell">');
    expect(englishNoScript).toContain('This portal needs JavaScript');
    expect(englishNoScript).toContain('Hosted service links depend on the server\'s current configuration.');
    expect([...englishNoScript.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual(['/es/']);
    const tool = await fetch(`${base}/en/tools/file-hashes`);
    expect(tool.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(await tool.text()).toContain('<html lang="en">');
    const spanish = await fetch(`${base}/es/privacidad`);
    const spanishShell = await spanish.text();
    expect(spanishShell).toContain('<html lang="es">');
    expect(spanishShell).toContain('Ir al contenido principal');
    expect(spanishShell).toContain('<meta name="description" content="Esta página explica qué recibe');
    expect(spanishShell).toContain('<link rel="canonical" href="/es/privacidad" />');
    expect(spanishShell).toContain('hreflang="en" href="/en/privacy"');
    const spanishNoScript = spanishShell.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1] ?? '';
    expect(spanishNoScript).toContain('Este portal necesita JavaScript');
    expect(spanishNoScript).toContain('Los enlaces a servicios alojados dependen de la configuración activa del servidor.');
    expect([...spanishNoScript.matchAll(/href="([^"]+)"/g)].map((match) => match[1])).toEqual(['/en/']);
    const preferredEnglish = await fetch(`${base}/`, { headers: { 'Accept-Language': 'en-US,en;q=0.9,es;q=0.8' } });
    expect(await preferredEnglish.text()).toContain('<html lang="en">');
  });

  it('rejects malformed absolute request targets without terminating the process', async () => {
    const rawResponse = await rawHttpRequest('GET http://[ HTTP/1.1\r\nHost: portal.invalid\r\nConnection: close\r\n\r\n');
    expect(rawResponse).toMatch(/^HTTP\/1\.1 400 /);
    expect(rawResponse).toContain('"error":"invalid_request_target"');

    const networkPath = await rawHttpRequest('GET //evil.example/healthz HTTP/1.1\r\nHost: portal.invalid\r\nConnection: close\r\n\r\n');
    expect(networkPath).toMatch(/^HTTP\/1\.1 404 /);
    expect(server.exitCode).toBeNull();
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it('rejects and closes declared bodies on bodyless routes', async () => {
    const rawResponse = await rawHttpRequestWithoutBodyCompletion(
      'GET /healthz HTTP/1.1\r\nHost: portal.invalid\r\nContent-Length: 100\r\n\r\n',
    );
    expect(rawResponse).toMatch(/^HTTP\/1\.1 400 /);
    expect(rawResponse).toContain('Connection: close');
    expect(rawResponse).toContain('"error":"unexpected_request_body"');
    expect(server.exitCode).toBeNull();
    expect((await fetch(`${base}/healthz`)).status).toBe(200);

    const rejectedMedia = await rawHttpRequestWithoutBodyCompletion(
      'POST /_portal/media HTTP/1.1\r\nHost: portal.invalid\r\nOrigin: https://evil.example\r\nContent-Length: 100\r\n\r\n',
    );
    expect(rejectedMedia).toMatch(/^HTTP\/1\.1 403 /);
    expect(rejectedMedia).toContain('Connection: close');
    expect(server.exitCode).toBeNull();
  });

  it('fails closed when a framing header can fall beyond the retained header limit', async () => {
    const earlyHeaders = Array.from({ length: 100 }, (_, index) => `X-Filler-${index}: value`).join('\r\n');
    const rawResponse = await rawHttpRequestWithoutBodyCompletion(
      `GET /healthz HTTP/1.1\r\nHost: portal.invalid\r\n${earlyHeaders}\r\nContent-Length: 100\r\n\r\n`,
    );
    expect(rawResponse).toMatch(/^HTTP\/1\.1 431 /);
    expect(rawResponse).toContain('Connection: close');
    expect(rawResponse).toContain('"error":"too_many_headers"');
    expect(server.exitCode).toBeNull();
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it('returns a real 404 for missing static assets instead of the SPA shell', async () => {
    for (const path of ['/assets/obsolete-tool.js', '/vendor/obsolete-tool.wasm', '/missing.svg']) {
      const response = await fetch(`${base}${path}`);
      expect(response.status, path).toBe(404);
      expect(response.headers.get('content-type')).toContain('text/plain');
      expect(await response.text()).toBe('Not found');
    }
    const clientRoute = await fetch(`${base}/en/tools/not-yet-a-real-route`);
    expect(clientRoute.status).toBe(404);
    const missingShell = await clientRoute.text();
    expect(missingShell).toContain('<html lang="en">');
    expect(missingShell).toContain('<title>Page not found —');
    expect(missingShell).toContain('<meta name="robots" content="noindex,nofollow"');

    const localizedAlias = await fetch(`${base}/es/support?from=old-link`, { redirect: 'manual' });
    expect(localizedAlias.status).toBe(308);
    expect(localizedAlias.headers.get('location')).toBe('/es/apoyar?from=old-link');
  });

  it('serves the repository license and third-party notices as browser-readable text', async () => {
    const license = await fetch(`${base}/legal/LICENSE.txt`);
    expect(license.status).toBe(200);
    expect(license.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await license.text()).toBe(await readFile(new URL('../../../LICENSE', import.meta.url), 'utf8'));

    const notices = await fetch(`${base}/legal/THIRD_PARTY_NOTICES.txt`);
    expect(notices.status).toBe(200);
    expect(notices.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await notices.text()).toBe(await readFile(new URL('../../../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8'));
  });

  it('exposes only sanitized public runtime configuration', async () => {
    const config = await (await fetch(`${base}/_portal/config`)).json() as Record<string, unknown>;
    expect(config.projectName).toBe('unsafe utility');
    expect(config.supportUrl).toBe('');
    expect(config.defaultLanguage).toBe('es');
    expect(config.enabledServices).toEqual(['cobalt', 'searxng', 'ntfy']);
    expect(config.webhookInboxEnabled).toBe(true);
    expect(config.dnsLookupEnabled).toBe(true);
    expect(config.publicSearchUrl).toBe('http://10.23.0.2:8888/');
    expect(config.publicNtfyUrl).toBe('http://10.23.0.2:2586/');
    expect(JSON.stringify(config)).not.toContain('EDGE_PROXY_IP');
  });

  it('rejects unapproved origins and private or unsupported URLs before Cobalt', async () => {
    const evil = await fetch(`${base}/_portal/media`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'https://youtube.com/watch?v=testtest' }) });
    expect(evil.status).toBe(403);
    for (const url of [
      'http://127.0.0.1/admin',
      'http://[::1]/admin',
      'file:///etc/passwd',
      'https://youtube.com.evil.example/watch?v=x',
      'https://user:password@youtube.com/watch?v=x',
      'https://youtube.com:8443/watch?v=x',
      'not a URL',
    ]) {
      const rejected = await fetch(`${base}/_portal/media`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
      expect(rejected.status, url).toBe(400);
      expect(await rejected.json()).toEqual({ error: 'unsupported_url' });
    }
    const oversized = await fetch(`${base}/_portal/media`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ url: `https://youtube.com/${'x'.repeat(9000)}` }) });
    expect(oversized.status).toBe(413);
  });

  it('does not expose arbitrary API paths', async () => {
    expect((await fetch(`${base}/api/proxy?url=http://127.0.0.1`)).status).toBe(404);
    expect((await fetch(`${base}/api/media/tunnel`)).status).toBe(404);
    expect((await fetch(`${base}/api/media/tunnel-extra`)).status).toBe(404);
  });

  it('broadens outbound connections only on browser-direct network tool documents', async () => {
    const ordinary = await fetch(`${base}/en/tools/json`);
    expect(ordinary.headers.get('content-security-policy')).toContain("connect-src 'self';");
    const network = await fetch(`${base}/en/tools/http-request`);
    expect(network.headers.get('content-security-policy')).toContain("connect-src 'self' https: wss:;");
    const spanishSocket = await fetch(`${base}/es/herramientas/websocket`);
    expect(spanishSocket.headers.get('content-security-policy')).toContain("connect-src 'self' https: wss:;");
  });

  it('integrates bounded temporary webhook inboxes without exposing read access in the receive URL', async () => {
    const created = await fetch(`${base}/_portal/developer/webhook-inboxes`, {
      method: 'POST',
      headers: { Origin: base },
    });
    expect(created.status).toBe(201);
    const payload = await created.json() as { inbox: { id: string; receivePath: string; limits: { bodyBytes: number } }; readToken: string };
    expect(payload.inbox.id).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(payload.inbox.receivePath).not.toContain(payload.readToken);
    expect(payload.inbox.limits.bodyBytes).toBe(12 * 1024);

    const received = await fetch(`${base}${payload.inbox.receivePath}?event=test`, {
      method: 'POST',
      headers: { Authorization: 'Bearer sender-secret', Cookie: 'session=private', 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=test' },
      body: '{"ok":true}',
    });
    expect(received.status).toBe(202);
    const events = await fetch(`${base}/_portal/developer/webhook-inboxes/${payload.inbox.id}/events`, {
      headers: { Origin: base, Authorization: `Bearer ${payload.readToken}` },
    });
    expect(events.status).toBe(200);
    const listed = await events.json() as { events: Array<{ headers: Record<string, string>; body: { value: string } }> };
    expect(listed.events).toHaveLength(1);
    expect(listed.events[0]?.headers.authorization).toBeUndefined();
    expect(listed.events[0]?.headers.cookie).toBeUndefined();
    expect(listed.events[0]?.headers['x-hub-signature-256']).toBe('sha256=test');
    expect(listed.events[0]?.body.value).toBe('{"ok":true}');
  });

  it('groups trusted IPv6 client identities by /64 for developer rate limits', async () => {
    const statuses: number[] = [];
    for (let index = 1; index <= 11; index += 1) {
      const response = await fetch(`${base}/_portal/developer/webhook-inboxes`, {
        method: 'POST',
        headers: { Origin: base, 'X-Forwarded-For': `2001:db8:1234:5678::${index}` },
      });
      statuses.push(response.status);
      if (response.ok) {
        const created = await response.json() as { inbox: { id: string }; readToken: string };
        const deleted = await fetch(`${base}/_portal/developer/webhook-inboxes/${created.inbox.id}`, {
          method: 'DELETE',
          headers: {
            Origin: base,
            'X-Forwarded-For': `2001:db8:1234:5678::${index}`,
            Authorization: `Bearer ${created.readToken}`,
          },
        });
        expect(deleted.status).toBe(204);
      }
    }
    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(201));
    expect(statuses[10]).toBe(429);
  });

  it('coalesces and briefly caches high-level status checks', async () => {
    const [first, second] = await Promise.all([fetch(`${base}/_portal/status`), fetch(`${base}/_portal/status`)]);
    const [left, right] = await Promise.all([first.json(), second.json()]);
    expect(left).toEqual(right);
    expect(left).toEqual({ checkedAt: expect.any(String), services: [] });
  });

  it('attaches the server-held Cobalt key, forwards only the fixed schema, and sanitizes output', async () => {
    const response = await mediaRequest('https://youtube.com/watch?v=success', { arbitrary: 'discarded', videoQuality: '1080', downloadMode: 'audio' });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'redirect', url: 'https://cdn.example.net/public-media', filename: 'safename.mp4' });
    expect(lastCobaltAuthorization).toBe('Api-Key server-held-test-key');
    expect(lastCobaltBody).toEqual({
      url: 'https://youtube.com/watch?v=success', videoQuality: '1080', downloadMode: 'audio', filenameStyle: 'basic',
      audioFormat: 'best', disableMetadata: true, alwaysProxy: false, localProcessing: 'disabled',
      youtubeVideoCodec: 'h264', youtubeVideoContainer: 'auto', youtubeBetterAudio: false, convertGif: false,
    });
  });

  it('maps known failures, rejects unsafe upstream URLs, and times out bounded work', async () => {
    const duration = await mediaRequest('https://youtube.com/watch?v=duration');
    expect(duration.status).toBe(400);
    expect(await duration.json()).toEqual({ error: 'duration_limit' });
    const invalid = await mediaRequest('https://youtube.com/watch?v=invalid-response');
    expect(invalid.status).toBe(502);
    expect(await invalid.json()).toEqual({ error: 'invalid_upstream_response' });
    const privateOutput = await mediaRequest('https://youtube.com/watch?v=private-output');
    expect(privateOutput.status).toBe(502);
    expect(await privateOutput.json()).toEqual({ error: 'invalid_upstream_response' });
    const previewTunnel = await mediaRequest('https://youtube.com/watch?v=preview-tunnel');
    expect(previewTunnel.status).toBe(200);
    expect(await previewTunnel.json()).toEqual({ status: 'tunnel', url: 'https://media.example.test/tunnel?token=opaque' });
    const previewPrivatePath = await mediaRequest('https://youtube.com/watch?v=preview-private-path');
    expect(previewPrivatePath.status).toBe(502);
    expect(await previewPrivatePath.json()).toEqual({ error: 'invalid_upstream_response' });
    for (const marker of ['preview-tunnel-no-query', 'preview-tunnel-other-host']) {
      const unsafeTunnel = await mediaRequest(`https://youtube.com/watch?v=${marker}`);
      expect(unsafeTunnel.status).toBe(502);
      expect(await unsafeTunnel.json()).toEqual({ error: 'invalid_upstream_response' });
    }
    const timeout = await mediaRequest('https://youtube.com/watch?v=slow');
    expect(timeout.status).toBe(504);
    expect(await timeout.json()).toEqual({ error: 'upstream_timeout' });
  });

  it('bounds concurrent media resolution and applies the per-client request limit', async () => {
    const concurrent = await Promise.all([
      mediaRequest('https://youtube.com/watch?v=slow'),
      mediaRequest('https://youtube.com/watch?v=slow'),
      mediaRequest('https://youtube.com/watch?v=success'),
    ]);
    expect(concurrent.map((response) => response.status).sort()).toEqual([503, 504, 504].sort());

    const repeated = await Promise.all(Array.from({ length: 110 }, (_, index) => mediaRequest(`https://youtube.com/watch?v=rate${index}`)));
    expect(repeated.some((response) => response.status === 429)).toBe(true);
  });
});

function mediaRequest(url: string, extra: Record<string, unknown> = {}): Promise<Response> {
  return fetch(`${base}/_portal/media`, {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, ...extra }),
  });
}

function sendFake(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(body));
}

function rawHttpRequest(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let response = '';
    socket.setEncoding('utf8');
    socket.setTimeout(2_000, () => socket.destroy(new Error('raw HTTP request timed out')));
    socket.on('connect', () => socket.end(payload));
    socket.on('data', (chunk) => { response += chunk; });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}

function rawHttpRequestWithoutBodyCompletion(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    let response = '';
    socket.setEncoding('utf8');
    socket.setTimeout(2_000, () => socket.destroy(new Error('raw HTTP request timed out')));
    socket.on('connect', () => socket.write(payload));
    socket.on('data', (chunk) => { response += chunk; });
    socket.on('end', () => resolve(response));
    socket.on('error', reject);
  });
}
