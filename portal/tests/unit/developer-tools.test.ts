import { describe, expect, it } from 'vitest';
import {
  OpenApiYamlParserRequiredError,
  analyzeRegexRisk,
  bytesToHex,
  curlToHttpRequest,
  decodeWebhookPayload,
  decodeJwt,
  generateUuidV4,
  hashText,
  hmacSign,
  httpRequestToCurl,
  inspectJwtClaims,
  inspectUuid,
  matchesCron,
  nextCronRuns,
  parseCronExpression,
  parseOpenApiDocument,
  parseTimestamp,
  runRegex,
  searchNextCronRuns,
  signJwt,
  summarizeOpenApi,
  timestampFromDate,
  verifyJwtHmac,
  verifyWebhookHmac,
} from '../../src/tools/developer';
import {
  DeveloperValidationError,
  developerValidationText,
  localizedError,
} from '../../src/tools/developer-ui-helpers';

describe('developer validation localization', () => {
  it('maps typed validation errors bilingually without exposing raw English in Spanish', () => {
    const error = new DeveloperValidationError('requestBody', 'The request body exceeds an internal limit.');
    expect(localizedError('en', error, 'fallback')).toBe('The request body exceeds an internal limit.');
    expect(localizedError('es', error, 'fallback')).toBe('El cuerpo de la solicitud no puede superar 512 KiB.');
    expect(developerValidationText('es', 'timestamp')).toBe('Ingresa una marca de tiempo o fecha válida de hasta 256 caracteres.');
    expect(localizedError('es', new Error('Internal English detail'), 'Mensaje seguro.')).toBe('Mensaje seguro.');
  });
});

describe('local JWT and HMAC tools', () => {
  it('signs, decodes, and verifies each supported JWT HMAC algorithm locally', async () => {
    for (const algorithm of ['HS256', 'HS384', 'HS512'] as const) {
      const token = await signJwt({ sub: '123', exp: 2_000_000_000 }, 'correct horse', algorithm);
      const decoded = decodeJwt(token);
      expect(decoded.header).toMatchObject({ alg: algorithm, typ: 'JWT' });
      expect(decoded.payload).toEqual({ sub: '123', exp: 2_000_000_000 });
      expect(await verifyJwtHmac(token, 'correct horse', algorithm)).toEqual({ valid: true, algorithm });
      expect(await verifyJwtHmac(token, 'wrong', algorithm)).toMatchObject({ valid: false, reason: 'invalid-signature' });
    }
  });

  it('never treats decoding as verification and describes numeric-date claims', async () => {
    const token = await signJwt({ iss: 'issuer', aud: ['web'], exp: 100, nbf: 300 }, 'secret');
    const claims = inspectJwtClaims(decodeJwt(token).payload, 200);
    expect(claims.find(({ name }) => name === 'exp')).toMatchObject({ kind: 'numeric-date', timeState: 'past' });
    expect(claims.find(({ name }) => name === 'nbf')).toMatchObject({ kind: 'numeric-date', timeState: 'future' });
    expect(claims.find(({ name }) => name === 'iss')).toMatchObject({ kind: 'issuer' });
    expect(await verifyJwtHmac(token, 'secret', 'HS512')).toMatchObject({ valid: false, reason: 'algorithm-mismatch' });
    expect(decodeJwt(token).payload).toBeDefined();
  });

  it('verifies webhook signatures in hex and Base64 with an optional algorithm prefix', async () => {
    const hex = 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8';
    const payload = 'The quick brown fox jumps over the lazy dog';
    await expect(verifyWebhookHmac(payload, `sha256=${hex}`, 'key', 'SHA-256', 'hex'))
      .resolves.toEqual({ valid: true, prefix: 'sha256' });
    await expect(verifyWebhookHmac(payload, hex, 'key', 'SHA-256', 'hex'))
      .resolves.toEqual({ valid: true, prefix: null });
    await expect(verifyWebhookHmac(payload, `sha512=${hex}`, 'key', 'SHA-256', 'hex'))
      .resolves.toEqual({ valid: false, prefix: 'sha512' });
    await expect(verifyWebhookHmac(payload, '97yD9DBThCSxMpjmqm+xQ+9NWaFJRhdZl0edvC0aPNg=', 'key', 'SHA-256', 'base64'))
      .resolves.toEqual({ valid: true, prefix: null });
  });

  it('strictly decodes bounded Base64 webhook payload bytes before verification', async () => {
    const payloadBytes = decodeWebhookPayload('AA0K/w==', 'base64');
    const signature = bytesToHex(await hmacSign(payloadBytes, 'key', 'SHA-256'));
    await expect(verifyWebhookHmac(payloadBytes, signature, 'key', 'SHA-256', 'hex'))
      .resolves.toEqual({ valid: true, prefix: null });
    await expect(verifyWebhookHmac('AA0K/w==', signature, 'key', 'SHA-256', 'hex'))
      .resolves.toEqual({ valid: false, prefix: null });
    expect(() => decodeWebhookPayload('AA0K/w==\n', 'base64')).toThrow(/whitespace/);
    expect(() => decodeWebhookPayload('AB==', 'base64')).toThrow(/canonical padded form/);
    expect(() => decodeWebhookPayload('AAECAwQ=', 'base64', 4)).toThrow(/exceeds 4 bytes/);
  });
});

describe('safe HTTP and curl conversion', () => {
  it('turns an origin-form HTTP request into a quoted curl command', () => {
    const raw = [
      'POST /v1/items?q=test HTTP/1.1',
      'Host: api.example.test',
      'Content-Type: application/json',
      'Content-Length: 17',
      '',
      '{"name":"O\'Neil"}',
    ].join('\r\n');
    const command = httpRequestToCurl(raw);
    expect(command).toContain("--url 'https://api.example.test/v1/items?q=test'");
    expect(command).toContain("--header 'Content-Type: application/json'");
    expect(command).not.toContain('Content-Length');
    expect(command).toContain("O'\"'\"'Neil");
  });

  it('turns a limited curl command into a raw HTTP request', () => {
    const request = curlToHttpRequest("curl -s -X POST 'https://api.example.test/v1/items?q=a' -H 'Content-Type: application/json' --data-raw '{\"ok\":true}'");
    expect(request).toContain('POST /v1/items?q=a HTTP/1.1\r\n');
    expect(request).toContain('Host: api.example.test\r\n');
    expect(request).toContain('Content-Type: application/json\r\n');
    expect(request.endsWith('\r\n\r\n{"ok":true}')).toBe(true);
  });

  it('rejects shell operators, credential-bearing URLs, file inputs, and ambiguous hosts', () => {
    expect(() => curlToHttpRequest('curl https://example.test; id')).toThrow(/Shell operators/);
    expect(() => curlToHttpRequest("curl --data-binary '@secret.txt' https://example.test")).toThrow(/File-backed/);
    expect(() => curlToHttpRequest('curl -K secrets.txt https://example.test')).toThrow(/not accepted/);
    expect(() => curlToHttpRequest("curl 'https://user:secret@example.test/'")).toThrow(/credentials/);
    expect(() => httpRequestToCurl('GET https://one.example/ HTTP/1.1\r\nHost: two.example\r\n\r\n')).toThrow(/do not match/);
    expect(() => httpRequestToCurl('GET / HTTP/1.1\r\nHost: example.test?other.example\r\n\r\n')).toThrow(/Host header/);
  });
});

describe('local OpenAPI inspection', () => {
  const api = {
    openapi: '3.1.0',
    info: { title: 'Small API', version: '1.0.0' },
    servers: [{ url: 'https://api.example.test' }],
    paths: {
      '/pets': {
        parameters: [{ name: 'tenant', in: 'header' }],
        get: {
          summary: 'List pets',
          tags: ['pets'],
          responses: { 200: { description: 'OK' } },
        },
        post: {
          operationId: 'createPet',
          requestBody: { $ref: '#/components/requestBodies/Pet' },
          responses: { 201: { description: 'Created' } },
        },
      },
    },
    components: { schemas: { Remote: { $ref: 'https://schemas.example.test/remote.yaml#/Remote' } } },
  };

  it('parses JSON and extracts operations without resolving references', () => {
    const summary = summarizeOpenApi(parseOpenApiDocument(JSON.stringify(api)));
    expect(summary).toMatchObject({ format: 'openapi-3', specificationVersion: '3.1.0', title: 'Small API' });
    expect(summary.endpoints).toHaveLength(2);
    expect(summary.endpoints[0]).toMatchObject({ method: 'GET', path: '/pets', parameterCount: 1 });
    expect(summary.references).toEqual([
      { value: '#/components/requestBodies/Pet', kind: 'local' },
      { value: 'https://schemas.example.test/remote.yaml#/Remote', kind: 'remote' },
    ]);
  });

  it('requires an explicitly supplied local YAML parser and accepts its result', () => {
    expect(() => parseOpenApiDocument('openapi: 3.1.0')).toThrow(OpenApiYamlParserRequiredError);
    const parsed = parseOpenApiDocument('openapi: 3.1.0', { yamlParser: () => api });
    expect(summarizeOpenApi(parsed).endpoints).toHaveLength(2);
  });

  it('enforces the document limit in UTF-8 bytes rather than JavaScript characters', () => {
    const multibyteJson = '{"é":1}';
    expect(multibyteJson).toHaveLength(7);
    expect(new TextEncoder().encode(multibyteJson)).toHaveLength(8);
    expect(() => parseOpenApiDocument(multibyteJson, { maxSourceLength: 7 })).toThrow(/too large/);
    expect(parseOpenApiDocument(multibyteJson, { maxSourceLength: 8 })).toEqual({ é: 1 });
  });

  it('caps rendered endpoint and reference summaries', () => {
    const summary = summarizeOpenApi(parseOpenApiDocument(JSON.stringify(api)), { maxEndpoints: 1, maxReferences: 1 });
    expect(summary).toMatchObject({ endpointCount: 2, endpointsTruncated: true, referencesTruncated: true });
    expect(summary.endpoints).toHaveLength(1);
    expect(summary.references).toHaveLength(1);
  });
});

describe('local text, regex, cron, timestamp, and UUID helpers', () => {
  it('hashes UTF-8 text using Web Crypto', async () => {
    await expect(hashText('abc', 'SHA-1')).resolves.toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    await expect(hashText('abc', 'SHA-256')).resolves.toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('returns bounded regex matches, captures, groups, and risk warnings', () => {
    const result = runRegex('(?<word>[a-z]+)-(\\d+)', 'gi', 'one-1 two-22');
    expect(result.matches).toEqual([
      { index: 0, value: 'one-1', captures: ['one', '1'], groups: { word: 'one' } },
      { index: 6, value: 'two-22', captures: ['two', '22'], groups: { word: 'two' } },
    ]);
    expect(runRegex('a', 'g', 'aaaa', { maxMatches: 2 }).truncated).toBe(true);
    expect(analyzeRegexRisk('(a+)+$')).toContain('nested-quantifier');
    expect(() => runRegex('a', 'gg', 'a')).toThrow(/Duplicate/);
  });

  it('parses five-field cron expressions and applies POSIX day matching in UTC', () => {
    const weekdayMorning = parseCronExpression('30 8 * * MON-FRI');
    expect(matchesCron(weekdayMorning, new Date('2026-09-04T08:30:00.000Z'))).toBe(true);
    expect(matchesCron(weekdayMorning, new Date('2026-09-05T08:30:00.000Z'))).toBe(false);
    expect(nextCronRuns(weekdayMorning, new Date('2026-09-04T08:30:01.000Z'), { count: 2 }))
      .toEqual([new Date('2026-09-07T08:30:00.000Z'), new Date('2026-09-08T08:30:00.000Z')]);
    const eitherDay = parseCronExpression('0 0 1 * MON');
    expect(matchesCron(eitherDay, new Date('2026-09-07T00:00:00.000Z'))).toBe(true);
    expect(matchesCron(eitherDay, new Date('2026-10-01T00:00:00.000Z'))).toBe(true);
    const steppedDayOfMonth = parseCronExpression('0 0 */2 * MON');
    expect(steppedDayOfMonth.dayOfMonth.wildcard).toBe(false);
    expect(matchesCron(steppedDayOfMonth, new Date('2026-09-03T00:00:00.000Z'))).toBe(true);
    expect(matchesCron(steppedDayOfMonth, new Date('2026-09-04T00:00:00.000Z'))).toBe(false);
    expect(searchNextCronRuns(parseCronExpression('0 0 29 2 *'), new Date('2100-03-01T00:00:00.000Z'), {
      count: 1,
      maxSearchMinutes: 60,
    })).toMatchObject({ runs: [], complete: false, searchedMinutes: 60 });
  });

  it('converts integer timestamps without losing sub-millisecond source precision', () => {
    expect(parseTimestamp('1700000000')).toMatchObject({ detectedUnit: 'seconds', iso: '2023-11-14T22:13:20.000Z' });
    expect(parseTimestamp('1700000000123')).toMatchObject({ detectedUnit: 'milliseconds', unixMilliseconds: '1700000000123' });
    expect(parseTimestamp('1700000000123456')).toMatchObject({ detectedUnit: 'microseconds', unixMicroseconds: '1700000000123456' });
    expect(timestampFromDate(new Date('1970-01-01T00:00:01.250Z')).unixSeconds).toBe('1.25');
  });

  it('generates and inspects UUIDs, including nil and URN forms', () => {
    const generated = generateUuidV4(3);
    expect(new Set(generated).size).toBe(3);
    for (const value of generated) expect(inspectUuid(value)).toMatchObject({ valid: true, version: 4, variant: 'rfc-4122' });
    expect(inspectUuid('urn:uuid:550e8400-e29b-41d4-a716-446655440000')).toMatchObject({ valid: true, version: 4 });
    expect(inspectUuid('00000000-0000-0000-0000-000000000000')).toMatchObject({ valid: true, kind: 'nil', version: null });
    expect(inspectUuid('not-a-uuid').valid).toBe(false);
  });
});
