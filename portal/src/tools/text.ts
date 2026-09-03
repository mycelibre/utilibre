import { actionButton, append, copyText, downloadBlob, element, labelledSelect, setStatus, statusRegion, toolPanel, type Translate } from '../utilities/dom';
import { secureRandomUuid } from '../utilities/random';

export type TextToolId = 'json' | 'base64' | 'url-encoding' | 'uuid';

export function renderTextTool(id: TextToolId, t: Translate): HTMLElement {
  const panel = toolPanel();
  const status = statusRegion(t('tool.ready'));
  if (id === 'uuid') {
    const output = element('textarea');
    output.ariaLabel = t('tool.output');
    output.readOnly = true;
    output.rows = 10;
    const one = actionButton(t('uuid.generate'));
    const many = actionButton(t('uuid.generateMany'), true);
    const copy = actionButton(t('tool.copy'), true);
    one.addEventListener('click', () => { output.value = secureRandomUuid(); setStatus(status, t('tool.done'), 'success'); });
    many.addEventListener('click', () => { output.value = Array.from({ length: 10 }, () => secureRandomUuid()).join('\n'); setStatus(status, t('tool.done'), 'success'); });
    copy.addEventListener('click', async () => {
      const copied = await copyText(output.value);
      setStatus(status, copied ? t('tool.copied') : t('tool.error.clipboard'), copied ? 'success' : 'error');
    });
    append(panel, element('p', 'field-help', t('uuid.help')), element('div', 'button-row'), output, status);
    panel.querySelector('.button-row')?.append(one, many, copy);
    one.click();
    return panel;
  }

  const inputLabel = element('label', '', t('tool.input'));
  const input = element('textarea');
  input.id = `input-${secureRandomUuid()}`;
  inputLabel.htmlFor = input.id;
  input.rows = 12;
  const outputLabel = element('label', '', t('tool.output'));
  const output = element('textarea');
  output.id = `output-${secureRandomUuid()}`;
  outputLabel.htmlFor = output.id;
  output.rows = 12;
  output.readOnly = true;
  const actions = element('div', 'button-row');
  let jsonDownload: HTMLButtonElement | null = null;
  let jsonCopy: HTMLButtonElement | null = null;
  const setJsonResultReady = (ready: boolean): void => {
    if (jsonDownload) jsonDownload.disabled = !ready;
    if (jsonCopy) jsonCopy.disabled = !ready;
  };

  if (id === 'json') {
    const format = actionButton(t('json.format'));
    const minify = actionButton(t('json.minify'), true);
    const download = actionButton(t('json.download'), true);
    jsonDownload = download;
    setJsonResultReady(false);
    format.addEventListener('click', () => { setJsonResultReady(transformJson(input.value, output, status, t, true)); });
    minify.addEventListener('click', () => { setJsonResultReady(transformJson(input.value, output, status, t, false)); });
    download.addEventListener('click', () => output.value && downloadBlob(new Blob([output.value], { type: 'application/json' }), 'formatted.json'));
    append(actions, format, minify, download);
  }
  if (id === 'base64') {
    const encode = actionButton(t('base64.encode'));
    const decode = actionButton(t('base64.decode'), true);
    encode.addEventListener('click', () => {
      try { output.value = encodeBase64(input.value); setStatus(status, t('tool.done'), 'success'); } catch { output.value = ''; setStatus(status, t('tool.error.generic'), 'error'); }
    });
    decode.addEventListener('click', () => {
      try { output.value = decodeBase64(input.value); setStatus(status, t('tool.done'), 'success'); } catch { output.value = ''; setStatus(status, t('base64.invalid'), 'error'); }
    });
    append(actions, encode, decode);
  }
  if (id === 'url-encoding') {
    const mode = labelledSelect(t('url.operation'), [
      { value: 'component-encode', label: t('url.componentEncode') },
      { value: 'component-decode', label: t('url.componentDecode') },
      { value: 'full-encode', label: t('url.fullEncode') },
      { value: 'full-decode', label: t('url.fullDecode') },
    ]);
    const run = actionButton(t('url.apply'));
    run.addEventListener('click', () => {
      try {
        output.value = transformUrl(input.value, mode.select.value);
        setStatus(status, t('tool.done'), 'success');
      } catch { output.value = ''; setStatus(status, t('url.invalid'), 'error'); }
    });
    append(actions, mode.wrapper, run);
  }
  const copy = actionButton(t('tool.copy'), true);
  if (id === 'json') {
    jsonCopy = copy;
    setJsonResultReady(false);
  }
  copy.addEventListener('click', async () => {
    if (!output.value) return setStatus(status, t('tool.error.noOutput'), 'error');
    const copied = await copyText(output.value);
    setStatus(status, copied ? t('tool.copied') : t('tool.error.clipboard'), copied ? 'success' : 'error');
  });
  actions.append(copy);
  append(panel, inputLabel, input, actions, outputLabel, output, status);
  if (id === 'base64') panel.append(element('p', 'notice', t('base64.utf8')));
  if (id === 'url-encoding') panel.append(element('p', 'notice', t('url.help')));
  return panel;
}

function transformJson(value: string, output: HTMLTextAreaElement, status: HTMLElement, t: Translate, pretty: boolean): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    output.value = JSON.stringify(parsed, null, pretty ? 2 : 0);
    setStatus(status, t('json.valid'), 'success');
    return true;
  } catch (error) {
    output.value = '';
    const match = error instanceof SyntaxError ? error.message.match(/(?:position|column)\s+(\d+)/i) : null;
    const detail = match?.[1] ? ` ${t('json.position')}: ${match[1]}.` : '';
    setStatus(status, `${t('json.invalid')}${detail}`, 'error');
    return false;
  }
}

export function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
}

export function decodeBase64(value: string): string {
  const normalized = value.replace(/\s/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(normalized)) throw new Error('base64');
  const binary = atob(normalized);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function transformUrl(value: string, mode: string): string {
  if (mode === 'component-encode') return encodeURIComponent(value);
  if (mode === 'component-decode') return decodeURIComponent(value);
  if (mode === 'full-encode') {
    let result = '';
    let offset = 0;
    for (const match of value.matchAll(/%[0-9a-f]{2}/gi)) {
      result += encodeURI(value.slice(offset, match.index)) + match[0];
      offset = (match.index ?? 0) + match[0].length;
    }
    return result + encodeURI(value.slice(offset));
  }
  if (mode === 'full-decode') return decodeURI(value);
  throw new Error('mode');
}
