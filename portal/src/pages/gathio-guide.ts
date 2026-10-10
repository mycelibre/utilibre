import type { PracticalGuide } from './practical-guide-data.ts';

export const gathioGuides: PracticalGuide[] = [{
  id: 'gathio', paths: { en: 'guides/share-event', es: 'guias/compartir-evento' },
  tools: [{ id: 'gathio', label: { en: 'Open Gathio', es: 'Abrir Gathio' } }], samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Share an event and keep its calendar details',
      intro: "Create an event page without an account, share its public address and keep its edit link private.",
      prerequisites: 'Start with fictional details and an event in the future. The native interface does not currently include Spanish. Save the edit link privately; this instance has no email recovery.',
      steps: ['Create an event with its title, description, location, timezone and start/end time. Review attendance and comment options before sharing.', 'Save the returned edit link somewhere private. Share the ordinary event URL with participants. An unlisted event is still accessible to someone who knows its URL.', 'Reopen the edit link to change details or upload an image. Anyone who receives that management link can administer the event.', 'Use the native calendar export to download ICS. It contains event details such as title, time, location and description. It omits attendees, comments, image bytes, management keys and application settings.', 'Import the ICS through Gathio’s native event import to create a new copy, or open it in a compatible calendar. Review times and details; save the new copy’s separate edit link.', 'Use the editor’s delete control to remove an event. Native daily cleanup also expires events seven days after their end. Deletion cannot recall participants’ calendar copies or existing backups.'],
      success: 'Fictional event creation, edit-token rejection, image upload, ICS export/import, public view/edit, native deletion and an isolated full-service restore with both event copies and the image passed.',
      troubleshooting: 'Email notifications, email recovery and federation are disabled. Keep the edit link yourself. Event creation/import is rate-limited; an unlisted URL is not a confidentiality feature.',
      privacy: 'The server can read event details, images, attendance, optional contact details and comments. Database operation/error logs have no configured expiry. Daily backups on this VM have no automatic deletion schedule and are not offsite copies.',
      next: 'Keep an independent ICS copy for important event details, and download any image you need separately. Do not publish edit keys in support requests.',
    },
    es: {
      title: 'Compartí un evento y conservá sus datos de calendario',
      intro: "Creá una página para un evento sin cuenta, compartí su dirección pública y conservá el enlace de edición en privado.",
      prerequisites: 'Empezá con datos ficticios y un evento futuro. La interfaz nativa todavía no incluye español. Guardá el enlace de edición en privado: esta instancia no ofrece recuperación por correo.',
      steps: ['Creá un evento con título, descripción, lugar, zona horaria y fechas de inicio y fin. Revisá las opciones de asistencia y comentarios antes de compartirlo.', 'Guardá el enlace de edición en un lugar privado. Compartí la URL normal con participantes. Un evento no listado sigue siendo accesible para quien conoce su URL.', 'Volvé a abrir el enlace de edición para cambiar datos o subir una imagen. Cualquiera que reciba ese enlace puede administrar el evento.', 'Usá la exportación de calendario para descargar ICS. Incluye datos como título, horario, lugar y descripción. Omite asistentes, comentarios, archivos de imagen, claves de gestión y ajustes de la aplicación.', 'Importá el ICS desde la función nativa de Gathio para crear una copia nueva, o abrilo en un calendario compatible. Revisá horarios y datos; guardá el enlace de edición propio de la nueva copia.', 'Usá el control de borrado del editor para eliminar el evento. La limpieza diaria también elimina eventos siete días después de terminar. El borrado no retira las copias de calendario de participantes ni las copias de seguridad existentes.'],
      success: 'Pasaron la creación ficticia, el rechazo de una clave incorrecta, la carga de imagen, la exportación e importación ICS, la vista y edición públicas, el borrado nativo y una restauración aislada con ambas copias y la imagen.',
      troubleshooting: 'El correo, la recuperación por correo y la federación están desactivados. Guardá vos el enlace de edición. Crear e importar eventos tiene límites de frecuencia; una URL no listada no garantiza confidencialidad.',
      privacy: 'El servidor puede leer eventos, imágenes, asistentes, datos de contacto opcionales y comentarios. Los registros de operaciones y errores de la base no tienen vencimiento configurado. Las copias diarias de esta VM no tienen borrado automático ni están fuera de este servidor.',
      next: "Conservá un ICS independiente con los datos importantes y descargá por separado cualquier imagen que necesités. No publiqués claves de edición al pedir ayuda.",
    },
  },
}];
