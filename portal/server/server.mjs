import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { extname, join, normalize } from 'node:path';

const PORT = positiveInt(process.env.PORT, 8080);
const LISTEN_ADDRESS = process.env.LISTEN_ADDRESS || '0.0.0.0';
const DIST = normalize(join(import.meta.dirname, '..', 'dist'));
const PAGE_METADATA = loadPageMetadata();
const PRIVATE_PREVIEW = process.env.PRIVATE_PREVIEW === '1';
const PRIVATE_BIND_IP = normalizeIp(process.env.PRIVATE_BIND_IP || '');
const MAX_REQUEST_HEADERS = 100;
const STATUS_CACHE_MS = positiveInt(process.env.STATUS_CACHE_SECONDS, 15) * 1000;
const ENABLED_SERVICES = new Set(csv(process.env.ENABLED_SERVICES || 'searxng'));
const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE === 'es' ? 'es' : 'en';
const SUPPORT_URL = publicUrl(process.env.SUPPORT_URL);
const SUPPORT_VISIBLE = Boolean(SUPPORT_URL);
const STATUS_SERVICES = parseStatusServices(process.env.STATUS_SERVICES || '').filter(({ id }) => ENABLED_SERVICES.has(id));
let statusSnapshot = null;
let statusCheck = null;

const MIME = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.wasm', 'application/wasm'],
  ['.webp', 'image/webp'],
]);

const server = createServer(async (request, response) => {
  const requestUrl = parseRequestTarget(request.url);
  if (!requestUrl) {
    setSecurityHeaders(response);
    setCrawlerHeaders(response, '/');
    return rejectServerRequest(request, response, 400, { error: 'invalid_request_target' }, { 'Cache-Control': 'no-store' });
  }
  setSecurityHeaders(response);
  setCrawlerHeaders(response, requestUrl.pathname);

  try {
    // Node stops populating request.headers/rawHeaders at maxHeadersCount even
    // though llhttp can still act on a later framing header. Reject the
    // conservative boundary before routing so a hidden Content-Length or
    // Transfer-Encoding cannot turn a bodyless route into a slow body sink.
    if (request.rawHeaders.length / 2 >= MAX_REQUEST_HEADERS) {
      return rejectServerRequest(request, response, 431, { error: 'too_many_headers' }, { 'Cache-Control': 'no-store' });
    }
    if (requestHasDeclaredBody(request)) {
      return rejectServerRequest(request, response, 400, { error: 'unexpected_request_body' }, { 'Cache-Control': 'no-store' });
    }
    if (requestUrl.pathname === '/healthz') {
      return json(response, 200, { status: 'ok' }, { 'Cache-Control': 'no-store' });
    }
    if (['/_portal/config', '/api/config'].includes(requestUrl.pathname) && request.method === 'GET') {
      return servePublicConfig(response);
    }
    if (['/_portal/status', '/api/status'].includes(requestUrl.pathname) && request.method === 'GET') {
      return await serveStatus(response);
    }
    if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/_portal/')) {
      return json(response, 404, { error: 'not_found' }, { 'Cache-Control': 'no-store' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      return response.end();
    }
    if (requestUrl.pathname === '/page-metadata.json') {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(request.method === 'HEAD' ? undefined : 'Not found');
    }
    const redirect = canonicalRouteRedirect(requestUrl.pathname);
    if (redirect) {
      response.writeHead(308, { Location: `${redirect}${requestUrl.search}`, 'Cache-Control': 'no-store' });
      return response.end();
    }
    return serveStatic(requestUrl.pathname, request.method === 'HEAD', request.headers['accept-language'], response);
  } catch (error) {
    console.error('request_failed', error instanceof Error ? error.message : 'unknown');
    if (response.destroyed || response.writableEnded) return;
    if (response.headersSent) return response.destroy();
    return json(response, 500, { error: 'internal_error' }, { 'Cache-Control': 'no-store' });
  }
});

server.headersTimeout = 10_000;
server.requestTimeout = 20_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = MAX_REQUEST_HEADERS;
server.maxRequestsPerSocket = 100;
server.maxConnections = 512;
server.listen(PORT, LISTEN_ADDRESS, () => {
  console.warn(`portal listening on ${LISTEN_ADDRESS}:${PORT}`);
});

function parseRequestTarget(target) {
  if (typeof target !== 'string' || !target.startsWith('/')) return null;
  try {
    // Concatenation keeps a leading `//` or backslash-normalized path under
    // the fixed synthetic authority instead of letting WHATWG URL resolution
    // reinterpret it as an attacker-selected network-path authority.
    return new URL(`http://portal.invalid${target}`);
  } catch {
    return null;
  }
}

function requestHasDeclaredBody(request) {
  if (request.headers['transfer-encoding']) return true;
  const value = request.headers['content-length'];
  if (value === undefined) return false;
  if (Array.isArray(value) || typeof value !== 'string') return true;
  return !/^0+$/.test(value);
}

function rejectServerRequest(request, response, status, payload, additionalHeaders = {}) {
  if (!request.complete) {
    request.resume();
    response.shouldKeepAlive = false;
    response.once('finish', () => {
      if (!request.complete && !request.destroyed) request.destroy();
    });
    return json(response, status, payload, { Connection: 'close', ...additionalHeaders });
  }
  return json(response, status, payload, additionalHeaders);
}

function setSecurityHeaders(response) {
  response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'none'; connect-src 'self'; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' blob: data:; media-src 'self' blob:; object-src 'none'; script-src 'self'; style-src 'self'; worker-src 'self'");
  response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
}

function setCrawlerHeaders(response, pathname) {
  if (
    pathname === '/healthz'
    || pathname.startsWith('/api/')
    || pathname.startsWith('/_portal/')
    || /^\/(?:en\/tools|es\/herramientas)(?:\/|$)/.test(pathname)
    || /^\/(?:en\/status|es\/estado)(?:\/|$)/.test(pathname)
    || (!SUPPORT_VISIBLE && isSupportPath(pathname))
  ) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function serveStatic(pathname, headOnly, acceptLanguage, response) {
  const decoded = safeDecode(pathname);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = normalize(join(DIST, relative));
  const safeCandidate = candidate.startsWith(`${DIST}/`) || candidate === join(DIST, 'index.html');
  const requestedFile = safeCandidate && existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
  if (!requestedFile && isStaticAssetPath(decoded)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end('Not found');
  }
  const file = requestedFile ?? join(DIST, 'index.html');
  const extension = extname(file);
  const immutable = file.includes(`${join(DIST, 'assets')}/`);
  const statusCode = !requestedFile && !knownPagePath(decoded) ? 404 : 200;
  response.writeHead(statusCode, {
    'Content-Type': MIME.get(extension) || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : extension === '.html' ? 'no-cache, no-transform' : 'public, max-age=3600',
  });
  if (headOnly) return response.end();
  if (file === join(DIST, 'index.html')) {
    const language = staticShellLanguage(decoded, acceptLanguage);
    const html = localizedIndexHtml(readFileSync(file, 'utf8'), language, decoded);
    return response.end(html);
  }
  createReadStream(file).pipe(response);
}

function canonicalRouteRedirect(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SUPPORT_VISIBLE && normalized === '/es/support' ? '/es/apoyar' : '';
}

function knownPagePath(pathname) {
  if (pathname === '/') return true;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (!SUPPORT_VISIBLE && isSupportPath(normalized)) return false;
  return Boolean(PAGE_METADATA[normalized]);
}

function isSupportPath(pathname) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return normalized === '/en/support' || normalized === '/es/apoyar' || normalized === '/es/support';
}

function isStaticAssetPath(pathname) {
  return pathname.startsWith('/assets/')
    || pathname.startsWith('/vendor/')
    || /\.[a-z0-9]{1,12}$/i.test(pathname);
}

function staticShellLanguage(pathname, acceptLanguage) {
  if (/^\/es(?:\/|$)/.test(pathname)) return 'es';
  if (/^\/en(?:\/|$)/.test(pathname)) return 'en';
  if (typeof acceptLanguage !== 'string') return DEFAULT_LANGUAGE;
  const supported = acceptLanguage.split(',').flatMap((part, index) => {
    const [rawTag, ...parameters] = part.trim().split(';');
    const tag = rawTag.toLowerCase();
    const language = tag === 'es' || tag.startsWith('es-') ? 'es' : tag === 'en' || tag.startsWith('en-') ? 'en' : null;
    if (!language) return [];
    const qualityText = parameters.map((parameter) => parameter.trim()).find((parameter) => parameter.startsWith('q='))?.slice(2);
    const quality = qualityText === undefined ? 1 : Number(qualityText);
    return Number.isFinite(quality) && quality > 0 ? [{ language, quality, index }] : [];
  }).sort((left, right) => right.quality - left.quality || left.index - right.index);
  return supported[0]?.language ?? DEFAULT_LANGUAGE;
}

function localizedIndexHtml(html, language, pathname) {
  const skip = language === 'es' ? 'Ir al contenido principal' : 'Skip to main content';
  const metadata = pageMetadata(pathname, language);
  const projectName = publicText(process.env.PROJECT_NAME, 'Utilibre', 80);
  const noscript = noScriptFallback(language, projectName);
  const title = `${metadata.title} — ${projectName}`;
  const canonical = `<link rel="canonical" href="${escapeAttribute(metadata.alternates[language])}" />`;
  const alternates = `<link rel="alternate" hreflang="en" href="${escapeAttribute(metadata.alternates.en)}" />\n    <link rel="alternate" hreflang="es" href="${escapeAttribute(metadata.alternates.es)}" />`;
  return html
    .replace(/<html lang="[^"]+">/, `<html lang="${language}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(/<meta name="robots" content="[^"]*"\s*\/>/, `<meta name="robots" content="${escapeAttribute(metadata.robots)}" />`)
    .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${escapeAttribute(metadata.description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, `<meta property="og:title" content="${escapeAttribute(title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, `<meta property="og:description" content="${escapeAttribute(metadata.description)}" />`)
    .replace('</head>', `    ${canonical}\n    ${alternates}\n  </head>`)
    .replace(/(<a class="skip-link" href="#main-content">)[^<]*(<\/a>)/, `$1${skip}$2`)
    .replace(/<noscript>[\s\S]*?<\/noscript>/, () => noscript);
}

function noScriptFallback(language, projectName) {
  const name = escapeHtml(projectName);
  if (language === 'es') {
    return `<noscript>
      <main id="main-content" class="page-shell">
        <header class="page-header">
          <p class="ledger-guideword">${name}</p>
          <h1>Acceso gratuito a servicios útiles de software libre</h1>
          <p class="hero-lead">${name} aloja una selección pequeña de servicios que normalmente requieren un servidor propio o una cuenta de pago.</p>
        </header>
        <section class="section prose" aria-labelledby="javascript-required">
          <h2 id="javascript-required">Este portal necesita JavaScript</h2>
          <p>La lista de servicios necesita la configuración pública activa, por lo que sus enlaces no aparecen en esta versión básica.</p>
          <p>Activa JavaScript y vuelve a cargar esta página para consultar y abrir los servicios.</p>
          <p><a href="/en/" lang="en" hreflang="en">Read this information in English</a></p>
        </section>
      </main>
    </noscript>`;
  }
  return `<noscript>
      <main id="main-content" class="page-shell">
        <header class="page-header">
          <p class="ledger-guideword">${name}</p>
          <h1>Free access to useful open-source services</h1>
          <p class="hero-lead">${name} hosts a small selection of services that normally require your own server or a paid account.</p>
        </header>
        <section class="section prose" aria-labelledby="javascript-required">
          <h2 id="javascript-required">This portal needs JavaScript</h2>
          <p>The service list needs the active public configuration, so its links are unavailable in this fallback.</p>
          <p>Enable JavaScript and reload this page to browse and open the services.</p>
          <p><a href="/es/" lang="es" hreflang="es">Leer esta información en español</a></p>
        </section>
      </main>
    </noscript>`;
}

function loadPageMetadata() {
  try {
    const value = JSON.parse(readFileSync(join(DIST, 'page-metadata.json'), 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function pageMetadata(pathname, language) {
  const normalized = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;
  const home = PAGE_METADATA[`/${language}`] ?? {
    title: language === 'es' ? 'Servicios útiles de software libre, alojados gratuitamente' : 'Useful open-source services, hosted for free',
    description: language === 'es'
      ? 'Accede a una selección pequeña de servicios de software libre con notas claras sobre el flujo de datos. Sin anuncios ni rastreo de comportamiento.'
      : 'Access a small selection of open-source services with clear data-flow notes. No ads or behavioral tracking.',
    robots: 'index,follow',
    alternates: { en: '/en/', es: '/es/' },
  };
  if (normalized === '/') return home;
  const notFound = PAGE_METADATA[`__not-found-${language}`] ?? { ...home, robots: 'noindex,nofollow' };
  if (!SUPPORT_VISIBLE && isSupportPath(normalized)) return notFound;
  return PAGE_METADATA[normalized] ?? notFound;
}

async function serveStatus(response) {
  const now = Date.now();
  if (statusSnapshot && now - statusSnapshot.createdAt < STATUS_CACHE_MS) {
    return json(response, 200, statusSnapshot.payload, { 'Cache-Control': 'no-store' });
  }
  if (!statusCheck) {
    statusCheck = checkStatuses().then((payload) => {
      statusSnapshot = { createdAt: Date.now(), payload };
      return payload;
    }).finally(() => { statusCheck = null; });
  }
  return json(response, 200, await statusCheck, { 'Cache-Control': 'no-store' });
}

async function checkStatuses() {
  const checks = await Promise.all(STATUS_SERVICES.map(async ({ id, url, require2xx }) => {
    try {
      const statusCode = await requestStatus(url);
      const accepted = statusCode >= 200 && statusCode < (require2xx ? 300 : 400);
      return { id, status: accepted ? 'operational' : 'degraded' };
    } catch {
      return { id, status: 'unavailable' };
    }
  }));
  return { checkedAt: new Date().toISOString(), services: checks };
}

function requestStatus(url) {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, {
      method: 'GET',
      timeout: 2500,
    }, (response) => {
      const statusCode = response.statusCode ?? 0;
      response.resume();
      resolve(statusCode);
    });
    request.once('timeout', () => request.destroy(new Error('timeout')));
    request.once('error', reject);
    request.end();
  });
}

function servePublicConfig(response) {
  return json(response, 200, {
    projectName: publicText(process.env.PROJECT_NAME, 'Utilibre', 80),
    projectTagline: publicText(process.env.PROJECT_TAGLINE, '', 180),
    projectTaglineEn: publicText(process.env.PROJECT_TAGLINE_EN, '', 180),
    projectTaglineEs: publicText(process.env.PROJECT_TAGLINE_ES, '', 180),
    sourceCodeUrl: publicUrl(process.env.SOURCE_CODE_URL),
    supportUrl: SUPPORT_URL,
    contactUrl: publicUrl(process.env.CONTACT_URL),
    publicSearchUrl: publicServiceUrl(process.env.PUBLIC_SEARCH_URL),
    publicRedditUrl: publicServiceUrl(process.env.PUBLIC_REDDIT_URL),
    publicRssUrl: publicServiceUrl(process.env.PUBLIC_RSS_URL),
    publicPasteUrl: publicServiceUrl(process.env.PUBLIC_PASTE_URL),
    enabledServices: [...ENABLED_SERVICES],
    defaultLanguage: DEFAULT_LANGUAGE,
  }, { 'Cache-Control': 'no-store' });
}

function json(response, status, payload, additional = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...additional });
  response.end(JSON.stringify(payload));
}

function parseStatusServices(value) {
  return csv(value).flatMap((entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) return [];
    const id = entry.slice(0, separator).trim();
    try {
      const url = new URL(entry.slice(separator + 1).trim());
      if (!/^[a-z0-9-]+$/i.test(id) || url.hash) return [];
      const targetIsInternalName = /^[a-z0-9-]+$/i.test(url.hostname);
      const targetIsPrivateBind = PRIVATE_BIND_IP && normalizeIp(url.hostname) === PRIVATE_BIND_IP;
      const privateHttpTarget = url.protocol === 'http:' && (targetIsInternalName || targetIsPrivateBind);
      if (!privateHttpTarget) return [];
      return [{ id, url, require2xx: false }];
    } catch { return []; }
  });
}

function csv(value) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function positiveInt(value, fallback) { const parsed = Number.parseInt(String(value ?? ''), 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function normalizeIp(value) { return value.trim().replace(/^::ffff:/, '').replace(/^\[|\]$/g, ''); }
function safeDecode(value) { try { return decodeURIComponent(value); } catch { return '/'; } }
function publicText(value, fallback, limit) { const text = typeof value === 'string' ? value.trim() : ''; return (text || fallback).slice(0, limit).replace(/[<>\r\n]/g, ''); }
function publicUrl(value) { if (!value) return ''; try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : ''; } catch { return ''; } }
function publicServiceUrl(value) {
  const secure = publicUrl(value);
  if (secure || !PRIVATE_PREVIEW || !value) return secure;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && !url.username && !url.password && normalizeIp(url.hostname) === PRIVATE_BIND_IP ? url.href : '';
  } catch { return ''; }
}
function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttribute(value) { return escapeHtml(value).replace(/"/g, '&quot;'); }
