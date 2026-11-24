import type { PracticalGuide } from './practical-guide-data.ts';

export const referenceReaderGuides: PracticalGuide[] = [
  {
    id: 'read-wikimedia', paths: { en: 'guides/read-wikimedia', es: 'guias/leer-wikimedia' },
    tools: [{ id: 'wikimore', label: { en: 'Open Wikimore', es: 'Abrir Wikimore' } }],
    samples: [], reviewedOn: '2026-11-24',
    references: [{ url: 'https://git.private.coffee/PrivateCoffee/wikimore', label: { en: 'Wikimore source and installation', es: 'Código e instalación de Wikimore' } }],
    copy: {
      en: {
        title: 'Look up and read a Wikimedia article',
        intro: 'Read a public Wikimedia article through a simpler interface. No account is needed. Wikimore has its own interface language; this guide is available in English and Spanish.',
        prerequisites: 'Use a browser with Internet access. Wikimedia content and references can change. Verify important claims against the cited source or original Wikimedia page.',
        steps: [
          'Open Wikimore. Choose Wikipedia under Project and Español under Language, then search for Volcán de Fuego.',
          'Open the matching article and read the introduction and source citations. Follow an internal link to another topic and use your browser Back control to return.',
          'Check that an article image loads through Wikimore. Large or unusual media may be unavailable; the original Wikimedia page remains the reference.',
          'Bookmark the article if useful. To keep a personal copy, use your browser’s Print or Save controls and inspect the saved output.',
        ],
        success: 'The article text, an internal link, and an image are readable. Your bookmark opens the same public page while it remains available.',
        troubleshooting: 'If search or an image fails, try once later; Wikimedia API or media limits can change. Some interactive maps and editing features differ from Wikimedia’s own site. On a phone, the search controls may wrap.',
        privacy: 'Your search and article request reach Utilibre, which fetches public content from Wikimedia. Wikimedia sees Utilibre’s server connection. Search words can appear in the page address and browser history. No visitor analytics or application request logs are enabled; automatic browser assets are local. The browser can retain theme, cache and saved copies.',
        next: 'Use the original article and its citations when you need to check a fact. Clear browser history/site data and remove saved copies if needed.',
      },
      es: {
        title: 'Buscá y leé un artículo de Wikimedia',
        intro: 'Leé un artículo público de Wikimedia en una interfaz más simple. No necesitás cuenta. Wikimore tiene su propio idioma de interfaz; esta guía está en español e inglés.',
        prerequisites: 'Necesitás un navegador con Internet. El contenido y las referencias de Wikimedia pueden cambiar. Verificá afirmaciones importantes en la fuente citada o en la página original.',
        steps: [
          'Abrí Wikimore. Elegí Wikipedia en Project y Español en Language; buscá Volcán de Fuego.',
          'Abrí el artículo y leé la introducción y las fuentes. Seguí un enlace interno y usá Atrás en el navegador para volver.',
          'Comprobá que una imagen cargue mediante Wikimore. Algunos archivos grandes o poco comunes pueden faltar; la página original de Wikimedia sigue siendo la referencia.',
          'Guardá la dirección como marcador. Si querés una copia personal, usá Imprimir o Guardar del navegador y revisá el resultado.',
        ],
        success: 'Podés leer el texto, seguir un enlace interno y ver una imagen. El marcador vuelve a abrir la página pública mientras siga disponible.',
        troubleshooting: 'Si falla la búsqueda o una imagen, intentá de nuevo más tarde; los límites de la API o archivos de Wikimedia pueden cambiar. Algunos mapas interactivos y funciones de edición difieren del sitio original. En el teléfono, los controles de búsqueda pueden ocupar varias líneas.',
        privacy: 'Tu búsqueda y el artículo solicitado llegan a Utilibre, que obtiene el contenido público de Wikimedia. Wikimedia ve la conexión del servidor de Utilibre. Las palabras buscadas pueden quedar en la dirección y el historial del navegador. No hay estadísticas de visitantes ni registros de solicitudes de la aplicación; los recursos automáticos del navegador son locales. El navegador puede guardar tema, caché y copias.',
        next: 'Consultá el artículo original y sus fuentes cuando necesités verificar un dato. Borrá el historial, datos del sitio y copias guardadas si hace falta.',
      },
    },
  },
  {
    id: 'practice-guitar', paths: { en: 'guides/practice-guitar', es: 'guias/practicar-guitarra' },
    tools: [{ id: 'freetar', label: { en: 'Open Freetar', es: 'Abrir Freetar' } }],
    samples: [], reviewedOn: '2026-11-24',
    references: [{ url: 'https://github.com/kmille/freetar', label: { en: 'Freetar source and features', es: 'Código y funciones de Freetar' } }],
    copy: {
      en: {
        title: 'Find chords and practice a song',
        intro: 'Look up a song on Freetar, adjust the practice view and keep a browser favorite. No account is needed. The app interface is in English.',
        prerequisites: 'Use a browser with Internet access. Results come from Ultimate Guitar and belong to their publishers. A keyboard or larger screen helps with transposing and print preview.',
        steps: [
          'Open Freetar and search for Guantanamera. Choose a Chords result from the list.',
          'Read the chord sheet. Try Autoscroll, adjust its speed, then turn it off before leaving the page.',
          'Use the star beside the song name to save it as a favorite in this browser. Return to the homepage and confirm that it appears.',
          'Open Advanced, choose Export and save freetar-favorites.json. Use Print in the browser if you need a paper practice copy.',
        ],
        success: 'The chord sheet is readable, autoscroll works, and the song reappears on the homepage as a favorite. The JSON export is a backup of your local favorites.',
        troubleshooting: 'Ultimate Guitar may change or block retrieval. If a song is missing, try another result. Wake Lock and printing depend on your browser; some phone browsers may not keep the screen awake. Check print preview before saving paper.',
        privacy: 'Utilibre sends the search and selected song request to Ultimate Guitar from its server; it does not forward your browser IP. Search words appear in the URL and browser history. Favorites and theme stay in this browser’s local storage, not a Utilibre account. No visitor analytics or application request logs are enabled. External links are followed only when selected.',
        next: 'Import the JSON under Advanced to restore favorites in the same browser profile. To delete them, remove their stars or clear Freetar site data; delete any exported file separately.',
      },
      es: {
        title: 'Buscá acordes y practicá una canción',
        intro: 'Encontrá una canción en Freetar, ajustá la vista para practicar y guardá un favorito en el navegador. No necesitás cuenta. La aplicación está en inglés.',
        prerequisites: 'Necesitás un navegador con Internet. Los resultados provienen de Ultimate Guitar y pertenecen a sus autores. Un teclado o pantalla grande ayuda con la transposición y la vista de impresión.',
        steps: [
          'Abrí Freetar y buscá Guantanamera. Elegí un resultado Chords de la lista.',
          'Leé los acordes. Probá Autoscroll, ajustá la velocidad y apagalo antes de salir.',
          'Usá la estrella junto al nombre de la canción para guardarla en este navegador. Volvé al inicio y comprobá que aparezca.',
          'Abrí Advanced, elegí Export y guardá freetar-favorites.json. Usá Imprimir en el navegador si necesitás una copia en papel.',
        ],
        success: 'Los acordes se leen, el desplazamiento funciona y la canción reaparece entre favoritos. El JSON exportado respalda los favoritos locales.',
        troubleshooting: 'Ultimate Guitar puede cambiar o bloquear la recuperación. Si falta una canción, probá otro resultado. Wake Lock y la impresión dependen del navegador; algunos teléfonos no mantienen la pantalla encendida. Revisá la vista previa antes de imprimir.',
        privacy: 'Utilibre solicita la búsqueda y canción a Ultimate Guitar desde su servidor; no reenvía la IP del navegador. Las palabras buscadas quedan en la URL y el historial. Los favoritos y el tema quedan en el almacenamiento local de este navegador, no en una cuenta de Utilibre. No hay estadísticas de visitantes ni registros de solicitudes de la aplicación. Los enlaces externos se abren solo al elegirlos.',
        next: 'Importá el JSON desde Advanced para recuperar los favoritos en el mismo perfil. Para borrarlos, quitá las estrellas o eliminá los datos del sitio; borrá por separado cualquier archivo exportado.',
      },
    },
  },
];
