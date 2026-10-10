import type { CatalogEntry } from './catalog.ts';
import { reviewedFossProviders } from './upstreams.ts';
const provider = reviewedFossProviders.beaverhabits;
export const beaverhabitsAdditions: CatalogEntry[] = [{
  "id": "beaverhabits",
  "providerId": "beaverhabits",
  "kind": "service",
  "accountAccess": "invite-required",
  "implementation": "upstream-application",
  "portalSurface": "upstream-interface",
  "category": "service",
  "discoveryGroup": "planning",
  "configUrlKey": "publicBeaverHabitsUrl",
  "name": {
    "en": "Habit tracker · Beaver",
    "es": "Registro de hábitos · Beaver"
  },
  "description": {
    "en": "Keep your own habit list and completion notes, then download active habits as JSON.",
    "es": "Llevá tu propia lista de hábitos y notas de finalización, y descargá los hábitos activos en JSON."
  },
  "bestFor": {
    "en": "A personal record of routines you choose to track.",
    "es": "Un registro personal de las rutinas que vos elijás seguir."
  },
  "help": {
    "en": "Use a separately provisioned native account; public registration and trusted-header sign-in are disabled. The English interface includes Export JSON and JSON import. This is personal habit storage, not visitor analytics or a public leaderboard.",
    "es": "Usá una cuenta nativa habilitada por separado; el registro público y el acceso mediante cabeceras de confianza están desactivados. La interfaz en inglés incluye Export JSON e importación JSON. La aplicación guarda tus hábitos personales; no son estadísticas de visitantes ni una clasificación pública."
  },
  "limitation": {
    "en": "Accounts need operator provisioning; existing Utilibre sign-in is not integrated. Email password recovery and Telegram backup are unavailable. The UI export includes active habits, not archived habits, account settings or attached note-image files.",
    "es": "Las cuentas requieren habilitación por parte del operador; no se integra el inicio de sesión existente de Utilibre. No hay recuperación de contraseña por correo ni respaldo en Telegram. La exportación de la interfaz incluye hábitos activos, no los archivados, ajustes de cuenta ni archivos de imágenes adjuntas a las notas."
  },
  "dataFlow": {
    "en": "Account details, habit names, completion records, notes and attached images are readable on Utilibre’s server. They are not end-to-end encrypted. Habit records are stored for the function you request, not used for visitor analytics, advertising or cross-service profiling. Native analytics, error-reporting providers, Google sign-in and Telegram integration are disabled; app resources are local.",
    "es": "Los datos de cuenta, nombres de hábitos, registros de finalización, notas e imágenes adjuntas son legibles en el servidor de Utilibre. No tienen cifrado de extremo a extremo. Los hábitos se guardan para la función que solicitás; no se usan para estadísticas de visitantes, anuncios ni perfiles entre servicios. Están desactivados las estadísticas nativas, los proveedores de informes de errores, el acceso con Google y Telegram; los recursos de la aplicación son locales."
  },
  "temporaryStorage": {
    "en": "Habits, settings and note images are stored in SQLite. Native session state is also retained on the server, and the browser keeps a session cookie. Closing the tab does not delete the account or saved work.",
    "es": "Los hábitos, ajustes e imágenes de notas se guardan en SQLite. El servidor también conserva estado de sesión nativo y el navegador guarda una cookie de sesión. Cerrar la pestaña no elimina la cuenta ni el trabajo guardado."
  },
  "retention": {
    "en": "No automatic habit expiry is configured. Native account deletion removes its habit list, settings and note images; revoke any API token first. Session files, operational records, independent downloads and retained backups are separate. Daily private backups stay on this VM without automatic pruning.",
    "es": "No se configura una caducidad automática de hábitos. El borrado nativo de la cuenta elimina su lista de hábitos, ajustes e imágenes de notas; revocá primero cualquier token de API. Los archivos de sesión, registros operativos, descargas independientes y respaldos conservados son aparte. Los respaldos privados diarios permanecen en esta VM sin purga automática."
  },
  "launchLabel": {
    "en": "Open tool",
    "es": "Abrir herramienta"
  },
  "labels": [
    "server"
  ],
  "filesUploaded": true,
  "upstreamServices": [
    "Cloudflare HTTPS proxy",
    "Hetzner hosting"
  ],
  "logging": {
    "en": "Local gateway access logging is disabled; application warning/error and system/security logs remain. Docker logs rotate at 1 MiB per file, two files per container. This is size rotation, not a time-based deletion guarantee. Public-edge and hosting retention are separate.",
    "es": "El registro de acceso del intermediario local está desactivado; permanecen los avisos y errores de la aplicación y los registros del sistema y seguridad. Docker rota a 1 MiB por archivo, dos archivos por contenedor. Es rotación por tamaño, no una garantía de borrado por plazo. La conservación del acceso público y del alojamiento es aparte."
  },
  "modified": true,
  "operationalStatus": "operational"
,
  license: provider.license, upstreamProject: provider.project, upstreamSourceUrl: provider.sourceUrl, installedVersion: provider.installedVersion
}];
