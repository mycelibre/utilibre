import type { Language } from '../i18n/index.ts';
import { assertFossCatalogPolicy, reviewedFossProviders, type FossProviderId } from './upstreams.ts';

export type PrivacyLabel = 'local' | 'server' | 'proxy' | 'external';
export type CatalogCategory = 'service' | 'utility';
export type CatalogKind = 'service' | 'integration';
export type OperationalStatus = 'operational' | 'degraded' | 'unavailable' | 'maintenance' | 'not-deployed' | 'unknown';
export type DiscoveryGroup = 'find' | 'reading' | 'files' | 'media' | 'privacy' | 'design' | 'text-data' | 'planning' | 'feeds-monitoring' | 'documents' | 'creative' | 'sharing' | 'data';
export type AccountAccess = 'closed-registration' | 'invite-required' | 'owner-only';

export interface LocalizedText {
  en: string;
  es: string;
}

export interface CatalogEntry {
  id: string;
  providerId: FossProviderId;
  kind: CatalogKind;
  implementation: 'upstream-application' | 'integration-glue';
  portalSurface: 'upstream-interface' | 'integration-glue';
  category: CatalogCategory;
  discoveryGroup: DiscoveryGroup;
  featuredOrder?: number;
  accountAccess?: AccountAccess;
  name: LocalizedText;
  description: LocalizedText;
  launchLabel?: LocalizedText;
  help?: LocalizedText;
  unavailableReason?: LocalizedText;
  quickLinks?: { path: string; label: LocalizedText }[];
  slug?: Record<Language, string>;
  configUrlKey?: string;
  /** A direct task belongs to this existing application and shares its access gate. */
  serviceId?: FossProviderId;
  launchPath?: string;
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
}

const browserMemory: LocalizedText = {
  en: 'Active processing uses browser memory. Depending on the application, caches, preferences and local drafts can persist after the tab closes; see the retention details.',
  es: 'El procesamiento activo usa memoria del navegador. Según la aplicación, las cachés, preferencias y borradores pueden persistir al cerrar la pestaña; revisá los detalles de conservación.',
};

function providerMetadata(providerId: FossProviderId): Pick<CatalogEntry, 'providerId' | 'license' | 'upstreamProject' | 'upstreamSourceUrl' | 'installedVersion' | 'portalSurface'> {
  const provider = reviewedFossProviders[providerId];
  return {
    providerId,
    license: provider.license,
    upstreamProject: provider.project,
    upstreamSourceUrl: provider.sourceUrl,
    installedVersion: provider.installedVersion,
    portalSurface: 'upstream-interface',
  };
}

export const catalog: CatalogEntry[] = [
  {
    id: 'wbo', ...providerMetadata('wbo'), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: 'design', configUrlKey: 'publicCollabUrl',
    name: { en: 'Draw together · temporary pilot', es: 'Dibujar en grupo · piloto temporal' },
    description: { en: 'Share a board with a small group without an account. For non-sensitive sketches only.', es: 'Compartí una pizarra con un grupo pequeño sin cuenta. Solo para bocetos sin datos sensibles.' },
    launchLabel: { en: 'Start a shared board', es: 'Crear una pizarra compartida' },
    help: { en: 'Create an unlisted board, share its address and draw together. Anyone with the link can read and edit. Download SVG before leaving: boards are lost on service restart and older objects are discarded above 256. Excalidraw remains the local-only alternative.', es: 'Creá una pizarra sin listar, compartí su dirección y dibujen juntos. Cualquiera con el enlace puede leer y editar. Descargá SVG antes de salir: las pizarras se pierden al reiniciar el servicio y se descartan objetos antiguos al superar 256. Excalidraw sigue siendo la alternativa local.' },
    labels: ['server'], filesUploaded: false, upstreamServices: ['Cloudflare HTTPS proxy'],
    dataFlow: { en: 'Drawing operations leave your device over HTTPS through Cloudflare to Utilibre and other people in the room. No end-to-end encryption: the server can read drawings. No third-party assets were observed in the tested flow.', es: 'Los trazos salen del dispositivo por HTTPS a través de Cloudflare hacia Utilibre y las otras personas de la sala. No hay cifrado de extremo a extremo: el servidor puede leer los dibujos. No se observaron recursos externos en el recorrido probado.' },
    temporaryStorage: { en: 'Drawings are held in memory-backed storage on Utilibre. Recent room names and preferences may remain in browser storage.', es: 'Los dibujos quedan en almacenamiento de memoria de Utilibre. Los nombres recientes de salas y las preferencias pueden quedar en el navegador.' },
    retention: { en: 'Closing a tab does not delete a board. Service stops/restarts erase boards; no guaranteed expiry, backup or recovery. At most 256 objects per board; older ones are discarded above the limit. Export SVG; clearing browser data does not delete the server copy.', es: 'Cerrar una pestaña no borra la pizarra. Detener o reiniciar el servicio borra las pizarras; no hay vencimiento, respaldo ni recuperación garantizados. Se conservan hasta 256 objetos; se descartan los más antiguos al superar el límite. Exportá SVG; borrar datos del navegador no borra la copia del servidor.' },
    logging: { en: 'Application container and gateway access logs are disabled. Edge/provider operational metadata and retention are separate and not verified here. Browser history and recipients may retain room links.', es: 'Los registros del contenedor y de acceso del intermediario están desactivados. Los metadatos operativos del borde/proveedor y su conservación son independientes y no se verificaron aquí. El historial y los destinatarios pueden conservar enlaces.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'pollaris', ...providerMetadata('pollaris'), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: 'planning', featuredOrder: 40, configUrlKey: 'publicPollarisUrl',
    name: { en: 'Account-free polls · Pollaris', es: 'Encuestas sin cuenta · Pollaris' },
    description: { en: 'Choose a date or make a group decision without registering.', es: 'Elegí una fecha o tomá una decisión en grupo sin registrarte.' },
    launchLabel: { en: 'Create a poll', es: 'Crear una encuesta' },
    help: { en: 'Save the private administration link: anyone holding it can change or delete the poll. Share only the participant link. Email is optional. Export important responses as CSV; this is not encrypted storage.', es: 'Guardá el enlace privado de administración: quien lo tenga puede cambiar o borrar la encuesta. Compartí solo el enlace para participantes. El correo es opcional. Exportá las respuestas importantes a CSV; no es almacenamiento cifrado.' },
    unavailableReason: { en: 'Pollaris is temporarily unavailable. Try again later.', es: 'Pollaris no está disponible temporalmente. Probá de nuevo más tarde.' },
    labels: ['server'], filesUploaded: false, upstreamServices: ['Utilibre SMTP relay (optional email)'],
    dataFlow: { en: 'Browser → Cloudflare/Caddy → Pollaris and its isolated database. Poll content and responses are readable by the server; optional notifications use the mail relay.', es: 'Navegador → Cloudflare/Caddy → Pollaris y su base de datos aislada. El servidor puede leer las encuestas y respuestas; las notificaciones opcionales usan el servidor de correo.' },
    temporaryStorage: { en: 'Polls and responses are saved on Utilibre; the browser remembers poll links and preferences.', es: 'Las encuestas y respuestas se guardan en Utilibre; el navegador recuerda enlaces y preferencias.' },
    retention: { en: 'You can delete a poll with its private administration link. Completed polls expire six months after their closing date; incomplete closed polls expire after seven days. Set a closing date. On-host backups may retain deleted content.', es: 'Podés borrar la encuesta con su enlace privado de administración. Las encuestas completas vencen seis meses después de su fecha de cierre; las incompletas cerradas, después de siete días. Definí una fecha de cierre. Las copias locales pueden conservar contenido eliminado.' },
    logging: { en: 'Gateway access logs are disabled. Rotating application error logs and edge/provider operational logs may contain request metadata.', es: 'Los registros de acceso del intermediario están desactivados. Los errores de la aplicación y los registros operativos del borde o proveedor pueden contener metadatos de solicitudes.' },
    modified: false, operationalStatus: 'operational',
  },
  ...expandedTools(),
  ...readerEvaluations(),
  ...newInstallations(),
  {
    id: 'biblioreads', ...providerMetadata('biblioreads'), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: 'reading', featuredOrder: 44, configUrlKey: 'publicBooksUrl',
    name: { en: 'Find books · BiblioReads', es: 'Buscar libros · BiblioReads' },
    description: { en: 'Read public Goodreads book information and keep a library in your browser.', es: 'Consultá información pública de libros de Goodreads y guardá una biblioteca en tu navegador.' },
    launchLabel: { en: 'Find a book', es: 'Buscar un libro' },
    help: { en: 'Search for a title or paste a Goodreads book link. Use Library → Settings → Export to save a backup. The interface is in English. This does not sign in to Goodreads or synchronize your library between devices.', es: 'Buscá un título o pegá un enlace de Goodreads. Usá Library → Settings → Export para guardar una copia. La interfaz está en inglés. No inicia sesión en Goodreads ni sincroniza tu biblioteca entre dispositivos.' },
    unavailableReason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
    labels: ['server', 'proxy', 'local'],
    dataFlow: { en: 'Browser → Cloudflare/Caddy → Utilibre → Goodreads and its Amazon-hosted API/image services. Providers see server requests. Covers are fetched through Utilibre; library records stay in browser storage.', es: 'Navegador → Cloudflare/Caddy → Utilibre → Goodreads y sus servicios de API e imágenes alojados en Amazon. Los proveedores ven las solicitudes del servidor. Las portadas pasan por Utilibre; tu biblioteca queda en el navegador.' },
    upstreamServices: ['Goodreads', 'Amazon AppSync', 'Goodreads/Amazon image CDN'], filesUploaded: false,
    temporaryStorage: { en: 'Bounded in-memory image cache; browser-local saved books, authors and quotes. The application service worker may retain visited pages and API responses on this device.', es: 'Caché limitada de imágenes en memoria; libros, autores y citas guardados en el navegador. El service worker puede conservar páginas visitadas y respuestas de la API en este dispositivo.' },
    retention: { en: 'Cover cache expires after one hour or restart. Browser data remains until you delete it; clearing site data can erase your library. Export important records. Edge and provider retention are separate.', es: 'La caché de portadas vence tras una hora o al reiniciar. Los datos del navegador permanecen hasta que los borrés; borrar los datos del sitio puede eliminar tu biblioteca. Exportá lo importante. El borde y los proveedores tienen sus propias políticas de conservación.' },
    logging: { en: 'Application and gateway logging are disabled. Cloudflare/Caddy and upstream providers may retain operational metadata. Search queries appear in page URLs and browser history.', es: 'Los registros de la aplicación y su intermediario están desactivados. Cloudflare/Caddy y los proveedores pueden conservar metadatos operativos. Las búsquedas aparecen en las direcciones de las páginas y en el historial.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'gothub', ...providerMetadata('gothub'), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: 'text-data', featuredOrder: 42, configUrlKey: 'publicGothubUrl',
    name: { en: 'Read GitHub · GotHub', es: 'Leer GitHub · GotHub' },
    description: { en: 'Browse public GitHub repositories and files without an account.', es: 'Explorá repositorios y archivos públicos de GitHub sin cuenta.' },
    launchLabel: { en: 'Open GotHub', es: 'Abrir GotHub' },
    help: { en: 'Replace github.com in a public repository URL with gothub.utilibre.org. The tool interface is in English. This is a reader; cloning and archive downloads are not offered.', es: 'Reemplazá github.com en la dirección de un repositorio público por gothub.utilibre.org. La interfaz está en inglés. Es un lector; no permite clonar ni descargar archivos comprimidos de repositorios.' },
    unavailableReason: { en: 'GotHub is temporarily unavailable. Try again later.', es: 'GotHub no está disponible temporalmente. Probá de nuevo más tarde.' },
    labels: ['server', 'proxy'], filesUploaded: false, upstreamServices: ['GitHub and its content/image hosts'],
    dataFlow: { en: 'Browser → Cloudflare/Caddy → Utilibre → GitHub. GitHub sees the server address and requested public content. External links leave the reader.', es: 'Navegador → Cloudflare/Caddy → Utilibre → GitHub. GitHub ve la dirección del servidor y el contenido público solicitado. Los enlaces externos salen del lector.' },
    temporaryStorage: { en: 'A bounded in-memory cache holds public responses for up to five minutes. There are no visitor accounts or uploads.', es: 'Una caché limitada en memoria conserva respuestas públicas hasta cinco minutos. No hay cuentas de visitantes ni carga de archivos.' },
    retention: { en: 'Cached responses expire or disappear when the app restarts. Edge and upstream retention are separate.', es: 'Las respuestas en caché vencen o desaparecen al reiniciar la aplicación. El borde y el sitio de origen tienen sus propias políticas de conservación.' },
    logging: { en: 'Gateway access logs and application container logs are disabled. Gateway warnings and edge/provider operational logs may contain request metadata.', es: 'Los registros de acceso del intermediario y del contenedor de la aplicación están desactivados. Las advertencias del intermediario y los registros operativos del borde o proveedor pueden contener metadatos.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'binternet', ...providerMetadata('binternet'), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: 'media', featuredOrder: 41, configUrlKey: 'publicBinternetUrl',
    name: { en: 'Search Pinterest · Binternet', es: 'Buscar en Pinterest · Binternet' },
    description: { en: 'Search public Pinterest images without an account.', es: 'Buscá imágenes públicas de Pinterest sin cuenta.' },
    launchLabel: { en: 'Search images', es: 'Buscar imágenes' },
    help: { en: 'The tool interface is in English. Searches and images pass through Utilibre to Pinterest. Author links leave for Pinterest. The optional onion link requires Tor Browser; no JavaScript challenge is required.', es: 'La interfaz de la herramienta está en inglés. Las búsquedas y las imágenes pasan por Utilibre hacia Pinterest. Los enlaces de autores abren Pinterest. El enlace onion opcional requiere Tor Browser; no hay una prueba obligatoria de JavaScript.' },
    unavailableReason: { en: 'Binternet is temporarily unavailable. Try again later.', es: 'Binternet no está disponible temporalmente. Probá de nuevo más tarde.' },
    quickLinks: [{ path: 'http://ued2jl2ahvngdegugysin2fa6malo6omyf33j5tpfgex47erv453wbad.onion/', label: { en: 'Open with Tor Browser', es: 'Abrir con Tor Browser' } }],
    labels: ['server', 'proxy'], filesUploaded: false, upstreamServices: ['Pinterest and its image CDN'],
    dataFlow: { en: 'Browser → Caddy or Tor → Binternet → Pinterest. Pinterest sees our server address; Utilibre can read search queries. Author links open Pinterest directly.', es: 'Navegador → Caddy o Tor → Binternet → Pinterest. Pinterest ve la dirección de nuestro servidor; Utilibre puede leer las búsquedas. Los enlaces de autores abren Pinterest directamente.' },
    temporaryStorage: { en: 'Responses and images are processed in server memory. No accounts, uploads or persistent image cache.', es: 'Las respuestas y las imágenes se procesan en la memoria del servidor. No hay cuentas, cargas de archivos ni caché persistente de imágenes.' },
    retention: { en: 'Searches and pagination links can remain in browser history. Pinterest applies its own retention policy. Tor does not hide queries from Utilibre or Pinterest.', es: 'Las búsquedas y los enlaces de paginación pueden quedar en el historial del navegador. Pinterest aplica su propia política de conservación. Tor no oculta las búsquedas de Utilibre ni de Pinterest.' },
    logging: { en: 'Application gateway access logs are disabled. Rotating error logs and edge/provider operational records may contain request metadata.', es: 'Los registros de acceso del intermediario de la aplicación están desactivados. Los errores y los registros operativos del borde o proveedor pueden contener metadatos de solicitudes.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'translite', ...providerMetadata('translite'), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: 'text-data', featuredOrder: 43, configUrlKey: 'publicTranslateUrl',
    name: { en: 'Translate text · TransLite', es: 'Traducir texto · TransLite' },
    description: { en: 'Translate short texts with Google, DeepL, Yandex or DuckDuckGo, without an account.', es: 'Traducí textos cortos con Google, DeepL, Yandex o DuckDuckGo, sin cuenta.' },
    launchLabel: { en: 'Translate text', es: 'Traducir texto' },
    help: { en: 'Text is sent to the selected provider, not translated on your device. Multiple engines sends it to every selected provider. Do not submit confidential information. Limit: 2,000 characters. The interface is English; Spanish translation is supported. Audio is disabled.', es: 'El texto se envía al proveedor elegido; no se traduce en tu dispositivo. Si elegís varios motores, cada uno recibe el texto. No enviés información confidencial. Límite: 2,000 caracteres. La interfaz está en inglés y admite traducciones al español. El audio está desactivado.' },
    unavailableReason: { en: 'TransLite is temporarily unavailable. Try again later.', es: 'TransLite no está disponible temporalmente. Probá de nuevo más tarde.' },
    labels: ['server', 'proxy'], filesUploaded: false, upstreamServices: ['Google Translate', 'DeepL', 'Yandex Translate', 'DuckDuckGo Translate'],
    dataFlow: { en: 'Browser → Cloudflare/Caddy → Utilibre → selected translation provider(s). Utilibre and the providers can read submitted text. Providers see the server address.', es: 'Navegador → Cloudflare/Caddy → Utilibre → proveedores de traducción elegidos. Utilibre y esos proveedores pueden leer el texto enviado. Los proveedores ven la dirección del servidor.' },
    temporaryStorage: { en: 'Translation results are reused only within one request. Short-lived RAM sessions can hold form text while changing engines or swapping languages. Language lists, not translation content, use a shared cache.', es: 'Los resultados se reutilizan solo dentro de una solicitud. Las sesiones temporales en memoria pueden conservar el texto al cambiar de motor o intercambiar idiomas. La caché compartida guarda listas de idiomas, no traducciones.' },
    retention: { en: 'Session data expires after five minutes of inactivity and is garbage-collected during later requests; restarting clears it. Preference cookies last up to 90 days. Translation pages are no-store. Provider and edge retention are separate.', es: 'La sesión vence tras cinco minutos de inactividad y se limpia con solicitudes posteriores; reiniciar borra esos datos. Las cookies de preferencias duran hasta 90 días. Las páginas de traducción indican no-store. El borde y cada proveedor tienen sus propias políticas de conservación.' },
    logging: { en: 'Application and gateway request/error logging are disabled. Edge and provider operational records may still exist. This is not an end-to-end encrypted or confidential translation service.', es: 'Los registros de solicitudes y errores de la aplicación y su intermediario están desactivados. El borde y los proveedores pueden conservar registros operativos. No es un servicio de traducción confidencial ni con cifrado de extremo a extremo.' },
    modified: true, operationalStatus: 'operational',
  },
  browserTool('whisper-web', 'media', 17, 'publicTranscribeUrl',
    { en: 'Transcribe audio · pilot', es: 'Transcribir audio · piloto' },
    { en: 'Turn a short recording into downloadable text with Whisper Web.', es: 'Convertí una grabación corta en texto descargable con Whisper Web.' },
    { en: 'Transcribe audio', es: 'Transcribir audio' }, false,
    { en: 'Start with a short recording and review the transcript for mistakes. Audio is processed on your device; the model and processing files are downloaded from Utilibre. First use downloads tens of megabytes. Only the small quantized model is offered. Long recordings and low-memory phones are not yet validated. The upstream interface is in English; Spanish speech is supported. Model files are Apache-2.0 licensed.', es: 'Empezá con una grabación corta y revisá los errores de la transcripción. El audio se procesa en tu dispositivo; el modelo y los componentes se descargan de Utilibre. El primer uso descarga decenas de megabytes. Solo ofrecemos el modelo pequeño cuantizado. Todavía no validamos grabaciones largas ni teléfonos con poca memoria. La interfaz está en inglés, pero admite audio en español. Los archivos del modelo usan la licencia Apache-2.0.' }),
  browserTool('jupyterlite', 'text-data', 18, 'publicPythonUrl',
    { en: 'Python notebooks', es: 'Cuadernos de Python' },
    { en: 'Try Python, explore a CSV and draw charts in your browser with JupyterLite.', es: 'Probá Python, explorá un CSV y hacé gráficas en tu navegador con JupyterLite.' },
    { en: 'Try Python', es: 'Probar Python' }, true,
    { en: 'Start with the included example notebook. Python runs in your browser, not on our server. Save important notebooks with File → Download: browser storage is not a backup and clearing site data can erase your work. Python and optional packages download from jsDelivr and Python package repositories. Desktop packages are not all supported; this is not JupyterHub.', es: 'Empezá con el cuaderno de ejemplo. Python se ejecuta en tu navegador, no en nuestro servidor. Guardá los cuadernos importantes con Archivo → Descargar: el almacenamiento del navegador no es una copia de respaldo y borrar los datos del sitio puede eliminar tu trabajo. Python y los paquetes opcionales se descargan de jsDelivr y repositorios de Python. No todos los paquetes de escritorio funcionan; esto no es JupyterHub.' }),
  ...communityTools(),
  ...browserAdditions(),
  ...everydayTasks(),
  browserTool('bentopdf', 'files', 1, 'publicPdfUrl',
    { en: 'PDF & OCR', es: 'PDF y OCR' },
    { en: 'Merge, split, compress or edit PDFs. Turn scans into searchable text.', es: 'Uní, dividí, comprimí y editá PDF. Extraé texto de páginas escaneadas con OCR.' },
    { en: 'Edit a PDF', es: 'Editar un PDF' }, true,
    { en: 'Choose a tool, select your files, then download the result. OCR works best with clear printed text; review its output, especially handwriting. Processing libraries, OCR language data and fonts may download from jsDelivr or githack. Online certificate validation and remote-URL imports are not provided.', es: 'Elegí una herramienta, seleccioná tus archivos y descargá el resultado. El OCR funciona mejor con texto impreso nítido; revisá el resultado, especialmente la escritura a mano. Las bibliotecas, idiomas de OCR y fuentes pueden descargarse de jsDelivr o githack. No ofrecemos validación de certificados en línea ni importación de URL remotas.' },
    [{ path: 'ocr-pdf.html', label: { en: 'Recognize text (OCR)', es: 'Reconocer texto (OCR)' } }]),
  browserTool('vert', 'media', 2, 'publicConvertUrl',
    { en: 'Convert files', es: 'Convertir archivos' },
    { en: 'Convert images, audio and documents with VERT. Available formats depend on your browser; remote video conversion is off.', es: 'Convertí imágenes, audio y documentos con VERT. Los formatos disponibles dependen del navegador; la conversión remota de vídeo está desactivada.' },
    { en: 'Convert a file', es: 'Convertir un archivo' }, false,
    { en: 'Select a file and choose an available output format. Conversion runs on your device. Server video conversion, analytics and embedded payments are disabled; unsupported formats remain unavailable.', es: 'Seleccioná un archivo y un formato de salida disponible. La conversión ocurre en tu dispositivo. La conversión de vídeo en servidores, la analítica y los pagos integrados están desactivados; los formatos incompatibles no están disponibles.' }),
  browserTool('omnitools', 'text-data', 3, 'publicToolsUrl',
    { en: 'Everyday tools', es: 'Herramientas cotidianas' },
    { en: 'Resize images, trim media and work with text, lists and data using OmniTools.', es: 'Redimensioná imágenes, recortá contenido multimedia y trabajá con texto, listas y datos con OmniTools.' },
    { en: 'Choose a tool', es: 'Elegir herramienta' }, true,
    { en: 'Search for a task, add your input and save the result. Files are processed in the browser. Some tools download processing components from jsDelivr or unpkg; these providers receive download requests, not your selected files.', es: 'Buscá una tarea, agregá los datos y guardá el resultado. Los archivos se procesan en el navegador. Algunas herramientas descargan componentes de jsDelivr o unpkg; estos proveedores reciben solicitudes de descarga, no los archivos seleccionados.' }),
  browserTool('hatsh', 'privacy', 4, 'publicEncryptUrl',
    { en: 'Encrypt or decrypt files', es: 'Cifrar o descifrar archivos' },
    { en: 'Protect files with a password or key using hat.sh. Keep the password safe: Utilibre cannot recover it.', es: 'Protegé archivos con una contraseña o clave usando hat.sh. Guardá la contraseña: Utilibre no puede recuperarla.' },
    { en: 'Encrypt / decrypt', es: 'Cifrar / descifrar' }, false,
    { en: 'Choose Encrypt or Decrypt, select a file and follow the password or key instructions. Save the downloaded result. Keys and files stay in your browser; closing the tab does not delete downloaded files. This is not a file-sharing or backup service.', es: 'Elegí cifrar o descifrar, seleccioná un archivo y seguí las instrucciones de contraseña o clave. Guardá el resultado descargado. Las claves y los archivos permanecen en tu navegador; cerrar la pestaña no elimina las descargas. No es un servicio para compartir archivos ni para copias de seguridad.' }),
  browserTool('drawio', 'design', 5, 'publicDrawUrl',
    { en: 'Draw diagrams', es: 'Crear diagramas' },
    { en: 'Make flowcharts, plans and diagrams with draw.io. Save your work to your own device.', es: 'Creá diagramas de flujo, planos y esquemas con draw.io. Guardá el trabajo en tu dispositivo.' },
    { en: 'Draw a diagram', es: 'Crear un diagrama' }, false,
    { en: 'Start a blank diagram or template, then save or export it. Cloud accounts, collaboration and server-side export are disabled. Browser storage can retain diagrams and preferences; clear this site’s storage on shared devices.', es: 'Empezá con un diagrama vacío o una plantilla y luego guardá o exportá el trabajo. Las cuentas en la nube, la colaboración y la exportación en servidores están desactivadas. El navegador puede guardar diagramas y preferencias; borrá los datos del sitio si compartís el dispositivo.' }),
  browserTool('miniqr', 'design', 6, 'publicQrUrl',
    { en: 'Create & scan QR codes', es: 'Crear y leer códigos QR' },
    { en: 'Create styled QR codes for links, Wi-Fi and contact details, or read a code from an image with Mini QR.', es: 'Creá códigos QR con estilo para enlaces, Wi-Fi y contactos, o leé un código en una imagen con Mini QR.' },
    { en: 'Create / scan QR', es: 'Crear / leer QR' }, false,
    { en: 'Enter your content, customize the code and download it. Scanning can use an image or your camera after permission. Anyone who scans the result can read its contents: QR codes do not encrypt passwords. QR history storage is disabled.', es: 'Escribí el contenido, personalizá el código y descargalo. Para leerlo, usá una imagen o la cámara después de dar permiso. Cualquiera que lea el resultado puede ver su contenido: un QR no cifra contraseñas. El historial de códigos está desactivado.' }),
  browserTool('qr-offline', 'design', 48, 'publicQrToolsUrl',
    { en: 'QR codes · Offline QR', es: 'Códigos QR · Offline QR' },
    { en: 'Create a QR code or read one with your camera. Download PNG, SVG or PDF, without an account.', es: 'Creá un código QR o leelo con la cámara. Descargá PNG, SVG o PDF, sin cuenta.' },
    { en: 'Create / scan QR', es: 'Crear / leer QR' }, false,
    { en: 'Choose a QR type, enter its content and download the result. Camera scanning asks for permission and shows the result before you choose to open it. Codes and camera frames are processed locally. QR history is not saved; language, theme and offline application files can remain in your browser. QR codes do not encrypt their contents.', es: 'Elegí un tipo de QR, ingresá el contenido y descargá el resultado. El lector pide permiso para usar la cámara y muestra el contenido antes de que decidás abrirlo. Los códigos y las imágenes de la cámara se procesan en tu dispositivo. No se guarda un historial de QR; el idioma, el tema y los archivos para usar la aplicación sin conexión pueden quedar en el navegador. Los códigos QR no cifran su contenido.' }),
  browserTool('ittools', 'text-data', 7, 'publicDeveloperToolsUrl',
    { en: 'Developer tools', es: 'Herramientas de desarrollo' },
    { en: 'Format JSON, inspect JWTs, encode text, generate UUIDs and test regular expressions with IT Tools.', es: 'Dale formato a JSON, inspeccioná JWT, codificá texto, generá UUID y probá expresiones regulares con IT Tools.' },
    { en: 'Open IT Tools', es: 'Abrir IT Tools' }, false,
    { en: 'Search for a tool or press Ctrl+K. Use the examples to check the expected input. Token inspection does not verify authenticity. Favorites and interface preferences may remain in browser storage. Upstream support links fund the developer, not Utilibre.', es: 'Buscá una herramienta o presioná Ctrl+K. Los ejemplos muestran el formato esperado. Inspeccionar un token no verifica su autenticidad. Los favoritos y preferencias pueden permanecer en el navegador. Los enlaces de apoyo del proyecto financian a su desarrollador, no a Utilibre.' }),
  {
    id: 'searxng', ...providerMetadata('searxng'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'find', featuredOrder: 8, configUrlKey: 'publicSearchUrl',
    name: { en: 'Web search', es: 'Búsqueda web' },
    description: { en: 'Search the web, images, news and research with SearXNG. Utilibre sends your query to selected search engines.', es: 'Buscá en la web, imágenes, noticias e investigaciones con SearXNG. Utilibre envía la consulta a buscadores seleccionados.' },
    launchLabel: { en: 'Search the web', es: 'Buscar en la web' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Caddy edge VM → application VM/SearXNG → selected search engines', es: 'Navegador → VM perimetral con Caddy → VM de aplicaciones/SearXNG → motores de búsqueda seleccionados' },
    upstreamServices: ['Bing', 'Google Custom Search web/images (Blackle partner identifier)', 'Fynd', 'Wiby', 'Mwmbl', 'Wikipedia', 'DuckDuckGo currency endpoint', 'Bing Images/News/Videos', 'Wikimedia Commons', 'Wikinews', 'Wiktionary', 'GitHub', 'MDN', 'Stack Overflow', 'Ask Ubuntu', 'Super User', 'ManKier', 'arXiv', 'PubMed', 'Semantic Scholar', 'Reuters', 'YouTube', 'Dailymotion', 'Photon'], filesUploaded: false,
    temporaryStorage: { en: 'Short-lived limiter counters and application caches; no search-result database.', es: 'Contadores temporales del limitador y cachés de la aplicación; no hay una base de datos de resultados.' },
    retention: { en: 'Hashed limiter identifiers expire according to limiter windows; suspicious-client counters can last up to 30 days. Preferences may be stored in a first-party SearXNG cookie.', es: 'Los identificadores derivados del limitador vencen según sus ventanas; los contadores de clientes sospechosos pueden durar hasta 30 días. SearXNG puede guardar preferencias en una cookie propia.' },
    logging: { en: 'Access logging is disabled by default. Operational errors remain; exceptional abuse events may include a network address.', es: 'El registro de accesos está desactivado de forma predeterminada. Se conservan errores operativos; eventos excepcionales de abuso pueden incluir una dirección de red.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'freshrss', ...providerMetadata('freshrss'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'reading', featuredOrder: 11, configUrlKey: 'publicRssUrl',
    accountAccess: 'closed-registration',
    name: { en: 'RSS reader', es: 'Lector RSS' },
    description: { en: 'Follow new articles from your favorite websites in FreshRSS. For existing account holders only.', es: 'Seguí los artículos nuevos de tus sitios favoritos en FreshRSS. Solo para personas que ya tienen una cuenta.' },
    help: { en: 'RSS feeds let you follow websites in one reader. New accounts and account requests are not open. Existing users can change the interface language in FreshRSS settings.', es: 'Los canales RSS permiten seguir sitios web desde un solo lector. No se aceptan registros ni solicitudes de cuentas nuevas. Si ya tenés una cuenta, podés cambiar el idioma en los ajustes de FreshRSS.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Caddy edge VM → application VM/FreshRSS; the server fetches subscribed feed URLs and stores account, subscription and reading data in PostgreSQL.', es: 'Navegador → VM perimetral con Caddy → VM de aplicaciones/FreshRSS; el servidor consulta los feeds suscritos y guarda cuentas, suscripciones y lectura en PostgreSQL.' },
    upstreamServices: ['Websites and feed hosts selected by account holders'], filesUploaded: false,
    temporaryStorage: { en: 'Feed-fetch response buffers and refresh work are temporary. Feed entries, subscriptions, preferences and read state are persistent.', es: 'Los búferes de descarga y el trabajo de actualización son temporales. Las entradas, suscripciones, preferencias y estado de lectura son persistentes.' },
    retention: { en: 'Account and feed data remain until the account holder or administrator removes them, subject to FreshRSS feed-retention settings.', es: 'Los datos de cuentas y feeds permanecen hasta que la persona titular o la administración los elimine, según la configuración de conservación de FreshRSS.' },
    logging: { en: 'Feed-refresh failures and operational errors can reach rotated logs. Requested feed URLs and errors may appear in application diagnostics; registration is closed.', es: 'Las fallas al actualizar feeds y los errores operativos pueden llegar a registros rotados. Las URL de feeds y los errores pueden aparecer en diagnósticos; el registro está cerrado.' },
    modified: false, operationalStatus: 'operational',
  },
  {
    id: 'redlib', ...providerMetadata('redlib'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'reading', featuredOrder: 9, configUrlKey: 'publicRedditUrl',
    name: { en: 'Redlib for Reddit', es: 'Redlib para Reddit' },
    description: { en: 'Read public Reddit posts with Redlib. The first visit may need a browser check; JavaScript is required, and Reddit can sometimes block access.', es: 'Leé publicaciones públicas de Reddit con Redlib. La primera visita puede requerir una verificación del navegador; necesita JavaScript y Reddit puede bloquear el acceso.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Cloudflare → Caddy edge VM → application VM/Anubis → Redlib → Reddit. A typical first visit must complete Anubis’s local proof-of-work challenge. Redlib proxies page data and media.', es: 'Navegador → Cloudflare → VM perimetral con Caddy → VM de aplicaciones/Anubis → Redlib → Reddit. En la primera visita, el navegador debe completar la prueba de trabajo local de Anubis. Redlib retransmite páginas y contenido multimedia.' },
    upstreamServices: ['Reddit'], filesUploaded: false,
    temporaryStorage: { en: 'Anubis keeps short-lived challenge records—including the client network address and user agent—in a small local bbolt file. Redlib presents an Android client identity to obtain and refresh a real Reddit OAuth token, kept with connection state and transient page or media buffers in process memory; its /tmp is memory-backed.', es: 'Anubis guarda registros breves del desafío —incluidos la dirección de red del cliente y el agente de usuario— en un pequeño archivo bbolt local. Redlib se presenta como un cliente de Android para obtener y renovar un token OAuth real de Reddit, que mantiene en memoria junto con el estado de conexiones y los búferes temporales de páginas o contenido; su /tmp reside en memoria.' },
    retention: { en: 'Challenge records have a 30-minute TTL; expired records are removed on later access or by hourly cleanup. Anubis sets a 30-minute verification cookie and a 24-hour authorization cookie. Both are host-only, Secure, HttpOnly, SameSite=Lax and Partitioned. Redlib has no browsing-history database; optional display preferences use a separate first-party cookie.', es: 'Los registros del desafío tienen un plazo de 30 minutos; los registros vencidos se eliminan cuando se consultan de nuevo o durante la limpieza cada hora. Anubis crea una cookie de verificación por 30 minutos y otra de autorización por 24 horas. Ambas se limitan al host y usan Secure, HttpOnly, SameSite=Lax y Partitioned. Redlib no tiene una base de datos de historial; las preferencias visuales opcionales usan otra cookie propia.' },
    logging: { en: 'Normal browsing is not intentionally logged by Redlib or Anubis. Anubis logs only warnings and errors; failures may include a host, method, path, user agent, or network address. Docker rotation is limited to 10 MB per file with three files. Edge security logging is separate.', es: 'Redlib y Anubis no registran intencionalmente la navegación normal. Anubis registra solo advertencias y errores; una falla puede incluir host, método, ruta, agente de usuario o dirección de red. Docker limita la rotación a tres archivos de 10 MB. Los registros de seguridad del borde son independientes.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'privatebin', ...providerMetadata('privatebin'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'privacy', featuredOrder: 10, configUrlKey: 'publicPasteUrl',
    name: { en: 'Encrypted paste', es: 'Texto cifrado' },
    description: { en: 'Share encrypted text with an expiry using PrivateBin. Keep the complete sharing link private: it contains the key.', es: 'Compartí texto cifrado con vencimiento usando PrivateBin. Conservá el enlace completo en privado: contiene la clave.' },
    launchLabel: { en: 'Share text', es: 'Compartir texto' },
    help: { en: 'Paste text, choose an expiry and optionally a password or burn-after-reading. File uploads and discussion are disabled. Opening a one-time paste yourself can consume it. Recipients can keep copies.', es: 'Pegá texto, elegí vencimiento y, si te sirve, contraseña o eliminación tras leerlo. No se admiten archivos ni comentarios. Abrir vos un texto de una sola lectura puede consumirlo. El destinatario puede conservar copias.' },
    labels: ['local', 'server'],
    dataFlow: { en: 'The browser encrypts text, then sends ciphertext through the edge to PrivateBin. The decryption key remains after # in the URL and is not included in the HTTP request.', es: 'El navegador cifra el texto y envía el contenido cifrado mediante el borde a PrivateBin. La clave queda después de # en la URL y no se incluye en la solicitud HTTP.' },
    upstreamServices: [], filesUploaded: false,
    temporaryStorage: { en: 'Plaintext and keys exist in browser memory. The server persists only encrypted payloads and associated metadata in filesystem storage; file uploads are disabled.', es: 'El texto sin cifrar y las claves existen en la memoria del navegador. El servidor conserva solo contenido cifrado y metadatos asociados en el sistema de archivos; las cargas de archivos están desactivadas.' },
    retention: { en: 'Default expiry: one day; choices: five minutes, ten minutes, one hour, one day or one week. Optional burn-after-reading removes access sooner. Automatic purge is enabled; expiry is not proof of immediate erasure from storage or backups.', es: 'Vencimiento predeterminado: un día; opciones: cinco minutos, diez minutos, una hora, un día o una semana. La eliminación tras leerlo puede quitar el acceso antes. Hay purga automática; vencer no demuestra eliminación inmediata del almacenamiento o los respaldos.' },
    logging: { en: 'The application does not receive the decryption key or plaintext. Rotated web-server and edge logs may contain paste identifiers and request metadata, but should not include URL fragments.', es: 'La aplicación no recibe la clave ni el texto sin cifrar. Los registros rotados del servidor web y del borde pueden contener identificadores y metadatos de solicitud, pero no deben incluir fragmentos de URL.' },
    modified: false, operationalStatus: 'operational',
  },
  {
    id: 'private-router', ...providerMetadata('redlib'), kind: 'integration', implementation: 'integration-glue', portalSurface: 'integration-glue', category: 'utility', discoveryGroup: 'reading',
    name: { en: 'Open a Reddit link through Redlib', es: 'Abrir un enlace de Reddit con Redlib' },
    description: { en: 'Check a public Reddit URL, then open the matching path in this Redlib instance.', es: 'Revisá una URL pública de Reddit y abrí la ruta correspondiente en esta instancia de Redlib.' },
    slug: { en: 'tools/open-privately', es: 'herramientas/abrir-con-privacidad' },
    labels: ['local', 'server', 'proxy'],
    dataFlow: { en: 'The pasted URL is parsed only in the browser. If you choose Continue, the browser opens the fixed Redlib instance, which contacts Reddit.', es: 'La URL pegada se analiza solo en el navegador. Si elegís Continuar, el navegador abre la instancia fija de Redlib, que se comunica con Reddit.' },
    upstreamServices: ['Reddit'], filesUploaded: false,
    temporaryStorage: browserMemory,
    retention: { en: 'Parsing is not retained. A chosen frontend navigation follows that service’s stated retention policy.', es: 'El análisis no se conserva. La navegación elegida sigue la política de conservación de esa interfaz.' },
    logging: { en: 'Pasting is not logged. Following the generated link can appear in the selected frontend and edge operational logs.', es: 'Pegar la URL no se registra. Abrir el enlace generado puede aparecer en los registros operativos de la interfaz elegida y del borde.' },
    modified: false, operationalStatus: 'operational',
  },
];

export function localized(text: LocalizedText, language: Language): string {
  return text[language];
}

function newInstallations(): CatalogEntry[] {
  const readers: Array<{id: 'kittygram' | 'rimgo'; name: LocalizedText; description: LocalizedText; reason: LocalizedText}> = [
    {id:'kittygram', name:{en:'Read Instagram · Kittygram',es:'Leer Instagram · Kittygram'}, description:{en:'Read public Instagram profiles and posts without signing in.',es:'Leé perfiles y publicaciones públicas de Instagram sin iniciar sesión.'}, reason:{en:'Access is not enabled in this portal configuration.',es:'El acceso no está habilitado en esta configuración del portal.'}},
    {id:'rimgo', name:{en:'View Imgur · Rimgo',es:'Ver Imgur · Rimgo'}, description:{en:'Read public Imgur albums through an alternative interface.',es:'Consultá álbumes públicos de Imgur con una interfaz alternativa.'}, reason:{en:'Installed, but Imgur currently rate-limits media from this server. Albums alone do not make the service usable.',es:'Instalado, pero Imgur limita las imágenes y videos de este servidor. Recibir solo los datos del álbum no basta para usarlo.'}},
  ];
  return [
    ...readers.map((entry): CatalogEntry => ({
      id:entry.id,...providerMetadata(entry.id),kind:'service',implementation:'upstream-application',category:'service',discoveryGroup:'media',
      name:entry.name,description:entry.description,featuredOrder:entry.id==='kittygram'?49:50,
      configUrlKey:entry.id==='kittygram'?'publicInstagramUrl':undefined,
      launchLabel:{en:'Open reader',es:'Abrir lector'},unavailableReason:entry.reason,
      help:entry.id==='kittygram'?{en:'Public posts only; no login, posting or private-account access. The interface has no Spanish translation in this version. Instagram can block retrieval. Return to Utilibre through the native operator link on the homepage.',es:'Solo publicaciones públicas; no permite iniciar sesión, publicar ni acceder a cuentas privadas. Esta versión no incluye traducción al español. Instagram puede bloquear el acceso. Volvé a Utilibre desde el enlace del operador en la página principal.'}:entry.reason,
      labels:['server','proxy'],filesUploaded:false,upstreamServices:[entry.id==='kittygram'?'Instagram':'Imgur'],
      dataFlow:{en:'Browser → Cloudflare/Caddy → Utilibre → upstream content provider. Content and media are proxied through Utilibre; the operator can see requests. This is not anonymous or confidential browsing.',es:'Navegador → Cloudflare/Caddy → Utilibre → proveedor del contenido. Las páginas e imágenes pasan por Utilibre; el operador puede ver las solicitudes. No es navegación anónima ni confidencial.'},
      temporaryStorage:{en:'Bounded in-memory content caches and request counters. No visitor account database.',es:'Cachés limitadas en memoria y contadores de solicitudes. No hay una base de datos de cuentas de visitantes.'},
      retention:entry.id==='kittygram'?{en:'Public-profile lookup cache is limited to a 64 MiB RAM filesystem; Valkey cache to 128 MiB; media gateway cache to 96 MiB with five-minute freshness. Restarting clears these caches. Signed language/theme cookies last up to 90 days.',es:'La caché de perfiles públicos usa hasta 64 MiB en memoria; Valkey, hasta 128 MiB; y la caché de imágenes, hasta 96 MiB con cinco minutos de vigencia. Reiniciar borra estas cachés. Las cookies firmadas de idioma y tema duran hasta 90 días.'}:{en:'Parsed API caches are size-limited and expire automatically. Restarting clears them; upstream and edge retention are separate.',es:'Las cachés de la API tienen límites de tamaño y vencen automáticamente. Reiniciar las borra; el proveedor y el borde tienen sus propias políticas.'},
      logging:{en:'Application and local gateway logging are disabled. Cloudflare, the edge and upstream providers may retain operational/security metadata.',es:'Los registros de la aplicación y su intermediario local están desactivados. Cloudflare, el borde y los proveedores pueden conservar metadatos operativos o de seguridad.'},
      modified:true,operationalStatus:entry.id==='kittygram'?'operational':'unavailable',
    })),
    {
      id:'mumble',...providerMetadata('mumble'),kind:'service',implementation:'upstream-application',category:'service',discoveryGroup:'media',featuredOrder:51,configUrlKey:'publicMumbleUrl',
      name:{en:'Voice chat · Mumble',es:'Chat de voz · Mumble'},description:{en:'Password-protected group voice chat using a Mumble desktop or mobile client.',es:'Conversá por voz en grupo con contraseña y un cliente de Mumble para computadora o teléfono.'},
      launchLabel:{en:'Open Mumble',es:'Abrir Mumble'},
      help:{en:'Password-protected: request the join password from admin@utilibre.org. Connect a Mumble client to mumble.utilibre.org, port 64738. Public authentication and TCP voice fallback have been tested from outside the network; public UDP audio is not yet verified. Check the self-signed certificate fingerprint in the connection guide. This is not a browser call tool.',es:'Acceso con contraseña: pedila a admin@utilibre.org. Conectá un cliente de Mumble a mumble.utilibre.org, puerto 64738. Se verificaron el acceso público y la voz por TCP desde fuera de la red; falta verificar el audio UDP público. Compará la huella del certificado autofirmado con la guía de conexión. No funciona como llamada en el navegador.'},
      quickLinks:[{path:'https://github.com/mycelibre/utilibre/blob/main/docs/expanded-operations.md#mumble',label:{en:'Connection guide',es:'Guía de conexión'}}],
      unavailableReason:{en:'Mumble is not enabled in this portal configuration.',es:'Mumble no está habilitado en esta configuración del portal.'},
      labels:['server'],filesUploaded:false,upstreamServices:[],
      dataFlow:{en:'Mumble client → encrypted connection → Utilibre voice server → other participants. The server relays decrypted voice; this is not end-to-end encryption. Participants can record.',es:'Cliente de Mumble → conexión cifrada → servidor de voz de Utilibre → otras personas. El servidor retransmite la voz descifrada; no hay cifrado de extremo a extremo. Otras personas pueden grabar.'},
      temporaryStorage:{en:'Transient voice packets in memory; channel settings, registered identities and the server certificate use SQLite.',es:'Paquetes de voz temporales en memoria; los canales, identidades registradas y el certificado usan SQLite.'},
      retention:{en:'No server recording is configured. Registered identities and channel settings persist until removed; private backups can retain them.',es:'No se configuró grabación en el servidor. Las identidades registradas y los canales permanecen hasta que se borren; las copias privadas pueden conservarlos.'},
      logging:{en:'Console/file and database event logs are disabled for this pilot. Network-level records may still exist.',es:'Los registros de consola, archivo y eventos de base de datos están desactivados en este piloto. Pueden existir registros de red.'},
      modified:false,operationalStatus:'degraded',
    },
  ];
}

function readerEvaluations(): CatalogEntry[] {
  const entries: { id: FossProviderId; name: LocalizedText; description: LocalizedText; reason: LocalizedText; upstream: string }[] = [
    { id: 'lrclib', name: { en: 'Read lyrics · LRCLIB', es: 'Leer letras · LRCLIB' }, description: { en: 'Find plain and synchronized song lyrics without an account.', es: 'Buscá letras de canciones, con o sin tiempos, sin crear una cuenta.' }, reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' }, upstream: 'LRCLIB' },
    { id: 'libremdb', name: { en: 'Look up films · LibreMDB', es: 'Consultar películas · LibreMDB' }, description: { en: 'Browse film information from IMDb through an alternative reader.', es: 'Consultá información de películas de IMDb con una interfaz alternativa.' }, reason: { en: 'Private search and image tests passed. Public access awaits resolution of IMDb data-use permission.', es: 'Las pruebas privadas de búsqueda e imágenes pasaron. Falta resolver el permiso para ofrecer los datos de IMDb públicamente.' }, upstream: 'IMDb' },
    { id: 'degoog', name: { en: 'Search with DeGoog', es: 'Buscar con DeGoog' }, description: { en: 'Search the web, books and technology discussions with three selected engines.', es: 'Buscá en la web, libros y conversaciones de tecnología con tres motores seleccionados.' }, reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' }, upstream: 'Mwmbl, Open Library and Hacker News' },
    { id: 'fourget', name: { en: 'Search with 4get', es: 'Buscar con 4get' }, description: { en: 'Search different providers through a lightweight interface.', es: 'Buscá en distintos proveedores con una interfaz liviana.' }, reason: { en: 'Search and image tests passed on the protected backend. The public HTTPS route is still pending.', es: 'Las pruebas de búsqueda e imágenes pasaron en el servidor protegido. Falta activar la ruta HTTPS pública.' }, upstream: 'Selected search providers' },
    { id: 'safetwitch', name: { en: 'Watch Twitch · SafeTwitch', es: 'Ver Twitch · SafeTwitch' }, description: { en: 'Watch public Twitch channels without an account. Live chat is disabled.', es: 'Mirá canales públicos de Twitch sin cuenta. El chat en vivo está desactivado.' }, reason: { en: 'Live video and Spanish mobile tests passed on the protected backend. The public HTTPS route is still pending.', es: 'Las pruebas de video en vivo y de español en móvil pasaron en el servidor protegido. Falta activar la ruta HTTPS pública.' }, upstream: 'Twitch' },
    { id: 'anonymousoverflow', name: { en: 'Read Stack Overflow', es: 'Leer Stack Overflow' }, description: { en: 'Read programming questions and answers with AnonymousOverflow.', es: 'Leé preguntas y respuestas de programación con AnonymousOverflow.' }, reason: { en: 'Article retrieval passed on the protected backend. The public HTTPS route is still pending.', es: 'La lectura de artículos pasó en el servidor protegido. Falta activar la ruta HTTPS pública.' }, upstream: 'Stack Exchange' },
  ];
  const publicReaders: Partial<Record<FossProviderId, string>> = { fourget: 'publicFourgetUrl', anonymousoverflow: 'publicOverflowUrl', safetwitch: 'publicTwitchUrl', degoog: 'publicDegoogUrl', lrclib: 'publicLyricsUrl' };
  return entries.map((entry) => ({
    id: entry.id, ...providerMetadata(entry.id), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: ['degoog', 'fourget'].includes(entry.id) ? 'find' : ['anonymousoverflow', 'gothub'].includes(entry.id) ? 'text-data' : 'media', name: entry.name, description: entry.description,
    help: entry.reason, unavailableReason: entry.reason, labels: ['server', 'proxy'],
    dataFlow: { en: 'Not open to visitors. Evaluation requests are sent by Utilibre to the upstream provider, which sees the server address and request.', es: 'No está abierto al público. Utilibre envía las solicitudes de prueba al proveedor, que ve la dirección del servidor y la solicitud.' },
    upstreamServices: [entry.upstream], filesUploaded: false,
    temporaryStorage: { en: 'Private evaluation only; this is not a file storage service.', es: 'Solo en evaluación privada; no es un servicio de almacenamiento de archivos.' },
    retention: { en: 'Public retention settings are not yet established. Do not send personal data.', es: 'Todavía no hay una política de conservación para uso público. No enviés datos personales.' },
    logging: { en: 'Evaluation logging and upstream retention vary by application; no public no-logging claim is made.', es: 'Los registros de prueba y la conservación del proveedor varían según la aplicación; no afirmamos que un servicio público carezca de registros.' },
    modified: false, operationalStatus: 'maintenance',
    ...(publicReaders[entry.id] ? {
      configUrlKey: publicReaders[entry.id], featuredOrder: {fourget: 45, anonymousoverflow: 46, safetwitch: 47}[entry.id as 'fourget' | 'anonymousoverflow' | 'safetwitch'],
      launchLabel: { en: 'Open tool', es: 'Abrir herramienta' },
      help: entry.id === 'safetwitch' ? {en: 'Browse public Twitch channels. The Spanish portal selects the native Spanish interface. Chat is disabled; follows are browser-local. Export settings before clearing site data.', es: 'Explorá canales públicos de Twitch. El portal en español selecciona la interfaz en español. El chat está desactivado; los canales seguidos quedan en el navegador. Exportá los ajustes antes de borrar los datos del sitio.'} : entry.id === 'anonymousoverflow' ? {en: 'Replace stackoverflow.com in a question link with overflow.utilibre.org. Read-only; no accounts or posting. The interface is in English.', es: 'Reemplazá stackoverflow.com en el enlace de una pregunta por overflow.utilibre.org. Solo permite leer; no tiene cuentas ni publicaciones. La interfaz está en inglés.'} : {en: 'Choose a provider and search. Providers can fail or rate-limit requests independently. The interface is in English.', es: 'Elegí un proveedor y buscá. Cada proveedor puede fallar o limitar solicitudes por separado. La interfaz está en inglés.'},
      unavailableReason: {en:'Access is not enabled in this portal configuration.',es:'El acceso no está habilitado en esta configuración del portal.'},
      dataFlow: {en:`Browser → Cloudflare/Caddy → Utilibre → ${entry.upstream}. Upstream providers see server requests, not a direct browser connection in the tested workflows.`,es:`Navegador → Cloudflare/Caddy → Utilibre → ${entry.upstream}. En los flujos probados, los proveedores ven solicitudes del servidor, no conexiones directas de tu navegador.`},
      temporaryStorage: {en:'Bounded server caches and rate-limit counters; local preferences may remain in your browser. No server-side user account is created.',es:'Cachés limitadas y contadores de solicitudes en el servidor; las preferencias pueden quedar en tu navegador. No se crea una cuenta en el servidor.'},
      retention: {en:'Server caches expire automatically or clear on restart. Browser preferences remain until removed. Upstream and edge retention are separate; this is not a confidential browsing service.',es:'Las cachés del servidor vencen automáticamente o se borran al reiniciar. Las preferencias del navegador permanecen hasta que las borrés. El borde y los proveedores tienen sus propias políticas; no es un servicio de navegación confidencial.'},
      logging: {en:'Gateway access logs are disabled. Rotating operational/error logs and upstream/edge records may contain request metadata.',es:'Los registros de acceso del intermediario están desactivados. Los errores y registros operativos rotativos del servicio, del borde y de los proveedores pueden contener metadatos de solicitudes.'},
      modified: true, operationalStatus: 'operational' as const,
      ...(entry.id === 'lrclib' ? {
        featuredOrder: 53,
        help: {en:'Search by song or artist, then open a result to read or copy its lyrics. Uses the LRCLIB catalog, not Genius: annotations and Genius links are not supported. The upstream interface is in English. No account or publishing is available.',es:'Buscá por canción o artista y abrí un resultado para leer o copiar la letra. Usa el catálogo de LRCLIB, no Genius: no admite anotaciones ni enlaces de Genius. La interfaz original está en inglés. No hay cuentas ni publicaciones.'},
        dataFlow: {en:'Browser → Cloudflare/Caddy → Utilibre → LRCLIB. Searches are sent to LRCLIB by the server without forwarding your browser headers or IP. The operator and edge can see requests; this is not confidential searching.',es:'Navegador → Cloudflare/Caddy → Utilibre → LRCLIB. El servidor envía las búsquedas a LRCLIB sin reenviar las cabeceras ni la IP de tu navegador. El operador y el borde pueden ver las solicitudes; no son búsquedas confidenciales.'},
        retention: {en:'Search results use an 8 MiB RAM cache, with at most 128 entries and ten-minute freshness. Expired entries are removed on the next search; restart clears the cache. There is no account database or persistent search history.',es:'Los resultados usan una caché de 8 MiB en memoria, con un máximo de 128 entradas y diez minutos de vigencia. Las entradas vencidas se borran en la siguiente búsqueda; reiniciar borra la caché. No hay base de cuentas ni historial persistente de búsquedas.'},
        logging: {en:'The adapter does not log searches; local gateway access logs are off. Cloudflare, Caddy and LRCLIB have separate operational/security retention policies.',es:'El adaptador no registra búsquedas; los registros de acceso del intermediario local están desactivados. Cloudflare, Caddy y LRCLIB tienen sus propias políticas de conservación operativa o de seguridad.'},
      } : {}),
      ...(entry.id === 'degoog' ? {
        modified: false, featuredOrder: 52,
        help: {en:'Uses Mwmbl, Open Library and Hacker News through the native SearXNG bridge. The interface follows your browser language, including Spanish. No accounts, third-party extension store or search index. The native privacy panel links back to Utilibre.',es:'Usa Mwmbl, Open Library y Hacker News mediante la integración nativa de SearXNG. La interfaz sigue el idioma de tu navegador, incluido el español. No hay cuentas, tienda de extensiones externa ni índice de búsquedas. El panel nativo de privacidad incluye un enlace a Utilibre.'},
        retention: {en:'Search responses remain in a bounded RAM cache for up to ten minutes. Request counters can last one hour. Preferences remain in your browser; no persistent search index or favicon store is enabled.',es:'Las respuestas quedan en una caché limitada en memoria por hasta diez minutos. Los contadores de solicitudes pueden durar una hora. Las preferencias quedan en tu navegador; no se habilitó un índice persistente ni almacenamiento de íconos.'},
        logging: {en:'Application and gateway logs are disabled. Cloudflare, the Caddy edge and upstream providers have separate retention policies.',es:'Los registros de la aplicación y su intermediario local están desactivados. Cloudflare, Caddy y los proveedores tienen sus propias políticas de conservación.'},
      } : {}),
    } : {}),
  }));
}

function expandedTools(): CatalogEntry[] {
  const entries: Array<{
    id: FossProviderId; group: DiscoveryGroup; name: LocalizedText;
    description: LocalizedText; reason: LocalizedText; help: LocalizedText;
    data: LocalizedText;
  }> = [
    {
      id: 'reactive-resume', group: 'files', name: { en: 'CV builder · Reactive Resume', es: 'Crear un CV · Reactive Resume' },
      description: { en: 'Build a résumé with templates and download it. Sign in with an approved Utilibre account.', es: 'Armá tu currículum con plantillas y descargalo. Iniciá sesión con una cuenta de Utilibre aprobada.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'Use the Utilibre sign-in button. Documents start private; publish only when you intend to share them. AI features are disabled. Keep your own exports.', es: 'Usá el botón de acceso de Utilibre. Los documentos empiezan privados; publicalos solo si querés compartirlos. La IA está desactivada. Guardá tus propias exportaciones.' },
      data: { en: 'Résumé content and uploaded assets are stored on Utilibre. This is not a browser-only tool or end-to-end encrypted storage.', es: 'El contenido del currículum y los archivos se guardan en Utilibre. No es una herramienta que funcione solo en tu navegador ni almacenamiento con cifrado de extremo a extremo.' },
    },
    {
      id: 'penpot', group: 'design', name: { en: 'Collaborative design · Penpot', es: 'Diseño colaborativo · Penpot' },
      description: { en: 'Design interfaces and prototypes together. Access is approved individually for this pilot.', es: 'Diseñá interfaces y prototipos en equipo. El acceso a este piloto se aprueba individualmente.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'Use Utilibre sign-in. Invite only intended collaborators to your team and keep exported copies of important work. Public registration is closed.', es: 'Ingresá con Utilibre. Invitá a tu equipo solo a quienes deban colaborar y guardá copias exportadas de los trabajos importantes. El registro público está cerrado.' },
      data: { en: 'Design documents and assets are stored on Utilibre and shared with authorized collaborators. This is not end-to-end encrypted storage.', es: 'Los documentos de diseño y archivos se guardan en Utilibre y se comparten con colaboradores autorizados. No es almacenamiento con cifrado de extremo a extremo.' },
    },
    {
      id: 'actual', group: 'planning', name: { en: 'Personal budgets · Actual Budget', es: 'Presupuesto personal · Actual Budget' },
      description: { en: 'Plan a household budget with your own approved account. Bank connections are not enabled.', es: 'Planificá el presupuesto de tu hogar con tu propia cuenta aprobada. Las conexiones bancarias están desactivadas.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'Choose Sign in with OpenID to use Utilibre. Accounts have separate budgets. Enable budget encryption yourself if you need it, and keep your own exports.', es: 'Elegí Sign in with OpenID para ingresar con Utilibre. Cada cuenta tiene sus propios presupuestos. Activá el cifrado del presupuesto si lo necesitás y guardá tus propias exportaciones.' },
      data: { en: 'Actual keeps a local copy and synchronizes budgets with Utilibre. End-to-end encryption is optional, not enabled automatically; server administrators can access unencrypted budgets.', es: 'Actual conserva una copia local y sincroniza los presupuestos con Utilibre. El cifrado de extremo a extremo es opcional, no automático; la administración del servidor puede acceder a presupuestos sin cifrar.' },
    },
    {
      id: 'rallly', group: 'planning', name: { en: 'Meeting polls · Rallly', es: 'Encuestas para reuniones · Rallly' },
      description: { en: 'Find a meeting time with a group. Organizers sign in; participants can vote without an account.', es: 'Encontrá un horario para reunirte con un grupo. Quien organiza inicia sesión; las demás personas pueden votar sin cuenta.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'Organizers use approved Utilibre accounts; invited participants can vote as guests. Export responses from Manage → Export to CSV. This stock AGPL release retains Rallly branding and may display an upstream license reminder; Utilibre does not charge for this service.', es: 'Usá una cuenta aprobada de Utilibre para organizar; las personas invitadas pueden votar sin cuenta. Exportá las respuestas desde Administrar → Exportar a CSV. Esta versión AGPL conserva la marca Rallly y puede mostrar un aviso de licencia del proyecto; Utilibre no cobra por este servicio.' },
      data: { en: 'Polls, participant responses and organizer accounts are stored on Utilibre, not end-to-end encrypted. Share poll links only with intended participants.', es: 'Las encuestas, respuestas y cuentas de organización se guardan en Utilibre, sin cifrado de extremo a extremo. Compartí los enlaces solo con las personas que quieras invitar.' },
    },
    {
      id: 'breezewiki', group: 'reading', name: { en: 'Read wikis · BreezeWiki', es: 'Leer wikis · BreezeWiki' },
      description: { en: 'Read Fandom articles through a simpler interface. Image retrieval is currently unreliable.', es: 'Leé artículos de Fandom con una interfaz más sencilla. La carga de imágenes todavía falla.' },
      reason: { en: 'Article retrieval is fixed, but Fandom’s image CDN still rejects requests. Full-page tests do not pass yet.', es: 'La consulta de artículos ya funciona, pero el proveedor de imágenes de Fandom sigue rechazando solicitudes. Las pruebas de páginas completas aún no pasan.' },
      help: { en: 'This is a reader, not a wiki-editing platform. Article text works in tested pages; many images fail upstream. We will not send your browser directly to Fandom to work around this. The launch link remains unavailable while the complete reading workflow fails.', es: 'Es un lector, no una plataforma para editar wikis. El texto funciona en las páginas probadas, pero muchas imágenes fallan en el sitio de origen. No vamos a conectar tu navegador directamente con Fandom para resolverlo. El enlace de acceso sigue deshabilitado mientras falle la lectura completa.' },
      data: { en: 'The server requests public wiki pages and proxies content. Private-network destinations are blocked; temporary caches and connection metadata remain part of the service.', es: 'El servidor consulta páginas públicas de wikis y retransmite contenido. Los destinos de redes privadas están bloqueados; el servicio utiliza cachés temporales y datos de conexión.' },
    },
    {
      id: 'wakapi', group: 'text-data', name: { en: 'Coding activity · Wakapi', es: 'Actividad de programación · Wakapi' },
      description: { en: 'Track coding activity by project, language and editor with an approved Utilibre account.', es: 'Consultá tu actividad de programación por proyecto, lenguaje y editor con una cuenta de Utilibre aprobada.' },
      reason: { en: 'Public access is not configured on this portal.', es: 'El acceso público no está configurado en este portal.' },
      help: { en: 'Choose Login with Utilibre. Configure your editor explicitly to send activity here and keep its API key private. Account recovery is handled by Utilibre login, not a separate Wakapi password.', es: 'Elegí Login with Utilibre. Configurá tu editor expresamente para enviar actividad acá y mantené privada su clave API. Recuperá el acceso desde el inicio de sesión de Utilibre, no con una contraseña separada de Wakapi.' },
      data: { en: 'Configured editor clients send coding-activity metadata to Utilibre. The server stores it for reporting; raw activity retention is configured to three months. Public leaderboards and imports are disabled.', es: 'Los editores configurados envían metadatos de actividad a Utilibre. El servidor los guarda para generar informes; la conservación de actividad original está configurada en tres meses. Las clasificaciones públicas y las importaciones están desactivadas.' },
    },
    {
      id: 'priviblur', group: 'reading', name: { en: 'Read Tumblr · Priviblur', es: 'Leer Tumblr · Priviblur' },
      description: { en: 'Read public Tumblr blogs without a Tumblr account.', es: 'Leé blogs públicos de Tumblr sin una cuenta de Tumblr.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'For public posts only, not private accounts. Spanish is available in Settings. This build updates security dependencies and publishes its modified source.', es: 'Solo sirve para publicaciones públicas, no para cuentas privadas. Podés elegir español en Ajustes. Esta versión actualiza dependencias de seguridad y publica su código modificado.' },
      data: { en: 'Utilibre requests public Tumblr content and media on your behalf. Tumblr sees server requests; Cloudflare handles public HTTPS. Preferences use a first-party cookie. No personal Tumblr account is used.', es: 'Utilibre consulta contenido público y archivos de Tumblr por vos. Tumblr recibe solicitudes del servidor; Cloudflare gestiona el HTTPS público. Las preferencias usan una cookie propia. No usamos una cuenta personal de Tumblr.' },
    },
    {
      id: 'mezzo', group: 'media', name: { en: 'Find GIFs · Mezzo', es: 'Buscar GIF · Mezzo' },
      description: { en: 'Search and view Tenor GIFs through a simpler interface.', es: 'Buscá y mirá GIF de Tenor con una interfaz más sencilla.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'Search for a GIF or paste a Tenor link. No account is needed. The current upstream interface is in English.', es: 'Buscá un GIF o pegá un enlace de Tenor. No necesitás una cuenta. La interfaz actual del proyecto está en inglés.' },
      data: { en: 'Utilibre fetches Tenor pages and media, with short-lived metadata caches. Tenor receives server requests; Cloudflare handles public HTTPS. No analytics or advertising is added.', es: 'Utilibre consulta páginas y archivos de Tenor, con cachés temporales de metadatos. Tenor recibe solicitudes del servidor; Cloudflare gestiona el HTTPS público. No agregamos analítica ni publicidad.' },
    },
    {
      id: 'fmd', group: 'privacy', name: { en: 'Find your Android · FMD', es: 'Encontrar tu Android · FMD' },
      description: { en: 'Connect your own Android device with the FMD app. Invitation-only pilot; real-device testing is still pending.', es: 'Conectá tu propio dispositivo Android con la app FMD. Piloto por invitación; todavía falta la prueba con un dispositivo real.' },
      reason: { en: 'Access is not enabled in this portal configuration.', es: 'El acceso no está habilitado en esta configuración del portal.' },
      help: { en: 'Install FMD Android on your own device, then request a registration invitation. FMD has its own device credentials, not Utilibre web login. Keep recovery credentials safe; this is not a guaranteed recovery service. Map tiles and your chosen push provider are external connections.', es: 'Instalá FMD Android en tu propio dispositivo y pedí una invitación de registro. FMD usa credenciales propias, no el inicio de sesión web de Utilibre. Guardá los datos de recuperación; no garantizamos recuperar dispositivos. Los mapas y el proveedor de notificaciones que elijás son conexiones externas.' },
      data: { en: 'Device account metadata and encrypted location/picture records are stored on Utilibre. Limits: 300 locations and 5 pictures per account. Push URLs and connection metadata are not hidden from the server. Backups are currently on this VM, not off-site.', es: 'Utilibre guarda metadatos de la cuenta del dispositivo y registros cifrados de ubicación e imágenes. Límites: 300 ubicaciones y 5 imágenes por cuenta. El servidor puede ver las URL de notificaciones y metadatos de conexión. Los respaldos están en esta misma VM, no fuera del servidor.' },
    },
  ];
  return entries.map((entry, index) => ({
    id: entry.id, ...providerMetadata(entry.id), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup: entry.group, featuredOrder: 19 + index,
    configUrlKey: ({ 'reactive-resume': 'publicResumeUrl', penpot: 'publicDesignUrl', actual: 'publicBudgetUrl', wakapi: 'publicWakapiUrl', rallly: 'publicPollUrl', priviblur: 'publicTumblrUrl', mezzo: 'publicTenorUrl', fmd: 'publicFmdUrl' } as Record<string,string>)[entry.id],
    accountAccess: ['breezewiki', 'priviblur', 'mezzo'].includes(entry.id) ? undefined : 'invite-required',
    name: entry.name, description: entry.description, help: entry.help, unavailableReason: entry.reason,
    labels: ['breezewiki', 'priviblur', 'mezzo'].includes(entry.id) ? ['server', 'proxy'] : ['server'],
    dataFlow: entry.data, upstreamServices: entry.id === 'breezewiki' ? ['Fandom'] : entry.id === 'priviblur' ? ['Tumblr'] : entry.id === 'mezzo' ? ['Tenor'] : entry.id === 'fmd' ? ['Map tiles', 'User-selected push provider'] : [],
    filesUploaded: ['reactive-resume', 'penpot', 'actual', 'fmd'].includes(entry.id),
    temporaryStorage: entry.data,
    retention: ['priviblur', 'mezzo', 'fmd'].includes(entry.id) ? entry.data : entry.id === 'breezewiki'
      ? { en: 'Short-lived server caches; upstream access is currently blocked.', es: 'Cachés breves en el servidor; el acceso al origen está bloqueado.' }
      : { en: 'Persistent account data requires an operator-managed retention, export and deletion process. Public enrollment is not open.', es: 'Los datos persistentes necesitan un proceso de conservación, exportación y eliminación gestionado por la administración. La inscripción pública no está abierta.' },
    logging: { en: 'Operational diagnostics and the HTTPS edge can retain request metadata. Do not treat this as an anonymous service.', es: 'Los diagnósticos operativos y el servidor HTTPS pueden conservar metadatos de solicitudes. No lo considerés un servicio anónimo.' },
    modified: ['wakapi', 'priviblur'].includes(entry.id),
    operationalStatus: entry.id === 'breezewiki' ? 'unavailable' : 'operational',
  }));
}

function browserTool(
  providerId: FossProviderId, discoveryGroup: DiscoveryGroup, featuredOrder: number, configUrlKey: string,
  name: LocalizedText, description: LocalizedText, launchLabel: LocalizedText, externalAssets: boolean,
  help: LocalizedText, quickLinks?: CatalogEntry['quickLinks'],
): CatalogEntry {
  return {
    id: providerId, ...providerMetadata(providerId), kind: 'service', implementation: 'upstream-application',
    category: 'service', discoveryGroup, featuredOrder, configUrlKey, name, description, launchLabel, quickLinks,
    help,
    unavailableReason: ['jupyterlite', 'whisper-web', 'qr-offline'].includes(providerId)
      ? { en: 'Installed and tested; the public HTTPS connection is not ready yet.', es: 'Ya está instalada y probada; la conexión HTTPS pública todavía no está lista.' }
      : undefined,
    labels: externalAssets ? ['local', 'external'] : ['local'], filesUploaded: false,
    dataFlow: externalAssets
      ? { en: 'Your browser processes the files. It also downloads processing components from external CDNs; those services receive your network address and download request. Selected files are not uploaded for processing.', es: 'Tu navegador procesa los archivos. También descarga componentes de CDN externas, que reciben tu dirección de red y la solicitud de descarga. Los archivos seleccionados no se suben para procesarlos.' }
      : { en: 'Utilibre serves the application. Files, passwords and entered content are processed in your browser, not uploaded to an application server.', es: 'Utilibre sirve la aplicación. Los archivos, contraseñas y datos ingresados se procesan en tu navegador, sin subirlos a un servidor de aplicaciones.' },
    upstreamServices: providerId === 'jupyterlite' ? ['jsDelivr Python runtime', 'Python package repositories'] : providerId === 'bentopdf' ? ['jsDelivr / unpkg processing assets', 'githack OCR fonts'] : externalAssets ? ['jsDelivr / unpkg processing assets'] : [],
    temporaryStorage: browserMemory,
    retention: { en: 'Utilibre stores no input files for these tools. Downloads remain on your device; application caches, preferences or local drafts can remain in browser storage until you clear the site’s data. Read the tool-specific help before using a shared device.', es: 'Utilibre no almacena los archivos ingresados en estas herramientas. Las descargas quedan en tu dispositivo; las cachés, preferencias o borradores locales pueden permanecer en el navegador hasta que borres los datos del sitio. Leé la ayuda antes de usar un dispositivo compartido.' },
    logging: { en: 'Tool web-server access logs are disabled. Bounded error logs can contain request metadata. Cloudflare and the separate HTTPS edge see connections and asset requests, not browser-local file contents; their retention is separate.', es: 'El registro de accesos del servidor de herramientas está desactivado. Los registros limitados de errores pueden incluir metadatos. Cloudflare y el borde HTTPS reciben conexiones y solicitudes de recursos, no el contenido de archivos procesado localmente; su conservación es independiente.' },
    modified: ['vert', 'omnitools', 'drawio', 'whisper-web', 'qr-offline'].includes(providerId), operationalStatus: 'operational',
  };
}

export function catalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

function communityTools(): CatalogEntry[] {
  const logging: LocalizedText = {
    en: 'Bounded operational logs may contain network addresses and request identifiers. Edge logging is separate. No advertising analytics are added.',
    es: 'Los registros operativos limitados pueden contener direcciones de red e identificadores de solicitudes. Los registros del borde son independientes. No agregamos analítica publicitaria.',
  };
  type CommunitySpec = Pick<CatalogEntry, 'id' | 'providerId' | 'discoveryGroup' | 'configUrlKey' | 'name' | 'description' | 'help' | 'labels' | 'dataFlow' | 'upstreamServices' | 'retention'> & Partial<Pick<CatalogEntry, 'quickLinks'>>;
  const specs: CommunitySpec[] = [
    {
      id: 'rssbridge', providerId: 'rssbridge', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicBridgeUrl',
      name: { en: 'Create an RSS feed', es: 'Crear un canal RSS' },
      description: { en: 'Follow selected sources with RSS-Bridge: GitHub Trending, The Guardian and Ars Technica. No account needed.', es: 'Seguí fuentes seleccionadas con RSS-Bridge: GitHub Trending, The Guardian y Ars Technica. No necesitás una cuenta.' },
      help: { en: 'Choose a source and copy its Atom or RSS URL into your feed reader. Only these three connectors are enabled. Cached results and request limits protect the source websites; feeds can break when those sites change.', es: 'Elegí una fuente y copiá su URL Atom o RSS en tu lector. Solo están habilitados estos tres conectores. La caché y los límites de solicitudes protegen los sitios originales; los canales pueden fallar si esos sitios cambian.' },
      labels: ['server', 'proxy'], upstreamServices: ['GitHub', 'The Guardian', 'Ars Technica'],
      dataFlow: { en: 'Utilibre receives the feed request and fetches the selected public website on the server. Arbitrary URL connectors and private-network destinations are blocked.', es: 'Utilibre recibe la solicitud del canal y consulta el sitio público seleccionado desde el servidor. Se bloquean los conectores de URL arbitrarias y los destinos de redes privadas.' },
      retention: { en: 'Feed responses are cached in bounded, temporary storage and disappear on restart. No reader accounts or subscription database are created.', es: 'Las respuestas se guardan en una caché temporal limitada y desaparecen al reiniciar. No se crean cuentas ni una base de datos de suscripciones.' },
    },
    {
      id: 'ntfy', providerId: 'ntfy', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicNotifyUrl',
      name: { en: 'Push notifications', es: 'Notificaciones' },
      description: { en: 'Send simple alerts to a browser or ntfy app. Anyone who knows a topic name can read and send messages there; do not use it for private information.', es: 'Enviá avisos a un navegador o ntfy. Cualquiera que conozca el nombre del tema puede leer y enviar mensajes ahí; no lo usés para información privada.' },
      help: { en: 'Choose a long, unpredictable topic name and subscribe before sending a test. Anyone who knows the topic can read or publish. Limit: 100 messages per IP per day, 4 KB each. No attachments, email or phone delivery. Instant iOS relay and browser Web Push are not enabled; keep the web page connected or use a compatible client.', es: 'Elegí un nombre de tema largo e impredecible y suscribite antes de enviar una prueba. Cualquiera que conozca el tema puede leer o publicar. Límite: 100 mensajes por IP al día, de 4 KB cada uno. Sin adjuntos, correo ni llamadas. No están habilitados el reenvío instantáneo para iOS ni Web Push; mantené la página conectada o usá un cliente compatible.' },
      labels: ['server'], upstreamServices: [],
      dataFlow: { en: 'The server receives readable message bodies and topic names, then sends them to subscribers. This is not end-to-end encrypted.', es: 'El servidor recibe los mensajes legibles y los nombres de temas, y los envía a quienes se suscriben. No hay cifrado de extremo a extremo.' },
      retention: { en: 'Messages are cached in memory for one hour and disappear on restart. Subscriber devices may retain notifications longer.', es: 'Los mensajes se conservan en memoria durante una hora y desaparecen al reiniciar. Los dispositivos receptores pueden conservarlos por más tiempo.' },
    },
    {
      id: 'yopass', providerId: 'yopass', discoveryGroup: 'privacy', configUrlKey: 'publicSecretUrl',
      name: { en: 'Share a one-time secret', es: 'Compartir un secreto una sola vez' },
      description: { en: 'Encrypt a short message with Yopass. It expires at first retrieval or after one hour, whichever comes first.', es: 'Cifrá un mensaje breve con Yopass. Vence al consultarlo por primera vez o tras una hora, lo que ocurra primero.' },
      help: { en: 'Enter a short message, encrypt it and share the complete link privately. Revealing the message consumes the secret, including during your own test. Save anything important elsewhere. Uploads are disabled; encrypted payloads are limited to 10 KB.', es: 'Ingresá un mensaje breve, cifralo y compartí el enlace completo en privado. Revelar el mensaje consume el secreto, incluso si lo hacés para probarlo. Guardá lo importante en otro lugar. No se admiten archivos; el contenido cifrado tiene un límite de 10 KB.' },
      labels: ['local', 'server'], upstreamServices: [],
      dataFlow: { en: 'The browser encrypts the message. Utilibre stores ciphertext; the decryption key remains in the URL fragment, outside the HTTP request.', es: 'El navegador cifra el mensaje. Utilibre almacena el contenido cifrado; la clave queda en el fragmento de la URL, fuera de la solicitud HTTP.' },
      retention: { en: 'Ciphertext is kept in memory until the first retrieval or one hour, whichever comes first. Restarting the service can remove it sooner. No recovery or backup.', es: 'El contenido cifrado queda en memoria hasta la primera consulta o durante una hora, lo que ocurra primero. Un reinicio puede eliminarlo antes. No hay recuperación ni copia de seguridad.' },
    },
    {
      id: 'pairdrop', providerId: 'pairdrop', discoveryGroup: 'privacy', configUrlKey: 'publicDropUrl',
      name: { en: 'Send files between devices', es: 'Enviar archivos entre dispositivos' },
      description: { en: 'Open PairDrop on both devices and send files directly between their browsers. Both must stay online.', es: 'Abrí PairDrop en ambos dispositivos y enviá archivos directamente entre sus navegadores. Ambos deben permanecer conectados.' },
      help: { en: 'Open the site on both devices. Choose the receiving device, select files and accept on the receiver. Use pairing or a temporary room across networks. There is no relay fallback, so restrictive networks may not connect. Verify the recipient before sending.', es: 'Abrí el sitio en ambos dispositivos. Elegí el receptor, seleccioná los archivos y aceptá en el otro dispositivo. Usá el emparejamiento o una sala temporal entre redes distintas. No hay retransmisión alternativa: algunas redes restrictivas no permiten conectarse. Verificá quién recibe antes de enviar.' },
      labels: ['local', 'server', 'external'], upstreamServices: ['Cloudflare STUN'],
      dataFlow: { en: 'Utilibre exchanges connection metadata. Cloudflare STUN helps discover network addresses. File contents travel over an encrypted WebRTC connection between devices, without server file storage or WebSocket file relay.', es: 'Utilibre intercambia metadatos de conexión. STUN de Cloudflare ayuda a descubrir las direcciones de red. Los archivos viajan por una conexión WebRTC cifrada entre dispositivos, sin almacenamiento de archivos ni retransmisión por WebSocket en el servidor.' },
      retention: { en: 'Connection state is temporary. Pairing information can persist in browser storage, and downloaded files remain on the receiving device. STUN-provider metadata retention is separate.', es: 'El estado de conexión es temporal. El emparejamiento puede persistir en el navegador y los archivos descargados quedan en el dispositivo receptor. La conservación de metadatos del proveedor STUN es independiente.' },
    },
    {
      id: 'uptime-kuma', providerId: 'uptime-kuma', discoveryGroup: 'feeds-monitoring', configUrlKey: 'publicStatusUrl',
      name: { en: 'Service uptime', es: 'Disponibilidad de los servicios' },
      description: { en: 'See public HTTPS checks and recent availability history for Utilibre services.', es: 'Consultá las comprobaciones HTTPS y el historial reciente de disponibilidad de Utilibre.' },
      help: { en: 'Checks run every five minutes and test HTTP responses, not every feature. This monitor is on the application VM: it cannot independently report a complete VM outage. History starts with this deployment; no uptime guarantee is offered.', es: 'Las comprobaciones ocurren cada cinco minutos y revisan respuestas HTTP, no todas las funciones. El monitor está en la VM de aplicaciones: no puede informar de manera independiente si esa VM deja de funcionar. El historial comienza con este despliegue; no hay garantía de disponibilidad.' },
      labels: ['server'], upstreamServices: ['Public Utilibre service endpoints'],
      dataFlow: { en: 'Uptime Kuma checks Utilibre endpoints and publishes availability results. Public visitors cannot access the administration interface.', es: 'Uptime Kuma consulta los servicios de Utilibre y publica los resultados. Las visitas públicas no pueden acceder a la administración.' },
      retention: { en: 'Monitor history is retained for 30 days. No visitor account is needed; connection metadata may appear in operational edge logs.', es: 'El historial se conserva durante 30 días. No necesitás una cuenta; los metadatos de conexión pueden aparecer en los registros operativos del borde.' },
    },
  ];
  return specs.map((spec, index) => ({
    ...spec, ...providerMetadata(spec.providerId), kind: 'service', implementation: 'upstream-application',
    category: 'service', featuredOrder: 12 + index, filesUploaded: false,
    temporaryStorage: spec.retention, logging, modified: false, operationalStatus: 'operational',
  }));
}

assertFossCatalogPolicy(catalog);

export const reviewedServices = catalog.filter((entry) => entry.kind === 'service' && !entry.serviceId);

function browserAdditions(): CatalogEntry[] {
  return [
    {
      ...browserTool('markmap', 'design', 5.8, 'publicMindmapUrl',
        { en: 'Turn an outline into a mind map', es: 'Convertir un esquema en un mapa mental' },
        { en: 'Write headings and lists with Markmap, then download an editable outline or SVG picture.', es: 'Escribí títulos y listas con Markmap y descargá un esquema editable o una imagen SVG.' },
        { en: 'Create a mind map', es: 'Crear un mapa mental' }, false,
        { en: 'Import Markdown or write an outline. Download Markdown for an editable backup and SVG for a picture to check in a browser. Draft saving is opt-in and local to this browser. No remote images, clickable links, executable imports, math plugins or cloud sharing. Up to 100,000 characters, 128 nesting levels and 2,000 nodes; smaller outlines work better on phones.', es: 'Importá Markdown o escribí un esquema. Descargá Markdown como copia editable y SVG como imagen para revisar en un navegador. El borrador se guarda solo si lo activás, en este navegador. Sin imágenes remotas, enlaces clicables, importaciones ejecutables, extensiones matemáticas ni nube. Hasta 100 000 caracteres, 128 niveles y 2000 nodos; en teléfonos convienen esquemas pequeños.' }),
      modified: true,
      unavailableReason: { en: 'Mind map access is temporarily disabled. Your downloaded outlines remain editable.', es: 'El acceso al mapa mental está deshabilitado por ahora. Los esquemas descargados siguen siendo editables.' },
      temporaryStorage: { en: 'The outline stays in browser memory. Optional draft saving uses this browser’s local storage, not a server.', es: 'El esquema queda en la memoria del navegador. Si activás guardar el borrador, se usa el almacenamiento local de este navegador, no un servidor.' },
      retention: { en: 'Saved drafts remain until you clear the outline, turn off draft saving or clear site data. Downloads remain wherever you save them. Browser storage is not a backup.', es: 'Los borradores permanecen hasta borrar el esquema, desactivar el guardado o borrar los datos del sitio. Las descargas quedan donde las guardés. El almacenamiento del navegador no es un respaldo.' },
    },
    browserTool('excalidraw', 'design', 5.4, 'publicWhiteboardUrl',
      { en: 'Sketch ideas on a whiteboard', es: 'Dibujar ideas en una pizarra' },
      { en: 'Sketch diagrams and notes with Excalidraw, then download an image or editable drawing.', es: 'Bocetá diagramas y notas con Excalidraw; después descargá una imagen o un dibujo editable.' },
      { en: 'Open whiteboard', es: 'Abrir pizarra' }, false,
      { en: 'Draw with shapes, arrows and text; export PNG, SVG or .excalidraw. Drawings stay in browser storage, not a Utilibre backup. Download important work and clear site data on shared devices. No live collaboration, cloud export or AI; fonts are hosted locally.', es: 'Dibujá con figuras, flechas y texto; exportá PNG, SVG o .excalidraw. Los dibujos quedan en el navegador, sin respaldo de Utilibre. Descargá el trabajo importante y borrá los datos del sitio en dispositivos compartidos. No hay colaboración en vivo, exportación a la nube ni IA; las fuentes se alojan localmente.' }),
    browserTool('svgedit', 'design', 5.5, 'publicSvgUrl',
      { en: 'Create & edit SVG vectors', es: 'Crear y editar vectores SVG' },
      { en: 'Draw scalable graphics or edit a local SVG file with SVGEdit.', es: 'Dibujá gráficas escalables o editá un archivo SVG local con SVGEdit.' },
      { en: 'Edit an SVG', es: 'Editar un SVG' }, false,
      { en: 'Open or draw an image, then save the SVG. A larger screen works best. Spanish is available; some dialogs remain in English. Decline browser storage on shared devices. Remote imports and URL-configured extensions are disabled. Component licenses supplement the MIT application license.', es: 'Abrí o dibujá una imagen y guardá el SVG. Funciona mejor en una pantalla grande. Hay español, aunque algunos diálogos siguen en inglés. Rechazá el almacenamiento local en dispositivos compartidos. Las importaciones remotas y las extensiones por URL están desactivadas. Hay licencias de componentes además de MIT.' }),
    browserTool('cyberchef', 'text-data', 5.6, 'publicCyberchefUrl',
      { en: 'Decode & transform data', es: 'Decodificar y transformar datos' },
      { en: 'Combine decoding, hashing and data transformations into reusable CyberChef recipes.', es: 'Combiná decodificación, hashes y transformaciones de datos en recetas reutilizables de CyberChef.' },
      { en: 'Open CyberChef', es: 'Abrir CyberChef' }, false,
      { en: 'Add input, choose operations and bake the recipe. English interface; a larger screen works best. HTTP, DNS, maps and RSA Verify are disabled. Security policy blocks some rich HTML outputs. Do not use this tool for security-critical cryptographic decisions. Shared recipe URLs may contain input; inspect them before sharing. Large recipes can exhaust device memory.', es: 'Agregá los datos, elegí operaciones y ejecutá la receta con «Bake». Interfaz en inglés; conviene una pantalla grande. HTTP, DNS, mapas y RSA Verify están desactivados. La política de seguridad bloquea algunos resultados HTML. No usés esta herramienta para decisiones criptográficas críticas. Las URL compartidas pueden incluir datos: revisalas antes de compartirlas. Las recetas grandes pueden agotar la memoria.' }),
    browserTool('image-scrubber', 'privacy', 5.7, 'publicScrubUrl',
      { en: 'Cover private details in photos', es: 'Tapar detalles privados en fotos' },
      { en: 'Paint over sensitive details and export a new PNG without original EXIF metadata using Image Scrubber.', es: 'Pintá sobre detalles sensibles y exportá un PNG nuevo sin los EXIF originales con Image Scrubber.' },
      { en: 'Scrub a photo', es: 'Limpiar una foto' }, false,
      { en: 'Open a JPEG, PNG, WebP or GIF up to 25 MiB and 64 megapixels. Images are resized to fit 2500 pixels; animation is not preserved. Use opaque Paint, not Blur, for sensitive details. Save and inspect the PNG; the original is unchanged. Visible context can still identify people or places: anonymity is not guaranteed. English interface; older upstream with narrow local security fixes.', es: 'Abrí un JPEG, PNG, WebP o GIF de hasta 25 MiB y 64 megapíxeles. Las imágenes se reducen a 2500 píxeles; no se conserva la animación. Usá pintura opaca («Paint»), no desenfoque («Blur»), para detalles sensibles. Guardá y revisá el PNG; el original no cambia. El contexto puede identificar personas o lugares: no garantiza anonimato. Interfaz en inglés; proyecto antiguo con correcciones locales de seguridad acotadas.' }),
    browserTool('zip-manager', 'files', 2.1, 'publicZipUrl',
      { en: 'Open & create ZIP files', es: 'Abrir y crear archivos ZIP' },
      { en: 'Browse, extract or create ZIP archives with ZIP Manager, including password-protected ZIPs.', es: 'Explorá, extraé o creá archivos ZIP con ZIP Manager, incluidos ZIP protegidos con contraseña.' },
      { en: 'Open ZIP Manager', es: 'Abrir ZIP Manager' }, false,
      { en: 'Import a ZIP or add files, then extract or export your archive. Processing happens on your device. Save important downloads; browser storage is not a backup. Large archives depend on your device’s memory and browser. This is not a RAR or 7z converter.', es: 'Importá un ZIP o agregá archivos; después extraé o exportá el archivo comprimido. El procesamiento ocurre en tu dispositivo. Guardá las descargas importantes: el navegador no es una copia de respaldo. Los archivos grandes dependen de la memoria y del navegador. No convierte RAR ni 7z.' }),
    browserTool('rawgraphs', 'text-data', 5.1, 'publicChartsUrl',
      { en: 'Create charts from data', es: 'Crear gráficas con datos' },
      { en: 'Turn CSV or pasted spreadsheet data into charts with RAWGraphs. No coding or account required.', es: 'Convertí datos CSV o copiados de una hoja de cálculo en gráficas con RAWGraphs, sin programar ni crear una cuenta.' },
      { en: 'Create a chart', es: 'Crear una gráfica' }, false,
      { en: 'Paste or open data, choose a chart, map the columns and export. The interface is in English and works best on a larger screen. Save a project to continue later. Analytics, remote data imports and executable custom-chart plugins are disabled.', es: 'Pegá o abrí los datos, elegí una gráfica, asigná las columnas y exportá el resultado. La interfaz está en inglés y funciona mejor en una pantalla grande. Guardá el proyecto para continuar después. La analítica, las importaciones remotas y los complementos de gráficas ejecutables están desactivados.' }),
    browserTool('audiomass', 'media', 5.2, 'publicAudioUrl',
      { en: 'Edit & mix audio', es: 'Editar y mezclar audio' },
      { en: 'Edit recordings, apply effects and mix audio tracks in your browser with AudioMass.', es: 'Editá grabaciones, aplicá efectos y mezclá pistas de audio en tu navegador con AudioMass.' },
      { en: 'Edit audio', es: 'Editar audio' }, false,
      { en: 'Open a recording or allow microphone access when you choose to record. Edit the waveform, then export your result. The interface is in English. Long recordings can use substantial device memory. Download your work; this is not a transcription or cloud-storage service.', es: 'Abrí una grabación o permití el micrófono cuando elijás grabar. Editá la onda de audio y exportá el resultado. La interfaz está en inglés. Las grabaciones largas pueden consumir bastante memoria. Descargá el trabajo: no es un servicio de transcripción ni de almacenamiento en la nube.' }),
    browserTool('minipaint', 'design', 5.3, 'publicPaintUrl',
      { en: 'Paint & edit with layers', es: 'Dibujar y editar con capas' },
      { en: 'Create and edit images with layers, drawing tools and filters using miniPaint.', es: 'Creá y editá imágenes con capas, herramientas de dibujo y filtros usando miniPaint.' },
      { en: 'Open miniPaint', es: 'Abrir miniPaint' }, false,
      { en: 'Open an image or start a canvas, edit it, then export. Save a project if you need to keep editable layers. Remote image search, URL imports and web fonts are disabled. Local quick saves can remain in this browser; clear site data on shared devices.', es: 'Abrí una imagen o empezá un lienzo, editalo y exportalo. Guardá un proyecto si necesitás conservar las capas editables. La búsqueda de imágenes, las importaciones por URL y las fuentes web están desactivadas. Los guardados rápidos pueden permanecer en el navegador; borrá los datos del sitio si compartís el dispositivo.' }),
  ].map((entry) => ({ ...entry, modified: true, help: {
    en: entry.help!.en + (entry.id === 'audiomass' ? ' Multitrack mixing is an upstream beta.' : entry.id === 'zip-manager' ? ' Avoid saving a default password on shared devices.' : ''),
    es: entry.help!.es + (entry.id === 'audiomass' ? ' La mezcla multipista es una función beta del proyecto original.' : entry.id === 'zip-manager' ? ' Evitá guardar una contraseña predeterminada en dispositivos compartidos.' : ''),
  } }));
}

function everydayTasks(): CatalogEntry[] {
  const tasks: { id: string; path: string; group: DiscoveryGroup; order: number; name: LocalizedText; description: LocalizedText }[] = [
    { id: 'omni-background', path: '/image-generic/remove-background', group: 'media', order: 3.1,
      name: { en: 'Remove an image background', es: 'Quitar el fondo de una imagen' },
      description: { en: 'Separate a subject from its background with OmniTools and download a transparent image. Review fine edges.', es: 'Separá el sujeto del fondo con OmniTools y descargá una imagen transparente. Revisá los bordes finos.' } },
    { id: 'omni-image-editor', path: '/image-generic/editor', group: 'media', order: 3.2,
      name: { en: 'Edit & annotate an image', es: 'Editar y anotar una imagen' },
      description: { en: 'Crop a photo, add text or draw annotations with the OmniTools image editor.', es: 'Recortá una foto, agregá texto o dibujá anotaciones con el editor de imágenes de OmniTools.' } },
    { id: 'omni-compress-image', path: '/image-generic/compress', group: 'media', order: 3.3,
      name: { en: 'Compress an image', es: 'Comprimir una imagen' },
      description: { en: 'Reduce an image’s file size with OmniTools. Compare the downloaded image with the original.', es: 'Reducí el tamaño de un archivo de imagen con OmniTools. Compará la descarga con el original.' } },
    { id: 'omni-trim-audio', path: '/audio/trim', group: 'media', order: 3.4,
      name: { en: 'Trim a recording', es: 'Recortar una grabación' },
      description: { en: 'Keep a selected part of an audio recording with OmniTools and download the shorter clip.', es: 'Conservá una parte de una grabación de audio con OmniTools y descargá el clip recortado.' } },
    { id: 'omni-csv-json', path: '/csv/csv-to-json', group: 'text-data', order: 3.5,
      name: { en: 'Convert CSV to JSON', es: 'Convertir CSV a JSON' },
      description: { en: 'Convert CSV rows into structured JSON with OmniTools. Check headers and values before using the result.', es: 'Convertí filas CSV en datos JSON con OmniTools. Revisá los encabezados y valores antes de usar el resultado.' } },
    { id: 'omni-deduplicate', path: '/string/remove-duplicate-lines', group: 'text-data', order: 3.6,
      name: { en: 'Remove duplicate lines', es: 'Quitar líneas duplicadas' },
      description: { en: 'Clean repeated lines from pasted text or a list with OmniTools.', es: 'Quitá líneas repetidas de un texto o una lista con OmniTools.' } },
  ];
  return tasks.map((task) => ({
    ...browserTool('omnitools', task.group, task.order, 'publicToolsUrl', task.name, task.description,
      { en: 'Open tool', es: 'Abrir herramienta' }, ['omni-compress-image', 'omni-trim-audio'].includes(task.id),
      { en: 'This opens the selected task directly in OmniTools. Add your input, check the result and download or copy it. Selected files are processed in your browser. Image compression and audio trimming download components from external CDNs; the background-removal model is hosted by Utilibre. Large files or models can need substantial memory. Some upstream instructions remain in English.', es: 'El enlace abre esta tarea directamente en OmniTools. Agregá los datos, revisá el resultado y descargalo o copialo. Los archivos seleccionados se procesan en tu navegador. La compresión de imágenes y el recorte de audio descargan componentes desde CDN externas; Utilibre aloja el modelo para quitar fondos. Los archivos o modelos grandes pueden necesitar bastante memoria. Algunas instrucciones del proyecto original siguen en inglés.' }),
    id: task.id, serviceId: 'omnitools', launchPath: task.path,
  }));
}
