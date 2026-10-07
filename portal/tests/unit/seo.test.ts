import { spawn, type ChildProcess } from 'node:child_process';
import { createHash } from 'node:crypto';
import { parseHTML } from 'linkedom';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const base = 'http://127.0.0.1:43897';
const origin = 'https://public.example';
let server: ChildProcess;

describe('public SEO without tracking or private-content indexing', () => {
  beforeAll(async () => {
    server = spawn(process.execPath, ['server/server.mjs'], {
      cwd: process.cwd(),
      env: {
        ...process.env, PORT: '43897', LISTEN_ADDRESS: '127.0.0.1', PRIVATE_PREVIEW: '0',
        PUBLIC_PORTAL_ORIGIN: origin, PROJECT_NAME: 'Utilibre', DEFAULT_LANGUAGE: 'en',
        ENABLED_SERVICES: 'searxng,bentopdf,reactive-resume,omnitools,zip-manager,rawgraphs,audiomass,minipaint', LISTED_SERVICES: '',
        PUBLIC_SEARCH_URL: 'https://search.public.example/', PUBLIC_PDF_URL: 'https://pdf.public.example/',
        PUBLIC_RESUME_URL: 'https://cv.public.example/', PUBLIC_TRANSCRIBE_URL: '',
        PUBLIC_TOOLS_URL: 'https://tools.public.example/', PUBLIC_ZIP_URL: 'https://zip.public.example/',
        PUBLIC_CHARTS_URL: 'https://charts.public.example/', PUBLIC_AUDIO_URL: 'https://audio.public.example/',
        PUBLIC_PAINT_URL: 'https://paint.public.example/',
        SUPPORT_URL: 'https://liberapay.com/example/', STATUS_SERVICES: '',
      },
      stdio: 'ignore',
    });
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${base}/healthz`)).ok) return; } catch { /* Wait for startup. */ }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('SEO fixture server failed to start');
  });
  afterAll(() => server?.kill('SIGTERM'));

  it('renders real bilingual content, privacy details and launch links before JavaScript', async () => {
    for (const language of ['en', 'es']) {
      const response = await fetch(`${base}/${language}/?view=all`);
      const html = await response.text();
      const { document } = parseHTML(html);
      expect(response.status).toBe(200);
      expect(document.querySelectorAll('h1')).toHaveLength(1);
      expect(document.querySelectorAll('#main-content')).toHaveLength(1);
      expect(document.querySelectorAll('[data-catalog-id]')).toHaveLength(14);
      expect(document.querySelector('[data-catalog-id="zip-manager"] .catalog-ledger-launch')?.getAttribute('href')).toBe(`https://zip.public.example/?lang=${language}`);
      expect(document.querySelector('[data-catalog-id="rawgraphs"] .catalog-ledger-launch')?.getAttribute('href')).toBe('https://charts.public.example/');
      expect(document.querySelector('[data-catalog-id="omni-csv-json"] .catalog-ledger-launch')?.getAttribute('href')).toBe(`https://tools.public.example/csv/csv-to-json?lng=${language}`);
      expect(document.querySelector('[data-catalog-id="bentopdf"] .catalog-ledger-launch')?.getAttribute('href')).toBe(`https://pdf.public.example/${language === 'es' ? 'es/' : ''}`);
      expect(document.querySelector('[data-catalog-id="reactive-resume"] .catalog-ledger-access')?.textContent).toContain(language === 'es' ? 'Cuenta aprobada' : 'Approved accounts');
      expect(html).not.toContain('data-catalog-id="whisper-web"');
      expect(document.querySelector('label[for="catalog-query"]')).not.toBeNull();
      expect(document.querySelector('form[method="get"]')?.getAttribute('action')).toBe(`/${language}/`);
      expect(document.querySelector('nav[aria-label]')).not.toBeNull();
      const settings = JSON.parse(document.getElementById('public-page-config')!.textContent!);
      expect(settings).toEqual(await (await fetch(`${base}/_portal/config`)).json());
      expect(settings).not.toHaveProperty('STATUS_SERVICES');
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${origin}/${language}/`);
      expect(document.querySelector('link[hreflang="x-default"]')?.getAttribute('href')).toBe(`${origin}/en/`);
      expect(response.headers.get('content-encoding')).toBe('gzip');
      expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
      expect(response.headers.get('set-cookie')).toBeNull();
      const scripts = [...document.querySelectorAll('script[src]')];
      expect(scripts.every((s) => s.getAttribute('src')?.startsWith('/assets/'))).toBe(true);
    }
  });

  it('lists only canonical public pages in a sitemap with reciprocal language alternatives', async () => {
    const response = await fetch(`${base}/sitemap.xml`);
    expect(response.status).toBe(200);
    const sitemap = await response.text();
    const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]!);
    expect(urls).toHaveLength(36);
    expect(new Set(urls).size).toBe(urls.length);
    expect(sitemap).not.toContain('lastmod');
    const titles = new Set();
    for (const url of urls) {
      expect(url.startsWith(`${origin}/`)).toBe(true);
      expect(url).not.toMatch(/\?|#|\/(tools|herramientas|services|servicios|status|estado|api|_portal)(\/|$)/);
      const page = await fetch(base + new URL(url).pathname, { redirect: 'manual' });
      expect(page.status, url).toBe(200);
      const { document } = parseHTML(await page.text());
      expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('index,follow');
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(url);
      expect(document.querySelector('h1')?.textContent?.length).toBeGreaterThan(0);
      for (const language of ['en', 'es']) expect(document.querySelector(`link[hreflang="${language}"]`)?.getAttribute('href')).toMatch(new RegExp(`^https://public\\.example/${language}/`));
      titles.add(document.title);
    }
    expect(titles.size).toBe(36);
    const robots = await (await fetch(`${base}/robots.txt`)).text();
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
    expect(robots).toContain('Disallow: /_portal/');
    expect(robots).not.toContain('Disallow: /assets');
    expect(robots).not.toContain('Disallow: /en/tools');
  });

  it('provides truthful structured data without relaxing CSP or inventing ratings', async () => {
    const response = await fetch(`${base}/en/`, { headers: { Host: 'evil.example', 'X-Forwarded-Host': 'evil.example' } });
    const html = await response.text();
    const { document } = parseHTML(html);
    const text = document.getElementById('public-structured-data')!.textContent!;
    const data = JSON.parse(text);
    expect(data['@graph'][0]).toMatchObject({ '@type': 'WebSite', name: 'Utilibre', url: `${origin}/` });
    expect(text).not.toMatch(/aggregateRating|review|SearchAction/);
    expect(html).not.toContain('evil.example');
    const csp = response.headers.get('content-security-policy')!;
    expect(csp).toContain(`'sha256-${createHash('sha256').update(text).digest('base64')}'`);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https:/);
    expect(csp).toContain("connect-src 'self'");
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  });

  it('renders useful task guides and practice files without enabling disabled tools', async () => {
    for (const [language, path] of [['en', 'pdf-tools'], ['es', 'herramientas-pdf']]) {
      const response = await fetch(`${base}/${language}/${path}?utm_source=example`);
      const { document } = parseHTML(await response.text());
      expect(response.status).toBe(200);
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${origin}/${language}/${path}`);
      expect(document.querySelector('#ocr')).not.toBeNull();
      expect(document.querySelector('#merge')).not.toBeNull();
      expect(document.querySelector('.guide-actions a')?.getAttribute('href')).toBe(`https://pdf.public.example/${language === 'es' ? 'es/' : ''}merge-pdf.html`);
      expect(document.querySelectorAll('[download]')).toHaveLength(2);
      expect(document.querySelector('#main-content')?.textContent).toContain('jsDelivr');
      for (const letter of ['a', 'b']) {
        const example = await fetch(`${base}/examples/pdf-${language}-${letter}.pdf`);
        expect(example.status).toBe(200);
        expect(example.headers.get('content-type')).toBe('application/pdf');
        expect(example.headers.get('x-robots-tag')).toBe('noindex, nofollow');
        expect(await example.text()).toMatch(/^%PDF-1.4/);
      }
    }
    const { document } = parseHTML(await (await fetch(`${base}/en/qr-codes`)).text());
    expect(document.querySelectorAll('.guide-actions a')).toHaveLength(0);
    expect(document.querySelectorAll('.guide-actions .notice')).toHaveLength(2);
    expect(document.querySelector('#main-content')?.textContent).toContain('does not encrypt');
  });

  it('keeps searches out of indexing and caches while making filtering work without JavaScript', async () => {
    for (const query of ['?q=pdf', '?group=files', '?view=all']) {
      const response = await fetch(`${base}/en/${query}`);
      const { document } = parseHTML(await response.text());
      expect(response.headers.get('x-robots-tag')).toBe('noindex, follow');
      expect(response.headers.get('cache-control')).toBe('no-store, no-transform');
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(`${origin}/en/`);
      expect(document.getElementById('public-structured-data')).toBeNull();
      if (query === '?q=pdf') expect(document.querySelectorAll('[data-catalog-id]')).toHaveLength(1);
      if (query === '?group=files') expect(document.querySelectorAll('[data-catalog-id]')).toHaveLength(2);
    }
    const response = await fetch(`${base}/en/?q=${encodeURIComponent('"><script>alert(1)</script>')}`);
    const html = await response.text();
    const { document } = parseHTML(html);
    expect(document.querySelectorAll('script:not([src]):not([type="application/json"])')).toHaveLength(0);
    expect(document.querySelector('input[name="q"]')?.getAttribute('value')).toBe('"><script>alert(1)</script>');
    expect((await (await fetch(`${base}/en/`)).text())).not.toContain('alert(1)');
  });

  it('preserves genuine 404s, excludes internal build files and redirects only known aliases', async () => {
    for (const path of ['/en/not-real', '/es/no-existe', '/not-a-locale']) {
      const response = await fetch(`${base}${path}`);
      const { document } = parseHTML(await response.text());
      expect(response.status).toBe(404);
      expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
      expect(document.querySelector('link[rel="canonical"]')).toBeNull();
      expect(document.getElementById('public-structured-data')).toBeNull();
    }
    for (const path of ['/page-metadata.json', '/%70age-metadata.json', '//page-metadata.json', '/server-built/render.mjs']) expect((await fetch(base + path)).status).toBe(404);
    for (const [path, destination] of [['/en', '/en/'], ['/en/privacy/', '/en/privacy'], ['/es/support', '/es/apoyar'], ['/index.html', '/']]) {
      const response = await fetch(base + path, { redirect: 'manual' });
      expect(response.status).toBe(308);
      expect(response.headers.get('location')).toBe(destination);
    }
    const head = await fetch(`${base}/en/`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
  });
});
