import type { Language } from '../i18n';
import { actionButton, append, disableActionButton, element, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';
import {
  curlToHttpRequest,
  decodeWebhookPayload,
  decodeJwt,
  generateUuidV4,
  hashText,
  httpRequestToCurl,
  inspectJwtClaims,
  inspectUuid,
  parseOpenApiDocument,
  parseTimestamp,
  signJwt,
  summarizeOpenApi,
  verifyJwtHmac,
  verifyWebhookHmac,
  WEBHOOK_BASE64_MAX_CHARACTERS,
  WEBHOOK_PAYLOAD_MAX_BYTES,
  type HashEncoding,
  type HmacAlgorithm,
  type JsonObject,
  type JwtClaimInspection,
  type JwtHmacAlgorithm,
  type RegexWorkerResponse,
  type SignatureEncoding,
  type TextHashAlgorithm,
  type WebhookPayloadEncoding,
} from './developer/index';
import {
  actionRow,
  codeBlock,
  copyOutputButton,
  DeveloperValidationError,
  definitionList,
  developerTranslate,
  developerValidationText,
  localizedError,
  notice,
  outputArea,
  selectField,
  textareaField,
  textField,
} from './developer-ui-helpers';

export type LocalDeveloperToolId =
  | 'webhook-signature'
  | 'openapi'
  | 'jwt-inspect'
  | 'jwt-generate'
  | 'http-curl'
  | 'regex'
  | 'cron'
  | 'timestamp'
  | 'text-hashes'
  | 'uuid';

const REGEX_MAX_PATTERN_CHARACTERS = 512;
const REGEX_MAX_FLAGS_CHARACTERS = 8;
const REGEX_MAX_TEXT_CHARACTERS = 50_000;
const CRON_MAX_EXPRESSION_CHARACTERS = 1_024;
const TIMESTAMP_MAX_CHARACTERS = 256;
const OPENAPI_MAX_BYTES = 2 * 1_024 * 1_024;

export function renderLocalDeveloperTool(id: LocalDeveloperToolId, language: Language, t: Translate): HTMLElement {
  if (id === 'webhook-signature') return renderWebhookSignature(language);
  if (id === 'openapi') return renderOpenApi(language);
  if (id === 'jwt-inspect') return renderJwtInspector(language);
  if (id === 'jwt-generate') return renderJwtGenerator(language, t);
  if (id === 'http-curl') return renderHttpCurl(language, t);
  if (id === 'regex') return renderRegex(language);
  if (id === 'cron') return renderCron(language);
  if (id === 'timestamp') return renderTimestamp(language);
  if (id === 'text-hashes') return renderTextHashes(language, t);
  return renderUuid(language, t);
}

function renderWebhookSignature(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const payload = textareaField(c('payload'), 9);
  const secret = textField(c('secret'), { type: 'password', autocomplete: 'off' });
  const signature = textareaField(c('signature'), 3);
  const payloadEncoding = selectField(c('payloadEncoding'), [
    { value: 'utf-8', label: c('payloadUtf8') },
    { value: 'base64', label: c('payloadBase64') },
  ]);
  payload.textarea.maxLength = WEBHOOK_PAYLOAD_MAX_BYTES;
  secret.input.maxLength = 65_536;
  signature.textarea.maxLength = 4_096;
  const algorithm = selectField(c('algorithm'), ['SHA-256', 'SHA-384', 'SHA-512'].map((value) => ({ value, label: `HMAC ${value}` })));
  const encoding = selectField(c('encoding'), [{ value: 'hex', label: 'Hex' }, { value: 'base64', label: 'Base64' }]);
  const verify = actionButton(c('verify'));
  const status = statusRegion(c('ready'));
  payloadEncoding.select.addEventListener('change', () => {
    payload.textarea.maxLength = payloadEncoding.select.value === 'base64'
      ? WEBHOOK_BASE64_MAX_CHARACTERS
      : WEBHOOK_PAYLOAD_MAX_BYTES;
  });
  verify.addEventListener('click', async () => {
    const finishAction = disableActionButton(verify);
    setStatus(status, c('working'));
    try {
      if (secret.input.value.length > 65_536 || signature.textarea.value.length > 4_096) {
        throw new DeveloperValidationError('webhookSignature', 'The secret or signature exceeds the browser safety limit.');
      }
      const payloadBytes = decodeWebhookPayload(payload.textarea.value, payloadEncoding.select.value as WebhookPayloadEncoding);
      const result = await verifyWebhookHmac(
        payloadBytes,
        signature.textarea.value,
        secret.input.value,
        algorithm.select.value as HmacAlgorithm,
        encoding.select.value as SignatureEncoding,
      );
      setStatus(status, result.valid ? c('signatureValid') : c('signatureInvalid'), result.valid ? 'success' : 'error');
    } catch (error) {
      setStatus(status, localizedError(language, error, developerValidationText(language, 'webhookSignature')), 'error');
    } finally { finishAction(); }
  });
  const options = element('div', 'tool-grid');
  append(options, payloadEncoding.wrapper, algorithm.wrapper, encoding.wrapper);
  append(panel, notice(c('localBoundary')), payload.wrapper, secret.wrapper, signature.wrapper, options, actionRow(verify), status, notice(c('hmacLimit')));
  return panel;
}

function renderJwtInspector(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const token = textareaField(c('jwtToken'), 7);
  const secret = textField(c('jwtSecret'), { type: 'password', autocomplete: 'off' });
  token.textarea.maxLength = 262_144;
  secret.input.maxLength = 65_536;
  const decode = actionButton(c('jwtDecode'));
  const verify = actionButton(c('jwtVerify'), true);
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');

  const inspect = async (verifySignature: boolean): Promise<void> => {
    if (token.textarea.value.length > 262_144) return setStatus(status, developerValidationText(language, 'jwt'), 'error');
    const trigger = verifySignature ? verify : decode;
    const sibling = verifySignature ? decode : verify;
    const finishAction = disableActionButton(trigger);
    sibling.disabled = true;
    setStatus(status, c('working'));
    try {
      const decoded = decodeJwt(token.textarea.value);
      const header = codeBlock(c('jwtHeader'));
      header.output.textContent = JSON.stringify(decoded.header, null, 2);
      const claims = codeBlock(c('jwtClaims'));
      claims.output.textContent = JSON.stringify(decoded.payload, null, 2);
      const claimDetails = inspectJwtClaims(decoded.payload);
      const renderedClaims = claimDetails.slice(0, 500);
      const claimSection = element('section', 'developer-result');
      claimSection.append(element('h2', '', `${c('jwtClaimTable')} (${claimDetails.length}${claimDetails.length > renderedClaims.length ? ` · ${c('truncated')}` : ''})`));
      const table = dataTable([c('claim'), c('value'), c('interpretation')]);
      for (const claim of renderedClaims) {
        appendTableRow(table, [claim.name, printable(claim.value), localizedJwtClaim(claim, c)]);
      }
      claimSection.append(table);
      result.replaceChildren(header.wrapper, claims.wrapper, claimSection);
      if (verifySignature) {
        if (!secret.input.value) throw new Error('Enter the HMAC secret to verify this token.');
        const verified = await verifyJwtHmac(token.textarea.value, secret.input.value);
        setStatus(status, verified.valid ? c('jwtVerified') : c('jwtNotVerified'), verified.valid ? 'success' : 'error');
      } else {
        setStatus(status, c('done'), 'success');
      }
    } catch (error) {
      result.replaceChildren();
      setStatus(status, localizedError(language, error, developerValidationText(language, 'jwt')), 'error');
    } finally {
      sibling.disabled = false;
      finishAction();
    }
  };
  decode.addEventListener('click', () => { void inspect(false); });
  verify.addEventListener('click', () => { void inspect(true); });
  append(panel, notice(c('localBoundary')), token.wrapper, secret.wrapper, actionRow(decode, verify), status, notice(c('jwtWarning')), result);
  return panel;
}

function renderJwtGenerator(language: Language, t: Translate): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const payload = textareaField(c('jwtPayload'), 9, '{}');
  const header = textareaField(c('jwtHeaderInput'), 5, '{}');
  const secret = textField(c('secret'), { type: 'password', autocomplete: 'off' });
  payload.textarea.maxLength = 262_144;
  header.textarea.maxLength = 65_536;
  secret.input.maxLength = 65_536;
  const algorithm = selectField(c('algorithm'), ['HS256', 'HS384', 'HS512'].map((value) => ({ value, label: value })));
  const generate = actionButton(c('jwtGenerate'));
  const output = outputArea(c('output'), 8);
  const status = statusRegion(c('ready'));
  const copy = copyOutputButton(output.output, status, c, t);
  generate.addEventListener('click', async () => {
    const finishAction = disableActionButton(generate);
    setStatus(status, c('working'));
    try {
      const claims = parseJsonObject(payload.textarea.value);
      const additionalHeader = parseJsonObject(header.textarea.value);
      if (!secret.input.value || secret.input.value.length > 65_536) throw new Error('Enter an HMAC secret no longer than 65,536 characters.');
      output.output.value = await signJwt(claims, secret.input.value, algorithm.select.value as JwtHmacAlgorithm, additionalHeader);
      copy.disabled = false;
      setStatus(status, c('jwtGenerated'), 'success');
    } catch (error) {
      output.output.value = '';
      copy.disabled = true;
      setStatus(status, localizedError(language, error, developerValidationText(language, 'jwt')), 'error');
    } finally { finishAction(); }
  });
  append(panel, notice(c('localBoundary')), payload.wrapper, header.wrapper, secret.wrapper, algorithm.wrapper, actionRow(generate, copy), output.wrapper, status, notice(c('jwtWarning')));
  return panel;
}

function renderOpenApi(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const file = textField(c('openApiFile'), { type: 'file' });
  file.input.accept = '.json,.yaml,.yml,application/json,application/yaml,text/yaml';
  const source = textareaField(c('openApiDocument'), 16);
  source.textarea.maxLength = OPENAPI_MAX_BYTES;
  const inspect = actionButton(c('openApiInspect'));
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');
  file.input.addEventListener('change', async () => {
    const selected = file.input.files?.[0];
    if (!selected) return;
    if (selected.size > OPENAPI_MAX_BYTES) {
      file.input.value = '';
      return setStatus(status, developerValidationText(language, 'openApi'), 'error');
    }
    source.textarea.value = await selected.text();
    setStatus(status, c('ready'));
  });
  inspect.addEventListener('click', async () => {
    const finishAction = disableActionButton(inspect);
    setStatus(status, c('working'));
    try {
      const { parse: parseYaml } = await import('yaml');
      const document = parseOpenApiDocument(source.textarea.value, { yamlParser: (value) => parseYaml(value, { maxAliasCount: 50 }) });
      const summary = summarizeOpenApi(document);
      const overview = element('section', 'developer-result');
      overview.append(element('h2', '', c('output')), definitionList([
        [c('openApiTitle'), summary.title ?? '—'],
        [c('openApiVersion'), `${summary.format} · ${summary.specificationVersion}`],
        [c('openApiApiVersion'), summary.apiVersion ?? '—'],
        [c('openApiServers'), summary.serverUrls.join('\n') || '—'],
        [c('openApiRefs'), summary.references.length
          ? `${summary.references.map((reference) => `${reference.kind === 'local' ? c('openApiLocalRef') : c('openApiRemoteRef')}: ${reference.value}`).join('\n')}${summary.referencesTruncated ? `\n… ${c('truncated')}` : ''}`
          : '—'],
      ]));
      const endpoints = element('section', 'developer-result');
      endpoints.append(element('h2', '', `${c('openApiEndpoints')} (${summary.endpointCount}${summary.endpointsTruncated ? ` · ${c('truncated')}` : ''})`));
      if (summary.endpoints.length === 0) endpoints.append(element('p', 'notice', c('openApiNoEndpoints')));
      else {
        const table = dataTable([c('endpointMethod'), c('endpointPath'), c('endpointSummary')]);
        for (const endpoint of summary.endpoints) appendTableRow(table, [endpoint.method, endpoint.path, endpoint.summary ?? endpoint.operationId ?? '—']);
        endpoints.append(table);
      }
      result.replaceChildren(overview, endpoints);
      setStatus(status, c('done'), 'success');
    } catch (error) {
      result.replaceChildren();
      setStatus(status, localizedError(language, error, developerValidationText(language, 'openApi')), 'error');
    } finally { finishAction(); }
  });
  append(panel, notice(c('localBoundary')), file.wrapper, source.wrapper, actionRow(inspect), status, notice(c('openApiLimit')), result);
  return panel;
}

function renderHttpCurl(language: Language, t: Translate): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const direction = selectField(c('conversionDirection'), [
    { value: 'http-curl', label: c('rawHttpToCurl') },
    { value: 'curl-http', label: c('curlToRawHttp') },
  ]);
  const source = textareaField(c('input'), 13);
  const output = outputArea(c('output'), 13);
  const convert = actionButton(c('convert'));
  const status = statusRegion(c('ready'));
  const copy = copyOutputButton(output.output, status, c, t);
  convert.addEventListener('click', () => {
    try {
      output.output.value = direction.select.value === 'http-curl'
        ? httpRequestToCurl(source.textarea.value)
        : curlToHttpRequest(source.textarea.value);
      copy.disabled = false;
      setStatus(status, c('done'), 'success');
    } catch (error) {
      output.output.value = '';
      copy.disabled = true;
      setStatus(status, localizedError(language, error, developerValidationText(language, 'httpCurl')), 'error');
    }
  });
  append(panel, notice(c('localBoundary')), direction.wrapper, source.wrapper, actionRow(convert, copy), output.wrapper, status, notice(c('curlLimit')));
  return panel;
}

function renderRegex(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const pattern = textField(c('regexPattern'));
  const flags = textField(c('regexFlags'), { value: 'gu' });
  const input = textareaField(c('regexText'), 12);
  pattern.input.maxLength = REGEX_MAX_PATTERN_CHARACTERS;
  flags.input.maxLength = REGEX_MAX_FLAGS_CHARACTERS;
  input.textarea.maxLength = REGEX_MAX_TEXT_CHARACTERS;
  const run = actionButton(c('regexTest'));
  const status = statusRegion(c('ready'));
  const result = codeBlock(c('regexMatches'));
  run.addEventListener('click', async () => {
    const finishAction = disableActionButton(run);
    result.output.textContent = '';
    setStatus(status, c('working'));
    try {
      if (pattern.input.value.length > REGEX_MAX_PATTERN_CHARACTERS
        || flags.input.value.length > REGEX_MAX_FLAGS_CHARACTERS
        || input.textarea.value.length > REGEX_MAX_TEXT_CHARACTERS) {
        throw new DeveloperValidationError('regex', 'The regular-expression input exceeds the browser safety limit.');
      }
      const response = await runRegexWorker(pattern.input.value, flags.input.value, input.textarea.value);
      if (!response.ok) throw new Error(response.error);
      result.output.textContent = response.result.matches.length
        ? response.result.matches.map((match, index) => `${index + 1}. [${match.index}] ${JSON.stringify(match.value)}${match.captures.length ? `\n   ${c('regexCaptures')}: ${JSON.stringify(match.captures)}` : ''}`).join('\n')
        : c('regexNoMatch');
      if (response.result.truncated) result.output.textContent += '\n…';
      setStatus(status, c('done'), 'success');
    } catch (error) {
      setStatus(status, error instanceof RegexTimeoutError ? c('regexTimedOut') : localizedError(language, error, developerValidationText(language, 'regex')), 'error');
    } finally { finishAction(); }
  });
  append(panel, notice(c('localBoundary')), pattern.wrapper, flags.wrapper, input.wrapper, actionRow(run), status, notice(c('regexLimit')), result.wrapper);
  return panel;
}

function renderCron(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const expression = textField(c('cronExpression'), { value: '0 9 * * 1-5', placeholder: 'minute hour day month weekday' });
  expression.input.maxLength = CRON_MAX_EXPRESSION_CHARACTERS;
  const preview = actionButton(c('cronPreview'));
  const status = statusRegion(c('ready'));
  const result = codeBlock(c('cronTimes'));
  preview.addEventListener('click', async () => {
    const finishAction = disableActionButton(preview);
    result.output.textContent = '';
    setStatus(status, c('working'));
    try {
      if (expression.input.value.length > CRON_MAX_EXPRESSION_CHARACTERS) {
        throw new DeveloperValidationError('cron', 'The cron expression exceeds the browser safety limit.');
      }
      const response = await runCronWorker(expression.input.value);
      result.output.textContent = response.dates.map((iso, index) => {
        const date = new Date(iso);
        return `${index + 1}. ${iso}\n   ${date.toLocaleString(language === 'es' ? 'es' : 'en')}`;
      }).join('\n');
      if (!response.complete) result.output.textContent += `${result.output.textContent ? '\n\n' : ''}${c('cronHorizon')}`;
      setStatus(status, response.complete ? c('done') : c('cronHorizon'), response.complete ? 'success' : 'normal');
    } catch (error) {
      setStatus(status, error instanceof CronTimeoutError ? developerValidationText(language, 'cron') : localizedError(language, error, developerValidationText(language, 'cron')), 'error');
    } finally { finishAction(); }
  });
  append(panel, notice(c('localBoundary')), expression.wrapper, actionRow(preview), status, notice(c('cronZone')), result.wrapper);
  return panel;
}

function renderTimestamp(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const input = textField(c('timestampValue'), { placeholder: '1704067200 or 2024-01-01T00:00:00Z' });
  input.input.maxLength = TIMESTAMP_MAX_CHARACTERS;
  const convert = actionButton(c('timestampConvert'));
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');
  convert.addEventListener('click', () => {
    try {
      if (input.input.value.length > TIMESTAMP_MAX_CHARACTERS) {
        throw new DeveloperValidationError('timestamp', 'The timestamp exceeds the browser safety limit.');
      }
      const parsed = parseTimestamp(input.input.value);
      result.replaceChildren(definitionList([
        [c('timestampIso'), parsed.iso],
        [c('timestampLocal'), parsed.date.toLocaleString(language === 'es' ? 'es' : 'en')],
        [c('timestampSeconds'), parsed.unixSeconds],
        [c('timestampMilliseconds'), parsed.unixMilliseconds],
      ]));
      setStatus(status, c('done'), 'success');
    } catch (error) {
      result.replaceChildren();
      setStatus(status, localizedError(language, error, developerValidationText(language, 'timestamp')), 'error');
    }
  });
  append(panel, notice(c('localBoundary')), input.wrapper, actionRow(convert), status, notice(c('timestampHelp')), result);
  return panel;
}

function renderTextHashes(language: Language, t: Translate): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const input = textareaField(c('textToHash'), 10);
  input.textarea.maxLength = 2_097_152;
  const algorithm = selectField(c('algorithm'), ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'].map((value) => ({ value, label: value })));
  const encoding = selectField(c('hashEncoding'), [{ value: 'hex', label: 'Hex' }, { value: 'base64', label: 'Base64' }]);
  const calculate = actionButton(c('calculateHash'));
  const output = outputArea(c('output'), 4);
  const status = statusRegion(c('ready'));
  const copy = copyOutputButton(output.output, status, c, t);
  calculate.addEventListener('click', async () => {
    const finishAction = disableActionButton(calculate);
    try {
      output.output.value = await hashText(input.textarea.value, algorithm.select.value as TextHashAlgorithm, encoding.select.value as HashEncoding);
      copy.disabled = false;
      setStatus(status, c('done'), 'success');
    } catch (error) {
      output.output.value = '';
      copy.disabled = true;
      setStatus(status, localizedError(language, error, c('invalid')), 'error');
    } finally { finishAction(); }
  });
  const options = element('div', 'tool-grid');
  append(options, algorithm.wrapper, encoding.wrapper);
  append(panel, notice(c('localBoundary')), input.wrapper, options, actionRow(calculate, copy), output.wrapper, status, notice(c('hashWarning')));
  return panel;
}

function renderUuid(language: Language, t: Translate): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const inspectInput = textField(c('uuidValue'));
  const one = actionButton(c('uuidGenerate'));
  const many = actionButton(c('uuidGenerateMany'), true);
  const inspect = actionButton(c('uuidInspect'), true);
  const output = outputArea(c('output'), 10);
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');
  const copy = copyOutputButton(output.output, status, c, t);
  one.addEventListener('click', () => {
    output.output.value = generateUuidV4(1)[0] ?? '';
    inspectInput.input.value = output.output.value;
    copy.disabled = output.output.value.length === 0;
    setStatus(status, c('done'), 'success');
  });
  many.addEventListener('click', () => {
    output.output.value = generateUuidV4(10).join('\n');
    copy.disabled = false;
    setStatus(status, c('done'), 'success');
  });
  inspect.addEventListener('click', () => {
    const value = inspectUuid(inspectInput.input.value);
    if (!value.valid) {
      result.replaceChildren();
      return setStatus(status, c('uuidInvalid'), 'error');
    }
    result.replaceChildren(definitionList([
      [c('uuidCanonical'), value.normalized ?? '—'],
      [c('uuidVersion'), value.version?.toString() ?? value.kind ?? '—'],
      [c('uuidVariant'), value.variant ?? '—'],
    ]));
    setStatus(status, c('uuidValid'), 'success');
  });
  append(panel, notice(c('localBoundary')), inspectInput.wrapper, actionRow(one, many, inspect, copy), output.wrapper, status, result);
  one.click();
  return panel;
}

function parseJsonObject(value: string): JsonObject {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Enter a JSON object.');
  return parsed as JsonObject;
}

function printable(value: unknown): string {
  if (typeof value === 'string') return value;
  const serialized = JSON.stringify(value);
  return serialized ?? String(value);
}

function localizedJwtClaim(claim: JwtClaimInspection, c: ReturnType<typeof developerTranslate>): string {
  if (claim.isoDate) {
    const state = claim.timeState === 'past'
      ? c('claimTimePast')
      : claim.timeState === 'future'
        ? c('claimTimeFuture')
        : c('claimTimeNow');
    return `${claim.isoDate} · ${state}`;
  }
  const keys = {
    audience: 'claimAudience',
    identifier: 'claimIdentifier',
    issuer: 'claimIssuer',
    'numeric-date': 'claimNumericDate',
    subject: 'claimSubject',
    other: 'claimOther',
  } as const;
  return c(keys[claim.kind]);
}

function dataTable(headings: string[]): HTMLTableElement {
  const table = element('table', 'developer-table');
  const head = element('thead');
  const row = element('tr');
  for (const heading of headings) {
    const cell = element('th', '', heading);
    cell.scope = 'col';
    row.append(cell);
  }
  head.append(row);
  table.append(head, element('tbody'));
  return table;
}

function appendTableRow(table: HTMLTableElement, values: string[]): void {
  const row = element('tr');
  for (const value of values) row.append(element('td', 'wrap', value));
  table.tBodies[0]?.append(row);
}

class RegexTimeoutError extends Error {}

function runRegexWorker(pattern: string, flags: string, input: string): Promise<RegexWorkerResponse> {
  if (pattern.length > REGEX_MAX_PATTERN_CHARACTERS
    || flags.length > REGEX_MAX_FLAGS_CHARACTERS
    || input.length > REGEX_MAX_TEXT_CHARACTERS) {
    return Promise.reject(new DeveloperValidationError('regex', 'The regular-expression input exceeds the browser safety limit.'));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./developer/regex-runner.worker.ts', import.meta.url), { type: 'module' });
    const id = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new RegexTimeoutError());
    }, 750);
    worker.addEventListener('message', (event: MessageEvent<RegexWorkerResponse>) => {
      if (event.data.id !== id) return;
      window.clearTimeout(timeout);
      worker.terminate();
      resolve(event.data);
    });
    worker.addEventListener('error', () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error('The worker could not start.'));
    });
    worker.postMessage({ id, pattern, flags, input, limits: { maxPatternLength: REGEX_MAX_PATTERN_CHARACTERS, maxInputLength: REGEX_MAX_TEXT_CHARACTERS, maxMatches: 250, maxCapturedCharacters: 100_000 } });
  });
}

class CronTimeoutError extends Error {}

function runCronWorker(expression: string): Promise<{ dates: string[]; complete: boolean }> {
  if (expression.length > CRON_MAX_EXPRESSION_CHARACTERS) {
    return Promise.reject(new DeveloperValidationError('cron', 'The cron expression exceeds the browser safety limit.'));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./developer/cron-runner.worker.ts', import.meta.url), { type: 'module' });
    const id = crypto.randomUUID();
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new CronTimeoutError());
    }, 1_000);
    worker.addEventListener('message', (event: MessageEvent<{ id: string; ok: boolean; dates?: string[]; complete?: boolean; error?: string }>) => {
      if (event.data.id !== id) return;
      window.clearTimeout(timeout);
      worker.terminate();
      if (event.data.ok) resolve({ dates: event.data.dates ?? [], complete: event.data.complete === true });
      else reject(new Error(event.data.error || 'The cron expression could not be evaluated.'));
    });
    worker.addEventListener('error', () => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error('The worker could not start.'));
    });
    worker.postMessage({ id, expression, after: Date.now(), count: 8 });
  });
}
