import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { clearTimeout, setTimeout } from 'node:timers';

const PORT = positiveInt(process.env.PORT, 8080);
const LISTEN_ADDRESS = process.env.LISTEN_ADDRESS || '0.0.0.0';
const DIST = normalize(join(import.meta.dirname, '..', 'dist'));
const PAGE_METADATA = loadPageMetadata();
const COBALT_URL = new URL(process.env.COBALT_INTERNAL_URL || 'http://cobalt:9000/');
const COBALT_PUBLIC_URL = parseUrl(process.env.COBALT_PUBLIC_API_URL || '');
const COBALT_RESULT_SOURCE_URL = parseUrl(process.env.COBALT_RESULT_SOURCE_URL || process.env.COBALT_PUBLIC_API_URL || '');
const COBALT_API_KEY = readSecret(process.env.COBALT_API_KEY_FILE) || process.env.COBALT_API_KEY || '';
const EDGE_PROXY_IP = normalizeIp(process.env.EDGE_PROXY_IP || '');
const PRIVATE_PREVIEW = process.env.PRIVATE_PREVIEW === '1';
const PRIVATE_BIND_IP = normalizeIp(process.env.PRIVATE_BIND_IP || '');
const MEDIA_ALLOWED_ORIGINS = csv(process.env.MEDIA_ALLOWED_ORIGINS || process.env.PUBLIC_PORTAL_ORIGIN || '');
const MEDIA_RATE_WINDOW_MS = positiveInt(process.env.MEDIA_RATE_WINDOW_SECONDS, 600) * 1000;
const MEDIA_RATE_LIMIT = positiveInt(process.env.MEDIA_RATE_LIMIT, 10);
const MEDIA_MAX_CONCURRENT = positiveInt(process.env.MEDIA_MAX_CONCURRENT, 2);
const MEDIA_REQUEST_TIMEOUT_MS = positiveInt(process.env.MEDIA_REQUEST_TIMEOUT_SECONDS, 45) * 1000;
const MEDIA_BODY_MAX_CONCURRENT = 16;
const MEDIA_BODY_TIMEOUT_MS = 10_000;
const MAX_REQUEST_HEADERS = 100;
const STATUS_CACHE_MS = positiveInt(process.env.STATUS_CACHE_SECONDS, 15) * 1000;
const ENABLED_SERVICES = new Set(csv(process.env.ENABLED_SERVICES || 'cobalt,searxng'));
const DEFAULT_LANGUAGE = process.env.DEFAULT_LANGUAGE === 'es' ? 'es' : 'en';
const PUBLIC_NTFY_HEALTH_URL = publicNtfyHealthUrl(process.env.PUBLIC_NTFY_URL || '');
const STATUS_SERVICES = parseStatusServices(process.env.STATUS_SERVICES || '').filter(({ id }) => ENABLED_SERVICES.has(id));
const SERVICE_HOST_ALLOWLIST = new Set(csv(process.env.COBALT_ALLOWED_HOSTS || defaultMediaHosts()).map((host) => host.toLowerCase()));
const buckets = new Map();
let activeMediaRequests = 0;
let activeMediaBodyReads = 0;
let statusSnapshot = null;
let statusCheck = null;
const bucketSweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.reset <= now) buckets.delete(key);
}, Math.max(1000, Math.min(MEDIA_RATE_WINDOW_MS, 60_000)));
bucketSweep.unref();

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
    if (!routeAcceptsRequestBody(requestUrl.pathname, request.method) && requestHasDeclaredBody(request)) {
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
    if (['/_portal/media', '/api/media'].includes(requestUrl.pathname) && request.method === 'POST') {
      if (!ENABLED_SERVICES.has('cobalt')) return rejectServerRequest(request, response, 404, { error: 'not_found' });
      return await serveMediaRequest(request, response);
    }
    if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/_portal/')) {
      return json(response, 404, { error: 'not_found' }, { 'Cache-Control': 'no-store' });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' });
      return response.end();
    }
    const redirect = canonicalRouteRedirect(requestUrl.pathname);
    if (redirect) {
      response.writeHead(308, { Location: `${redirect}${requestUrl.search}`, 'Cache-Control': 'public, max-age=86400' });
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

function routeAcceptsRequestBody(pathname, method) {
  return method === 'POST' && ['/_portal/media', '/api/media'].includes(pathname);
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
  return normalized === '/es/support' ? '/es/apoyar' : '';
}

function knownPagePath(pathname) {
  if (pathname === '/') return true;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return Boolean(PAGE_METADATA[normalized]);
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
          <h1>Herramientas libres gratuitas alojadas de forma independiente</h1>
          <p class="hero-lead">${name} es un catálogo público bilingüe de aplicaciones de software libre alojadas en infraestructura propia.</p>
        </header>
        <section class="section prose" aria-labelledby="javascript-required">
          <h2 id="javascript-required">Este portal necesita JavaScript</h2>
          <p>El catálogo necesita su configuración pública en tiempo de ejecución, por lo que los enlaces no están disponibles en esta versión básica.</p>
          <p>Los enlaces a servicios alojados dependen de la configuración activa del servidor. Esta página estática no los muestra porque podrían estar desactualizados.</p>
          <p>Activa JavaScript y vuelve a cargar esta página para usar el catálogo y las herramientas.</p>
          <p><a href="/en/" lang="en" hreflang="en">Read this information in English</a></p>
        </section>
      </main>
    </noscript>`;
  }
  return `<noscript>
      <main id="main-content" class="page-shell">
        <header class="page-header">
          <p class="ledger-guideword">${name}</p>
          <h1>Free, independently hosted FOSS tools</h1>
          <p class="hero-lead">${name} is a bilingual public catalog of FOSS applications hosted on independently operated infrastructure.</p>
        </header>
        <section class="section prose" aria-labelledby="javascript-required">
          <h2 id="javascript-required">This portal needs JavaScript</h2>
          <p>The catalog needs its public runtime configuration, so service links are not available in this fallback.</p>
          <p>Hosted service links depend on the server's current configuration. This static page does not list them because the result could be out of date.</p>
          <p>Enable JavaScript and reload this page to use the catalog and tools.</p>
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
    title: language === 'es' ? 'Herramientas libres gratuitas alojadas de forma independiente' : 'Free, independently hosted FOSS tools',
    description: language === 'es'
      ? 'Encuentra herramientas de software libre alojadas de forma independiente, con notas claras sobre el flujo de datos. Sin anuncios ni rastreo de comportamiento.'
      : 'Find independently hosted FOSS tools with clear data-flow notes. No ads or behavioral tracking.',
    robots: 'index,follow',
    alternates: { en: '/en/', es: '/es/' },
  };
  if (normalized === '/') return home;
  const notFound = PAGE_METADATA[`__not-found-${language}`] ?? { ...home, robots: 'noindex,nofollow' };
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
  const checks = await Promise.all(STATUS_SERVICES.map(async ({ id, url, hostHeader, require2xx }) => {
    try {
      const statusCode = await requestStatus(url, hostHeader);
      const accepted = statusCode >= 200 && statusCode < (require2xx ? 300 : 400);
      return { id, status: accepted ? 'operational' : 'degraded' };
    } catch {
      return { id, status: 'unavailable' };
    }
  }));
  return { checkedAt: new Date().toISOString(), services: checks };
}

function requestStatus(url, hostHeader) {
  return new Promise((resolve, reject) => {
    const requestFunction = url.protocol === 'https:' ? httpsRequest : httpRequest;
    const request = requestFunction(url, {
      method: 'GET',
      headers: hostHeader ? { Host: hostHeader } : undefined,
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
    supportUrl: publicUrl(process.env.SUPPORT_URL),
    contactUrl: publicUrl(process.env.CONTACT_URL),
    publicSearchUrl: publicServiceUrl(process.env.PUBLIC_SEARCH_URL),
    publicRedditUrl: publicServiceUrl(process.env.PUBLIC_REDDIT_URL),
    publicYoutubeUrl: publicServiceUrl(process.env.PUBLIC_YOUTUBE_URL),
    publicImgurUrl: publicServiceUrl(process.env.PUBLIC_IMGUR_URL),
    publicNtfyUrl: publicServiceUrl(process.env.PUBLIC_NTFY_URL),
    publicPdfUrl: publicServiceUrl(process.env.PUBLIC_PDF_URL),
    publicConvertUrl: publicServiceUrl(process.env.PUBLIC_CONVERT_URL),
    publicToolsUrl: publicServiceUrl(process.env.PUBLIC_TOOLS_URL),
    publicMonitorUrl: publicServiceUrl(process.env.PUBLIC_MONITOR_URL),
    publicSendUrl: publicServiceUrl(process.env.PUBLIC_SEND_URL),
    publicRssUrl: publicServiceUrl(process.env.PUBLIC_RSS_URL),
    publicFeedsUrl: publicServiceUrl(process.env.PUBLIC_FEEDS_URL),
    publicPasteUrl: publicServiceUrl(process.env.PUBLIC_PASTE_URL),
    publicWakapiUrl: publicServiceUrl(process.env.PUBLIC_WAKAPI_URL),
    enabledServices: [...ENABLED_SERVICES],
    defaultLanguage: DEFAULT_LANGUAGE,
  }, { 'Cache-Control': 'no-store' });
}

async function serveMediaRequest(request, response) {
  if (!originAllowed(request)) return rejectServerRequest(request, response, 403, { error: 'origin_not_allowed' });
  const clientIp = trustedClientIp(request);
  if (!takeRateToken(clientIp)) return rejectServerRequest(request, response, 429, { error: 'rate_limited' }, { 'Retry-After': String(Math.ceil(MEDIA_RATE_WINDOW_MS / 1000)) });
  if (activeMediaRequests >= MEDIA_MAX_CONCURRENT || activeMediaBodyReads >= MEDIA_BODY_MAX_CONCURRENT) {
    return rejectServerRequest(request, response, 503, { error: 'busy' }, { 'Retry-After': '15' });
  }

  let input;
  activeMediaBodyReads += 1;
  try {
    input = JSON.parse(await readLimitedBody(request, 8192, MEDIA_BODY_TIMEOUT_MS));
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    const code = reason === 'too_large' ? 413 : reason === 'body_timeout' ? 408 : 400;
    const publicError = code === 413 ? 'request_too_large' : code === 408 ? 'request_timeout' : 'invalid_request';
    return rejectServerRequest(request, response, code, { error: publicError });
  } finally {
    activeMediaBodyReads -= 1;
  }
  const requestBody = validateMediaInput(input);
  if (!requestBody) return json(response, 400, { error: 'unsupported_url' });

  activeMediaRequests += 1;
  try {
    const headers = { 'Accept': 'application/json', 'Content-Type': 'application/json' };
    if (COBALT_API_KEY) headers.Authorization = `Api-Key ${COBALT_API_KEY}`;
    const upstream = await fetch(COBALT_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      redirect: 'manual',
      signal: AbortSignal.timeout(MEDIA_REQUEST_TIMEOUT_MS),
    });
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (bytes.byteLength > 1_048_576) return json(response, 502, { error: 'invalid_upstream_response' });
    let payload;
    try {
      payload = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      return json(response, 502, { error: 'invalid_upstream_response' });
    }
    if (!upstream.ok) return json(response, mapUpstreamStatus(upstream.status), { error: mapCobaltError(payload) });
    if (payload?.status === 'picker') return json(response, 400, { error: 'multiple_items_not_supported' });
    if (payload?.status === 'local-processing') return json(response, 400, { error: 'local_processing_not_supported' });
    const sanitized = sanitizeCobaltResponse(payload);
    if (sanitized.status === 'error') return json(response, 502, { error: sanitized.error });
    return json(response, 200, sanitized);
  } catch (error) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    return json(response, timedOut ? 504 : 502, { error: timedOut ? 'upstream_timeout' : 'upstream_unavailable' });
  } finally {
    activeMediaRequests -= 1;
  }
}

function validateMediaInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (typeof value.url !== 'string' || value.url.length > 2048) return null;
  let parsed;
  try { parsed = new URL(value.url); } catch { return null; }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.port) return null;
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (!allowedMediaHostname(hostname)) return null;
  const quality = ['144', '240', '360', '480', '720', '1080', 'max'].includes(value.videoQuality) ? value.videoQuality : '720';
  const mode = ['auto', 'audio', 'mute'].includes(value.downloadMode) ? value.downloadMode : 'auto';
  return {
    url: parsed.href,
    videoQuality: quality,
    downloadMode: mode,
    filenameStyle: 'basic',
    audioFormat: 'best',
    disableMetadata: true,
    alwaysProxy: false,
    localProcessing: 'disabled',
    youtubeVideoCodec: 'h264',
    youtubeVideoContainer: 'auto',
    youtubeBetterAudio: false,
    convertGif: false,
  };
}

function sanitizeCobaltResponse(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { status: 'error', error: 'invalid_upstream_response' };
  const status = ['tunnel', 'redirect', 'picker', 'local-processing', 'error'].includes(value.status) ? value.status : 'error';
  if (status === 'error') return { status, error: mapCobaltError(value) };
  const output = { status };
  if (typeof value.url === 'string') {
    const url = safeResultUrl(value.url);
    if (url) output.url = url;
  }
  if (typeof value.filename === 'string') output.filename = value.filename.slice(0, 240).replace(/[\r\n]/g, '');
  if (typeof value.audio === 'string') {
    const audio = safeResultUrl(value.audio);
    if (audio) output.audio = audio;
  }
  if (Array.isArray(value.picker)) {
    output.picker = value.picker.slice(0, 20).flatMap((item) => {
      if (!item || typeof item !== 'object' || typeof item.url !== 'string') return [];
      const url = safeResultUrl(item.url);
      if (!url) return [];
      const thumb = typeof item.thumb === 'string' ? safeResultUrl(item.thumb) : null;
      return [{ type: item.type === 'video' ? 'video' : 'photo', url, thumb: thumb || undefined }];
    });
  }
  if ((status === 'tunnel' || status === 'redirect') && !output.url) return { status: 'error', error: 'invalid_upstream_response' };
  return output;
}

function safeResultUrl(value) {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash) return null;
    if (!isBlockedAddress(hostname)) return url.href;
    if (
      COBALT_PUBLIC_URL !== null
      && COBALT_RESULT_SOURCE_URL !== null
      && url.origin === COBALT_RESULT_SOURCE_URL.origin
      && url.pathname === '/tunnel'
      && url.search.length > 1
    ) {
      const publicTunnel = new URL('/tunnel', COBALT_PUBLIC_URL);
      publicTunnel.search = url.search;
      return publicTunnel.href;
    }
    return null;
  } catch { return null; }
}

function allowedMediaHostname(hostname) {
  if (isBlockedAddress(hostname)) return false;
  return [...SERVICE_HOST_ALLOWLIST].some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

function isBlockedAddress(hostname) {
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '[::1]' || hostname === '::1') return true;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return hostname.includes(':') || !hostname.includes('.');
  const parts = hostname.split('.').map(Number);
  if (parts.some((part) => part > 255)) return true;
  return parts[0] === 10 || parts[0] === 127 || parts[0] === 0 || (parts[0] === 169 && parts[1] === 254) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) || (parts[0] === 192 && parts[1] === 168) || parts[0] >= 224;
}

function originAllowed(request, allowMissing = false) {
  const origin = request.headers.origin;
  if (!origin) return allowMissing;
  if (origin === 'null') return false;
  if (MEDIA_ALLOWED_ORIGINS.length === 0) {
    const forwardedProto = trustedProxy(request) ? firstHeader(request.headers['x-forwarded-proto']) : '';
    const protocol = forwardedProto === 'https' ? 'https' : 'http';
    return origin === `${protocol}://${request.headers.host}`;
  }
  return MEDIA_ALLOWED_ORIGINS.includes(origin);
}

function trustedClientIp(request) {
  const peer = validIpAddress(request.socket.remoteAddress);
  if (trustedProxy(request)) {
    // The documented edge overwrites this with one address. Reject ambiguous
    // lists even from that peer rather than guessing which element is trusted.
    const forwarded = singleIpHeader(request.headers['x-forwarded-for']);
    if (forwarded) return clientRateKey(forwarded);
  }
  return peer ? clientRateKey(peer) : 'unknown';
}

function trustedProxy(request) {
  return EDGE_PROXY_IP !== '' && normalizeIp(request.socket.remoteAddress || '') === EDGE_PROXY_IP;
}

function takeRateToken(key) {
  const now = Date.now();
  for (const [bucketKey, bucket] of buckets) if (bucket.reset <= now) buckets.delete(bucketKey);
  const current = buckets.get(key);
  if (!current || current.reset <= now) {
    buckets.set(key, { count: 1, reset: now + MEDIA_RATE_WINDOW_MS });
    return true;
  }
  if (current.count >= MEDIA_RATE_LIMIT) return false;
  current.count += 1;
  return true;
}

async function readLimitedBody(request, limit, timeoutMs = 10_000) {
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const chunks = [];
        let total = 0;
        for await (const chunk of request) {
          total += chunk.length;
          if (total > limit) throw new Error('too_large');
          chunks.push(chunk);
        }
        return Buffer.concat(chunks).toString('utf8');
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('body_timeout')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function json(response, status, payload, additional = {}) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...additional });
  response.end(JSON.stringify(payload));
}

function mapCobaltError(payload) {
  const code = typeof payload?.error?.code === 'string' ? payload.error.code : typeof payload?.error === 'string' ? payload.error : '';
  if (code.includes('unsupported')) return 'unsupported_url';
  if (code.includes('duration')) return 'duration_limit';
  if (code.includes('content')) return 'content_unavailable';
  if (code.includes('rate')) return 'rate_limited';
  return 'processing_failed';
}

function mapUpstreamStatus(status) {
  if (status === 429) return 429;
  if (status >= 400 && status < 500) return 400;
  return 502;
}

function parseStatusServices(value) {
  return csv(value).flatMap((entry) => {
    const separator = entry.indexOf('=');
    if (separator < 1) return [];
    const id = entry.slice(0, separator).trim();
    try {
      const url = new URL(entry.slice(separator + 1).trim());
      const hostHeader = url.hash.startsWith('#host=') ? url.hash.slice(6) : '';
      if (!/^[a-z0-9-]+$/i.test(id) || (url.hash && !hostHeader)) return [];
      if (hostHeader && !/^[a-z0-9.-]+$/i.test(hostHeader)) return [];
      url.hash = '';
      const targetIsInternalName = /^[a-z0-9-]+$/i.test(url.hostname);
      const targetIsPrivateBind = PRIVATE_BIND_IP && normalizeIp(url.hostname) === PRIVATE_BIND_IP;
      const privateHttpTarget = url.protocol === 'http:' && (targetIsInternalName || targetIsPrivateBind);
      const publicNtfyTarget = id === 'ntfy'
        && !hostHeader
        && PUBLIC_NTFY_HEALTH_URL
        && url.href === PUBLIC_NTFY_HEALTH_URL.href;
      if (!privateHttpTarget && !publicNtfyTarget) return [];
      return [{ id, url, hostHeader, require2xx: Boolean(publicNtfyTarget) }];
    } catch { return []; }
  });
}

function publicNtfyHealthUrl(value) {
  const base = parseUrl(value);
  if (!base || base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) return null;
  base.pathname = `${base.pathname.replace(/\/+$/, '')}/v1/health`;
  return base;
}

function defaultMediaHosts() {
  return 'dailymotion.com,dai.ly';
}

function csv(value) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function positiveInt(value, fallback) { const parsed = Number.parseInt(String(value ?? ''), 10); return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback; }
function normalizeIp(value) { return value.trim().replace(/^::ffff:/, '').replace(/^\[|\]$/g, ''); }
function validIpAddress(value) {
  const normalized = normalizeIp(typeof value === 'string' ? value : '');
  return isIP(normalized) ? normalized : '';
}
function singleIpHeader(value) {
  if (Array.isArray(value)) {
    if (value.length !== 1) return '';
    return singleIpHeader(value[0]);
  }
  if (typeof value !== 'string' || value.includes(',')) return '';
  return validIpAddress(value);
}
function clientRateKey(value) {
  if (isIP(value) !== 6) return value;
  try {
    const canonical = new URL(`http://[${value}]/`).hostname.slice(1, -1);
    const [left = '', right = ''] = canonical.split('::');
    const leftWords = left ? left.split(':') : [];
    const rightWords = right ? right.split(':') : [];
    const missing = 8 - leftWords.length - rightWords.length;
    const words = [...leftWords, ...Array.from({ length: Math.max(0, missing) }, () => '0'), ...rightWords];
    if (words.length !== 8) return value;
    return `${words.slice(0, 4).map((word) => Number.parseInt(word || '0', 16).toString(16)).join(':')}::/64`;
  } catch {
    return value;
  }
}
function firstHeader(value) { return Array.isArray(value) ? value[0] || '' : typeof value === 'string' ? value.split(',')[0]?.trim() || '' : ''; }
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
function parseUrl(value) { if (!value) return null; try { return new URL(value); } catch { return null; } }
function readSecret(path) { if (!path) return ''; try { return readFileSync(path, 'utf8').trim(); } catch { return ''; } }
function escapeHtml(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function escapeAttribute(value) { return escapeHtml(value).replace(/"/g, '&quot;'); }
