import type { PracticalGuide } from './practical-guide-data.ts';
export const donetickAdditionGuides: PracticalGuide[] = [{
  id: 'shared-chores', paths: { en: 'guides/shared-chores', es: 'guias/tareas-compartidas' },
  tools: [{ id: 'donetick', label: { en: 'Open Donetick', es: 'Abrir Donetick' } }], samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Plan recurring chores with a small group',
      intro: 'Donetick keeps the next chore and its completion history together. Start with one ordinary task and check circle membership before you add private household details.',
      prerequisites: 'You need an approved Utilibre account. Each new account starts in its own circle. The server can read chore text, history and files; this service does not provide end-to-end encryption. These steps use the native English labels.',
      steps: [
        'Open Donetick and use its Utilibre sign-in. On an empty task list, choose Add a task and give the task a name, such as Water the paper fern. Choose the schedule and assignment you want before saving it.',
        'Use Mark as done to complete the fictional task once and check its history. Recurrence is managed by the application; external email, push integrations and voice recognition are unavailable here.',
        'Use Settings and Circle Members to review your group. A Join Circle code creates a membership request; the administrator must accept it before the requester receives normal circle access. Share codes only with intended members and review requests carefully.',
        'Keep an independent note of important task details and download attachments you need. This version has no implemented general user export/import. These manual copies do not migrate completion history, memberships, permissions, settings or the account itself. Reopen downloaded files with a compatible local application.',
        'Before deleting an account, review shared tasks and transfer circle ownership where the native preview requires it. Under Settings → Account, use Change Password to set a local confirmation password if your SSO account lacks one. Password sign-in remains disabled. Choose Delete Account, review the preview, and confirm with that password and DELETE. This is a destructive account action, so export your independent copies first.',
      ],
      success: 'The task and its completion appear in the intended circle. A separate account should see it only after the circle administrator accepts its membership.',
      troubleshooting: 'Attachments are limited to 5 MiB each and a 50 MiB circle pool. A complete signed attachment link works without an account for up to seven days; leaving a circle does not revoke a copy of that link. Profile images are public by known path. A wrong-circle request can show a generic error in this release. Keep important records elsewhere if a full export is essential.',
      privacy: 'Chores, completion history, membership and attachments are stored as server-readable data. Browser storage retains the login token after a tab closes. Native deletion removes owned data according to shared-circle rules; circle metadata and other members’ records can remain. Other people’s copies are separate. Daily operator backups remain on this VM without automatic pruning and can contain deleted records. They are recovery copies, not a user export or off-host disaster recovery. Infrastructure providers and bounded operational logs have separate retention.',
      next: 'Two fictional OIDC accounts, circle approval/leave, attachment permissions and native deletion were checked. A networkless restored application opened the saved fictional chore and attachment. No unimplemented user export was labelled tested.',
    },
    es: {
      title: 'Organizá tareas recurrentes con un grupo pequeño',
      intro: 'Donetick reúne la próxima tarea y su historial de finalización. Empezá con una tarea cotidiana y revisá quiénes integran el círculo antes de añadir detalles privados del hogar.',
      prerequisites: 'Necesitás una cuenta aprobada de Utilibre. Cada cuenta nueva empieza en su propio círculo. El servidor puede leer las tareas, el historial y los archivos; no hay cifrado de extremo a extremo. Estos pasos usan las etiquetas nativas en inglés.',
      steps: [
        'Abrí Donetick y usá su acceso con Utilibre. En una lista vacía, elegí Add a task y dale un nombre, como Regar el helecho de papel. Elegí el calendario y la asignación antes de guardarla.',
        'Usá Mark as done para completar la tarea ficticia una vez y revisá su historial. La aplicación gestiona la repetición; aquí no hay correo externo, integraciones de notificaciones push ni reconocimiento de voz.',
        'Usá Settings y Circle Members para revisar tu grupo. Un código de Join Circle crea una solicitud de membresía; la administración debe aceptarla antes de que la persona reciba acceso normal al círculo. Compartí los códigos solo con las personas previstas y revisá las solicitudes con cuidado.',
        'Conservá una nota independiente de los detalles importantes y descargá los adjuntos que necesités. Esta versión no implementa una exportación/importación general para usuarios. Esas copias manuales no trasladan el historial de finalización, membresías, permisos, ajustes ni la cuenta. Reabrí los archivos descargados con una aplicación local compatible.',
        'Antes de borrar una cuenta, revisá las tareas compartidas y transferí la propiedad del círculo cuando lo pida la vista previa nativa. En Settings → Account, usá Change Password para establecer una contraseña local de confirmación si tu cuenta de SSO no tiene una. El acceso mediante contraseña sigue desactivado. Elegí Delete Account, revisá la vista previa y confirmá con esa contraseña y DELETE. Esta acción borra la cuenta, así que guardá primero tus copias independientes.',
      ],
      success: 'La tarea y su finalización aparecen en el círculo previsto. Otra cuenta debería verla solo después de que la administración acepte su membresía.',
      troubleshooting: 'Los adjuntos tienen un límite de 5 MiB por archivo y un total de 50 MiB por círculo. Un enlace firmado completo permite acceso sin cuenta hasta por siete días; salir de un círculo no revoca una copia de ese enlace. Las imágenes de perfil son públicas si se conoce su ruta. Una solicitud desde otro círculo puede mostrar un error genérico en esta versión. Conservá los registros importantes en otro lugar si necesitás una exportación completa.',
      privacy: 'Las tareas, el historial, las membresías y los adjuntos se guardan como datos legibles en el servidor. El navegador conserva el token de acceso después de cerrar una pestaña. El borrado nativo elimina datos propios según las reglas del círculo compartido; pueden quedar metadatos del círculo y registros de otras personas. Las copias ajenas son aparte. Los respaldos diarios del operador permanecen en esta VM sin purga automática y pueden contener registros borrados. Son copias de recuperación, no una exportación del usuario ni recuperación ante la pérdida de la VM. Los proveedores de infraestructura y los registros operativos acotados tienen conservación independiente.',
      next: 'Se verificaron dos cuentas ficticias con OIDC, aprobación y salida del círculo, permisos de adjuntos y borrado nativo. Una aplicación restaurada sin red abrió la tarea y el adjunto ficticios guardados. No se presentó como probada una exportación de usuario que no está implementada.',
    },
  },
}];
