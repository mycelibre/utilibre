import { spawn, type ChildProcess } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const port = 43891;
const base = `http://127.0.0.1:${port}`;
let server: ChildProcess;

describe('portal server security boundaries', () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PORT: String(port),
        LISTEN_ADDRESS: '127.0.0.1',
        ENABLED_SERVICES: 'searxng,redlib,freshrss,privatebin',
        DEFAULT_LANGUAGE: 'es',
        PRIVATE_PREVIEW: '1',
        PRIVATE_BIND_IP: '10.23.0.2',
        PUBLIC_SEARCH_URL: 'http://10.23.0.2:8888/',
        PUBLIC_REDDIT_URL: 'http://10.23.0.2:3002/',
        PUBLIC_RSS_URL: 'http://10.23.0.2:3106/',
        PUBLIC_PASTE_URL: 'http://10.23.0.2:3108/',
        STATUS_SERVICES: 'searxng=https://evil.example/health,unknown=http://searxng:8080/healthz',
        PROJECT_NAME: '<unsafe> utility',
        SUPPORT_URL: 'http://donations.example.net/',
      },
      stdio: 'ignore',
    });
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try { if ((await fetch(`${base}/healthz`)).ok) return; } catch { /* Startup is still in progress. */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('server did not start');
  });

  afterAll(() => server?.kill('SIGTERM'));

  it('serves fixed health and document security headers', async () => {
    const response = await fetch(`${base}/healthz`);
    expect(await response.json()).toEqual({ status: 'ok' });
    expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');

    const english = await fetch(`${base}/en/privacy?view=compact`);
    expect(english.headers.get('x-robots-tag')).toBeNull();
    expect(english.headers.get('cache-control')).toBe('no-cache, no-transform');
    const englishShell = await english.text();
    expect(englishShell).toContain('<html lang="en">');
    expect(englishShell).toContain('<link rel="canonical" href="/en/privacy" />');

    const spanish = await fetch(`${base}/es/privacidad`);
    const spanishShell = await spanish.text();
    expect(spanishShell).toContain('<html lang="es">');
    expect(spanishShell).toContain('Ir al contenido principal');
    expect(spanishShell).toContain('<link rel="canonical" href="/es/privacidad" />');
    expect(spanishShell).toContain('hreflang="en" href="/en/privacy"');

    const preferredEnglish = await fetch(`${base}/`, { headers: { 'Accept-Language': 'en-US,en;q=0.9,es;q=0.8' } });
    expect(await preferredEnglish.text()).toContain('<html lang="en">');
  });

  it('rejects malformed absolute request targets without terminating the process', async () => {
    const malformed = await rawHttpRequest('GET http://[ HTTP/1.1\r\nHost: portal.invalid\r\nConnection: close\r\n\r\n');
    expect(malformed).toMatch(/^HTTP\/1\.1 400 /);
    expect(malformed).toContain('"error":"invalid_request_target"');

    const networkPath = await rawHttpRequest('GET //evil.example/healthz HTTP/1.1\r\nHost: portal.invalid\r\nConnection: close\r\n\r\n');
    expect(networkPath).toMatch(/^HTTP\/1\.1 404 /);
    expect(server.exitCode).toBeNull();
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it('rejects and closes declared bodies on every route', async () => {
    for (const path of ['/healthz', '/_portal/media', '/_portal/developer/webhooks/test']) {
      const response = await rawHttpRequestWithoutBodyCompletion(
        `POST ${path} HTTP/1.1\r\nHost: portal.invalid\r\nContent-Length: 100\r\n\r\n`,
      );
      expect(response, path).toMatch(/^HTTP\/1\.1 400 /);
      expect(response).toContain('Connection: close');
      expect(response).toContain('"error":"unexpected_request_body"');
    }
    expect(server.exitCode).toBeNull();
  });

  it('fails closed at the retained header limit', async () => {
    const fillers = Array.from({ length: 100 }, (_, index) => `X-Filler-${index}: value`).join('\r\n');
    const response = await rawHttpRequestWithoutBodyCompletion(
      `GET /healthz HTTP/1.1\r\nHost: portal.invalid\r\n${fillers}\r\nContent-Length: 100\r\n\r\n`,
    );
    expect(response).toMatch(/^HTTP\/1\.1 431 /);
    expect(response).toContain('Connection: close');
    expect(response).toContain('"error":"too_many_headers"');
    expect((await fetch(`${base}/healthz`)).status).toBe(200);
  });

  it('returns real 404s for missing assets, routes, and retired APIs', async () => {
    for (const path of ['/assets/obsolete-tool.js', '/vendor/obsolete-tool.wasm', '/missing.svg']) {
      const response = await fetch(`${base}${path}`);
      expect(response.status, path).toBe(404);
      expect(response.headers.get('content-type')).toContain('text/plain');
      expect(await response.text()).toBe('Not found');
    }
    const clientRoute = await fetch(`${base}/en/tools/not-a-real-route`);
    expect(clientRoute.status).toBe(404);
    expect(clientRoute.headers.get('x-robots-tag')).toBe('noindex, nofollow');

    for (const path of [
      '/api/proxy?url=http://127.0.0.1',
      '/api/media/tunnel',
      '/_portal/media',
      '/_portal/developer/webhook-inboxes',
      '/_portal/developer/dns',
    ]) expect((await fetch(`${base}${path}`)).status, path).toBe(404);
  });

  it('preserves the localized support alias', async () => {
    const response = await fetch(`${base}/es/support?from=old-link`, { redirect: 'manual' });
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('/es/apoyar?from=old-link');
  });

  it('serves the license and third-party notices as browser-readable text', async () => {
    const license = await fetch(`${base}/legal/LICENSE.txt`);
    expect(license.status).toBe(200);
    expect(license.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await license.text()).toBe(await readFile(new URL('../../../LICENSE', import.meta.url), 'utf8'));

    const notices = await fetch(`${base}/legal/THIRD_PARTY_NOTICES.txt`);
    expect(notices.status).toBe(200);
    expect(notices.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(await notices.text()).toBe(await readFile(new URL('../../../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8'));
  });

  it('exposes only the sanitized retained-service configuration', async () => {
    const config = await (await fetch(`${base}/_portal/config`)).json() as Record<string, unknown>;
    expect(config.projectName).toBe('unsafe utility');
    expect(config.supportUrl).toBe('');
    expect(config.defaultLanguage).toBe('es');
    expect(config.enabledServices).toEqual(['searxng', 'redlib', 'freshrss', 'privatebin']);
    expect(config.publicSearchUrl).toBe('http://10.23.0.2:8888/');
    expect(config.publicRedditUrl).toBe('http://10.23.0.2:3002/');
    expect(config.publicRssUrl).toBe('http://10.23.0.2:3106/');
    expect(config.publicPasteUrl).toBe('http://10.23.0.2:3108/');
    for (const retired of ['publicNtfyUrl', 'publicMediaUrl', 'webhookInboxEnabled', 'dnsLookupEnabled']) {
      expect(config).not.toHaveProperty(retired);
    }
    expect(JSON.stringify(config)).not.toContain('EDGE_PROXY_IP');
  });

  it('keeps portal documents on a same-origin connection policy', async () => {
    for (const path of ['/en/', '/en/privacy', '/es/privacidad']) {
      const response = await fetch(`${base}${path}`);
      expect(response.headers.get('content-security-policy')).toContain("connect-src 'self';");
      expect(response.headers.get('content-security-policy')).not.toContain('https: wss:');
    }
  });

  it('discards public or disabled status targets and coalesces status snapshots', async () => {
    const [first, second] = await Promise.all([fetch(`${base}/_portal/status`), fetch(`${base}/_portal/status`)]);
    const [left, right] = await Promise.all([first.json(), second.json()]);
    expect(left).toEqual(right);
    expect(left).toEqual({ checkedAt: expect.any(String), services: [] });
  });
});

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
