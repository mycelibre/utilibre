import type { PracticalGuide } from './practical-guide-data.ts';

export const calendarGuides: PracticalGuide[] = [{
  id: 'calendar-contacts', paths: { en: 'guides/calendar-contacts', es: 'guias/calendario-contactos' },
  tools: [
    { id: 'calino', label: { en: 'Open the calendar in Calino', es: 'Abrir el calendario en Calino' } },
    { id: 'radicale', label: { en: 'Manage server collections in Radicale', es: 'Gestionar colecciones en Radicale' } },
  ], samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Keep a calendar and contacts, then export them',
      intro: "Keep appointments and contacts in sync, then save independent copies. Calino is the browser calendar; Radicale stores the synchronized collections, which compatible CalDAV/CardDAV clients can also use.",
      prerequisites: 'Request a dedicated calendar username and password through Utilibre’s private contact. These credentials are separate from Utilibre OpenID. Use a trusted device: Calino’s ordinary saved-password protection is reversible obfuscation, not strong encryption. Keep an independent copy of important records.',
      steps: [
        'Open Calino and choose Connect CalDAV account. Enter https://calendar.utilibre.org/dav/ as the server URL, then your dedicated calendar username and password. Choose Connect. Do not use an upstream convenience proxy.',
        'Wait for synchronization and confirm that your calendars appear. Open Contacts and wait for the address books and contacts to load too. For another client, use the same server URL and dedicated credentials; menu names depend on that client.',
        'To save loaded calendar events, open Settings → Data → Export Calendar, choose all calendars or a specific calendar, and choose Export .ics. For contacts, choose Export .vcf after contact synchronization finishes. These exports contain the records loaded by this browser; do not assume they include every historical server record.',
        'For a complete calendar or address-book collection, open Radicale’s native collection interface, sign in with the same dedicated credentials and download that collection. A compatible client can import the resulting iCalendar (.ics) or vCard (.vcf) file. Check a separate destination before replacing any working collection.',
        'Keep the files private. Calendar/contact formats do not back up passwords, account settings, ownership, permissions or external attachment files. Calino’s device reset removes browser state; it does not delete synchronized collections on the server.',
        'To remove server content, use the native collection deletion control in Radicale or the relevant server deletion action in Calino. Delete Local Events affects only the device; Delete All Events From a Calendar affects the selected server calendar after confirmation. Ask privately to revoke the calendar account and agree which collections to remove.',
      ],
      success: 'Fictional calendar and contact exports downloaded through Calino. A non-browser client created, exported and imported disposable Radicale collections through the public endpoint; anonymous and cross-account reads were rejected. An isolated snapshot passed native storage verification and preserved the resource bytes.',
      troubleshooting: 'Open Contacts and wait for synchronization if Export .vcf reports no contacts. Large records can exceed the configured 1 MiB per-resource or 10 MiB request limits. Browser tests and protocol checks do not establish compatibility with every phone, Thunderbird or DAVx5 version. Report the client and error privately without sending your password or calendar contents.',
      privacy: 'Synchronized records travel through Cloudflare/Caddy and are readable by Radicale on Utilibre. This is not end-to-end encryption. Browser records and saved credentials can persist after tab closure; downloads remain until deleted. Other devices retain synchronized copies. Daily backups remain on the same VM without automatic expiry, so deleting active data does not immediately erase older snapshots. Separate edge/provider retention remains unverified.',
      next: 'Keep an independent collection export and test it in a separate destination. Revoking a password blocks later server access but cannot erase records already copied to devices.',
    },
    es: {
      title: 'Guardá un calendario y contactos, y exportalos',
      intro: "Sincronizá citas y contactos y guardá copias independientes. Calino es el calendario del navegador; Radicale guarda las colecciones sincronizadas, que también podés usar desde clientes compatibles con CalDAV/CardDAV.",
      prerequisites: 'Pedí un usuario y una contraseña propios de calendario por el contacto privado de Utilibre. Son credenciales distintas de OpenID. Usá un dispositivo confiable: la protección habitual de la contraseña guardada en Calino es ofuscación reversible, no cifrado fuerte. Conservá una copia independiente de los registros importantes.',
      steps: [
        'Abrí Calino y elegí Connect CalDAV account. Ingresá https://calendar.utilibre.org/dav/ como URL del servidor, y después tu usuario y contraseña propios de calendario. Elegí Connect. No usés el proxy de conveniencia del proyecto original.',
        'Esperá la sincronización y comprobá que aparezcan tus calendarios. Abrí Contacts y esperá también las libretas y los contactos. En otro cliente, usá la misma URL y las credenciales propias; los nombres de menús dependen de ese cliente.',
        'Para guardar los eventos cargados, abrí Settings → Data → Export Calendar, elegí todos los calendarios o uno y pulsá Export .ics. Para contactos, elegí Export .vcf después de sincronizarlos. Estas exportaciones contienen los registros cargados en este navegador; no asumás que incluyen todo el historial del servidor.',
        'Para conservar una colección completa, abrí la interfaz nativa de colecciones de Radicale, iniciá sesión con las mismas credenciales y descargá el calendario o la libreta. Un cliente compatible puede importar iCalendar (.ics) o vCard (.vcf). Comprobá otro destino antes de reemplazar una colección de trabajo.',
        'Guardá los archivos en privado. Esos formatos no respaldan contraseñas, ajustes de cuenta, propiedad, permisos ni adjuntos externos. Restablecer Calino en el dispositivo quita los datos del navegador; no borra las colecciones sincronizadas del servidor.',
        'Para quitar contenido del servidor, usá el borrado nativo de colecciones en Radicale o la acción correspondiente de Calino. Delete Local Events afecta solo al dispositivo; Delete All Events From a Calendar afecta al calendario seleccionado del servidor después de confirmar. Pedí en privado revocar la cuenta de calendario y acordá qué colecciones borrar.',
      ],
      success: 'Se descargaron exportaciones ficticias de calendario y contactos desde Calino. Un cliente sin navegador creó, exportó e importó colecciones descartables por el endpoint público; se rechazaron lecturas anónimas y desde otra cuenta. Un respaldo aislado pasó la verificación nativa y conservó los bytes de los archivos.',
      troubleshooting: 'Abrí Contacts y esperá la sincronización si Export .vcf indica que no hay contactos. Los registros grandes pueden superar 1 MiB por recurso o 10 MiB por solicitud. Las pruebas de navegador y protocolo no establecen compatibilidad con todos los teléfonos ni versiones de Thunderbird o DAVx5. Reportá el cliente y el error en privado, sin mandar la contraseña ni el contenido del calendario.',
      privacy: 'Los registros sincronizados pasan por Cloudflare/Caddy y Radicale puede leerlos en Utilibre. No hay cifrado de extremo a extremo. Los datos y las credenciales guardadas pueden persistir en el navegador al cerrar la pestaña; las descargas quedan hasta que las eliminés. Otros dispositivos conservan sus copias. Los respaldos diarios quedan en la misma máquina virtual sin vencimiento automático: borrar datos activos no elimina de inmediato las copias anteriores. La conservación del borde y los proveedores sigue sin verificarse.',
      next: 'Conservá una exportación independiente y probala en otro destino. Revocar la contraseña impide nuevos accesos al servidor, pero no borra los registros copiados a dispositivos.',
    },
  },
}];
