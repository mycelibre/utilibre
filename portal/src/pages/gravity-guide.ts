import type { PracticalGuide } from './practical-guide-data.ts';
export const gravityGuides: PracticalGuide[] = [{
  id: 'gravity', paths: { en: 'guides/explore-gravity', es: 'guias/explorar-gravedad' },
  tools: [{ id: 'gravity', label: { en: 'Open Gravity', es: 'Abrir Gravity' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Explore gravity through a solar-system model',
      intro: 'Follow the native tour, then try the free-explore controls. This is an educational visualization with approximations, not a tool for navigation or precise astronomical predictions.',
      prerequisites: 'Use a browser and device with WebGL. Rendering uses your device’s GPU and CPU; a desktop screen gives the scene more space. Native languages are English, Polish and Chinese. There is no Spanish translation inside the app.',
      steps: [
        'Open Gravity and wait for the first scene to appear. EN selects English. Read the first description, then use Next and Back to move between examples. A short visual transition is normal.',
        'Use the tour’s step dropdown to jump to a subject. The current step is stored in the URL fragment; copy that link if you want to revisit it. A link to a step does not save every simulation setting.',
        'Start tour advances automatically according to the native reading timer. This installation has no music or narration. On mobile, use Hide description to give the scene more room and Show description to read it again.',
        'Choose Explore to open the free-explore controls. Compare Visual scale and True scale, and the Keplerian and N-body physics settings. Small bodies can be difficult to see at true scale; high time multipliers and moon simulation trade accuracy and device demand.',
        'Choose Replay guided tour to return to the first explanation. Close the page when finished. Clear the tools site’s saved browser data if you want to remove the remembered language, taking care to preserve saved work from other apps on the same origin.',
      ],
      success: 'Desktop and mobile tests showed the rendered scene, working Next/Back and Explore/Replay controls, and a saved native language choice after reload. These interface checks do not independently validate every numerical or scientific statement in the tour.',
      troubleshooting: 'If the scene stays blank, check WebGL support and try a device with graphics acceleration. Allow a moment for transitions. Use fewer moons or a slower simulation if it becomes sluggish. This instance uses the app’s own procedural Earth and Moon surfaces; photographic textures and recordings are not included.',
      privacy: 'The simulation runs locally, with app files and fonts from Utilibre. It has no account or file-upload service. Language choice persists in localStorage after tab closure; step fragments may remain in browser history. Reference and GitHub issue links are external, deliberate navigation. No simulation-interaction analytics is added.',
      next: 'Compare the explanation with a trusted astronomy reference when you need more detail. Treat the displayed scale and simplified motion as teaching aids.',
    },
    es: {
      title: 'Explorá la gravedad con un modelo del sistema solar',
      intro: 'Seguí el recorrido nativo y probá después los controles de exploración. Es una visualización educativa con aproximaciones, no una herramienta de navegación ni de predicciones astronómicas precisas.',
      prerequisites: 'Usá un navegador y dispositivo con WebGL. La escena usa la GPU y CPU de tu dispositivo; una pantalla de escritorio deja más espacio. Los idiomas nativos son inglés, polaco y chino. La aplicación no incluye traducción al español.',
      steps: [
        'Abrí Gravity y esperá a que aparezca la primera escena. EN selecciona inglés. Leé la descripción y usá Next y Back para cambiar de ejemplo. Es normal que haya una transición visual breve.',
        'Usá el menú de pasos del recorrido para saltar a un tema. El paso actual queda en el fragmento de la URL; copiá ese enlace si querés volver a verlo. Un enlace a un paso no guarda todos los ajustes de simulación.',
        'Start tour avanza automáticamente con el temporizador de lectura nativo. Esta instalación no incluye música ni narración. En móvil, usá Hide description para dejar más espacio a la escena y Show description para volver a leerla.',
        'Elegí Explore para abrir los controles de exploración. Compará Visual scale y True scale, y los modos físicos Keplerian y N-body. Los cuerpos pequeños pueden ser difíciles de ver a escala real; acelerar mucho el tiempo y simular lunas cambia la precisión y la demanda del dispositivo.',
        'Elegí Replay guided tour para volver a la primera explicación. Cerrá la página cuando terminés. Si querés quitar el idioma recordado, borrá los datos del sitio tools en el navegador, después de conservar el trabajo de otras aplicaciones del mismo origen.',
      ],
      success: 'En escritorio y móvil se comprobó la escena renderizada, los controles Next/Back y Explore/Replay y la conservación del idioma al recargar. Estas pruebas de interfaz no validan independientemente cada cálculo ni afirmación científica del recorrido.',
      troubleshooting: 'Si la escena sigue vacía, comprobá WebGL y probá un dispositivo con aceleración gráfica. Dale un momento a las transiciones. Usá menos lunas o una simulación más lenta si se traba. Esta instancia usa las superficies procedurales nativas de la Tierra y la Luna; no incluye texturas fotográficas ni grabaciones.',
      privacy: 'La simulación funciona localmente y descarga la aplicación y las fuentes desde Utilibre. No tiene cuenta ni servicio de subida de archivos. El idioma persiste en localStorage al cerrar la pestaña; los fragmentos de pasos pueden quedar en el historial. Los enlaces de referencia e incidencias de GitHub son navegación externa voluntaria. No se agregan estadísticas de interacción con la simulación.',
      next: 'Contrastá las explicaciones con una referencia astronómica confiable cuando necesités más detalle. Tomá la escala mostrada y el movimiento simplificado como ayudas educativas.',
    },
  },
}];
