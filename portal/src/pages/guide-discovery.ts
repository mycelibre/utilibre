import { normalizeCatalogSearch } from '../catalog/discovery';
import type { Language } from '../i18n';
import type { PracticalGuide } from './practical-guide-data';

// Editorial entry points into existing guides, not a second tool registry.
export const featuredGuideIds = ['scan', 'image', 'transfer', 'poll', 'chart', 'mindmap'] as const;

interface GuideStart {
  title: string;
  result: string;
  example: string;
  overview: [string, string, string];
  device: string;
}

export const guideStarts: Record<string, Record<Language, GuideStart>> = {
  scan: {
    en: { title: 'Read text from a scan', result: 'A searchable PDF and text you have checked against the original.', example: 'María Example · 12 May 2030 · 24 books. Check the accent, date and number after recognition.', overview: ['Open the practice scan and choose its OCR language.', 'Recognize the text and correct mistakes in your copied text.', 'Download, reopen and check before sharing.'], device: 'Start with one page. OCR needs an initial component and language download; allow extra time on a slower connection. Try the sample before using a large document.' },
    es: { title: 'Leer texto de un escaneo', result: 'Un PDF con texto seleccionable y texto revisado contra el original.', example: 'María Example · 12 de mayo de 2030 · 24 libros. Revisá el acento, la fecha y la cantidad después del reconocimiento.', overview: ['Abrí el escaneo de práctica y elegí el idioma del OCR.', 'Reconocé el texto y corregí los errores de tu copia.', 'Descargá, reabrí y revisá antes de compartir.'], device: 'Empezá con una página. OCR descarga componentes e idiomas al principio; una conexión lenta necesita más tiempo. Probá el ejemplo antes de usar un documento grande.' },
  },
  image: {
    en: { title: 'Prepare an image for an upload', result: 'A downloaded image whose dimensions, file size and readability you have checked.', example: 'Practice target: 1200 × 800 → 600 × 400 pixels, under 200 KB. These are hypothetical requirements, not an identity-photo standard.', overview: ['Download the sample and open it in miniPaint.', 'Resize, export, then compress only if needed.', 'Reopen the file and check dimensions, size and legibility.'], device: 'A larger screen helps with miniPaint’s menus. On a phone, try the small sample first and find the exported file in Downloads or Files. Keep this guide open in its own tab.' },
    es: { title: 'Preparar una imagen para subirla', result: 'Una imagen descargada con dimensiones, peso y legibilidad comprobados.', example: 'Objetivo de práctica: 1200 × 800 → 600 × 400 píxeles, menos de 200 KB. Son requisitos hipotéticos, no una norma para fotos de identidad.', overview: ['Descargá el ejemplo y abrilo en miniPaint.', 'Cambiá las dimensiones, exportá y comprimí solo si hace falta.', 'Reabrí el archivo y revisá dimensiones, peso y legibilidad.'], device: 'Una pantalla grande facilita los menús de miniPaint. En el teléfono, probá el ejemplo pequeño y buscá la exportación en Descargas o Archivos. Dejá esta guía abierta en otra pestaña.' },
  },
  transfer: {
    en: { title: 'Move a file between devices', result: 'The receiving device opens the same small text file you sent.', example: 'Hello from the other device. / Hola desde el otro dispositivo.', overview: ['Open PairDrop on both devices and identify the recipient.', 'Choose the sample, accept it and keep both devices awake.', 'Find the download and open it to check the contents.'], device: 'Try a small file on your actual phone first. The recorded transfer test used two Chromium sessions, not physical phones. File selection, download locations and system sharing vary by browser and device.' },
    es: { title: 'Pasar un archivo entre dispositivos', result: 'El dispositivo receptor abre el mismo archivo de texto pequeño que enviaste.', example: 'Hello from the other device. / Hola desde el otro dispositivo.', overview: ['Abrí PairDrop en ambos dispositivos e identificá al receptor.', 'Elegí el ejemplo, aceptalo y mantené ambos dispositivos despiertos.', 'Buscá la descarga y abrila para revisar el contenido.'], device: 'Probá primero un archivo pequeño en tu teléfono. La prueba registrada usó dos sesiones de Chromium, no teléfonos físicos. El selector de archivos, las descargas y el menú para compartir cambian según navegador y dispositivo.' },
  },
  poll: {
    en: { title: 'Choose a date together', result: 'A poll with a guest vote you can see in the organizer view.', example: 'Reading circle: two meeting options, each with a complete date, time and time zone. The participation link is for guests; the management link stays private.', overview: ['Create a classic Pollaris poll with fictional details.', 'Share only its participation link and cast a test vote.', 'Check the response and delete your practice poll.'], device: 'Keep the private management link somewhere safe before switching tabs or apps. Use the participant link in a separate browser session to check voting; do not publish the management link.' },
    es: { title: 'Elegir una fecha en grupo', result: 'Una encuesta con un voto de invitado visible para quien la organiza.', example: 'Círculo de lectura: dos opciones con fecha, hora y zona horaria completas. El enlace de participación es para invitados; el de administración queda privado.', overview: ['Creá una encuesta clásica en Pollaris con datos ficticios.', 'Compartí solo el enlace de participación y emití un voto de prueba.', 'Comprobá la respuesta y eliminá la encuesta de práctica.'], device: 'Guardá el enlace privado de administración antes de cambiar de pestaña o aplicación. Probá la votación con el enlace de participación en otra sesión; no publiqués el de administración.' },
  },
  chart: {
    en: { title: 'Turn a small CSV into a chart', result: 'An exported SVG with three labeled bars and hours as the unit.', example: 'Reading: 12 hours · Practice: 8 hours · Review: 6 hours. Reading should be the longest bar. These values are fictional.', overview: ['Load the sample CSV and check that hours are numeric.', 'Choose Bar chart and map the activity and hours columns.', 'Export SVG, reopen it and compare the three values.'], device: 'A larger screen is recommended for dragging RAWGraphs fields. On a small screen, try the sample before working with your own data. The application’s controls are in English.' },
    es: { title: 'Convertir un CSV pequeño en una gráfica', result: 'Un SVG exportado con tres barras rotuladas y horas como unidad.', example: 'Lectura: 12 horas · Práctica: 8 horas · Repaso: 6 horas. Lectura debe tener la barra más larga. Los valores son ficticios.', overview: ['Cargá el CSV de ejemplo y verificá que las horas sean números.', 'Elegí Bar chart y asigná las columnas de actividad y horas.', 'Exportá SVG, reabrilo y compará los tres valores.'], device: 'Conviene una pantalla grande para arrastrar campos en RAWGraphs. En una pequeña, probá el ejemplo antes de usar tus datos. Los controles de la aplicación están en inglés.' },
  },
  mindmap: {
    en: { title: 'Make a study mind map', result: 'An editable Markdown outline and an SVG map you can reopen.', example: 'Study plan → Read / Practice / Review. Each heading becomes a branch; the downloaded outline keeps it editable.', overview: ['Import the sample Markdown outline.', 'Change a topic and check its branch in the preview.', 'Download the outline and SVG, then reopen both.'], device: 'A keyboard and larger screen help with editing. On narrow screens the preview appears below the outline. Keep the Markdown download: a browser draft is not a backup.' },
    es: { title: 'Crear un mapa mental de estudio', result: 'Un esquema Markdown editable y un mapa SVG que podés reabrir.', example: 'Plan de estudio → Leer / Practicar / Repasar. Cada título se convierte en una rama; el esquema descargado conserva la edición.', overview: ['Importá el esquema Markdown de ejemplo.', 'Cambiá un tema y revisá su rama en la vista previa.', 'Descargá el esquema y el SVG y reabrí ambos.'], device: 'Un teclado y una pantalla grande facilitan editar. En pantallas pequeñas, la vista previa queda debajo del esquema. Conservá el Markdown descargado: un borrador del navegador no es un respaldo.' },
  },
};

const searchWords: Record<string, string> = {
  scan: 'pdf ocr escaner escáner escaneado documento tramite trámite texto scanned document searchable',
  image: 'foto imagen comprimir dimensiones reducir tamaño peso solicitud upload image resize compress',
  transfer: 'telefono teléfono celular computadora movil móvil archivo enviar compartir phone computer transfer share',
  poll: 'organizar taller encuesta reunion reunión horario fecha meeting workshop poll date',
  chart: 'csv grafica gráfica grafico gráfico barras datos chart graph data',
  mindmap: 'mapa mental esquema apuntes notas estudio estudiar mind map outline notes study',
};

export function discoverGuides(guides: readonly PracticalGuide[], language: Language, query = ''): PracticalGuide[] {
  const needle = normalizeCatalogSearch(query.slice(0, 160), language);
  if (query.trim() && !needle) return [];
  const terms = needle.split(' ').filter(Boolean);
  return guides.map(guide => {
    const title = normalizeCatalogSearch(guide.copy[language].title, language);
    const text = normalizeCatalogSearch([guide.copy.en.title, guide.copy.es.title, guide.copy.en.intro, guide.copy.es.intro, ...guide.tools.map(tool => tool.id), searchWords[guide.id] || ''].join(' '), language);
    const position = (featuredGuideIds as readonly string[]).indexOf(guide.id);
    return { guide, score: title === needle ? 3 : title.includes(needle) ? 2 : 1, position: position < 0 ? featuredGuideIds.length : position, matches: terms.every(term => text.includes(term)) };
  }).filter(item => item.matches).sort((a, b) =>
    (needle ? b.score - a.score : 0) || a.position - b.position || a.guide.copy[language].title.localeCompare(b.guide.copy[language].title, language)
  ).map(item => item.guide);
}
