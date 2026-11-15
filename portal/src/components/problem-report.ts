import { catalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { append, element } from '../utilities/dom';

function reportDestination(language: Language, config: PublicConfig) {
  const forms = entryLaunch(catalogEntry('liberaforms')!, language, config);
  return { forms, href: forms ? new URL('feedback', config.publicFormsUrl).href : config.contactUrl };
}

/** Plain, deliberate handoff. Never append a document, task URL or diagnostics. */
export function problemReportLink(language: Language, config: PublicConfig, className = ''): HTMLAnchorElement | null {
  const { forms, href } = reportDestination(language, config);
  if (!href) return null;
  const a = element('a', className, forms
    ? (language === 'es' ? 'Reportar un problema en privado' : 'Report a problem privately')
    : (language === 'es' ? 'Abrir el canal de contacto' : 'Open the contact channel'));
  a.href = href; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}

export function renderProblemReport(language: Language, config: PublicConfig): HTMLElement | null {
  const es = language === 'es';
  const { forms, href } = reportDestination(language, config);
  if (!href) return null;
  const section = element('section', 'section prose'); section.id = 'problem-report';
  append(section, element('h2', '', es ? '¿Te trabaste en un paso?' : 'Stuck on a step?'),
    element('p', '', es
      ? 'Podés avisarnos aunque no hayas terminado. Contá qué herramienta usaste, qué esperabas obtener y qué pasó. Si aparece un error, copiá solo el mensaje, sin datos personales.'
      : 'You can report a problem even if you could not finish. Tell us the tool, what you expected and what happened. If there is an error, copy only its message without personal information.'));
  const a = problemReportLink(language, config, 'button button-secondary')!;
  append(section, a, element('p', 'small-copy', forms
    ? (es ? 'El formulario abre en otra pestaña y no pide cuenta. El contacto es opcional; los operadores autorizados pueden leer tu respuesta. No enviamos archivos, enlaces de tu tarea ni diagnósticos automáticamente.'
      : 'The form opens in a new tab without an account. Contact details are optional; authorized operators can read your response. We do not automatically send files, task links or diagnostics.')
    : (es ? 'El canal de contacto puede ser público. Revisá dónde se publicará tu mensaje antes de enviarlo.'
      : 'The contact channel may be public. Check where your message will appear before sending it.')),
    element('p', 'small-copy', es ? 'No incluyás documentos personales, contraseñas ni enlaces privados. Reportar es opcional y no cambia el acceso a las herramientas.' : 'Leave out personal documents, passwords and private links. Reporting is optional and does not change access to the tools.'));
  return section;
}
