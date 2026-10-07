// Reuse the supplied identity unchanged. Docker provides the same files via a
// narrow branding context; npm builds copy them from this repository.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
const files = [['svg/utilibre-logo-coral.svg', 'utilibre-logo-coral.svg'], ['README.txt', 'BRAND-NOTICE.txt']];
mkdirSync('public', { recursive: true });
for (const [from, to] of files) {
  const source = new URL(`../../../portal/public/brand/${from}`, import.meta.url);
  if (existsSync(source)) copyFileSync(source, `public/${to}`);
  else if (!existsSync(`public/${to}`)) throw new Error(`Missing supplied brand asset: ${to}`);
}
