// Set only a verified upstream UI preference. Never accept an arbitrary
// storage key, redirect URL, document ID, or encrypted-secret fragment.
(async () => {
  const url = new URL(location.href);
  const lang = url.searchParams.get('lang') === 'es' ? 'es' : 'en';
  const settings = {
    'convert.utilibre.org': { keys: ['PARAGLIDE_LOCALE', 'locale'], path: '/' },
    'dev.utilibre.org': { keys: ['locale'], path: '/' },
    'secret.utilibre.org': { keys: ['i18nextLng'], path: '/' },
    'drop.utilibre.org': { keys: ['language_code'], path: '/' },
    'status.utilibre.org': { keys: ['locale'], path: '/status/utilibre' },
    'design.utilibre.org': { keys: ['penpot-global:app.util.i18n/locale'], path: '/', json: true },
    'pollaris.utilibre.org': { keys: [], path: '/', nativePreferences: true },
    'twitch.utilibre.org': { keys: ['language'], path: '/', locales: { es: 'es-ES', en: 'en-US' } },
  }[location.hostname];
  if (!settings) return;
  document.documentElement.lang = lang;
  document.getElementById('continue').href = settings.path;
  try {
    if (settings.nativePreferences) {
      // Pollaris stores locale in its server session. Submit its native,
      // CSRF-protected preferences form instead of inventing a cookie.
      const response = await fetch('/preferences', { credentials: 'same-origin', referrer: `${location.origin}/` });
      if (!response.ok) throw new Error('preferences_unavailable');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const form = doc.querySelector('form[name="preferences"]');
      if (!form) throw new Error('preferences_form_missing');
      const data = new FormData(form);
      data.set('preferences[locale]', lang === 'es' ? 'es' : 'en_GB');
      const saved = await fetch('/preferences', { method: 'POST', body: data, credentials: 'same-origin', referrer: `${location.origin}/` });
      if (!saved.ok) throw new Error('preferences_not_saved');
    }
    const locale = settings.locales?.[lang] || lang;
    for (const key of settings.keys) localStorage.setItem(key, settings.json ? JSON.stringify(locale) : locale);
    location.replace(settings.path);
  } catch {
    document.getElementById('message').textContent = lang === 'es'
      ? 'No se pudo guardar el idioma. Continuá y elegí Español dentro de la herramienta.'
      : 'The language preference could not be saved. Continue and choose a language in the tool.';
  }
})();
