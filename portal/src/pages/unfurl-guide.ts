import type { PracticalGuide } from './practical-guide-data.ts';

export const unfurlGuides: PracticalGuide[] = [{
  id: 'unfurl', paths: { en: 'guides/expand-link', es: 'guias/expandir-enlace' },
  tools: [{ id: 'unfurl', label: { en: 'Open Unfurl', es: 'Abrir Unfurl' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Inspect a URL and follow its HTTP redirects',
      intro: 'Unfurl breaks a URL into a graph and can reveal HTTP redirect destinations. This task sends the URL to Utilibre and may contact its destinations.',
      prerequisites: 'Do not submit passwords, private tokens or confidential links. Visiting a unique or one-time link can register engagement or consume it, even from this server. Controls remain in English. Expansion is not a safety verdict.',
      steps: [
        'Open Unfurl. To try the parser without a real destination, enter https://example.invalid/library?book=fictional-title&count=24 and choose Unfurl!. The fictional domain cannot be expanded, but its URL components appear.',
        'For a link you intend to inspect, enter its complete HTTP(S) URL. Look for Expanded URL nodes: these come from HTTP Location headers. Relative redirects are resolved against the preceding URL.',
        'Use Graph, Tree and Text to inspect the same result. In Text, choose Copy tree to clipboard to retain the shown analysis. Protect copied text that contains identifying information.',
        'Read the destination yourself before choosing to open it elsewhere. A missing Expanded URL node can mean no redirect, a blocked destination, a timeout or an unsupported redirect mechanism.',
        'Return to the tool’s root when finished. The submitted URL can remain in browser history because the native route uses a query string. Clear relevant browser history if needed; clearing the theme setting alone does not remove that history.',
      ],
      success: 'Fictional native tests followed relative HTTP redirects, stopped at ten fetched URLs, and used no page body. Graph, Tree, Text and clipboard were checked in the browser. The operator’s ordinary HTTP-to-HTTPS redirect also worked through the restricted proxy.',
      troubleshooting: 'Only public HTTP(S) destinations on ports 80/443 are eligible. The instance uses HEAD requests; a server that rejects HEAD may not expand, and there is no GET fallback. Up to ten distinct URLs and 100 graph nodes are processed; there are two simultaneous jobs and a per-client request limit. JavaScript redirects, consent pages, authenticated content and provider API expansion are unavailable. An incomplete chain must not be treated as a final destination.',
      privacy: 'Utilibre processes the submitted URL; destinations and DNS resolvers receive the requests needed for expansion. Destination pages/scripts/previews are not downloaded into your browser. The application has no stored request history or account database; hosting/security logs are separate. Theme preferences persist locally. URLs in browser history and any copied results remain until you remove them.',
      next: 'Use the separate local URL Parameter Cleaner to remove known tracking parameters. Neither parsing, expansion nor cleaning establishes that a destination is trustworthy.',
    },
    es: {
      title: 'Inspeccioná una URL y seguí sus redirecciones HTTP',
      intro: 'Unfurl descompone una URL en un gráfico y puede mostrar destinos de redirecciones HTTP. Esta tarea envía la URL a Utilibre y puede contactar sus destinos.',
      prerequisites: 'No enviés contraseñas, tokens privados ni enlaces confidenciales. Consultar un enlace único o de un solo uso puede registrar actividad o consumirlo, incluso desde este servidor. Los controles están en inglés. Expandir no demuestra que sea seguro.',
      steps: [
        'Abrí Unfurl. Para probar el análisis sin un destino real, escribí https://example.invalid/library?book=fictional-title&count=24 y elegí Unfurl!. El dominio ficticio no se puede expandir, pero aparecen sus componentes.',
        'Para inspeccionar un enlace, ingresá su URL HTTP(S) completa. Buscá los nodos Expanded URL: provienen de cabeceras HTTP Location. Las redirecciones relativas se resuelven usando la URL anterior.',
        'Usá Graph, Tree y Text para revisar el mismo resultado. En Text, elegí Copy tree to clipboard para conservar el análisis mostrado. Protegé cualquier texto copiado con información identificable.',
        'Revisá el destino antes de decidir abrirlo por separado. Que no aparezca Expanded URL puede significar que no hubo redirección, que el destino está bloqueado, que venció el tiempo o que el mecanismo no es compatible.',
        'Volvé al inicio de la herramienta cuando terminés. La URL puede quedar en el historial del navegador porque la ruta nativa usa una consulta. Borrá el historial pertinente si lo necesitás: borrar solo la preferencia de tema no quita ese historial.',
      ],
      success: 'Las pruebas ficticias siguieron redirecciones HTTP relativas, se detuvieron tras diez URL consultadas y no leyeron cuerpos de páginas. Se comprobaron Graph, Tree, Text y el portapapeles. También funcionó la redirección HTTP a HTTPS del sitio del operador mediante el proxy restringido.',
      troubleshooting: 'Solo se permiten destinos HTTP(S) públicos en puertos 80/443. Se usan peticiones HEAD: un servidor que las rechaza puede no expandirse y no hay alternativa GET. Se procesan hasta diez URL distintas y 100 nodos; hay dos tareas simultáneas y un límite de peticiones por cliente. No se usan redirecciones JavaScript, páginas de consentimiento, contenido autenticado ni API de proveedores. No tomés una cadena incompleta como destino definitivo.',
      privacy: 'Utilibre procesa la URL enviada; los destinos y resolutores DNS reciben las consultas necesarias. Las páginas, scripts y vistas previas del destino no se descargan en tu navegador. La aplicación no guarda un historial de consultas ni una base de cuentas; los registros de alojamiento y seguridad son distintos. La preferencia de tema persiste localmente. El historial del navegador y los resultados copiados quedan hasta que los borrés.',
      next: 'Usá URL Parameter Cleaner, la herramienta local separada, para quitar parámetros de rastreo conocidos. Analizar, expandir o limpiar un enlace no demuestra que su destino sea confiable.',
    },
  },
}];
