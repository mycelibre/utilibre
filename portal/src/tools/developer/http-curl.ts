export interface HttpHeader {
  name: string;
  value: string;
}

export interface ParsedHttpRequest {
  method: string;
  url: URL;
  httpVersion: 'HTTP/1.0' | 'HTTP/1.1' | 'HTTP/2' | 'HTTP/3';
  headers: HttpHeader[];
  body: string;
}

export interface CurlConversionOptions {
  defaultScheme?: 'http' | 'https';
}

const TOKEN_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
const METHOD_PATTERN = /^[A-Z][A-Z0-9!#$%&'*+.^_`|~-]{0,31}$/;
const SUPPORTED_HTTP_VERSIONS = new Set<ParsedHttpRequest['httpVersion']>([
  'HTTP/1.0',
  'HTTP/1.1',
  'HTTP/2',
  'HTTP/3',
]);
const MAX_SOURCE_LENGTH = 512 * 1_024;
const MAX_HEADERS = 100;

export function parseRawHttpRequest(
  source: string,
  options: CurlConversionOptions = {},
): ParsedHttpRequest {
  assertSourceSize(source);
  if (source.includes('\0')) throw new Error('NUL bytes are not allowed.');
  const normalized = source.replace(/\r\n/g, '\n');
  const divider = normalized.indexOf('\n\n');
  const head = divider >= 0 ? normalized.slice(0, divider) : normalized;
  const body = divider >= 0 ? normalized.slice(divider + 2) : '';
  const lines = head.split('\n');
  const requestLine = lines.shift()?.trim();
  const requestMatch = requestLine?.match(/^([^\s]+)\s+([^\s]+)\s+(HTTP\/[0-9.]+)$/);
  if (!requestMatch) throw new Error('The first line must contain a method, request target, and HTTP version.');

  const method = requestMatch[1]?.toUpperCase() ?? '';
  const target = requestMatch[2] ?? '';
  const httpVersion = requestMatch[3] ?? '';
  if (!METHOD_PATTERN.test(method)) throw new Error('The HTTP method is invalid.');
  if (!SUPPORTED_HTTP_VERSIONS.has(httpVersion as ParsedHttpRequest['httpVersion'])) {
    throw new Error('Only HTTP/1.0, HTTP/1.1, HTTP/2, and HTTP/3 request lines are supported.');
  }

  if (lines.length > MAX_HEADERS) throw new Error(`No more than ${MAX_HEADERS} headers are supported.`);
  const headers = lines.filter((line) => line.length > 0).map(parseHeaderLine);
  const hostHeaders = headers.filter(({ name }) => name.toLowerCase() === 'host');
  if (hostHeaders.length > 1) throw new Error('A request cannot contain more than one Host header.');

  const url = resolveRequestUrl(target, hostHeaders[0]?.value, options.defaultScheme ?? 'https');
  return {
    method,
    url,
    httpVersion: httpVersion as ParsedHttpRequest['httpVersion'],
    headers,
    body,
  };
}

export function httpRequestToCurl(source: string, options: CurlConversionOptions = {}): string {
  const request = parseRawHttpRequest(source, options);
  const pieces = ['curl', '--request', shellQuote(request.method), '--url', shellQuote(request.url.href)];
  for (const header of request.headers) {
    if (header.name.toLowerCase() === 'content-length') continue;
    pieces.push('--header', shellQuote(`${header.name}: ${header.value}`));
  }
  if (request.body.length > 0) pieces.push('--data-raw', shellQuote(request.body));
  return pieces.join(' ');
}

export function curlToHttpRequest(source: string): string {
  assertSourceSize(source);
  const tokens = tokenizeCurl(source);
  if (tokens.shift() !== 'curl') throw new Error('The command must start with curl.');

  let method: string | null = null;
  let urlValue: string | null = null;
  let body: string | null = null;
  const headers: HttpHeader[] = [];

  while (tokens.length > 0) {
    const token = tokens.shift();
    if (token === undefined) break;
    if (token === '--') {
      if (tokens.length !== 1 || urlValue !== null) throw new Error('The curl command has an ambiguous URL.');
      urlValue = tokens.shift() ?? null;
      continue;
    }

    if (token === '-X' || token === '--request') {
      method = takeOptionValue(tokens, token).toUpperCase();
      continue;
    }
    if (token.startsWith('--request=')) {
      method = token.slice('--request='.length).toUpperCase();
      continue;
    }
    if (token.startsWith('-X') && token.length > 2) {
      method = token.slice(2).toUpperCase();
      continue;
    }

    if (token === '-H' || token === '--header') {
      headers.push(parseHeaderLine(takeOptionValue(tokens, token)));
      continue;
    }
    if (token.startsWith('--header=')) {
      headers.push(parseHeaderLine(token.slice('--header='.length)));
      continue;
    }
    if (token.startsWith('-H') && token.length > 2) {
      headers.push(parseHeaderLine(token.slice(2)));
      continue;
    }

    if (isDataOption(token)) {
      if (body !== null) throw new Error('Multiple curl body options are not supported.');
      const value = dataOptionValue(token, tokens);
      if (value.startsWith('@')) throw new Error('File-backed curl request bodies are not accepted.');
      body = value;
      continue;
    }

    if (token === '--url') {
      if (urlValue !== null) throw new Error('The curl command has more than one URL.');
      urlValue = takeOptionValue(tokens, token);
      continue;
    }
    if (token.startsWith('--url=')) {
      if (urlValue !== null) throw new Error('The curl command has more than one URL.');
      urlValue = token.slice('--url='.length);
      continue;
    }

    if (isRejectedOption(token)) throw new Error(`The curl option ${token} can read or write files or credentials and is not accepted.`);
    if (isIgnoredTransportOption(token)) continue;
    if (token.startsWith('-')) throw new Error(`Unsupported curl option: ${token}.`);
    if (urlValue !== null) throw new Error('The curl command has more than one URL.');
    urlValue = token;
  }

  if (!urlValue) throw new Error('The curl command does not include a URL.');
  const url = parseHttpUrl(urlValue);
  const finalMethod = method ?? (body === null ? 'GET' : 'POST');
  if (!METHOD_PATTERN.test(finalMethod)) throw new Error('The HTTP method is invalid.');
  if (headers.length > MAX_HEADERS) throw new Error(`No more than ${MAX_HEADERS} headers are supported.`);

  const explicitHosts = headers.filter(({ name }) => name.toLowerCase() === 'host');
  if (explicitHosts.length > 1) throw new Error('A request cannot contain more than one Host header.');
  const outputHeaders = explicitHosts.length === 0
    ? [{ name: 'Host', value: url.host }, ...headers]
    : headers;
  const requestTarget = `${url.pathname || '/'}${url.search}`;
  const lines = [
    `${finalMethod} ${requestTarget} HTTP/1.1`,
    ...outputHeaders.map(({ name, value }) => `${name}: ${value}`),
    '',
  ];
  if (body !== null) lines.push(body);
  return lines.join('\r\n');
}

function parseHeaderLine(line: string): HttpHeader {
  if (/^[ \t]/.test(line)) throw new Error('Folded HTTP headers are not supported.');
  const divider = line.indexOf(':');
  if (divider <= 0) throw new Error(`Invalid HTTP header: ${line}.`);
  const name = line.slice(0, divider).trim();
  const value = line.slice(divider + 1).trim();
  if (!TOKEN_PATTERN.test(name)) throw new Error(`Invalid HTTP header name: ${name}.`);
  if (/[\r\n\0]/.test(value)) throw new Error(`Invalid value for HTTP header ${name}.`);
  return { name, value };
}

function resolveRequestUrl(target: string, host: string | undefined, scheme: 'http' | 'https'): URL {
  if (/^https?:\/\//i.test(target)) {
    const absolute = parseHttpUrl(target);
    if (host && host.toLowerCase() !== absolute.host.toLowerCase()) {
      throw new Error('The absolute request URL and Host header do not match.');
    }
    return absolute;
  }
  if (!target.startsWith('/')) throw new Error('Only origin-form or absolute HTTP request targets are supported.');
  if (target.includes('#')) throw new Error('An HTTP request target cannot contain a URL fragment.');
  if (!host) throw new Error('A relative request target requires a Host header.');
  if (/[/\\\s@?#]/.test(host)) throw new Error('The Host header is invalid.');
  const url = parseHttpUrl(`${scheme}://${host}${target}`);
  if (url.host.toLowerCase() !== host.toLowerCase()) throw new Error('The Host header is invalid.');
  return url;
}

function parseHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('The URL is invalid.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (url.username || url.password) throw new Error('URLs containing credentials are not accepted.');
  return url;
}

function shellQuote(value: string): string {
  if (value.includes('\0')) throw new Error('NUL bytes are not allowed.');
  return `'${value.replace(/'/g, `'"'"'`)}'`;
}

function tokenizeCurl(source: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let quote: 'single' | 'double' | null = null;
  let escaped = false;

  const push = (): void => {
    if (current.length > 0) tokens.push(current);
    current = '';
  };

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === undefined) continue;
    if (escaped) {
      if (character !== '\n') current += character;
      escaped = false;
      continue;
    }
    if (quote !== 'single' && character === '\\') {
      escaped = true;
      continue;
    }
    if (quote === 'single') {
      if (character === "'") quote = null;
      else current += character;
      continue;
    }
    if (quote === 'double') {
      if (character === '"') quote = null;
      else {
        if (character === '`' || character === '$') throw new Error('Shell substitutions are not accepted.');
        current += character;
      }
      continue;
    }
    if (character === "'") {
      quote = 'single';
      continue;
    }
    if (character === '"') {
      quote = 'double';
      continue;
    }
    if (/\s/.test(character)) {
      push();
      continue;
    }
    if (';&|<>`$'.includes(character)) throw new Error('Shell operators and substitutions are not accepted.');
    current += character;
  }

  if (escaped || quote) throw new Error('The curl command has an unfinished escape or quote.');
  push();
  return tokens;
}

function takeOptionValue(tokens: string[], option: string): string {
  const value = tokens.shift();
  if (value === undefined || value === '') throw new Error(`The curl option ${option} requires a value.`);
  return value;
}

function isDataOption(token: string): boolean {
  return token === '-d'
    || token === '--data'
    || token === '--data-raw'
    || token === '--data-binary'
    || (token.startsWith('-d') && token.length > 2)
    || token.startsWith('--data=')
    || token.startsWith('--data-raw=')
    || token.startsWith('--data-binary=');
}

function dataOptionValue(token: string, tokens: string[]): string {
  if (token === '-d' || token === '--data' || token === '--data-raw' || token === '--data-binary') {
    return takeOptionValue(tokens, token);
  }
  if (token.startsWith('-d') && !token.startsWith('--')) return token.slice(2);
  return token.slice(token.indexOf('=') + 1);
}

function isRejectedOption(token: string): boolean {
  const name = token.split('=', 1)[0] ?? token;
  return new Set([
    '-F', '--form', '--form-string', '-T', '--upload-file', '-K', '--config', '-o', '--output',
    '--output-dir', '--remote-name', '-O', '--cert', '--key', '--cacert', '--capath', '--cookie',
    '-b', '--cookie-jar', '-c', '--netrc', '--netrc-file', '--pass', '--proxy-user', '--user', '-u',
  ]).has(name);
}

function isIgnoredTransportOption(token: string): boolean {
  return new Set(['-s', '--silent', '-S', '--show-error', '-L', '--location', '--compressed']).has(token);
}

function assertSourceSize(source: string): void {
  if (source.length === 0) throw new Error('The input cannot be empty.');
  if (source.length > MAX_SOURCE_LENGTH) throw new Error('The input is too large to convert safely in the browser.');
}
