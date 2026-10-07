// Privacy/hosting adaptations, applied to the pinned upstream source in the
// disposable build context. Upstream implements every editing operation.
import { readFileSync, writeFileSync, cpSync, mkdirSync, rmSync, existsSync } from 'node:fs';
const [app, phase] = process.argv.slice(2);
const origins = { excalidraw: 'whiteboard', svgedit: 'svg', cyberchef: 'cyberchef', 'image-scrubber': 'scrub' };
if (!origins[app]) throw new Error('Unknown app');
function edit(path, before, after) {
  const original = readFileSync(path, 'utf8');
  if (typeof before === 'string' ? !original.includes(before) : !before.test(original)) throw new Error(`Patch drift: ${path}: ${before}`);
  writeFileSync(path, original.replace(before, after));
}
if (phase === 'package') {
  mkdirSync('site', { recursive: true });
  if (app === 'excalidraw') {
    cpSync('excalidraw-app/build', 'site', { recursive: true });
    cpSync('packages/excalidraw/fonts/Assistant', 'site/fonts/Assistant', { recursive: true });
  }
  if (app === 'svgedit') {
    cpSync('dist/editor', 'site', { recursive: true });
    for (const file of ['test', 'tests', 'xdomain-index.html', 'iife-index.html']) {
      if (existsSync(`site/${file}`)) rmSync(`site/${file}`, { recursive: true });
    }
    cpSync('licenseInfo.json', 'site/licenseInfo.json');
  }
  if (app === 'image-scrubber') for (const file of ['index.html', 'scripts', 'sw.js', 'scrubber_logo.svg', 'scrubber_logo.png', 'scrubber_logo_ios_homescreen.png']) cpSync(file, `site/${file}`, { recursive: true });
  cpSync(app === 'svgedit' ? 'LICENSE-MIT.txt' : 'LICENSE', 'site/LICENSE.txt');
  const origin = `https://${origins[app]}.utilibre.org`;
  const descriptions = {
    excalidraw: 'Draw diagrams and export PNG, SVG or editable drawings with Excalidraw on Utilibre. Browser-only editing; no hosted collaboration or account required.',
    svgedit: 'Create and edit SVG vector images in your browser with SVGEdit, hosted by Utilibre. Open local files and download your work without an account.',
    cyberchef: 'Decode, transform and analyse data in your browser with CyberChef on Utilibre. Network request operations are unavailable on this instance.',
    'image-scrubber': 'Cover sensitive parts of a photo and export a new PNG without the original EXIF metadata. Image Scrubber processes your image in your browser.'
  };
  let html = readFileSync('site/index.html', 'utf8')
    .replace(/<meta\b[^>]*(?:name\s*=\s*(?:"description"|'description'|description(?=[\s>]))|property\s*=\s*["']?og:[^\s>]+|name\s*=\s*["']?twitter:[^\s>]+)[^>]*>/gi, '')
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, '')
    .replace('</head>', `<meta name="description" content="${descriptions[app]}"><link rel="canonical" href="${origin}/"><meta property="og:url" content="${origin}/"></head>`);
  writeFileSync('site/index.html', html);
  writeFileSync('site/robots.txt', `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  writeFileSync('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc><lastmod>2026-10-07</lastmod></url></urlset>\n`);
  process.exit(0);
}
if (app === 'excalidraw') {
  // No public/cloud endpoints or analytics credentials in this local-only build.
  writeFileSync('.env.production', 'MODE=production\nVITE_APP_ENABLE_TRACKING=false\nVITE_APP_DISABLE_SENTRY=true\nVITE_APP_FIREBASE_CONFIG={}\n');
  const html = 'excalidraw-app/index.html';
  edit(html, /, maximum-scale=1, user-scalable=no/, '');
  edit(html, /\s*<link rel="preconnect"[^>]+>/g, '');
  edit(html, /<script>\s*\/\/ Redirect Excalidraw\+[\s\S]*?<\/script>/, '<script>window.EXCALIDRAW_ASSET_PATH = window.origin;</script>');
  edit(html, /<!-- 100% privacy friendly analytics -->[\s\S]*?<!-- end LEGACY GOOGLE ANALYTICS -->/, '');
  const main = 'excalidraw-app/App.tsx';
  edit(main, 'const isCollabDisabled = isRunningInIframe();', 'const isCollabDisabled = true;');
  edit(main, 'return isCollaborationLink(window.location.href);', 'return !isCollabDisabled && isCollaborationLink(window.location.href);');
  edit(main, 'const id = searchParams.get("id");', 'const id = import.meta.env.VITE_APP_BACKEND_V2_GET_URL ? searchParams.get("id") : null;');
  edit(main, 'const jsonBackendMatch = window.location.hash.match(', 'const jsonBackendMatch = import.meta.env.VITE_APP_BACKEND_V2_GET_URL && window.location.hash.match(');
  edit(main, 'const externalUrlMatch = window.location.hash.match(', 'const externalUrlMatch = import.meta.env.VITE_APP_BACKEND_V2_GET_URL && window.location.hash.match(');
  edit(main, 'let roomLinkData = getCollaborationLinkData(window.location.href);', 'let roomLinkData = import.meta.env.VITE_APP_WS_SERVER_URL ? getCollaborationLinkData(window.location.href) : null;');
  edit(main, '<Excalidraw\n', '<Excalidraw\n        aiEnabled={false}\n        validateEmbeddable={() => false}\n');
  edit(main, '              onExportToBackend,', '              onExportToBackend: undefined,');
  edit(main, 'renderCustomUI: excalidrawAPI', 'renderCustomUI: import.meta.env.VITE_APP_PLUS_EXPORT_PUBLIC_KEY && excalidrawAPI');
  edit(main, '{excalidrawAPI && (\n            <OverwriteConfirmDialog.Action', '{import.meta.env.VITE_APP_PLUS_EXPORT_PUBLIC_KEY && excalidrawAPI && (\n            <OverwriteConfirmDialog.Action');
  edit(main, '{excalidrawAPI && <AIComponents', '{import.meta.env.VITE_APP_AI_BACKEND && excalidrawAPI && <AIComponents');
  edit(main, '<TTDDialogTrigger />', '{import.meta.env.VITE_APP_AI_BACKEND && <TTDDialogTrigger />}');
  edit(main, /predicate: true,/g, 'predicate: Boolean(import.meta.env.VITE_APP_PLUS_APP),');
  edit(main, '<AppSidebar />', '{import.meta.env.VITE_APP_PLUS_APP && <AppSidebar />}');
  const menu = 'excalidraw-app/components/AppMainMenu.tsx';
  edit(menu, /      <MainMenu.ItemLink[\s\S]*?<\/MainMenu.ItemLink>/g, '');
  edit('excalidraw-app/components/AppWelcomeScreen.tsx', '{!isExcalidrawPlusSignedUser && (', '{import.meta.env.VITE_APP_PLUS_APP && !isExcalidrawPlusSignedUser && (');
  // Library files can still be opened locally; disable the external catalog link.
  edit('packages/excalidraw/components/LibraryMenuBrowseButton.tsx', '  return (', '  if (!import.meta.env.VITE_APP_LIBRARY_URL) return null;\n  return (');
  edit('excalidraw-app/vite.config.mts', 'sourcemap: true', 'sourcemap: false');
  edit('scripts/woff2/woff2-vite-plugins.js', 'https://excalidraw.nyc3.cdn.digitaloceanspaces.com/oss/', '/');
  edit('packages/excalidraw/fonts/ExcalidrawFontFace.ts', 'urls.push(new URL(assetUrl, ExcalidrawFontFace.ASSETS_FALLBACK_URL));', 'if (!urls.length) urls.push(new URL(assetUrl, window.location.origin));');
}
if (app === 'svgedit') {
  edit('src/editor/index.html', ', maximum-scale=1.0, user-scalable=no', '');
  edit('src/editor/index.html', 'allowInitialUserOverride: true,', `allowInitialUserOverride: false,
    preventAllURLConfig: true,
    preventURLContentLoading: true,
    lockExtensions: true,
    allowedOrigins: [],
    lang: new URLSearchParams(location.search).get('lang') === 'es' || (!new URLSearchParams(location.search).has('lang') && navigator.language.startsWith('es')) ? 'es' : 'en',`);
  edit('src/editor/index.html', /  if \(typeof XDOMAIN[\s\S]*?console.info\('xdomain config activated'\)\n  }/, '');
}
if (app === 'cyberchef') {
  edit('site/index.html', '</head>', '<script src="utilibre-local.js"></script></head>');
  // Same-origin decorative SVG needs no plugin/embedded browsing context.
  edit('site/index.html', /<object\b([^>]*id=(?:"bombe"|bombe)[^>]*)>[\s\S]*?<\/object>/, (_, attrs) => '<img' + attrs.replace(/\bdata=/, 'src=') + ' alt="">');
  edit('site/index.html', /There are three operations that make calls to external services,[\s\S]*?viewing the Network tab\./, 'Utilibre disables HTTP request, DNS over HTTPS and Show on map. RSA Verify is also unavailable pending an upstream signature-verification fix. A restrictive content security policy prevents third-party resource loading. Files and recipe inputs are processed in your browser. Explicitly shared recipe URLs can include input data; check them before sharing.');
  // Never leave stale upstream compressed HTML available beside changed HTML.
  for (const path of ['site/index.html.br', 'site/index.html.gz']) if (existsSync(path)) rmSync(path);
}
if (app === 'image-scrubber') {
  const file = 'scripts/openImage.js';
  edit(file, /exifInformationHolder.innerHTML =\s*"<center>No EXIF data found in image '" \+\s*file.name \+\s*"'.<br><br><\/center>";/, 'exifInformationHolder.textContent = "No EXIF data found in image: " + file.name;');
  edit(file, /exifScrollDiv.innerHTML =\s*file.name \+ '<pre>' \+ exifData \+ '<\/pre>';/, `exifScrollDiv.textContent = file.name;
                    var pre = document.createElement('pre');
                    pre.textContent = exifData;
                    exifScrollDiv.appendChild(pre);`);
  edit(file, 'function onFileChange(e) {', `var imageLoadToken = 0;
var imageReady = false;
function onFileChange(e) {
    var token = ++imageLoadToken;
    imageReady = false;
    var selected = e.target.files[0];
    function invalidImage() {
        if (token !== imageLoadToken) return;
        imageLoadToken += 1; // Ignore a late metadata callback after decode failure.
        imageReady = false;
        canvas.width = canvas.height = 1;
        document.getElementById('exifInformationHolder').style.display = 'block';
        document.getElementById('exifInformationHolder').textContent = 'Cannot open this image. Choose a valid JPEG, PNG, WebP or GIF up to 25 MiB and 64 megapixels.';
    }
    if (!selected) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(selected.type) || selected.size > 25 * 1024 * 1024) { invalidImage(); return; }`);
  edit(file, 'reader.onload = function (event) {', 'reader.onerror = invalidImage;\n    reader.onload = function (event) {\n        if (token !== imageLoadToken) return;');
  edit(file, 'img.onload = function () {', 'img.onerror = invalidImage;\n        img.onload = function () {\n            if (token !== imageLoadToken) return;\n            if (img.width * img.height > 64000000) { invalidImage(); return; }\n            imageReady = true;');
  edit(file, "filename = document.getElementById('file-input').value;", 'filename = selected.name;');
  edit(file, 'EXIF.getData(file, function () {', 'EXIF.getData(file, function () {\n            if (token !== imageLoadToken) return;');
  edit(file, '    fileInput.files = evt.dataTransfer.files;', '    if (!evt.dataTransfer.files.length) { evt.preventDefault(); return; }\n    fileInput.files = evt.dataTransfer.files;');
  edit('scripts/js.js', 'var painting = false;', 'var painting = "paint";');
  edit('scripts/js.js', 'paintFormElements[i].value == "blur"', 'paintFormElements[i].value == "paint"');
  edit('scripts/js.js', 'function saveImage() {', "function saveImage() {\n    if (!imageReady) { alert('Open a valid image before saving.'); return; }");
  edit('scripts/js.js', '            link.click();', '            link.click();\n            setTimeout(function () { URL.revokeObjectURL(link.href); }, 1000);');
  edit('scripts/js.js', 'EXIF data removed: you may now save the image', 'The downloaded PNG will exclude original EXIF metadata. The original file is unchanged.');
  edit('scripts/js.js', /event.changedTouches/g, 'e.changedTouches');
  edit('scripts/js.js', /event.target.ownerDocument/g, 'e.target.ownerDocument');
  edit('scripts/jscolor.js', "(new Function ('return (' + optsStr + ')'))()", 'JSON.parse(optsStr)');
  edit('scripts/jscolor.js', 'callback = new Function (thisObj.onFineChange);', "throw new Error('String callbacks are disabled; provide a function.');");
  edit('index.html', 'data-jscolor="{valueElement:null,value:\'000000\'}"', 'type="button" data-jscolor=\'{"valueElement":null,"value":"000000"}\'');
  edit('index.html', '<input id="file-input" type="file" />', '<input id="file-input" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />');
  edit('index.html', /value="blur"\s*checked/, 'value="blur"');
  edit('index.html', "{ scope: '/image-scrubber/' }", "{ scope: '/' }");
  edit('index.html', 'All processing happens directly in the browser- no information is stored or sent anywhere.', 'Your selected image is processed in your browser, not uploaded. Utilibre serves the application files. Save and check the exported PNG before sharing; your original file is unchanged.');
  edit('index.html', 'is fairly secure but sensitive information should be covered with the paint tool.', 'is not a guarantee of concealment. Use opaque paint over sensitive information and check the exported image.');
  edit('index.html', 'This is a tool for anonymizing photographs taken at protests.', 'This tool helps cover identifying details in photographs. It cannot guarantee anonymity: backgrounds, reflections and other visible details can still identify people or places.');
  edit('scripts/manifest.json', /\/image-scrubber\//g, '/');
  edit('sw.js', /\/image-scrubber\//g, '/');
  edit('sw.js', "const cacheName = 'offline';", "const cacheName = 'utilibre-scrubber-390b166-p1b';");
  edit('sw.js', "\t'/scripts/js.js',", "\t'/scripts/js.js',\n\t'/scripts/openImage.js',\n\t'/scripts/jscolor.js',\n\t'/scripts/manifest.json',\n\t'/scrubber_logo.png',\n\t'/scrubber_logo.svg',\n\t'/scrubber_logo_ios_homescreen.png',");
  edit('sw.js', "if (request.method === 'GET')", "if (request.method === 'GET' && new URL(request.url).origin === self.location.origin)");
}
