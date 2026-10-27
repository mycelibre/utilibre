import type { PracticalGuide } from './practical-guide-data.ts';

export const structablesGuides: PracticalGuide[] = [{
  id: 'read-instructables', paths: { en: 'guides/read-instructables', es: 'guias/leer-instructables' },
  tools: [{ id: 'structables', label: { en: 'Explore projects with Structables', es: 'Explorar proyectos con Structables' } }],
  samples: [], reviewedOn: '2026-10-27',
  references: [{ url: 'https://git.private.coffee/PrivateCoffee/structables', label: { en: 'Structables project and documentation', es: 'Proyecto y documentación de Structables' } }],
  copy: {
    en: {
      title: 'Find and read an Instructables project',
      intro: 'This service is not open yet because project images are unreliable. These instructions describe its tested interface. Look through a public project’s materials, instructions and pictures using Structables. No account is needed. The interface is in English and each project keeps its original language.',
      prerequisites: 'A browser with an Internet connection. Check the tool’s availability before starting. This is a reader for public projects, not a place to upload your own work. Instructions come from their authors; assess their suitability and safety before trying them.',
      steps: [
        'Open Structables. Choose a category such as Craft or Workshop, or use the Search field in the header.',
        'For a harmless practice search, enter paper airplane. Open a result with materials and step-by-step photographs. This is a search example, not a Utilibre-authored project.',
        'Read the introduction and supplies, then work through the numbered steps. Check that the pictures load and belong to the step you are reading. Project comments and embedded video players are unavailable.',
        'If a project provides a download, use its Downloads link. Files over 8 MiB are refused. Treat third-party downloads as untrusted; do not run unknown programs.',
        'Bookmark the project address to return later. Your browser’s print control can save a reading copy; inspect the preview because layouts and pictures vary. Structables does not create a private saved-project account.',
      ],
      success: 'You can read the selected project’s materials and instructions and see its step pictures. A bookmark returns to the same project while the source remains available.',
      troubleshooting: 'If a page or picture fails, wait and try once later. Instructables can change its interface or refuse access. A video-only explanation cannot be completed in this reader. On a phone, scroll through the steps; printing and downloaded-file locations depend on your browser.',
      privacy: 'Your search and requested project reach Utilibre, which fetches content from Instructables. The source sees the server connection. Images use the same service; outside frames and automatic external browser resources are blocked. Cached JSON is kept in bounded worker memory and reused for up to 15 minutes; media disk caching is off. No visitor analytics or application access logs are enabled. Bookmarks, history, downloads and a theme preference belong to your browser. Selecting an external link contacts its destination.',
      next: 'Save Structables in My Utilibre or keep the project bookmark. To prepare instructions of your own, use Utilibre’s document or diagram tools and credit any sources you use.',
    },
    es: {
      title: 'Encontrá y leé un proyecto de Instructables',
      intro: 'El servicio todavía no está abierto porque las imágenes de los proyectos fallan. Estas instrucciones describen la interfaz probada. Consultá materiales, instrucciones e imágenes de un proyecto público con Structables. No necesitás cuenta. La interfaz está en inglés y cada proyecto conserva su idioma original.',
      prerequisites: 'Un navegador con conexión a Internet. Revisá la disponibilidad de la herramienta antes de empezar. Es un lector de proyectos públicos, no un lugar para subir tu trabajo. Las instrucciones pertenecen a sus autores; evaluá si son adecuadas y seguras antes de probarlas.',
      steps: [
        'Abrí Structables. Elegí una categoría como Craft o Workshop, o usá el campo Search del encabezado.',
        'Para practicar con una búsqueda sencilla, escribí paper airplane. Abrí un resultado con materiales y fotografías de los pasos. Es un ejemplo de búsqueda, no un proyecto creado por Utilibre.',
        'Leé la introducción y los materiales; después seguí los pasos numerados. Comprobá que las imágenes carguen y correspondan al paso que estás leyendo. No están disponibles los comentarios ni los reproductores de video integrados.',
        'Si el proyecto ofrece un archivo, usá su enlace Downloads. Se rechazan archivos mayores de 8 MiB. Tratá las descargas de terceros como contenido no confiable; no ejecutés programas desconocidos.',
        'Guardá la dirección del proyecto como marcador para volver. Podés usar imprimir del navegador para guardar una copia de lectura; revisá la vista previa porque la disposición y las imágenes varían. Structables no crea una cuenta privada de proyectos guardados.',
      ],
      success: 'Podés leer los materiales y las instrucciones del proyecto elegido y ver las imágenes de sus pasos. El marcador vuelve al mismo proyecto mientras siga disponible en el origen.',
      troubleshooting: 'Si falla una página o imagen, esperá y probá una vez más tarde. Instructables puede cambiar su interfaz o rechazar el acceso. Una explicación que solo está en video no se puede completar en este lector. En el teléfono, desplazate por los pasos; imprimir y encontrar descargas dependen del navegador.',
      privacy: 'Tu búsqueda y el proyecto solicitado llegan a Utilibre, que obtiene el contenido desde Instructables. El origen ve la conexión del servidor. Las imágenes pasan por el mismo servicio; se bloquean marcos y recursos externos automáticos del navegador. Las respuestas JSON se guardan en memoria limitada y se reutilizan durante 15 minutos; no se guardan archivos multimedia en disco. No hay estadísticas de visitantes ni registros de acceso de la aplicación. Los marcadores, historial, descargas y tema pertenecen a tu navegador. Elegir un enlace externo contacta su destino.',
      next: 'Guardá Structables en Mi Utilibre o conservá el marcador del proyecto. Para preparar tus propias instrucciones, usá las herramientas de documentos o diagramas y acreditá las fuentes que consultés.',
    },
  },
}];
