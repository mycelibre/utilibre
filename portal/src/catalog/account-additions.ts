import type { CatalogEntry, LocalizedText } from './catalog.ts';
import { reviewedFossProviders, type FossProviderId } from './upstreams.ts';

const text = (en: string, es: string): LocalizedText => ({ en, es });
const backups = text('Daily backups remain on the same VM with no configured automatic expiry; deleted records can remain in earlier snapshots. Keep an independent export. Browser data and downloaded copies have separate lifetimes.', 'Los respaldos diarios quedan en la misma máquina virtual sin vencimiento automático configurado; las copias anteriores pueden conservar registros eliminados. Guardá una exportación independiente. Los datos del navegador y las descargas tienen su propia duración.');
function service(id: FossProviderId, configUrlKey: string, logMiB: number): CatalogEntry {
  const p = reviewedFossProviders[id];
  return {
    id, providerId: id, kind: 'service', implementation: 'upstream-application', portalSurface: 'upstream-interface',
    category: 'service', discoveryGroup: 'planning', configUrlKey, accountAccess: 'invite-required',
    name: text(p.project, p.project), description: text('', ''), labels: ['server'], filesUploaded: false,
    dataFlow: text('Your browser connects through Cloudflare and Caddy to Utilibre. The application stores readable account and service data; this is not end-to-end encrypted storage. Native sign-in uses your approved Utilibre account.', 'Tu navegador se conecta a Utilibre a través de Cloudflare y Caddy. La aplicación guarda datos legibles de cuenta y del servicio; no es almacenamiento cifrado de extremo a extremo. El inicio de sesión nativo usa tu cuenta aprobada de Utilibre.'),
    upstreamServices: ['Utilibre identity', 'Cloudflare HTTPS proxy', 'Hetzner hosting'],
    temporaryStorage: text('The application stores account and service records on Utilibre. Browser preferences and login state can persist after the tab closes.', 'La aplicación guarda los registros de cuenta y del servicio en Utilibre. Las preferencias y la sesión pueden persistir en el navegador al cerrar la pestaña.'),
    retention: backups,
    logging: text(`Gateway access logs are disabled. Application and container diagnostics can identify requests or operations; logs rotate by size, up to two ${logMiB} MiB files per container. This is not a retention period in days. Edge and provider retention remain separate and unverified.`, `Los registros de acceso del intermediario están desactivados. Los diagnósticos de la aplicación y los contenedores pueden identificar solicitudes u operaciones; rotan por tamaño, hasta dos archivos de ${logMiB} MiB por contenedor. No es un plazo en días. La conservación del borde y los proveedores es independiente y no está verificada.`),
    license: p.license, upstreamProject: p.project, upstreamSourceUrl: p.sourceUrl, installedVersion: p.installedVersion,
    modified: false, operationalStatus: 'operational',
  };
}

export const accountAdditions: CatalogEntry[] = [
  {
    ...service('spliit', 'publicExpensesUrl', 1), accountAccess: undefined, modified: true,
    name: text('Split expenses · Spliit', 'Repartir gastos · Spliit'),
    description: text('Record shared expenses and see who owes whom. No account is needed.', 'Registrá gastos compartidos y consultá quién le debe a quién. No necesitás cuenta.'),
    launchLabel: text('Split an expense', 'Repartir un gasto'),
    limitation: text('Anyone with the group link can read and edit it. Receipt uploads and automatic exchange rates are disabled. There is no native import or whole-group deletion button.', 'Cualquiera con el enlace del grupo puede leerlo y editarlo. Los recibos y las tasas de cambio automáticas están desactivados. No hay importación nativa ni botón para borrar todo el grupo.'),
    help: text('Create a group, add participants and record an expense. Use a custom exchange rate when needed. Export JSON or CSV from the group menu. Removing a recent group from your browser does not delete it on the server.', 'Creá un grupo, agregá participantes y registrá un gasto. Usá una tasa personalizada cuando la necesités. Exportá JSON o CSV desde el menú del grupo. Quitar un grupo reciente del navegador no lo borra del servidor.'),
    dataFlow: text('Group names, participants, expenses, shares and activity pass through Cloudflare/Caddy to the Utilibre PostgreSQL database. The server and anyone holding the group link can read this information.', 'Los nombres de grupos, participantes, gastos, repartos y actividad pasan por Cloudflare/Caddy a PostgreSQL en Utilibre. El servidor y cualquiera con el enlace del grupo pueden leerlos.'),
    upstreamServices: ['Cloudflare HTTPS proxy', 'Hetzner hosting'],
    temporaryStorage: text('Groups and activity remain in PostgreSQL; recent-group links and preferences also remain in your browser. There is no configured automatic expiry.', 'Los grupos y su actividad quedan en PostgreSQL; los enlaces recientes y las preferencias también quedan en tu navegador. No hay vencimiento automático configurado.'),
    retention: text('Delete individual expenses through their edit menu; activity history can retain related details. Ask privately for whole-group removal. JSON/CSV exports have no native import here. ' + backups.en, 'Borrá gastos individuales desde su menú de edición; el historial puede conservar detalles relacionados. Pedí en privado la eliminación del grupo completo. Acá no hay importación nativa de las exportaciones JSON/CSV. ' + backups.es),
  },
  {
    ...service('wishlist', 'publicWishlistUrl', 1), modified: true, filesUploaded: true,
    name: text('Create a gift list · Wishlist', 'Crear una lista de regalos · Wishlist'),
    description: text('Keep gift ideas in shared lists with your Utilibre account.', 'Guardá ideas de regalos en listas compartidas con tu cuenta de Utilibre.'),
    launchLabel: text('Create a gift list', 'Crear una lista de regalos'),
    limitation: text('Enter products manually. Uploaded image URLs do not require sign-in; avoid confidential images. No native bulk export is available.', 'Ingresá los productos manualmente. Las URL de imágenes cargadas no exigen iniciar sesión; evitá imágenes confidenciales. No hay exportación masiva nativa.'),
    help: text('Create a group, invite its members and add wishes. Public registry links grant guest access to their shared list. Keep important item details in your own file: product Import is not a backup restore.', 'Creá un grupo, invitá a sus integrantes y agregá deseos. Los enlaces de listas públicas dan acceso de invitado a la lista compartida. Guardá los detalles importantes en un archivo propio: Importar productos no recupera respaldos.'),
    temporaryStorage: text('SQLite stores accounts, groups, lists, items and reservations; uploaded images are separate files. Group permissions do not protect a known image URL. Product-page fetching is disabled.', 'SQLite guarda cuentas, grupos, listas, artículos y reservas; las imágenes son archivos separados. Los permisos del grupo no protegen una URL de imagen conocida. La consulta de páginas de productos está desactivada.'),
    retention: text('Use the native item, list and group deletion controls. Account removal uses the native administrator interface. Uploaded files can outlive deleted records. ' + backups.en, 'Usá los controles nativos para borrar artículos, listas y grupos. La cuenta se elimina desde la administración nativa. Los archivos cargados pueden permanecer después de borrar sus registros. ' + backups.es),
  },
  {
    ...service('kitchenowl', 'publicKitchenUrl', 1), modified: true, filesUploaded: true,
    name: text('Organize household shopping · KitchenOwl', 'Organizar las compras del hogar · KitchenOwl'),
    description: text('Keep shared shopping lists, recipes and meal plans together.', 'Organizá listas de compras, recetas y planes de comidas compartidos.'),
    launchLabel: text('Open household lists', 'Abrir listas del hogar'),
    limitation: text('Other signed-in users who know a household ID can retrieve some household metadata. JSON exports omit image files and some planning, permission and list state. Recipe scraping and AI are disabled.', 'Otros usuarios con sesión que conozcan el ID pueden consultar algunos metadatos del hogar. El JSON omite las imágenes y parte de los planes, permisos y estados de listas. La extracción de recetas y la IA están desactivadas.'),
    help: text('Create a household and invite its members. Enter recipes manually. Household settings → Danger zone offers native Export, Import and Delete household; export/import copies only supported content.', 'Creá un hogar e invitá a sus integrantes. Ingresá recetas manualmente. En los ajustes del hogar, Zona de peligro ofrece Exportar, Importar y Eliminar hogar; solo se copia el contenido compatible.'),
    temporaryStorage: text('SQLite and uploaded files store household records, recipes, lists, expenses, account/session information and intentional household statistics. Shared members can retain copies; ordinary records have no configured automatic expiry.', 'SQLite y los archivos cargados guardan hogares, recetas, listas, gastos, cuentas, sesiones y estadísticas solicitadas del hogar. Los integrantes pueden conservar copias; no hay vencimiento automático configurado para los registros comunes.'),
    retention: text('Household deletion affects its members. Deleting your app account is separate from deleting your Utilibre identity and does not erase every shared copy. Uploaded-file cleanup was not verified. ' + backups.en, 'Borrar un hogar afecta a sus integrantes. Borrar tu cuenta de la aplicación es distinto de borrar tu identidad de Utilibre y no elimina todas las copias compartidas. No se verificó la limpieza de archivos cargados. ' + backups.es),
  },
  {
    ...service('opengist', 'publicSnippetsUrl', 5), discoveryGroup: 'text-data', filesUploaded: true,
    name: text('Share code with history · Opengist', 'Compartir código con historial · Opengist'),
    description: text('Save code snippets with revision history, syntax highlighting and Git access.', 'Guardá fragmentos de código con historial de cambios, resaltado de sintaxis y acceso Git.'),
    launchLabel: text('Open code snippets', 'Abrir fragmentos de código'),
    limitation: text('Unlisted links can be read by anyone who has them. ZIP downloads contain a selected revision; use an HTTPS Git clone for repository history. SSH access is disabled.', 'Cualquiera con un enlace sin listar puede leerlo. El ZIP contiene una revisión; usá una clonación Git por HTTPS para el historial. El acceso SSH está desactivado.'),
    help: text('Choose private, unlisted or public visibility before sharing. Download files or clone the repository over HTTPS. Native tokens authorize Git operations; revoke tokens you no longer use.', 'Elegí visibilidad privada, sin listar o pública antes de compartir. Descargá archivos o cloná el repositorio por HTTPS. Los tokens nativos autorizan operaciones Git; revocá los que ya no usés.'),
    temporaryStorage: text('SQLite stores account and snippet metadata; Git repositories retain code and revisions. Native session/access metadata also exists. No content expiry is configured.', 'SQLite guarda metadatos de cuentas y fragmentos; los repositorios Git conservan código y revisiones. También hay metadatos de sesiones y acceso. No hay vencimiento de contenido configurado.'),
    retention: text('Delete snippets or your app account with native controls. Editing a secret out of the current file does not remove earlier Git revisions; revoke exposed credentials. ' + backups.en, 'Borrá fragmentos o tu cuenta desde los controles nativos. Quitar un secreto del archivo actual no borra las revisiones Git anteriores; revocá las credenciales expuestas. ' + backups.es),
  },
  {
    ...service('linkding', 'publicBookmarksUrl', 5), discoveryGroup: 'reading',
    name: text('Save bookmarks · linkding', 'Guardar marcadores · linkding'),
    description: text('Save links, add tags and notes, and keep a reading queue.', 'Guardá enlaces, agregá etiquetas y notas y organizá lecturas pendientes.'),
    launchLabel: text('Open bookmarks', 'Abrir marcadores'),
    limitation: text('Page title and description fetching contacts the saved website from Utilibre. Page archiving, external favicons and Internet Archive submission are disabled. Public sharing is optional.', 'La consulta de título y descripción contacta al sitio guardado desde Utilibre. El archivo de páginas, los iconos externos y el envío a Internet Archive están desactivados. Compartir públicamente es opcional.'),
    help: text('Save a URL, then organize its tags and notes. Export bookmarks as HTML and import them into a compatible linkding installation. Other bookmark readers may omit linkding-specific fields.', 'Guardá una URL y organizá sus etiquetas y notas. Exportá HTML e importalo en una instalación compatible de linkding. Otros lectores pueden omitir campos propios de linkding.'),
    upstreamServices: ['Utilibre identity', 'Saved websites (requested metadata)', 'GitHub (server update check)', 'Cloudflare HTTPS proxy', 'Hetzner hosting'],
    temporaryStorage: text('SQLite stores bookmarks, URLs, tags, notes, reading flags and account data. No automatic expiry is configured. Requested metadata fetching and native update checks create provider requests.', 'SQLite guarda marcadores, URL, etiquetas, notas, estados de lectura y cuentas. No hay vencimiento automático configurado. La consulta de metadatos y la comprobación nativa de versiones generan solicitudes a proveedores.'),
    retention: text('Delete bookmarks in the app. Ask the operator privately for account deletion through the native administrator interface; revoke API tokens and public sharing where relevant. ' + backups.en, 'Borrá marcadores desde la aplicación. Pedí en privado que el operador elimine tu cuenta desde la administración nativa; revocá los tokens de API y el acceso público cuando corresponda. ' + backups.es),
  },
  {
    ...service('vikunja', 'publicTasksUrl', 5), filesUploaded: true,
    name: text('Plan tasks and projects · Vikunja', 'Planificar tareas y proyectos · Vikunja'),
    description: text('Organize deadlines, recurring tasks and shared projects with your Utilibre account.', 'Organizá plazos, tareas recurrentes y proyectos compartidos con tu cuenta de Utilibre.'),
    launchLabel: text('Open tasks', 'Abrir tareas'),
    limitation: text('Email reminders are disabled. Attachments are limited to 10 MB each; ZIP imports to 20 MB, 1,000 files and 100 MB expanded. These are operation limits, not an account quota.', 'Los recordatorios por correo están desactivados. Cada adjunto admite 10 MB; las importaciones ZIP, 20 MB, 1000 archivos y 100 MB expandidos. Son límites por operación, no una cuota de cuenta.'),
    help: text('Create a project and add tasks. Set share permissions deliberately. Settings → Export your data produces a ZIP; import through Settings → Import your data → Vikunja in a compatible installation.', 'Creá un proyecto y agregá tareas. Elegí los permisos al compartir. Settings → Export your data genera un ZIP; importalo con Settings → Import your data → Vikunja en una instalación compatible.'),
    temporaryStorage: text('The server stores projects, tasks, comments, attachments, account identifiers and session metadata. No ordinary task expiry is configured. Generated export ZIPs expire after seven days.', 'El servidor guarda proyectos, tareas, comentarios, adjuntos, identificadores de cuenta y metadatos de sesión. Las tareas no tienen vencimiento configurado. Los ZIP de exportación generados vencen a los siete días.'),
    retention: text('Delete tasks/projects and revoke shares through native menus. Account deletion requires the operator’s native CLI here; discuss shared ownership first. Export/import copies tasks and attachments, not every account, team or permission setting. ' + backups.en, 'Borrá tareas o proyectos y revocá enlaces desde sus menús. Acá la cuenta se elimina con la herramienta nativa del operador; revisá primero la propiedad compartida. La exportación/importación copia tareas y adjuntos, no todos los ajustes de cuenta, equipos o permisos. ' + backups.es),
  },
  {
    ...service('bytestash', 'publicSnippetLibraryUrl', 5), discoveryGroup: 'text-data', modified: true, filesUploaded: true,
    name: text('Keep a snippet library · ByteStash', 'Guardar una biblioteca de código · ByteStash'),
    description: text('Collect reusable code fragments, categorize them and share selected snippets.', 'Reuní fragmentos de código reutilizables, clasificalos y compartí los que elijás.'),
    launchLabel: text('Open snippet library', 'Abrir biblioteca de código'),
    limitation: text('A share that requires authentication admits any signed-in app account holding the link. JSON import creates copies and does not restore account settings, API keys or sharing links.', 'Un enlace que exige autenticación admite a cualquier cuenta de la aplicación con sesión que lo tenga. Importar JSON crea copias y no recupera ajustes de cuenta, claves de API ni enlaces compartidos.'),
    help: text('Keep a snippet private or choose its sharing settings. Settings → Export Snippets (JSON) saves active snippets; Import Snippets restores compatible JSON as new copies. Markdown is a readable code export.', 'Conservá el fragmento privado o elegí cómo compartirlo. Settings → Export Snippets (JSON) guarda los fragmentos activos; Import Snippets recupera JSON compatible como copias nuevas. Markdown permite leer el código exportado.'),
    temporaryStorage: text('SQLite stores readable snippets, fragments, categories, account data, API credentials and access timestamps. Active records have no automatic expiry. Recycle-bin entries expire after 30 days; share-link expiry is separate.', 'SQLite guarda fragmentos legibles, categorías, cuentas, credenciales de API y marcas de acceso. Los registros activos no vencen automáticamente. La papelera vence a los 30 días; los enlaces compartidos tienen su propio vencimiento.'),
    retention: text('Use Recycle Bin to restore or permanently delete snippets. Revoke shares/API keys separately. Account deletion is handled through the native administrator interface. ' + backups.en, 'Usá Recycle Bin para recuperar o borrar fragmentos permanentemente. Revocá por separado enlaces y claves de API. La cuenta se elimina desde la administración nativa. ' + backups.es),
  },
  {
    ...service('openresume', 'publicLocalResumeUrl', 5), category: 'utility', discoveryGroup: 'documents', accountAccess: undefined,
    modified: true, labels: ['local'], filesUploaded: false,
    name: text('Build a résumé locally · OpenResume', 'Crear un currículum local · OpenResume'),
    description: text('Write a résumé, download its PDF or extract fields from an existing PDF in your browser.', 'Escribí un currículum, descargá su PDF o extraé campos de otro PDF en tu navegador.'),
    launchLabel: text('Build a résumé', 'Crear un currículum'),
    limitation: text('The interface is in English. PDF import reconstructs text heuristically; review every field and layout. A PDF is not a lossless editable-project backup.', 'La interfaz está en inglés. La importación PDF reconstruye el texto mediante reglas aproximadas; revisá cada campo y el diseño. El PDF no es un respaldo editable sin pérdidas.'),
    dataFlow: text('Résumé parsing and PDF generation run in the browser. The verified workflow sent no files to the server. Application assets arrive through Cloudflare/Caddy; clicked outside links open other websites.', 'El análisis del currículum y la generación PDF ocurren en el navegador. El recorrido verificado no envió archivos al servidor. La aplicación se descarga por Cloudflare/Caddy; los enlaces externos abren otros sitios.'),
    upstreamServices: ['Cloudflare HTTPS proxy', 'Hetzner hosting'],
    temporaryStorage: text('Editable form data remains in localStorage after closing a tab. No server résumé database or account is created by this application.', 'Los campos editables quedan en localStorage al cerrar la pestaña. Esta aplicación no crea una cuenta ni una base de currículums en el servidor.'),
    retention: text('Clear this tool’s browser site data to remove saved form data. Downloaded PDFs remain on your device until deleted. There is no server document copy for the operator to retrieve or delete.', 'Borrá los datos de este sitio en tu navegador para quitar los campos guardados. Los PDF descargados permanecen en tu dispositivo hasta que los eliminés. El operador no tiene una copia del documento en el servidor para recuperar o borrar.'),
  },
];
