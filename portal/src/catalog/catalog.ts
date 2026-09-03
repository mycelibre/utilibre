import type { Language } from '../i18n/index.ts';

export type PrivacyLabel = 'local' | 'server' | 'proxy' | 'external';
export type CatalogCategory = 'service' | 'image' | 'pdf' | 'file' | 'utility';
export type CatalogKind = 'service' | 'tool';
export type OperationalStatus = 'operational' | 'degraded' | 'unavailable' | 'maintenance' | 'not-deployed';
export type DiscoveryGroup = 'find' | 'files' | 'documents' | 'text-data' | 'feeds-monitoring';
export type AccountAccess = 'closed-registration' | 'invite-required';

export interface LocalizedText {
  en: string;
  es: string;
}

export interface CatalogEntry {
  id: string;
  kind: CatalogKind;
  category: CatalogCategory;
  discoveryGroup: DiscoveryGroup;
  featuredOrder?: number;
  accountAccess?: AccountAccess;
  name: LocalizedText;
  description: LocalizedText;
  slug?: Record<Language, string>;
  configUrlKey?: string;
  labels: PrivacyLabel[];
  dataFlow: LocalizedText;
  upstreamServices: string[];
  filesUploaded: boolean;
  temporaryStorage: LocalizedText;
  retention: LocalizedText;
  logging: LocalizedText;
  license: string;
  upstreamProject: string;
  upstreamSourceUrl: string;
  installedVersion: string;
  modified: boolean;
  operationalStatus: OperationalStatus;
  deferralReason?: LocalizedText;
}

const browserMemory: LocalizedText = {
  en: 'Working data exists only in this browser tab and is released when the page is reloaded or closed.',
  es: 'Los datos de trabajo existen únicamente en esta pestaña y se liberan al recargarla o cerrarla.',
};
const noRetention: LocalizedText = {
  en: 'The portal server retains none of the selected file or entered content.',
  es: 'El servidor del portal no conserva los archivos seleccionados ni el contenido ingresado.',
};
const localLogging: LocalizedText = {
  en: 'Tool content and filenames are not intentionally logged. Normal portal and edge request logs remain separate.',
  es: 'El contenido y los nombres de archivo no se registran intencionalmente. Los registros normales de solicitudes del portal y del borde son independientes.',
};
const browserFlow: LocalizedText = {
  en: 'Browser only; no file or content upload after application assets load.',
  es: 'Solo el navegador; no se cargan archivos ni contenido después de cargar la aplicación.',
};

function localTool(entry: Pick<CatalogEntry, 'id' | 'category' | 'discoveryGroup' | 'name' | 'description' | 'slug'> & Partial<Pick<CatalogEntry, 'featuredOrder' | 'license' | 'upstreamProject' | 'upstreamSourceUrl' | 'installedVersion'>>): CatalogEntry {
  return {
    ...entry,
    kind: 'tool',
    labels: ['local'],
    dataFlow: browserFlow,
    upstreamServices: [],
    filesUploaded: false,
    temporaryStorage: browserMemory,
    retention: noRetention,
    logging: localLogging,
    license: entry.license ?? 'AGPL-3.0-or-later',
    upstreamProject: entry.upstreamProject ?? '',
    upstreamSourceUrl: entry.upstreamSourceUrl ?? '',
    installedVersion: entry.installedVersion ?? '0.1.0',
    modified: false,
    operationalStatus: 'operational',
  };
}

export const catalog: CatalogEntry[] = [
  {
    id: 'searxng', kind: 'service', category: 'service', discoveryGroup: 'find', featuredOrder: 1, configUrlKey: 'publicSearchUrl',
    name: { en: 'Web search', es: 'Búsqueda web' },
    description: { en: 'Search selected sources with SearXNG, hosted by Utilibre. Queries go upstream from this server instead of your browser.', es: 'Busca en fuentes seleccionadas con SearXNG, alojado por Utilibre. Las consultas salen hacia los buscadores externos desde el servidor, no desde tu navegador.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Caddy edge VM → application VM/SearXNG → selected search engines', es: 'Navegador → VM perimetral con Caddy → VM de aplicaciones/SearXNG → motores de búsqueda seleccionados' },
    upstreamServices: ['Bing', 'Google Custom Search (Blackle partner identifier)', 'Fynd', 'Wiby', 'Wikipedia', 'DuckDuckGo currency endpoint', 'Bing Images/News/Videos', 'Wikimedia Commons', 'Wikinews', 'Wiktionary', 'GitHub', 'MDN', 'Stack Overflow', 'arXiv', 'PubMed', 'Semantic Scholar', 'Reuters', 'YouTube', 'Dailymotion', 'Photon'], filesUploaded: false,
    temporaryStorage: { en: 'Short-lived limiter counters and application caches; no search-result database.', es: 'Contadores temporales del limitador y cachés de la aplicación; no hay una base de datos de resultados.' },
    retention: { en: 'Hashed limiter identifiers expire according to limiter windows; suspicious-client counters can last up to 30 days. Preferences may be stored in a first-party SearXNG cookie.', es: 'Los identificadores derivados del limitador vencen según sus ventanas; los contadores de clientes sospechosos pueden durar hasta 30 días. SearXNG puede guardar preferencias en una cookie propia.' },
    logging: { en: 'Access logging is disabled by default. Operational errors remain; exceptional abuse events may include a network address.', es: 'El registro de accesos está desactivado de forma predeterminada. Se conservan errores operativos; eventos excepcionales de abuso pueden incluir una dirección de red.' },
    license: 'AGPL-3.0-or-later', upstreamProject: 'SearXNG', upstreamSourceUrl: 'https://github.com/searxng/searxng', installedVersion: '2026.8.22-9fea41204 + local log redaction hook', modified: true, operationalStatus: 'operational',
  },
  {
    id: 'cobalt', kind: 'service', category: 'service', discoveryGroup: 'files',
    name: { en: 'Download media', es: 'Descargar contenido' },
    description: { en: 'Download supported public media with Cobalt, hosted by Utilibre. Dailymotion is the only enabled source for now.', es: 'Descarga contenido público compatible con Cobalt, alojado por Utilibre. Por ahora, la única fuente habilitada es Dailymotion.' },
    slug: { en: 'tools/download-media', es: 'herramientas/descargar-contenido' },
    labels: ['server', 'proxy', 'external'],
    dataFlow: { en: 'Browser → portal gateway → internal Cobalt → source platform; delivery then uses a server tunnel or an upstream media URL.', es: 'Navegador → puerta de enlace del portal → Cobalt interno → plataforma de origen; luego la entrega usa un túnel del servidor o una URL externa de contenido.' },
    upstreamServices: ['Dailymotion'], filesUploaded: false,
    temporaryStorage: { en: 'Stream metadata is encrypted in process memory for about 90 seconds. An in-memory portal rate bucket holds a client network-address key and count. Media is streamed; no persistent media volume is mounted.', es: 'Los metadatos de transmisión se cifran en memoria del proceso durante unos 90 segundos. Un contador temporal del portal conserva una clave de dirección de red y un conteo. El contenido se transmite y no se monta un volumen persistente.' },
    retention: { en: 'No permanent media retention. Tunnel metadata expires or is cleared on restart. Rate buckets expire after the configured 10-minute window plus at most the 60-second cleanup interval, or on restart.', es: 'No se conserva contenido permanentemente. Los metadatos de descarga vencen o se eliminan al reiniciar. Los contadores de límite vencen tras la ventana configurada de 10 minutos más un máximo de 60 segundos de limpieza, o al reiniciar.' },
    logging: { en: 'The portal does not intentionally log submitted URLs. Cobalt emits operational logs without an access logger; edge query strings should be omitted.', es: 'El portal no registra intencionalmente las URL enviadas. Cobalt produce registros operativos sin registro de accesos; el borde debe omitir las cadenas de consulta.' },
    license: 'AGPL-3.0-only', upstreamProject: 'Cobalt', upstreamSourceUrl: 'https://github.com/imputnet/cobalt', installedVersion: '11.7.1-a636575', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'private-router', kind: 'tool', category: 'utility', discoveryGroup: 'find',
    name: { en: 'Open through a privacy frontend', es: 'Abrir mediante una interfaz de privacidad' },
    description: { en: 'Check a supported URL, then open it through a configured privacy frontend. The destination must match a fixed allowlist.', es: 'Comprueba una URL compatible antes de abrirla mediante una interfaz de privacidad configurada. El destino debe coincidir con una lista fija.' },
    slug: { en: 'tools/open-privately', es: 'herramientas/abrir-con-privacidad' },
    labels: ['local', 'server', 'proxy'],
    dataFlow: { en: 'The pasted URL is parsed only in the browser. If you choose Continue, the browser opens a fixed configured frontend, which contacts its upstream service.', es: 'La URL pegada se analiza solo en el navegador. Si eliges Continuar, el navegador abre una interfaz fija configurada, que se comunica con su servicio externo.' },
    upstreamServices: ['YouTube', 'Reddit', 'Imgur'], filesUploaded: false,
    temporaryStorage: browserMemory,
    retention: { en: 'Parsing is not retained. A chosen frontend navigation follows that service’s stated retention policy.', es: 'El análisis no se conserva. La navegación elegida sigue la política de conservación de esa interfaz.' },
    logging: { en: 'Pasting is not logged. Following the generated link can appear in the selected frontend and edge operational logs.', es: 'Pegar la URL no se registra. Abrir el enlace generado puede aparecer en los registros operativos de la interfaz elegida y del borde.' },
    license: 'AGPL-3.0-or-later', upstreamProject: '', upstreamSourceUrl: '', installedVersion: '0.1.0', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'redlib', kind: 'service', category: 'service', discoveryGroup: 'find', configUrlKey: 'publicRedditUrl',
    name: { en: 'Redlib for Reddit', es: 'Redlib para Reddit' },
    description: { en: 'Browse public Reddit through Redlib. A typical first visit uses a proof-of-work browser challenge; JavaScript is required, and Reddit may still block this server.', es: 'Navega contenido público de Reddit mediante Redlib. Una primera visita normal usa una prueba de trabajo en el navegador; requiere JavaScript y Reddit aún puede bloquear este servidor.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Cloudflare → Caddy edge VM → application VM/Anubis → Redlib → Reddit. A typical first visit must complete Anubis’s local proof-of-work challenge. Redlib proxies page data and media.', es: 'Navegador → Cloudflare → VM perimetral con Caddy → VM de aplicaciones/Anubis → Redlib → Reddit. En la primera visita, el navegador debe completar la prueba de trabajo local de Anubis. Redlib retransmite páginas y contenido multimedia.' },
    upstreamServices: ['Reddit'], filesUploaded: false,
    temporaryStorage: { en: 'Anubis keeps short-lived challenge records—including the client network address and user agent—in a small local bbolt file. Redlib presents an Android client identity to obtain and refresh a real Reddit OAuth token, kept with connection state and transient page or media buffers in process memory; its /tmp is memory-backed.', es: 'Anubis guarda registros breves del desafío —incluidos la dirección de red del cliente y el agente de usuario— en un pequeño archivo bbolt local. Redlib se presenta como un cliente de Android para obtener y renovar un token OAuth real de Reddit, que mantiene en memoria junto con el estado de conexiones y los búferes temporales de páginas o contenido; su /tmp reside en memoria.' },
    retention: { en: 'Challenge records have a 30-minute TTL; expired records are removed on later access or by hourly cleanup. Anubis sets a 30-minute verification cookie and a 24-hour authorization cookie. Both are host-only, Secure, HttpOnly, SameSite=Lax and Partitioned. Redlib has no browsing-history database; optional display preferences use a separate first-party cookie.', es: 'Los registros del desafío tienen un plazo de 30 minutos; los registros vencidos se eliminan cuando se consultan de nuevo o durante la limpieza cada hora. Anubis crea una cookie de verificación por 30 minutos y otra de autorización por 24 horas. Ambas se limitan al host y usan Secure, HttpOnly, SameSite=Lax y Partitioned. Redlib no tiene una base de datos de historial; las preferencias visuales opcionales usan otra cookie propia.' },
    logging: { en: 'Normal browsing is not intentionally logged by Redlib or Anubis. Anubis logs only warnings and errors; failures may include a host, method, path, user agent, or network address. Docker rotation is limited to 10 MB per file with three files. Edge security logging is separate.', es: 'Redlib y Anubis no registran intencionalmente la navegación normal. Anubis registra solo advertencias y errores; una falla puede incluir host, método, ruta, agente de usuario o dirección de red. Docker limita la rotación a tres archivos de 10 MB. Los registros de seguridad del borde son independientes.' },
    license: 'AGPL-3.0-only', upstreamProject: 'Redlib', upstreamSourceUrl: 'https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374', installedVersion: 'a4d36e9 + local redirect hardening', modified: true, operationalStatus: 'operational',
  },
  {
    id: 'ntfy', kind: 'service', category: 'service', discoveryGroup: 'text-data', configUrlKey: 'publicNtfyUrl',
    name: { en: 'Push notifications', es: 'Notificaciones push' },
    description: { en: 'Send and receive programmable notifications with ntfy, hosted by Utilibre, for scripts, servers, and devices.', es: 'Envía y recibe notificaciones programables con ntfy, alojado por Utilibre, para scripts, servidores y dispositivos.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser or device → Cloudflare → Caddy edge VM → application VM/ntfy. For supported iOS delivery, ntfy sends ntfy.sh the message ID and a SHA-256 hash of this instance’s topic URL; it does not send the message body or attachment.', es: 'Navegador o dispositivo → Cloudflare → VM perimetral con Caddy → VM de aplicaciones/ntfy. Para la entrega compatible con iOS, ntfy envía a ntfy.sh el identificador del mensaje y un hash SHA-256 de la URL del tema en esta instancia; no envía el cuerpo del mensaje ni el archivo adjunto.' },
    upstreamServices: ['ntfy.sh relay for supported iOS delivery (message ID and SHA-256 topic-URL hash only)'], filesUploaded: true,
    temporaryStorage: { en: 'Messages and attachments use persistent caches on the application VM; the total attachment cache is capped at 5 GB.', es: 'Los mensajes y archivos adjuntos usan cachés persistentes en la VM de aplicaciones; la caché total de archivos adjuntos está limitada a 5 GB.' },
    retention: { en: 'Messages expire from ntfy’s cache after 12 hours; attachments expire after three hours. Neither cache is copied into longer-lived backups. Anonymous topics are not accounts and should be unguessable.', es: 'Los mensajes vencen en la caché de ntfy después de 12 horas; los archivos adjuntos vencen después de tres horas. Ninguna de estas cachés se copia en copias de seguridad de mayor duración. Los temas anónimos no son cuentas y deben ser difíciles de adivinar.' },
    logging: { en: 'Operational and abuse-control events can reach rotated Docker logs. Message bodies and attachment contents are not intentionally added to separate analytics logs.', es: 'Los eventos operativos y de control de abuso pueden llegar a los registros rotados de Docker. Los cuerpos de mensajes y el contenido adjunto no se agregan intencionalmente a registros analíticos separados.' },
    license: 'Apache-2.0 / GPL-2.0 dual license', upstreamProject: 'ntfy', upstreamSourceUrl: 'https://github.com/binwiederhier/ntfy/tree/v2.28.0', installedVersion: '2.28.0', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'bentopdf', kind: 'service', category: 'service', discoveryGroup: 'documents', configUrlKey: 'publicPdfUrl',
    name: { en: 'PDF tools', es: 'Herramientas PDF' },
    description: { en: 'Edit PDFs in your browser with BentoPDF. Selected files are not uploaded to Utilibre.', es: 'Edita archivos PDF en tu navegador con BentoPDF. Los archivos seleccionados no se envían a Utilibre.' },
    labels: ['local', 'external'],
    dataFlow: { en: 'PDF content stays in the browser. Some operations fetch executable WASM/runtime assets from jsDelivr; the selected PDF is not sent there or to Utilibre.', es: 'El contenido PDF permanece en el navegador. Algunas operaciones descargan recursos ejecutables WASM de jsDelivr; el PDF seleccionado no se envía allí ni a Utilibre.' },
    upstreamServices: ['jsDelivr for runtime assets used by some tools'], filesUploaded: false,
    temporaryStorage: { en: 'Working PDF data lives in browser memory. The BentoPDF container serves static application assets and has no user-file volume or database.', es: 'Los datos del PDF de trabajo permanecen en la memoria del navegador. El contenedor de BentoPDF sirve archivos estáticos y no tiene volumen de archivos de usuario ni base de datos.' },
    retention: { en: 'Utilibre retains no selected PDF. Browser working data ends when the tab is closed or reloaded; normal browser caching can retain application assets.', es: 'Utilibre no conserva el PDF seleccionado. Los datos de trabajo terminan al cerrar o recargar la pestaña; la caché normal del navegador puede conservar recursos de la aplicación.' },
    logging: { en: 'Static asset requests can appear in rotated container and edge logs. PDF names and contents are not sent with a local operation.', es: 'Las solicitudes de recursos estáticos pueden aparecer en los registros rotados del contenedor y del borde. Los nombres y contenidos del PDF no se envían durante una operación local.' },
    license: 'AGPL-3.0-only', upstreamProject: 'BentoPDF', upstreamSourceUrl: 'https://github.com/alam00000/bentopdf/tree/v2.8.8', installedVersion: '2.8.8', modified: true, operationalStatus: 'operational',
  },
  {
    id: 'vert', kind: 'service', category: 'service', discoveryGroup: 'files', featuredOrder: 2, configUrlKey: 'publicConvertUrl',
    name: { en: 'File converter', es: 'Convertidor de archivos' },
    description: { en: 'Convert supported file formats with VERT in your browser. Files are not uploaded to Utilibre or a VERT conversion server.', es: 'Convierte formatos compatibles en tu navegador con VERT. Los archivos no se envían a Utilibre ni a un servidor de conversión de VERT.' },
    labels: ['local', 'external'],
    dataFlow: { en: 'Core conversions run in the browser. Some optional engines fetch JavaScript or WASM from jsDelivr; no file is sent to a VERT conversion daemon.', es: 'Las conversiones principales ocurren en el navegador. Algunos motores opcionales descargan JavaScript o WASM de jsDelivr; ningún archivo se envía a un servidor de conversión VERT.' },
    upstreamServices: ['jsDelivr for optional conversion runtimes'], filesUploaded: false,
    temporaryStorage: { en: 'Files and conversion output exist in browser memory. The static VERT container has no user-file volume or application database.', es: 'Los archivos y el resultado de la conversión existen en la memoria del navegador. El contenedor estático de VERT no tiene volumen de archivos de usuario ni base de datos.' },
    retention: { en: 'Utilibre retains no converted files. Browser working data ends when the tab is closed or reloaded.', es: 'Utilibre no conserva los archivos convertidos. Los datos de trabajo terminan al cerrar o recargar la pestaña.' },
    logging: { en: 'Static asset requests can appear in rotated container and edge logs. File names and contents are not intentionally logged or uploaded.', es: 'Las solicitudes de recursos estáticos pueden aparecer en los registros rotados del contenedor y del borde. Los nombres y contenidos de archivos no se registran ni se cargan intencionalmente.' },
    license: 'AGPL-3.0-only', upstreamProject: 'VERT', upstreamSourceUrl: 'https://github.com/VERT-sh/VERT/tree/e0ffd34310f9c988b16e22334b13e18de030b0ae', installedVersion: 'e0ffd343', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'omnitools', kind: 'service', category: 'service', discoveryGroup: 'files', configUrlKey: 'publicToolsUrl',
    name: { en: 'Everyday tools', es: 'Herramientas útiles' },
    description: { en: 'Use OmniTools for practical text, data, and file work in your browser. Tested local operations do not upload your input.', es: 'Usa OmniTools para trabajar con texto, datos y archivos en tu navegador. Las operaciones locales verificadas no envían el contenido a Utilibre.' },
    labels: ['local'],
    dataFlow: { en: 'Browser only after application assets load; tested client-side operations do not upload selected content.', es: 'Solo el navegador después de cargar la aplicación; las operaciones locales probadas no suben el contenido seleccionado.' },
    upstreamServices: [], filesUploaded: false,
    temporaryStorage: { en: 'Working content remains in browser memory. The static application container has no database or persistent user-upload volume.', es: 'El contenido de trabajo permanece en la memoria del navegador. El contenedor estático no tiene base de datos ni volumen persistente para cargas de usuarios.' },
    retention: { en: 'Utilibre retains no tool input. Browser working data ends when the tab is closed or reloaded.', es: 'Utilibre no conserva lo ingresado en las herramientas. Los datos de trabajo terminan al cerrar o recargar la pestaña.' },
    logging: { en: 'Static asset requests can appear in rotated container and edge logs. Tool content and selected filenames are not intentionally sent or logged.', es: 'Las solicitudes de recursos estáticos pueden aparecer en los registros rotados del contenedor y del borde. El contenido de las herramientas y los nombres de archivo no se envían ni registran intencionalmente.' },
    license: 'MIT', upstreamProject: 'OmniTools', upstreamSourceUrl: 'https://github.com/iib0011/omni-tools/tree/v0.6.0', installedVersion: '0.6.0', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'healthchecks', kind: 'service', category: 'service', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicMonitorUrl',
    accountAccess: 'closed-registration',
    name: { en: 'Cron monitoring', es: 'Monitoreo de tareas' },
    description: { en: 'Use Healthchecks to see when a scheduled job misses its expected check-in.', es: 'Usa Healthchecks para saber cuándo una tarea programada no envía la señal esperada a tiempo.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser and monitored jobs → Caddy edge VM → application VM/Healthchecks → dedicated PostgreSQL database. Email notifications and account-recovery messages pass through the configured SMTP relay to the recipient’s mail provider.', es: 'Navegador y tareas monitoreadas → VM perimetral con Caddy → VM de aplicaciones/Healthchecks → base de datos PostgreSQL dedicada. Las notificaciones por correo y los mensajes de recuperación de cuenta pasan por el servidor SMTP configurado hasta el proveedor de correo de la persona destinataria.' },
    upstreamServices: ['Configured SMTP relay and recipient mail providers'], filesUploaded: false,
    temporaryStorage: { en: 'Request data may exist briefly in process memory; check definitions, ping events, status and account data are stored in PostgreSQL.', es: 'Los datos de solicitud pueden existir brevemente en memoria; las definiciones de revisiones, eventos, estados y cuentas se guardan en PostgreSQL.' },
    retention: { en: 'Monitoring and account records remain until removed by an authorised user or administrator. No shorter automatic retention is claimed.', es: 'Los registros de monitoreo y de cuentas permanecen hasta que una persona autorizada o la administración los elimine. No se afirma un plazo automático menor.' },
    logging: { en: 'Operational errors, security-relevant events, and mail-delivery failures can reach rotated Docker logs. Outgoing mail uses the configured SMTP relay; registration is closed.', es: 'Los errores operativos, los eventos relevantes para la seguridad y las fallas de entrega de correo pueden llegar a los registros rotados de Docker. El correo saliente usa el servidor SMTP configurado; el registro está cerrado.' },
    license: 'BSD-3-Clause', upstreamProject: 'Healthchecks', upstreamSourceUrl: 'https://github.com/healthchecks/healthchecks/tree/v4.3', installedVersion: '4.3', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'pairdrop', kind: 'service', category: 'service', discoveryGroup: 'files', featuredOrder: 3, configUrlKey: 'publicSendUrl',
    name: { en: 'Send files', es: 'Enviar archivos' },
    description: { en: 'Send text and files between browsers with PairDrop when the network allows it. This instance has no TURN relay, so some connections will fail.', es: 'Envía texto y archivos directamente entre navegadores con PairDrop cuando la red lo permite. No hay un servidor TURN intermedio, así que algunas conexiones pueden fallar.' },
    labels: ['server', 'external'],
    dataFlow: { en: 'Browsers use the Utilibre server for page delivery and WebSocket signalling, then transfer content directly browser-to-browser over WebRTC when the network permits. STUN services can observe network addresses.', es: 'Los navegadores usan el servidor de Utilibre para la página y la señalización WebSocket; luego transfieren el contenido directamente entre navegadores mediante WebRTC cuando la red lo permite. Los servicios STUN pueden observar direcciones de red.' },
    upstreamServices: ['Configured WebRTC STUN services'], filesUploaded: false,
    temporaryStorage: { en: 'Pairing and signalling state exists briefly in server and browser memory. No server-side file-upload volume or TURN relay is deployed.', es: 'El estado de emparejamiento y señalización existe brevemente en la memoria del servidor y del navegador. No se despliega volumen de archivos ni retransmisión TURN en el servidor.' },
    retention: { en: 'Transferred content is not retained by Utilibre. Signalling state ends when sessions close or the process restarts.', es: 'Utilibre no conserva el contenido transferido. El estado de señalización termina al cerrar las sesiones o reiniciar el proceso.' },
    logging: { en: 'Operational WebSocket and rate-limit events can reach rotated logs. File content is not intentionally logged; edge logs may record page and signalling paths.', es: 'Los eventos operativos de WebSocket y de límites pueden llegar a registros rotados. El contenido de los archivos no se registra intencionalmente; el borde puede registrar rutas de página y señalización.' },
    license: 'GPL-3.0-only', upstreamProject: 'PairDrop', upstreamSourceUrl: 'https://github.com/schlagmichdoch/PairDrop/tree/v1.11.2', installedVersion: '1.11.2', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'freshrss', kind: 'service', category: 'service', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicRssUrl',
    accountAccess: 'closed-registration',
    name: { en: 'RSS reader', es: 'Lector RSS' },
    description: { en: 'Read and organize RSS and Atom subscriptions with FreshRSS.', es: 'Lee y organiza suscripciones RSS y Atom con FreshRSS.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Caddy edge VM → application VM/FreshRSS; the server fetches subscribed feed URLs and stores account, subscription and reading data in PostgreSQL.', es: 'Navegador → VM perimetral con Caddy → VM de aplicaciones/FreshRSS; el servidor consulta los feeds suscritos y guarda cuentas, suscripciones y lectura en PostgreSQL.' },
    upstreamServices: ['Websites and feed hosts selected by account holders'], filesUploaded: false,
    temporaryStorage: { en: 'Feed-fetch response buffers and refresh work are temporary. Feed entries, subscriptions, preferences and read state are persistent.', es: 'Los búferes de descarga y el trabajo de actualización son temporales. Las entradas, suscripciones, preferencias y estado de lectura son persistentes.' },
    retention: { en: 'Account and feed data remain until the account holder or administrator removes them, subject to FreshRSS feed-retention settings.', es: 'Los datos de cuentas y feeds permanecen hasta que la persona titular o la administración los elimine, según la configuración de conservación de FreshRSS.' },
    logging: { en: 'Feed-refresh failures and operational errors can reach rotated logs. Requested feed URLs and errors may appear in application diagnostics; registration is closed.', es: 'Las fallas al actualizar feeds y los errores operativos pueden llegar a registros rotados. Las URL de feeds y los errores pueden aparecer en diagnósticos; el registro está cerrado.' },
    license: 'AGPL-3.0', upstreamProject: 'FreshRSS', upstreamSourceUrl: 'https://github.com/FreshRSS/FreshRSS/tree/1.29.1', installedVersion: '1.29.1', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'rsshub', kind: 'service', category: 'service', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicFeedsUrl',
    name: { en: 'RSS generator', es: 'Generador RSS' },
    description: { en: 'Use RSSHub to generate RSS feeds for supported public sources that do not provide useful feeds of their own.', es: 'Genera con RSSHub fuentes RSS para sitios públicos compatibles que no ofrecen una fuente útil propia.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser or feed reader → Caddy edge VM → application VM/RSSHub → the public source selected by the route. Results are cached in a dedicated Valkey instance.', es: 'Navegador o lector de feeds → VM perimetral con Caddy → VM de aplicaciones/RSSHub → fuente pública elegida por la ruta. Los resultados se guardan temporalmente en una instancia Valkey dedicada.' },
    upstreamServices: ['Public websites represented by requested RSSHub routes'], filesUploaded: false,
    temporaryStorage: { en: 'Generated responses are cached in memory-only Valkey. Browserless, Chromium and persistent cache storage are not deployed.', es: 'Las respuestas generadas se guardan en Valkey solo en memoria. No se despliegan Browserless, Chromium ni almacenamiento persistente de caché.' },
    retention: { en: 'Request-cache entries target five minutes and content-cache entries one hour; eviction or restart can remove them sooner.', es: 'La caché de solicitudes apunta a cinco minutos y la de contenido a una hora; la expulsión o un reinicio pueden eliminarlas antes.' },
    logging: { en: 'RSSHub runs at info level without log files; route requests and operational errors may reach rotated Docker and edge logs. No analytics are installed.', es: 'RSSHub funciona en nivel informativo sin archivos de registro; las rutas solicitadas y errores pueden llegar a los registros rotados de Docker y del borde. No hay analítica instalada.' },
    license: 'AGPL-3.0', upstreamProject: 'RSSHub', upstreamSourceUrl: 'https://github.com/DIYgod/RSSHub/tree/40aca9548e99eefd519ff7abbb937560fc037c95', installedVersion: '40aca954', modified: true, operationalStatus: 'operational',
  },
  {
    id: 'privatebin', kind: 'service', category: 'service', discoveryGroup: 'text-data', featuredOrder: 4, configUrlKey: 'publicPasteUrl',
    name: { en: 'Encrypted paste', es: 'Texto cifrado' },
    description: { en: 'Share short-lived encrypted text with PrivateBin. Encryption happens in the browser; the decryption key stays in the URL fragment and does not reach the server.', es: 'Comparte texto cifrado que caduca con PrivateBin. El cifrado ocurre en el navegador; la clave de descifrado queda en el fragmento de la URL y no llega al servidor.' },
    labels: ['local', 'server'],
    dataFlow: { en: 'The browser encrypts text, then sends ciphertext through the edge to PrivateBin. The decryption key remains after # in the URL and is not included in the HTTP request.', es: 'El navegador cifra el texto y envía el contenido cifrado mediante el borde a PrivateBin. La clave queda después de # en la URL y no se incluye en la solicitud HTTP.' },
    upstreamServices: [], filesUploaded: false,
    temporaryStorage: { en: 'Plaintext and keys exist in browser memory. The server persists only encrypted payloads and associated metadata in filesystem storage; file uploads are disabled.', es: 'El texto sin cifrar y las claves existen en la memoria del navegador. El servidor conserva solo contenido cifrado y metadatos asociados en el sistema de archivos; las cargas de archivos están desactivadas.' },
    retention: { en: 'The default expiry is one day; choices range from five minutes to one week. Burn-after-reading can remove a paste sooner, and automatic purge is enabled.', es: 'El vencimiento predeterminado es un día; las opciones van de cinco minutos a una semana. Leer y destruir puede eliminar el texto antes, y la purga automática está habilitada.' },
    logging: { en: 'The application does not receive the decryption key or plaintext. Rotated web-server and edge logs may contain paste identifiers and request metadata, but should not include URL fragments.', es: 'La aplicación no recibe la clave ni el texto sin cifrar. Los registros rotados del servidor web y del borde pueden contener identificadores y metadatos de solicitud, pero no deben incluir fragmentos de URL.' },
    license: 'Zlib', upstreamProject: 'PrivateBin', upstreamSourceUrl: 'https://github.com/PrivateBin/PrivateBin/tree/2.0.6', installedVersion: '2.0.6', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'wakapi', kind: 'service', category: 'service', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicWakapiUrl',
    accountAccess: 'invite-required',
    name: { en: 'Coding statistics', es: 'Estadísticas de programación' },
    description: { en: 'Use Wakapi to store WakaTime-compatible coding statistics on Utilibre.', es: 'Guarda con Wakapi estadísticas de programación compatibles con WakaTime.' },
    labels: ['server'],
    dataFlow: { en: 'WakaTime-compatible clients and browsers → Caddy edge VM → application VM/Wakapi → dedicated PostgreSQL database.', es: 'Clientes compatibles con WakaTime y navegadores → VM perimetral con Caddy → VM de aplicaciones/Wakapi → base de datos PostgreSQL dedicada.' },
    upstreamServices: [], filesUploaded: false,
    temporaryStorage: { en: 'Heartbeat requests exist briefly in process memory; coding metadata, account settings and aggregates are stored in PostgreSQL.', es: 'Las solicitudes de actividad existen brevemente en memoria; los metadatos de programación, ajustes de cuenta y agregados se guardan en PostgreSQL.' },
    retention: { en: 'Coding data is configured for a 12-month retention period. Signup is closed and outgoing mail is disabled.', es: 'Los datos de programación se configuran con un plazo de conservación de 12 meses. El registro está cerrado y el correo saliente está desactivado.' },
    logging: { en: 'Authentication failures and operational errors can reach rotated logs. Heartbeat payloads are stored as application data, not sent to an analytics provider.', es: 'Las fallas de autenticación y errores operativos pueden llegar a registros rotados. Los datos de actividad se guardan como datos de la aplicación y no se envían a un proveedor de analítica.' },
    license: 'MIT', upstreamProject: 'Wakapi', upstreamSourceUrl: 'https://github.com/muety/wakapi/tree/2.17.6', installedVersion: '2.17.6', modified: false, operationalStatus: 'operational',
  },
  {
    id: 'invidious', kind: 'service', category: 'service', discoveryGroup: 'find', configUrlKey: 'publicYoutubeUrl',
    name: { en: 'YouTube frontend', es: 'Interfaz para YouTube' },
    description: { en: 'Invidious is not deployed by Utilibre. Its current database, anti-bot, and bandwidth requirements do not fit this server.', es: 'Invidious no está desplegado en Utilibre. Sus requisitos actuales de base de datos, controles antibot y ancho de banda no se ajustan a los recursos de este servidor.' },
    labels: ['server', 'proxy', 'external'], dataFlow: { en: 'Not deployed; no visitor data is sent to Invidious or YouTube by this portal.', es: 'No desplegado; este portal no envía datos de visitantes a Invidious ni a YouTube.' }, upstreamServices: ['YouTube'], filesUploaded: false,
    temporaryStorage: { en: 'Not applicable while deferred.', es: 'No corresponde mientras esté aplazado.' }, retention: { en: 'Not applicable while deferred.', es: 'No corresponde mientras esté aplazado.' }, logging: { en: 'Not applicable while deferred.', es: 'No corresponde mientras esté aplazado.' },
    license: 'AGPL-3.0-only', upstreamProject: 'Invidious', upstreamSourceUrl: 'https://github.com/iv-org/invidious', installedVersion: 'not-installed', modified: false, operationalStatus: 'not-deployed',
    deferralReason: { en: 'Deferred pending reliable token-free operation, Companion requirements, anti-bot stability, and measured bandwidth.', es: 'Aplazado hasta confirmar operación confiable sin tokens personales, requisitos de Companion, estabilidad ante controles antibot y ancho de banda medido.' },
  },
  {
    id: 'rimgo', kind: 'service', category: 'service', discoveryGroup: 'find', configUrlKey: 'publicImgurUrl',
    name: { en: 'Imgur frontend', es: 'Interfaz para Imgur' },
    description: { en: 'rimgo is not deployed by Utilibre. Its reviewed search route can redirect to arbitrary external sites, so public activation is deferred.', es: 'rimgo no está desplegado en Utilibre. La ruta de búsqueda revisada puede redirigir a sitios externos arbitrarios, por lo que su activación pública está aplazada.' },
    labels: ['server', 'proxy'], dataFlow: { en: 'When enabled: Browser → Caddy edge VM → application VM/rimgo → Imgur. It is disabled by default.', es: 'Cuando está habilitado: Navegador → VM perimetral con Caddy → VM de aplicaciones/rimgo → Imgur. Está desactivado de forma predeterminada.' }, upstreamServices: ['Imgur'], filesUploaded: false,
    temporaryStorage: { en: 'A process-local memory cache is limited to about 25 MB; no database or persistent media volume is used.', es: 'Una caché local del proceso está limitada a unos 25 MB; no se usa base de datos ni volumen persistente de contenido.' }, retention: { en: 'Cache entries expire after about 30 minutes, or earlier through size eviction or process restart.', es: 'Las entradas de caché vencen después de unos 30 minutos, o antes por límite de tamaño o reinicio del proceso.' }, logging: { en: 'Application diagnostics can contain request address, path, and browser information; Docker rotation bounds container logs. Edge query strings should be omitted.', es: 'Los diagnósticos de la aplicación pueden contener dirección de red, ruta e información del navegador; la rotación de Docker limita los registros. El borde debe omitir las cadenas de consulta.' },
    license: 'AGPL-3.0-only', upstreamProject: 'rimgo', upstreamSourceUrl: 'https://codeberg.org/rimgo/rimgo', installedVersion: 'optional profile (reviewed 1.4.2)', modified: false, operationalStatus: 'not-deployed',
    deferralReason: { en: 'The maintained 1.4.2 image passed a private compatibility test, but its reviewed /search rewrite can create an arbitrary external redirect. It also has no built-in public limiter, can relay heavy media, and is English-only. Public activation is deferred pending an upstream fix and re-review.', es: 'La imagen mantenida 1.4.2 superó una prueba privada de compatibilidad, pero la ruta /search evaluada puede crear una redirección externa arbitraria. Tampoco incluye un limitador público, puede retransmitir contenido pesado y su interfaz solo está en inglés. La activación pública queda aplazada hasta revisar una corrección oficial.' },
  },
  localTool({ id: 'image-resize', category: 'image', discoveryGroup: 'files', featuredOrder: 5, name: { en: 'Resize an image', es: 'Redimensionar una imagen' }, description: { en: 'Set new image dimensions and download the result. Processing stays in your browser.', es: 'Define nuevas dimensiones y descarga el resultado. El proceso ocurre en tu navegador.' }, slug: { en: 'tools/image-resize', es: 'herramientas/redimensionar-imagen' } }),
  localTool({ id: 'image-compress', category: 'image', discoveryGroup: 'files', name: { en: 'Compress an image', es: 'Comprimir una imagen' }, description: { en: 'Reduce a JPEG or WebP file size with an adjustable quality setting in your browser.', es: 'Reduce el tamaño de un JPEG o WebP con un nivel de calidad ajustable en tu navegador.' }, slug: { en: 'tools/image-compress', es: 'herramientas/comprimir-imagen' } }),
  localTool({ id: 'image-convert', category: 'image', discoveryGroup: 'files', name: { en: 'Convert an image', es: 'Convertir una imagen' }, description: { en: 'Convert PNG, JPEG and WebP images in your browser.', es: 'Convierte imágenes PNG, JPEG y WebP en tu navegador.' }, slug: { en: 'tools/image-convert', es: 'herramientas/convertir-imagen' } }),
  localTool({ id: 'image-metadata', category: 'image', discoveryGroup: 'files', name: { en: 'Remove image metadata', es: 'Quitar metadatos de imagen' }, description: { en: 'Re-encode an image to remove common metadata. This cannot guarantee removal of every metadata structure.', es: 'Vuelve a codificar una imagen para quitar metadatos comunes. No se puede garantizar que elimine todas las estructuras de metadatos.' }, slug: { en: 'tools/remove-image-metadata', es: 'herramientas/quitar-metadatos-imagen' } }),
  localTool({ id: 'pdf-merge', category: 'pdf', discoveryGroup: 'documents', featuredOrder: 6, name: { en: 'Merge PDF files', es: 'Combinar archivos PDF' }, description: { en: 'Combine several PDFs in the selected order in your browser.', es: 'Combina varios PDF en el orden elegido dentro de tu navegador.' }, slug: { en: 'tools/pdf-merge', es: 'herramientas/combinar-pdf' }, license: 'AGPL-3.0-or-later integration; MIT library', upstreamProject: '@cantoo/pdf-lib', upstreamSourceUrl: 'https://github.com/cantoo-scribe/pdf-lib', installedVersion: '@cantoo/pdf-lib 2.9.1' }),
  localTool({ id: 'pdf-extract', category: 'pdf', discoveryGroup: 'documents', name: { en: 'Extract PDF pages', es: 'Extraer páginas de PDF' }, description: { en: 'Create a new PDF from the pages you select.', es: 'Crea un PDF nuevo con las páginas que selecciones.' }, slug: { en: 'tools/pdf-extract', es: 'herramientas/extraer-paginas-pdf' }, license: 'AGPL-3.0-or-later integration; MIT library', upstreamProject: '@cantoo/pdf-lib', upstreamSourceUrl: 'https://github.com/cantoo-scribe/pdf-lib', installedVersion: '@cantoo/pdf-lib 2.9.1' }),
  localTool({ id: 'pdf-rotate', category: 'pdf', discoveryGroup: 'documents', name: { en: 'Rotate PDF pages', es: 'Rotar páginas de PDF' }, description: { en: 'Rotate every PDF page 90 degrees clockwise in your browser.', es: 'Gira 90 grados a la derecha todas las páginas del PDF en tu navegador.' }, slug: { en: 'tools/pdf-rotate', es: 'herramientas/rotar-pdf' }, license: 'AGPL-3.0-or-later integration; MIT library', upstreamProject: '@cantoo/pdf-lib', upstreamSourceUrl: 'https://github.com/cantoo-scribe/pdf-lib', installedVersion: '@cantoo/pdf-lib 2.9.1' }),
  localTool({ id: 'pdf-reorder', category: 'pdf', discoveryGroup: 'documents', name: { en: 'Reorder PDF pages', es: 'Reordenar páginas de PDF' }, description: { en: 'Create a new PDF with its pages in the order you specify.', es: 'Crea un PDF nuevo con las páginas en el orden que indiques.' }, slug: { en: 'tools/pdf-reorder', es: 'herramientas/reordenar-pdf' }, license: 'AGPL-3.0-or-later integration; MIT library', upstreamProject: '@cantoo/pdf-lib', upstreamSourceUrl: 'https://github.com/cantoo-scribe/pdf-lib', installedVersion: '@cantoo/pdf-lib 2.9.1' }),
  localTool({ id: 'file-hashes', category: 'file', discoveryGroup: 'files', name: { en: 'Calculate file hashes', es: 'Calcular hashes de archivo' }, description: { en: 'Calculate SHA-256 and SHA-512 in your browser without uploading the file.', es: 'Calcula SHA-256 y SHA-512 en tu navegador sin subir el archivo.' }, slug: { en: 'tools/file-hashes', es: 'herramientas/hashes-archivo' }, license: 'AGPL-3.0-or-later integration; MIT library fallback', upstreamProject: '@noble/hashes', upstreamSourceUrl: 'https://github.com/paulmillr/noble-hashes', installedVersion: '@noble/hashes 2.3.0' }),
  localTool({ id: 'file-info', category: 'file', discoveryGroup: 'files', name: { en: 'Inspect file information', es: 'Examinar información de archivo' }, description: { en: 'Show filename, size, browser-reported MIME type and image dimensions when available. The MIME type is not authoritative.', es: 'Muestra el nombre, tamaño, tipo MIME informado por el navegador y dimensiones de imagen cuando estén disponibles. El tipo MIME no es una prueba definitiva.' }, slug: { en: 'tools/file-information', es: 'herramientas/informacion-archivo' } }),
  localTool({ id: 'json', category: 'utility', discoveryGroup: 'text-data', name: { en: 'JSON formatter', es: 'Formateador JSON' }, description: { en: 'Validate, format or minify JSON in your browser.', es: 'Valida, formatea o minifica JSON en tu navegador.' }, slug: { en: 'tools/json', es: 'herramientas/json' } }),
  localTool({ id: 'base64', category: 'utility', discoveryGroup: 'text-data', name: { en: 'Base64 text', es: 'Texto Base64' }, description: { en: 'Encode and decode UTF-8 text. Encoding is useful; it is still not encryption.', es: 'Codifica y decodifica texto UTF-8. La codificación es útil, pero sigue sin ser cifrado.' }, slug: { en: 'tools/base64', es: 'herramientas/base64' } }),
  localTool({ id: 'url-encoding', category: 'utility', discoveryGroup: 'text-data', name: { en: 'URL encoding', es: 'Codificación URL' }, description: { en: 'Encode or decode a URL component or complete URL in your browser.', es: 'Codifica o decodifica un componente o una URL completa en tu navegador.' }, slug: { en: 'tools/url-encoding', es: 'herramientas/codificacion-url' } }),
  localTool({ id: 'uuid', category: 'utility', discoveryGroup: 'text-data', name: { en: 'UUID generator', es: 'Generador de UUID' }, description: { en: 'Generate random version 4 UUIDs using the browser’s cryptographic random source.', es: 'Genera UUID aleatorios de versión 4 con la fuente criptográfica del navegador.' }, slug: { en: 'tools/uuid', es: 'herramientas/uuid' } }),
  localTool({ id: 'qr-generate', category: 'utility', discoveryGroup: 'text-data', featuredOrder: 7, name: { en: 'Generate QR codes', es: 'Generar códigos QR' }, description: { en: 'Generate a QR code from text without sending the text to the server.', es: 'Genera un código QR a partir de texto sin enviarlo al servidor.' }, slug: { en: 'tools/qr-generate', es: 'herramientas/generar-qr' }, license: 'AGPL-3.0-or-later integration; MIT / Apache-2.0 / BSD-3-Clause libraries', upstreamProject: 'zxing-wasm', upstreamSourceUrl: 'https://github.com/Sec-ant/zxing-wasm', installedVersion: 'zxing-wasm 3.1.3' }),
  localTool({ id: 'qr-read', category: 'utility', discoveryGroup: 'text-data', name: { en: 'Read a QR image', es: 'Leer una imagen QR' }, description: { en: 'Read a QR image locally, then show the destination before anything opens.', es: 'Lee una imagen QR localmente y muestra el destino antes de abrir cualquier cosa.' }, slug: { en: 'tools/qr-read', es: 'herramientas/leer-qr' }, license: 'AGPL-3.0-or-later integration; MIT / Apache-2.0 / BSD-3-Clause libraries', upstreamProject: 'zxing-wasm', upstreamSourceUrl: 'https://github.com/Sec-ant/zxing-wasm', installedVersion: 'zxing-wasm 3.1.3' }),
];

export function localized(text: LocalizedText, language: Language): string {
  return text[language];
}

export function catalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

export const localTools = catalog.filter((entry) => entry.kind === 'tool' && entry.id !== 'private-router');
export const reviewedServices = catalog.filter((entry) => entry.kind === 'service');
