// Independent Utilibre hosting. No cloud accounts, remote conversion, tracking,
// or URL proxy. Save diagrams to the device; local browser storage may persist.
window.DRAWIO_BASE_URL = window.location.origin;
window.DRAWIO_VIEWER_URL = window.location.origin + '/js/viewer.min.js';
window.DRAWIO_LIGHTBOX_URL = window.location.origin;
window.EXPORT_URL = '';
window.PLANT_URL = '';
window.DRAWIO_GITLAB_URL = '';
window.DRAWIO_CONFIG = { defaultFonts: ['Arial', 'Helvetica', 'Times New Roman', 'Courier New'] };
// Native Minimal UI fits narrow screens. Preserve explicit theme choices and
// the regular desktop UI; no custom toolbar or upstream markup changes.
if (!urlParams['ui'] && window.matchMedia('(max-width: 600px)').matches) {
  urlParams['ui'] = 'min';
}
urlParams['offline'] = '1';
urlParams['local'] = '1';
urlParams['noDevice'] = '0';
urlParams['gapi'] = '0';
urlParams['db'] = '0';
urlParams['od'] = '0';
urlParams['gh'] = '0';
urlParams['gl'] = '0';
urlParams['tr'] = '0';
