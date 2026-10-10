import type { PracticalGuide } from './practical-guide-data.ts';

export const moocupGuides: PracticalGuide[] = [{
  id: 'moocup', paths: { en: 'guides/style-screenshot', es: 'guias/preparar-captura' },
  tools: [{ id: 'moocup', label: { en: 'Open Moocup', es: 'Abrir Moocup' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Give a screenshot a background and border',
      intro: 'Prepare an image for a project page or presentation without uploading the screenshot. Start with a fictional image and check the downloaded result.',
      prerequisites: 'Use a current browser with JavaScript, browser storage and downloads enabled. Moocup’s controls are in English. Keep your original file: its saved browser work is not an independent backup.',
      steps: [
        'Open Moocup. Drop an image onto Drop image here or click to upload, or select a file through that control. Check that the intended image appears; avoid screenshots containing passwords or other information you do not want to share.',
        'Choose a background preset and adjust the border, spacing or position using the native controls. Custom backgrounds accept PNG or JPEG up to 10 MiB. A main image of 2 MiB or more is resized to fit within 2400 × 1800 pixels.',
        'Open Export. On a phone, use the download icon at the top. Choose PNG, JPEG or WebP, then Standard, High or Ultra. A selected format can be deselected by clicking it again; keep one format selected so the export button names that format.',
        'Start with Standard and choose Export as PNG, Export as JPEG or Export as WebP. Open the downloaded file and inspect its text, edges, background and any transformations. These are flattened images; they do not preserve editable settings or layers.',
        'Keep the original and the checked download. Reset clears the current image and transformations, but not all custom backgrounds. To remove all retained work, clear the tools site’s browser data after saving anything you need from other tools on that same site.',
      ],
      success: 'The fictional screenshot produced readable PNG, JPEG and WebP files on desktop and a PNG on a 375-pixel mobile viewport. Image persistence across reload and removal through Reset were also checked.',
      troubleshooting: 'Use Standard or a smaller source if exporting is slow or runs out of browser memory. Quality changes rendering scale, not the original image detail. Complex transformations can differ from the preview; inspect every export. This guide verifies the basic screenshot workflow, not every effect or print result.',
      privacy: 'This build processes images locally and makes no image uploads or automatic third-party requests. App files, presets and fonts are downloaded from Utilibre. Images, preferences and custom backgrounds persist in IndexedDB after tab closure on the shared tools.utilibre.org origin. Clearing that site’s data also affects other apps there. Downloaded files remain on your device, and external source/donation links have their own policies.',
      next: 'Share only the checked image and keep its original separately. Use the image metadata or redaction tools first if you need to inspect or remove sensitive details; a decorative background does not redact anything.',
    },
    es: {
      title: 'Agregá un fondo y un borde a una captura',
      intro: 'Prepará una imagen para una página de proyecto o una presentación sin subir la captura. Empezá con una imagen ficticia y revisá el resultado descargado.',
      prerequisites: 'Usá un navegador actual con JavaScript, almacenamiento y descargas habilitados. Los controles de Moocup están en inglés. Conservá el original: el trabajo guardado en el navegador no es un respaldo independiente.',
      steps: [
        'Abrí Moocup. Arrastrá una imagen a Drop image here or click to upload, o seleccioná un archivo desde ese control. Comprobá que aparezca la imagen correcta; evitá capturas con contraseñas u otros datos que no querás compartir.',
        'Elegí un fondo y ajustá el borde, el espacio o la posición con los controles nativos. Los fondos personalizados admiten PNG o JPEG de hasta 10 MiB. Una imagen principal de 2 MiB o más se reduce para entrar en 2400 × 1800 píxeles.',
        'Abrí Export. En un teléfono, usá el icono de descarga de arriba. Elegí PNG, JPEG o WebP y después Standard, High o Ultra. Volver a pulsar un formato seleccionado puede desmarcarlo; mantené uno elegido para que el botón de exportación indique ese formato.',
        'Empezá con Standard y elegí Export as PNG, Export as JPEG o Export as WebP. Abrí el archivo descargado y revisá texto, bordes, fondo y transformaciones. Son imágenes aplanadas: no conservan ajustes ni capas editables.',
        'Conservá el original y la descarga revisada. Reset borra la imagen actual y sus transformaciones, pero no todos los fondos personalizados. Para quitar todo el trabajo retenido, borrá los datos del sitio tools después de guardar lo que necesités de otras herramientas de ese mismo sitio.',
      ],
      success: 'La captura ficticia produjo archivos PNG, JPEG y WebP legibles en escritorio y un PNG en una pantalla móvil de 375 píxeles. También se comprobó que la imagen persista al recargar y se quite con Reset.',
      troubleshooting: 'Usá Standard o un original más pequeño si la exportación tarda o agota la memoria del navegador. La calidad cambia la escala de renderizado, no el detalle del original. Las transformaciones complejas pueden diferir de la vista previa; revisá cada descarga. Esta guía verifica el flujo básico, no todos los efectos ni el resultado impreso.',
      privacy: 'Esta versión procesa las imágenes localmente, sin subirlas ni hacer solicitudes automáticas a terceros. La aplicación, los fondos y las fuentes se descargan de Utilibre. Imágenes, preferencias y fondos personalizados persisten en IndexedDB al cerrar la pestaña, en el origen compartido tools.utilibre.org. Borrar los datos de ese sitio también afecta otras aplicaciones alojadas ahí. Las descargas quedan en tu dispositivo y los enlaces externos al código o a donaciones tienen sus propias políticas.',
      next: 'Compartí solo la imagen revisada y conservá el original aparte. Usá primero las herramientas de metadatos o redacción si necesitás revisar o quitar información sensible; un fondo decorativo no oculta esos datos.',
    },
  },
}];
