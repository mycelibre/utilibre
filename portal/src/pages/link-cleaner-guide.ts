import type { PracticalGuide } from './practical-guide-data.ts';

export const linkCleanerGuides: PracticalGuide[] = [{
  id: 'link-cleaner', paths: { en: 'guides/clean-link', es: 'guias/limpiar-enlace' },
  tools: [{ id: 'link-cleaner', label: { en: 'Open URL Parameter Cleaner', es: 'Abrir URL Parameter Cleaner' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Remove tracking parameters from a link',
      intro: 'Clean known tracking parameters locally, then review what remains before sharing. The cleaner does not visit the pasted links.',
      prerequisites: 'Use a current browser. Controls are in English. A cleaned link can still contain identifiers or lead to an unsafe destination; this tool is not a security scanner.',
      steps: [
        'Paste one URL per line. For a fictional example use https://example.invalid/article?id=42&utm_source=example#section. Do not open this example destination.',
        'Choose Review cleaned URLs. The example should become https://example.invalid/article?id=42#section: the known tracking parameter is removed while the functional id and fragment stay.',
        'Review each result and removed parameter. Unknown parameters, repeated values and fragments are retained by default. Add an explicit custom removal rule only when you understand what the parameter does; keep rules take precedence.',
        'Choose Copy valid results and paste into a place where you can inspect the text. Invalid inputs are excluded from the copied results.',
        'If you need reusable rules, use Export rule profile and later Import rule profile. Export audit JSON is a separate report: keep redaction enabled unless you need the original secrets, and protect the download. Even a redacted report retains domains and paths.',
      ],
      success: 'The public fictional test removed utm_source and fbclid, preserved functional values and duplicate tags, copied the exact result, and exported/imported a rule profile. Redacted JSON excluded the fictional query secret and fragment key.',
      troubleshooting: 'A parameter remaining in a result is not necessarily a bug: unknown parameters are preserved to avoid breaking links. Review customized rules carefully. Reloading clears the current page input and results.',
      privacy: 'Cleaning runs in browser memory without fetching pasted destinations or saving an application history. Hosting still processes requests for the tool itself. Downloaded profiles/reports stay on your device until you delete them. Other tools on the same tools.utilibre.org origin may retain their own browser data; this cleaner does not clear it.',
      next: 'Check the destination and any remaining identifying path or parameters yourself before sharing. Removing tracking parameters does not expand a shortened link.',
    },
    es: {
      title: 'Quitá parámetros de rastreo de un enlace',
      intro: 'Limpiá parámetros de rastreo conocidos en tu navegador y revisá lo que queda antes de compartir. La herramienta no visita los enlaces que pegás.',
      prerequisites: 'Usá un navegador actual. Los controles están en inglés. Un enlace limpio todavía puede contener identificadores o llevar a un destino peligroso: esto no es un análisis de seguridad.',
      steps: [
        "Pegá una URL por línea. Como ejemplo ficticio usá https://example.invalid/article?id=42&utm_source=example#section. No abrás ese destino de ejemplo.",
        'Elegí Review cleaned URLs. El resultado debería ser https://example.invalid/article?id=42#section: se quita el parámetro de rastreo conocido y se conservan el id funcional y el fragmento.',
        'Revisá cada resultado y los parámetros quitados. Los parámetros desconocidos, los valores repetidos y los fragmentos se conservan. Agregá una regla de eliminación solo si entendés qué hace ese parámetro; las reglas de conservación tienen prioridad.',
        'Elegí Copy valid results y pegá el texto donde podás revisarlo. Las entradas inválidas no se copian.',
        'Para reutilizar reglas, usá Export rule profile y después Import rule profile. Export audit JSON descarga un informe distinto: mantené activada la ocultación de datos salvo que necesités los secretos originales y protegé la descarga. Incluso un informe con datos ocultos conserva dominios y rutas.',
      ],
      success: 'La prueba pública ficticia quitó utm_source y fbclid, conservó valores funcionales y etiquetas repetidas, copió el resultado exacto y exportó e importó un perfil de reglas. El JSON con datos ocultos no incluyó el secreto ficticio de consulta ni la clave del fragmento.',
      troubleshooting: 'Que un parámetro permanezca no implica un fallo: se conservan los desconocidos para evitar romper enlaces. Revisá con cuidado las reglas personalizadas. Al recargar se borran las entradas y los resultados de esta página.',
      privacy: 'La limpieza usa la memoria del navegador, no visita los destinos pegados ni guarda un historial de la aplicación. El alojamiento sí procesa las peticiones de la herramienta. Los perfiles e informes descargados quedan en tu dispositivo hasta que los borrés. Otras herramientas de tools.utilibre.org pueden conservar sus propios datos del navegador; esta no los borra.',
      next: 'Revisá el destino y los identificadores que queden en la ruta o los parámetros antes de compartir. Quitar parámetros de rastreo no expande un enlace acortado.',
    },
  },
}];
