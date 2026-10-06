// Set only a verified upstream UI preference. Never accept an arbitrary
// storage key, redirect URL, document ID, or encrypted-secret fragment.
(() => {
  const url = new URL(location.href);
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
  const settings = {
    'convert.utilibre.org': { keys: ['PARAGLIDE_LOCALE', 'locale'], path: '/' },
    'dev.utilibre.org': { keys: ['locale'], path: '/' },
    'secret.utilibre.org': { keys: ['i18nextLng'], path: '/' },
    'drop.utilibre.org': { keys: ['language_code'], path: '/' },
    'status.utilibre.org': { keys: ['locale'], path: '/status/utilibre' },
    'design.utilibre.org': { keys: ['penpot-global:app.util.i18n/locale'], path: '/', json: true },
  }[location.hostname];
  if (!settings) return;
  document.documentElement.lang = lang;
  document.getElementById('continue').href = settings.path;
  try {
    for (const key of settings.keys) localStorage.setItem(key, settings.json ? JSON.stringify(lang) : lang);
    location.replace(settings.path);
  } catch {
    document.getElementById('message').textContent = lang === 'es'
      ? 'No se pudo guardar el idioma. Continuá y elegí Español dentro de la herramienta.'
      : 'The language preference could not be saved. Continue and choose a language in the tool.';
  }
})();
