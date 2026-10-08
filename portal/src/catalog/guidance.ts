import type { CatalogEntry, LocalizedText } from './catalog';
import type { Language } from '../i18n';

// Presentation of catalogue facts, not another service registry.
export const startHereIds = ['bentopdf', 'vert', 'omni-compress-image', 'pairdrop', 'qr-offline', 'pollaris', 'drawio', 'excalidraw'] as const;
export const pilotIds = new Set(['fmd', 'whisper-web', 'galene']);
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
  if (entry.id === 'galene') return es ? 'Piloto con moderación e invitación; conexión entre redes externas pendiente.' : 'Moderator-led invited pilot; external-network connection still pending.';
  if (entry.id === 'rallly') return es ? 'Crear: cuenta aprobada. Votar: sin cuenta, con enlace.' : 'Create: approved account. Vote: no account, with a poll link.';
  if (entry.id === 'mumble') return es ? 'Necesitás un cliente de Mumble y la contraseña compartida.' : 'Requires a Mumble client and the shared password.';
  if (entry.id === 'fmd') return es ? 'Piloto por invitación; requiere la aplicación Android. Prueba en dispositivo pendiente.' : 'Invited pilot; Android app required. Real-device testing pending.';
  const labels: Record<AccessMode, LocalizedText> = {
    anonymous: { en: 'No account needed', es: 'Sin cuenta' },
    'open-registration': { en: 'Create an account', es: 'Creá una cuenta' },
    approved: { en: 'Approved accounts; request access below', es: 'Cuenta aprobada; podés solicitar acceso abajo' },
    existing: { en: 'Existing accounts only; new access requests are closed', es: 'Solo cuentas existentes; no se reciben solicitudes nuevas' },
    password: { en: 'Password required', es: 'Requiere contraseña' },
  };
  return labels[accessMode(entry)][language];
}
const choices: Record<string, LocalizedText> = {
  wbo: { en: 'Temporary, server-readable group sketches—not private storage. Export SVG regularly.', es: 'Bocetos grupales temporales que el servidor puede leer, no almacenamiento privado. Exportá SVG con frecuencia.' },
  bentopdf: { en: 'Check OCR names, accents and numbers against the original. A searchable PDF is not an editable Word layout.', es: 'Compará nombres, tildes y números del OCR con el original. Un PDF con texto seleccionable no es un documento Word editable.' },
  vert: { en: 'Remote video conversion is disabled. After choosing files, use the Convert tab if the page stays on Upload. Processing components can take time to download.', es: 'La conversión remota de video está deshabilitada. Si después de elegir archivos seguís en Upload, abrí Convert. Los componentes pueden tardar en descargarse.' },
  pairdrop: { en: 'Both devices must stay online. Restricted networks may not connect: no relay fallback is configured.', es: 'Ambos dispositivos deben seguir conectados. Las redes restrictivas pueden impedir la transferencia: no hay relay alternativo.' },
  searxng: { en: 'Start here for general web search. Utilibre sends your query to selected search engines.', es: 'Empezá acá para buscar en la web. Utilibre envía tu consulta a motores seleccionados.' },
  fourget: { en: 'An alternative when you want to choose the search provider yourself. English interface.', es: 'Una alternativa si querés elegir el proveedor de búsqueda. Interfaz en inglés.' },
  degoog: { en: 'A narrower alternative using Mwmbl, Open Library and Hacker News; not the same coverage as general web search.', es: 'Una alternativa con Mwmbl, Open Library y Hacker News; no cubre lo mismo que una búsqueda web general.' },
  'qr-offline': { en: 'Start here for a straightforward QR with PNG, SVG or PDF download.', es: 'Empezá acá para crear un QR sencillo y descargar PNG, SVG o PDF.' },
  miniqr: { en: 'Choose Mini QR for visual customization or reading a QR from an image. Test decorated codes before sharing.', es: 'Elegí Mini QR para personalizar el diseño o leer un QR desde una imagen. Probá los códigos decorados antes de compartirlos.' },
  pollaris: { en: 'Start here to organize a poll without registering. Keep the management link private.', es: 'Empezá acá para organizar una encuesta sin registrarte. Guardá el enlace de administración en privado.' },
  rallly: { en: 'An alternative for approved organizers. Guests can vote through a participant link.', es: 'Una alternativa para organizadores con cuenta aprobada. Los invitados pueden votar con el enlace de participación.' },
  drawio: { en: 'Use for structured flowcharts and diagrams. Save a local copy; cloud collaboration is disabled.', es: 'Usalo para diagramas estructurados y de flujo. Guardá una copia local; no hay colaboración en la nube.' },
  excalidraw: { en: 'Use for quick sketches and explaining an idea. This instance has no live collaboration.', es: 'Usalo para bocetar y explicar una idea. Esta instancia no tiene colaboración en vivo.' },
  'omni-image-editor': { en: 'Quick raster edits and annotations. For editable layers, choose miniPaint; for vectors, SVGEdit.', es: 'Edición rápida de imágenes y anotaciones. Para capas editables, elegí miniPaint; para vectores, SVGEdit.' },
  minipaint: { en: 'Choose for layered raster editing. Save a project to preserve editable layers as well as exporting an image.', es: 'Elegilo para editar imágenes por capas. Guardá un proyecto para conservar las capas, además de exportar la imagen.' },
  svgedit: { en: 'Choose for scalable SVG vectors, not photo retouching. A larger screen helps.', es: 'Elegilo para vectores SVG escalables, no para retocar fotos. Conviene una pantalla grande.' },
  'image-scrubber': { en: 'Use opaque paint, then inspect the downloaded PNG. Covering details does not guarantee anonymity.', es: 'Usá pintura opaca y revisá el PNG descargado. Tapar detalles no garantiza anonimato.' },
};
export function choiceNote(entry: CatalogEntry, language: Language): string | undefined { return choices[entry.id]?.[language]; }
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
    [es ? '¿Qué se guarda y por cuánto tiempo?' : 'What is stored, and for how long?', `${entry.temporaryStorage[language]} ${entry.retention[language]}`],
    [es ? 'Conexiones y registros' : 'Connections and logs', `${entry.logging[language]} ${es ? 'La conservación exacta de los registros del borde y de terceros no se ha verificado; no prometemos su eliminación.' : 'Exact edge and third-party log retention has not been verified; we do not promise its deletion.'}`],
    [es ? 'Límite importante' : 'Important limitation', choiceNote(entry, language) || entry.help?.[language] || entry.description[language]],
    [es ? 'Verificación de la tarea' : 'Task verification', verificationText(entry, language)],
  ];
}

// Evidence and commands: docs/seo-growth.md, catalogue-and-guides checkpoint.
// A successful workflow is not inferred from the operational status field.
const checkedTasks = new Set(['bentopdf', 'vert', 'drawio', 'excalidraw', 'omni-compress-image', 'omni-image-editor', 'qr-offline', 'pollaris', 'pairdrop', 'rawgraphs', 'minipaint', 'image-scrubber', 'ntfy', 'yopass', 'privatebin']);
export function verificationText(entry: CatalogEntry, language: Language): string {
  const es = language === 'es';
  if (['mapshaper', 'numbat', 'super-productivity'].includes(entry.id)) return es ? 'Importación/exportación o cálculos y persistencia, según la aplicación, comprobados en Chromium de escritorio el 8 de octubre de 2026. Datos ficticios; no demuestra compatibilidad con todos los dispositivos.' : 'Import/export or calculations and persistence, as applicable, checked in desktop Chromium on 8 October 2026 with fictional data. Not proof of compatibility with every device.';
  if (entry.id === 'cryptpad') return es ? 'Dos sesiones editaron Markdown y una hoja de cálculo; se comprobaron Undo sincronizado, importación/exportación de documentos, Kanban, calendario y vistas Markdown el 8 de octubre de 2026. La verificación de la suite completa sigue en curso.' : 'Two sessions edited Markdown and a spreadsheet; synchronized Undo, document import/export, Kanban, calendar and Markdown previews were checked on 8 October 2026. Whole-suite verification is still in progress.';
  if (entry.id === 'liberaforms') return es ? 'Se comprobaron respuesta cifrada, descifrado del creador, exportación JSON, aislamiento de otra cuenta y restauración de la base de datos el 8 de octubre de 2026. La auditoría de todas las funciones sigue en curso.' : 'Encrypted response, creator decryption, JSON export, second-account isolation and database restore were checked on 8 October 2026. Review of all features is still in progress.';
  if (entry.id === 'wbo') return es ? 'Dibujo entre dos sesiones, reconexión y exportación SVG comprobados por HTTPS público en Chromium el 7 de octubre de 2026. Vista móvil simulada; no es una prueba en teléfono real ni de capacidad.' : 'Two-session drawing, reconnect and SVG export checked over public HTTPS in Chromium on 7 October 2026. Mobile viewport simulated; not a real-phone or capacity test.';
  if (entry.id === 'markmap') return es ? 'Se comprobaron importación/exportación, borradores y entradas maliciosas con datos ficticios en Chromium de escritorio, el 7 de octubre de 2026. Vista de teléfono simulada; no es una prueba en un teléfono real. La disponibilidad HTTPS pública se comprueba por separado.' : 'Import/export, drafts and hostile inputs were checked with fictional data in desktop Chromium on 7 October 2026. Phone viewport simulated, not a real-phone test. Public HTTPS availability is checked separately.';
  if (pilotIds.has(entry.id)) return es ? 'Piloto: no se ha verificado el flujo completo en un dispositivo real autorizado.' : 'Pilot: the complete workflow on an authorized real device has not been verified.';
  if (checkedTasks.has(entry.id)) return es
    ? 'Tarea representativa comprobada el 7 de octubre de 2026 con datos ficticios. Las pruebas en navegadores de escritorio no garantizan todos los formatos, teléfonos o redes.'
    : 'A representative task was checked on 7 October 2026 with fictional data. Desktop-browser checks do not establish support for every format, phone or network.';
  return es ? 'No se repitió una prueba completa de esta tarea en esta revisión. Una página accesible no demuestra que todas sus funciones estén disponibles.' : 'A complete task was not retested in this review. An accessible page does not establish that every function is available.';
}
