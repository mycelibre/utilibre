import type { Language } from '../i18n/index.ts';

type Copy = Record<Language, string>;
export interface ScenarioCollection {
  id: string;
  paths: Copy;
  title: Copy;
  description: Copy;
  tools: Array<{ id: string; purpose: Copy; guide: string }>;
  example: {
    title: Copy;
    result: Copy;
    steps: Record<Language, string[]>;
    sample: string;
    sampleLabel: Copy;
    guide: string;
  };
  privacy: Copy;
  mobile: Copy;
}

// Curated views of existing catalogue IDs, not another application registry.
// Application URLs, access and availability always come from the catalogue.
export const scenarioCollections: readonly ScenarioCollection[] = [
  {
    id: 'documents',
    paths: { en: 'collections/documents-and-applications', es: 'colecciones/documentos-y-tramites' },
    title: { en: 'Documents and applications', es: 'Documentos y trámites' },
    description: {
      en: 'Read a scan, prepare an image for a submission, and move the finished file to the device where you need it.',
      es: 'Leé un escaneo, prepará una imagen para una solicitud y pasá el archivo terminado al dispositivo donde lo necesitás.',
    },
    tools: [
      { id: 'bentopdf', purpose: { en: 'Work with a PDF or recognize scanned text.', es: 'Trabajá con un PDF o reconocé texto escaneado.' }, guide: 'scan' },
      { id: 'minipaint', purpose: { en: 'Crop an image or change its pixel dimensions.', es: 'Recortá una imagen o cambiá sus dimensiones en píxeles.' }, guide: 'image' },
      { id: 'omni-compress-image', purpose: { en: 'Compress an image, then check its actual file size.', es: 'Comprimí una imagen y revisá cuánto pesa el archivo.' }, guide: 'image' },
      { id: 'pairdrop', purpose: { en: 'Move the checked file between your devices.', es: 'Pasá el archivo revisado entre tus dispositivos.' }, guide: 'transfer' },
    ],
    example: {
      title: { en: 'Practice: prepare an image for an upload', es: 'Práctica: prepará una imagen para subirla' },
      result: {
        en: 'Expected result: a downloaded image measuring 600 × 400 pixels, with readable text. The practice target is under 200 KB; check the actual file. These are fictional requirements, not identity-photo rules.',
        es: 'Resultado esperado: una imagen descargada de 600 × 400 píxeles, con texto legible. La meta de práctica es menos de 200 KB; comprobá el archivo real. Son requisitos ficticios, no normas para fotos de identidad.',
      },
      steps: {
        en: [
          'Download the fictional 1200 × 800 image. In miniPaint, use File → Open → Open File. Keep the original.',
          'Choose Image → Resize. Set width to 600 and leave height and percentage empty to preserve the ratio. Export your copy with File → Export.',
          'If the download is over the practice limit, open it in OmniTools image compression and download the result. This is a manual handoff, not an automatic pipeline.',
          'Reopen the download. Check 600 × 400 pixels, actual size and legibility. For a real submission, use the receiving site’s own requirements.',
        ],
        es: [
          'Descargá la imagen ficticia de 1200 × 800. En miniPaint, usá File → Open → Open File. Conservá el original.',
          'Elegí Image → Resize. Escribí 600 en el ancho y dejá vacíos la altura y el porcentaje para conservar la proporción. Exportá tu copia con File → Export.',
          'Si la descarga supera el límite del ejercicio, abrila en la compresión de imágenes de OmniTools y descargá el resultado. Es un paso manual, no un proceso automático entre aplicaciones.',
          'Reabrí la descarga. Revisá los 600 × 400 píxeles, el peso real y la legibilidad. En una solicitud real, mandan los requisitos del sitio que recibe el archivo.',
        ],
      },
      sample: 'fictional-image.jpg',
      sampleLabel: { en: 'Download the fictional practice image (JPEG)', es: 'Descargar la imagen ficticia de práctica (JPEG)' },
      guide: 'image',
    },
    privacy: {
      en: 'The PDF and image steps process files in the browser. PairDrop has its own transfer and connection limits: read its guide before sending. Downloaded files are not encrypted automatically. Do not leave personal documents or downloads on a shared device.',
      es: 'Los pasos de PDF e imágenes procesan archivos en el navegador. PairDrop tiene sus propios límites de transferencia y conexión: leé su guía antes de enviar. Las descargas no se cifran automáticamente. No dejés documentos personales ni descargas en un dispositivo compartido.',
    },
    mobile: {
      en: 'A larger screen helps with miniPaint’s controls. On a phone, start with the small sample, keep the guide in its own tab and find the result in your browser’s downloads or Files app. OCR may need an initial language-data download. These instructions are not a claim of real-phone compatibility.',
      es: 'Una pantalla grande facilita los controles de miniPaint. En un teléfono, empezá con el ejemplo pequeño, dejá la guía en su propia pestaña y buscá el resultado en Descargas del navegador o en Archivos. El OCR puede necesitar descargar datos del idioma al principio. Estas indicaciones no equivalen a una prueba en teléfonos reales.',
    },
  },
  {
    id: 'workshop',
    paths: { en: 'collections/organize-a-workshop', es: 'colecciones/organiza-un-taller' },
    title: { en: 'Organize a workshop', es: 'Organizá un taller' },
    description: {
      en: 'Agree on a date, prepare an activity and share its invitation. Start with a small, editable workshop plan.',
      es: 'Elegí una fecha con el grupo, prepará una actividad y compartí la invitación. Empezá con un plan de taller pequeño y editable.',
    },
    tools: [
      { id: 'pollaris', purpose: { en: 'Ask the group which date works, without organizer registration.', es: 'Consultá qué fecha le sirve al grupo, sin registrar al organizador.' }, guide: 'poll' },
      { id: 'excalidraw', purpose: { en: 'Adapt the local workshop board to your activity.', es: 'Adaptá la pizarra local del taller a tu actividad.' }, guide: 'starting-projects' },
      { id: 'drawio', purpose: { en: 'Explain a process with a structured diagram.', es: 'Explicá un proceso con un diagrama estructurado.' }, guide: 'starting-projects' },
      { id: 'qr-offline', purpose: { en: 'Make a QR for the public participant link.', es: 'Creá un QR con el enlace público de participación.' }, guide: 'qr' },
    ],
    example: {
      title: { en: 'Practice: plan a skill-sharing workshop', es: 'Práctica: planificá un taller para compartir habilidades' },
      result: {
        en: 'Expected result: your own editable workshop board with a topic, a practice activity and a closing task. The starting file has Before, During and After notes; it is not a shared writable room.',
        es: 'Resultado esperado: tu propia pizarra editable con un tema, una actividad de práctica y una tarea de cierre. El archivo inicial tiene notas de Antes, Durante y Después; no es una sala compartida.',
      },
      steps: {
        en: [
          'Download the fictional workshop .excalidraw file. Save any existing drawing before opening the example.',
          'In Excalidraw’s main menu, choose Open and select the file. Edit the notes: for example, Before — choose a paper-folding model; During — make one together; After — keep the instructions.',
          'Choose Save to to download your editable copy. Reopen it and check your three notes. The starting-projects guide also includes an editable process diagram.',
          'For a real date, follow the Pollaris guide with two future options and an explicit time zone. Share only its participant link; keep the management link private. You can paste the participant link into QR Tools.',
        ],
        es: [
          'Descargá el archivo ficticio del taller en formato .excalidraw. Guardá cualquier dibujo existente antes de abrir el ejemplo.',
          'En el menú principal de Excalidraw, elegí Abrir y seleccioná el archivo. Editá las notas: por ejemplo, Antes — elegir un modelo de papel; Durante — hacerlo juntos; Después — guardar las instrucciones.',
          'Elegí Guardar en para descargar tu copia editable. Reabrila y comprobá las tres notas. La guía de proyectos de práctica también incluye un diagrama de proceso editable.',
          'Para una fecha real, seguí la guía de Pollaris con dos opciones futuras y una zona horaria explícita. Compartí solo el enlace de participación y guardá el de administración en privado. Podés pegar el enlace de participación en QR Tools.',
        ],
      },
      sample: 'workshop-{lang}.excalidraw',
      sampleLabel: { en: 'Download the editable workshop board (.excalidraw)', es: 'Descargar la pizarra editable del taller (.excalidraw)' },
      guide: 'starting-projects',
    },
    privacy: {
      en: 'The local board, diagram and QR steps do not upload their content. Pollaris sends the poll and votes to Utilibre; do not put confidential details in a public poll. A QR does not make a link private. Saving this toolkit does not save your poll, drawing or management link.',
      es: 'La pizarra local, el diagrama y el QR no suben su contenido en estos pasos. Pollaris envía la encuesta y los votos a Utilibre; no pongás detalles confidenciales en una encuesta pública. Un QR no vuelve privado un enlace. Guardar esta colección no guarda tu encuesta, dibujo ni enlace de administración.',
    },
    mobile: {
      en: 'Use a larger screen for arranging the board and diagram. When reading a QR on a phone, check its destination before opening it. Keep the editable board as well as any image you share. Real-device file picking, camera access and sharing still depend on the phone and browser.',
      es: 'Usá una pantalla grande para acomodar la pizarra y el diagrama. Al leer un QR en el teléfono, revisá el destino antes de abrirlo. Conservá la pizarra editable además de cualquier imagen que compartás. Elegir archivos, usar la cámara y compartir dependen del teléfono y del navegador.',
    },
  },
  {
    id: 'study',
    paths: { en: 'collections/study-and-presentations', es: 'colecciones/estudio-y-presentaciones' },
    title: { en: 'Study and presentations', es: 'Estudio y presentaciones' },
    description: {
      en: 'Turn notes into a mind map, explain an idea with a diagram or show a small dataset as a chart.',
      es: 'Convertí apuntes en un mapa mental, explicá una idea con un diagrama o presentá pocos datos en una gráfica.',
    },
    tools: [
      { id: 'markmap', purpose: { en: 'Make a mind map from a written outline.', es: 'Creá un mapa mental a partir de un esquema escrito.' }, guide: 'mindmap' },
      { id: 'drawio', purpose: { en: 'Arrange the steps or relationships in a diagram.', es: 'Ordená pasos o relaciones en un diagrama.' }, guide: 'starting-projects' },
      { id: 'rawgraphs', purpose: { en: 'Make a chart from a small CSV dataset.', es: 'Creá una gráfica con un pequeño conjunto de datos CSV.' }, guide: 'chart' },
    ],
    example: {
      title: { en: 'Practice: explain a fictional survey', es: 'Práctica: explicá una encuesta ficticia' },
      result: {
        en: 'Expected result: a labelled bar chart of 26 fictional responses. Reading has 12, Practice 8 and Discussion 6. Reading is the most selected activity in this example; these are counts, not percentages or Utilibre usage data.',
        es: 'Resultado esperado: una gráfica de barras rotulada con 26 respuestas ficticias. Lectura tiene 12, Práctica 8 y Debate 6. Lectura es la actividad más elegida en este ejemplo; son cantidades, no porcentajes ni datos de uso de Utilibre.',
      },
      steps: {
        en: [
          'Download the UTF-8 survey CSV. Open RAWGraphs and paste its contents into Load your data. Check the comma separator, the header row and the three numeric values.',
          'Choose Bar chart. Map Activity to Bars and Responses to Size. Keep the activity names visible rather than relying on color.',
          'Use Download to export SVG, then reopen the file. Check all labels and the relative bar lengths: 12 is greater than 8, which is greater than 6.',
          'Add a written explanation when you share the chart: “In this fictional group of 26 responses, 12 chose reading, 8 practice and 6 discussion.” Keep the CSV so you can remake or correct the chart.',
        ],
        es: [
          'Descargá el CSV UTF-8 de la encuesta. Abrí RAWGraphs y pegá su contenido en Load your data. Revisá el separador de comas, los encabezados y los tres valores numéricos.',
          'Elegí Bar chart. Asigná Actividad a Bars y Respuestas a Size. Conservá los nombres de las actividades visibles, sin depender solo del color.',
          'Usá Download para exportar SVG y reabrí el archivo. Revisá todos los rótulos y las barras: 12 es mayor que 8, que es mayor que 6.',
          'Al compartir, agregá una explicación escrita: «En este grupo ficticio de 26 respuestas, 12 eligieron lectura, 8 práctica y 6 debate». Conservá el CSV para volver a crear o corregir la gráfica.',
        ],
      },
      sample: 'survey-{lang}.csv',
      sampleLabel: { en: 'Download the fictional survey (CSV)', es: 'Descargar la encuesta ficticia (CSV)' },
      guide: 'starting-projects',
    },
    privacy: {
      en: 'These selected tools process the example locally in your browser. Applications still need to be downloaded. Save the outline, native diagram or CSV separately from the exported image: an image is not always an editable backup. Do not treat browser storage as a backup.',
      es: 'Estas herramientas procesan el ejemplo localmente en el navegador. Las aplicaciones sí deben descargarse. Guardá el esquema, el diagrama nativo o el CSV aparte de la imagen exportada: una imagen no siempre sirve como respaldo editable. No usés el almacenamiento del navegador como respaldo.',
    },
    mobile: {
      en: 'A keyboard and larger screen are recommended for diagrams and RAWGraphs field mapping. A narrow-screen preview alone does not establish that the task is easy on every phone. Start with this three-row dataset, save frequently and open each exported file before sharing.',
      es: 'Se recomiendan teclado y pantalla grande para diagramas y para asignar campos en RAWGraphs. Que la página quepa en una pantalla pequeña no demuestra que la tarea sea fácil en cualquier teléfono. Empezá con estas tres filas, guardá seguido y abrí cada exportación antes de compartirla.',
    },
  },
];

export function collectionPath(id: string, language: Language): string {
  const collection = scenarioCollections.find(item => item.id === id);
  if (!collection) throw new Error(`Unknown collection: ${id}`);
  return `/${language}/${collection.paths[language]}`;
}
