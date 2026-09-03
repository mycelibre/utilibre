import { expect, test, type Page } from '@playwright/test';

const runDeveloperServerTests = process.env.E2E_DEVELOPER_SERVER === '1' && Boolean(process.env.E2E_BASE_URL);

async function settleTool(page: Page): Promise<void> {
  await expect(page.locator('.tool-panel')).toBeVisible();
  await page.waitForLoadState('networkidle');
}

async function captureDisallowedToolRequests(page: Page, action: () => Promise<void>): Promise<string[]> {
  const requests: string[] = [];
  const listener = (request: { method(): string; url(): string }) => {
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const sameOrigin = url.origin === new URL(page.url()).origin;
    if (!sameOrigin || (method !== 'GET' && method !== 'HEAD')) requests.push(`${method} ${url.href}`);
  };
  page.on('request', listener);
  try {
    await action();
    await page.waitForTimeout(100);
  } finally {
    page.off('request', listener);
  }
  return requests;
}

test('local-tool request guard allows static GETs and classifies external or content-bearing requests', async ({ page }) => {
  await page.route('**/request-guard-fixture', async (route) => route.fulfill({
    status: 204,
    headers: { 'Access-Control-Allow-Origin': '*' },
  }));
  await page.goto('/en/');
  let outcomes: string[] = [];
  const requests = await captureDisallowedToolRequests(page, async () => {
    outcomes = await page.evaluate(async () => {
      const settled = await Promise.allSettled([
        fetch('/request-guard-fixture'),
        fetch('/request-guard-fixture', { method: 'POST', body: 'content' }),
        fetch('https://external.example/request-guard-fixture'),
      ]);
      return settled.map(({ status }) => status);
    });
  });
  if (runDeveloperServerTests) {
    expect(outcomes).toEqual(['fulfilled', 'fulfilled', 'rejected']);
    expect(requests).toHaveLength(1);
  } else {
    // Vite intentionally supplies no production response headers. In this
    // harness the external fixture is allowed through, proving that the guard
    // classifies it; the production-server suite separately proves CSP blocks it.
    expect(outcomes).toEqual(['fulfilled', 'fulfilled', 'fulfilled']);
    expect(requests).toHaveLength(2);
    expect(requests).toContain('GET https://external.example/request-guard-fixture');
  }
  expect(requests.some((value) => value.startsWith('POST ') && value.includes(new URL(page.url()).origin))).toBe(true);
});

test('webhook HMAC verification makes no external or content-bearing request', async ({ page }) => {
  await page.goto('/en/tools/webhook-signature');
  await settleTool(page);

  const payload = '{"event":"ping"}';
  const validSignature = '4f4bb3a54e99c4a20e243485229f9b08c66e09104ba6f79c23ce647242a4ce84';
  const binarySignature = '04cf6baa7aba8d916f0890f0b4369dac252e519c6e8a38a7573c825c11ac3771';
  await page.getByLabel('Payload', { exact: true }).fill(payload);
  await page.getByLabel('Secret').fill('secret');
  await page.getByLabel('Signature', { exact: true }).fill(validSignature);

  const requests = await captureDisallowedToolRequests(page, async () => {
    await page.getByRole('button', { name: 'Verify signature' }).click();
    await expect(page.getByRole('status')).toHaveText('Signature valid');

    await page.getByLabel('Signature', { exact: true }).fill(`${validSignature.slice(0, -1)}5`);
    await page.getByRole('button', { name: 'Verify signature' }).click();
    await expect(page.getByRole('status')).toHaveText('Signature invalid');

    await page.getByLabel('Payload', { exact: true }).fill('AA0K/w==');
    await page.getByLabel('Payload encoding').selectOption('base64');
    await expect(page.getByLabel('Payload', { exact: true })).toHaveAttribute('maxlength', '1398104');
    await page.getByLabel('Secret').fill('key');
    await page.getByLabel('Signature', { exact: true }).fill(binarySignature);
    await page.getByRole('button', { name: 'Verify signature' }).click();
    await expect(page.getByRole('status')).toHaveText('Signature valid');

    await page.getByLabel('Payload encoding').selectOption('utf-8');
    await page.getByRole('button', { name: 'Verify signature' }).click();
    await expect(page.getByRole('status')).toHaveText('Signature invalid');
  });
  expect(requests).toEqual([]);
});

test('UUID inspection works in Spanish without an external or content-bearing request', async ({ page }) => {
  await page.goto('/es/herramientas/uuid');
  await settleTool(page);

  const uuid = '550e8400-e29b-41d4-a716-446655440000';
  await page.getByLabel('UUID que se examinará').fill(uuid);
  const requests = await captureDisallowedToolRequests(page, async () => {
    await page.getByRole('button', { name: 'Examinar UUID' }).click();
    await expect(page.getByRole('status')).toHaveText('UUID válido.');
  });

  await expect(page.locator('.developer-results')).toContainText(uuid);
  await expect(page.locator('.developer-results')).toContainText('rfc-4122');
  await expect(page.locator('.developer-results')).toContainText('4');
  expect(requests).toEqual([]);
});

test('OpenAPI inspector parses JSON without fetching its remote reference or making a content-bearing request', async ({ page }) => {
  await page.goto('/en/tools/openapi');
  await settleTool(page);

  const document = {
    openapi: '3.1.0',
    info: { title: 'Fixture API', version: '1.2.3' },
    paths: {
      '/pets': {
        get: {
          summary: 'List pets',
          responses: { 200: { description: 'OK' } },
        },
      },
    },
    components: {
      schemas: {
        Pet: { $ref: 'https://schemas.example.invalid/Pet.yaml' },
      },
    },
  };
  await page.getByLabel('OpenAPI JSON or YAML').fill(JSON.stringify(document));
  const inspect = page.getByRole('button', { name: 'Inspect document' });

  const requests = await captureDisallowedToolRequests(page, async () => {
    await inspect.click();
    await expect(page.getByRole('status')).toHaveText('Complete.');
  });

  await expect(page.locator('.developer-results')).toContainText('Fixture API');
  await expect(page.locator('.developer-results')).toContainText('/pets');
  await expect(page.locator('.developer-results')).toContainText('List pets');
  await expect(page.locator('.developer-results')).toContainText('https://schemas.example.invalid/Pet.yaml');
  await expect(inspect).toBeFocused();
  expect(requests).toEqual([]);
});

test('OpenAPI inspector parses YAML in Spanish without an external or content-bearing request', async ({ page }) => {
  await page.goto('/es/herramientas/openapi');
  await settleTool(page);
  await page.getByLabel('OpenAPI en JSON o YAML').fill(`openapi: 3.0.3
info:
  title: API de prueba
  version: 1.0.0
paths:
  /salud:
    get:
      summary: Consultar salud
      responses:
        '200':
          description: Correcto
`);

  const requests = await captureDisallowedToolRequests(page, async () => {
    await page.getByRole('button', { name: 'Examinar documento' }).click();
    await expect(page.getByRole('status')).toHaveText('Completado.');
  });

  await expect(page.locator('.developer-results')).toContainText('API de prueba');
  await expect(page.locator('.developer-results')).toContainText('/salud');
  await expect(page.locator('.developer-results')).toContainText('Consultar salud');
  expect(requests).toEqual([]);
});

test('local developer inputs reject oversized values before starting expensive work', async ({ page }) => {
  await page.goto('/en/tools/regex');
  await settleTool(page);
  const pattern = page.getByLabel('Pattern');
  const regexText = page.getByLabel('Test text');
  await expect(pattern).toHaveAttribute('maxlength', '512');
  await expect(page.getByLabel('Flags')).toHaveAttribute('maxlength', '8');
  await expect(regexText).toHaveAttribute('maxlength', '50000');
  await page.evaluate(() => {
    Object.defineProperty(window, 'Worker', {
      configurable: true,
      value: class {
        constructor() {
          document.documentElement.dataset.workerStarted = 'true';
          throw new Error('Worker should not start for oversized input.');
        }
      },
    });
  });
  await pattern.evaluate((element) => { (element as HTMLInputElement).value = 'a'.repeat(513); });
  await page.getByRole('button', { name: 'Test expression' }).click();
  await expect(page.getByRole('status')).toHaveText('The regular-expression input exceeds the browser safety limit.');
  await expect(page.locator('html')).not.toHaveAttribute('data-worker-started');
  await regexText.evaluate((element) => { (element as HTMLTextAreaElement).value = 'a'; });
  await page.getByLabel('Flags').evaluate((element) => { (element as HTMLInputElement).value = 'dgimsuvyy'; });
  await page.getByRole('button', { name: 'Test expression' }).click();
  await expect(page.getByRole('status')).toHaveText('The regular-expression input exceeds the browser safety limit.');
  await expect(page.locator('html')).not.toHaveAttribute('data-worker-started');
  await pattern.evaluate((element) => { (element as HTMLInputElement).value = 'a'; });
  await regexText.evaluate((element) => { (element as HTMLTextAreaElement).value = 'a'.repeat(50_001); });
  await page.getByRole('button', { name: 'Test expression' }).click();
  await expect(page.getByRole('status')).toHaveText('The regular-expression input exceeds the browser safety limit.');
  await expect(page.locator('html')).not.toHaveAttribute('data-worker-started');

  await page.goto('/en/tools/cron');
  await settleTool(page);
  const cron = page.getByLabel('Five-field cron expression');
  await expect(cron).toHaveAttribute('maxlength', '1024');
  await page.evaluate(() => {
    Object.defineProperty(window, 'Worker', {
      configurable: true,
      value: class {
        constructor() {
          document.documentElement.dataset.workerStarted = 'true';
          throw new Error('Worker should not start for oversized input.');
        }
      },
    });
  });
  await cron.evaluate((element) => { (element as HTMLInputElement).value = '*'.repeat(1_025); });
  await page.getByRole('button', { name: 'Preview next times' }).click();
  await expect(page.getByRole('status')).toHaveText('The cron expression exceeds the browser safety limit.');
  await expect(page.locator('html')).not.toHaveAttribute('data-worker-started');

  await page.goto('/en/tools/timestamp');
  await settleTool(page);
  const timestamp = page.getByLabel('Unix timestamp or date');
  await expect(timestamp).toHaveAttribute('maxlength', '256');
  await timestamp.evaluate((element) => { (element as HTMLInputElement).value = '9'.repeat(257); });
  await page.getByRole('button', { name: 'Convert timestamp' }).click();
  await expect(page.getByRole('status')).toHaveText('The timestamp exceeds the browser safety limit.');
});

test('developer validation stays specific in Spanish without leaking raw English errors', async ({ page }) => {
  await page.goto('/es/herramientas/expresiones-regulares');
  await settleTool(page);
  await page.getByLabel('Patrón').evaluate((element) => { (element as HTMLInputElement).value = 'a'.repeat(513); });
  await page.getByRole('button', { name: 'Probar expresión' }).click();
  await expect(page.getByRole('status')).toHaveText('Revisa el patrón de la expresión regular, los indicadores y los límites de entrada.');

  await page.goto('/es/herramientas/marcas-de-tiempo');
  await settleTool(page);
  await page.getByLabel('Marca de tiempo Unix o fecha').fill('not-a-date');
  await page.getByRole('button', { name: 'Convertir marca de tiempo' }).click();
  await expect(page.getByRole('status')).toHaveText('Ingresa una marca de tiempo o fecha válida de hasta 256 caracteres.');
  await expect(page.getByRole('status')).not.toContainText('invalid');

  await page.goto('/es/herramientas/solicitud-http');
  await settleTool(page);
  await page.getByLabel('URL').fill('not a URL');
  await page.getByRole('button', { name: 'Enviar solicitud' }).click();
  await expect(page.getByRole('status')).toHaveText('Ingresa una URL válida y compatible, sin credenciales incorporadas.');

  await page.goto('/es/herramientas/verificar-firma-webhook');
  await settleTool(page);
  await page.getByLabel('Codificación del contenido').selectOption('base64');
  await page.getByLabel('Contenido', { exact: true }).fill('AA0K/w==\n');
  await page.getByLabel('Secreto').fill('key');
  await page.getByLabel('Firma', { exact: true }).fill('00');
  await page.getByRole('button', { name: 'Verificar firma' }).click();
  await expect(page.getByRole('status')).toHaveText('Revisa el contenido, la firma, el secreto, el algoritmo y la codificación.');

  await page.goto('/es/herramientas/inspeccionar-jwt');
  await settleTool(page);
  await page.getByLabel('JWT', { exact: true }).fill('eyJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJ1dGlsaWJyZSIsImV4cCI6MH0.AA');
  await page.getByRole('button', { name: 'Decodificar', exact: true }).click();
  const claimDetails = page.locator('.developer-results');
  await expect(claimDetails).toContainText('emisor');
  await expect(claimDetails).toContainText('la fecha está en el pasado');
  await expect(claimDetails).not.toContainText(/\b(?:issuer|past)\b/);
});

test('WebSocket sessions close after the cumulative incoming byte limit', async ({ page }) => {
  await page.addInitScript(() => {
    class TestWebSocket extends EventTarget {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;
      readonly url: string;
      readonly protocols: string[];
      binaryType = 'blob';
      readyState = TestWebSocket.CONNECTING;
      closedCode: number | null = null;

      constructor(url: string | URL, protocols: string[] = []) {
        super();
        this.url = String(url);
        this.protocols = protocols;
        Reflect.set(window, '__testWebSocket', this);
        queueMicrotask(() => {
          this.readyState = TestWebSocket.OPEN;
          this.dispatchEvent(new Event('open'));
        });
      }

      send(): void {}

      close(code = 1_000, reason = ''): void {
        if (this.readyState === TestWebSocket.CLOSED) return;
        this.readyState = TestWebSocket.CLOSED;
        this.closedCode = code;
        queueMicrotask(() => this.dispatchEvent(new CloseEvent('close', { code, reason })));
      }

      emitText(value: string): void {
        this.dispatchEvent(new MessageEvent('message', { data: value }));
      }
    }
    Object.defineProperty(window, 'WebSocket', { configurable: true, value: TestWebSocket });
  });
  await page.goto('/en/tools/websocket');
  await settleTool(page);
  const socketLog = page.getByRole('log', { name: 'Session log' });
  await expect(socketLog).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByText(/more than 10 MiB received in total/)).toBeVisible();
  await page.getByLabel('WebSocket URL').fill('wss://example.test/socket');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Complete.');
  await expect(page.getByRole('button', { name: 'Disconnect', exact: true })).toBeFocused();
  await page.evaluate(() => {
    const socket = Reflect.get(window, '__testWebSocket') as { emitText(value: string): void };
    socket.emitText('visible'.repeat(10_000));
  });
  await expect(page.locator('.developer-event-log li').last()).toContainText('[display truncated]');
  await page.evaluate(() => {
    const socket = Reflect.get(window, '__testWebSocket') as { emitText(value: string): void };
    const chunk = 'a'.repeat(1_024 * 1_024);
    for (let index = 0; index < 11; index += 1) socket.emitText(chunk);
  });
  await expect(page.getByRole('status')).toHaveText('Check the WebSocket URL, subprotocols, connection, and message limits.');
  await expect.poll(() => page.evaluate(() => (Reflect.get(window, '__testWebSocket') as { closedCode: number }).closedCode)).toBe(1_009);
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeFocused();
});

test('SSE limit errors abort the fetch and cancel the locked stream reader', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (String(input) !== 'https://events.example.test/limit') return originalFetch(input, init);
      init?.signal?.addEventListener('abort', () => { document.documentElement.dataset.sseFetchAborted = 'true'; });
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`event: ${'e'.repeat(129)}\nid: ${'i'.repeat(513)}\ndata: ${'d'.repeat(65_537)}\n\n`));
          controller.enqueue(new TextEncoder().encode('a'.repeat(131_073)));
        },
        cancel() {
          document.documentElement.dataset.sseReaderCancelled = 'true';
        },
      });
      return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
    };
  });
  await page.goto('/en/tools/sse');
  await settleTool(page);
  await expect(page.getByRole('log', { name: 'Event log' })).toHaveAttribute('aria-live', 'polite');
  await page.getByLabel('Event-stream URL').fill('https://events.example.test/limit');
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('The event buffer exceeded 128 KiB.');
  await expect(page.locator('.developer-event-log li').last()).toContainText('[display truncated]');
  await expect(page.locator('html')).toHaveAttribute('data-sse-fetch-aborted', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-sse-reader-cancelled', 'true');
  await expect(page.getByRole('button', { name: 'Connect', exact: true })).toBeFocused();
});

test('browser-direct developer routes render their explicit boundary without contacting a destination', async ({ page }) => {
  const routes = [
    ['/en/tools/http-request', 'HTTP request tester', 'Your browser connects directly to the destination. Utilibre does not proxy the request.'],
    ['/es/herramientas/cabeceras-http', 'Cabeceras de respuesta visibles por CORS', 'Tu navegador se conecta directamente al destino. Utilibre no retransmite la solicitud.'],
    ['/en/tools/websocket', 'WebSocket tester', 'Your browser connects directly to the destination. Utilibre does not proxy the request.'],
    ['/es/herramientas/eventos-sse', 'Visor de eventos enviados por servidor', 'Tu navegador se conecta directamente al destino. Utilibre no retransmite la solicitud.'],
  ] as const;

  for (const [route, heading, boundary] of routes) {
    await page.goto(route);
    await settleTool(page);
    const pageOrigin = new URL(page.url()).origin;
    const destinations: string[] = [];
    const socketDestinations: string[] = [];
    const requestListener = (request: { url(): string }) => {
      if (new URL(request.url()).origin !== pageOrigin) destinations.push(request.url());
    };
    const socketListener = (socket: { url(): string }) => socketDestinations.push(socket.url());
    page.on('request', requestListener);
    page.on('websocket', socketListener);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText(boundary, { exact: true })).toBeVisible();
    await page.waitForTimeout(100);
    page.off('request', requestListener);
    page.off('websocket', socketListener);
    expect(destinations).toEqual([]);
    expect(socketDestinations).toEqual([]);
  }
});

test('server-backed tools show a literal unavailable state when disabled', async ({ page }) => {
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: {
      webhookInboxEnabled: false,
      dnsLookupEnabled: false,
      enabledServices: [],
      defaultLanguage: 'en',
    },
  }));

  await page.goto('/en/tools/webhook-inbox');
  await expect(page.getByRole('heading', { level: 1, name: 'Temporary webhook inbox' })).toBeVisible();
  await expect(page.getByText('Not configured', { exact: true })).toBeVisible();
  await expect(page.locator('.tool-panel')).toHaveCount(0);

  await page.goto('/es/herramientas/consulta-dns');
  await expect(page.getByRole('heading', { level: 1, name: 'Consulta DNS' })).toBeVisible();
  await expect(page.getByText('No configurado', { exact: true })).toBeVisible();
  await expect(page.locator('.tool-panel')).toHaveCount(0);
});

test('webhook bodies distinguish authoritative UTF-8 text from Base64 representations', async ({ page }) => {
  const rawBody = '{\r\n  "event" : "ping",\r\n  "count" : 2\r\n}';
  const encodedBody = 'AA0K/w==';
  const inboxId = 'a'.repeat(32);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => { Reflect.set(window, '__copiedWebhookBody', value); },
      },
    });
  });
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: {
      webhookInboxEnabled: true,
      dnsLookupEnabled: false,
      enabledServices: [],
      defaultLanguage: 'en',
    },
  }));
  await page.route('**/_portal/developer/webhook-inboxes**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST' && url.pathname === '/_portal/developer/webhook-inboxes') {
      return route.fulfill({
        json: {
          inbox: {
            id: inboxId,
            receivePath: `/_portal/developer/webhooks/${inboxId}`,
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
          readToken: 'b'.repeat(32),
        },
      });
    }
    if (request.method() === 'GET' && url.pathname.endsWith('/events')) {
      return route.fulfill({
        json: {
          events: url.searchParams.get('after') === '0' ? [
            {
              id: 'event-1',
              sequence: 1,
              receivedAt: '2026-09-03T12:00:00.000Z',
              method: 'POST',
              query: '',
              contentType: 'application/json',
              headers: { 'content-type': 'application/json' },
              headersTruncated: false,
              body: { encoding: 'utf-8', value: rawBody },
            },
            {
              id: 'event-2',
              sequence: 2,
              receivedAt: '2026-09-03T12:00:01.000Z',
              method: 'PUT',
              query: '',
              contentType: 'application/octet-stream',
              headers: { 'content-type': 'application/octet-stream' },
              headersTruncated: true,
              body: { encoding: 'base64', value: encodedBody },
            },
          ] : [],
          nextCursor: 1,
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      });
    }
    return route.abort();
  });

  await page.goto('/en/tools/webhook-inbox');
  await settleTool(page);
  await expect(page.getByRole('log', { name: 'Received requests' })).toHaveAttribute('aria-live', 'polite');
  await page.getByRole('button', { name: 'Create temporary inbox' }).click();
  const utf8Event = page.locator('.webhook-event').filter({ has: page.locator('summary', { hasText: 'POST' }) });
  await expect(utf8Event).toBeVisible();
  await utf8Event.locator('summary').click();
  await expect(utf8Event.getByRole('heading', { name: 'Raw UTF-8 request body (authoritative)' })).toBeVisible();
  const rawOutput = utf8Event.locator('.webhook-raw-body pre');
  await expect(rawOutput).toBeVisible();
  expect(await rawOutput.evaluate((node) => node.textContent)).toBe(rawBody);
  await expect(utf8Event.locator('.webhook-formatted-body pre')).toHaveText('{\n  "event": "ping",\n  "count": 2\n}');
  await expect(utf8Event.getByText(/Clipboard or textarea operations can normalize line endings/)).toBeVisible();
  await utf8Event.getByRole('button', { name: /Copy captured UTF-8 text/ }).click();
  expect(await page.evaluate(() => Reflect.get(window, '__copiedWebhookBody'))).toBe(rawBody);

  const binaryEvent = page.locator('.webhook-event').filter({ has: page.locator('summary', { hasText: 'PUT' }) });
  await binaryEvent.locator('summary').click();
  await expect(binaryEvent.getByRole('heading', { name: 'Captured body (Base64 representation)' })).toBeVisible();
  await expect(binaryEvent.getByRole('heading', { name: /authoritative/i })).toHaveCount(0);
  expect(await binaryEvent.locator('.webhook-encoded-body pre').evaluate((node) => node.textContent)).toBe(encodedBody);
  await expect(binaryEvent.getByText(/Decode the Base64 and use the resulting bytes/)).toBeVisible();
  await expect(binaryEvent.getByText('Some request headers were omitted because the per-event capture limit was reached.')).toBeVisible();
  await binaryEvent.getByRole('button', { name: /Copy Base64 text/ }).click();
  expect(await page.evaluate(() => Reflect.get(window, '__copiedWebhookBody'))).toBe(encodedBody);
});

test('deleting a webhook inbox aborts its poll and ignores a stale response', async ({ page }) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    const jsonResponse = (value: unknown): Response => new Response(JSON.stringify(value), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const requestUrl = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
      const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
      if (requestUrl.pathname === '/_portal/config') {
        return jsonResponse({ webhookInboxEnabled: true, dnsLookupEnabled: false, enabledServices: [], defaultLanguage: 'en' });
      }
      if (requestUrl.pathname === '/_portal/developer/webhook-inboxes' && method === 'POST') {
        return jsonResponse({
          inbox: {
            id: 'a'.repeat(32),
            receivePath: `/_portal/developer/webhooks/${'a'.repeat(32)}`,
            expiresAt: '2099-01-01T00:00:00.000Z',
          },
          readToken: 'b'.repeat(32),
        });
      }
      if (requestUrl.pathname.endsWith('/events') && method === 'GET') {
        Reflect.set(window, '__webhookPollStarted', true);
        init?.signal?.addEventListener('abort', () => { Reflect.set(window, '__webhookPollAborted', true); });
        return new Promise<Response>((resolve) => {
          Reflect.set(window, '__releaseWebhookPoll', () => resolve(jsonResponse({
            events: [{
              id: 'stale-event',
              sequence: 1,
              receivedAt: '2026-09-03T12:00:00.000Z',
              method: 'POST',
              query: '',
              contentType: 'text/plain',
              headers: {},
              headersTruncated: false,
              body: { encoding: 'utf-8', value: 'must not reappear' },
            }],
            nextCursor: 1,
            expiresAt: '2099-01-01T00:00:00.000Z',
          })));
        });
      }
      if (requestUrl.pathname === `/_portal/developer/webhook-inboxes/${'a'.repeat(32)}` && method === 'DELETE') {
        return jsonResponse({ deleted: true });
      }
      return originalFetch(input, init);
    };
  });

  await page.goto('/en/tools/webhook-inbox');
  await settleTool(page);
  await page.getByRole('button', { name: 'Create temporary inbox' }).click();
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__webhookPollStarted'))).toBe(true);
  await page.getByRole('button', { name: 'Delete inbox' }).click();
  await expect(page.getByRole('status')).toHaveText('Temporary inbox deleted.');
  await expect.poll(() => page.evaluate(() => Reflect.get(window, '__webhookPollAborted'))).toBe(true);
  await page.evaluate(() => {
    const release = Reflect.get(window, '__releaseWebhookPoll') as (() => void) | undefined;
    release?.();
  });
  await page.waitForTimeout(100);
  await expect(page.locator('.webhook-event')).toHaveCount(0);
  await expect(page.getByText('No requests received yet.')).toBeVisible();
  await expect(page.getByLabel('Webhook receive URL')).toHaveValue('');
  await expect(page.getByRole('status')).toHaveText('Temporary inbox deleted.');
});

test('network developer inputs enforce cheap character caps before parsing or encoding', async ({ page }) => {
  await page.route('**/_portal/config', async (route) => route.fulfill({
    json: {
      webhookInboxEnabled: true,
      dnsLookupEnabled: true,
      enabledServices: [],
      defaultLanguage: 'en',
    },
  }));

  await page.goto('/en/tools/http-request');
  await settleTool(page);
  const requestUrl = page.getByLabel('URL');
  const requestHeaders = page.getByLabel('Headers, one Name: value pair per line');
  const requestBody = page.getByLabel('Request body');
  await expect(requestUrl).toHaveAttribute('maxlength', '4096');
  await expect(requestHeaders).toHaveAttribute('maxlength', '65536');
  await expect(requestBody).toHaveAttribute('maxlength', '524288');
  await requestUrl.evaluate((element) => { (element as HTMLInputElement).value = `https://example.test/${'a'.repeat(4_097)}`; });
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('status')).toHaveText('The URL exceeds the browser safety limit.');
  await requestUrl.fill('https://example.test/');
  await requestHeaders.evaluate((element) => { (element as HTMLTextAreaElement).value = 'a'.repeat(65_537); });
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('status')).toHaveText('The request headers exceed the browser safety limit.');
  await requestHeaders.fill('');
  await page.getByLabel('Method').selectOption('POST');
  await page.evaluate(() => {
    Object.defineProperty(window, 'TextEncoder', {
      configurable: true,
      value: class {
        constructor() {
          document.documentElement.dataset.textEncoderStarted = 'true';
          throw new Error('TextEncoder should not start for oversized input.');
        }
      },
    });
  });
  await requestBody.evaluate((element) => { (element as HTMLTextAreaElement).value = 'a'.repeat(524_289); });
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('status')).toHaveText('The request body exceeds 512 KiB.');
  await expect(page.locator('html')).not.toHaveAttribute('data-text-encoder-started');

  await page.goto('/en/tools/http-headers');
  await settleTool(page);
  await expect(page.getByLabel('URL')).toHaveAttribute('maxlength', '4096');

  await page.goto('/en/tools/websocket');
  await settleTool(page);
  await expect(page.getByLabel('WebSocket URL')).toHaveAttribute('maxlength', '4096');
  await expect(page.getByLabel('Subprotocols, separated by commas (optional)')).toHaveAttribute('maxlength', '2048');
  await expect(page.getByLabel('Text message')).toHaveAttribute('maxlength', '65536');
  await page.getByLabel('WebSocket URL').fill('wss://example.test/socket');
  await page.getByLabel('Subprotocols, separated by commas (optional)').evaluate((element) => {
    (element as HTMLInputElement).value = 'a'.repeat(2_049);
  });
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('The WebSocket protocols exceed the browser safety limit.');

  await page.goto('/en/tools/sse');
  await settleTool(page);
  const streamUrl = page.getByLabel('Event-stream URL');
  await expect(streamUrl).toHaveAttribute('maxlength', '4096');
  await streamUrl.evaluate((element) => { (element as HTMLInputElement).value = `https://example.test/${'a'.repeat(4_097)}`; });
  await page.getByRole('button', { name: 'Connect', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('The event-stream URL exceeds the browser safety limit.');

  await page.goto('/en/tools/dns-lookup');
  await settleTool(page);
  const hostname = page.getByLabel('Hostname');
  await expect(hostname).toHaveAttribute('maxlength', '253');
  await hostname.evaluate((element) => { (element as HTMLInputElement).value = 'a'.repeat(254); });
  let dnsRequests = 0;
  page.on('request', (request) => { if (request.url().endsWith('/_portal/developer/dns')) dnsRequests += 1; });
  await page.getByRole('button', { name: 'Look up records' }).click();
  await expect(page.getByRole('status')).toHaveText('The hostname exceeds the browser safety limit.');
  expect(dnsRequests).toBe(0);

  await page.route('**/_portal/developer/webhook-inboxes', async (route) => route.fulfill({
    json: {
      inbox: {
        id: 'a'.repeat(129),
        receivePath: '/_portal/developer/webhooks/example',
        expiresAt: '2099-01-01T00:00:00.000Z',
      },
      readToken: 'b'.repeat(32),
    },
  }));
  await page.goto('/en/tools/webhook-inbox');
  await settleTool(page);
  await expect(page.getByLabel('Webhook receive URL')).toHaveAttribute('maxlength', '4096');
  await expect(page.getByText(/short-lived write capability/)).toBeVisible();
  await expect(page.getByText(/edge proxy may log its path/)).toBeVisible();
  await page.getByRole('button', { name: 'Create temporary inbox' }).click();
  await expect(page.getByRole('status')).toHaveText('The server returned invalid inbox details.');
  await expect(page.getByLabel('Webhook receive URL')).toHaveValue('');

  await page.goto('/es/herramientas/buzon-webhook');
  await settleTool(page);
  await expect(page.getByText(/permiso temporal de escritura/)).toBeVisible();
  await expect(page.getByText(/proxy perimetral puede registrar su ruta/)).toBeVisible();
});

test('temporary webhook inbox creates, receives, polls, and deletes through the production server', async ({ page, request }) => {
  test.skip(!runDeveloperServerTests, 'Set E2E_DEVELOPER_SERVER=1 with a disposable local production server.');

  await page.goto('/en/tools/webhook-inbox');
  await settleTool(page);
  await page.getByRole('button', { name: 'Create temporary inbox' }).click();
  await expect(page.getByRole('status')).toHaveText('Temporary inbox created.');
  await expect(page.getByRole('button', { name: 'Copy receive URL' })).toBeFocused();

  const receiveUrl = await page.getByLabel('Webhook receive URL').inputValue();
  expect(receiveUrl).toMatch(/\/_portal\/developer\/webhooks\/[A-Za-z0-9_-]{32}$/);
  const received = await request.post(receiveUrl, {
    data: { event: 'release.ready', sequence: 7 },
    headers: { 'x-utilibre-signature': 'fixture-signature' },
  });
  expect(received.status()).toBe(202);

  const event = page.locator('.webhook-event').first();
  await expect(event).toBeVisible({ timeout: 5_000 });
  await event.locator('summary').click();
  await expect(event).toContainText('POST');
  await expect(event).toContainText('x-utilibre-signature: fixture-signature');
  await expect(event).toContainText('"event": "release.ready"');

  await page.getByRole('button', { name: 'Delete inbox' }).click();
  await expect(page.getByRole('status')).toHaveText('Temporary inbox deleted.');
  await expect(page.getByRole('button', { name: 'Create temporary inbox' })).toBeFocused();
  await expect(page.getByLabel('Webhook receive URL')).toHaveValue('');
  const afterDelete = await request.post(receiveUrl, { data: { event: 'too-late' } });
  expect(afterDelete.status()).toBe(404);
});

test('DNS rejects a non-public hostname before contacting a resolver', async ({ page }) => {
  test.skip(!runDeveloperServerTests, 'Set E2E_DEVELOPER_SERVER=1 with a disposable local production server.');

  await page.goto('/en/tools/dns-lookup');
  await settleTool(page);
  await page.getByLabel('Hostname').fill('localhost');
  const responsePromise = page.waitForResponse((response) => response.url().endsWith('/_portal/developer/dns'));
  await page.getByRole('button', { name: 'Look up records' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: 'invalid_hostname' });
  await expect(page.getByRole('status')).toHaveText('Enter a public hostname, such as example.org.');
});
