import type { PracticalGuide } from './practical-guide-data.ts';

export const chitchatterGuides: PracticalGuide[] = [{
  id: 'chitchatter', paths: { en: 'guides/chitchatter-room', es: 'guias/sala-chitchatter' },
  tools: [{ id: 'chitchatter', label: { en: 'Open Chitchatter', es: 'Abrir Chitchatter' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Start a temporary peer chat', intro: 'Share a generated room link with someone you intend to contact. Keep both browsers open: this chat has no offline inbox.',
      prerequisites: 'Use a current browser over HTTPS. Direct WebRTC connections may fail on restrictive networks because this instance has no TURN relay. Peers can see one another’s IP addresses. Controls remain in English.',
      steps: [
        'Open Chitchatter and keep the generated UUID room name. Join public room lets anyone with that room link enter; “public” does not mean a private authenticated account. For an agreed additional password, use Join private room and share that password separately.',
        'Use Copy current URL and send the complete link privately to your intended participant. Confirm who joined through a separate trusted channel or compare the native public identity key. Never share a private identity key.',
        'Type fictional text in Your message and press Enter; Shift+Enter adds a line break. Confirm the other participant receives it and replies. A wrong private-room password can look like a connection failure without an explanatory error.',
        'To transfer a small file, open the room controls, choose the folder control and select a fictional file. The recipient chooses Download files being offered in the peer list. Keep both browsers open until the download completes, then reopen the downloaded file and check it.',
        'Use the call or camera controls only when you want to share that media and grant the browser permission. Stop sharing before leaving. Keep any information you need independently; recipients may retain copies even after everyone leaves.',
      ],
      success: 'Two fresh test browsers exchanged text and an identical fictional text file; the native microphone control attached a generated audio track. This was a same-machine direct-peer test, not proof of connectivity or call quality across every network.',
      troubleshooting: 'Try another network if peers never connect. This instance uses Utilibre’s discovery and STUN endpoints without an external relay fallback. Large file transfers depend on browser memory. Remote image and YouTube links remain links instead of automatically loading outside content.',
      privacy: 'Messages use encrypted peer connections and application memory. Public rooms can backfill recent messages from existing peers. Identity keys and preferences persist in this browser after tab closure; downloaded files remain on your device. Discovery and STUN process connection metadata. Clearing the chat site’s browser data removes local identity/preferences, not recipients’ copies. There is no server account or recovery copy.',
      next: 'For scheduled meetings across varied networks, use the separate Galene guide. Keep important files and contact details outside this temporary room.',
    },
    es: {
      title: 'Iniciá una conversación temporal entre participantes', intro: 'Compartí un enlace de sala generado con la persona que querés contactar. Mantené ambos navegadores abiertos: este chat no tiene bandeja de mensajes sin conexión.',
      prerequisites: 'Usá un navegador actual mediante HTTPS. Las conexiones WebRTC directas pueden fallar en redes restrictivas porque acá no hay retransmisión TURN. Los participantes pueden ver las IP de los demás. Los controles están en inglés.',
      steps: [
        'Abrí Chitchatter y conservá el nombre UUID generado. Join public room permite entrar a cualquiera con el enlace: “public” no es una cuenta privada autenticada. Para agregar una contraseña acordada, usá Join private room y compartila por separado.',
        'Usá Copy current URL y enviá el enlace completo en privado a tu destinatario. Confirmá quién entró por otro canal confiable o compará la clave pública de identidad nativa. Nunca compartás una clave privada de identidad.',
        'Escribí texto ficticio en Your message y pulsá Enter; Shift+Enter agrega un salto de línea. Comprobá que la otra persona lo reciba y responda. Una contraseña incorrecta puede parecer un fallo de conexión sin un error explicativo.',
        'Para transferir un archivo pequeño, abrí los controles de la sala, elegí la carpeta y seleccioná un archivo ficticio. El destinatario elige Download files being offered en la lista de participantes. Mantené ambos navegadores abiertos hasta que termine la descarga y revisá el archivo descargado.',
        'Usá los controles de llamada o cámara solo cuando querás compartir ese contenido y autorizá al navegador. Detené la transmisión antes de salir. Conservá aparte lo que necesités: otras personas pueden guardar copias después de que todos salgan.',
      ],
      success: 'Dos navegadores nuevos intercambiaron texto y un archivo ficticio idéntico; el control de micrófono agregó una pista de audio generada. Fue una prueba directa en la misma máquina, no una garantía de conexión o calidad en cualquier red.',
      troubleshooting: 'Probá otra red si no se conectan. Esta instancia usa los servicios de descubrimiento y STUN de Utilibre, sin retransmisor externo alternativo. Los archivos grandes dependen de la memoria del navegador. Los enlaces de imágenes remotas y YouTube no cargan contenido externo automáticamente.',
      privacy: 'Los mensajes usan conexiones cifradas y memoria de la aplicación. Las salas públicas pueden recuperar mensajes recientes de participantes presentes. Claves de identidad y preferencias persisten al cerrar la pestaña; las descargas quedan en tu dispositivo. El descubrimiento y STUN procesan metadatos de conexión. Borrar los datos del sitio del chat quita identidad y preferencias locales, no copias de destinatarios. No hay cuenta ni copia de recuperación en el servidor.',
      next: 'Para reuniones programadas entre redes distintas, usá la guía de Galene. Conservá archivos y contactos importantes fuera de esta sala temporal.',
    },
  },
}];
