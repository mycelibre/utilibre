// MIT. Read-only adapter for the upstream LRCLIB web client.
// No visitor headers, credentials, request logs, arbitrary URLs, or write APIs.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const MAX_BODY = 2 * 1024 * 1024;
const MAX_CACHE = 8 * 1024 * 1024;
const TTL = 10 * 60 * 1000;
// Fit queue + the existing 15s provider deadline inside the client's 18s timeout.
const MAX_QUEUED = 4;
const MAX_WAITERS = 48;
const QUEUE_WAIT_MS = 2000;
export function retrySeconds(value, now = Date.now()) {
  const seconds = /^\d+$/.test(value ?? '') ? Number(value) : Math.ceil((Date.parse(value) - now) / 1000);
  return Number.isFinite(seconds) ? Math.max(60, seconds) : 60;
}
export function createLyricsHandler({ request = fetch, now = Date.now, root = new URL('./dist/', import.meta.url) } = {}) {
  const cache = new Map();
  const pending = new Map(), queue = [];
  let bytes = 0, busy = false, nextRequest = 0, pausedUntil = 0;
  let waiters = 0, wake;
  const drop = (key) => { bytes -= cache.get(key).body.length; cache.delete(key); };
  const failure = (status, message, wait) => ({ status, body: JSON.stringify({ message }), wait });
  const overloaded = () => failure(429, 'Search is busy; please wait', 2);
  const removeQueued = job => {
    const index = queue.indexOf(job);
    if (index !== -1) queue.splice(index, 1);
    if (!queue.length) { clearTimeout(wake); wake = undefined; }
  };
  const finish = (job, result) => {
    clearTimeout(job.timer);
    removeQueued(job);
    if (pending.get(job.key) === job) pending.delete(job.key);
    for (const waiter of [...job.waiters]) waiter.done(result);
  };
  async function retrieve(key, signal) {
    try {
      const target = new URL('https://lrclib.net/api/search');
      target.searchParams.set('q', key);
      const response = await request(target, {
        headers: { 'User-Agent': 'Utilibre-LRCLIB/1.0 (+https://utilibre.org)', 'Accept': 'application/json' },
        redirect: 'error', signal: AbortSignal.any([signal, AbortSignal.timeout(15000)]),
      });
      if ([403, 429, 503].includes(response.status)) {
        const wait = Math.max(response.status === 403 ? 600 : 60, retrySeconds(response.headers.get('retry-after'), now()));
        pausedUntil = now() + wait * 1000;
        await response.body?.cancel();
        return failure(429, 'LRCLIB requested a pause', wait);
      }
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
        await response.body?.cancel();
        pausedUntil = now() + 60000;
        return failure(502, 'Lyrics provider is unavailable');
      }
      const chunks = [];
      let size = 0;
      for await (const chunk of response.body) {
        size += chunk.length;
        if (size > MAX_BODY) throw Error('Oversized upstream response');
        chunks.push(chunk);
      }
      const records = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!Array.isArray(records) || records.length > 20) throw Error('Invalid upstream response');
      const fields = ['trackName', 'artistName', 'albumName', 'plainLyrics', 'syncedLyrics'];
      const clean = records.map(record => {
        if (!Number.isSafeInteger(record.id) || !Number.isFinite(record.duration)) throw Error('Invalid track');
        return { id: record.id, duration: Math.max(0, record.duration), instrumental: record.instrumental === true,
          ...Object.fromEntries(fields.map(field => {
            const value = record[field];
            if (value != null && (typeof value !== 'string' || value.length > 200000)) throw Error('Invalid text');
            return [field, value ?? null];
          })),
        };
      });
      const body = Buffer.from(JSON.stringify(clean));
      signal.throwIfAborted();
      while (cache.size && (bytes + body.length > MAX_CACHE || cache.size >= 128)) drop(cache.keys().next().value);
      cache.set(key, { body, until: now() + TTL }); bytes += body.length;
      return { status: 200, body };
    } catch {
      // A departed visitor is not evidence that the provider is unhealthy.
      if (!signal.aborted) pausedUntil = now() + 60000;
      return failure(502, 'Lyrics could not be loaded; try again later');
    }
  }
  async function drain() {
    if (busy || !queue.length) return;
    if (pausedUntil > now()) {
      for (const job of [...queue]) finish(job, failure(429, 'LRCLIB requested a pause', Math.ceil((pausedUntil - now()) / 1000)));
      return;
    }
    const delay = nextRequest - now();
    if (delay > 0) {
      if (!wake) wake = setTimeout(() => { wake = undefined; void drain(); }, delay);
      return;
    }
    const job = queue.shift();
    clearTimeout(job.timer);
    job.started = true;
    busy = true;
    const result = await retrieve(job.key, job.controller.signal);
    finish(job, result);
    nextRequest = now() + 500;
    busy = false;
    void drain();
  }
  function search(key, res) {
    if (res.destroyed) return Promise.resolve(null);
    if (waiters >= MAX_WAITERS) return Promise.resolve(overloaded());
    let job = pending.get(key);
    if (!job) {
      if (queue.length >= MAX_QUEUED) return Promise.resolve(overloaded());
      job = { key, waiters: new Set(), started: false, controller: new AbortController() };
      job.timer = setTimeout(() => { finish(job, overloaded()); void drain(); }, QUEUE_WAIT_MS);
      pending.set(key, job);
      queue.push(job);
    }
    return new Promise(resolve => {
      const waiter = { done(result) {
        if (!job.waiters.delete(waiter)) return;
        waiters--;
        res.off('close', disconnected);
        resolve(result);
      } };
      function disconnected() {
        waiter.done(null);
        if (!job.waiters.size) {
          // Cancel only when nobody still needs this exact search.
          job.controller.abort();
          finish(job, null);
          void drain();
        }
      }
      job.waiters.add(waiter); waiters++;
      res.once('close', disconnected);
      void drain();
    });
  }
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
    const send = (status, body, type = 'application/json; charset=utf-8') => {
      res.statusCode = status;
      res.setHeader('Content-Type', type);
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    const fail = (status, message, wait) => {
      if (wait) res.setHeader('Retry-After', String(wait));
      send(status, JSON.stringify({ message }));
    };
    try {
      if (!['GET', 'HEAD'].includes(req.method)) return fail(405, 'Read-only service');
      if (req.url.length > 2048) return fail(414, 'Request too long');
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/healthz') return send(200, '{"status":"ok"}');
      if (url.pathname === '/api/search') {
        const keys = [...url.searchParams.keys()];
        const q = url.searchParams.get('q')?.trim();
        if (keys.length !== 1 || keys[0] !== 'q' || !q || q.length > 200 || /[\u0000-\u001f\u007f]/u.test(q)) return fail(400, 'Provide a song or artist, up to 200 characters');
        if (req.method === 'HEAD') return fail(405, 'Use GET for searches');
        for (const [key, value] of cache) if (value.until <= now()) drop(key);
        const key = q.normalize('NFC');
        if (cache.has(key)) return send(200, cache.get(key).body);
        if (pausedUntil > now()) return fail(429, 'LRCLIB requested a pause', Math.ceil((pausedUntil - now()) / 1000));
        const result = await search(key, res);
        if (!result || res.destroyed) return;
        if (result.wait) res.setHeader('Retry-After', String(result.wait));
        return send(result.status, result.body);
      }
      if (url.pathname.startsWith('/api/')) return fail(404, 'Unsupported API route');
      let file = 'index.html';
      if (/^\/assets\/[a-zA-Z0-9_.-]+\.(js|css|png)$/.test(url.pathname)) file = url.pathname.slice(1);
      else if (url.pathname === '/favicon.ico') file = 'favicon.ico';
      else if (url.pathname === '/LICENSE') file = 'LICENSE';
      else if (url.pathname !== '/' && !url.pathname.startsWith('/search/')) return fail(404, 'Page not found');
      const body = await readFile(new URL(file, root));
      const ext = file.split('.').pop();
      const types = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', css: 'text/css; charset=utf-8', png: 'image/png', ico: 'image/x-icon', LICENSE: 'text/plain; charset=utf-8' };
      if (file.startsWith('assets/')) res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      send(200, body, types[ext] ?? 'text/plain; charset=utf-8');
    } catch { fail(404, 'Resource unavailable'); }
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 20000, headersTimeout: 10000 }, createLyricsHandler());
  server.maxConnections = 64;
  server.listen(5555, '0.0.0.0');
}
