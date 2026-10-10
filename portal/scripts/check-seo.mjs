import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import { isPublicSeoPath, publicSeoPaths } from './indexnow-selection.mjs';

// Empty alt is valid for decorative/redundant images; a missing attribute is
// different. This structural check does not judge an image's editorial meaning.
export function assertPageSemantics(document, url) {
  const descriptions = [...document.querySelectorAll('meta')]
    .filter(meta => meta.getAttribute('name')?.toLowerCase() === 'description');
  assert.equal(descriptions.length, 1, `${url}: exactly one meta description`);
  assert(document.head.contains(descriptions[0]), `${url}: description must be in the head`);
  const description = descriptions[0].getAttribute('content');
  assert(description?.trim(), `${url}: empty meta description`);
  const headings = document.querySelectorAll('h1');
  assert.equal(headings.length, 1, `${url}: one initial-HTML H1`);
  assert(headings[0].textContent.trim(), `${url}: empty H1`);
  const images = [...document.querySelectorAll('img')];
  assert(images.every(image => image.hasAttribute('alt')), `${url}: image missing alt attribute`);
  return { description, images: images.length };
}

// Only the wildcard group's root rule, not a claim about named bots, every URL
// or WAF access. A named training/search-agent exclusion is not a site-wide ban.
export function generalCrawlerRootBlocked(text) {
  const groups = [];
  let group = { agents: [], rules: [] };
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*$/, '').trim().match(/^([\w-]+)\s*:\s*(.*?)\s*$/);
    if (!match) continue;
    const directive = match[1].toLowerCase(), value = match[2];
    if (directive === 'user-agent') {
      if (group.rules.length) { groups.push(group); group = { agents: [], rules: [] }; }
      group.agents.push(value.toLowerCase());
    } else if (['allow', 'disallow'].includes(directive) && group.agents.length) {
      group.rules.push({ directive, value });
    }
  }
  groups.push(group);
  const rootRules = groups.filter(item => item.agents.includes('*')).flatMap(item => item.rules)
    .filter(rule => ['/', '/*', '/$', '/*$'].includes(rule.value));
  const longest = Math.max(0, ...rootRules.map(rule => rule.value.replace(/[*$]/g, '').length));
  const relevant = rootRules.filter(rule => rule.value.replace(/[*$]/g, '').length === longest);
  return relevant.some(rule => rule.directive === 'disallow') && !relevant.some(rule => rule.directive === 'allow');
}

// Bounded read-only audit of the portal's public canonical pages. No analytics,
// cookies, login, recursive crawler, third-party assets, or private tool content.
export async function auditSeo(origin = 'https://utilibre.org', { allowUnadvertisedSitemap = false } = {}) {
  const site = new URL(origin);
  assert(site.protocol === 'https:' && site.origin === origin, 'Use a bare public HTTPS origin');
  const robots = (await readPublic(`${origin}/robots.txt`)).text;
  const robotsSitemapAdvertised = robots.includes(`Sitemap: ${origin}/sitemap.xml`);
  assert(robotsSitemapAdvertised || allowUnadvertisedSitemap, 'Missing sitemap discovery');
  assert(!generalCrawlerRootBlocked(robots), 'Wildcard crawler group blocks the root; inspect robots.txt');
  const sitemap = (await readPublic(`${origin}/sitemap.xml`)).text;
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  assert(urls.length > 0 && urls.length <= publicSeoPaths.length, 'Unexpected sitemap size; review before crawling/submitting');
  assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap entries');
  const titles = new Set();
  const descriptions = new Set();
  const pages = new Map();
  for (const url of urls) {
    const target = new URL(url);
    assert(target.origin === origin && !target.search && !target.hash, 'Only this portal, without queries or fragments');
    assert(isPublicSeoPath(target.pathname), 'Unexpected sitemap route: review its privacy/indexing status');
    const { response, text } = await readPublic(url);
    const { document } = parseHTML(text);
    assert(!response.headers.get('x-robots-tag')?.includes('noindex'), `${url}: header prevents indexing`);
    assert.equal(document.querySelector('meta[name="robots"]')?.getAttribute('content'), 'index,follow', `${url}: robots metadata`);
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1, `${url}: exactly one canonical`);
    assert.equal(document.querySelector('link[rel="canonical"]')?.getAttribute('href'), url, `${url}: canonical`);
    const language = target.pathname.split('/')[1];
    assert.equal(document.documentElement.lang, language, `${url}: document language`);
    const { description } = assertPageSemantics(document, url);
    assert(document.querySelector('#main-content')?.textContent.length > 100, `${url}: missing initial HTML content`);
    assert(document.title.length > 10 && description?.length > 30, `${url}: incomplete metadata`);
    titles.add(document.title);
    descriptions.add(description);
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.equal(response.headers.get('set-cookie'), null, `${url}: unexpected cookie`);
    const csp = response.headers.get('content-security-policy') || '';
    assert(csp.includes("connect-src 'self'") && !/unsafe-inline|unsafe-eval/.test(csp), `${url}: weakened CSP`);
    const data = document.getElementById('public-structured-data');
    assert(data, `${url}: missing structured data`);
    const schema = JSON.parse(data.textContent);
    assert.equal(schema['@context'], 'https://schema.org');
    const page = schema['@graph']?.find((entry) => entry['@type'] === 'WebPage');
    assert(page, `${url}: missing WebPage`);
    assert.equal(page.url, url, `${url}: structured page URL`);
    assert.equal(page['@id'], url, `${url}: structured page identity`);
    assert.equal(page.inLanguage, language, `${url}: structured language`);
    assert.equal(page.name, document.title, `${url}: structured title`);
    assert.equal(page.description, description, `${url}: structured description`);
    assert.equal(document.querySelector('meta[property="og:url"]')?.getAttribute('content'), url, `${url}: social canonical`);
    for (const script of document.querySelectorAll('script[src]')) assert(new URL(script.getAttribute('src'), origin).origin === origin, `${url}: external script`);
    const alternates = {};
    for (const lang of ['en', 'es', 'x-default']) {
      const alternate = document.querySelector(`link[hreflang="${lang}"]`)?.getAttribute('href');
      assert(urls.includes(alternate), `${url}: invalid ${lang} alternate`);
      alternates[lang] = alternate;
    }
    assert.equal(alternates[language], url, `${url}: self language alternate`);
    if (target.pathname === '/en/guides' || target.pathname === '/es/guias') {
      const links = new Set([...document.querySelectorAll('#main-content a[href]')].map((link) => new URL(link.getAttribute('href'), url).href));
      const guidePrefix = `/${language}/${language === 'es' ? 'guias' : 'guides'}/`;
      for (const path of publicSeoPaths.filter((path) => path.startsWith(guidePrefix))) {
        assert(urls.includes(origin + path), `${path}: guide absent from sitemap`);
        assert(links.has(origin + path), `${path}: guide absent from initial index links`);
      }
    }
    pages.set(url, alternates);
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  for (const [url, alternates] of pages) for (const alternate of Object.values(alternates)) assert.deepEqual(pages.get(alternate), alternates, `${url}: nonreciprocal language links`);
  assert.equal(titles.size, urls.length, 'Duplicate page titles');
  assert.equal(descriptions.size, urls.length, 'Duplicate page descriptions');
  return { origin, pages: urls.length, urls, robotsSitemapAdvertised, result: robotsSitemapAdvertised ? 'passed' : 'pages-passed-robots-cache-stale' };
}

export async function readPublic(url) {
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000), headers: { 'User-Agent': 'Utilibre-public-SEO-check/1.0' } });
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    assert(size <= 1_048_576, `${url}: response too large`);
    chunks.push(chunk);
  }
  return { response, text: Buffer.concat(chunks).toString('utf8') };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(await auditSeo(process.argv[2] || 'https://utilibre.org'), null, 2));
}
