// Official WBO_HTML_HEAD_SNIPPET_PATH hook. No scene access or network calls.
document.addEventListener('DOMContentLoaded', () => {
  if (!location.pathname.includes('/boards/')) return;
  const key = 'utilibre.wbo.pilot-notice.v1';
  try { if (sessionStorage.getItem(key) === 'read') return; } catch { /* Show each time if storage is unavailable. */ }
  const es = document.documentElement.lang.toLowerCase().startsWith('es');
  const dialog = document.createElement('dialog'); dialog.id = 'utilibre-notice'; dialog.setAttribute('aria-labelledby', 'utilibre-notice-title');
  const heading = document.createElement('h2'); heading.id = 'utilibre-notice-title'; heading.textContent = es ? 'Pizarra temporal, no privada' : 'Temporary board, not private';
  const message = document.createElement('p'); message.textContent = es
    ? 'Cualquiera con el enlace puede leer y editar. El servidor procesa el dibujo; no hay cifrado de extremo a extremo. No usés datos sensibles. Las pizarras se pierden al reiniciar el servicio; cerrar la pestaña no las borra. Al superar 256 objetos se descartan los más antiguos. Exportá SVG con Descargar.'
    : 'Anyone with the link can read and edit. The server processes the drawing; there is no end-to-end encryption. Do not use sensitive information. Boards are lost when the service restarts; closing a tab does not delete them. Above 256 objects, the oldest are discarded. Export SVG using Download.';
  const back = document.createElement('a'); back.href = `https://utilibre.org/${es ? 'es' : 'en'}/`; back.textContent = es ? 'Volver a Utilibre' : 'Back to Utilibre';
  const more = document.createElement('a'); more.href = `/?lang=${es ? 'es' : 'en'}`; more.textContent = es ? 'Privacidad e instrucciones' : 'Privacy and instructions';
  const proceed = document.createElement('button'); proceed.type = 'button'; proceed.textContent = es ? 'Continuar con datos no sensibles' : 'Continue with non-sensitive content';
  proceed.addEventListener('click', () => { try { sessionStorage.setItem(key, 'read'); } catch { /* No persistence required. */ } dialog.close(); });
  dialog.append(heading, message, more, document.createElement('hr'), proceed, document.createTextNode(' · '), back); document.body.append(dialog); dialog.showModal();
});
