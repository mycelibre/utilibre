import type { Language } from '../i18n';
import { element, type Translate } from '../utilities/dom';

const reportCopy = {
  en: {
    'report.intro': 'Found a suspicious redirect, paste or shared page on Utilibre? Send a report to the operator using the email below.',
    'report.email.title': 'Email the operator',
    'report.email.subject': 'Utilibre abuse report',
    'report.email.help': 'The link opens your email application. If it does not open, copy admin@utilibre.org into your usual email service. No Utilibre account is required.',
    'report.include.url': 'Include the offending Utilibre URL or item identifier. Remove passwords, access tokens and decryption keys, including fragments after # that contain a key.',
    'report.include.description': 'Describe the problem briefly, such as a phishing redirect, spam, harassment or suspected illegal content. You do not need to investigate or open the content again.',
    'report.include.reply': 'If you want a reply at a different address, include it. Your email service sends your sender address with the message.',
    'report.exclude': 'Do not download, attach or forward the suspected material. Do not send passwords, encryption keys, private files or unnecessary personal information.',
    'report.redirect.title': 'For a suspicious short link',
    'report.redirect.body': 'Send the links.utilibre.org short URL you encountered. You do not need to follow the redirect or send the destination’s content. This report page never fills in your current URL, browsing history or page contents.',
    'report.next.title': 'How reports are handled',
    'report.next.body': 'The operator uses your email to assess the report and contact you if needed. Your message passes through the email providers involved; it is not an anonymous submission. No report form, tracking or third-party widget is loaded here. There is no guaranteed response time. Mailbox retention and further reporting details are in the policy below.',
    'report.policy': 'Reporting policy and email privacy',
  },
  es: {
    'report.intro': '¿Encontraste una redirección sospechosa, un texto o una página compartida abusiva en Utilibre? Avisale al operador por el correo de abajo.',
    'report.email.title': 'Escribile al operador',
    'report.email.subject': 'Denuncia de abuso en Utilibre',
    'report.email.help': 'El enlace abre tu aplicación de correo. Si no se abre, copiá admin@utilibre.org en tu servicio de correo habitual. No necesitás una cuenta de Utilibre.',
    'report.include.url': 'Incluí la URL de Utilibre o el identificador del elemento denunciado. Quitá contraseñas, tokens de acceso y claves de descifrado, incluidos los fragmentos después de # que contengan una clave.',
    'report.include.description': 'Describí brevemente el problema, como una redirección de suplantación de identidad, spam, acoso o posible contenido ilegal. No necesitás investigar ni volver a abrir el contenido.',
    'report.include.reply': 'Si querés recibir la respuesta en otra dirección, incluila. Tu servicio de correo envía tu dirección de remitente con el mensaje.',
    'report.exclude': 'No descargués, adjuntés ni reenviés el material sospechoso. No enviés contraseñas, claves de cifrado, archivos privados ni datos personales innecesarios.',
    'report.redirect.title': 'Si el enlace corto es sospechoso',
    'report.redirect.body': 'Enviá el enlace corto de links.utilibre.org que encontraste. No necesitás seguir la redirección ni enviar el contenido del destino. Esta página nunca completa tu URL actual, historial de navegación ni contenido de la página.',
    'report.next.title': 'Cómo se atienden las denuncias',
    'report.next.body': 'El operador usa tu correo para evaluar la denuncia y contactarte si hace falta. Tu mensaje pasa por los proveedores de correo involucrados; el envío no es anónimo. Aquí no se carga un formulario, seguimiento ni widget de terceros. No hay un plazo de respuesta garantizado. La política de abajo explica la conservación del correo y otros detalles de las denuncias.',
    'report.policy': 'Política de denuncias y privacidad del correo',
  },
} as const;

export function renderAbuseReport(language: Language, t: Translate, paths: { acceptable: string; security: string }): HTMLElement {
  const report = (key: keyof typeof reportCopy.en) => reportCopy[language][key];
  const main = element('main', 'page-shell');
  main.id = 'main-content'; main.tabIndex = -1;
  const header = element('header', 'page-header');
  header.append(element('h1', '', t('report.title')), element('p', 'page-intro', report('report.intro')));
  main.append(header);

  const contact = element('section', 'prose section');
  contact.append(element('h2', '', report('report.email.title')));
  const email = element('a', 'button', 'admin@utilibre.org');
  email.href = `mailto:admin@utilibre.org?subject=${encodeURIComponent(report('report.email.subject'))}`;
  contact.append(email, element('p', '', report('report.email.help')));
  const steps = element('ol');
  for (const key of ['report.include.url', 'report.include.description', 'report.include.reply'] as const) {
    steps.append(element('li', '', report(key)));
  }
  contact.append(steps, element('p', 'notice', report('report.exclude')));
  main.append(contact);

  const redirects = element('section', 'prose section');
  redirects.append(element('h2', '', report('report.redirect.title')), element('p', '', report('report.redirect.body')));
  main.append(redirects);

  const next = element('section', 'prose section');
  next.append(element('h2', '', report('report.next.title')), element('p', '', t('abuse.action')), element('p', '', report('report.next.body')));
  const policy = element('a', 'text-link', report('report.policy'));
  policy.href = `${paths.acceptable}#abuse`;
  const security = element('a', 'text-link', t('security.title'));
  security.href = paths.security;
  const links = element('div', 'guide-links'); links.append(policy, security);
  next.append(links); main.append(next);
  return main;
}
