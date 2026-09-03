import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadPublicConfig, PUBLIC_CONFIG_TIMEOUT_MS } from '../../src/config';

describe('public runtime configuration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('loads the sanitized public schema with an abortable, uncached request', async () => {
    let requestOptions: RequestInit | undefined;
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo | URL, options?: RequestInit) => {
      requestOptions = options;
      return new Response(JSON.stringify({
        projectName: 'Utilibre test',
        publicSearchUrl: 'https://search.example.test/',
        webhookInboxEnabled: true,
        dnsLookupEnabled: true,
        enabledServices: ['searxng', 42, null],
        defaultLanguage: 'es',
      }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    }));

    await expect(loadPublicConfig()).resolves.toMatchObject({
      projectName: 'Utilibre test',
      publicSearchUrl: 'https://search.example.test/',
      webhookInboxEnabled: true,
      dnsLookupEnabled: true,
      enabledServices: ['searxng'],
      defaultLanguage: 'es',
    });
    expect(requestOptions).toMatchObject({ credentials: 'omit', cache: 'no-store' });
    expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  it('abandons a hung request and returns safe defaults', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | null | undefined;
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, options?: RequestInit) => {
      signal = options?.signal;
      return new Promise<Response>(() => { /* Simulate a request that ignores abort. */ });
    }));

    const config = loadPublicConfig();
    await vi.advanceTimersByTimeAsync(PUBLIC_CONFIG_TIMEOUT_MS);

    await expect(config).resolves.toMatchObject({
      projectName: 'Utilibre',
      enabledServices: [],
      defaultLanguage: 'en',
    });
    expect(signal?.aborted).toBe(true);
  });
});
