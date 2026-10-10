import type { CatalogEntry, LocalizedText } from './catalog';
import type { Language } from '../i18n';

// Presentation of catalogue facts, not another service registry.
export const startHereIds = ['bentopdf', 'vert', 'omni-compress-image', 'pairdrop', 'qr-offline', 'pollaris', 'drawio', 'excalidraw'] as const;
export const pilotIds = new Set(['whisper-web']);
export type AccessMode = 'anonymous' | 'open-registration' | 'approved' | 'existing' | 'password';
export function accessMode(entry: CatalogEntry): AccessMode {
  if (entry.id === 'mumble') return 'password';
  if (entry.accountAccess === 'invite-required' || entry.id === 'fmd') return 'approved';
  return entry.accountAccess ? 'existing' : 'anonymous';
}
export function accessText(entry: CatalogEntry, language: Language): string {
  const es = language === 'es';
  if (entry.id === 'cryptpad') return es ? 'Podés probar sin cuenta; creá una cuenta propia para conservar y poseer el trabajo.' : 'Try as a guest; create your own account to keep and own continuing work.';
  if (entry.id === 'liberaforms') return es ? 'Crear: cuenta invitada y clave de cifrado. Responder: sin cuenta, con enlace.' : 'Create: invited account and encryption key. Respond: no account, with a form link.';
  if (entry.id === 'galene') return es ? 'Sala de hasta cuatro personas con moderación e invitación; incluye relay para redes restrictivas.' : 'Moderator-led room for up to four people, by invitation; relay fallback is available.';
  if (entry.id === 'rallly') return es ? 'Crear: cuenta aprobada. Votar: sin cuenta, con enlace.' : 'Create: approved account. Vote: no account, with a poll link.';
  if (entry.id === 'mumble') return es ? 'Necesitás un cliente de Mumble y la contraseña compartida.' : 'Requires a Mumble client and the shared password.';
  if (entry.id === 'fmd') return es ? 'Cuenta por invitación; requiere la aplicación FMD para Android.' : 'Invitation-only account; requires the FMD Android app.';
  const labels: Record<AccessMode, LocalizedText> = {
    anonymous: { en: 'No account needed', es: 'Sin cuenta' },
    'open-registration': { en: 'Create an account', es: 'Creá una cuenta' },
    approved: { en: 'Approved accounts; request access below', es: 'Cuenta aprobada; podés solicitar acceso abajo' },
    existing: { en: 'Existing accounts only; new access requests are closed', es: 'Solo cuentas existentes; no se reciben solicitudes nuevas' },
    password: { en: 'Password required', es: 'Requiere contraseña' },
  };
  return labels[accessMode(entry)][language];
}
export function accountRecoveryText(entry: CatalogEntry, language: Language): string {
  const es = language === 'es';
  if (entry.id === 'addy') return es ? 'Iniciá sesión con tu cuenta existente de addy.io; no usa OpenID de Utilibre. El registro público está cerrado. La verificación del destinatario ocurre en addy.io y es distinta de la verificación de correo de Utilibre. Conservá las credenciales de esta cuenta y escribí en privado a admin@utilibre.org si perdés el acceso.' : 'Sign in with your existing addy.io account; it does not use Utilibre OpenID. Public registration is closed. Recipient verification happens in addy.io and is separate from Utilibre email verification. Keep this account’s credentials and contact admin@utilibre.org privately if you lose access.';
  if (entry.id === 'beaverhabits') return es ? 'Solicitá al operador una cuenta propia de Beaver. Iniciá sesión con su correo y contraseña; este servicio no usa OpenID de Utilibre. El registro público y la recuperación por correo están desactivados. Si perdés el acceso, escribí en privado a admin@utilibre.org.' : 'Request a dedicated Beaver account from the operator. Sign in with its email and password; this service does not use Utilibre OpenID. Public registration and email recovery are disabled. Contact admin@utilibre.org privately if you lose access.';
  if (['calino', 'radicale'].includes(entry.id)) return es ? 'Pedí en privado un usuario y una contraseña propios de calendario. Son distintos de OpenID de Utilibre. Conectate a https://calendar.utilibre.org/dav/; si perdés la contraseña, contactá al operador. Revocarla no borra los datos ya sincronizados a dispositivos.' : 'Request a dedicated calendar username and password privately. These are separate from Utilibre OpenID. Connect to https://calendar.utilibre.org/dav/; contact the operator if the password is lost. Revoking it does not erase records already synchronized to devices.';
  if (entry.id === 'galene') return es
    ? 'Para participar, abrí la invitación del moderador. Solicitá acceso solo si necesitás organizar. No compartás la contraseña del moderador.'
    : 'To participate, open the moderator’s invitation. Request access only if you need to host. Never share the moderator password.';
  if (entry.id === 'fmd') return es
    ? 'FMD usa su propia cuenta de dispositivo. La invitación de registro no es un enlace de Utilibre login; guardá las credenciales de recuperación de FMD.'
    : 'FMD uses its own device account. Its registration invitation is separate from Utilibre login; keep your FMD recovery credentials.';
  if (entry.id === 'liberaforms') return es
    ? 'La invitación crea una cuenta propia de LiberaForms. Para responder basta el enlace del formulario. Recuperar una contraseña no reemplaza tu clave privada de cifrado: conservá su respaldo.'
    : 'The invitation creates a separate LiberaForms account. Respondents only need the form link. Password recovery cannot replace your private encryption key: keep its backup.';
  return es
    ? 'Usá el botón Utilibre u OpenID de la aplicación. Si ya tenés cuenta, no creés otra. La invitación inicial vence en 48 horas y exige verificar el correo y configurar un autenticador. Recuperar la contraseña requiere correo y autenticador; si lo perdiste, escribí a admin@utilibre.org. Cerrá sesión también en cada aplicación.'
    : 'Use the application’s Utilibre or OpenID button. If you already have an account, use it. Initial invitations expire in 48 hours and require email verification and an authenticator. Password recovery requires email and your authenticator; contact admin@utilibre.org if it is lost. Sign out of each application too.';
}
export function encryptionText(entry: CatalogEntry, language: Language): string {
  const es = language === 'es';
  if (entry.id === 'cryptpad') return es ? 'El navegador cifra documentos antes de subirlos. Los enlaces compartidos pueden incluir claves: guardalos en privado. Esto no oculta todos los metadatos ni protege frente a código alterado por un servidor comprometido.' : 'Your browser encrypts documents before upload. Shared links may contain keys: keep them private. This does not conceal all metadata or protect against altered code delivered by a compromised server.';
  if (entry.id === 'liberaforms') return es ? 'Sí, para respuestas: el despliegue exige cifrado en el navegador con las claves del creador. Las preguntas y metadatos no tienen esa protección. La clave privada y sus respaldos requieren cuidado; una contraseña de cuenta no sustituye la clave.' : 'Yes, for answers: this deployment requires browser encryption to the creator’s keys. Questions and metadata do not have that protection. Safeguard private keys and backups; an account password is not a replacement key.';
  if (entry.id === 'hatsh') return es ? 'El navegador cifra y descifra archivos localmente, sin subirlos. Conservá la contraseña o clave por separado; Utilibre no puede recuperarla. Solo compartí el archivo cifrado.' : 'Your browser encrypts and decrypts files locally without uploading them. Keep the password or key separately; Utilibre cannot recover it. Share only the encrypted output.';
  if (['privatebin', 'yopass'].includes(entry.providerId)) return es
    ? `Sí: el navegador cifra el contenido antes de subirlo y Utilibre guarda contenido cifrado. Quien tenga el enlace completo puede leerlo.${entry.providerId === 'privatebin' ? ' También necesitará la contraseña si la configuraste.' : ''} El destinatario puede conservar una copia. Dependés de que la aplicación entregue código confiable; esto no protege frente a un servidor comprometido que altere ese código.`
    : `Yes: your browser encrypts content before upload and Utilibre stores ciphertext. A complete link can grant access.${entry.providerId === 'privatebin' ? ' The password is also required if you set one.' : ''} A recipient can keep a copy. You still rely on the application delivering trustworthy code; this does not protect against a compromised server changing that code.`;
  if (entry.id === 'pairdrop') return es ? 'WebRTC cifra la transferencia entre dispositivos. El servidor de señalización recibe metadatos, no el archivo en el modo configurado. No hay TURN ni transferencia alternativa por WebSocket.' : 'WebRTC encrypts the transfer between devices. The signaling server receives metadata, not the file in the configured mode. No TURN relay or WebSocket file fallback is enabled.';
  if (entry.id === 'actual') return es ? 'El cifrado del presupuesto es opcional: activalo vos. No asumás que una cuenta o HTTPS cifran el presupuesto frente al servidor.' : 'Budget encryption is optional: enable it yourself. An account or HTTPS alone does not encrypt a budget against the server.';
  if (entry.id === 'fmd') return es ? 'La aplicación FMD cifra los datos del dispositivo antes de enviarlos; el servidor conserva datos opacos. El flujo completo en un Android real sigue pendiente.' : 'The FMD client encrypts device data before upload; the server stores opaque data. The complete real-Android workflow remains untested.';
  if (entry.labels.includes('local') && !entry.labels.includes('server')) return es ? 'No hay una subida de contenido que cifrar en el flujo local descrito. HTTPS protege la descarga de la aplicación; no convierte un QR o una imagen exportada en un archivo cifrado.' : 'There is no content upload to encrypt in the described local workflow. HTTPS protects application delivery; it does not make an exported QR or image encrypted.';
  return es ? 'No se ofrece cifrado del contenido en el navegador frente al servidor para este flujo. HTTPS protege el transporte; los operadores indicados pueden recibir las solicitudes o el contenido legible.' : 'This workflow does not offer browser-side content encryption against the server. HTTPS protects transport; the operators described can receive readable requests or content.';
}
export function privacyAnswers(entry: CatalogEntry, language: Language): Array<[string, string]> {
  const es = language === 'es';
  return [
    [es ? '¿Qué sale del dispositivo y quién lo recibe?' : 'What leaves my device, and who receives it?', entry.dataFlow[language]],
    [es ? '¿Se cifra antes de subirlo?' : 'Is it encrypted before upload?', encryptionText(entry, language)],
    [es ? '¿Qué se guarda y por cuánto tiempo?' : 'What is stored, and for how long?', [...new Set([entry.temporaryStorage[language], entry.retention[language]])].filter(Boolean).join(' ')],
    [es ? 'Conexiones y registros' : 'Connections and logs', `${entry.logging[language]} ${es ? 'La conservación exacta de los registros del borde y de terceros no se ha verificado; no prometemos su eliminación.' : 'Exact edge and third-party log retention has not been verified; we do not promise its deletion.'}`],
    ...(entry.limitation ? [[es ? 'Limitación importante' : 'Important limitation', entry.limitation[language]] as [string, string]] : []),
    [es ? 'Verificación de la tarea' : 'Task verification', verificationText(entry, language)],
  ];
}

// Evidence and commands: docs/seo-growth.md, catalogue-and-guides checkpoint.
// A successful workflow is not inferred from the operational status field.
const checkedTasks = new Set(['bentopdf', 'vert', 'drawio', 'excalidraw', 'omni-compress-image', 'omni-image-editor', 'qr-offline', 'pollaris', 'pairdrop', 'rawgraphs', 'minipaint', 'image-scrubber', 'ntfy', 'yopass', 'privatebin']);
// Dated native workflow evidence; these notes do not infer success from health status.
const october9TaskChecks: Partial<Record<string, LocalizedText>> = {
  // docs/trip-rendering-2026-10-09.md
  "trip": {
    en: "9 October 2026: Public sign-in, trip creation, desktop/mobile layout, map controls and one real map-tile view passed. Fictional accounts and their data were deleted natively. Repeated map views used fixture tiles; this was not a provider load test.",
    es: "9 de octubre de 2026: Pasaron el acceso público, la creación de un viaje, las vistas de escritorio y móvil, los controles del mapa y una vista con mosaicos reales. Las cuentas ficticias y sus datos se eliminaron con controles nativos. Las vistas repetidas usaron mosaicos de prueba; no se midió la capacidad de los proveedores.",
  },
  // docs/projects-deployment-2026-10-09.md
  "projects": {
    en: "9 October 2026: Public MFA sign-in, card editing, attachments, CSV download, account isolation and sharing revocation passed with fictional data. Desktop/mobile views passed. CSV is a partial export; deleted records may remain archived.",
    es: "9 de octubre de 2026: Se comprobaron por HTTPS público el acceso con MFA, la edición de tarjetas, los adjuntos, la descarga CSV, el aislamiento entre cuentas y la revocación del acceso compartido, con datos ficticios. Pasaron las vistas de escritorio y móvil. El CSV es parcial; pueden quedar registros eliminados en el archivo interno.",
  },
  // docs/beaverhabits-deployment-2026-10-09.md
  "beaverhabits": {
    en: "9 October 2026: Public native password login, habit creation, JSON export/import, completion records, token revocation and account deletion passed with fictional data. Desktop/mobile views passed. Image migration and CSV import were not tested.",
    es: "9 de octubre de 2026: Pasaron el acceso público con contraseña propia, la creación de hábitos, la exportación e importación JSON, los registros de cumplimiento, la revocación de tokens y la eliminación de cuentas ficticias. Pasaron las vistas de escritorio y móvil. No se probaron la migración de imágenes ni la importación CSV.",
  },
  // docs/family-chess-deployment-2026-10-09.md
  "family-chess": {
    en: "9 October 2026: Two players and a spectator used public HTTPS. Click-to-move, live updates, spectator move denial and desktop/mobile layouts passed with a fictional game. This was not a capacity or sustained-game test.",
    es: "9 de octubre de 2026: Dos jugadores y un espectador usaron HTTPS público. Pasaron los movimientos mediante clic, las actualizaciones en vivo, el rechazo de movimientos del espectador y las vistas de escritorio y móvil, con una partida ficticia. No fue una prueba de capacidad ni de partidas prolongadas.",
  },
  // docs/drawdb-deployment-2026-10-09.md
  "drawdb": {
    en: "9 October 2026: A fictional two-table schema passed public SQL export, JSON export/import, saved reload and Spanish-label checks. No external browser requests occurred in that workflow. Other SQL dialects and large schemas were not tested.",
    es: "9 de octubre de 2026: Un esquema ficticio de dos tablas pasó por HTTPS público la exportación SQL, la exportación e importación JSON, la recarga guardada y las etiquetas en español. Ese flujo no produjo solicitudes externas desde el navegador. No se probaron otros dialectos SQL ni esquemas grandes.",
  },
  // docs/bookbinder-deployment-2026-10-09.md
  "bookbinder": {
    en: "9 October 2026: An eight-page fictional PDF produced a ZIP/PDF with each page present once in the checked booklet layout. Local and public browser checks passed. Physical printing, folding and other printer settings remain untested.",
    es: "9 de octubre de 2026: Un PDF ficticio de ocho páginas produjo un ZIP/PDF con cada página presente una vez en la disposición comprobada. Pasaron las pruebas locales y públicas del navegador. Siguen sin probarse la impresión física, el plegado y otros ajustes de impresora.",
  },
  // docs/sketchforge-deployment-2026-10-09.md
  "sketchforge": {
    en: "9 October 2026: A fictional box passed native STL export, SKF export/import and saved reload through the public app. Re-export preserved the triangle count. This checks digital geometry, not physical printing or every CAD format.",
    es: "9 de octubre de 2026: Una caja ficticia pasó la exportación STL, la exportación e importación SKF y la recarga guardada en la aplicación pública. Volver a exportar conservó la cantidad de triángulos. Esto comprueba la geometría digital, no la impresión física ni todos los formatos CAD.",
  },
  // docs/moodist-deployment-2026-10-09.md
  "moodist": {
    en: "Start with one sound at low volume. Add another, adjust its level and use Pause to stop the mix. If nothing plays, check your device output and browser audio permissions.",
    es: "Empezá con un sonido a volumen bajo. Agregá otro, ajustá su nivel y usá Pause para detener la mezcla. Si no se escucha nada, revisá la salida del dispositivo y los permisos de audio del navegador.",
  },
  // docs/chartdb-deployment-2026-10-09.md
  "chartdb": {
    en: "9 October 2026: A fictional schema passed public SQL import, PostgreSQL SQL export, JSON export/import and saved reload. No external browser requests occurred. Live database metadata queries and every export dialect were not tested.",
    es: "9 de octubre de 2026: Un esquema ficticio pasó por HTTPS público la importación SQL, la exportación SQL para PostgreSQL, la exportación e importación JSON y la recarga guardada. No hubo solicitudes externas desde el navegador. No se probaron consultas a bases de datos reales ni todos los dialectos de exportación.",
  },
  // docs/moocup-deployment-2026-10-09.md
  "moocup": {
    en: "9 October 2026: A fictional screenshot passed drag/drop, PNG/JPEG/WebP export, saved reload and Reset. Desktop and simulated-mobile checks passed, including a public replay, with no outside requests. This does not cover every image format or physical phone.",
    es: "9 de octubre de 2026: Una captura ficticia pasó arrastrar y soltar, la exportación PNG/JPEG/WebP, la recarga guardada y Reset. Pasaron las vistas de escritorio y móvil simulado, incluida la repetición pública, sin solicitudes externas. Esto no cubre todos los formatos ni teléfonos reales.",
  },
  // docs/gravity-deployment-2026-10-09.md
  "gravity": {
    en: "9 October 2026: Public desktop/mobile checks covered the visible 3D scene, tour navigation, Explore/Replay and saved-language reload, without outside requests. This is an interface check, not independent validation of the physics narrative.",
    es: "9 de octubre de 2026: Las pruebas públicas de escritorio y móvil cubrieron la escena 3D visible, la navegación del recorrido, Explore/Replay y la recarga del idioma guardado, sin solicitudes externas. Es una prueba de la interfaz, no una validación independiente de su explicación de la física.",
  },
  // docs/autoredact-deployment-2026-10-09.md
  "autoredact": {
    en: "9 October 2026: Fictional image and two-page PDF checks passed locally and publicly: opaque redaction pixels, PNG/ZIP/PDF output, no exported PDF text layer, and Reset. These examples do not establish detection accuracy or complete anonymization; review every output.",
    es: "9 de octubre de 2026: Pasaron las pruebas locales y públicas con una imagen y un PDF ficticio de dos páginas: píxeles opacos en las zonas ocultas, salidas PNG/ZIP/PDF, PDF exportado sin capa de texto y Reset. Estos ejemplos no demuestran precisión de detección ni anonimización completa; revisá cada resultado.",
  },
  // docs/kokoro-web-deployment-2026-10-09.md
  "kokoro-web": {
    en: "9 October 2026: Short fictional English and Spanish text produced playable WAV files through the public app. Playback, download, profile save/reload/deletion and simulated-mobile layout passed without outside requests. This does not establish pronunciation quality or real-phone speed.",
    es: "9 de octubre de 2026: Textos ficticios breves en inglés y español produjeron WAV reproducibles en la aplicación pública. Pasaron la reproducción, descarga, guardado, recarga y eliminación de perfiles y la vista móvil simulada, sin solicitudes externas. Esto no demuestra calidad de pronunciación ni velocidad en teléfonos reales.",
  },
  // docs/knit-deployment-2026-10-09.md
  "knit": {
    en: "9 October 2026: A fictional pattern and row reopened from the complete URL in a fresh browser. Desktop and simulated-mobile navigation and reset passed without outside requests. Physical knitting and every pattern family were not tested.",
    es: "9 de octubre de 2026: Un patrón ficticio y su fila se reabrieron desde la URL completa en un navegador nuevo. Pasaron la navegación y el restablecimiento en escritorio y móvil simulado, sin solicitudes externas. No se probaron el tejido físico ni todas las familias de patrones.",
  },
  // docs/newton-deployment-2026-10-09.md
  "newton": {
    en: "9 October 2026: A fictional four-player bracket passed native creation, JSON export/import, reload and deletion in desktop/mobile views. Import preserved destination Global Settings. Large brackets, physical phones and complete match-statistics migration were not tested.",
    es: "9 de octubre de 2026: Un cuadro ficticio de cuatro participantes pasó la creación nativa, la exportación e importación JSON, la recarga y la eliminación en vistas de escritorio y móvil. La importación conservó Global Settings del destino. No se probaron cuadros grandes, teléfonos reales ni la migración completa de estadísticas.",
  },
  // docs/rustpad-deployment-2026-10-09.md
  "rustpad": {
    en: "9 October 2026: Two public browser sessions edited the same fictional pad and converged on identical text; syntax selection and Copy also passed. Expiry and restart loss were checked separately on isolated fixtures. This is not a large-room capacity test.",
    es: "9 de octubre de 2026: Dos sesiones públicas editaron el mismo texto ficticio y terminaron con contenido idéntico; también pasaron la selección de sintaxis y Copy. El vencimiento y la pérdida al reiniciar se comprobaron por separado con datos aislados. No es una prueba de capacidad para salas grandes.",
  },
  // docs/one-file-core-deployment-2026-10-09.md
  "one-file-core": {
    en: "9 October 2026: A fictional node passed native HTML save/reopen, autosave and Clear All in desktop/mobile browser checks. Encrypted-file creation was confirmed disabled. Physical-phone file handling was not tested.",
    es: "9 de octubre de 2026: Un nodo ficticio pasó el guardado y reapertura HTML, el guardado automático y Clear All en pruebas de escritorio y móvil. Se confirmó que crear archivos cifrados está desactivado. No se probó el manejo de archivos en teléfonos reales.",
  },
  // docs/tiddlywiki-deployment-2026-10-09.md
  "tiddlywiki": {
    en: "9 October 2026: A downloaded notebook passed native note creation, save/reopen and deletion followed by another save/reopen. English desktop and Spanish mobile views passed. Physical-phone file handling was not tested.",
    es: "9 de octubre de 2026: Un cuaderno descargado pasó la creación de una nota, el guardado y reapertura y la eliminación seguida de otro guardado y reapertura. Pasaron las vistas de escritorio en inglés y móvil en español. No se probó el manejo de archivos en teléfonos reales.",
  },
  // docs/chitchatter-deployment-2026-10-09.md
  "chitchatter": {
    en: "9 October 2026: Two public browser sessions exchanged text and a byte-identical fictional file; a generated microphone track attached successfully. Both sessions ran on this VM. Cross-network calls and real microphone/camera quality remain untested.",
    es: "9 de octubre de 2026: Dos sesiones públicas intercambiaron texto y un archivo ficticio idéntico byte por byte; se conectó una pista de micrófono generada. Ambas sesiones se ejecutaron en esta máquina virtual. Siguen sin probarse las llamadas entre redes y la calidad de micrófonos o cámaras reales.",
  },
  // docs/link-cleaner-deployment-2026-10-09.md
  "link-cleaner": {
    en: "9 October 2026: Fictional URLs passed public parameter removal, preservation of unrelated values, clipboard and rule-profile export/import checks. The destination URLs were never fetched. No guarantee is made that every tracking scheme is recognized.",
    es: "9 de octubre de 2026: URL ficticias pasaron las pruebas públicas de eliminación de parámetros, conservación de otros valores, portapapeles y exportación e importación de perfiles de reglas. Nunca se consultaron los destinos. No se garantiza reconocer todas las formas de rastreo.",
  },
  // docs/calendar-deployment-2026-10-09.md
  "calino": {
    en: "9 October 2026: The public browser connected to a fictional calendar/contact account and downloaded native ICS and VCF files. Earlier editing and persistence checks passed. Recurring events, attachments and every calendar client were not tested.",
    es: "9 de octubre de 2026: El navegador público se conectó a una cuenta ficticia de calendario y contactos y descargó archivos ICS y VCF nativos. También pasaron las pruebas anteriores de edición y persistencia. No se probaron eventos recurrentes, adjuntos ni todos los clientes de calendario.",
  },
  // docs/calendar-deployment-2026-10-09.md
  "radicale": {
    en: "9 October 2026: A normal client used public HTTPS to create collections, write events/contacts, export/import and delete fictional data. Anonymous and cross-account access were denied. This does not establish every phone or synchronization client.",
    es: "9 de octubre de 2026: Un cliente normal usó HTTPS público para crear colecciones, escribir eventos y contactos, exportar, importar y eliminar datos ficticios. Se rechazó el acceso anónimo y entre cuentas. Esto no comprueba todos los teléfonos ni clientes de sincronización.",
  },
  // docs/gathio-deployment-2026-10-09.md
  "gathio": {
    en: "9 October 2026: Fictional event creation, edit-token checks, image upload, ICS export/import and deletion passed. Public view/edit pages and bilingual notes were checked; an isolated restore reopened the events and image. Federation and email were not tested because they are disabled.",
    es: "9 de octubre de 2026: Pasaron la creación de eventos ficticios, los controles del enlace de edición, la subida de imagen, la exportación e importación ICS y la eliminación. Se comprobaron las páginas públicas de lectura y edición y las notas bilingües; una restauración aislada reabrió los eventos y la imagen. No se probaron federación ni correo porque están desactivados.",
  },
  // docs/13ft-deployment-2026-10-09.md
  "13ft": {
    en: "9 October 2026: The public English/Spanish forms fetched a Utilibre-owned fictional HTML page. Script blocking, oversized-response rejection and private-destination boundaries passed. Other publishers and pages requiring redirects, login or JavaScript are not covered.",
    es: "9 de octubre de 2026: Los formularios públicos en inglés y español recuperaron una página HTML ficticia de Utilibre. Pasaron el bloqueo de scripts, el rechazo de respuestas demasiado grandes y las restricciones a destinos privados. No se cubren otros editores ni páginas que requieren redirecciones, acceso con cuenta o JavaScript.",
  },
  // docs/unfurl-deployment-2026-10-09.md
  "unfurl": {
    en: "9 October 2026: Public URL parsing, Graph/Tree/Text views and clipboard passed. Isolated fixtures checked HEAD-only redirect following; private-destination rejection and an owned-site redirect passed through the deployed proxy. Sites that reject HEAD may still fail.",
    es: "9 de octubre de 2026: Pasaron el análisis público de URL, las vistas Graph/Tree/Text y el portapapeles. Pruebas aisladas comprobaron redirecciones solo mediante HEAD; el rechazo de destinos privados y una redirección propia pasaron por el proxy desplegado. Los sitios que rechazan HEAD pueden seguir fallando.",
  },
  // docs/chhoto-deployment-2026-10-09.md
  "chhoto": {
    en: "9 October 2026: Public fictional-link creation, clipboard, desktop/mobile layouts and anonymous listing/deletion denial passed. An isolated SQLite restore passed separately. These checks do not establish large-volume capacity or the safety of any destination.",
    es: "9 de octubre de 2026: Pasaron la creación pública de un enlace ficticio, el portapapeles, las vistas de escritorio y móvil y el rechazo del listado y eliminación anónimos. Una restauración SQLite aislada pasó por separado. Estas pruebas no demuestran capacidad para grandes volúmenes ni la seguridad de los destinos.",
  },
  // docs/razzia-deployment-2026-10-09.md
  "razzia": {
    en: "9 October 2026: Fictional quizzes passed manager authentication, definition JSON export/import, two-room score isolation, result display and deletion. An isolated restore reopened saved definitions and results, not active rooms.",
    es: "9 de octubre de 2026: Cuestionarios ficticios pasaron la autenticación de gestión, la exportación e importación JSON de definiciones, el aislamiento de puntuaciones entre dos salas, la vista de resultados y la eliminación. Una restauración aislada reabrió definiciones y resultados guardados, no salas activas.",
  },
  // docs/addy-deployment-2026-10-09.md
  "addy": {
    en: "To check an alias, send it a non-sensitive message and look for it in the selected inbox. Reply from that inbox and check that the original sender receives it. Delivery depends on the participating mail providers.",
    es: "Para comprobar un alias, mandale un mensaje sin información privada y buscalo en el buzón elegido. Respondé desde ese buzón y comprobá que le llegue al remitente original. La entrega depende de los proveedores de correo participantes.",
  },
  // docs/newsletters-deployment-2026-10-09.md
  "newsletters": {
    en: "9 October 2026: Native fictional feed creation/deletion and an isolated SQLite/files restore passed. The operator confirmed controlled routed receipt and outside-browser access. These checks do not establish delivery from every sender or gateway-wide mail TLS settings.",
    es: "9 de octubre de 2026: Pasaron la creación y eliminación nativas de un feed ficticio y una restauración aislada de SQLite y archivos. El operador confirmó una recepción controlada por la ruta de correo y el acceso desde un navegador externo. Estas pruebas no demuestran recepción desde cualquier remitente ni la configuración TLS completa de la pasarela de correo.",
  },
  // docs/spliit-deployment-2026-10-09.md
  "spliit": {
    en: "9 October 2026: Fictional group/expense creation, shared-link access, JSON/CSV export and expense deletion passed over public HTTPS in desktop/mobile views. An isolated restore passed separately. Outside flag-image requests were blocked by the content policy; automatic exchange rates remain unavailable.",
    es: "9 de octubre de 2026: Pasaron la creación de un grupo y gasto ficticios, el acceso mediante enlace, la exportación JSON/CSV y la eliminación del gasto por HTTPS público, en vistas de escritorio y móvil. Una restauración aislada pasó por separado. La política de contenido bloqueó las solicitudes de banderas externas; las tasas de cambio automáticas siguen sin estar disponibles.",
  },
  // docs/wishlist-deployment-2026-10-09.md
  "wishlist": {
    en: "9 October 2026: Public native sign-in, fictional group/list/item creation, private-list access denial, deletion and isolated restore passed. An isolated image/claim check also passed. Direct item deletion removed its image; group deletion left an uploaded image accessible. Atomic database/image snapshots were not tested.",
    es: "9 de octubre de 2026: Pasaron el acceso nativo público, la creación de un grupo, lista y artículo ficticios, el rechazo de acceso a listas privadas, la eliminación y una restauración aislada. También pasó una prueba aislada de imágenes y reservas. Borrar un artículo directamente eliminó su imagen; borrar el grupo dejó una imagen cargada accesible. No se probaron instantáneas atómicas de base de datos e imágenes.",
  },
  // docs/kitchenowl-deployment-2026-10-09.md
  "kitchenowl": {
    en: "9 October 2026: Public native sign-in and a fictional item/recipe JSON round trip between two households passed, with access denial, deletion and isolated backup checks. Image/expense migration and other clients were not tested.",
    es: "9 de octubre de 2026: Pasaron el acceso nativo público y la exportación e importación JSON de artículos y recetas ficticios entre dos hogares, con rechazo de acceso, eliminación y respaldo aislado. No se probaron la migración de imágenes o gastos ni otros clientes.",
  },
  // docs/opengist-deployment-2026-10-09.md
  "opengist": {
    en: "9 October 2026: Fictional snippets passed visibility checks, revision ZIP, HTTPS Git push/pull, deletion and isolated restore with history. Native MFA sign-in was also repeated over public HTTPS. These checks do not cover every Git client.",
    es: "9 de octubre de 2026: Fragmentos ficticios pasaron los controles de visibilidad, el ZIP de revisiones, push/pull por Git HTTPS, la eliminación y una restauración aislada con historial. También se repitió el acceso nativo con MFA por HTTPS público. Estas pruebas no cubren todos los clientes Git.",
  },
  // docs/linkding-deployment-2026-10-09.md
  "linkding": {
    en: "9 October 2026: Public MFA sign-in, native bookmark save with tags and notes, HTML export, deletion, import and reload passed. The imported URL, title, description, notes, tags and unread/private flags matched. Desktop/mobile views passed; an isolated restore was checked separately.",
    es: "9 de octubre de 2026: Pasaron el acceso público con MFA, el guardado nativo con etiquetas y notas, la exportación HTML, la eliminación, la importación y la recarga. Coincidieron la URL, título, descripción, notas, etiquetas e indicadores de no leído y privado. Pasaron las vistas de escritorio y móvil; la restauración aislada se comprobó por separado.",
  },
  // docs/vikunja-deployment-2026-10-09.md
  "vikunja": {
    en: "9 October 2026: Fictional project ZIP export/import and an isolated native restore reopened project copies and their attachments. Native MFA sign-in passed over public HTTPS. Other client versions and every project setting were not tested.",
    es: "9 de octubre de 2026: La exportación e importación ZIP de un proyecto ficticio y una restauración nativa aislada reabrieron copias del proyecto y sus adjuntos. El acceso nativo con MFA pasó por HTTPS público. No se probaron otras versiones de cliente ni todos los ajustes del proyecto.",
  },
  // docs/bytestash-deployment-2026-10-09.md
  "bytestash": {
    en: "9 October 2026: Public native sign-in, fictional snippet editing, recycle/restore, sharing revocation and JSON export/import passed. An isolated restore preserved exact code bytes. Other syntax modes and very large snippets were not tested.",
    es: "9 de octubre de 2026: Pasaron el acceso nativo público, la edición de fragmentos ficticios, la papelera y restauración, la revocación del acceso compartido y la exportación e importación JSON. Una restauración aislada conservó el código byte por byte. No se probaron otros modos de sintaxis ni fragmentos muy grandes.",
  },
  // docs/openresume-deployment-2026-10-09.md
  "openresume": {
    en: "9 October 2026: A fictional résumé was created over public HTTPS, downloaded as PDF and reopened in the native parser; saved browser details survived reload. No outside browser requests occurred. PDF reconstruction is approximate, not a lossless project round trip.",
    es: "9 de octubre de 2026: Se creó un currículum ficticio por HTTPS público, se descargó como PDF y se abrió en el analizador nativo; los datos guardados en el navegador sobrevivieron a la recarga. No hubo solicitudes externas desde el navegador. Reconstruir un PDF es aproximado, no una recuperación exacta del proyecto.",
  },
};
export function verificationText(entry: CatalogEntry, language: Language): string {
  const es = language === 'es';
  const datedCheck = october9TaskChecks[entry.id];
  if (datedCheck) return datedCheck[language];
  if (entry.id === 'degoog') return es ? 'El 9 de octubre de 2026 se comprobaron búsquedas web en inglés y español, libros, tecnología, miniaturas locales, ajustes guardados y el formulario sin JavaScript mediante HTTPS público. Se usaron vistas de escritorio y móvil; no demuestra cobertura de todos los temas ni disponibilidad continua de los proveedores.' : 'Public HTTPS checks on 9 October 2026 covered English and Spanish web results, books, technology, proxied thumbnails, saved settings and the no-JavaScript form. Desktop and mobile viewports were used; this does not establish coverage of every topic or continuous provider availability.';
  if (entry.id === 'mumble') return es ? 'El 9 de octubre de 2026 un equipo externo verificó el certificado, la autenticación y la devolución de un paquete de silencio de 20 ms mediante UDP cifrado, sin recurrir a TCP. La voz por TCP ya se había comprobado. No es una prueba de llamadas prolongadas ni de todas las redes.' : 'On 9 October 2026 an external runner verified the certificate, authentication and an encrypted UDP round trip with one 20 ms silence packet, without TCP fallback. TCP voice was checked previously. This is not a sustained-call or all-networks test.';
  if (entry.id === 'privatebin') return es ? 'El 9 de octubre de 2026 se creó un texto ficticio por HTTPS público, se abrió con su clave y se eliminó mediante el control nativo. La vista sin clave no reveló el texto; noindex y el cifrado se conservaron después de corregir las cabeceras HTTP. No se probaron archivos adjuntos porque están desactivados.' : 'On 9 October 2026 a fictional paste was created over public HTTPS, opened with its key and deleted through the native control. The unkeyed view did not reveal its text; noindex and encryption still worked after the HTTP header fix. Attachments were not tested because they are disabled.';
  if (entry.id === 'donetick') return es ? 'El 9 de octubre de 2026 se comprobaron el acceso público con MFA, el texto inicial en inglés y español y la eliminación de una cuenta ficticia y sus sesiones. Sus credenciales anteriores se rechazaron y la sesión de otra cuenta permaneció intacta. La restauración aislada pasó por separado.' : 'Public MFA sign-in, English and Spanish initial wording, and deletion of a fictional account and its sessions passed on 9 October 2026. Its former credentials were rejected while another account’s session remained intact. An isolated restore passed separately.';
  if (entry.id === 'penpot') return es ? 'El 9 de octubre de 2026, las imágenes instaladas pasaron una prueba aislada de exportación e importación .penpot en otra cuenta: el diseño ficticio se pudo editar y conservó el cambio al recargar. También pasaron el aislamiento y el borrado nativo. No se probaron bibliotecas, imágenes, fuentes, historial ni migración de equipos.' : 'On 9 October 2026, the installed images passed an isolated .penpot export/import into another account: the fictional design remained editable and retained a change after reload. Account isolation and native deletion also passed. Libraries, images, fonts, history and team migration were not tested.';
  if (entry.id === 'fmd') return es ? 'El 9 de octubre de 2026 pasaron el acceso público y la exportación ZIP de ubicaciones, una imagen y metadatos ficticios, con descifrado en el navegador. Se comprobaron valores CSV cero, no cero y ausentes, borrado nativo y rechazo del token anterior. El mapa usó mosaicos de prueba. No se probaron Android real ni notificaciones push.' : 'Public login and ZIP export of fictional locations, one image and metadata passed on 9 October 2026, with browser decryption. Checks covered zero, nonzero and absent CSV values, native deletion and rejection of the former token. The map used fixture tiles. Real Android and push delivery were not tested.';
  if (entry.id === 'galene') return es ? 'Cuatro sesiones externas de Chromium recibieron audio y video de las otras tres mediante relay UDP, TCP y TLS el 8 de octubre de 2026. Se comprobaron invitaciones, permisos y el límite de cuatro clientes. No se probaron teléfonos reales ni compartir pantalla.' : 'Four external Chromium sessions received audio and video from each other through UDP, TCP and TLS relay on 8 October 2026. Invitations, permissions and the four-client limit were also checked. Real phones and screen sharing remain untested.';
  if (['mapshaper', 'numbat', 'super-productivity'].includes(entry.id)) return es ? 'Importación/exportación o cálculos y persistencia, según la aplicación, comprobados en Chromium de escritorio el 8 de octubre de 2026. Datos ficticios; no demuestra compatibilidad con todos los dispositivos.' : 'Import/export or calculations and persistence, as applicable, checked in desktop Chromium on 8 October 2026 with fictional data. Not proof of compatibility with every device.';
  if (entry.id === 'cryptpad') return es ? 'Dos sesiones editaron Markdown y una hoja de cálculo; se comprobaron Undo sincronizado, importación/exportación de documentos, Kanban, calendario y vistas Markdown el 8 de octubre de 2026. Las demás funciones no están cubiertas por estas pruebas.' : 'Two sessions edited Markdown and a spreadsheet; synchronized Undo, document import/export, Kanban, calendar and Markdown previews were checked on 8 October 2026. Other features are not covered by these checks.';
  if (entry.id === 'liberaforms') return es ? 'Se comprobaron respuesta cifrada, descifrado del creador, exportación JSON, aislamiento de otra cuenta y restauración de la base de datos el 8 de octubre de 2026. Las demás funciones no están cubiertas por estas pruebas.' : 'Encrypted response, creator decryption, JSON export, second-account isolation and database restore were checked on 8 October 2026. Other features are not covered by these checks.';
  if (entry.id === 'wbo') return es ? 'Dibujo entre dos sesiones, reconexión y exportación SVG comprobados por HTTPS público en Chromium el 9 de octubre de 2026. Vista móvil simulada; no es una prueba en teléfono real ni de capacidad.' : 'Two-session drawing, reconnect and SVG export checked over public HTTPS in Chromium on 9 October 2026. Mobile viewport simulated; not a real-phone or capacity test.';
  if (entry.id === 'markmap') return es ? 'Se comprobaron importación/exportación, borradores y entradas maliciosas con datos ficticios en Chromium de escritorio, el 7 de octubre de 2026. Vista de teléfono simulada; no es una prueba en un teléfono real. La disponibilidad HTTPS pública se comprueba por separado.' : 'Import/export, drafts and hostile inputs were checked with fictional data in desktop Chromium on 7 October 2026. Phone viewport simulated, not a real-phone test. Public HTTPS availability is checked separately.';
  if (pilotIds.has(entry.id)) return es ? 'Piloto: no se ha verificado el flujo completo en un dispositivo real autorizado.' : 'Pilot: the complete workflow on an authorized real device has not been verified.';
  if (checkedTasks.has(entry.id)) return es
    ? 'Tarea representativa comprobada el 7 de octubre de 2026 con datos ficticios. Las pruebas en navegadores de escritorio no garantizan todos los formatos, teléfonos o redes.'
    : 'A representative task was checked on 7 October 2026 with fictional data. Desktop-browser checks do not establish support for every format, phone or network.';
  return es ? 'No se repitió una prueba completa de esta tarea en esta revisión. Una página accesible no demuestra que todas sus funciones estén disponibles.' : 'A complete task was not retested in this review. An accessible page does not establish that every function is available.';
}
