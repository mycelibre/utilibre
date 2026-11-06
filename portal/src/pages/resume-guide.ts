import type { PracticalGuide } from './practical-guide-data.ts';

export const resumeGuide: PracticalGuide = {
  id: 'openresume', paths: { en: 'guides/local-resume', es: 'guias/curriculum-local' },
  tools: [{ id: 'openresume', path: '/resume-builder', label: { en: 'Create my résumé', es: 'Crear mi currículum' } }],
  samples: [{ file: 'cv/primer-empleo-{lang}.txt', localized: true, label: { en: 'First-job practice text (TXT)', es: 'Texto de práctica para primer empleo (TXT)' } }],
  references: [{ url: 'https://github.com/xitanggg/open-resume', label: { en: 'OpenResume documentation and source', es: 'Documentación y código de OpenResume' } }],
  reviewedOn: '2026-11-06',
  copy: {
    es: {
      seoTitle: 'Currículum vitae gratis en PDF para Guatemala',
      title: 'Creá tu currículum y descargalo en PDF',
      intro: 'Prepará tu hoja de vida para buscar empleo en Guatemala. Usá ejemplos de primer empleo, atención al cliente y apoyo administrativo. Crear y descargar el PDF es gratis, sin cuenta.',
      prerequisites: 'Necesitás un navegador actualizado y tus estudios, actividades y habilidades a mano. El editor está disponible en español e inglés. Empezá con un ejemplo ficticio; no necesitás subir un documento ni abrir una cuenta.',
      steps: [
        'Elegí uno de los tres ejemplos de abajo y leé su consejo. El PDF muestra un resultado terminado; el TXT permite copiar el texto a tu editor. No son formularios oficiales ni perfiles de personas reales. Cambiá todas las experiencias por las tuyas.',
        'Abrí «Crear mi currículum». Completá Nombre, Perfil profesional, Correo electrónico y Teléfono. En Municipio y departamento basta una ubicación general para empezar. No agregués DPI, dirección exacta, fecha de nacimiento ni estado civil por defecto. Si una convocatoria pide información adicional, revisá su propósito y el canal por el que la enviarás.',
        'Escribí un perfil breve y específico para el puesto. En Experiencia, nombrá la organización, tu función, las fechas y las actividades. Si aún no trabajaste, usá Educación y Proyectos; podés ocultar una sección con «Ocultar sección» y moverla con «Subir» o «Bajar». No inventés empleos, certificados ni resultados.',
        'Completá estudios, cursos e idiomas pertinentes. Podés escribir los títulos de las secciones. Para un primer empleo, describí proyectos escolares, prácticas o voluntariado con su nombre real. En Habilidades e idiomas, explicá qué podés hacer; los círculos de valoración son opcionales.',
        'Revisá el diseño y elegí Carta o A4 según el destino del documento. Conservá un tamaño de letra legible. El editor usa texto y no incorpora una fotografía; no necesitás agregarla para seguir este ejemplo. Si el destinatario exige otro formato, comprobá ese requisito por separado.',
        'Esperá a que aparezca «Descargar PDF». Descargalo, abrilo desde Descargas o Archivos y revisá nombres, tildes, ñ, fechas, saltos de página, correo y teléfono. Probá seleccionar y copiar una frase: el texto debe seguir siendo legible. Esto no garantiza que todos los sistemas de reclutamiento lo interpreten igual.',
        'Guardá una copia y enviá únicamente el archivo revisado al destinatario previsto. Podés comprimirlo con las herramientas PDF de Utilibre si la solicitud tiene un límite de tamaño; volvé a abrirlo después. Conservá el archivo sin comprimir.',
      ],
      success: 'El resultado es un PDF que podés abrir, leer y compartir sin pagar por la descarga. La revisión de este recorrido usa perfiles ficticios y comprueba el texto extraído del PDF; no es una promesa de entrevistas ni de compatibilidad universal con sistemas de selección.',
      troubleshooting: 'Si no aparece la descarga, esperá a que termine «Preparando PDF…». Ante un error, revisá el texto y recargá después de conservar lo que puedas. En un teléfono, la vista previa queda debajo del formulario: desplazate hasta ella. Buscá el archivo en Descargas o Archivos. Si falta una sección, comprobá que esté visible. La importación y el analizador de PDF de OpenResume siguen en inglés y pueden perder campos o formato, especialmente con encabezados en español; no los usés como respaldo exacto del borrador.',
      privacy: 'El contenido del currículum se procesa en tu navegador. Este editor no necesita una cuenta ni guarda una copia del CV en Utilibre. Los campos pueden permanecer al cerrar la pestaña: en una computadora compartida, eliminá los datos de este sitio al terminar y borrá las descargas por separado. Un PDF descargado no está cifrado automáticamente. La aplicación, fuentes y componentes se descargan de Utilibre; las conexiones web sí pasan por la infraestructura de alojamiento. No se añadió rastreo de visitas, descargas ni contenido.',
      next: 'Adaptá el perfil al siguiente puesto y conservá una copia identificable de cada PDF. Podés guardar esta herramienta en Mi Utilibre. Si necesitás el flujo con cuenta de Reactive Resume, consultá sus condiciones de acceso; no hace falta para este recorrido.',
    },
    en: {
      seoTitle: 'Free PDF résumé builder and examples for Guatemala',
      title: 'Create your résumé and download a PDF',
      intro: 'Prepare a résumé for job applications in Guatemala. Try fictional first-job, customer-service and administrative examples. Creating and downloading the PDF is free, with no account.',
      prerequisites: 'Use a current browser and have your education, activities and skills at hand. The builder is available in English and Spanish. Start with fictional details; you do not need to upload a document or create an account.',
      steps: [
        'Choose one of the three examples below and read its advice. The PDF shows a finished result; the TXT lets you copy text into the editor. These are fictional profiles, not official application forms. Replace their experiences with your own.',
        'Open “Create my résumé”. Enter Name, Objective, Email and Phone. Use a general municipality or city in Location. Do not include an identification number, exact address, birth date or marital status by default. If a particular application requests more information, review its purpose and how you will send it.',
        'Write a short profile relevant to the role. Under Work Experience, name the organization, role, dates and tasks. For a first job, use Education and Project; “Hide section”, “Move up” and “Move down” let you choose the order. Do not invent jobs, qualifications or results.',
        'Add relevant education, courses and languages. Section headings are editable. Label school projects, placements and volunteer activities accurately. Under Skills List, explain what you can do; visual skill ratings are optional.',
        'Review the design and choose Letter or A4 to match the destination’s requirements. Keep text readable. This builder uses text and does not add a photograph; none is needed for this exercise. Check any additional recipient requirements separately.',
        'Wait for “Download PDF”, download the file and reopen it from Downloads or Files. Check names, accents, ñ, dates, page breaks and contact details. Select and copy a sentence to check that its text is readable. This does not guarantee compatibility with every recruitment system.',
        'Keep a copy and send only the reviewed file to the intended recipient. If the application has a file-size limit, try Utilibre’s PDF tools and reopen the compressed result. Preserve the uncompressed original.',
      ],
      success: 'The result is a readable PDF you can open and share without paying for the download. This workflow is checked with fictional profiles and extracted PDF text; it does not promise interviews or universal recruitment-system compatibility.',
      troubleshooting: 'Wait for “Preparing PDF…” to finish. If generation fails, check your entries and reload after keeping what you can. On a phone, the preview is below the form; scroll down to it and find the export in Downloads or Files. Check section visibility if content is missing. OpenResume’s PDF importer and text inspector remain in English and may lose fields or formatting, especially with Spanish headings. They are not an exact backup of an editable draft.',
      privacy: 'Résumé content is processed in your browser. This builder needs no account and does not store a CV copy on Utilibre. Draft fields can remain after closing a tab: on a shared computer, clear this tool’s site data and delete downloads separately when finished. Downloaded PDFs are not automatically encrypted. The application, fonts and components come from Utilibre; ordinary web connections still pass through hosting infrastructure. No visit, download or content tracking was added.',
      next: 'Adapt your profile to each role and keep an identifiable copy of each PDF. Save the tool in My Utilibre for later. Reactive Resume offers a separate account-based workflow with its own access conditions; it is not needed here.',
    },
  },
};
