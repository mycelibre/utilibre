import type { CatalogEntry, LocalizedText } from './catalog.ts';
import { reviewedFossProviders } from './upstreams.ts';
const text = (en: string, es: string): LocalizedText => ({ en, es });
const provider = reviewedFossProviders.structables;

export const structablesAdditions: CatalogEntry[] = [{
  id: 'structables', providerId: 'structables', kind: 'service', implementation: 'upstream-application', portalSurface: 'upstream-interface',
  category: 'service', discoveryGroup: 'reading', configUrlKey: 'publicStructablesUrl',
  name: text('Read DIY projects · Structables', 'Leer proyectos para hacer · Structables'),
  description: text('Browse Instructables projects and read their steps and pictures through Utilibre.', 'Explorá proyectos de Instructables y leé sus pasos e imágenes mediante Utilibre.'),
  launchLabel: text('Explore projects', 'Explorar proyectos'),
  bestFor: text('Finding a craft, workshop or learning project to try.', 'Encontrar un proyecto de manualidades, taller o aprendizaje para probar.'),
  help: text('Choose a category or use Search. Open a project and read the materials and steps. The application interface is in English; project text keeps its original language. There are no accounts or publishing controls.', 'Elegí una categoría o usá Search. Abrí un proyecto y leé los materiales y los pasos. La interfaz está en inglés; cada proyecto conserva su idioma original. No hay cuentas ni controles para publicar.'),
  limitation: text('Embedded video players and comments are unavailable. Source access can fail; files larger than 8 MiB are refused.', 'No están disponibles los reproductores de video integrados ni los comentarios. El acceso al origen puede fallar; se rechazan archivos mayores de 8 MiB.'),
  unavailableReason: text('Not open yet: project text and search work, but project images fail at the source.', 'Todavía no está abierto: funcionan las búsquedas y el texto, pero fallan las imágenes de los proyectos en el origen.'),
  labels: ['server', 'proxy', 'external'], filesUploaded: false,
  dataFlow: text('Search terms, project paths and requested media reach Utilibre. The server fetches public content from Instructables and its media hosts without forwarding visitor IP headers. This is server processing, not end-to-end encryption. Automatic outside browser resources are blocked; ordinary external links leave Utilibre when selected.', 'Las búsquedas, rutas de proyectos e imágenes solicitadas llegan a Utilibre. El servidor obtiene contenido público de Instructables y sus servidores de archivos sin reenviar encabezados con tu dirección IP. Es procesamiento en el servidor, no cifrado de extremo a extremo. Se bloquean recursos externos automáticos del navegador; los enlaces externos salen de Utilibre cuando los elegís.'),
  upstreamServices: ['Instructables', 'Instructables media hosts', 'Hetzner hosting'],
  temporaryStorage: text('At most 32 JSON responses per worker are cached in memory and reused for up to 15 minutes. Media disk caching is disabled. The browser may keep its theme preference and normal history/cache.', 'Se guardan hasta 32 respuestas JSON por proceso en memoria, reutilizables durante 15 minutos. No se guardan archivos multimedia en disco. El navegador puede conservar el tema y su historial/caché habituales.'),
  retention: text('Worker restart clears the memory cache. Expiry prevents reuse but does not promise immediate erasure. No account library or content backup is created. Clear browser data and delete downloaded files separately.', 'Reiniciar el proceso vacía su caché. El vencimiento impide reutilizar los datos, pero no promete borrado inmediato. No se crea una biblioteca de cuenta ni un respaldo del contenido. Borrá los datos del navegador y los archivos descargados por separado.'),
  logging: text('Application and container request logging is disabled. No visitor analytics are installed. Source websites and infrastructure providers have separate processing; see Utilibre’s privacy policy.', 'Los registros de solicitudes de la aplicación y del contenedor están desactivados. No se instalan estadísticas de visitantes. Los sitios de origen y los proveedores de infraestructura tienen tratamiento independiente; consultá la política de privacidad de Utilibre.'),
  license: provider.license, upstreamProject: provider.project, upstreamSourceUrl: provider.sourceUrl, installedVersion: provider.installedVersion,
  modified: true, operationalStatus: 'not-deployed',
}];
