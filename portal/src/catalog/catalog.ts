import type { Language } from '../i18n/index.ts';
import { assertFossCatalogPolicy, reviewedFossProviders, type FossProviderId } from './upstreams.ts';

export type PrivacyLabel = 'local' | 'server' | 'proxy' | 'external';
export type CatalogCategory = 'service' | 'utility';
export type CatalogKind = 'service' | 'integration';
export type OperationalStatus = 'operational' | 'degraded' | 'unavailable' | 'maintenance' | 'not-deployed' | 'unknown';
export type DiscoveryGroup = 'find' | 'text-data' | 'feeds-monitoring';
export type AccountAccess = 'closed-registration' | 'invite-required';

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
}

const browserMemory: LocalizedText = {
  en: 'Working data exists only in this browser tab and is released when the page is reloaded or closed.',
  es: 'Los datos de trabajo existen únicamente en esta pestaña y se liberan al recargarla o cerrarla.',
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
    id: 'searxng', ...providerMetadata('searxng'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'find', featuredOrder: 1, configUrlKey: 'publicSearchUrl',
    name: { en: 'Web search', es: 'Búsqueda web' },
    description: { en: 'Search selected sources with SearXNG, hosted by Utilibre. Queries go upstream from this server instead of your browser.', es: 'Busca en fuentes seleccionadas con SearXNG, alojado por Utilibre. Las consultas salen hacia los buscadores externos desde el servidor, no desde tu navegador.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Caddy edge VM → application VM/SearXNG → selected search engines', es: 'Navegador → VM perimetral con Caddy → VM de aplicaciones/SearXNG → motores de búsqueda seleccionados' },
    upstreamServices: ['Bing', 'Google Custom Search (Blackle partner identifier)', 'Fynd', 'Wiby', 'Wikipedia', 'DuckDuckGo currency endpoint', 'Bing Images/News/Videos', 'Wikimedia Commons', 'Wikinews', 'Wiktionary', 'GitHub', 'MDN', 'Stack Overflow', 'arXiv', 'PubMed', 'Semantic Scholar', 'Reuters', 'YouTube', 'Dailymotion', 'Photon'], filesUploaded: false,
    temporaryStorage: { en: 'Short-lived limiter counters and application caches; no search-result database.', es: 'Contadores temporales del limitador y cachés de la aplicación; no hay una base de datos de resultados.' },
    retention: { en: 'Hashed limiter identifiers expire according to limiter windows; suspicious-client counters can last up to 30 days. Preferences may be stored in a first-party SearXNG cookie.', es: 'Los identificadores derivados del limitador vencen según sus ventanas; los contadores de clientes sospechosos pueden durar hasta 30 días. SearXNG puede guardar preferencias en una cookie propia.' },
    logging: { en: 'Access logging is disabled by default. Operational errors remain; exceptional abuse events may include a network address.', es: 'El registro de accesos está desactivado de forma predeterminada. Se conservan errores operativos; eventos excepcionales de abuso pueden incluir una dirección de red.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'freshrss', ...providerMetadata('freshrss'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'feeds-monitoring', featuredOrder: 2, configUrlKey: 'publicRssUrl',
    accountAccess: 'closed-registration',
    name: { en: 'RSS reader', es: 'Lector RSS' },
    description: { en: 'Read and organize RSS and Atom subscriptions with FreshRSS.', es: 'Lee y organiza suscripciones RSS y Atom con FreshRSS.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Caddy edge VM → application VM/FreshRSS; the server fetches subscribed feed URLs and stores account, subscription and reading data in PostgreSQL.', es: 'Navegador → VM perimetral con Caddy → VM de aplicaciones/FreshRSS; el servidor consulta los feeds suscritos y guarda cuentas, suscripciones y lectura en PostgreSQL.' },
    upstreamServices: ['Websites and feed hosts selected by account holders'], filesUploaded: false,
    temporaryStorage: { en: 'Feed-fetch response buffers and refresh work are temporary. Feed entries, subscriptions, preferences and read state are persistent.', es: 'Los búferes de descarga y el trabajo de actualización son temporales. Las entradas, suscripciones, preferencias y estado de lectura son persistentes.' },
    retention: { en: 'Account and feed data remain until the account holder or administrator removes them, subject to FreshRSS feed-retention settings.', es: 'Los datos de cuentas y feeds permanecen hasta que la persona titular o la administración los elimine, según la configuración de conservación de FreshRSS.' },
    logging: { en: 'Feed-refresh failures and operational errors can reach rotated logs. Requested feed URLs and errors may appear in application diagnostics; registration is closed.', es: 'Las fallas al actualizar feeds y los errores operativos pueden llegar a registros rotados. Las URL de feeds y los errores pueden aparecer en diagnósticos; el registro está cerrado.' },
    modified: false, operationalStatus: 'operational',
  },
  {
    id: 'redlib', ...providerMetadata('redlib'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'find', featuredOrder: 3, configUrlKey: 'publicRedditUrl',
    name: { en: 'Redlib for Reddit', es: 'Redlib para Reddit' },
    description: { en: 'Browse public Reddit through Redlib. A typical first visit uses a proof-of-work browser challenge; JavaScript is required, and Reddit may still block this server.', es: 'Navega contenido público de Reddit mediante Redlib. Una primera visita normal usa una prueba de trabajo en el navegador; requiere JavaScript y Reddit aún puede bloquear este servidor.' },
    labels: ['server', 'proxy'],
    dataFlow: { en: 'Browser → Cloudflare → Caddy edge VM → application VM/Anubis → Redlib → Reddit. A typical first visit must complete Anubis’s local proof-of-work challenge. Redlib proxies page data and media.', es: 'Navegador → Cloudflare → VM perimetral con Caddy → VM de aplicaciones/Anubis → Redlib → Reddit. En la primera visita, el navegador debe completar la prueba de trabajo local de Anubis. Redlib retransmite páginas y contenido multimedia.' },
    upstreamServices: ['Reddit'], filesUploaded: false,
    temporaryStorage: { en: 'Anubis keeps short-lived challenge records—including the client network address and user agent—in a small local bbolt file. Redlib presents an Android client identity to obtain and refresh a real Reddit OAuth token, kept with connection state and transient page or media buffers in process memory; its /tmp is memory-backed.', es: 'Anubis guarda registros breves del desafío —incluidos la dirección de red del cliente y el agente de usuario— en un pequeño archivo bbolt local. Redlib se presenta como un cliente de Android para obtener y renovar un token OAuth real de Reddit, que mantiene en memoria junto con el estado de conexiones y los búferes temporales de páginas o contenido; su /tmp reside en memoria.' },
    retention: { en: 'Challenge records have a 30-minute TTL; expired records are removed on later access or by hourly cleanup. Anubis sets a 30-minute verification cookie and a 24-hour authorization cookie. Both are host-only, Secure, HttpOnly, SameSite=Lax and Partitioned. Redlib has no browsing-history database; optional display preferences use a separate first-party cookie.', es: 'Los registros del desafío tienen un plazo de 30 minutos; los registros vencidos se eliminan cuando se consultan de nuevo o durante la limpieza cada hora. Anubis crea una cookie de verificación por 30 minutos y otra de autorización por 24 horas. Ambas se limitan al host y usan Secure, HttpOnly, SameSite=Lax y Partitioned. Redlib no tiene una base de datos de historial; las preferencias visuales opcionales usan otra cookie propia.' },
    logging: { en: 'Normal browsing is not intentionally logged by Redlib or Anubis. Anubis logs only warnings and errors; failures may include a host, method, path, user agent, or network address. Docker rotation is limited to 10 MB per file with three files. Edge security logging is separate.', es: 'Redlib y Anubis no registran intencionalmente la navegación normal. Anubis registra solo advertencias y errores; una falla puede incluir host, método, ruta, agente de usuario o dirección de red. Docker limita la rotación a tres archivos de 10 MB. Los registros de seguridad del borde son independientes.' },
    modified: true, operationalStatus: 'operational',
  },
  {
    id: 'privatebin', ...providerMetadata('privatebin'), kind: 'service', implementation: 'upstream-application', category: 'service', discoveryGroup: 'text-data', featuredOrder: 4, configUrlKey: 'publicPasteUrl',
    name: { en: 'Encrypted paste', es: 'Texto cifrado' },
    description: { en: 'Share short-lived encrypted text with PrivateBin. Encryption happens in the browser; the decryption key stays in the URL fragment and does not reach the server.', es: 'Comparte texto cifrado que caduca con PrivateBin. El cifrado ocurre en el navegador; la clave de descifrado queda en el fragmento de la URL y no llega al servidor.' },
    labels: ['local', 'server'],
    dataFlow: { en: 'The browser encrypts text, then sends ciphertext through the edge to PrivateBin. The decryption key remains after # in the URL and is not included in the HTTP request.', es: 'El navegador cifra el texto y envía el contenido cifrado mediante el borde a PrivateBin. La clave queda después de # en la URL y no se incluye en la solicitud HTTP.' },
    upstreamServices: [], filesUploaded: false,
    temporaryStorage: { en: 'Plaintext and keys exist in browser memory. The server persists only encrypted payloads and associated metadata in filesystem storage; file uploads are disabled.', es: 'El texto sin cifrar y las claves existen en la memoria del navegador. El servidor conserva solo contenido cifrado y metadatos asociados en el sistema de archivos; las cargas de archivos están desactivadas.' },
    retention: { en: 'The default expiry is one day; choices range from five minutes to one week. Burn-after-reading can remove a paste sooner, and automatic purge is enabled.', es: 'El vencimiento predeterminado es un día; las opciones van de cinco minutos a una semana. Leer y destruir puede eliminar el texto antes, y la purga automática está habilitada.' },
    logging: { en: 'The application does not receive the decryption key or plaintext. Rotated web-server and edge logs may contain paste identifiers and request metadata, but should not include URL fragments.', es: 'La aplicación no recibe la clave ni el texto sin cifrar. Los registros rotados del servidor web y del borde pueden contener identificadores y metadatos de solicitud, pero no deben incluir fragmentos de URL.' },
    modified: false, operationalStatus: 'operational',
  },
  {
    id: 'private-router', ...providerMetadata('redlib'), kind: 'integration', implementation: 'integration-glue', portalSurface: 'integration-glue', category: 'utility', discoveryGroup: 'find',
    name: { en: 'Open a Reddit link through Redlib', es: 'Abrir un enlace de Reddit con Redlib' },
    description: { en: 'Check a public Reddit URL, then open the matching path in this Redlib instance.', es: 'Comprueba una URL pública de Reddit y abre la ruta correspondiente en esta instancia de Redlib.' },
    slug: { en: 'tools/open-privately', es: 'herramientas/abrir-con-privacidad' },
    labels: ['local', 'server', 'proxy'],
    dataFlow: { en: 'The pasted URL is parsed only in the browser. If you choose Continue, the browser opens the fixed Redlib instance, which contacts Reddit.', es: 'La URL pegada se analiza solo en el navegador. Si eliges Continuar, el navegador abre la instancia fija de Redlib, que se comunica con Reddit.' },
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

export function catalogEntry(id: string): CatalogEntry | undefined {
  return catalog.find((entry) => entry.id === id);
}

assertFossCatalogPolicy(catalog);

export const reviewedServices = catalog.filter((entry) => entry.kind === 'service');
