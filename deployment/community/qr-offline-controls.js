// Adapter to QR Tools' existing PWA methods; no new service worker.
document.addEventListener('DOMContentLoaded', () => {
  const es = document.documentElement.lang === 'es';
  const text = (en, spanish) => es ? spanish : en;
  const section = document.createElement('section'); section.className = 'container'; section.id = 'offline-controls';
  const heading = document.createElement('h2'); heading.textContent = text('Offline assets', 'Archivos para uso sin conexión');
  const explanation = document.createElement('p'); explanation.textContent = text('Test by disconnecting and reopening this app. Cached bytes or an installed icon do not prove offline readiness. Download QR results before removing assets.', 'Probá desconectando y reabriendo la aplicación. El tamaño guardado o un ícono instalado no prueban que esté lista. Descargá tus QR antes de quitar archivos.');
  const status = document.createElement('p'); status.role = 'status'; status.ariaLive = 'polite';
  const button = (label, action) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.textContent = label; b.addEventListener('click', async () => { b.disabled = true; try { await action(); } catch { status.textContent = text('Action blocked. No change is confirmed.', 'Acción bloqueada. No se confirmó ningún cambio.'); } finally { b.disabled = false; } }); return b; };
  const size = button(text('Show cached asset size', 'Ver tamaño de archivos guardados'), async () => { const bytes = await window.pwa.getCacheSize(); status.textContent = `${bytes.toLocaleString()} ${text('bytes cached here; test offline before relying on them.', 'bytes guardados aquí; probá sin conexión antes de depender de ellos.')}`; });
  const update = button(text('Check for an update', 'Buscar una actualización'), async () => { await window.pwa.checkForUpdates(); status.textContent = text('Update check requested. Reopen online, then test offline again. This does not confirm a new release was downloaded.', 'Se solicitó revisar actualizaciones. Reabrí con conexión y probá sin red otra vez. Esto no confirma que se descargó una versión nueva.'); });
  const remove = button(text('Remove offline assets only', 'Quitar solo archivos sin conexión'), async () => {
    if (!confirm(text('Remove cached application files? History and preferences remain. A connection is needed to prepare again.', '¿Quitar archivos de la aplicación? El historial y las preferencias quedan. Necesitás conexión para prepararla otra vez.'))) return;
    const ok = await window.pwa.clearCache(); status.textContent = ok ? text('Cached assets removed. History and preferences were not cleared. Revisiting online can cache assets again.', 'Caché eliminada. No se borraron historial ni preferencias. Una visita con conexión puede guardar archivos otra vez.') : text('Removal failed. No deletion is confirmed.', 'Falló el borrado. No se confirmó la eliminación.');
  });
  const back = document.createElement('a'); back.href = `https://utilibre.org/${es ? 'es/herramientas-sin-conexion' : 'en/offline-tools'}`; back.textContent = text('Offline guide · Utilibre', 'Guía sin conexión · Utilibre');
  section.append(heading, explanation, size, update, remove, status, back); document.querySelector('footer')?.before(section);
});
