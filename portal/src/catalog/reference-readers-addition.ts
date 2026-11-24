import type { CatalogEntry, LocalizedText } from './catalog.ts';
import { reviewedFossProviders } from './upstreams.ts';

const text = (en: string, es: string): LocalizedText => ({ en, es });
const wiki = reviewedFossProviders.wikimore;
const tabs = reviewedFossProviders.freetar;

export const referenceReaderAdditions: CatalogEntry[] = [
  {
    id: 'wikimore', providerId: 'wikimore', kind: 'service', implementation: 'upstream-application', portalSurface: 'upstream-interface',
    category: 'service', discoveryGroup: 'reading', configUrlKey: 'publicWikimoreUrl',
    name: text('Read Wikimedia articles · Wikimore', 'Leer artículos de Wikimedia · Wikimore'),
    description: text('Search and read public Wikipedia and other Wikimedia pages in a simpler interface.', 'Buscá y leé páginas públicas de Wikipedia y otros proyectos Wikimedia en una interfaz más simple.'),
    launchLabel: text('Read an article', 'Leer un artículo'),
    bestFor: text('Looking up a topic without loading Wikipedia’s full interface.', 'Consultar un tema sin cargar toda la interfaz de Wikipedia.'),
    help: text('Choose a project and language, then Search. Open an article or follow its internal links. This is a public reference reader; check the original article and its source citations when accuracy matters.', 'Elegí un proyecto y un idioma, luego usá Search. Abrí un artículo o seguí sus enlaces internos. Es un lector de referencias públicas; verificá el artículo original y sus fuentes cuando la exactitud sea importante.'),
    limitation: text('Wikimedia availability and API limits apply. Some maps, media and editing features may not display; this service does not provide a Wikimedia account.', 'Depende de la disponibilidad y los límites de la API de Wikimedia. Algunos mapas, archivos y funciones de edición pueden faltar; este servicio no ofrece una cuenta de Wikimedia.'),
    labels: ['server', 'proxy', 'external'], filesUploaded: false,
    dataFlow: text('Utilibre fetches the public page, search results and requested media from Wikimedia. Wikimedia sees Utilibre’s server, not your browser IP. Search words and article names reach Utilibre and Wikimedia; ordinary external links contact their destinations only when opened.', 'Utilibre obtiene de Wikimedia la página pública, los resultados de búsqueda y los archivos solicitados. Wikimedia ve el servidor de Utilibre, no la IP del navegador. Las palabras buscadas y los nombres de artículos llegan a Utilibre y Wikimedia; los enlaces externos comunes contactan su destino al abrirlos.'),
    upstreamServices: ['Wikimedia APIs and media hosts', 'Hetzner hosting'],
    temporaryStorage: text('Wikimore caches public data in bounded worker memory; different native caches can last from 30 minutes to 24 hours. The browser keeps its theme preference and normal history/cache.', 'Wikimore guarda datos públicos en memoria limitada; sus cachés nativas pueden durar entre 30 minutos y 24 horas. El navegador guarda la preferencia de tema y su historial/caché habituales.'),
    retention: text('Worker restarts clear server memory caches. Browser history can include search terms and page names; clear site data/history to remove local traces. No reader account or backup is created.', 'Reiniciar los procesos vacía las cachés de memoria. El historial del navegador puede incluir búsquedas y nombres de páginas; borrá los datos e historial locales si hace falta. No se crea una cuenta ni copia de seguridad del lector.'),
    logging: text('Application and container request logs are disabled, and there are no visitor analytics. Wikimedia and delivery providers retain their own operational data.', 'No hay registros de solicitudes de la aplicación o el contenedor ni estadísticas de visitantes. Wikimedia y los proveedores de entrega conservan sus propios datos operativos.'),
    license: wiki.license, upstreamProject: wiki.project, upstreamSourceUrl: wiki.sourceUrl, installedVersion: wiki.installedVersion,
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'freetar', providerId: 'freetar', kind: 'service', implementation: 'upstream-application', portalSurface: 'upstream-interface',
    category: 'service', discoveryGroup: 'creative', configUrlKey: 'publicFreetarUrl',
    name: text('Find guitar chords · Freetar', 'Buscar acordes de guitarra · Freetar'),
    description: text('Search for a song’s chords or tablature, practice with autoscroll, and print a copy.', 'Buscá acordes o tablaturas, practicá con desplazamiento automático e imprimí una copia.'),
    launchLabel: text('Find chords', 'Buscar acordes'),
    bestFor: text('Practicing a song without popups or an account.', 'Practicar una canción sin ventanas emergentes ni cuenta.'),
    help: text('Search for an artist or song, open a Chords result, then adjust autoscroll or print. Favorites stay in this browser and can be exported as JSON from Advanced. The app interface is in English.', 'Buscá un artista o una canción, abrí un resultado Chords y ajustá el desplazamiento o imprimí. Los favoritos quedan en este navegador y se exportan como JSON desde Advanced. La interfaz está en inglés.'),
    limitation: text('Results depend on Ultimate Guitar and may disappear or be blocked. This is a reader; copyright and attribution belong to the original publishers.', 'Los resultados dependen de Ultimate Guitar y pueden desaparecer o bloquearse. Es un lector; los derechos y créditos pertenecen a quienes publicaron el contenido.'),
    labels: ['server', 'proxy', 'external'], filesUploaded: false,
    dataFlow: text('Utilibre sends your search and selected song request to Ultimate Guitar from its server without forwarding your browser IP. Autoscroll, printing and favorites work in the browser. External links contact their destination when opened.', 'Utilibre envía la búsqueda y la canción elegida a Ultimate Guitar desde su servidor sin reenviar la IP del navegador. El desplazamiento, la impresión y los favoritos funcionan en el navegador. Los enlaces externos contactan su destino al abrirlos.'),
    upstreamServices: ['Ultimate Guitar', 'Hetzner hosting'],
    temporaryStorage: text('Searches and tabs use a bounded in-memory cache for up to 15 minutes. Favorites and theme are stored in this browser’s local storage, with an optional JSON export.', 'Las búsquedas y tablaturas usan una caché limitada en memoria por hasta 15 minutos. Los favoritos y el tema se guardan en el almacenamiento local del navegador y pueden exportarse como JSON.'),
    retention: text('Worker restart clears the server cache. Remove favorites using their stars or clear site data; delete exported files separately. No account or content backup is created.', 'Reiniciar el proceso vacía la caché del servidor. Quitá favoritos con sus estrellas o borrá los datos del sitio; eliminá los archivos exportados por separado. No se crea una cuenta ni respaldo del contenido.'),
    logging: text('Application and container request logs are disabled, and there are no visitor analytics. Ultimate Guitar and delivery providers have separate processing.', 'No hay registros de solicitudes de la aplicación o el contenedor ni estadísticas de visitantes. Ultimate Guitar y los proveedores de entrega tienen tratamiento independiente.'),
    license: tabs.license, upstreamProject: tabs.project, upstreamSourceUrl: tabs.sourceUrl, installedVersion: tabs.installedVersion,
    modified: true, operationalStatus: 'operational',
  },
];
