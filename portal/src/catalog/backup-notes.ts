// Shared copy for saved-work services explicitly covered by the native backup
// selector. Rechecked 12 October 2026 against deployment/storagebox/backup-native.mjs,
// its successful 25-group receipt and retention.mjs. Local generation policies
// remain separate. Do not use this for browser-only or temporary-content tools.
export const savedWorkBackupNotice = {
  en: 'Daily local backups have no automatic expiry. Encrypted off-host copies in Hetzner Storage Box use separate seven-daily/four-weekly retention; the periods overlap and are not exact deletion deadlines.',
  es: 'Los respaldos locales diarios no vencen automáticamente. Las copias externas cifradas en Hetzner Storage Box tienen una conservación separada de siete diarias y cuatro semanales; los periodos se superponen y no fijan un plazo exacto de borrado.',
};
