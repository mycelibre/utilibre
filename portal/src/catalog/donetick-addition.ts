import type { CatalogEntry } from './catalog.ts';
import { reviewedFossProviders } from './upstreams.ts';
const provider = reviewedFossProviders.donetick;
export const donetickAdditions: CatalogEntry[] = [{
  "id": "donetick",
  "providerId": "donetick",
  "kind": "service",
  "accountAccess": "invite-required",
  "implementation": "upstream-application",
  "portalSurface": "upstream-interface",
  "category": "service",
  "discoveryGroup": "planning",
  "configUrlKey": "publicDonetickUrl",
  "name": {
    "en": "Shared chores · Donetick",
    "es": "Tareas compartidas · Donetick"
  },
  "description": {
    "en": "Plan recurring household chores, record completions and share them through approved circle membership.",
    "es": "Organizá tareas recurrentes del hogar, registrá cuándo las completás y compartilas mediante círculos con membresía aprobada."
  },
  "bestFor": {
    "en": "Recurring tasks for a household or another small group.",
    "es": "Tareas recurrentes de un hogar u otro grupo pequeño."
  },
  "help": {
    "en": "Sign in with an approved Utilibre account. Each new account starts in a separate circle. A join code requests membership; the circle administrator must accept it. Review members before sharing chores.",
    "es": "Iniciá sesión con una cuenta aprobada de Utilibre. Cada cuenta nueva empieza en un círculo separado. Un código solicita membresía; la administración del círculo debe aceptarla. Revisá quiénes participan antes de compartir tareas."
  },
  "limitation": {
    "en": "No general user export/import is implemented in this release. Attachments: 5 MiB each and 50 MiB per circle. Signed file links work for anyone holding them for up to seven days; profile images are public by known path. External notifications and voice recognition are unavailable.",
    "es": "Esta versión no implementa una exportación/importación general para usuarios. Adjuntos: 5 MiB por archivo y 50 MiB por círculo. Los enlaces firmados permiten acceso a cualquiera que los tenga hasta por siete días; las imágenes de perfil son públicas si se conoce su ruta. No hay notificaciones externas ni reconocimiento de voz."
  },
  "dataFlow": {
    "en": "The server processes readable chores, descriptions, completion records, circle membership and attachments. This is not end-to-end encryption. Approved sign-in uses the existing Utilibre identity service; application assets are local, and visitor analytics, telemetry, cloud storage and external notification integrations are disabled.",
    "es": "El servidor procesa tareas, descripciones, registros de finalización, membresías y adjuntos legibles. No hay cifrado de extremo a extremo. El inicio de sesión aprobado usa el servicio de identidad existente de Utilibre; los recursos de la aplicación son locales y están desactivadas las estadísticas de visitantes, la telemetría, el almacenamiento en la nube y las integraciones de notificaciones externas."
  },
  "temporaryStorage": {
    "en": "SQLite and local files retain account and chore data. Browser storage retains the sign-in token after closing a tab. Static files have one-hour caching; signed attachments use private ten-minute browser caching.",
    "es": "SQLite y los archivos locales conservan los datos de cuentas y tareas. El navegador conserva el token de sesión después de cerrar una pestaña. Los archivos estáticos tienen una caché de una hora; los adjuntos firmados usan una caché privada de diez minutos en el navegador."
  },
  "retention": {
    "en": "No automatic chore expiry is configured. Native account deletion removes owned data subject to shared-circle rules, but circle metadata and other members’ records can remain. Independent copies and backups are separate. Daily private backups stay on this VM without automatic pruning; deleting live records does not erase those backups.",
    "es": "No se configura una caducidad automática de tareas. El borrado nativo de la cuenta elimina datos propios según las reglas del círculo compartido, pero pueden quedar metadatos del círculo y registros de otras personas. Las copias independientes y los respaldos son aparte. Los respaldos privados diarios permanecen en esta VM sin purga automática; borrar registros activos no elimina esos respaldos."
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
    "Utilibre identity service",
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
