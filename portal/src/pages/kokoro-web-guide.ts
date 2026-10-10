import type { PracticalGuide } from './practical-guide-data.ts';
export const kokoroWebGuides: PracticalGuide[] = [{
  id: 'kokoro-web', paths: { en: 'guides/generate-local-speech', es: 'guias/generar-voz-local' },
  tools: [{ id: 'kokoro-web', label: { en: 'Open Kokoro Web', es: 'Abrir Kokoro Web' } }],
  samples: [], reviewedOn: '2026-10-09',
  copy: {
    en: {
      title: 'Turn a short text into a downloadable voice clip',
      intro: 'Kokoro generates speech on your device using locally served models. Start with a short fictional sentence, listen to the result, then save a WAV file.',
      prerequisites: 'Use a modern browser with WebAssembly and enough memory for a speech model. First use downloads more than 100 MB of model/runtime files. CPU works in the tested browser; WebGPU depends on the browser and device. Controls are in English, with English US and Latin American Spanish voices.',
      steps: [
        'Open Kokoro Web. Keep Acceleration set to CPU and the installed 8-bit model. Under Language accent (region), choose English (US) or Spanish. The simple Voice selector offers the corresponding stock voice.',
        'Replace Text to process with a short sample, such as “Hello. This is a fictional sample.” or “Hola. Esta es una prueba ficticia.” Generate Voice downloads the required local files and processes the text in your browser. Keep the tab open while it works.',
        'Use Play and Pause under Output to review pronunciation. Use Download audio to save the result, then reopen it in an audio player. This installation exports WAV at normal speed; it does not offer MP3 conversion or speed changes.',
        'If you want to reuse the text and settings, use Save profile and enter a name. After reloading, select that profile to restore it. Saving a profile also saves its text in this browser; it is not an account or an audio-file backup.',
        'To remove a saved profile, select it and use Delete profile, then confirm. Reload to check that it is gone. For all cached models and saved app data, use the browser’s site-data controls. The tools origin is shared with other applications, so preserve their work before clearing it.',
      ],
      success: 'Fictional English and Spanish samples produced valid 24 kHz WAV files with non-silent audio and working native playback. Saving, reopening and deleting a profile passed. These checks do not guarantee pronunciation quality for every name, accent or long text.',
      troubleshooting: 'A first generation can take longer while files download and the model loads. Try a shorter sentence and CPU if WebGPU fails. Devices with little memory may not complete the task. Listen before sharing: synthesized speech can mispronounce words or sound unnatural. This tool does not record your microphone or clone a voice.',
      privacy: 'Text and generated audio stay in the browser in the tested workflow. App/model requests go to Utilibre; no external inference service is used. Unsaved work and audio live in page memory. Saved profiles, theme and cached model/voice files can survive tab closure. Downloads remain on your device until deleted. Native source/author links are external navigation when followed.',
      next: 'Keep the WAV and original text if you need to edit the wording later. Protect downloaded recordings that contain private information.',
    },
    es: {
      title: 'Convertí un texto breve en un audio descargable',
      intro: 'Kokoro genera voz en tu dispositivo con modelos servidos desde Utilibre. Empezá con una frase ficticia breve, escuchá el resultado y guardá un archivo WAV.',
      prerequisites: 'Usá un navegador moderno con WebAssembly y memoria suficiente para un modelo de voz. El primer uso descarga más de 100 MB de modelos y recursos. CPU funciona en el navegador probado; WebGPU depende del navegador y el dispositivo. Los controles están en inglés y hay voces de inglés de Estados Unidos y español latinoamericano.',
      steps: [
        'Abrí Kokoro Web. Dejá Acceleration en CPU y el modelo instalado de 8 bits. En Language accent (region), elegí English (US) o Spanish. El selector simple Voice ofrece la voz correspondiente.',
        'Reemplazá Text to process por una frase breve, como «Hola. Esta es una prueba ficticia.» o «Hello. This is a fictional sample.». Generate Voice descarga los archivos locales necesarios y procesa el texto en tu navegador. Mantené la pestaña abierta mientras trabaja.',
        'Usá Play y Pause debajo de Output para revisar la pronunciación. Usá Download audio para guardar el resultado y abrilo después en un reproductor. Esta instalación exporta WAV a velocidad normal; no ofrece conversión a MP3 ni cambios de velocidad.',
        'Para reutilizar el texto y los ajustes, usá Save profile y escribí un nombre. Después de recargar, seleccioná ese perfil para restaurarlo. Guardar un perfil también guarda su texto en este navegador; no es una cuenta ni una copia del archivo de audio.',
        'Para borrar un perfil, seleccionalo, usá Delete profile y confirmá. Recargá para comprobar que desapareció. Para quitar también los modelos en caché y todos los datos guardados, usá los controles de datos del sitio del navegador. El origen tools se comparte con otras aplicaciones: conservá su trabajo antes de borrarlo.',
      ],
      success: 'Las frases ficticias en inglés y español produjeron archivos WAV válidos de 24 kHz, con audio no silencioso y reproducción nativa funcional. Se comprobó guardar, reabrir y borrar un perfil. Estas pruebas no garantizan la pronunciación de todos los nombres, acentos o textos largos.',
      troubleshooting: 'La primera generación puede demorar mientras descarga los archivos y carga el modelo. Probá una frase más corta y CPU si falla WebGPU. Un dispositivo con poca memoria puede no completar la tarea. Escuchá antes de compartir: la voz sintética puede pronunciar mal o sonar poco natural. Esta herramienta no graba tu micrófono ni clona una voz.',
      privacy: 'En el flujo probado, el texto y el audio generado quedan en el navegador. Las solicitudes de la aplicación y el modelo van a Utilibre; no se usa inferencia externa. El trabajo sin guardar y el audio viven en la memoria de la página. Los perfiles, el tema y los modelos y voces en caché pueden persistir al cerrar la pestaña. Las descargas permanecen en tu dispositivo hasta que las borrés. Los enlaces nativos al código y al autor abren sitios externos si los seguís.',
      next: 'Conservá el WAV y el texto original si vas a cambiar la redacción después. Protegé las grabaciones descargadas que contengan información privada.',
    },
  },
}];
