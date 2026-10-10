import type { PracticalGuide } from './practical-guide-data.ts';
export const familyChessGuides: PracticalGuide[] = [{
  id: 'family-chess', paths: { en: 'guides/chess-with-a-friend', es: 'guias/ajedrez-con-alguien' }, tools: [{ id: 'family-chess', label: { en: 'Open Family Chess', es: 'Abrir Family Chess' } }], samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Play a game of chess with someone you know',
      intro: 'Family Chess gives two people a shared board. Create a game, send the link and choose your sides; there is no account to set up. Public HTTPS multiplayer and live updates were checked with a fictional game.',
      prerequisites: 'Use a browser with JavaScript and keep the connection open. The interface offers English and Spanish. Anyone with the eight-digit code can watch or occupy an empty seat, so use this for ordinary games rather than confidential communication.',
      steps: [
        'Open Family Chess and choose Create New Game. Copy the address with Share Link and send it to the other player.',
        'Choose White or Black, then confirm with the readiness button. The other player chooses the remaining side and confirms too. A color reservation lasts three minutes.',
        'Click or tap a piece, then its destination square. The application checks legal moves and turns. Additional people opening the link can watch; they cannot move a piece from an occupied seat.',
        'Keep the browser open while playing. Session and seat-recovery cookies help identify your place. Clearing site data can lose that access; the code alone does not prove you are a particular player.',
        'Keep your own screenshot or written notes if you want a record. This release has no native game export or import; a screenshot cannot restore a playable board or its full move history.',
      ],
      success: 'Both players see the same board after a legal move. Spectators can follow it without taking an occupied seat.',
      troubleshooting: 'Wait if game creation is rate-limited. Inactive seats become free after twenty minutes; games are marked abandoned after both players have been absent for two hours. A reconnect does not guarantee that a freed seat is still available. Native live updates use SSE with polling fallback.',
      privacy: 'Utilibre stores readable game and session state. Games are deleted seven days after creation by a minute-by-minute cleanup job; there is no immediate-delete control. You can ask the operator about a specific game identifier. Daily backups remain on this VM without automatic expiry and are not rewritten by active deletion. Other players may keep copies. Downloaded screenshots and notes stay on your device until you delete them.',
      next: 'For another match, create a new game and share its new link. The tested recovery scope is an isolated SQLite copy of a fictional game, not a user-facing import or a full-server disaster recovery test.',
    },
    es: {
      title: 'Jugá una partida de ajedrez con alguien que conocés',
      intro: 'Family Chess les da un tablero compartido a dos personas. Creá la partida, enviá el enlace y elijan sus lados; no hace falta crear una cuenta. El juego compartido por HTTPS público y las actualizaciones en vivo se verificaron con una partida ficticia.',
      prerequisites: 'Usá un navegador con JavaScript y mantené la conexión. La interfaz ofrece inglés y español. Cualquiera con el código de ocho dígitos puede mirar u ocupar un lugar vacío; usalo para partidas comunes, no para comunicar información confidencial.',
      steps: [
        'Abrí Family Chess y elegí Crear partida. Copiá la dirección con Compartir enlace y enviásela a la otra persona.',
        'Elegí blancas o negras y confirmá que estás listo con el botón de preparación. La otra persona elige el lado restante y también confirma. La reserva de color dura tres minutos.',
        'Hacé clic o tocá una pieza y después la casilla de destino. La aplicación verifica las jugadas legales y los turnos. Quienes abran el enlace después pueden mirar; no pueden mover las piezas de un lugar ocupado.',
        'Mantené abierto el navegador mientras jugás. Las cookies de sesión y recuperación ayudan a identificar tu lugar. Borrar los datos del sitio puede quitarte ese acceso; el código no prueba por sí solo quién es cada jugador.',
        'Conservá una captura o notas propias si querés guardar un registro. Esta versión no tiene exportación ni importación nativas; una captura no restaura un tablero jugable ni todo su historial.',
      ],
      success: 'Ambos jugadores ven el mismo tablero después de una jugada legal. Los espectadores pueden seguirlo sin ocupar un lugar que ya tiene jugador.',
      troubleshooting: 'Esperá si alcanzaste el límite de creación de partidas. Los lugares inactivos se liberan a los veinte minutos; las partidas se marcan como abandonadas cuando ambos jugadores llevan dos horas ausentes. Reconectarte no garantiza que un lugar liberado siga disponible. Las actualizaciones usan SSE y consultas periódicas como alternativa.',
      privacy: 'Utilibre guarda el estado legible de partidas y sesiones. Una tarea que se ejecuta cada minuto borra las partidas siete días después de crearse; no hay un control de borrado inmediato. Podés consultar al operador por un identificador concreto. Los respaldos diarios quedan en esta VM sin vencimiento automático y el borrado activo no los modifica. Otros jugadores pueden guardar copias. Las capturas y notas descargadas permanecen en tu dispositivo hasta que las borrés.',
      next: 'Para volver a jugar, creá otra partida y compartí el nuevo enlace. La recuperación verificada usó una copia SQLite aislada de una partida ficticia; no fue una importación para usuarios ni una recuperación completa del servidor.',
    },
  },
}];
