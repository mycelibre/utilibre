import { actionButton, append, copyText, element, setStatus, type Translate } from '../utilities/dom';
import { secureRandomUuid } from '../utilities/random';
import type { Language } from '../i18n';
import { developerText, type DeveloperCopyKey } from './developer-copy';

export type DeveloperTranslate = (key: DeveloperCopyKey) => string;

const validationCopyKeys = {
  url: 'validationUrl',
  requestHeaders: 'validationRequestHeaders',
  requestBody: 'validationRequestBody',
  websocket: 'validationWebSocket',
  eventStream: 'validationEventStream',
  webhookInbox: 'validationWebhookInbox',
  dnsHostname: 'validationDnsHostname',
  webhookSignature: 'validationWebhookSignature',
  jwt: 'validationJwt',
  openApi: 'validationOpenApi',
  httpCurl: 'validationHttpCurl',
  regex: 'validationRegex',
  cron: 'validationCron',
  timestamp: 'validationTimestamp',
} as const satisfies Record<string, DeveloperCopyKey>;

export type DeveloperValidationCode = keyof typeof validationCopyKeys;

export class DeveloperValidationError extends Error {
  readonly code: DeveloperValidationCode;

  constructor(code: DeveloperValidationCode, englishDetail?: string) {
    super(englishDetail ?? developerText('en', validationCopyKeys[code]));
    this.name = 'DeveloperValidationError';
    this.code = code;
  }
}

export function developerValidationText(language: Language, code: DeveloperValidationCode): string {
  return developerText(language, validationCopyKeys[code]);
}

export function developerTranslate(language: Language): DeveloperTranslate {
  return (key) => developerText(language, key);
}

export function textField(labelText: string, options: { type?: string; value?: string; placeholder?: string; autocomplete?: string } = {}): { wrapper: HTMLDivElement; input: HTMLInputElement } {
  const wrapper = element('div', 'field');
  const id = `developer-${secureRandomUuid()}`;
  const label = element('label', '', labelText);
  label.htmlFor = id;
  const input = element('input');
  input.id = id;
  input.type = options.type ?? 'text';
  input.value = options.value ?? '';
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.autocomplete) input.setAttribute('autocomplete', options.autocomplete);
  append(wrapper, label, input);
  return { wrapper, input };
}

export function textareaField(labelText: string, rows = 8, value = ''): { wrapper: HTMLDivElement; textarea: HTMLTextAreaElement } {
  const wrapper = element('div', 'field');
  const id = `developer-${secureRandomUuid()}`;
  const label = element('label', '', labelText);
  label.htmlFor = id;
  const textarea = element('textarea');
  textarea.id = id;
  textarea.rows = rows;
  textarea.value = value;
  append(wrapper, label, textarea);
  return { wrapper, textarea };
}

export function selectField(labelText: string, choices: Array<{ value: string; label: string }>): { wrapper: HTMLDivElement; select: HTMLSelectElement } {
  const wrapper = element('div', 'field');
  const id = `developer-${secureRandomUuid()}`;
  const label = element('label', '', labelText);
  label.htmlFor = id;
  const select = element('select');
  select.id = id;
  for (const choice of choices) {
    const option = element('option', '', choice.label);
    option.value = choice.value;
    select.append(option);
  }
  append(wrapper, label, select);
  return { wrapper, select };
}

export function outputArea(labelText: string, rows = 8): { wrapper: HTMLDivElement; output: HTMLTextAreaElement } {
  const field = textareaField(labelText, rows);
  field.textarea.readOnly = true;
  field.textarea.classList.add('mono');
  return { wrapper: field.wrapper, output: field.textarea };
}

export function codeBlock(labelText: string): { wrapper: HTMLElement; output: HTMLElement } {
  const wrapper = element('section', 'developer-result');
  const heading = element('h2', '', labelText);
  const output = element('pre', 'developer-code-output mono wrap');
  output.tabIndex = 0;
  append(wrapper, heading, output);
  return { wrapper, output };
}

export function definitionList(rows: Array<[string, string]>): HTMLDListElement {
  const list = element('dl', 'result-list result-list-wide');
  for (const [term, value] of rows) append(list, element('dt', '', term), element('dd', 'wrap', value || '—'));
  return list;
}

export function actionRow(...buttons: HTMLElement[]): HTMLDivElement {
  const row = element('div', 'button-row');
  row.append(...buttons);
  return row;
}

export function notice(text: string): HTMLParagraphElement {
  return element('p', 'notice', text);
}

export function copyOutputButton(output: HTMLTextAreaElement | HTMLElement, status: HTMLElement, c: DeveloperTranslate, t: Translate): HTMLButtonElement {
  const button = actionButton(c('copy'), true);
  button.disabled = true;
  button.addEventListener('click', async () => {
    const value = output instanceof HTMLTextAreaElement ? output.value : output.textContent ?? '';
    if (!value) return setStatus(status, c('noOutput'), 'error');
    const copied = await copyText(value);
    setStatus(status, copied ? c('copied') : c('clipboardError'), copied ? 'success' : 'error');
  });
  button.ariaLabel = `${c('copy')} — ${t('tool.output')}`;
  return button;
}

export function localizedError(language: Language, error: unknown, fallback: string): string {
  if (error instanceof DeveloperValidationError) {
    return language === 'en' ? error.message : developerValidationText(language, error.code);
  }
  if (language === 'en' && error instanceof Error && error.message) return error.message;
  return fallback;
}

export function parseHttpUrl(value: string, protocols: readonly string[]): URL {
  let url: URL;
  try { url = new URL(value.trim()); } catch { throw new DeveloperValidationError('url', 'The URL is invalid.'); }
  if (url.href.length > 4_096) throw new DeveloperValidationError('url', 'The URL is too long.');
  if (!protocols.includes(url.protocol) || url.username || url.password) {
    throw new DeveloperValidationError('url', 'The URL scheme or credentials are not allowed.');
  }
  if (window.location.protocol === 'https:' && (url.protocol === 'http:' || url.protocol === 'ws:')) {
    throw new DeveloperValidationError('url', 'An HTTPS page cannot open an insecure HTTP or WebSocket connection.');
  }
  return url;
}
