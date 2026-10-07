// Reproducible integration/privacy changes applied only inside the build context.
// Upstream task implementations remain upstream code. Exact source revisions
// and this recipe are distributed together in each public source bundle.
import { readFileSync, writeFileSync, cpSync, mkdirSync } from 'node:fs';

const [app, phase] = process.argv.slice(2);
if (!['zip-manager', 'rawgraphs', 'audiomass', 'minipaint'].includes(app)) throw new Error('Unknown application');
function edit(path, before, after) {
  const original = readFileSync(path, 'utf8');
  if (typeof before === 'string' ? !original.includes(before) : !before.test(original)) throw new Error(`Patch drift: ${path}`);
  writeFileSync(path, original.replace(before, after));
}
if (phase === 'package') {
  mkdirSync('site', { recursive: true });
  if (app === 'minipaint') {
    for (const path of ['index.html', 'dist', 'images', 'src']) cpSync(path, `site/${path}`, { recursive: true });
  } else cpSync(app === 'audiomass' ? 'src' : 'build', 'site', { recursive: true });
  cpSync(app === 'minipaint' ? 'MIT-LICENSE.txt' : app === 'zip-manager' ? 'LICENSE.txt' : 'LICENSE', 'site/LICENSE.txt');
  if (app === 'audiomass') cpSync('THIRD_PARTY_NOTICES.md', 'site/THIRD_PARTY_NOTICES.txt');
  const origin = { 'zip-manager': 'https://zip.utilibre.org', rawgraphs: 'https://charts.utilibre.org', audiomass: 'https://audio.utilibre.org', minipaint: 'https://paint.utilibre.org' }[app];
  const description = { 'zip-manager': 'Create, open and extract ZIP archives in your browser with ZIP Manager, hosted by Utilibre. No account required.', rawgraphs: 'Create charts from CSV and spreadsheet data in your browser with RAWGraphs, hosted by Utilibre. No account required.', audiomass: 'Edit recordings and mix audio tracks in your browser with AudioMass, hosted by Utilibre. No account required.', minipaint: 'Create and edit images with layers, drawing tools and filters in miniPaint, hosted by Utilibre. No account required.' }[app];
  const html = readFileSync('site/index.html', 'utf8')
    .replace(/<meta\b[^>]*(?:name="description"|property="og:url")[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '')
    .replace('</head>', `<meta name="description" content="${description}"><link rel="canonical" href="${origin}/"><meta property="og:url" content="${origin}/"></head>`);
  writeFileSync('site/index.html', html);
  writeFileSync('site/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  writeFileSync('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc><lastmod>2026-10-07</lastmod></url></urlset>\n`);
  process.exit(0);
}
if (app === 'zip-manager') {
  edit('src/zip-manager/services/i18n-service.js', 'function getLanguageId() {', `function getLanguageId() {
  const requested = new URLSearchParams(window.location.search).get('lang');
  if (requested === 'es') return 'es-ES';
  if (requested === 'en') return 'en-US';
  if (navigator.language.startsWith('es')) return 'es-ES';`);
}
if (app === 'audiomass') {
  edit('src/index.html', /, minimum-scale=1, maximum-scale=1, user-scalable=no/, '');
  edit('src/index.html', /https:\/\/audiomass\.co\//g, '/');
}
if (app === 'minipaint') {
  edit('index.html', /, maximum-scale=1\.0, user-scalable=0/, '');
  edit('index.html', /https:\/\/viliusle\.github\.io\/miniPaint\//g, '/');
  edit('src/js/config.js', /config\.pixabay_key = .*;/, "config.pixabay_key = '';");
  edit('src/js/config.js', /config\.google_webfonts_key = .*;/, "config.google_webfonts_key = '';");
  edit('src/js/config.js', /config\.FONTS = \[[\s\S]*?\];/, 'config.FONTS = ["Arial", "Courier", "Impact", "Helvetica", "Monospace", "Tahoma", "Times New Roman", "Verdana"];');
  edit('src/js/config.js', "'', '[Add Font...]',", "'',");
  edit('src/js/tools/text.js', 'function load_font_family({ family, variants }, successCallback) {', `function load_font_family({ family, variants }, successCallback) {
  // Only device fonts are available; imported projects cannot fetch remote fonts.
  if (!config.FONTS.includes(family)) { if (successCallback) successCallback(); return; }`);
  // miniPaint already supports its native ?lang=en|es query parameter.
  edit('src/js/config-menu.js', /\{\s*name: 'Open URL',[\s\S]*?target: 'file\/open\.open_url'\s*\},/, '');
  edit('src/js/config-menu.js', /\{\s*name: 'Search Images',[\s\S]*?target: 'file\/open\.search'\s*\},/, '');
  edit('src/js/config-menu.js', /\{\s*name: 'Open from Webcam',[\s\S]*?target: 'file\/open\.open_webcam'\s*\},/, '');
}
if (app === 'rawgraphs') {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  pkg.resolutions = { ...pkg.resolutions, lodash: '4.18.1', 'lodash-es': '4.18.1', 'd3-color': '3.1.0', '@babel/runtime': '7.29.10' };
  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
  // D3's object parser uses Function(); its native row parser does not.
  // Keep the strict CSP while preserving CSV quoting and delimiter handling.
  edit('src/hooks/useDataLoaderUtils/parser.js', "import { dsvFormat } from 'd3'\nimport { DefaultSeparator, separatorsList } from '../../constants'", `import { dsvFormat as nativeDsvFormat } from 'd3'
import { DefaultSeparator, separatorsList } from '../../constants'
function dsvFormat(separator) {
  return { parse(text) {
    const rows = nativeDsvFormat(separator).parseRows(text);
    const columns = rows.shift() || [];
    const records = rows.map(row => Object.fromEntries(columns.map((column, i) => [column, row[i] || ''])));
    records.columns = columns;
    return records;
  }};
}`);
  edit('public/index.html', /\s*<!-- Global site tag[\s\S]*?<\/script>\s*<script>[\s\S]*?<\/script>/, '');
  edit('public/index.html', 'Web site created using create-react-app', 'Create charts from CSV and spreadsheet data in your browser with RAWGraphs, hosted by Utilibre.');
  edit('src/App.js', /import CookieConsent from 'react-cookie-consent'\n/, '');
  edit('src/App.js', '  deserializeProject,\n', '');
  edit('src/App.js', /\s*<CookieConsent[\s\S]*?<\/CookieConsent>/, '');
  edit('src/App.js', /  useEffect\(\(\) => \{\n    const projectUrlStr[\s\S]*?\n  \}, \[\]\)/, '  // Utilibre: remote project imports are disabled; open a local project instead.');
  edit('src/components/DataLoader/DataLoader.js', '  ]\n  const [optionIndex', "  ].filter((option) => !['sparql', 'url'].includes(option.id))\n  const [optionIndex");
  edit('src/components/ChartSelector/ChartSelector.js', /\s*<Col xs=\{4\} className=\{`p-3`\}>[\s\S]*?Load custom chart[\s\S]*?<\/Col>/, '');
  edit('src/components/ChartSelector/ChartSelector.js', 'BsLink, BsPlus', 'BsLink');
  // Disable executable custom-chart imports, including saved-project imports.
  // Built-in charts and ordinary RAWGraphs projects continue to work.
  writeFileSync('src/hooks/useSafeCustomCharts.js', `const empty = [];
const disabled = async () => { throw new Error('Custom executable charts are disabled on this instance.'); };
const methods = { toConfirmCustomChart: null, confirmCustomChartLoad: disabled, abortCustomChartLoad: () => {}, uploadCustomCharts: disabled, loadCustomChartsFromUrl: disabled, loadCustomChartsFromNpm: disabled, importCustomChartFromProject: disabled, removeCustomChart: () => {}, exportCustomChart: disabled };
export default function useSafeCustomCharts() { return [empty, methods]; }
`);
}
