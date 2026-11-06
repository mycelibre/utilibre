import type { Language } from '../i18n';
import { append, element } from '../utilities/dom';
import { resumeExamples } from './resume-examples';

export function renderResumeExamples(language: Language): HTMLElement {
  const es = language === 'es';
  const section = element('section', 'section prose'); section.id = 'cv-examples';
  append(section, element('h2', '', es ? 'Tres ejemplos de currículum para Guatemala' : 'Three résumé examples for Guatemala'),
    element('p', '', es ? 'Son perfiles ficticios para practicar, no modelos oficiales. Descargá un PDF para ver el resultado o un TXT para adaptar el texto. No se carga ningún ejemplo sobre tu borrador.' : 'These are fictional practice profiles, not official forms. Download a PDF to see the result or a TXT to adapt the text. Opening an example does not replace your draft.'));
  for (const example of resumeExamples[language]) {
    const item = element('section'); item.id = `cv-${example.id}`;
    append(item, element('h3', '', example.title), element('p', '', example.advice));
    const links = element('p', 'guide-links');
    for (const format of ['pdf', 'txt']) {
      const a = element('a', '', `${format === 'pdf' ? (es ? 'Descargar ejemplo PDF' : 'Download example PDF') : (es ? 'Descargar texto editable' : 'Download editable text')} · ${example.title}`);
      a.href = `/examples/cv/${example.id}-${language}.${format}`; a.download = ''; links.append(a);
    }
    const details = element('details', 'guide-device-note');
    append(details, element('summary', '', es ? 'Leer el texto del ejemplo' : 'Read the example text'), element('p', '', example.name), element('p', '', example.summary), element('p', '', example.education), element('p', '', example.experience));
    const activities = element('ul'); for (const line of example.activities) activities.append(element('li', '', line)); details.append(activities);
    details.append(element('p', '', `${es ? 'Habilidades' : 'Skills'}: ${example.skills.join(' ')}`));
    append(item, links, details); section.append(item);
  }
  return section;
}
