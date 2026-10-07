import { catalog, catalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import { accessText } from '../catalog/guidance';
import type { PublicConfig } from '../config';
import { translate, type Language } from '../i18n';
import { routePath } from '../routes';
import { actionButton, append, element, labelledInput, setStatus, statusRegion } from '../utilities/dom';
import { emptyToolkit, loadToolkit, moveTool, parseToolkit, readSharedFragment, resetToolkit, saveToolkit, shareFragment, toolkitLimit, type Collection } from '../utilities/toolkits';

export function renderMyUtilibre(lang: Language, config: PublicConfig, interactive = false): HTMLElement {
  const es = lang === 'es'; const txt = (en: string, spanish: string) => es ? spanish : en;
  const main = element('main', 'page-shell tool-page'); main.id = 'main-content'; main.tabIndex = -1;
  const header = element('header', 'page-header');
  append(header, element('h1', '', 'Mi Utilibre'.replace('Mi', es ? 'Mi' : 'My')),
    element('p', 'hero-lead', txt('Keep a useful selection of tools on this browser. No account, files or browsing history are stored here.', 'Guardá una selección útil de herramientas en este navegador. No se guardan cuentas, archivos ni historial de navegación.')));
  const help = element('a', '', txt('How to save and share a toolkit', 'Cómo guardar y compartir una colección')); help.href = `/${lang}/${es ? 'guias/mi-utilibre' : 'guides/my-utilibre'}`; header.append(help); main.append(header);
  if (!interactive) { main.append(element('p', 'notice', txt('Enable JavaScript to manage local collections. You can still use the catalogue and read the guide.', 'Activá JavaScript para gestionar colecciones locales. Podés usar el catálogo y leer la guía sin activarlo.'))); return main; }
  let state = emptyToolkit(lang); let persisted = true; let selected = state.start;
  try { const loaded = loadToolkit(localStorage, lang); state = loaded.value; persisted = !loaded.failed; selected = state.start; } catch { persisted = false; }
  const status = statusRegion(persisted ? txt('Saved only in this browser. Export a backup before clearing site data.', 'Se guarda solo en este navegador. Exportá una copia antes de borrar los datos del sitio.') : txt('Storage could not be read. Existing data has not been overwritten. Export your changes; saving may not persist.', 'No se pudo leer el almacenamiento. No se reemplazaron datos existentes. Exportá los cambios; puede que no se conserven.'));
  main.append(status);
  const sharedBox = element('section', 'section toolkit-shared'); const workspace = element('section', 'section toolkit-workspace'); main.append(sharedBox, workspace);
  const persist = () => {
    state.language = lang;
    try { persisted = saveToolkit(localStorage, state); } catch { persisted = false; }
    setStatus(status, persisted ? txt('Selection saved in this browser.', 'Selección guardada en este navegador.') : txt('Not saved: browser storage is unavailable or full. Export a backup before leaving.', 'No se guardó: el almacenamiento está bloqueado o lleno. Exportá una copia antes de salir.'), persisted ? 'success' : 'error');
  };
  function addCollection(c: Omit<Collection, 'id'>): void {
    if (state.collections.length >= 12 || state.collections.reduce((n,v) => n+v.tools.length,0) + c.tools.length > 256) { setStatus(status, txt('Limit reached: 12 collections and 256 pins. Remove an item first.', 'Límite alcanzado: 12 colecciones y 256 elementos. Quitá alguno primero.'), 'error'); return; }
    let id = 'collection-1'; let i = 1; while (state.collections.some(c => c.id === id)) id = `collection-${++i}`;
    state.collections.push({ ...c, tools: [...c.tools], id }); selected = id; persist(); draw('name');
  }
  function renderTools(target: HTMLElement, collection: Collection, editable: boolean): void {
    const list = element('ol', 'toolkit-list');
    if (!collection.tools.length) target.append(element('p', '', txt('No tools pinned yet. Choose a tool below to start.', 'Todavía no fijaste herramientas. Elegí una abajo para empezar.')));
    for (const [index, id] of collection.tools.entries()) {
      const entry = catalogEntry(id); const li = element('li'); li.dataset.toolId = id;
      const title = entry?.name[lang] || `${txt('Retired or unknown tool', 'Herramienta retirada o desconocida')}: ${id}`;
      const launch = entry && entryLaunch(entry, lang, config); const name = element(launch ? 'a' : 'span', 'toolkit-name', title);
      if (name instanceof HTMLAnchorElement && launch) { name.href = launch.href; name.target = '_blank'; name.rel = 'noopener noreferrer'; name.append(document.createTextNode(txt(' · new tab', ' · pestaña nueva'))); }
      li.append(name);
      if (entry) li.append(element('p', 'small-copy', `${accessText(entry, lang)} · ${translate(lang, `status.${entry.operationalStatus}`)}${launch ? '' : txt(' · Launch unavailable', ' · Acceso no disponible')}`));
      if (editable) {
        const controls = element('div', 'guide-actions');
        for (const direction of [-1, 1] as const) {
          const label = direction === -1 ? txt('Move up', 'Subir') : txt('Move down', 'Bajar'); const button = actionButton(label, true);
          button.dataset.direction = String(direction); button.setAttribute('aria-label', `${label}: ${title}`);
          button.disabled = direction === -1 ? index === 0 : index === collection.tools.length - 1;
          button.addEventListener('click', () => { moveTool(collection, id, direction); persist(); draw(); const row = workspace.querySelector(`[data-tool-id="${id}"]`); const moved = row?.querySelector<HTMLButtonElement>(`button[data-direction="${direction}"]`); (moved && !moved.disabled ? moved : row?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus(); }); controls.append(button);
        }
        const remove = actionButton(txt('Unpin', 'Quitar'), true); remove.setAttribute('aria-label', `${txt('Unpin', 'Quitar')}: ${title}`);
        remove.addEventListener('click', () => { collection.tools = collection.tools.filter(tool => tool !== id); persist(); draw(); workspace.querySelector<HTMLSelectElement>('#toolkit-add')?.focus(); }); controls.append(remove); li.append(controls);
      }
      list.append(li);
    }
    target.append(list);
  }
  try {
    const shared = readSharedFragment(window.location.hash);
    if (shared) {
      append(sharedBox, element('h2', '', txt('Shared collection preview', 'Vista previa de la colección compartida')), element('h3', '', shared.collection.label), element('p', '', txt('This link has not changed your collections. Its label and tool IDs are readable by anyone with the link. A fragment is not encryption.', 'Este enlace no cambió tus colecciones. Cualquiera con el enlace puede leer el nombre y las herramientas. El fragmento no es cifrado.')));
      renderTools(sharedBox, { ...shared.collection, id: 'preview' }, false);
      const save = actionButton(txt('Save a copy to my collections', 'Guardar una copia en mis colecciones'));
      save.addEventListener('click', () => { addCollection(shared.collection); }); sharedBox.append(save);
      const close = actionButton(txt('Close preview', 'Cerrar vista previa'), true); close.addEventListener('click', () => { history.replaceState({}, '', window.location.pathname); sharedBox.replaceChildren(); workspace.querySelector<HTMLElement>('#toolkit-collection')?.focus(); }); sharedBox.append(close);
    }
  } catch { append(sharedBox, element('h2', '', txt('Invalid shared collection', 'Colección compartida inválida')), element('p', '', txt('The link is malformed, unsupported or too large. Your saved selections were not changed. Ask for a new link or JSON export.', 'El enlace está mal formado, no es compatible o es demasiado grande. Tus selecciones no cambiaron. Pedí un enlace nuevo o un archivo JSON.'))); }
  function draw(focus?: 'name' | 'collection'): void {
    const wasOpen = workspace.querySelector<HTMLDetailsElement>('details')?.open || focus === 'name';
    workspace.replaceChildren();
    const current = state.collections.find(c => c.id === selected) || state.collections[0]!;
    const pickerLabel = element('label', '', txt('Collection', 'Colección')); pickerLabel.htmlFor = 'toolkit-collection';
    const picker = element('select'); picker.id = 'toolkit-collection';
    for (const c of state.collections) { const opt = element('option', '', c.label + (c.id === state.start ? txt(' (starting collection)', ' (colección inicial)') : '')); opt.value = c.id; picker.append(opt); }
    picker.value = current.id; picker.addEventListener('change', () => { selected = picker.value; draw(); workspace.querySelector<HTMLElement>('#toolkit-collection')?.focus(); });
    append(workspace, pickerLabel, picker, element('h2', '', current.label)); renderTools(workspace, current, true);
    const addLabel = element('label', '', txt('Choose a tool to pin', 'Elegí una herramienta para fijar')); addLabel.htmlFor = 'toolkit-add';
    const add = element('select'); add.id = 'toolkit-add';
    for (const entry of catalog.filter(e => e.id !== 'uptime-kuma' && !current.tools.includes(e.id))) { const option = element('option', '', entry.name[lang]); option.value = entry.id; add.append(option); }
    const pin = actionButton(txt('Pin tool', 'Fijar herramienta')); pin.disabled = !add.options.length || current.tools.length >= 64;
    pin.addEventListener('click', () => { if (catalogEntry(add.value) && !current.tools.includes(add.value) && state.collections.reduce((n,c) => n+c.tools.length,0) < 256) { current.tools.push(add.value); persist(); draw(); workspace.querySelector<HTMLElement>('#toolkit-add')?.focus(); } else setStatus(status, txt('Pin limit reached. Remove a tool first.', 'Llegaste al límite. Quitá una herramienta primero.'), 'error'); });
    const addRow = element('div', 'toolkit-add'); append(addRow, addLabel, add, pin); workspace.append(addRow);
    const settings = element('details', 'section'); settings.open = wasOpen; settings.append(element('summary', '', txt('Manage collections', 'Gestionar colecciones')));
    const name = labelledInput(txt('Collection name (up to 80 characters)', 'Nombre de la colección (hasta 80 caracteres)'), 'text', { value: current.label }); name.input.maxLength = 80;
    const rename = actionButton(txt('Rename', 'Cambiar nombre'), true); rename.addEventListener('click', () => { if (!name.input.value.trim() || [...name.input.value].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)) { setStatus(status, txt('Enter a name using ordinary text.', 'Escribí un nombre usando texto normal.'), 'error'); return; } current.label = name.input.value.trim(); persist(); draw('name'); });
    const create = actionButton(txt('Create another collection', 'Crear otra colección'), true); create.disabled = state.collections.length >= 12; create.addEventListener('click', () => addCollection({ label: txt('New collection', 'Nueva colección'), tools: [] }));
    const start = actionButton(txt('Use as starting collection', 'Usar como colección inicial'), true); start.disabled = current.id === state.start; start.addEventListener('click', () => { state.start = current.id; persist(); draw('collection'); });
    const remove = actionButton(txt('Delete this collection', 'Eliminar esta colección'), true); remove.disabled = state.collections.length === 1; remove.addEventListener('click', () => { if (!confirm(txt('Delete this tool selection? No application documents will be deleted.', '¿Eliminar esta selección? No se borran documentos de las aplicaciones.'))) return; state.collections = state.collections.filter(c => c.id !== current.id); if (state.start === current.id) state.start = state.collections[0]!.id; selected = state.start; persist(); draw('collection'); });
    append(settings, name.wrapper, rename, create, start, remove); workspace.append(settings);
    const sharing = element('section', 'section'); sharing.append(element('h2', '', txt('Share this collection', 'Compartir esta colección')));
    sharing.append(element('p', '', txt('Share only a harmless name and tool selections. Do not put private information in collection names. Anyone with the link can read it; recipients save it explicitly. Tool access rules still apply.', 'Compartí solo un nombre sin datos privados y una selección de herramientas. Cualquiera con el enlace puede leerlo; el destinatario decide si lo guarda. Siguen vigentes los requisitos de cada herramienta.')));
    const url = new URL(routePath('my', lang), config.publicPortalOrigin || window.location.origin); url.hash = shareFragment(current, lang);
    const link = labelledInput(txt('Collection link', 'Enlace de la colección'), 'text', { value: url.href }); link.input.readOnly = true;
    const copy = actionButton(txt('Copy link', 'Copiar enlace')); copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(url.href); setStatus(status, txt('Link copied.', 'Enlace copiado.'), 'success'); } catch { link.input.focus(); link.input.select(); setStatus(status, txt('Copy is blocked. Copy the selected link manually.', 'La copia está bloqueada. Copiá el enlace seleccionado manualmente.'), 'error'); } });
    append(sharing, link.wrapper, copy);
    const qr = catalogEntry('qr-offline'); const qrLaunch = qr && entryLaunch(qr, lang, config);
    if (qrLaunch) { const a = element('a', 'button button-secondary', txt('Open QR Tools, then paste the link · new tab', 'Abrir QR Tools y pegar el enlace · pestaña nueva')); a.href = qrLaunch.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; sharing.append(a); }
    sharing.append(element('p', 'small-copy', txt('QR handoff is manual; long collections make denser QR codes. Keep a readable link as an alternative.', 'El paso a QR es manual; las colecciones largas generan códigos más densos. Conservá el enlace como alternativa.')));
    workspace.append(sharing);
    if (focus === 'name') name.input.focus();
    if (focus === 'collection') picker.focus();
  }
  draw();
  const portability = element('section', 'section'); portability.append(element('h2', '', txt('Move between browsers', 'Pasar a otro navegador')));
  const download = actionButton(txt('Export all collections', 'Exportar todas las colecciones')); download.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = element('a'); a.href = url; a.download = 'utilibre-toolkit-v1.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  const upload = labelledInput(txt('Import collections (.json, up to 32 KB)', 'Importar colecciones (.json, hasta 32 KB)'), 'file', { accept: '.json,application/json' });
  const importButton = actionButton(txt('Import and replace collections', 'Importar y reemplazar colecciones'), true);
  importButton.addEventListener('click', async () => {
    const file = upload.input.files?.[0]; if (!file) { setStatus(status, txt('Choose a JSON export first.', 'Elegí primero un archivo JSON.'), 'error'); return; }
    try {
      if (file.size > toolkitLimit) throw new Error('size'); const incoming = parseToolkit(new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer()));
      if (!confirm(txt('Replace your collections with this export? Export your current selection first if needed. Application documents are not affected.', '¿Reemplazar tus colecciones con este archivo? Exportá primero las actuales si las necesitás. Los documentos de las aplicaciones no cambian.'))) return;
      state = incoming; selected = state.start; persist(); draw();
    } catch { setStatus(status, txt('Import rejected: malformed, oversized or unsupported format. Current collections were not changed.', 'Importación rechazada: formato inválido, demasiado grande o no compatible. Tus colecciones no cambiaron.'), 'error'); }
  });
  append(portability, element('p', '', txt('Exports contain selections, not documents or account access. Up to 12 collections, 64 tools each and 256 pins total. Unknown retired IDs stay visible until you remove them.', 'Se exportan selecciones, no documentos ni acceso a cuentas. Hasta 12 colecciones, 64 herramientas por colección y 256 elementos en total. Los ID retirados siguen visibles hasta que los quités.')), download, upload.wrapper, importButton); main.append(portability);
  const reset = actionButton(txt('Reset only toolkit preferences', 'Restablecer solo las colecciones'), true);
  reset.addEventListener('click', () => {
    if (!confirm(txt('Remove your collections from this browser? Export first if needed. This does not clear application files, drafts, theme or other sites.', '¿Borrar las colecciones de este navegador? Exportalas primero si las necesitás. No borra archivos, borradores, tema ni datos de otros sitios.'))) return;
    let ok = false; try { ok = resetToolkit(localStorage); } catch { /* denied storage */ }
    if (!ok) { setStatus(status, txt('Reset failed: browser storage is blocked. No deletion is confirmed.', 'No se pudo restablecer: almacenamiento bloqueado. No se confirmó ningún borrado.'), 'error'); return; }
    state = emptyToolkit(lang); selected = state.start; draw(); setStatus(status, txt('Toolkit preferences removed. Application documents were not touched.', 'Colecciones eliminadas. Los documentos de las aplicaciones no cambiaron.'), 'success');
  }); main.append(reset); return main;
}
