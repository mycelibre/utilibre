import type { PracticalGuide } from './practical-guide-data.ts';
export const autoredactGuides: PracticalGuide[] = [{
  id: 'autoredact', paths: { en: 'guides/redact-image', es: 'guias/ocultar-datos-imagen' },
  tools: [{ id: 'autoredact', label: { en: 'Open AutoRedact', es: 'Abrir AutoRedact' } }],
  samples: [{ file: 'autoredact-fictional.png', label: { en: 'Fictional email and IP example (PNG)', es: 'Ejemplo ficticio de correo e IP (PNG)' } }], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Find and cover sensitive text in an image',
      intro: 'Use local OCR to find possible sensitive text, then inspect every result yourself. Automatic detection is an aid, not proof that a file contains nothing private.',
      prerequisites: 'Use a current browser with JavaScript, WebAssembly, workers and downloads. The app and its OCR model are English. Start with the fictional PNG below and keep your original separately.',
      steps: [
        'Open AutoRedact and inspect Detection Settings. Its Safe Values allowlist excludes several common router, loopback and DNS addresses. Remove an exception if that address must be hidden. Custom words, dates and rules also remain saved in this browser.',
        'Drop the fictional PNG on Drop images or PDFs here, or select it through the file control. Wait for local OCR to finish. Confirm that the sample email and 203.0.113.42 are covered, while the title and green strip remain visible.',
        'Choose Download Redacted Image and reopen the PNG. Check the entire image at a readable size, including details OCR might miss. The tested output replaces matched pixels with opaque black; it is not a reversible overlay or blur.',
        'For multiple files, use the native batch selection. PDFs can contain up to 20 pages and be up to 10 MiB. Wait for every page, then use Download ZIP for separate PNGs or Download PDF for an image-only PDF. These exports lose searchable text, forms, links and other original PDF structure.',
        'Inspect every exported page before sharing. OCR can miss handwriting, unusual layouts, small text and patterns outside its rules. If a sensitive detail remains, do not share the file: use an appropriate manual redaction tool and check that output too.',
        'Use Process Another Image or Reset to clear the current files and results. Remove sensitive saved rules through Detection Settings, or clear the tools site’s browser data after preserving work from other tools on that shared origin. Downloads and your original file remain until you delete them.',
      ],
      success: 'The fictional PNG was tested on desktop and mobile: matched email/IP pixels became solid opaque black, while the green strip remained unchanged. A fictional two-page PDF produced two PNGs and a reopened image-only PDF without a retained text layer. This does not establish detection accuracy for your documents.',
      troubleshooting: 'Try a clear, small image first. Large batches and PDF rasterization can use substantial browser memory. Check the allowlist and selected detection categories if a value remains. A zero count or a completed progress bar is not a safety check.',
      privacy: 'Files, OCR and export run on your device; the local worker, English model, PDF support and fonts come from Utilibre. No OCR server/API or image upload is enabled. Files stay in page memory, while detection settings and custom rules persist in localStorage after tab closure. Native model caching in IndexedDB is disabled; browser caching of application resources is separate. Downloads remain on your device.',
      next: 'Share only the inspected exported copy. Keep originals private and remember that a recipient can retain any file you send.',
    },
    es: {
      title: 'Buscá y cubrí texto sensible en una imagen',
      intro: 'Usá OCR local para encontrar posible información sensible y revisá cada resultado. La detección automática ayuda, pero no demuestra que el archivo no contenga datos privados.',
      prerequisites: 'Usá un navegador actual con JavaScript, WebAssembly, trabajadores y descargas. La aplicación y el modelo OCR están en inglés. Empezá con el PNG ficticio de abajo y conservá el original aparte.',
      steps: [
        'Abrí AutoRedact y revisá Detection Settings. La lista Safe Values excluye varias direcciones comunes de routers, loopback y DNS. Quitá una excepción si necesitás ocultar esa dirección. Las palabras, fechas y reglas personalizadas también quedan guardadas en este navegador.',
        'Arrastrá el PNG ficticio a Drop images or PDFs here o seleccionalo desde el control de archivos. Esperá a que termine el OCR local. Comprobá que el correo ficticio y 203.0.113.42 queden cubiertos, y que el título y la franja verde sigan visibles.',
        'Elegí Download Redacted Image y abrí el PNG descargado. Revisá toda la imagen a un tamaño legible, incluso los detalles que el OCR puede omitir. En la prueba, los píxeles detectados se reemplazaron por negro opaco; no es una capa reversible ni un desenfoque.',
        'Para varios archivos, usá la selección por lotes. Los PDF admiten hasta 20 páginas y 10 MiB. Esperá a que termine cada página y usá Download ZIP para obtener PNG separados o Download PDF para un PDF de imágenes. Estas exportaciones pierden texto seleccionable, formularios, enlaces y otra estructura del original.',
        'Revisá cada página exportada antes de compartirla. El OCR puede omitir escritura a mano, diseños inusuales, texto pequeño o datos fuera de sus reglas. Si queda un dato sensible, no compartás el archivo: usá una herramienta adecuada de redacción manual y revisá también ese resultado.',
        'Usá Process Another Image o Reset para quitar archivos y resultados actuales. Borrá las reglas sensibles desde Detection Settings o eliminá los datos del sitio tools después de conservar el trabajo de otras herramientas de ese origen compartido. Las descargas y el original permanecen hasta que los borrés.',
      ],
      success: 'El PNG ficticio se probó en escritorio y móvil: los píxeles del correo y la IP detectados quedaron negros y opacos, y la franja verde no cambió. Un PDF ficticio de dos páginas produjo dos PNG y un PDF de imágenes que se volvió a abrir sin una capa de texto retenida. Esto no establece la precisión con tus documentos.',
      troubleshooting: 'Probá primero con una imagen pequeña y clara. Los lotes grandes y la conversión de PDF pueden usar bastante memoria del navegador. Revisá las excepciones y categorías si un dato permanece. Un contador en cero o una barra completa no comprueba que sea seguro compartirlo.',
      privacy: 'Los archivos, el OCR y la exportación se procesan en tu dispositivo; el trabajador, modelo inglés, soporte de PDF y fuentes se descargan de Utilibre. No hay servidor OCR/API ni subida de imágenes habilitados. Los archivos quedan en memoria, pero los ajustes y reglas persisten en localStorage al cerrar la pestaña. La caché nativa del modelo en IndexedDB está desactivada; la caché de recursos del navegador es independiente. Las descargas quedan en tu dispositivo.',
      next: 'Compartí solo la copia exportada que revisaste. Conservá los originales en privado y recordá que el destinatario puede guardar cualquier archivo que le enviés.',
    },
  },
}];
