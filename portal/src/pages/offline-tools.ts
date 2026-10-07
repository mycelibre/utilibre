import { catalogEntry } from '../catalog/catalog';
import { entryLaunch } from '../catalog/discovery';
import type { PublicConfig } from '../config';
import type { Language } from '../i18n';
import { append, element } from '../utilities/dom';

export function renderOfflineTools(lang: Language, config: PublicConfig): HTMLElement {
  const es = lang === 'es'; const text = (en: string, spanish: string) => es ? spanish : en;
  const main = element('main', 'page-shell task-guide'); main.id = 'main-content'; main.tabIndex = -1;
  const header = element('header', 'page-header'); append(header, element('h1', '', text('Take QR Tools offline', 'Usá QR Tools sin conexión')), element('p', 'hero-lead', text('Create codes and export results without a connection after preparing this application on your device.', 'Creá códigos y exportá resultados sin conexión después de preparar esta aplicación en tu dispositivo.'))); main.append(header);
  const entry = catalogEntry('qr-offline'); const launch = entry && entryLaunch(entry, lang, config);
  if (launch) { const a = element('a', 'button', text('Prepare inside QR Tools', 'Preparar dentro de QR Tools')); a.href = launch.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; main.append(a); }
  const section = (heading: string, paragraphs: string[]) => { const s = element('section', 'section prose'); s.append(element('h2', '', heading)); for (const p of paragraphs) s.append(element('p', '', p)); main.append(s); return s; };
  const steps = section(text('Prepare and check', 'Prepará y comprobá'), []); const ol = element('ol');
  const instructions = es ? [
    'Con conexión, abrí QR Tools y esperá a que termine de cargar. La aplicación descarga sus propios archivos; el portal no prepara otros subdominios. En un navegador compatible podés usar Instalar; no es necesario para probar la pestaña.',
    'Elegí URL, escribí https://utilibre.org/ y generá un código. Exportá PNG y abrilo. Abrir el destino de ese QR sí requiere conexión.',
    'Desconectá la red de prueba, cerrá la pestaña y volvé a abrir la misma dirección. Creá un QR de texto y exportá PNG. Si falla, reconectá, recargá y repetí la prueba. Una preparación interrumpida no demuestra disponibilidad.',
    'Volvé a conectar para recibir actualizaciones. En Archivos para uso sin conexión podés ver los bytes guardados y pedir una revisión de actualizaciones. Reabrí y repetí la prueba sin red; el tamaño guardado no certifica que todo esté listo.',
    'Para recuperar espacio, descargá tus resultados y elegí Quitar solo archivos sin conexión dentro de QR Tools. Confirmá el aviso. Esta acción conserva historial y preferencias; una visita posterior con conexión puede descargar archivos otra vez.',
  ] : [
    'While online, open QR Tools and wait for it to load. The application downloads its own assets; the portal cannot prepare other subdomains. A compatible browser may offer Install; installation is not required to test a tab.',
    'Choose URL, enter https://utilibre.org/ and generate a code. Export PNG and open it. Following the URL encoded by that QR still needs a connection.',
    'Disconnect the test network, close the tab and reopen the same address. Create a text QR and export PNG. If this fails, reconnect, reload and test again. Interrupted preparation is not proof of availability.',
    'Reconnect for updates. Under Offline assets, inspect cached bytes or request an update check. Reopen and repeat the disconnected test; a cache size does not certify readiness.',
    'To reclaim space, download your results and choose Remove offline assets only inside QR Tools. Confirm the notice. This keeps history and preferences; a later online visit may cache assets again.',
  ]; for (const step of instructions) ol.append(element('li', '', step)); steps.append(ol);
  section(text('What works—and what is not promised', 'Qué funciona y qué no se promete'), [text('The tested path is QR creation and PNG/SVG/PDF export in Chromium. Scanning needs a compatible camera/browser and separate permission; physical-phone camera and OS installation were not tested here. We do not show “ready on this device”: the portal cannot read the QR application’s cache across origins.', 'Se probó crear QR y exportar PNG/SVG/PDF en Chromium. Escanear necesita cámara y navegador compatibles y permiso aparte; aquí no se probó cámara de teléfono físico ni instalación del sistema operativo. No mostramos “listo en este dispositivo”: el portal no puede leer la caché de otro origen.'), text('There is no universal offline portal. PairDrop needs online signaling to connect devices; SearXNG and Redlib need their servers. An already-open editor working after disconnection is not a verified fresh offline launch.', 'No hay un portal universal sin conexión. PairDrop necesita señalización en línea para conectar dispositivos; SearXNG y Redlib necesitan sus servidores. Que un editor abierto siga funcionando al desconectar no prueba que abra de nuevo sin red.')]);
  section(text('Storage, removal and recovery', 'Almacenamiento, borrado y recuperación'), [text('Cached application files are separate from downloaded QR results and history you enabled. Browser site-data reset is broader: it can erase history and preferences as well as assets. Do not confuse that reset with the asset-only button. Browsers may evict caches under storage pressure, so keep important downloads and test before travel.', 'Los archivos de la aplicación son distintos de tus QR descargados y del historial que hayás activado. Restablecer datos del sitio desde el navegador es más amplio: puede borrar historial, preferencias y archivos. No lo confundás con el botón que quita solo caché. El navegador puede liberar cachés por falta de espacio; conservá descargas importantes y probá antes de viajar.')]);
  const guide = element('a', '', text('Create and test a QR code', 'Crear y probar un código QR')); guide.href = `/${lang}/${es ? 'codigos-qr' : 'qr-codes'}`; main.append(guide); return main;
}
