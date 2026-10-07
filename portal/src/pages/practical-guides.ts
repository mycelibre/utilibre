import { catalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import { privacyAnswers } from '../catalog/guidance';
import { localizedServiceUrl } from '../catalog/locale-links';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { routePath } from '../routes';
import { append, element } from '../utilities/dom';
import { practicalGuides, practicalGuidePath } from './practical-guide-data';

const link = (href: string, label: string) => { const a = element('a', '', label); a.href = href; return a; };
function section(title: string, text: string): HTMLElement {
  const s = element('section', 'section prose'); append(s, element('h2', '', title), element('p', '', text)); return s;
}
export function renderPracticalGuides(language: Language, config: PublicConfig, id?: string): HTMLElement {
  const es = language === 'es';
  const guide = practicalGuides.find((item) => item.id === id);
  const main = element('main', 'page-shell task-guide tool-page'); main.id = 'main-content'; main.tabIndex = -1;
  const header = element('header', 'page-header');
  const copy = guide?.copy[language];
  append(header, link(routePath(guide ? 'guides' : 'home', language), es ? (guide ? 'Todas las guías' : 'Volver a las herramientas') : (guide ? 'All guides' : 'Back to tools')),
    element('h1', '', copy?.title || (es ? 'Guías para terminar una tarea' : 'Guides for getting a task done')),
    element('p', 'hero-lead', copy?.intro || (es ? 'Practicá con archivos ficticios. Seguí pasos concretos, revisá el resultado y guardá tu trabajo.' : 'Practice with fictional files. Follow concrete steps, check the result and save your work.')));
  main.append(header);
  if (!guide || !copy) {
    const list = element('ol', 'guide-index');
    for (const item of practicalGuides) {
      const li = element('li'); append(li, link(practicalGuidePath(item.id, language), item.copy[language].title), element('p', '', item.copy[language].intro)); list.append(li);
    }
    main.append(list);
    const references = section(es ? 'Referencias rápidas' : 'Quick references', es ? 'También podés consultar las guías de PDF y códigos QR.' : 'You can also use the PDF and QR code references.');
    const links = element('p', 'guide-links'); append(links, link(routePath('pdf', language), 'PDF / OCR'), link(routePath('qr', language), es ? 'Códigos QR' : 'QR codes')); references.append(links); main.append(references);
    return main;
  }
  main.append(section(es ? 'Antes de empezar' : 'Before you start', copy.prerequisites));
  const actions = element('div', 'guide-actions');
  for (const tool of guide.tools) {
    const entry = catalogEntry(tool.id); const launch = entry && entryLaunch(entry, language, config);
    if (!launch) { actions.append(element('p', 'notice', `${tool.label[language]} — ${es ? 'no disponible por ahora' : 'currently unavailable'}`)); continue; }
    const a = link(tool.path ? localizedServiceUrl(entry!.providerId, launch.href, language, tool.path) : launch.href,
      `${tool.label[language]} · ${es ? 'pestaña nueva' : 'new tab'}`);
    a.className = 'button'; a.target = '_blank'; a.rel = 'noopener noreferrer'; actions.append(a);
  }
  main.append(actions);
  if (guide.samples.length) {
    const samples = section(es ? 'Archivos de práctica' : 'Practice files', es ? 'Creados por Utilibre, con datos ficticios. No contienen documentos de visitantes.' : 'Created by Utilibre using fictional data. These are not visitor documents.');
    for (const sample of guide.samples) {
      const a = link(`/examples/${sample.file.replace('{lang}', language)}`, sample.label[language]); a.setAttribute('download', ''); samples.append(a);
    }
    main.append(samples);
  }
  const steps = section(es ? 'Paso a paso' : 'Step by step', es ? 'Si un control aparece en inglés, conservamos su nombre para que lo podás encontrar. Usamos la traducción nativa cuando está disponible.' : 'English control names are retained where useful to find them. Native application localization is used when available.');
  const list = element('ol'); for (const text of copy.steps) list.append(element('li', '', text)); steps.append(list); main.append(steps);
  main.append(section(es ? 'Comprobá el resultado' : 'Check the result', copy.success), section(es ? 'Si algo no funciona' : 'Troubleshooting', copy.troubleshooting));
  const privacy = section(es ? 'Tus datos en este recorrido' : 'Your data in this workflow', copy.privacy);
  for (const tool of guide.tools) {
    const entry = catalogEntry(tool.id); if (!entry) continue;
    const details = element('details', 'inventory-entry'); details.append(element('summary', '', `${es ? 'Datos y límites' : 'Data and limitations'} · ${entry.upstreamProject}`));
    const dl = element('dl', 'privacy-answers'); for (const [question, answer] of privacyAnswers(entry, language)) append(dl, element('dt', '', question), element('dd', '', answer)); details.append(dl); privacy.append(details);
  }
  main.append(privacy, section(es ? 'Después' : 'Next', copy.next));
  const related = element('nav', 'guide-links'); related.setAttribute('aria-label', es ? 'Otras guías' : 'Other guides');
  for (const item of practicalGuides.filter((item) => item.id !== id)) related.append(link(practicalGuidePath(item.id, language), item.copy[language].title));
  main.append(related);
  const responsibility = section(es ? 'Revisión y ayuda' : 'Review and help', es
    ? 'Utilibre mantiene estas instrucciones. Revisadas el 7 de octubre de 2026 con archivos ficticios y navegadores de prueba. No demuestra compatibilidad con cualquier dispositivo ni un historial de disponibilidad. Descargá el trabajo importante: borrar datos del navegador puede eliminar borradores y preferencias.'
    : 'Utilibre maintains these instructions. Reviewed on 7 October 2026 using fictional files and test browsers. This does not establish compatibility with every device or an uptime history. Download important work: clearing browser data can remove drafts and preferences.');
  const sources = element('p', 'guide-links');
  for (const tool of guide.tools) { const entry = catalogEntry(tool.id); if (entry) sources.append(link(entry.upstreamSourceUrl, `${entry.upstreamProject} · ${es ? 'código fuente' : 'source'}`)); }
  if (config.contactUrl) sources.append(link(config.contactUrl, es ? 'Reportar un error o proponer una corrección' : 'Report a problem or suggest a correction'));
  responsibility.append(sources, element('p', '', es ? 'Podés imprimir esta guía desde el navegador.' : 'You can print this guide from your browser.')); main.append(responsibility);
  return main;
}
