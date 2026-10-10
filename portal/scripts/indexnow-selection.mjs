import assert from 'node:assert/strict';
import { URL } from 'node:url';
import { practicalGuides, practicalGuidePath } from '../src/pages/practical-guide-data.ts';

export const PUBLIC_ORIGIN = 'https://utilibre.org';
export const MAX_NOTIFICATION_URLS = 30;

// Static policy/catalog pages are explicitly reviewed. Guide paths come from
// the same maintained, public-only registry as rendering and the sitemap;
// private application routes and user content never enter that registry.
// Keep any retired public path explicitly listed for a removal notification.
export const publicSeoPaths = Object.freeze([
  '/en/', '/es/',
  '/en/about', '/es/acerca',
  '/en/privacy', '/es/privacidad',
  '/en/security', '/es/security',
  '/en/your-data', '/es/your-data',
  '/en/transparency', '/es/transparencia',
  '/en/acceptable-use', '/es/uso-aceptable',
  '/en/support', '/es/apoyar',
  '/en/software', '/es/software',
  '/en/privacy-labels', '/es/etiquetas-privacidad',
  '/en/pdf-tools', '/es/herramientas-pdf',
  '/en/qr-codes', '/es/codigos-qr',
  '/en/guides', '/es/guias',
  '/en/my-utilibre', '/es/mi-utilibre',
  '/en/offline-tools', '/es/herramientas-sin-conexion',
  ...practicalGuides.flatMap((guide) => ['en', 'es'].map((language) => practicalGuidePath(guide.id, language))),
]);
const publicPaths = new Set(publicSeoPaths);

export function isPublicSeoPath(path) {
  return typeof path === 'string' && publicPaths.has(path);
}

export function validatePublicUrl(value) {
  assert(typeof value === 'string' && value.length <= 200, 'Expected a reviewed canonical public URL');
  let url;
  try { url = new URL(value); } catch { assert.fail('Expected an absolute public HTTPS URL'); }
  assert(url.origin === PUBLIC_ORIGIN && !url.username && !url.password, 'Only https://utilibre.org public pages are allowed');
  assert(!url.search && !url.hash && isPublicSeoPath(url.pathname), 'Private, filtered, unreviewed, or fragment URLs are not allowed');
  assert.equal(value, `${PUBLIC_ORIGIN}${url.pathname}`, 'Use the exact canonical URL without aliases, encoding, credentials, or ports');
  return value;
}

export function parseSelection(args) {
  const selection = { changed: [], removed: [], submit: false, allowUnadvertisedSitemap: false, help: false };
  let dryRun = false;
  let selectedCount = 0;
  for (let i = 0; i < args.length; i++) {
    const argument = args[i];
    if (argument === '--submit') selection.submit = true;
    else if (argument === '--dry-run') dryRun = true;
    else if (argument === '--help') selection.help = true;
    else if (argument === '--allow-unadvertised-sitemap') selection.allowUnadvertisedSitemap = true;
    else {
      assert(['--url', '--urls', '--removed'].includes(argument), 'Unknown option; use --help');
      const value = args[++i];
      assert(value && !value.startsWith('--'), 'A URL selector requires a value');
      const values = argument === '--url' ? [value] : value.split(',');
      selectedCount += values.length;
      assert(selectedCount <= MAX_NOTIFICATION_URLS, `Select at most ${MAX_NOTIFICATION_URLS} URLs per notification`);
      selection[argument === '--removed' ? 'removed' : 'changed'].push(...values.map(validatePublicUrl));
    }
  }
  assert(!(dryRun && selection.submit), '--dry-run and --submit cannot be combined');
  selection.changed = [...new Set(selection.changed)];
  selection.removed = [...new Set(selection.removed)];
  assert(!selection.changed.some((url) => selection.removed.includes(url)), 'A URL cannot be both changed and removed');
  assert(!selection.submit || selectedCount > 0, '--submit requires explicitly selected changed or removed URLs');
  return selection;
}

export function selectAuditedUrls(selection, audit) {
  assert.equal(audit.origin, PUBLIC_ORIGIN, 'SEO audit must target https://utilibre.org');
  assert(Array.isArray(audit.urls) && audit.urls.length > 0 && audit.urls.length <= publicPaths.size, 'Unexpected audited sitemap size');
  const live = new Set(audit.urls.map(validatePublicUrl));
  assert(selection.changed.every((url) => live.has(url)), 'Every changed URL must pass the public sitemap audit');
  assert(selection.removed.every((url) => !live.has(url)), 'Remove retired URLs from the sitemap before notifying IndexNow');
  return [...selection.changed, ...selection.removed];
}

export function assertRemovedResponse(url, response) {
  validatePublicUrl(url);
  assert([404, 410].includes(response.status), 'A removed page must return HTTP 404 or 410; redirects and homepage fallbacks are not removals');
  assert(!response.redirected && response.url === url, 'Removal checks must not follow redirects');
}
