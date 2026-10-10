import { catalogEntry } from '../catalog/catalog.ts';
import { entryLaunch, immediatelyUsable } from '../catalog/discovery.ts';
import { accessText, privacyAnswers } from '../catalog/guidance.ts';
import type { PublicConfig } from '../config.ts';
import type { Language } from '../i18n/index.ts';
import { actionButton, append, element, setStatus, statusRegion } from '../utilities/dom.ts';
import { shareFragment } from '../utilities/toolkits.ts';
import { practicalGuidePath } from './guide-index.ts';
import { collectionPath, scenarioCollections, type ScenarioCollection } from './scenario-collection-data.ts';

export { collectionPath, scenarioCollections } from './scenario-collection-data.ts';

function link(href: string, label: string, className = ''): HTMLAnchorElement {
  const a = element('a', className, label); a.href = href; return a;
}
function section(title: string, text?: string): HTMLElement {
  const s = element('section', 'section prose'); s.append(element('h2', '', title));
  if (text) s.append(element('p', '', text));
  return s;
}
function guidePath(id: string, language: Language): string {
  return id === 'qr' ? `/${language}/${language === 'es' ? 'codigos-qr' : 'qr-codes'}` : practicalGuidePath(id, language);
}

/** Small task-led entry point reused on the homepage and guide index. */
export function renderCollectionLinks(language: Language): HTMLElement {
  const es = language === 'es';
  const s = section(es ? 'Herramientas para una situación concreta' : 'Tools for an everyday task');
  s.classList.add('collection-links');
  const list = element('ul', 'collection-links-list');
  for (const collection of scenarioCollections) {
    const li = element('li'); append(li, link(collectionPath(collection.id, language), collection.title[language]), element('p', '', collection.description[language])); list.append(li);
  }
  s.append(list); return s;
}

function renderExamplePreview(collection: ScenarioCollection, language: Language): HTMLElement {
  const es = language === 'es';
  const figure = element('figure', 'collection-preview');
  if (collection.id === 'documents') {
    const image = element('img'); image.src = '/examples/fictional-image.jpg'; image.width = 1200; image.height = 800;
    image.alt = es ? 'Imagen de práctica con detalles inventados; archivo original de 1200 por 800 píxeles.' : 'Practice image with fictional details; original 1200 by 800 pixel file.';
    figure.append(image);
  } else if (collection.id === 'workshop') {
    const list = element('dl', 'collection-workshop-notes');
    for (const [title, text] of (es ? [['Antes', 'Elegir un tema'], ['Durante', 'Practicar juntos'], ['Después', 'Guardar apuntes']] : [['Before', 'Choose a topic'], ['During', 'Practice together'], ['After', 'Save notes']])) append(list, element('dt', '', title), element('dd', '', text));
    figure.append(list);
  } else {
    const table = element('table', 'collection-sample-data');
    table.append(element('caption', '', es ? '26 respuestas ficticias' : '26 fictional responses'));
    const head = element('thead'); const row = element('tr');
    for (const label of (es ? ['Actividad', 'Respuestas'] : ['Activity', 'Responses'])) { const th = element('th', '', label); th.scope = 'col'; row.append(th); }
    head.append(row); table.append(head);
    const body = element('tbody');
    for (const [label, value] of (es ? [['Lectura', '12'], ['Práctica', '8'], ['Debate', '6']] : [['Reading', '12'], ['Practice', '8'], ['Discussion', '6']])) {
      const tr = element('tr'); const th = element('th', '', label); th.scope = 'row'; append(tr, th, element('td', '', value)); body.append(tr);
    }
    table.append(body); figure.append(table);
  }
  figure.append(element('figcaption', '', es ? 'Contenido del archivo ficticio de práctica; no es una captura de la aplicación ni un documento de un visitante.' : 'Content from the fictional practice file; not an application screenshot or a visitor document.'));
  return figure;
}

function saveCollectionLink(collection: ScenarioCollection, language: Language, secondary = false): HTMLAnchorElement {
  const es = language === 'es';
  const my = `/${language}/${es ? 'mi-utilibre' : 'my-utilibre'}`;
  return link(my + shareFragment({ id: collection.id, label: collection.title[language], tools: collection.tools.map(tool => tool.id) }, language), es ? 'Guardar colección en Mi Utilibre' : 'Save collection in My Utilibre', secondary ? 'button button-secondary' : 'button');
}

function renderSharing(collection: ScenarioCollection, language: Language, config: PublicConfig, interactive: boolean): HTMLElement {
  const es = language === 'es';
  const s = section(es ? 'Guardá esta selección o compartila' : 'Keep this selection or share it');
  const actions = element('div', 'guide-actions');
  const save = saveCollectionLink(collection, language);
  const copy = actionButton(es ? 'Copiar enlace de esta página' : 'Copy this page’s link', true);
  copy.hidden = !interactive;
  let url = collectionPath(collection.id, language);
  try { url = new URL(url, config.publicPortalOrigin).href; } catch { /* A missing public origin must not hide the collection. */ }
  const status = statusRegion('');
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const fallback = element('div', 'field'); fallback.hidden = true;
  const label = element('label', '', es ? 'Enlace de la colección' : 'Collection link'); label.htmlFor = `collection-url-${collection.id}`;
  const input = element('input'); input.id = label.htmlFor; input.type = 'url'; input.readOnly = true; input.value = url;
  append(fallback, label, input);
  copy.addEventListener('click', () => {
    void (async () => {
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard');
        await navigator.clipboard.writeText(url);
        setStatus(status, es ? 'Enlace copiado.' : 'Link copied.', 'success');
      } catch {
        fallback.hidden = false; input.focus(); input.select();
        setStatus(status, es ? 'Copiá manualmente el enlace seleccionado.' : 'Copy the selected link manually.');
      }
    })();
  });
  append(actions, save, copy); s.append(actions);
  append(s, element('p', '', es
    ? 'Primero verás una vista previa. Elegí «Guardar una copia en mis colecciones» para conservarla: no reemplaza tus selecciones. Se guardan accesos a herramientas, no documentos. Cualquiera puede leer esta colección pública.'
    : 'You will see a preview first. Choose “Save a copy to my collections” to keep it without replacing your selections. This saves tool shortcuts, not documents. Anyone can read this public collection.'), status, fallback);
  return s;
}

export function renderScenarioCollection(id: string, language: Language, config: PublicConfig, interactive = false): HTMLElement {
  const collection = scenarioCollections.find(item => item.id === id);
  if (!collection) throw new Error(`Unknown collection: ${id}`);
  const es = language === 'es';
  const main = element('main', 'page-shell task-guide tool-page scenario-collection'); main.id = 'main-content'; main.tabIndex = -1;
  const header = element('header', 'page-header');
  append(header, link(`/${language}/`, es ? 'Volver a las herramientas' : 'Back to tools'), element('h1', '', collection.title[language]), element('p', 'hero-lead', collection.description[language]));
  const allReady = collection.tools.every(tool => { const entry = catalogEntry(tool.id); return entry && immediatelyUsable(entry, config); });
  header.append(element('p', 'collection-access', allReady
    ? (es ? 'Estas herramientas no piden cuenta. Podés empezar con un archivo ficticio y guardar tu propia copia.' : 'These tools do not require an account. Start with a fictional file and save your own copy.')
    : (es ? 'Revisá el acceso indicado en cada herramienta: alguna puede no estar disponible ahora.' : 'Check each tool’s access information: some may be unavailable right now.')));
  const begin = element('div', 'guide-actions'); append(begin, link('#collection-example', es ? 'Probalo con un ejemplo' : 'Try a worked example', 'button'), link('#collection-tools', es ? 'Elegir una herramienta' : 'Choose a tool', 'button button-secondary'), saveCollectionLink(collection, language, true)); header.append(begin); main.append(header);

  const tools = section(es ? 'Elegí lo que necesitás' : 'Choose what you need'); tools.id = 'collection-tools';
  const list = element('ul', 'collection-tools-list');
  for (const selection of collection.tools) {
    const entry = catalogEntry(selection.id); if (!entry) continue;
    const li = element('li'); const launch = entryLaunch(entry, language, config);
    append(li, element('h3', '', entry.name[language]), element('p', '', selection.purpose[language]), element('p', 'collection-access', accessText(entry, language)));
    const actions = element('p', 'guide-links');
    if (launch) {
      const a = link(launch.href, `${entry.launchLabel?.[language] || entry.name[language]} · ${es ? 'pestaña nueva' : 'new tab'}`, 'button'); a.target = '_blank'; a.rel = 'noopener noreferrer'; actions.append(a);
    } else actions.append(element('span', 'notice', es ? 'No disponible por ahora' : 'Currently unavailable'));
    actions.append(link(guidePath(selection.guide, language), es ? 'Ver los pasos' : 'See the steps')); li.append(actions);
    const details = element('details', 'inventory-entry'); details.append(element('summary', '', `${es ? 'Datos y límites' : 'Data and limits'} · ${entry.upstreamProject}`));
    const dl = element('dl', 'privacy-answers'); for (const [question, answer] of privacyAnswers(entry, language)) append(dl, element('dt', '', question), element('dd', '', answer));
    append(details, dl, link(entry.upstreamSourceUrl, `${es ? 'Software libre' : 'Powered by'}: ${entry.upstreamProject} · ${entry.license}`)); li.append(details); list.append(li);
  }
  tools.append(list);

  const example = section(collection.example.title[language]); example.id = 'collection-example'; example.classList.add('collection-example');
  append(example, renderExamplePreview(collection, language), element('p', 'collection-result', collection.example.result[language]));
  const sample = link(`/examples/${collection.example.sample.replace('{lang}', language)}`, collection.example.sampleLabel[language], 'button button-secondary'); sample.setAttribute('download', ''); example.append(sample);
  const steps = element('ol'); for (const step of collection.example.steps[language]) steps.append(element('li', '', step)); example.append(steps, link(practicalGuidePath(collection.example.guide, language), es ? 'Seguir la guía completa' : 'Follow the complete guide')); main.append(example, tools);
  main.append(section(es ? 'Tus archivos y tu privacidad' : 'Your files and privacy', collection.privacy[language]), section(es ? 'Si usás un teléfono' : 'If you are using a phone', collection.mobile[language]), renderSharing(collection, language, config, interactive));
  const help = element('p', 'guide-links'); append(help, link(`/${language}/${es ? 'guias' : 'guides'}`, es ? 'Todas las guías' : 'All guides'));
  if (config.contactUrl) help.append(link(config.contactUrl, es ? 'Reportar un problema o sugerir una corrección' : 'Report a problem or suggest a correction'));
  main.append(help); return main;
}
