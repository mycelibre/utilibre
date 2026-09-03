import type { Language } from '../i18n';
import { actionButton, append, copyText, disableActionButton, element, formatBytes, restoreActionFocus, setStatus, statusRegion, swapActionButtonFocus, toolPanel } from '../utilities/dom';
import {
  actionRow,
  codeBlock,
  DeveloperValidationError,
  definitionList,
  developerTranslate,
  developerValidationText,
  localizedError,
  notice,
  parseHttpUrl,
  selectField,
  textareaField,
  textField,
  type DeveloperValidationCode,
  type DeveloperTranslate,
} from './developer-ui-helpers';

export type NetworkDeveloperToolId = 'http-request' | 'http-headers' | 'websocket' | 'sse' | 'webhook-inbox' | 'dns-lookup';

interface VisibleResponse {
  status: string;
  finalUrl: string;
  redirected: boolean;
  elapsedMs: number;
  headers: string;
  body: string;
  bodyBytes: number;
  truncated: boolean;
}

interface WebhookEvent {
  id: string;
  sequence: number;
  receivedAt: string;
  method: string;
  query: string;
  contentType: string;
  headers: Record<string, string | string[]>;
  headersTruncated: boolean;
  body: { encoding: 'utf-8' | 'base64'; value: string };
}

const FORBIDDEN_REQUEST_HEADER = /^(?:accept-charset|accept-encoding|access-control-request-headers|access-control-request-method|connection|content-length|cookie|cookie2|date|expect|host|keep-alive|origin|proxy-|referer|sec-|te$|trailer|transfer-encoding|upgrade|via$)/i;
const MAX_URL_CHARACTERS = 4_096;
const MAX_REQUEST_HEADER_CHARACTERS = 65_536;
const MAX_REQUEST_BODY_CHARACTERS = 512 * 1_024;
const MAX_WEBSOCKET_PROTOCOL_CHARACTERS = 2_048;
const MAX_WEBSOCKET_MESSAGE_CHARACTERS = 65_536;
const MAX_DNS_HOSTNAME_CHARACTERS = 253;
const MAX_WEBHOOK_ID_CHARACTERS = 128;
const MAX_WEBHOOK_TOKEN_CHARACTERS = 256;
const WEBSOCKET_MAX_MESSAGE_BYTES = 1 * 1_024 * 1_024;
const WEBSOCKET_MAX_SESSION_BYTES = 10 * 1_024 * 1_024;
const WEBSOCKET_MAX_MESSAGES = 1_000;
const MAX_LOG_PAYLOAD_CHARACTERS = 65_536;
const MAX_LOG_ENTRY_CHARACTERS = 66_200;
const MAX_SSE_EVENT_TYPE_CHARACTERS = 128;
const MAX_SSE_ID_CHARACTERS = 512;

export function renderNetworkDeveloperTool(id: NetworkDeveloperToolId, language: Language): HTMLElement {
  if (id === 'http-request') return renderHttpRequest(language);
  if (id === 'http-headers') return renderHttpHeaders(language);
  if (id === 'websocket') return renderWebSocket(language);
  if (id === 'sse') return renderSse(language);
  if (id === 'webhook-inbox') return renderWebhookInbox(language);
  return renderDns(language);
}

function renderHttpRequest(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const method = selectField(c('method'), ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'].map((value) => ({ value, label: value })));
  const url = textField(c('url'), { type: 'url', placeholder: 'https://example.com/api' });
  const headers = textareaField(c('headers'), 6);
  const body = textareaField(c('requestBody'), 9);
  url.input.maxLength = MAX_URL_CHARACTERS;
  headers.textarea.maxLength = MAX_REQUEST_HEADER_CHARACTERS;
  body.textarea.maxLength = MAX_REQUEST_BODY_CHARACTERS;
  const send = actionButton(c('sendRequest'));
  const cancel = actionButton(c('cancelRequest'), true);
  cancel.disabled = true;
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');
  let active: AbortController | null = null;

  const updateBodyState = (): void => {
    const enabled = !['GET', 'HEAD'].includes(method.select.value);
    body.textarea.disabled = !enabled;
    if (!enabled) body.textarea.value = '';
  };
  method.select.addEventListener('change', updateBodyState);
  updateBodyState();
  cancel.addEventListener('click', () => active?.abort());
  send.addEventListener('click', async () => {
    result.replaceChildren();
    try {
      assertCharacterLimit(url.input.value, MAX_URL_CHARACTERS, 'url', 'The URL exceeds the browser safety limit.');
      assertCharacterLimit(headers.textarea.value, MAX_REQUEST_HEADER_CHARACTERS, 'requestHeaders', 'The request headers exceed the browser safety limit.');
      const bodyValue = body.textarea.disabled ? undefined : body.textarea.value;
      if (bodyValue !== undefined) {
        assertCharacterLimit(bodyValue, MAX_REQUEST_BODY_CHARACTERS, 'requestBody', 'The request body exceeds 512 KiB.');
      }
      const destination = parseHttpUrl(url.input.value, ['http:', 'https:']);
      const parsedHeaders = parseHeaderLines(headers.textarea.value);
      if (bodyValue !== undefined && new TextEncoder().encode(bodyValue).byteLength > 512 * 1024) {
        throw new DeveloperValidationError('requestBody', 'The request body exceeds 512 KiB.');
      }
      active = new AbortController();
      const timeout = window.setTimeout(() => active?.abort(), 15_000);
      swapActionButtonFocus(send, cancel);
      setStatus(status, c('working'));
      try {
        const response = await directRequest(destination, method.select.value, parsedHeaders, bodyValue, active.signal, language);
        renderVisibleResponse(result, response, language);
        setStatus(status, c('done'), 'success');
      } finally { window.clearTimeout(timeout); }
    } catch (error) {
      setStatus(status, error instanceof DOMException && error.name === 'AbortError' ? c('ready') : localizedError(language, error, c('requestFailed')), 'error');
    } finally {
      active = null;
      swapActionButtonFocus(cancel, send);
    }
  });
  observeRemoval(panel, () => active?.abort());
  append(panel, notice(c('externalBoundary')), method.wrapper, url.wrapper, headers.wrapper, body.wrapper, actionRow(send, cancel), status, notice(c('corsBoundary')), notice(c('requestLimit')), result);
  return panel;
}

function renderHttpHeaders(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const url = textField(c('url'), { type: 'url', placeholder: 'https://example.com/' });
  url.input.maxLength = MAX_URL_CHARACTERS;
  const inspect = actionButton(c('headerInspect'));
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');
  let active: AbortController | null = null;
  inspect.addEventListener('click', async () => {
    result.replaceChildren();
    const finishAction = disableActionButton(inspect);
    active = new AbortController();
    const timeout = window.setTimeout(() => active?.abort(), 10_000);
    setStatus(status, c('working'));
    try {
      assertCharacterLimit(url.input.value, MAX_URL_CHARACTERS, 'url', 'The URL exceeds the browser safety limit.');
      const destination = parseHttpUrl(url.input.value, ['http:', 'https:']);
      const started = performance.now();
      const response = await fetch(destination, { method: 'HEAD', credentials: 'omit', cache: 'no-store', redirect: 'follow', signal: active.signal });
      const visible: VisibleResponse = {
        status: `${response.status} ${response.statusText}`.trim(),
        finalUrl: response.url,
        redirected: response.redirected,
        elapsedMs: performance.now() - started,
        headers: formatHeaders(response.headers),
        body: '',
        bodyBytes: 0,
        truncated: false,
      };
      renderVisibleResponse(result, visible, language, false);
      setStatus(status, c('done'), 'success');
    } catch (error) {
      setStatus(status, error instanceof DOMException && error.name === 'AbortError' ? c('requestFailed') : localizedError(language, error, c('requestFailed')), 'error');
    } finally {
      window.clearTimeout(timeout);
      active = null;
      finishAction();
    }
  });
  observeRemoval(panel, () => active?.abort());
  append(panel, notice(c('externalBoundary')), url.wrapper, actionRow(inspect), status, notice(c('corsBoundary')), notice(c('headerLimit')), result);
  return panel;
}

function renderWebSocket(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const url = textField(c('socketUrl'), { type: 'url', placeholder: 'wss://example.com/socket' });
  const protocols = textField(c('socketProtocols'));
  const message = textareaField(c('socketMessage'), 5);
  url.input.maxLength = MAX_URL_CHARACTERS;
  protocols.input.maxLength = MAX_WEBSOCKET_PROTOCOL_CHARACTERS;
  message.textarea.maxLength = MAX_WEBSOCKET_MESSAGE_CHARACTERS;
  const connect = actionButton(c('connect'));
  const disconnect = actionButton(c('disconnect'), true);
  const send = actionButton(c('sendMessage'), true);
  disconnect.disabled = true;
  send.disabled = true;
  const status = statusRegion(c('ready'));
  const logSection = element('section', 'developer-result');
  logSection.append(element('h2', '', c('socketLog')));
  const log = element('ol', 'developer-event-log');
  makeLiveLog(log, c('socketLog'));
  logSection.append(log);
  let socket: WebSocket | null = null;
  let connectionTimer: number | null = null;
  let receivedMessages = 0;
  let receivedBytes = 0;
  let terminalError = false;

  const clearConnectionTimer = (): void => {
    if (connectionTimer !== null) window.clearTimeout(connectionTimer);
    connectionTimer = null;
  };
  const finish = (): void => {
    clearConnectionTimer();
    const restoreConnect = document.activeElement === disconnect || document.activeElement === send;
    connect.disabled = false;
    disconnect.disabled = true;
    send.disabled = true;
    restoreActionFocus(connect, restoreConnect);
  };
  connect.addEventListener('click', () => {
    try {
      assertCharacterLimit(url.input.value, MAX_URL_CHARACTERS, 'websocket', 'The WebSocket URL exceeds the browser safety limit.');
      assertCharacterLimit(protocols.input.value, MAX_WEBSOCKET_PROTOCOL_CHARACTERS, 'websocket', 'The WebSocket protocols exceed the browser safety limit.');
      const destination = parseHttpUrl(url.input.value, ['ws:', 'wss:']);
      const requestedProtocols = protocols.input.value.split(',').map((value) => value.trim()).filter(Boolean);
      if (requestedProtocols.length > 10
        || requestedProtocols.some((value) => value.length > 128 || !/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(value))
        || new Set(requestedProtocols).size !== requestedProtocols.length) {
        throw new DeveloperValidationError('websocket', 'Use at most 10 unique, valid WebSocket subprotocol names.');
      }
      receivedMessages = 0;
      receivedBytes = 0;
      socket = new WebSocket(destination, requestedProtocols);
      terminalError = false;
      socket.binaryType = 'arraybuffer';
      const pendingSocket = socket;
      connectionTimer = window.setTimeout(() => {
        if (pendingSocket.readyState !== WebSocket.CONNECTING) return;
        terminalError = true;
        pendingSocket.close();
        setStatus(status, developerValidationText(language, 'websocket'), 'error');
      }, 15_000);
      swapActionButtonFocus(connect, disconnect);
      setStatus(status, c('working'));
      socket.addEventListener('open', () => {
        clearConnectionTimer();
        send.disabled = false;
        appendLog(log, `${c('socketOpened')} ${destination.href}`, c('logEntryTruncated'));
        setStatus(status, c('done'), 'success');
      });
      socket.addEventListener('message', (event) => {
        receivedMessages += 1;
        const oversizedText = typeof event.data === 'string' && event.data.length > WEBSOCKET_MAX_MESSAGE_BYTES;
        const receivedSize = oversizedText
          ? WEBSOCKET_MAX_MESSAGE_BYTES + 1
          : typeof event.data === 'string'
            ? new TextEncoder().encode(event.data).byteLength
            : event.data instanceof ArrayBuffer ? event.data.byteLength : 0;
        receivedBytes += receivedSize;
        if (receivedSize > WEBSOCKET_MAX_MESSAGE_BYTES
          || receivedBytes > WEBSOCKET_MAX_SESSION_BYTES
          || receivedMessages > WEBSOCKET_MAX_MESSAGES) {
          terminalError = true;
          socket?.close(1009, 'client_limit');
          return setStatus(status, developerValidationText(language, 'websocket'), 'error');
        }
        const value = typeof event.data === 'string'
          ? event.data
          : `[${c('binaryMessage')}: ${formatBytes(event.data instanceof ArrayBuffer ? event.data.byteLength : 0)}]`;
        appendLog(log, `← ${value}`, c('logEntryTruncated'), MAX_LOG_PAYLOAD_CHARACTERS + 2);
      });
      socket.addEventListener('error', () => {
        terminalError = true;
        setStatus(status, developerValidationText(language, 'websocket'), 'error');
      });
      socket.addEventListener('close', (event) => {
        appendLog(log, `${c('socketClosed')} ${event.code}${event.reason ? ` · ${event.reason}` : ''}`, c('logEntryTruncated'));
        finish();
        socket = null;
        receivedMessages = 0;
        receivedBytes = 0;
        if (!terminalError) setStatus(status, c('disconnected'));
        terminalError = false;
      });
    } catch (error) { setStatus(status, localizedError(language, error, developerValidationText(language, 'websocket')), 'error'); }
  });
  disconnect.addEventListener('click', () => socket?.close(1000));
  send.addEventListener('click', () => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return setStatus(status, developerValidationText(language, 'websocket'), 'error');
    if (message.textarea.value.length > MAX_WEBSOCKET_MESSAGE_CHARACTERS) return setStatus(status, developerValidationText(language, 'websocket'), 'error');
    if (new TextEncoder().encode(message.textarea.value).byteLength > 65_536) return setStatus(status, developerValidationText(language, 'websocket'), 'error');
    socket.send(message.textarea.value);
    appendLog(log, `→ ${message.textarea.value}`, c('logEntryTruncated'), MAX_LOG_PAYLOAD_CHARACTERS + 2);
  });
  observeRemoval(panel, () => { clearConnectionTimer(); socket?.close(1000); });
  append(panel, notice(c('externalBoundary')), url.wrapper, protocols.wrapper, message.wrapper, actionRow(connect, disconnect, send), status, notice(c('socketLimit')), logSection);
  return panel;
}

function renderSse(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const url = textField(c('streamUrl'), { type: 'url', placeholder: 'https://example.com/events' });
  url.input.maxLength = MAX_URL_CHARACTERS;
  const connect = actionButton(c('connect'));
  const disconnect = actionButton(c('disconnect'), true);
  disconnect.disabled = true;
  const status = statusRegion(c('ready'));
  const logSection = element('section', 'developer-result');
  logSection.append(element('h2', '', c('streamLog')));
  const log = element('ol', 'developer-event-log');
  makeLiveLog(log, c('streamLog'));
  logSection.append(log);
  let active: AbortController | null = null;
  connect.addEventListener('click', async () => {
    let connectionTimeout: number | null = null;
    let request: AbortController | null = null;
    try {
      assertCharacterLimit(url.input.value, MAX_URL_CHARACTERS, 'eventStream', 'The event-stream URL exceeds the browser safety limit.');
      const destination = parseHttpUrl(url.input.value, ['http:', 'https:']);
      request = new AbortController();
      active = request;
      swapActionButtonFocus(connect, disconnect);
      setStatus(status, c('working'));
      connectionTimeout = window.setTimeout(() => request?.abort(), 15_000);
      const response = await fetch(destination, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'follow',
        signal: request.signal,
      });
      window.clearTimeout(connectionTimeout);
      connectionTimeout = null;
      if (!response.ok || !response.body) throw new DeveloperValidationError('eventStream', `HTTP ${response.status}`);
      if (!response.headers.get('content-type')?.toLowerCase().includes('text/event-stream')) {
        await response.body.cancel();
        throw new DeveloperValidationError('eventStream', 'The response is not a text/event-stream.');
      }
      setStatus(status, c('done'), 'success');
      await consumeEventStream(
        response.body,
        (entry) => appendLog(log, entry.value, c('logEntryTruncated'), MAX_LOG_ENTRY_CHARACTERS, entry.truncated),
        request,
      );
      setStatus(status, c('disconnected'));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') setStatus(status, c('disconnected'));
      else setStatus(status, localizedError(language, error, c('requestFailed')), 'error');
    } finally {
      if (connectionTimeout !== null) window.clearTimeout(connectionTimeout);
      request?.abort();
      if (active === request) active = null;
      swapActionButtonFocus(disconnect, connect);
    }
  });
  disconnect.addEventListener('click', () => active?.abort());
  observeRemoval(panel, () => active?.abort());
  append(panel, notice(c('externalBoundary')), url.wrapper, actionRow(connect, disconnect), status, notice(c('corsBoundary')), notice(c('streamLimit')), logSection);
  return panel;
}

function renderWebhookInbox(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const create = actionButton(c('createInbox'));
  const copy = actionButton(c('copyInbox'), true);
  const remove = actionButton(c('deleteInbox'), true);
  copy.disabled = true;
  remove.disabled = true;
  const url = textField(c('inboxUrl'));
  url.input.readOnly = true;
  url.input.maxLength = MAX_URL_CHARACTERS;
  const expiry = element('p', 'field-help');
  const status = statusRegion(c('ready'));
  const eventsSection = element('section', 'developer-result');
  eventsSection.append(element('h2', '', c('inboxEvents')));
  const events = element('ol', 'webhook-event-list');
  makeLiveLog(events, c('inboxEvents'));
  eventsSection.append(events);
  let inboxId = '';
  let readToken = '';
  let cursor = 0;
  let pollTimer: number | null = null;
  let pollController: AbortController | null = null;
  let pollVersion = 0;
  let stopped = false;

  const stopPolling = (): void => {
    if (pollTimer !== null) window.clearTimeout(pollTimer);
    pollTimer = null;
  };
  const invalidatePolling = (): void => {
    stopPolling();
    pollVersion += 1;
    pollController?.abort();
    pollController = null;
  };
  const reset = (): void => {
    const restoreCreate = document.activeElement === copy || document.activeElement === remove;
    invalidatePolling();
    inboxId = '';
    readToken = '';
    cursor = 0;
    url.input.value = '';
    expiry.textContent = '';
    events.replaceChildren();
    events.append(element('li', 'webhook-empty', c('inboxEmpty')));
    copy.disabled = true;
    remove.disabled = true;
    create.disabled = false;
    restoreActionFocus(create, restoreCreate);
  };
  const poll = async (): Promise<void> => {
    if (!inboxId || !readToken || stopped) return;
    const currentInboxId = inboxId;
    const currentReadToken = readToken;
    const currentCursor = cursor;
    const currentVersion = pollVersion;
    const controller = new AbortController();
    pollController = controller;
    const isCurrent = (): boolean => !stopped
      && !controller.signal.aborted
      && pollVersion === currentVersion
      && inboxId === currentInboxId
      && readToken === currentReadToken;
    try {
      const response = await fetch(`/_portal/developer/webhook-inboxes/${encodeURIComponent(currentInboxId)}/events?after=${currentCursor}`, {
        headers: { Authorization: `Bearer ${currentReadToken}` },
        credentials: 'omit',
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!isCurrent()) return;
      if (response.status === 404) {
        reset();
        return setStatus(status, c('inboxExpired'), 'error');
      }
      if (!response.ok) throw await developerApiError(response, c);
      const payload = await response.json() as { events?: WebhookEvent[]; nextCursor?: number; expiresAt?: string };
      if (!isCurrent()) return;
      for (const event of payload.events ?? []) renderWebhookEvent(events, event, language, status);
      if (typeof payload.nextCursor === 'number') cursor = payload.nextCursor;
      if (payload.expiresAt) expiry.textContent = `${c('inboxExpires')}: ${new Date(payload.expiresAt).toLocaleString(language === 'es' ? 'es' : 'en')}`;
    } catch (error) {
      if (isCurrent()) setStatus(status, localizedDeveloperApiError(language, error, c), 'error');
    }
    finally {
      if (pollController === controller) pollController = null;
      if (isCurrent()) pollTimer = window.setTimeout(() => { void poll(); }, 2_000);
    }
  };
  create.addEventListener('click', async () => {
    const restoreCreate = document.activeElement === create;
    create.disabled = true;
    setStatus(status, c('working'));
    try {
      const response = await fetch('/_portal/developer/webhook-inboxes', { method: 'POST', credentials: 'omit', cache: 'no-store' });
      if (!response.ok) throw await developerApiError(response, c);
      const payload = await response.json() as { inbox: { id: string; receivePath: string; expiresAt: string }; readToken: string };
      if (typeof payload.inbox?.id !== 'string'
        || typeof payload.inbox.receivePath !== 'string'
        || typeof payload.readToken !== 'string') {
        throw new DeveloperValidationError('webhookInbox', 'The server returned invalid inbox details.');
      }
      assertCharacterLimit(payload.inbox.id, MAX_WEBHOOK_ID_CHARACTERS, 'webhookInbox', 'The server returned invalid inbox details.');
      assertCharacterLimit(payload.inbox.receivePath, MAX_URL_CHARACTERS, 'webhookInbox', 'The server returned invalid inbox details.');
      assertCharacterLimit(payload.readToken, MAX_WEBHOOK_TOKEN_CHARACTERS, 'webhookInbox', 'The server returned invalid inbox details.');
      let receiveUrl: URL;
      try {
        receiveUrl = new URL(payload.inbox.receivePath, window.location.origin);
      } catch {
        throw new DeveloperValidationError('webhookInbox', 'The server returned invalid inbox details.');
      }
      assertCharacterLimit(receiveUrl.href, MAX_URL_CHARACTERS, 'webhookInbox', 'The server returned invalid inbox details.');
      invalidatePolling();
      inboxId = payload.inbox.id;
      readToken = payload.readToken;
      cursor = 0;
      url.input.value = receiveUrl.href;
      expiry.textContent = `${c('inboxExpires')}: ${new Date(payload.inbox.expiresAt).toLocaleString(language === 'es' ? 'es' : 'en')}`;
      copy.disabled = false;
      remove.disabled = false;
      restoreActionFocus(copy, restoreCreate);
      setStatus(status, c('inboxCreated'), 'success');
      void poll();
    } catch (error) {
      create.disabled = false;
      restoreActionFocus(create, restoreCreate);
      setStatus(status, localizedDeveloperApiError(language, error, c), 'error');
    }
  });
  copy.addEventListener('click', async () => {
    if (url.input.value.length > MAX_URL_CHARACTERS) return setStatus(status, developerValidationText(language, 'webhookInbox'), 'error');
    const copied = await copyText(url.input.value);
    setStatus(status, copied ? c('copied') : c('clipboardError'), copied ? 'success' : 'error');
  });
  remove.addEventListener('click', async () => {
    if (!inboxId || !readToken) return;
    const restoreRemove = document.activeElement === remove;
    const deletingInboxId = inboxId;
    const deletingReadToken = readToken;
    invalidatePolling();
    remove.disabled = true;
    try {
      const response = await fetch(`/_portal/developer/webhook-inboxes/${encodeURIComponent(deletingInboxId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${deletingReadToken}` },
        credentials: 'omit',
      });
      if (!response.ok && response.status !== 404) throw await developerApiError(response, c);
      reset();
      restoreActionFocus(create, restoreRemove);
      setStatus(status, c('inboxDeleted'), 'success');
    } catch (error) {
      remove.disabled = false;
      restoreActionFocus(remove, restoreRemove);
      setStatus(status, localizedDeveloperApiError(language, error, c), 'error');
      if (inboxId === deletingInboxId && readToken === deletingReadToken && !stopped) void poll();
    }
  });
  observeRemoval(panel, () => { stopped = true; invalidatePolling(); });
  append(panel, notice(c('inboxSummary')), actionRow(create, copy, remove), url.wrapper, notice(c('inboxSecretWarning')), expiry, status, notice(c('inboxLimit')), eventsSection);
  events.append(element('li', 'webhook-empty', c('inboxEmpty')));
  return panel;
}

function renderDns(language: Language): HTMLElement {
  const c = developerTranslate(language);
  const panel = toolPanel();
  const hostname = textField(c('dnsName'), { placeholder: 'example.com', autocomplete: 'off' });
  hostname.input.maxLength = MAX_DNS_HOSTNAME_CHARACTERS;
  const type = selectField(c('dnsType'), ['A', 'AAAA', 'CAA', 'CNAME', 'MX', 'NS', 'SOA', 'SRV', 'TXT'].map((value) => ({ value, label: value })));
  const lookup = actionButton(c('dnsLookup'));
  const status = statusRegion(c('ready'));
  const result = element('div', 'developer-results');
  lookup.addEventListener('click', async () => {
    const finishAction = disableActionButton(lookup);
    result.replaceChildren();
    setStatus(status, c('working'));
    try {
      assertCharacterLimit(hostname.input.value, MAX_DNS_HOSTNAME_CHARACTERS, 'dnsHostname', 'The hostname exceeds the browser safety limit.');
      const response = await fetch('/_portal/developer/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        cache: 'no-store',
        body: JSON.stringify({ hostname: hostname.input.value, type: type.select.value }),
      });
      const payload = await response.json() as { hostname?: string; asciiHostname?: string; type?: string; records?: unknown[]; truncated?: boolean; error?: string };
      if (!response.ok) throw new DeveloperApiRequestError(developerApiErrorText(payload.error, response.status, c));
      const answers = codeBlock(c('dnsAnswers'));
      answers.output.textContent = JSON.stringify(payload.records ?? [], null, 2);
      result.replaceChildren(definitionList([
        [c('dnsName'), payload.hostname ?? '—'],
        [c('dnsAscii'), payload.asciiHostname ?? '—'],
        [c('dnsType'), payload.type ?? '—'],
        [c('truncated'), payload.truncated ? c('yes') : c('no')],
      ]), answers.wrapper);
      setStatus(status, c('done'), 'success');
    } catch (error) {
      setStatus(status, localizedDeveloperApiError(language, error, c), 'error');
    } finally { finishAction(); }
  });
  append(panel, notice(c('dnsLimit')), hostname.wrapper, type.wrapper, actionRow(lookup), status, result);
  return panel;
}

async function directRequest(url: URL, method: string, headers: Headers, body: string | undefined, signal: AbortSignal, language: Language): Promise<VisibleResponse> {
  const c = developerTranslate(language);
  const started = performance.now();
  const response = await fetch(url, {
    method,
    headers,
    body,
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'follow',
    signal,
  });
  const contentType = response.headers.get('content-type') ?? '';
  const displayed = method === 'HEAD' ? { bytes: new Uint8Array(), truncated: false } : await readResponseBytes(response, 1024 * 1024);
  const textual = /(?:^text\/|json|xml|javascript|x-www-form-urlencoded)/i.test(contentType);
  return {
    status: `${response.status} ${response.statusText}`.trim(),
    finalUrl: response.url,
    redirected: response.redirected,
    elapsedMs: performance.now() - started,
    headers: formatHeaders(response.headers),
    body: textual ? new TextDecoder().decode(displayed.bytes) : `[${formatBytes(displayed.bytes.byteLength)} · ${c('binaryResponseNotRendered')}]`,
    bodyBytes: displayed.bytes.byteLength,
    truncated: displayed.truncated,
  };
}

function renderVisibleResponse(target: HTMLElement, response: VisibleResponse, language: Language, showBody = true): void {
  const c = developerTranslate(language);
  const overview = element('section', 'developer-result');
  overview.append(element('h2', '', c('output')), definitionList([
    [c('requestStatus'), response.status],
    [c('requestFinalUrl'), response.finalUrl],
    [c('requestRedirected'), response.redirected ? c('yes') : c('no')],
    [c('requestTime'), `${Math.round(response.elapsedMs)} ms`],
    ...(showBody ? [[c('requestSize'), `${formatBytes(response.bodyBytes)}${response.truncated ? ` · ${c('truncated')}` : ''}`] as [string, string]] : []),
  ]));
  const headers = codeBlock(c('responseHeaders'));
  headers.output.textContent = response.headers || '—';
  const children = [overview, headers.wrapper];
  if (showBody) {
    const body = codeBlock(c('responseBody'));
    body.output.textContent = response.body;
    children.push(body.wrapper);
  }
  target.replaceChildren(...children);
}

function parseHeaderLines(value: string): Headers {
  assertCharacterLimit(value, MAX_REQUEST_HEADER_CHARACTERS, 'requestHeaders', 'The request headers exceed the browser safety limit.');
  const headers = new Headers();
  const lines = value.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length > 50) throw new DeveloperValidationError('requestHeaders', 'No more than 50 request headers are accepted.');
  for (const line of lines) {
    if (line.length > 8_192 || /^[ \t]/.test(line)) throw new DeveloperValidationError('requestHeaders', 'A request header is invalid.');
    const separator = line.indexOf(':');
    if (separator <= 0) throw new DeveloperValidationError('requestHeaders', 'Each request header needs a name and value separated by a colon.');
    const name = line.slice(0, separator).trim();
    const valuePart = line.slice(separator + 1).trim();
    if (!/^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/.test(name) || /[\r\n\0]/.test(valuePart) || FORBIDDEN_REQUEST_HEADER.test(name)) {
      throw new DeveloperValidationError('requestHeaders', `The header ${name || '(empty)'} cannot be sent by this browser tool.`);
    }
    headers.append(name, valuePart);
  }
  return headers;
}

function assertCharacterLimit(value: string, maximum: number, code: DeveloperValidationCode, message: string): void {
  if (value.length > maximum) throw new DeveloperValidationError(code, message);
}

async function readResponseBytes(response: Response, limit: number): Promise<{ bytes: Uint8Array; truncated: boolean }> {
  if (!response.body) return { bytes: new Uint8Array(), truncated: false };
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > limit) {
      const remaining = Math.max(0, limit - total);
      if (remaining > 0) chunks.push(value.slice(0, remaining));
      total += remaining;
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { bytes: output, truncated };
}

function formatHeaders(headers: Headers): string {
  return [...headers.entries()].map(([name, value]) => `${name}: ${value}`).join('\n');
}

function appendLog(
  list: HTMLOListElement,
  value: string,
  truncationLabel: string,
  maximum = MAX_LOG_ENTRY_CHARACTERS,
  alreadyTruncated = false,
): void {
  const clipped = value.length > maximum;
  const visible = clipped ? value.slice(0, maximum) : value;
  const item = element('li', 'wrap', alreadyTruncated || clipped ? `${visible}\n[${truncationLabel}]` : visible);
  list.append(item);
  while (list.childElementCount > 100) list.firstElementChild?.remove();
  list.scrollTop = list.scrollHeight;
}

function makeLiveLog(list: HTMLOListElement, label: string): void {
  list.setAttribute('role', 'log');
  list.ariaLabel = label;
  list.ariaLive = 'polite';
  list.setAttribute('aria-relevant', 'additions text');
  list.setAttribute('aria-atomic', 'false');
}

interface SseLogEntry {
  value: string;
  truncated: boolean;
}

async function consumeEventStream(stream: ReadableStream<Uint8Array>, onEvent: (entry: SseLogEntry) => void, controller: AbortController): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let totalBytes = 0;
  let eventCount = 0;
  try {
    while (!controller.signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > 10 * 1024 * 1024) throw new DeveloperValidationError('eventStream', 'The event stream exceeded the 10 MiB session limit.');
      buffer += decoder.decode(value, { stream: true });
      if (buffer.length > 131_072) throw new DeveloperValidationError('eventStream', 'The event buffer exceeded 128 KiB.');
      while (true) {
        const match = /\r\n\r\n|\n\n|\r\r/.exec(buffer);
        if (!match || match.index === undefined) break;
        const block = buffer.slice(0, match.index);
        buffer = buffer.slice(match.index + match[0].length);
        const event = parseSseBlock(block);
        if (event) {
          eventCount += 1;
          if (eventCount > 1_000) throw new DeveloperValidationError('eventStream', 'The event stream exceeded the 1,000-event session limit.');
          onEvent(event);
        }
      }
    }
  } catch (error) {
    controller.abort();
    throw error;
  } finally {
    try {
      await reader.cancel();
    } catch {
      // A failed or aborted fetch may already have errored the stream.
    }
    reader.releaseLock();
  }
}

function parseSseBlock(block: string): SseLogEntry | null {
  let event = 'message';
  let id = '';
  const data: string[] = [];
  let truncated = false;
  for (const line of block.split(/\r\n|\r|\n/)) {
    if (!line || line.startsWith(':')) continue;
    const divider = line.indexOf(':');
    const field = divider < 0 ? line : line.slice(0, divider);
    const raw = divider < 0 ? '' : line.slice(divider + 1);
    const value = raw.startsWith(' ') ? raw.slice(1) : raw;
    if (field === 'event') {
      truncated ||= value.length > MAX_SSE_EVENT_TYPE_CHARACTERS;
      event = value.slice(0, MAX_SSE_EVENT_TYPE_CHARACTERS) || 'message';
    } else if (field === 'id') {
      truncated ||= value.length > MAX_SSE_ID_CHARACTERS;
      id = value.slice(0, MAX_SSE_ID_CHARACTERS);
    } else if (field === 'data') data.push(value);
  }
  if (data.length === 0) return null;
  const joinedData = data.join('\n');
  truncated ||= joinedData.length > MAX_LOG_PAYLOAD_CHARACTERS;
  const message = joinedData.slice(0, MAX_LOG_PAYLOAD_CHARACTERS);
  return { value: `${event}${id ? ` · ${id}` : ''}\n${message}`, truncated };
}

function renderWebhookEvent(list: HTMLOListElement, event: WebhookEvent, language: Language, status: HTMLElement): void {
  const c = developerTranslate(language);
  list.querySelector('.webhook-empty')?.remove();
  const item = element('li', 'webhook-event');
  const details = element('details');
  const summary = element('summary', '', `${event.method} · ${new Date(event.receivedAt).toLocaleString(language === 'es' ? 'es' : 'en')}`);
  const metadata = definitionList([
    [c('query'), event.query || '—'],
    [c('contentType'), event.contentType || '—'],
    [c('encoding'), event.body.encoding],
  ]);
  const headers = codeBlock(c('headersLabel'));
  headers.output.textContent = Object.entries(event.headers).map(([name, value]) => `${name}: ${Array.isArray(value) ? value.join(', ') : value}`).join('\n') || '—';
  const isUtf8 = event.body.encoding === 'utf-8';
  const capturedBody = codeBlock(c(isUtf8 ? 'rawBodyLabel' : 'encodedBodyLabel'));
  capturedBody.wrapper.classList.add(isUtf8 ? 'webhook-raw-body' : 'webhook-encoded-body');
  capturedBody.output.textContent = event.body.value;
  const copyBody = actionButton(c(isUtf8 ? 'copyRawBody' : 'copyEncodedBody'), true);
  copyBody.ariaLabel = `${c(isUtf8 ? 'copyRawBody' : 'copyEncodedBody')} — ${event.method} ${event.receivedAt}`;
  copyBody.addEventListener('click', async () => {
    const copied = await copyText(event.body.value);
    setStatus(status, copied ? c('copied') : c('clipboardError'), copied ? 'success' : 'error');
  });
  append(details, summary, metadata, headers.wrapper);
  if (event.headersTruncated) details.append(notice(c('inboxHeadersTruncated')));
  append(details, capturedBody.wrapper, actionRow(copyBody));
  details.append(notice(c(isUtf8 ? 'rawBodyIntegrity' : 'encodedBodyIntegrity')));
  const formattedValue = formattedWebhookJson(event);
  if (formattedValue !== null) {
    const formattedBody = codeBlock(c('formattedJsonLabel'));
    formattedBody.wrapper.classList.add('webhook-formatted-body');
    formattedBody.output.textContent = formattedValue;
    details.append(formattedBody.wrapper);
  }
  item.append(details);
  list.prepend(item);
  while (list.childElementCount > 25) list.lastElementChild?.remove();
}

function formattedWebhookJson(event: WebhookEvent): string | null {
  if (event.body.encoding !== 'utf-8' || !/json/i.test(event.contentType)) return null;
  try { return JSON.stringify(JSON.parse(event.body.value), null, 2); } catch { return null; }
}

function observeRemoval(node: HTMLElement, cleanup: () => void): void {
  const observer = new MutationObserver(() => {
    if (node.isConnected) return;
    observer.disconnect();
    cleanup();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

async function developerApiError(response: Response, c: DeveloperTranslate): Promise<Error> {
  let code = '';
  try {
    const payload = await response.json() as { error?: unknown };
    if (typeof payload.error === 'string') code = payload.error;
  } catch { /* The status still produces a literal, localized failure. */ }
  return new DeveloperApiRequestError(developerApiErrorText(code, response.status, c));
}

class DeveloperApiRequestError extends Error {}

function localizedDeveloperApiError(language: Language, error: unknown, c: DeveloperTranslate): string {
  return error instanceof DeveloperApiRequestError
    ? error.message
    : localizedError(language, error, c('invalid'));
}

function developerApiErrorText(code: string | undefined, status: number, c: DeveloperTranslate): string {
  if (code === 'not_found' || status === 404) return c('serverUnavailable');
  if (code === 'rate_limited' || status === 429) return c('serverRateLimited');
  if (code === 'capacity_reached' || code === 'busy' || status === 503) return c('serverBusy');
  if (code === 'invalid_hostname') return c('dnsInvalidName');
  if (code === 'unsupported_record_type') return c('dnsUnsupported');
  if (code === 'no_records') return c('dnsNoRecords');
  if (code === 'lookup_timeout' || status === 504) return c('dnsTimeout');
  if (code === 'lookup_failed' || status === 502) return c('dnsFailed');
  if (code === 'invalid_request' || code === 'request_too_large' || code === 'origin_not_allowed' || status === 400 || status === 403 || status === 413) {
    return c('serverInvalidRequest');
  }
  return `${c('requestFailed')} HTTP ${status}`;
}
