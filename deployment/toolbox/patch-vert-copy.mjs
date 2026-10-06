// Describe this local-only installation, preserving upstream attribution.
import { readFileSync, writeFileSync } from 'node:fs';
const copy = {
  en: {
    processing: 'This Utilibre installation converts supported files on your device. Remote video conversion is disabled. Available formats and file sizes depend on your browser and device memory. Download important results before closing the page.',
    privacy: 'This is an independently hosted VERT installation. Selected files are processed in your browser; there is no file-upload endpoint. The web host and HTTPS edge receive ordinary page and asset requests, including network metadata. Browser caches and preferences may remain on your device. Embedded analytics, remote conversion and payment scripts are disabled.',
    analytics: 'Embedded analytics are disabled in this installation. This does not mean that network requests to the website or HTTPS edge are invisible.',
    errors: 'Remote conversion and automatic error uploads are disabled here. If a conversion fails, try a smaller file or another supported format.',
    donations: 'There is no embedded payment processor in this installation. Any upstream support links fund the VERT developers, not Utilibre.',
    local: 'Your browser can retain preferences and processing code. Clear site data in your browser to remove them. Utilibre does not keep a server-side copy of your work.',
    video: 'Browser conversion only; remote video processing is disabled.',
  },
  es: {
    processing: 'Esta instalación de Utilibre convierte los archivos compatibles en tu dispositivo. La conversión remota de video está desactivada. Los formatos y tamaños disponibles dependen de tu navegador y de la memoria de tu dispositivo. Descargá los resultados importantes antes de cerrar la página.',
    privacy: 'Esta es una instalación independiente de VERT. Los archivos que elegís se procesan en tu navegador; no hay un servicio para subirlos. El alojamiento web y el servidor HTTPS reciben las solicitudes normales de páginas y recursos, incluidos los datos de conexión. Tu dispositivo puede conservar cachés y preferencias. Las estadísticas integradas, la conversión remota y los scripts de pago están desactivados.',
    analytics: 'Las estadísticas integradas están desactivadas en esta instalación. Esto no significa que las conexiones al sitio o al servidor HTTPS sean invisibles.',
    errors: 'La conversión remota y el envío automático de errores están desactivados. Si una conversión falla, probá con un archivo más pequeño o con otro formato compatible.',
    donations: 'Esta instalación no incluye un procesador de pagos. Los enlaces de apoyo al proyecto original financian a quienes desarrollan VERT, no a Utilibre.',
    local: 'Tu navegador puede conservar preferencias y código de procesamiento. Para quitarlos, borrá los datos del sitio en tu navegador. Utilibre no guarda una copia de tu trabajo en el servidor.',
    video: 'Solo conversión en el navegador; el procesamiento remoto de video está desactivado.',
  },
};
for (const [locale, text] of Object.entries(copy)) {
  const path = `messages/${locale}.json`;
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.upload.subtitle = text.processing;
  data.upload.cards.video_server_processing = text.video;
  data.upload.tooltip.video_server_processing = text.video;
  data.about.why.description = text.processing;
  data.privacy.summary.description = text.privacy;
  data.privacy.conversions.description = text.processing;
  data.privacy.analytics.description = text.analytics;
  data.privacy.donations.description = text.donations;
  data.privacy.local_storage.description = text.local;
  data.privacy.conversion_errors.description = text.errors;
  data.privacy.conversion_errors.footer = text.errors;
  // Do not leave an apparent list of data that this build automatically uploads.
  for (const key of Object.keys(data.privacy.conversion_errors)) {
    if (key.startsWith('list_')) data.privacy.conversion_errors[key] = '';
  }
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
