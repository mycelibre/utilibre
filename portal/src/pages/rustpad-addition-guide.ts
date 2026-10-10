import type { PracticalGuide } from './practical-guide-data.ts';

export const rustpadAdditionGuides: PracticalGuide[] = [{
  id: 'shared-code-pad', paths: { en: 'guides/shared-code-pad', es: 'guias/editor-codigo-compartido' },
  tools: [{ id: 'rustpad', label: { en: 'Open Rustpad', es: 'Abrir Rustpad' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Edit a short code example together',
      intro: 'Use Rustpad when you want another person to see and edit the same text while you discuss it. It is a temporary scratchpad, so keep your own file too.',
      prerequisites: 'Use a current browser with JavaScript, WebAssembly and WebSockets enabled. Use fictional or non-confidential text: Utilibre processes readable document content, and anyone with the sharing link can read and change it. The interface uses English labels.',
      steps: [
        'Open Rustpad. The browser generates a random document link. Keep that generated address rather than replacing its identifier with a guessable word.',
        'Type a short example in the editor. On a wider screen, Language changes syntax highlighting. Choose your entry marked (you) under Active Users to open Update Info and change your display name. A name does not verify who someone is, and choosing a language does not execute the code.',
        'Choose Copy under Share Link to copy the complete address, or copy it from the browser address bar. Send it only to your intended collaborators. Everyone with the link gets the same read and edit access; there is no read-only invitation or revoke button.',
        'Before leaving, select the editor text and copy it into a local text file. Reopen that file with a compatible text editor; paste its contents into a new Rustpad to start another session. This keeps the text, not collaboration history, display names, cursor positions or access settings. Rustpad has no native account export or document download button.',
        'To stop sharing, close the editor and stop distributing its link. You can clear the visible text, but previous operations remain in memory until expiry or restart, and collaborators may have kept copies. There is no permanent-delete control for one pad. Remove downloaded files and browser site data separately when needed.',
      ],
      success: 'Both connected editors should show the same text and changes. Keep a local copy you can reopen before you depend on the session.',
      troubleshooting: 'Pads expire about 24–25 hours after their latest connection; edits alone do not renew that period. A service restart also removes every pad. Each pad accepts at most 256 KiB of UTF-8 text, 4,096 edits or 1 MiB of edit-history data. The service allows 64 pads and 128 connections in total. If it disconnects or reaches a limit, preserve the visible text locally before opening a new session; unsent changes may exist only in your browser.',
      privacy: 'Text, edit history, display names and cursor positions are processed in server memory and shared with connected participants. Transport is encrypted, but the document is not end-to-end encrypted. No document database or backups are enabled. Name, color and theme preferences can remain in browser storage after you close the tab. Editor assets and workers are local; no analytics are added. Infrastructure metadata and bounded error logs have separate retention. The service cannot restore an expired or restarted pad.',
      next: 'Use a local file or a service with a suitable export and retention model for work you need to keep. Never paste passwords, API keys or private production data into this shared scratchpad.',
    },
    es: {
      title: 'Editá un ejemplo breve de código en grupo',
      intro: 'Usá Rustpad cuando querás que otra persona vea y edite el mismo texto mientras lo comentan. Es un espacio temporal, así que conservá también tu propio archivo.',
      prerequisites: 'Usá un navegador actual con JavaScript, WebAssembly y WebSockets habilitados. Usá texto ficticio o no confidencial: Utilibre procesa el contenido legible y cualquiera que tenga el enlace puede leerlo y modificarlo. La interfaz usa etiquetas en inglés.',
      steps: [
        'Abrí Rustpad. El navegador genera un enlace aleatorio para el documento. Conservá esa dirección en vez de sustituir su identificador por una palabra fácil de adivinar.',
        'Escribí un ejemplo breve en el editor. En una pantalla amplia, Language cambia el resaltado de sintaxis. Elegí tu entrada marcada (you) en Active Users para abrir Update Info y cambiar tu nombre visible. Ese nombre no verifica la identidad y elegir un lenguaje no ejecuta el código.',
        'Elegí Copy en Share Link para copiar la dirección completa o copiala desde la barra del navegador. Enviala solo a las personas con quienes querás colaborar. Todas las personas con el enlace pueden leer y editar por igual; no hay invitaciones de solo lectura ni un botón para revocar el acceso.',
        'Antes de salir, seleccioná el texto del editor y copialo a un archivo de texto local. Reabrilo con un editor compatible; pegá su contenido en un Rustpad nuevo para iniciar otra sesión. Así conservás el texto, no el historial de colaboración, los nombres, las posiciones de los cursores ni los ajustes de acceso. Rustpad no tiene una exportación nativa de cuenta ni un botón para descargar documentos.',
        'Para dejar de compartir, cerrá el editor y dejá de distribuir su enlace. Podés borrar el texto visible, pero las operaciones anteriores permanecen en memoria hasta la caducidad o un reinicio, y otras personas pueden haber guardado copias. No hay un control de borrado permanente para un documento individual. Borrá por separado los archivos descargados y los datos del navegador cuando lo necesités.',
      ],
      success: 'Los dos editores conectados deberían mostrar el mismo texto y sus cambios. Guardá una copia local que podás reabrir antes de depender de la sesión.',
      troubleshooting: 'Los documentos caducan unas 24–25 horas después de la última conexión; editar no renueva ese plazo. Reiniciar el servicio también elimina todos los documentos. Cada documento admite hasta 256 KiB de texto UTF-8, 4.096 ediciones o 1 MiB de historial. El servicio permite 64 documentos y 128 conexiones en total. Si se desconecta o alcanza un límite, guardá localmente el texto visible antes de abrir otra sesión; los cambios no enviados pueden existir solo en tu navegador.',
      privacy: 'El texto, el historial, los nombres y las posiciones de los cursores se procesan en la memoria del servidor y se comparten con las personas conectadas. El transporte está cifrado, pero el documento no tiene cifrado de extremo a extremo. No se habilitan base de datos ni respaldos de documentos. Las preferencias de nombre, color y tema pueden quedar en el navegador después de cerrar la pestaña. Los recursos y procesos auxiliares del editor son locales; no se añaden estadísticas. Los metadatos de infraestructura y los registros de errores acotados tienen conservación independiente. El servicio no puede recuperar un documento caducado o perdido por un reinicio.',
      next: 'Para trabajo que necesités conservar, usá un archivo local o un servicio con exportación y conservación adecuadas. Nunca pegués contraseñas, claves de API ni datos privados de producción en este editor compartido.',
    },
  },
}];
