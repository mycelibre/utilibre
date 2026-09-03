import type { TranslationKey } from '../i18n';
import { secureRandomUuid } from './random';

export type Translate = (key: TranslationKey) => string;

export function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text) item.textContent = text;
  return item;
}

export function append(parent: Node, ...children: Array<Node | string | null | undefined>): void {
  for (const child of children) if (child !== null && child !== undefined) parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
}

export function labelledInput(labelText: string, type: string, options: { value?: string; min?: string; max?: string; step?: string; accept?: string; multiple?: boolean; placeholder?: string } = {}): { wrapper: HTMLDivElement; input: HTMLInputElement } {
  const wrapper = element('div', 'field');
  const id = `field-${secureRandomUuid()}`;
  const label = element('label', '', labelText);
  label.htmlFor = id;
  const input = element('input');
  input.id = id;
  input.type = type;
  if (options.value !== undefined) input.value = options.value;
  if (options.min !== undefined) input.min = options.min;
  if (options.max !== undefined) input.max = options.max;
  if (options.step !== undefined) input.step = options.step;
  if (options.accept !== undefined) input.accept = options.accept;
  if (options.multiple !== undefined) input.multiple = options.multiple;
  if (options.placeholder !== undefined) input.placeholder = options.placeholder;
  append(wrapper, label, input);
  return { wrapper, input };
}

export function labelledSelect(labelText: string, choices: Array<{ value: string; label: string }>): { wrapper: HTMLDivElement; select: HTMLSelectElement } {
  const wrapper = element('div', 'field');
  const id = `field-${secureRandomUuid()}`;
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

export function actionButton(text: string, secondary = false): HTMLButtonElement {
  const button = element('button', secondary ? 'button button-secondary' : 'button', text);
  button.type = 'button';
  return button;
}

export function statusRegion(initial: string): HTMLDivElement {
  const status = element('div', 'status-message', initial);
  status.role = 'status';
  status.ariaLive = 'polite';
  return status;
}

export function setStatus(status: HTMLElement, text: string, state: 'normal' | 'error' | 'success' = 'normal'): void {
  status.textContent = text;
  status.dataset.state = state;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let unit = units[0] ?? 'KiB';
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index] ?? unit;
  }
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${unit}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = element('a');
  anchor.href = url;
  anchor.download = safeFilename(filename);
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function safeFilename(filename: string): string {
  const unsafe = '/\\:*?"<>|';
  return [...filename].map((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 || unsafe.includes(character) ? '-' : character;
  }).join('').slice(0, 180) || 'download';
}

export function fileStem(filename: string): string {
  return filename.replace(/\.[^.]+$/, '').slice(0, 120) || 'result';
}

export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Fall through to the local selection-based compatibility path. */ }
  const temporary = element('textarea');
  temporary.value = text;
  temporary.readOnly = true;
  temporary.setAttribute('aria-hidden', 'true');
  temporary.style.position = 'fixed';
  temporary.style.opacity = '0';
  document.body.append(temporary);
  temporary.select();
  try { return document.execCommand('copy'); } catch { return false; } finally { temporary.remove(); }
}

export function toolPanel(): HTMLDivElement {
  return element('div', 'tool-panel');
}
