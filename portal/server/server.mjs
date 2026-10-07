import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { gzipSync } from 'node:zlib';
import { renderPublicShell, parseRoute, pageSeo, serializeStructuredData } from '../server-built/render.mjs';
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
const PUBLIC_ORIGIN = publicOrigin(process.env.PUBLIC_PORTAL_ORIGIN);
const HTML_CACHE = new Map();
const INDEX_HTML = readFileSync(join(DIST, 'index.html'), 'utf8');
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
    if (requestUrl.pathname === '/robots.txt') return serveRobots(request.method === 'HEAD', response);
    if (requestUrl.pathname === '/sitemap.xml') return serveSitemap(request.method === 'HEAD', response);
    const assetPath = safeDecode(requestUrl.pathname).replace(/^\/+/, '');
    if (assetPath === 'page-metadata.json' || assetPath.startsWith('server-built/')) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      return response.end(request.method === 'HEAD' ? undefined : 'Not found');
    }
    const redirect = canonicalRouteRedirect(requestUrl.pathname);
    if (redirect) {
      response.writeHead(308, { Location: `${redirect}${requestUrl.search}`, 'Cache-Control': 'no-store' });
      return response.end();
    }
    return serveStatic(requestUrl, request, response);
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
    PRIVATE_PREVIEW
    || !PUBLIC_ORIGIN
    || pathname === '/healthz'
    || pathname.startsWith('/api/')
    || pathname.startsWith('/_portal/')
    || /^\/(?:en\/tools|es\/herramientas)(?:\/|$)/.test(pathname)
    || /^\/(?:en\/status|es\/estado)(?:\/|$)/.test(pathname)
    || (!SUPPORT_VISIBLE && isSupportPath(pathname))
  ) response.setHeader('X-Robots-Tag', 'noindex, nofollow');
}

function serveStatic(requestUrl, request, response) {
  const decoded = safeDecode(requestUrl.pathname);
  const headOnly = request.method === 'HEAD';
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = normalize(join(DIST, relative));
  const safeCandidate = candidate.startsWith(`${DIST}/`) || candidate === join(DIST, 'index.html');
  const requestedFile = safeCandidate && existsSync(candidate) && statSync(candidate).isFile() ? candidate : null;
  if (!requestedFile && isStaticAssetPath(decoded)) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    return response.end(headOnly ? undefined : 'Not found');
  }
  const file = requestedFile ?? join(DIST, 'index.html');
  if (file === join(DIST, 'index.html')) {
    const language = staticShellLanguage(decoded, request.headers['accept-language']);
    const statusCode = knownPagePath(decoded) ? 200 : 404;
    // Only a finite set of canonical, query-free public pages is cached.
    // Visitor searches are rendered once, never stored or logged.
    const cacheable = statusCode === 200 && !requestUrl.search;
    const cacheKey = `${decoded}:${language}`;
    let document = cacheable ? HTML_CACHE.get(cacheKey) : null;
    if (!document || Date.now() - document.createdAt > 30_000) {
      document = localizedIndexHtml(INDEX_HTML, language, decoded, requestUrl.search);
      document.gzip = gzipSync(document.html);
      document.createdAt = Date.now();
      if (cacheable) {
        if (HTML_CACHE.size >= 32) HTML_CACHE.delete(HTML_CACHE.keys().next().value);
        HTML_CACHE.set(cacheKey, document);
      }
    }
    if (document.robots.startsWith('noindex')) response.setHeader('X-Robots-Tag', document.robots.replaceAll(',', ', '));
    if (document.hash) response.setHeader('Content-Security-Policy', response.getHeader('Content-Security-Policy').replace("script-src 'self'", `script-src 'self' 'sha256-${document.hash}'`));
    const gzip = (request.headers['accept-encoding'] ?? '').split(',').some((part) => /^gzip(?:\s*;\s*q=(?:1(?:\.0*)?|0\.\d*[1-9]\d*))?$/i.test(part.trim()));
    const body = gzip ? document.gzip : document.html;
    response.writeHead(statusCode, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': requestUrl.search ? 'no-store, no-transform' : 'no-cache, no-transform',
      'Vary': decoded === '/' ? 'Accept-Encoding, Accept-Language' : 'Accept-Encoding',
      'Content-Length': Buffer.byteLength(body),
      ...(gzip ? { 'Content-Encoding': 'gzip' } : {}),
    });
    return response.end(headOnly ? undefined : body);
  }
  const extension = extname(file);
  const immutable = file.includes(`${join(DIST, 'assets')}/`);
  response.writeHead(200, {
    'Content-Type': MIME.get(extension) || 'application/octet-stream',
    'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  });
  if (headOnly) return response.end();
  createReadStream(file).pipe(response);
}

function canonicalRouteRedirect(pathname) {
  if (pathname === '/index.html') return '/';
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (SUPPORT_VISIBLE && normalized === '/es/support') return '/es/apoyar';
  if (!SUPPORT_VISIBLE && isSupportPath(normalized)) return '';
  const metadata = PAGE_METADATA[normalized];
  const canonical = metadata?.alternates?.[metadata.language];
  return canonical && canonical !== pathname ? canonical : '';
}

function serveRobots(headOnly, response) {
  const text = PRIVATE_PREVIEW || !PUBLIC_ORIGIN
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nDisallow: /api/\nDisallow: /_portal/\nAllow: /_portal/config$\nDisallow: /healthz\nDisallow: /page-metadata.json\nDisallow: /server-built/\nSitemap: ${PUBLIC_ORIGIN}/sitemap.xml\n`;
  response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' });
  response.end(headOnly ? undefined : text);
}

function serveSitemap(headOnly, response) {
  // No subdomain user content, searches, login URLs, API routes, hidden tools,
  // or fabricated last-modified timestamps belong in this inventory.
  if (PRIVATE_PREVIEW || !PUBLIC_ORIGIN) {
    response.writeHead(404, { 'Cache-Control': 'no-store' });
    return response.end(headOnly ? undefined : 'Not found');
  }
  const paths = Object.entries(PAGE_METADATA)
    .filter(([path, meta]) => path.startsWith('/') && meta.robots === 'index,follow' && (SUPPORT_VISIBLE || !isSupportPath(path)))
    .map(([, meta]) => meta.alternates[meta.language]);
  const urls = [...new Set(paths)].sort().map((path) => `  <url><loc>${escapeHtml(PUBLIC_ORIGIN + path)}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  response.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'no-cache' });
  response.end(headOnly ? undefined : xml);
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

function localizedIndexHtml(html, language, pathname, search = '') {
  const skip = language === 'es' ? 'Ir al contenido principal' : 'Skip to main content';
  const config = publicConfig();
  const route = !knownPagePath(pathname) ? { language, page: 'not-found' } : (parseRoute(pathname) ?? { language, page: 'home' });
  const meta = pageSeo(route, config, search);
  const structured = meta.structuredData ? serializeStructuredData(meta.structuredData) : '';
  const canonical = meta.canonical ? `<link rel="canonical" href="${escapeAttribute(meta.canonical)}" />` : '';
  const alternates = Object.entries(meta.alternates).map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${escapeAttribute(href)}" />`).join('\n    ');
  const extra = [
    canonical, alternates,
    `<meta property="og:site_name" content="${escapeAttribute(config.projectName)}" />`,
    `<meta property="og:url" content="${escapeAttribute(meta.canonical)}" />`,
    `<meta property="og:image" content="${escapeAttribute(meta.image)}" />`,
    `<meta property="og:image:alt" content="${escapeAttribute(config.projectName)} logo" />`,
    '<meta name="twitter:card" content="summary" />',
    structured ? `<script id="public-structured-data" type="application/ld+json">${structured}</script>` : '',
  ].join('\n    ');
  const shell = renderPublicShell(route, config, search);
  return {
    robots: meta.robots,
    hash: structured ? createHash('sha256').update(structured).digest('base64') : '',
    html: html
      .replace(/<html lang="[^"]+">/, `<html lang="${language}">`)
      .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`)
      .replace(/<meta name="robots" content="[^"]*"\s*\/>/, () => `<meta name="robots" content="${meta.robots}" />`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, () => `<meta name="description" content="${escapeAttribute(meta.description)}" />`)
      .replace(/<meta property="og:title" content="[^"]*"\s*\/>/, () => `<meta property="og:title" content="${escapeAttribute(meta.title)}" />`)
      .replace(/<meta property="og:description" content="[^"]*"\s*\/>/, () => `<meta property="og:description" content="${escapeAttribute(meta.description)}" />`)
      .replace('</head>', () => `    ${extra}\n  </head>`)
      .replace(/(<a class="skip-link" href="#main-content">)[^<]*(<\/a>)/, `$1${skip}$2`)
      .replace('<div id="app"></div>', () => `<div id="app">${shell}</div>`)
      .replace(/<noscript>[\s\S]*?<\/noscript>/, () => shell ? '' : noScriptFallback(language, meta.title)),
  };
}

function noScriptFallback(language, title) {
  const message = language === 'es'
    ? 'Esta página interactiva necesita JavaScript. Podés explorar el catálogo sin activarlo.'
    : 'This interactive page needs JavaScript. You can browse the public catalog without it.';
  const label = language === 'es' ? 'Volver al catálogo' : 'Return to the catalog';
  return `<noscript><main id="main-content" class="page-shell"><header class="page-header"><h1>${escapeHtml(title)}</h1></header><p>${message}</p><p><a href="/${language}/">${label}</a></p></main></noscript>`;
}

function loadPageMetadata() {
  try {
    const value = JSON.parse(readFileSync(join(DIST, 'page-metadata.json'), 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
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
  return json(response, 200, publicConfig(), { 'Cache-Control': 'no-store' });
}

function publicConfig() {
  return {
    publicPortalOrigin: PRIVATE_PREVIEW ? '' : PUBLIC_ORIGIN,
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
    publicPdfUrl: publicServiceUrl(process.env.PUBLIC_PDF_URL),
    publicConvertUrl: publicServiceUrl(process.env.PUBLIC_CONVERT_URL),
    publicToolsUrl: publicServiceUrl(process.env.PUBLIC_TOOLS_URL),
    publicDeveloperToolsUrl: publicServiceUrl(process.env.PUBLIC_DEVELOPER_TOOLS_URL),
    publicEncryptUrl: publicServiceUrl(process.env.PUBLIC_ENCRYPT_URL),
    publicDrawUrl: publicServiceUrl(process.env.PUBLIC_DRAW_URL),
    publicQrUrl: publicServiceUrl(process.env.PUBLIC_QR_URL),
    publicBridgeUrl: publicServiceUrl(process.env.PUBLIC_BRIDGE_URL),
    publicNotifyUrl: publicServiceUrl(process.env.PUBLIC_NOTIFY_URL),
    publicSecretUrl: publicServiceUrl(process.env.PUBLIC_SECRET_URL),
    publicDropUrl: publicServiceUrl(process.env.PUBLIC_DROP_URL),
    publicStatusUrl: publicServiceUrl(process.env.PUBLIC_STATUS_URL),
    publicPythonUrl: publicServiceUrl(process.env.PUBLIC_PYTHON_URL),
    publicTranscribeUrl: publicServiceUrl(process.env.PUBLIC_TRANSCRIBE_URL),
    publicWakapiUrl: publicServiceUrl(process.env.PUBLIC_WAKAPI_URL),
    publicResumeUrl: publicServiceUrl(process.env.PUBLIC_RESUME_URL),
    publicDesignUrl: publicServiceUrl(process.env.PUBLIC_DESIGN_URL),
    publicBudgetUrl: publicServiceUrl(process.env.PUBLIC_BUDGET_URL),
    publicPollUrl: publicServiceUrl(process.env.PUBLIC_POLL_URL),
    publicTumblrUrl: publicServiceUrl(process.env.PUBLIC_TUMBLR_URL),
    publicTenorUrl: publicServiceUrl(process.env.PUBLIC_TENOR_URL),
    publicFmdUrl: publicServiceUrl(process.env.PUBLIC_FMD_URL),
    publicPollarisUrl: publicServiceUrl(process.env.PUBLIC_POLLARIS_URL),
    publicBinternetUrl: publicServiceUrl(process.env.PUBLIC_BINTERNET_URL),
    publicGothubUrl: publicServiceUrl(process.env.PUBLIC_GOTHUB_URL),
    publicTranslateUrl: publicServiceUrl(process.env.PUBLIC_TRANSLATE_URL),
    publicBooksUrl: publicServiceUrl(process.env.PUBLIC_BOOKS_URL),
    publicQrToolsUrl: publicServiceUrl(process.env.PUBLIC_QRTOOLS_URL),
    publicInstagramUrl: publicServiceUrl(process.env.PUBLIC_INSTAGRAM_URL),
    publicFourgetUrl: publicServiceUrl(process.env.PUBLIC_FOURGET_URL),
    publicOverflowUrl: publicServiceUrl(process.env.PUBLIC_OVERFLOW_URL),
    publicTwitchUrl: publicServiceUrl(process.env.PUBLIC_TWITCH_URL),
    publicLyricsUrl: publicServiceUrl(process.env.PUBLIC_LYRICS_URL),
    publicDegoogUrl: publicServiceUrl(process.env.PUBLIC_DEGOOG_URL),
    // Native-client launch only; never accept credentials or arbitrary schemes.
    publicMumbleUrl: process.env.PUBLIC_MUMBLE_URL === 'mumble://mumble.utilibre.org:64738/' ? process.env.PUBLIC_MUMBLE_URL : '',
    searxngDeployedVersion: deployedSearchVersion(),
    listedServices: csv(process.env.LISTED_SERVICES || ''),
    enabledServices: [...ENABLED_SERVICES],
    defaultLanguage: DEFAULT_LANGUAGE,
  };
}

function deployedSearchVersion() {
  try {
    const path = '/run/utilibre-updates/searxng.json';
    if (statSync(path).size > 4096) return '';
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    return /^\d{4}\.\d{1,2}\.\d{1,2}-[0-9a-f]+$/.test(manifest.version || '') ? manifest.version : '';
  } catch { return ''; }
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

function publicOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash || url.port) return '';
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (isIP(hostname) || !hostname.includes('.') || /\.(?:localhost|local|internal)$/i.test(hostname)) return '';
    return url.origin;
  } catch { return ''; }
}
