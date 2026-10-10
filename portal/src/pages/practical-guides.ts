import { catalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import { privacyAnswers } from '../catalog/guidance';
import { localizedServiceUrl } from '../catalog/locale-links';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { routePath } from '../routes';
import { actionButton, append, element } from '../utilities/dom';
import { practicalGuides, practicalGuidePath } from './practical-guide-data.ts';
import { shareFragment } from '../utilities/toolkits';
import { discoverGuides, featuredGuideIds, guideStarts } from './guide-discovery';
import { renderCollectionLinks } from './scenario-collections';

const link = (href: string, label: string) => { const a = element('a', '', label); a.href = href; return a; };
function section(title: string, text: string): HTMLElement {
  const s = element('section', 'section prose'); append(s, element('h2', '', title), element('p', '', text)); return s;
}
export function renderPracticalGuides(language: Language, config: PublicConfig, id?: string, interactive = false): HTMLElement {
  const es = language === 'es';
  const guide = practicalGuides.find((item) => item.id === id);
  const main = element('main', 'page-shell task-guide tool-page'); main.id = 'main-content'; main.tabIndex = -1;
  const header = element('header', 'page-header');
  const copy = guide?.copy[language];
  append(header, link(routePath(guide ? 'guides' : 'home', language), es ? (guide ? 'Todas las guías' : 'Volver a las herramientas') : (guide ? 'All guides' : 'Back to tools')),
    element('h1', '', copy?.title || (es ? 'Guías para terminar una tarea' : 'Guides for getting a task done')),
    element('p', 'hero-lead', copy?.intro || (es ? 'Seguí pasos concretos con ejemplos pequeños, revisá el resultado y guardá tu trabajo.' : 'Follow concrete steps with small examples, check the result and save your work.')));
  main.append(header);
  if (!guide || !copy) {
    const jump = element('p');
    jump.append(link('#all-guides', es ? 'Buscar en todas las guías' : 'Search all guides'));
    header.append(jump);
    const featured = section(es ? '¿Qué querés resolver?' : 'What would you like to do?', es ? 'Empezá con uno de estos recorridos y sus ejemplos de práctica.' : 'Start with one of these workflows and its practice example.');
    featured.classList.add('guide-featured');
    const starters = element('ul', 'guide-featured-list');
    for (const guideId of featuredGuideIds) {
      const start = guideStarts[guideId]![language];
      const item = element('li'); append(item, link(practicalGuidePath(guideId, language), start.title), element('p', '', start.result)); starters.append(item);
    }
    featured.append(starters); main.append(featured, renderCollectionLinks(language));
    const full = element('section', 'section'); full.id = 'all-guides';
    full.append(element('h2', '', es ? 'Todas las guías' : 'All guides'));
    const list = element('ol', 'guide-index');
    const rows = new Map<string, HTMLLIElement>();
    for (const item of discoverGuides(practicalGuides, language)) {
      const li = element('li'); li.dataset.guideId = item.id; append(li, link(practicalGuidePath(item.id, language), item.copy[language].title), element('p', '', item.copy[language].intro)); list.append(li); rows.set(item.id, li);
    }
    if (interactive) {
      const search = element('div', 'guide-index-search');
      const label = element('label', '', es ? 'Buscá una guía' : 'Find a guide'); label.setAttribute('for', 'guide-search');
      const input = element('input'); input.id = 'guide-search'; input.type = 'search'; input.maxLength = 160; input.autocomplete = 'off'; input.spellcheck = false;
      input.placeholder = es ? 'Por ejemplo: PDF, imagen, taller' : 'For example: PDF, image, workshop';
      const clear = actionButton(es ? 'Borrar búsqueda' : 'Clear search', true);
      const count = element('p', 'small-copy'); count.setAttribute('role', 'status'); count.setAttribute('aria-live', 'polite');
      const update = () => {
        const matches = discoverGuides(practicalGuides, language, input.value);
        const visible = new Set(matches.map(item => item.id));
        for (const [guideId, row] of rows) row.hidden = !visible.has(guideId);
        for (const item of matches) list.append(rows.get(item.id)!);
        count.textContent = matches.length === 1 ? (es ? '1 guía' : '1 guide') : matches.length ? (es ? `${matches.length} guías` : `${matches.length} guides`) : (es ? 'Sin resultados. Probá otra palabra o borrá la búsqueda.' : 'No matches. Try another word or clear the search.');
        clear.disabled = !input.value;
      };
      input.addEventListener('input', update);
      clear.addEventListener('click', () => { input.value = ''; update(); input.focus(); });
      append(search, label, input, clear, count, element('p', 'small-copy', es ? 'La búsqueda filtra esta página en tu navegador; no se envía ni se guarda.' : 'Search filters this page in your browser; it is not sent or saved.'));
      full.append(search); update();
    }
    full.append(list); main.append(full);
    const references = section(es ? 'Referencias rápidas' : 'Quick references', es ? 'También podés consultar las guías de PDF y códigos QR.' : 'You can also use the PDF and QR code references.');
    const links = element('p', 'guide-links'); append(links, link(routePath('pdf', language), 'PDF / OCR'), link(routePath('qr', language), es ? 'Códigos QR' : 'QR codes'), link(routePath('offline', language), es ? 'Preparar herramientas sin conexión' : 'Prepare tools offline')); references.append(links); main.append(references);
    return main;
  }
  const start = guideStarts[guide.id]?.[language];
  const startBox = start ? section(es ? 'Empezá con el ejemplo' : 'Start with the example', start.result) : null;
  if (startBox && start) {
    startBox.classList.add('guide-quick-start'); startBox.id = 'practice';
    const example = element('figure', 'guide-result-example');
    if (guide.id === 'image') {
      const image = element('img'); image.src = '/examples/fictional-image.jpg'; image.width = 1200; image.height = 800;
      image.alt = es ? 'Imagen de práctica con detalles ficticios, antes de cambiar sus dimensiones.' : 'Practice image with fictional details, before resizing.';
      image.loading = 'lazy'; example.append(image);
    }
    append(example, element('figcaption', '', es ? 'Resultado buscado con datos ficticios' : 'Target result using fictional data'), element('p', '', start.example));
    startBox.append(example); main.append(startBox);
  } else main.append(section(es ? 'Antes de empezar' : 'Before you start', copy.prerequisites));
  const actions = element('div', 'guide-actions');
  for (const tool of guide.tools) {
    const entry = catalogEntry(tool.id); const launch = entry && entryLaunch(entry, language, config);
    if (!launch) { actions.append(element('p', 'notice', `${tool.label[language]}: ${es ? 'no disponible por ahora' : 'currently unavailable'}`)); continue; }
    const a = link(tool.path ? localizedServiceUrl(entry!.providerId, launch.href, language, tool.path) : launch.href,
      `${tool.label[language]} · ${es ? 'pestaña nueva' : 'new tab'}`);
    a.className = 'button'; a.target = '_blank'; a.rel = 'noopener noreferrer'; actions.append(a);
  }
  (startBox || main).append(actions);
  for (const destination of guide.portalLinks || []) { const a = link(destination[language], destination.label[language]); a.className = 'button'; actions.append(a); }
  if (guide.tools.length) {
    const a = link(routePath('my', language) + shareFragment({ id: 'guide', label: copy.title.slice(0, 80), tools: [...new Set(guide.tools.map(t => t.id))] }, language), es ? 'Guardar estas herramientas en Mi Utilibre' : 'Save these tools in My Utilibre');
    a.className = 'guide-save-collection';
    (startBox || main).append(a);
  }
  if (guide.samples.length) {
    const samples = section(es ? 'Archivos de práctica' : 'Practice files', guide.sampleNote?.[language] || (es ? 'Creados por Utilibre, con datos ficticios. No contienen documentos de visitantes.' : 'Created by Utilibre using fictional data. These are not visitor documents.'));
    if (startBox) {
      const heading = samples.querySelector('h2')!;
      heading.replaceWith(element('h3', '', heading.textContent || ''));
      samples.classList.remove('section'); samples.classList.add('guide-practice-files');
    } else samples.id = 'practice';
    for (const sample of guide.samples) {
      const a = link(`/examples/${sample.file.replace('{lang}', language)}`, sample.label[language]); a.setAttribute('download', ''); samples.append(a);
    }
    (startBox || main).append(samples);
  }
  if (startBox && start) {
    startBox.append(element('h3', '', es ? 'El recorrido en breve' : 'The steps at a glance'));
    const overview = element('ol', 'guide-step-overview'); for (const item of start.overview) overview.append(element('li', '', item)); startBox.append(overview);
    const device = element('details', 'guide-device-note');
    append(device, element('summary', '', es ? 'En un teléfono o con conexión lenta' : 'On a phone or a slower connection'), element('p', '', start.device), element('p', 'small-copy', es ? 'Estas indicaciones no certifican compatibilidad con todos los teléfonos. Probá el archivo pequeño, reabrí la descarga y conservá el original. Compartí desde el menú del dispositivo solo después de revisar el resultado.' : 'These notes do not certify compatibility with every phone. Try the small file, reopen the download and keep the original. Use your device’s share menu only after checking the result.'));
    startBox.append(device);
    main.append(section(es ? 'Antes de empezar' : 'Before you start', copy.prerequisites));
  }
  const steps = section(es ? 'Paso a paso' : 'Step by step', es ? 'La herramienta se abre en otra pestaña para que conservés esta guía. Si un control aparece en inglés, mantenemos su nombre para que lo encontrés.' : 'The tool opens in another tab so you can keep this guide. If a control appears in English, we use its on-screen name so you can find it.');
  steps.id = 'steps';
  const list = element('ol'); for (const text of copy.steps) list.append(element('li', '', text)); steps.append(list); main.append(steps);
  main.append(section(es ? 'Comprobá el resultado' : 'Check the result', copy.success), section(es ? 'Si algo no funciona' : 'Troubleshooting', copy.troubleshooting));
  const privacy = section(es ? 'Tus datos en este recorrido' : 'Your data in this workflow', copy.privacy);
  const distinctTools = guide.tools.filter((tool, index, tools) => tools.findIndex(other => other.id === tool.id) === index);
  for (const tool of distinctTools) {
    const entry = catalogEntry(tool.id); if (!entry) continue;
    const details = element('details', 'inventory-entry'); details.append(element('summary', '', `${es ? 'Datos y límites' : 'Data and limitations'} · ${entry.upstreamProject}`));
    const dl = element('dl', 'privacy-answers'); for (const [question, answer] of privacyAnswers(entry, language)) append(dl, element('dt', '', question), element('dd', '', answer)); details.append(dl); privacy.append(details);
  }
  main.append(privacy, section(es ? 'Después' : 'Next', copy.next));
  const related = element('nav', 'guide-links'); related.setAttribute('aria-label', es ? 'Otras guías' : 'Other guides');
  const toolIds = new Set(guide.tools.map(tool => tool.id));
  for (const item of practicalGuides.filter(item => item.id !== id && item.tools.some(tool => toolIds.has(tool.id))).slice(0, 3)) {
    related.append(link(practicalGuidePath(item.id, language), item.copy[language].title));
  }
  related.append(link(routePath('guides', language), es ? 'Todas las guías' : 'All guides'));
  main.append(related);
  const reviewedOn = guide.reviewedOn || '2026-10-07';
  const responsibility = section(es ? 'Revisión y ayuda' : 'Review and help', es
    ? `Utilibre mantiene estas instrucciones. Revisión: ${reviewedOn}, con ejemplos y navegadores de prueba. No demuestra compatibilidad con cualquier dispositivo ni un historial de disponibilidad. Descargá el trabajo importante: borrar datos del navegador puede eliminar borradores y preferencias.`
    : `Utilibre maintains these instructions. Reviewed: ${reviewedOn}, using examples and test browsers. This does not establish compatibility with every device or an uptime history. Download important work: clearing browser data can remove drafts and preferences.`);
  const sources = element('p', 'guide-links');
  for (const reference of guide.references || []) { const a = link(reference.url, reference.label[language]); a.rel = 'noreferrer'; sources.append(a); }
  for (const tool of distinctTools) { const entry = catalogEntry(tool.id); if (entry) sources.append(link(entry.upstreamSourceUrl, `${entry.upstreamProject} · ${es ? 'código fuente' : 'source'}`)); }
  if (config.contactUrl) sources.append(link(config.contactUrl, es ? 'Reportar un error o proponer una corrección' : 'Report a problem or suggest a correction'));
  responsibility.append(sources, element('p', '', es ? 'Podés imprimir esta guía desde el navegador.' : 'You can print this guide from your browser.')); main.append(responsibility);
  return main;
}
