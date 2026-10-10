import type { PracticalGuide } from './practical-guide-data.ts';

export const readerAdditionGuides: PracticalGuide[] = [{
  id: 'public-page-reader', paths: { en: 'guides/public-page-reader', es: 'guias/lector-paginas-publicas' },
  tools: [{ id: '13ft', label: { en: 'Open the public-page reader', es: 'Abrir el lector de páginas públicas' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Read a public HTML page without its scripts',
      intro: "Read the text of a public HTML page without its scripts or automatic resource loading. 13ft retrieves the page through Utilibre’s server; frames and forms are blocked too.",
      prerequisites: 'Use a public HTTP or HTTPS page that you are entitled to access. Do not submit private links, passwords, account tokens or confidential queries. The source receives the requested URL from Utilibre; this is server processing, not a local-only tool.',
      steps: [
        'Open the reader and choose English or Español. Paste the public page address into Public http:// or https:// page address, then choose Submit. The form works without JavaScript.',
        'Use a direct page URL on ordinary HTTP or HTTPS ports. The source must return HTML directly; the reader does not follow redirects, use your source-site login, solve bot challenges or contact archive and Freedium fallbacks.',
        'Read the returned text. Source scripts, images, fonts, frames and forms are unavailable. Some page layouts may be incomplete. Ordinary links can take you to their original destinations when you choose them; the reader does not check whether those destinations are safe.',
        'Use your browser’s normal print or save controls if you need an independent copy. This service does not create a reusable stored-article link or provide an archive/export-import account. A saved copy may omit unavailable resources.',
        'Close the reader when finished. There is no server article record to delete or retrieve later. Clear relevant browser history/site data if needed, and delete saved files yourself; closing a tab does not delete downloaded files.',
      ],
      success: 'An owned fictional public page was fetched through the restricted proxy and read using both native language forms. Browser checks found no source scripts, automatic navigation or external resource requests. Private-address/DNS-change denial and the decoded-content limit were checked separately.',
      troubleshooting: 'Redirects, non-HTML responses, large pages and slow sources can fail. The reader accepts at most 1 MiB of decoded HTML, allows two concurrent requests globally and limits each client to 12 requests per minute with a small burst. If you receive 429, wait before trying again. This is not a guarantee of access to any publisher or paywall.',
      privacy: 'Utilibre processes the submitted URL and source HTML on the server. The source sees Utilibre’s request; the configured Cloudflare and Quad9 DNS resolvers can receive source hostnames. The public-edge/provider notes also apply. There is no persistent article database, cache or article backup; request data exists transiently in workers and the browser without a promise of immediate memory erasure. Size-rotated operational diagnostics remain. Do not use this reader for confidential material.',
      next: 'For source features that need scripts, login or images, use the source directly only if its privacy and access conditions are acceptable to you.',
    },
    es: {
      title: 'Leé una página HTML pública sin sus scripts',
      intro: "Leé el texto de una página HTML pública sin sus scripts ni carga automática de recursos. 13ft recupera la página desde el servidor de Utilibre; también se bloquean marcos y formularios.",
      prerequisites: 'Usá una página HTTP o HTTPS pública a la que tengás derecho a acceder. No ingresés enlaces privados, contraseñas, tokens de cuentas ni consultas confidenciales. El origen recibe la URL solicitada desde Utilibre: el procesamiento ocurre en el servidor, no solo en tu dispositivo.',
      steps: [
        'Abrí el lector y elegí English o Español. Pegá la dirección pública en Dirección pública http:// o https:// y elegí Enviar. El formulario funciona sin JavaScript.',
        'Usá una URL directa con los puertos habituales de HTTP o HTTPS. El origen debe devolver HTML directamente; el lector no sigue redirecciones ni usa tu sesión del sitio original, ni resuelve desafíos antibots ni consulta archivos alternativos o Freedium.',
        'Leé el texto obtenido. No están disponibles los scripts, imágenes, fuentes, marcos ni formularios del origen. Algunos diseños pueden quedar incompletos. Los enlaces comunes pueden llevarte al destino original cuando los elijás; el lector no comprueba si esos destinos son seguros.',
        'Si necesitás una copia independiente, usá las funciones habituales de imprimir o guardar del navegador. Este servicio no crea un enlace reutilizable a un artículo almacenado ni ofrece una cuenta para archivar, exportar o importar artículos. La copia guardada puede omitir recursos no disponibles.',
        'Cerrá el lector cuando terminés. No hay un registro del artículo en el servidor para borrar o recuperar después. Borrá el historial o los datos pertinentes del navegador si lo necesitás y eliminá los archivos guardados por tu cuenta; cerrar una pestaña no borra las descargas.',
      ],
      success: 'Se obtuvo una página pública ficticia propia mediante el proxy restringido y se leyó con ambos formularios de idioma. Las pruebas del navegador no encontraron scripts del origen, navegación automática ni solicitudes de recursos externos. Se comprobaron por separado el bloqueo de direcciones privadas y cambios de DNS, y el límite de contenido descomprimido.',
      troubleshooting: 'Pueden fallar las redirecciones, respuestas que no sean HTML, páginas grandes y orígenes lentos. El lector admite hasta 1 MiB de HTML descomprimido, permite dos solicitudes simultáneas en total y limita a cada cliente a 12 solicitudes por minuto con una pequeña ráfaga. Si recibís un 429, esperá antes de repetir. No garantiza acceso a ningún editor ni muro de pago.',
      privacy: 'Utilibre procesa la URL ingresada y el HTML del origen en el servidor. El origen ve la solicitud de Utilibre; los resolvedores DNS configurados de Cloudflare y Quad9 pueden recibir los nombres de los sitios consultados. También se aplican las notas sobre el acceso público y sus proveedores. No hay base de datos, caché persistente ni copia de seguridad de artículos; los datos existen temporalmente en los procesos y el navegador, sin promesa de borrado inmediato de memoria. Se conservan diagnósticos operativos con rotación por tamaño. No usés el lector para material confidencial.',
      next: 'Para funciones que requieren scripts, sesión o imágenes, usá el origen directamente solo si aceptás sus condiciones de privacidad y acceso.',
    },
  },
}];
