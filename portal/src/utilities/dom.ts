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

export function actionButton(text: string, secondary = false): HTMLButtonElement {
  const button = element('button', secondary ? 'button button-secondary' : 'button', text);
  button.type = 'button';
  return button;
}

export function disableActionButton(button: HTMLButtonElement): () => void {
  const restoreFocus = document.activeElement === button;
  button.disabled = true;
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    button.disabled = false;
    restoreActionFocus(button, restoreFocus);
  };
}

export function restoreActionFocus(button: HTMLButtonElement, requested: boolean): void {
  const active = document.activeElement;
  if (requested
    && button.isConnected
    && (!active || active === document.body || active === document.documentElement)) {
    button.focus();
  }
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

export function toolPanel(): HTMLDivElement {
  return element('div', 'tool-panel');
}
