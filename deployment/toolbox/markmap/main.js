import { Transformer } from 'markmap-lib/no-plugins';
import { Markmap } from 'markmap-view';
import DOMPurify from 'dompurify';
import '@fontsource-variable/atkinson-hyperlegible-next';
import '@fontsource-variable/newsreader';

const copy = {
  en: {
    title: 'Turn an outline into a mind map', intro: 'Write headings and lists, preview your ideas, then download your work.',
    skip: 'Skip to the outline', language: 'Language', import: 'Import Markdown', markdown: 'Download outline', svg: 'Download SVG', clear: 'Clear outline',
    outline: 'Your outline', syntax: 'Use # for a title, ## for a branch and - for a list item. Indent list items with spaces.',
    remember: 'Keep a draft in this browser', persistence: 'Off by default. Download the outline to keep an editable backup. Clearing browser data deletes saved drafts.',
    preview: 'Mind map preview', fit: 'Fit map', empty: 'Write a title or import an outline to begin.',
    previewHelp: 'Drag to move and use the wheel or pinch to zoom. The editable outline also gives a text version of your map.',
    privacyTitle: 'Privacy, saving and supported Markdown',
    privacy: 'Your outline is processed on this device. This build does not upload it, load remote images or run imported scripts. Utilibre and its delivery providers receive connection metadata when serving the application; this is not an anonymity service.',
    limits: 'Headings, lists, emphasis and inline code are supported. Raw HTML, image loading, clickable links, frontmatter options, math extensions and custom scripts/styles are not enabled. This editor accepts up to 100,000 characters, 128 nesting levels and 2,000 map nodes to limit browser freezes.',
    exportHelp: 'Markdown is the editable backup. SVG is a picture with embedded text: reopen it in a modern browser to check it. Some image editors do not support this SVG text format. Keep sensitive downloads off shared devices. There is no cloud backup or share-by-link feature.',
    powered: 'Powered by', licenses: 'Licenses', source: 'Source and build recipe', guide: 'Starter guide',
    ready: 'Preview updated. Download your outline to keep it.', saved: 'Draft saved in this browser. Download a separate backup.',
    storageError: 'This browser could not update draft storage. An older draft may remain. Download your outline; clear this site’s data to remove stored drafts.',
    failure: 'The map could not be rendered. Try a smaller outline with simpler nesting; your text is still available to download.',
    limitError: 'This outline exceeds the editor limit (100,000 characters, 128 nesting levels or 2,000 nodes). Split it into smaller outlines.',
    importError: 'The file could not be opened. Choose a UTF-8 Markdown or plain-text file of at most 400 KB.',
    replace: 'Replace the current outline? Download it first if you need a copy.',
    cleared: 'Outline cleared. Any saved draft has been removed.', downloaded: 'Download requested. Reopen the saved file to check it.',
    mapTitle: 'Mind map of your outline', files: 'Files',
    example: '# Study plan (fictional)\n\n## Read\n- Choose a chapter\n- Write three questions\n\n## Practice\n- Solve an example\n- Check the answer\n\n## Review\n- Explain it in your own words\n- Save your notes\n',
  },
  es: {
    title: 'Convertí un esquema en un mapa mental', intro: 'Escribí títulos y listas, revisá tus ideas en el mapa y descargá tu trabajo.',
    skip: 'Ir al esquema', language: 'Idioma', import: 'Importar Markdown', markdown: 'Descargar esquema', svg: 'Descargar SVG', clear: 'Borrar esquema',
    outline: 'Tu esquema', syntax: 'Usá # para el título, ## para una rama y - para un elemento de lista. Usá espacios para anidar elementos.',
    remember: 'Conservar un borrador en este navegador', persistence: 'Desactivado al empezar. Descargá el esquema para guardar una copia editable. Borrar los datos del navegador elimina los borradores.',
    preview: 'Vista previa del mapa', fit: 'Ajustar mapa', empty: 'Escribí un título o importá un esquema para empezar.',
    previewHelp: 'Arrastrá para mover y usá la rueda o el gesto de pellizco para acercar. El esquema editable también ofrece una versión de texto del mapa.',
    privacyTitle: 'Privacidad, guardado y Markdown admitido',
    privacy: 'El esquema se procesa en este dispositivo. Esta versión no lo sube, no carga imágenes remotas ni ejecuta código importado. Utilibre y sus proveedores de distribución reciben metadatos de conexión al servir la aplicación; no es un servicio de anonimato.',
    limits: 'Admite títulos, listas, énfasis y código en línea. No habilita HTML, carga de imágenes, enlaces clicables, opciones de frontmatter, extensiones matemáticas ni scripts o estilos personalizados. El límite es de 100 000 caracteres, 128 niveles y 2000 nodos para reducir bloqueos del navegador.',
    exportHelp: 'Markdown es la copia editable. SVG es una imagen con texto incrustado: reabrila en un navegador moderno para revisarla. Algunos editores de imágenes no admiten este formato de texto SVG. No dejés descargas privadas en dispositivos compartidos. No hay respaldo en la nube ni enlaces para compartir.',
    powered: 'Funciona con', licenses: 'Licencias', source: 'Código y receta de compilación', guide: 'Guía para empezar',
    ready: 'Vista previa actualizada. Descargá el esquema para conservarlo.', saved: 'Borrador guardado en este navegador. Descargá una copia aparte.',
    storageError: 'El navegador no pudo actualizar el almacenamiento. Puede quedar un borrador anterior. Descargá el esquema; borrá los datos del sitio para eliminar borradores guardados.',
    failure: 'No se pudo dibujar el mapa. Probá un esquema más pequeño y menos anidado; todavía podés descargar tu texto.',
    limitError: 'El esquema supera el límite (100 000 caracteres, 128 niveles o 2000 nodos). Dividilo en esquemas más pequeños.',
    importError: 'No se pudo abrir el archivo. Elegí un Markdown o texto UTF-8 de hasta 400 KB.',
    replace: '¿Querés reemplazar el esquema actual? Descargalo primero si necesitás una copia.',
    cleared: 'Esquema borrado. Se eliminó cualquier borrador guardado.', downloaded: 'Descarga solicitada. Reabrí el archivo guardado para revisarlo.',
    mapTitle: 'Mapa mental de tu esquema', files: 'Archivos',
    example: '# Plan de estudio (ficticio)\n\n## Leer\n- Elegir un capítulo\n- Escribir tres preguntas\n\n## Practicar\n- Resolver un ejemplo\n- Comprobar la respuesta\n\n## Repasar\n- Explicarlo con tus palabras\n- Guardar las notas\n',
  },
};
const $ = (id) => document.getElementById(id);
const storageKey = 'utilibre-markmap-draft-v1';
const requested = new URL(location.href).searchParams.get('lang');
let lang = requested === 'en' || requested === 'es' ? requested : navigator.language.startsWith('es') ? 'es' : 'en';
let t = copy[lang];
let originalExample = t.example;
let timer;
let renderSequence = 0;
let currentRoot;
let busy = false;
let rerender = false;
let lastPersistedValue = null;
const input = $('outline');
const transformer = new Transformer([]); // No frontmatter, math, highlights or dynamic asset loading.
transformer.md.set({ html: false, linkify: false, maxNesting: 128 });
transformer.md.disable(['image', 'link', 'autolink']);
const map = Markmap.create('#map', {
  autoFit: true, duration: 0, maxWidth: 260, color: () => '#536c46',
  embedGlobalCSS: true,
});

function translate() {
  t = copy[lang];
  document.documentElement.lang = lang;
  document.title = `${t.title} · Utilibre`;
  $('language').value = lang;
  for (const el of document.querySelectorAll('[data-t]')) el.textContent = t[el.dataset.t];
  $('return').href = `https://utilibre.org/${lang}`;
  $('guide').href = lang === 'es' ? 'https://utilibre.org/es/guias/mapa-mental' : 'https://utilibre.org/en/guides/mind-map';
  $('map-title')?.replaceChildren(document.createTextNode(t.mapTitle));
  $('file-actions').setAttribute('aria-label', t.files);
}
function fail(message) { $('error').textContent = message; $('error').hidden = false; }
function clearError() { $('error').hidden = true; $('error').textContent = ''; }
function persist() {
  try {
    if ($('remember').checked && input.value) {
      localStorage.setItem(storageKey, input.value);
      lastPersistedValue = input.value;
    } else {
      localStorage.removeItem(storageKey);
      lastPersistedValue = null;
    }
    return true;
  } catch { fail(t.storageError); return false; }
}
function sanitizeTree(root) {
  let count = 0;
  const stack = [{ node: root, depth: 0 }];
  while (stack.length) {
    const { node, depth } = stack.pop();
    if (++count > 2000 || depth > 128) throw new RangeError('Map limit');
    // markmap-view uses innerHTML: only inert inline formatting may reach it.
    node.content = DOMPurify.sanitize(node.content || '', {
      ALLOWED_TAGS: ['strong', 'b', 'em', 'i', 'code', 's', 'del', 'br', 'sub', 'sup', 'mark'],
      ALLOWED_ATTR: [], ALLOW_DATA_ATTR: false, ALLOW_ARIA_ATTR: false,
    });
    // Never take styling, URLs or data-* configuration from input.
    delete node.payload;
    for (const child of node.children || []) stack.push({ node: child, depth: depth + 1 });
  }
}
async function render() {
  if (busy) { rerender = true; return; }
  busy = true;
  const sequence = ++renderSequence;
  clearError();
  // Saving/deleting drafts must not depend on the renderer accepting the text.
  const persisted = persist();
  $('status').textContent = '';
  $('svg').disabled = true;
  currentRoot = undefined;
  try {
    if (input.value.length > 100000) throw new RangeError('Input limit');
    const empty = !input.value.trim();
    $('empty').hidden = !empty;
    $('map').style.visibility = empty ? 'hidden' : 'visible';
    if (!empty) {
      const { root } = transformer.transform(input.value);
      sanitizeTree(root);
      await map.setData(root);
      await map.fit();
      if (sequence === renderSequence) { currentRoot = root; $('svg').disabled = false; }
    }
    if (persisted) $('status').textContent = $('remember').checked && input.value ? t.saved : t.ready;
  } catch (error) {
    $('map').style.visibility = 'hidden';
    fail(`${error instanceof RangeError ? t.limitError : t.failure}${persisted ? '' : ` ${t.storageError}`}`);
  }
  finally {
    busy = false;
    if (rerender) { rerender = false; void render(); }
  }
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('status').textContent = t.downloaded;
}
function exportSvg() {
  if (!currentRoot || busy) return;
  const svg = $('map').cloneNode(true);
  const group = $('map').querySelector('g');
  if (!group) return;
  const box = group.getBBox();
  svg.querySelector('g').removeAttribute('transform');
  svg.setAttribute('viewBox', `${box.x - 24} ${box.y - 24} ${box.width + 48} ${box.height + 48}`);
  svg.setAttribute('width', String(Math.ceil(box.width + 48)));
  svg.setAttribute('height', String(Math.ceil(box.height + 48)));
  svg.removeAttribute('style'); svg.removeAttribute('id'); svg.removeAttribute('aria-labelledby');
  svg.setAttribute('aria-label', t.mapTitle);
  // Export only inert picture content. CSS comes from a fixed upstream version, not the document.
  for (const el of svg.querySelectorAll('script, iframe, image, a, use')) el.remove();
  for (const el of [svg, ...svg.querySelectorAll('*')]) {
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || /^(?:xlink:)?href$|^src$|^srcdoc$/i.test(attr.name)) el.removeAttribute(attr.name);
    }
  }
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = '.markmap-foreign{color:#2c2c2a}svg{background:#f5efe3}';
  svg.prepend(style);
  download('mind-map.svg', new XMLSerializer().serializeToString(svg), 'image/svg+xml;charset=utf-8');
}

translate();
input.value = t.example;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved && saved.length <= 100000) { input.value = saved; $('remember').checked = true; lastPersistedValue = saved; }
} catch { /* In-memory editing and downloads remain available. */ }
input.addEventListener('input', () => { clearTimeout(timer); ++renderSequence; currentRoot = undefined; $('svg').disabled = true; timer = setTimeout(() => void render(), 250); });
$('remember').addEventListener('change', () => { clearError(); persist(); void render(); });
$('fit').addEventListener('click', () => void map.fit());
$('markdown').addEventListener('click', () => download('outline.md', input.value, 'text/markdown;charset=utf-8'));
$('svg').addEventListener('click', exportSvg);
$('clear').addEventListener('click', async () => {
  if (input.value && !confirm(t.replace)) return;
  input.value = ''; clearTimeout(timer); await render();
  if ($('error').hidden) $('status').textContent = t.cleared;
  input.focus();
});
$('import').addEventListener('click', () => { $('file').value = ''; $('file').click(); });
$('file').addEventListener('change', async () => {
  const file = $('file').files[0]; if (!file) return;
  if (file.size > 400000 || !/\.(md|markdown|txt)$/i.test(file.name)) { fail(t.importError); return; }
  try {
    const value = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
    if (value.length > 100000) { fail(t.limitError); return; }
    if (input.value && input.value !== originalExample && !confirm(t.replace)) return;
    input.value = value; clearTimeout(timer); await render(); input.focus();
  } catch { fail(t.importError); }
});
$('language').addEventListener('change', () => {
  const untouched = input.value === originalExample;
  lang = $('language').value; translate();
  if (untouched) input.value = t.example;
  originalExample = t.example;
  const url = new URL(location.href); url.searchParams.set('lang', lang); history.replaceState(null, '', url);
  void render();
});
window.addEventListener('beforeunload', (event) => {
  // A checked box is not proof of successful saving (quota/permission failures).
  // Download initiation also cannot prove that the user retained the file.
  if (input.value && input.value !== originalExample && input.value !== lastPersistedValue) { event.preventDefault(); event.returnValue = ''; }
});
let resizeFrame;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => { if (currentRoot && !busy) void map.fit(); });
}).observe($('map'));
void render();
