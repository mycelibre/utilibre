# Moocup deployment, 9 October 2026

Moocup is deployed as static files at `https://tools.utilibre.org/apps/moocup/`. It adds no container, database, worker, port or DNS record. The existing tools gateway serves the app under its local-only CSP, GET/HEAD restriction and `no-cache, no-transform` HTML policy. This is the native screenshot styling editor, not an upload or redaction service.

## Source and reproducibility

- Original [jellydeck/moocup](https://github.com/jellydeck/moocup), tag `1.0.50`, revision `70623d81ba502a464fdd2b98c6c21b1c5ab973bc`; native package.json still says `1.0.0`. Installed label `1.0.50-p1`.
- MIT, actual pinned LICENSE checked; Recursive font package `@fontsource-variable/recursive@5.3.0` is OFL-1.1. html2canvas 1.4.1 remains the native MIT renderer.
- Pinned checkout `/opt/utilibre/src/moocup`; recipes and exact patch in `deployment/toolbox/moocup/`. Patch SHA256 `6d647dfb124a30935686ae2f42648b039610101d4642bebaeb96a286b4b30e31`.
- Changes remove analytics, replace Google Fonts with local Recursive assets, set the native SvelteKit base path, scope IndexedDB/sample keys, add a plain portal link, label mobile export/reset controls and keep the mobile header usable. No export backend or replacement renderer was introduced.
- Compatible dependency/lock refresh reduces the checked production audit from 32 advisories to two low advisories: cookie attribute validation and esbuild's Windows development server. No Node SSR or development server is deployed. Zero moderate/high/critical findings in this audit is not a guarantee of vulnerability absence.
- Source offer: `https://tools.utilibre.org/utilibre-source/moocup-utilibre.tar.gz`, SHA256 `e982eb3f6489e4dc940123018a46956026b43c6e81702ca3d590409446066421`. It contains the exact original tree, patch including lock changes, build/check recipes and font notice; no browser state or private reports. Apply and reverse checks pass against the original archived source.
- Remove the patch when equivalent upstream analytics-free/local-font/base-path/scoped-storage support is verified. Rebuild from the pin with Node 24, pnpm 10.20.0 and the frozen lock, not an unpinned upstream image.

## Native behavior and privacy

Images, backgrounds and rendering stay in the browser. Source inspection plus desktop/mobile network capture found no automatic external requests or uploads. Source/donation links remain deliberate external navigation. Cloudflare HTTPS, Caddy and Hetzner still process application-delivery connection metadata; this test does not establish their retention.

The current image, settings and custom backgrounds persist in IndexedDB (`utilibre-moocup-db`) after tab closure. Native demo selection uses the separate `utilibre-moocup-demoImage` localStorage key. The tools origin is shared with other installed browser apps; namespacing prevents accidental key collisions, not a cross-application security boundary. Clearing tools.utilibre.org browser data also clears other apps' saved work there. The test preserved a separate sentinel key.

Reset clears the current image/transforms/border settings but not all saved backgrounds. There is no server account, server image backup or editable-project export. PNG/JPEG/WebP are flattened results; downloaded files persist on the device. Main files at least 2 MiB are resized to fit 2400×1800; native custom backgrounds allow PNG/JPEG through 10 MiB. Standard/High/Ultra change browser rendering scale; large jobs depend on browser memory. The native UI is English; Utilibre's guide is EN/ES with voseo. Complex transformations and physical printing were not exhaustively verified.

## Verification

Private reports: `/opt/utilibre/reports/moocup-20261009`. `check.mjs` creates only a fictional 500×280 screenshot and exercises native drag/drop, reload persistence, three desktop exports, mobile PNG, Reset/reload and preservation of an unrelated storage key. Exported pictures were visually checked for fictional text and colored panels. Both 1280×800 and 375×812 layouts fit without horizontal overflow; mobile controls have accessible labels. The test captures requests and rejects outside HTTP requests, uploads, uncaught errors and console errors. An initial selector clicked an already-selected radio and deselected the format; the corrected test uses actual radio state. No application export failure remained.

`pnpm check`: zero errors/warnings. Production build passes inside a 2 GiB memory/2 CPU scope. Output approximately 13 MiB; dependencies approximately 324 MiB, disposable after source publication. Runtime is static asset delivery; rendering and saved work are client-side. No production capacity guarantee is inferred from these fictional tasks.

Private checks and static scan passed before atomic publication. Public response 200, base-path assets, local-only CSP, camera/microphone/geolocation denial, no-cache HTML and Cloudflare DYNAMIC were verified. Final public native replay is recorded separately in `public-result.json`.

## Integration and rollback

New portal modules: `portal/src/catalog/moocup-addition.ts` exports `moocupAdditions`; `portal/src/pages/moocup-guide.ts` exports `moocupGuides`. Provider id `moocup`, publicToolsUrl + `/apps/moocup/`; guides `/en/guides/style-screenshot` and `/es/guias/preparar-captura`. Parent release integrates registry/provider/status/source links and deploys the portal separately. The public native app is independently usable.

Withdraw or replace only `/opt/utilibre/toolbox-public/apps/moocup/`, retaining prior versions outside the public root if updating. Do not clear browser state, restart unrelated services or prune backups. Keep the original pin, patch, exact lock and source archive for reproducibility.
