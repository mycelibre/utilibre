import { catalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import { localizedServiceUrl } from '../catalog/locale-links';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { routePath } from '../routes';
import { append, element } from '../utilities/dom';

// Editorial help, not a second implementation of the upstream applications.
// Launch destinations use the same enabled/configured gate as the catalog.
export function guideLinks(language: Language): HTMLElement {
  const group = element('div', 'guide-links');
  append(group,
    link(routePath('guides', language), language === 'es' ? 'Guías paso a paso' : 'Step-by-step guides'),
    link(routePath('pdf', language), language === 'es' ? 'Ayuda para PDF y OCR' : 'PDF & OCR guide'),
    link(routePath('qr', language), language === 'es' ? 'Ayuda para códigos QR' : 'QR code guide'),
  );
  return group;
}

export function renderTaskGuide(kind: 'pdf' | 'qr', language: Language, config: PublicConfig): HTMLElement {
  const es = language === 'es';
  const main = element('main', 'page-shell task-guide tool-page');
  main.id = 'main-content';
  main.tabIndex = -1;
  const header = element('header', 'page-header');
  const title = kind === 'pdf'
    ? es ? 'Uní PDF o reconocé texto escaneado' : 'Merge PDFs or recognize scanned text'
    : es ? 'Creá un QR que podás usar y compartir' : 'Create a QR code you can use and share';
  const intro = kind === 'pdf'
    ? es ? 'Uní páginas o extraé texto de un escaneo con BentoPDF. No necesitás cuenta; los archivos se procesan en tu navegador.' : 'Combine pages or extract text from a scan with BentoPDF. No account is needed; files are processed in your browser.'
    : es ? 'Dos herramientas de software libre, gratis y sin cuenta. Creá un código para un enlace o Wi-Fi, descargalo y probalo antes de compartirlo.' : 'Two free, open-source tools with no account. Create a code for a link or Wi-Fi, download it and test it before sharing.';
  append(header, link(routePath('home', language), es ? 'Todas las herramientas' : 'All tools'), element('h1', '', title), element('p', 'hero-lead', intro));
  const actions = element('div', 'guide-actions');
  if (kind === 'pdf') {
    append(actions,
      launch('bentopdf', 'merge-pdf.html', es ? 'Unir PDF' : 'Merge PDFs', language, config),
      launch('bentopdf', 'ocr-pdf.html', es ? 'Reconocer texto con OCR' : 'Recognize text with OCR', language, config),
    );
  } else {
    append(actions,
      launch('qr-offline', undefined, es ? 'Abrir QR Tools' : 'Open QR Tools', language, config),
      launch('miniqr', undefined, es ? 'Abrir Mini QR' : 'Open Mini QR', language, config),
    );
  }
  header.append(actions);
  main.append(header);
  if (kind === 'pdf') renderPdf(main, language);
  else renderQr(main, language);
  const responsibility = section(es ? 'Sobre esta guía' : 'About this guide', es
    ? 'Utilibre mantiene esta guía y aloja las herramientas; los proyectos originales desarrollan el software. Revisado el 7 de octubre de 2026. Las pruebas con archivos ficticios no garantizan resultados con cualquier documento, teléfono o impresora.'
    : 'Utilibre maintains this guide and hosts the tools; the upstream projects develop the software. Reviewed on 7 October 2026. Tests with synthetic files do not guarantee results for every document, phone or printer.');
  const sources = element('p', 'guide-links');
  for (const id of kind === 'pdf' ? ['bentopdf'] : ['qr-offline', 'miniqr']) {
    const entry = catalogEntry(id)!;
    sources.append(link(entry.upstreamSourceUrl, entry.upstreamProject));
  }
  append(sources, link(routePath('privacy', language), es ? 'Privacidad' : 'Privacy'), link(routePath('about', language), es ? 'Acerca de Utilibre' : 'About Utilibre'));
  responsibility.append(sources, guideLinks(language));
  main.append(responsibility);
  return main;
}

function renderPdf(main: HTMLElement, language: Language) {
  const es = language === 'es';
  main.append(section(es ? 'Antes de elegir tus archivos' : 'Before choosing your files', es
    ? 'Unir y reconocer texto se hace en tu dispositivo, sin subir los documentos a Utilibre. Esta instalación descarga los componentes, los datos de OCR en español e inglés y las fuentes desde Utilibre. Cloudflare intermedia esas descargas y recibe metadatos de conexión; el documento permanece en tu navegador. Para documentos muy sensibles, considerá una herramienta instalada y desconectada. Guardá una copia del original.'
    : 'Merging and text recognition run on your device, without uploading documents to Utilibre. This installation downloads processing components, English and Spanish OCR data, and fonts from Utilibre. Cloudflare proxies those downloads and receives connection metadata; the document stays in your browser. For highly sensitive documents, consider an installed, offline tool. Keep a copy of your original.'));
  const merge = section(es ? 'Unir PDF en el orden correcto' : 'Merge PDFs in the right order', es
    ? 'Unir combina páginas; no reconoce texto ni reduce necesariamente el tamaño del archivo.'
    : 'Merging combines pages; it does not recognize text or necessarily reduce the file size.', es ? [
      'Abrí «Unir PDF» y seleccioná los archivos. Para practicar, usá los dos ejemplos de abajo: no contienen datos personales.',
      'Revisá el orden de los archivos antes de unirlos. Si necesitás cambiarlo, acomodalos en la herramienta.',
      'Uní los archivos y guardá la descarga. Abrila y comprobá la cantidad y el orden de las páginas; no borrés los originales antes de revisar.',
    ] : [
      'Open Merge PDFs and select your files. To practice, use the two samples below: they contain no personal data.',
      'Check the file order before merging. Rearrange them in the tool if needed.',
      'Merge the files and save the download. Open it and check the page count and order; keep the originals until you have checked.',
    ]);
  merge.id = 'merge';
  const examples = element('p', 'guide-links');
  for (const name of ['a', 'b']) {
    const sample = link(`/examples/pdf-${language}-${name}.pdf`, `${es ? 'Descargar ejemplo' : 'Download sample'} ${name.toUpperCase()} (PDF)`);
    sample.setAttribute('download', '');
    examples.append(sample);
  }
  append(merge, examples, element('p', '', es ? 'Resultado esperado: un PDF de dos páginas, A seguida de B. Son archivos ficticios de práctica creados por Utilibre.' : 'Expected result: one PDF with two pages, A followed by B. These are synthetic practice files created by Utilibre.'));
  main.append(merge);
  const ocr = section(es ? 'Convertir un escaneo en texto que podás buscar' : 'Turn a scan into searchable text', es
    ? 'Si no podés seleccionar las palabras de un PDF, puede ser una imagen escaneada. El OCR intenta reconocer esas letras. Un PDF con texto seleccionable normalmente no necesita OCR.'
    : 'If you cannot select the words in a PDF, it may be a scanned image. OCR attempts to recognize those letters. A PDF with selectable text normally does not need OCR.', es ? [
      'Abrí «Reconocer texto con OCR» y seleccioná una imagen o un PDF escaneado. Empezá con una página nítida, derecha y bien iluminada.',
      'Seleccioná el idioma del documento: «Spanish; Castilian» para español. El idioma de la interfaz no elige por vos el idioma del reconocimiento.',
      'Ejecutá el OCR. Guardá el PDF con texto que podás buscar y copiar; comprobá una palabra y una frase.',
      'Compará el resultado con la imagen original. Corregí errores en nombres, números, tildes y saltos de línea antes de usar el texto.',
    ] : [
      'Open Recognize text with OCR and select an image or scanned PDF. Start with one clear, upright, well-lit page.',
      'Select the document language, such as English or Spanish. The interface language does not choose the recognition language for you.',
      'Run OCR. Save the searchable PDF and check that you can search for a word and copy a sentence.',
      'Compare the result with the original image. Correct errors in names, numbers, accents and line breaks before using the text.',
    ]);
  ocr.id = 'ocr';
  ocr.append(element('p', '', es ? 'Un PDF con texto que podás buscar y copiar conserva la apariencia y agrega una capa de texto. No convierte automáticamente el diseño en un documento de Word editable. La escritura a mano, las tablas y las fotos borrosas necesitan especial revisión.' : 'A searchable PDF keeps the appearance and adds a text layer. It does not automatically turn the layout into an editable Word document. Handwriting, tables and blurry photographs need particular care.'));
  main.append(ocr, section(es ? 'Si tarda o falla' : 'If it is slow or fails', es
    ? 'El primer OCR puede tardar mientras descarga los componentes. La memoria de tu dispositivo limita los archivos que puede manejar: no prometemos un tamaño universal. Probá menos páginas, cerrá otras pestañas y conservá el original. No desactivés las protecciones del navegador ni compartás el documento para reportar un error; describí el navegador, la tarea y el mensaje.'
    : 'The first OCR run can take time while components download. Your device’s memory limits the files it can handle; there is no universal size promise. Try fewer pages, close other tabs and keep the original. Do not disable browser protections or share the document to report a problem; describe the browser, task and error message.'));
}

function renderQr(main: HTMLElement, language: Language) {
  const es = language === 'es';
  main.append(section(es ? 'Elegí la herramienta' : 'Choose your tool', es
    ? 'QR Tools permite descargar PNG, SVG y PDF y leer códigos con la cámara. Mini QR ofrece personalización visual y lectura desde una imagen o la cámara. Ambos procesan los códigos en el navegador; la cámara requiere permiso. El historial de códigos está desactivado en estas instalaciones.'
    : 'QR Tools downloads PNG, SVG and PDF and reads codes with the camera. Mini QR offers visual customization and reading from an image or camera. Both process codes in the browser; camera access requires permission. Code history is disabled in these installations.'));
  const make = section(es ? 'De un enlace a un QR comprobado' : 'From a link to a checked QR code', es
    ? 'En QR Tools, probá primero con https://utilibre.org/es/ en lugar de un enlace privado.'
    : 'In QR Tools, try https://utilibre.org/en/ first instead of a private link.', es ? [
      'Elegí el tipo URL y pegá la dirección completa, con https://. Generá el código.',
      'Descargá PNG para compartir una imagen, SVG para escalar sin perder nitidez o PDF para preparar una impresión en QR Tools.',
      'Mantené un borde claro alrededor del código y buen contraste. No recortés ese margen ni tapés los cuadros.',
      'Leelo con otro dispositivo y verificá la dirección antes de abrirla. Si lo imprimís, probá la impresión al tamaño y a la distancia en que se usará.',
    ] : [
      'Choose URL, paste the full address including https://, and generate the code.',
      'Download PNG to share an image, SVG to resize without blurring, or PDF for printing in QR Tools.',
      'Keep a clear border around the code and strong contrast. Do not crop the margin or cover the squares.',
      'Scan it with another device and verify the address before opening it. For print, test the actual print size and intended scanning distance.',
    ]);
  make.id = 'test';
  main.append(make, section(es ? 'Wi-Fi y datos que otras personas pueden leer' : 'Wi-Fi and information other people can read', es
    ? 'Un QR de Wi-Fi incluye el nombre de la red y puede incluir su contraseña. No cifra esos datos: cualquiera que obtenga el código puede leerlos o compartirlos. Usá una red de invitados cuando corresponda. Al escanear un QR desconocido, revisá el contenido; no ingresés contraseñas ni aceptés descargas solo porque vienen de un código.'
    : 'A Wi-Fi QR includes the network name and may include its password. It does not encrypt them: anyone who obtains the code can read or share them. Use a guest network where appropriate. When scanning an unfamiliar QR, inspect its content; do not enter passwords or accept downloads merely because a code led you there.'));
  main.append(section(es ? '¿Vence el código? ¿Puedo cambiar el enlace?' : 'Does the code expire? Can I change the link?', es
    ? 'Un QR estático guarda su contenido en la imagen: no necesita una suscripción de Utilibre para seguir leyéndose. Pero la página de destino puede cambiar, dejar de funcionar o vencer. Cambiar el contenido requiere generar otro código; estos enlaces directos no son un servicio de redirección editable. Guardá la descarga en tu dispositivo.'
    : 'A static QR stores its content in the image; reading it does not depend on a Utilibre subscription. Its destination page can still change, break or expire. Changing the encoded content requires a new code; these direct links are not an editable redirect service. Keep the downloaded file on your device.'));
  main.append(section(es ? 'Qué comprobamos y qué falta probar en tu caso' : 'What we checked and what you should still test', es
    ? 'En QR Tools comprobamos generación, lectura del contenido, exportación PNG/SVG/PDF, interfaz móvil en español y lectura con una cámara simulada en Chromium. No es una prueba de una cámara física ni de tu impresora. Si un código no se lee, probá el estilo simple, un tamaño mayor, más luz y un enlace más corto que controles; no necesitás un acortador externo.'
    : 'In QR Tools we checked generation, decoded content, PNG/SVG/PDF export, the Spanish mobile interface and a simulated camera in Chromium. This is not a physical-camera or printer test. If a code will not scan, try the plain style, a larger size, more light and a shorter URL you control; an external URL shortener is not required.'));
}

function launch(id: string, path: string | undefined, label: string, language: Language, config: PublicConfig): HTMLElement {
  const entry = catalogEntry(id);
  const destination = entry && entryLaunch(entry, language, config);
  if (!destination) return element('p', 'notice', `${label}: ${language === 'es' ? 'no disponible por ahora' : 'currently unavailable'}`);
  const a = link(path ? localizedServiceUrl(id, destination.href, language, path) : destination.href,
    `${label} · ${language === 'es' ? 'pestaña nueva' : 'new tab'}`);
  a.className = 'button';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  return a;
}

function section(title: string, body: string, steps?: string[]): HTMLElement {
  const section = element('section', 'section prose');
  append(section, element('h2', '', title), element('p', '', body));
  if (steps) {
    const list = element('ol');
    for (const step of steps) list.append(element('li', '', step));
    section.append(list);
  }
  return section;
}

function link(href: string, text: string): HTMLAnchorElement {
  const a = element('a', '', text);
  a.href = href;
  return a;
}
