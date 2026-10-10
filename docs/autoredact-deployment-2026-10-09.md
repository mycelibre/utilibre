# AutoRedact deployment, 9 October 2026

Public: `https://tools.utilibre.org/apps/autoredact/`. Native browser OCR/redaction only, no Node/API/CLI service, container, upload endpoint, database, port or new provider. The app and workers/models are served through existing tools infrastructure.

## Pin, licence and patch

Original [karant-dev/AutoRedact](https://github.com/karant-dev/AutoRedact), 2.1.3, commit `360fc18b976b9278b73d00e2c49e26c76de6557a`; installed `2.1.3-p1`. The root npm licence declaration is `GPL-3.0`, a deprecated but defined SPDX identifier normalized to `GPL-3.0-only` in the inventory. The matching GNU GPLv3 text and all component notices remain unchanged; see the [declared-metadata review](license-review.md#declared-metadata-correction-9-october).

`deployment/toolbox/autoredact/local-source.patch` SHA256 `f5d249a64dac0d75427cb3692c31c1f68c883168034c42ef3521ffe1b737b60b` changes native base/OCR/PDF asset paths, packages Inter locally, removes recognized-text console logging, corrects overconfident automatic-redaction/unlimited-PDF copy, adds a plain portal link, refreshes compatible dependencies and moves PDF.js to fixed6.2.108. The final production audit has zero reported advisories. This is not a claim that vulnerabilities cannot exist.

Tesseract.js7 and its exact matching core are pinned by the lockfile. Native English integerized LSTM model `@tesseract.js-data/eng@1.0.0/4.0.0_best_int/eng.traineddata.gz` is local; the [official model repository](https://github.com/naptha/tessdata) supports this mode and supplies Apache-2.0 at `806cd9adc8c6e8abc11c782db1818c990576bebc`. The npm wrapper says MIT. Local Inter is OFL-1.1; Tesseract/core/PDF notices are included. No copied model from an incompatible installed version is assumed.

Source offer: `https://tools.utilibre.org/utilibre-source/autoredact-utilibre.tar.gz?revision=0bb53bb4dd02`; SHA256 `0bb53bb4dd02ca96948b8e12a7d8673127c42860e37e0ed69965751d774ab70d`. It includes exact original source, patch, lock, build/check recipes and notices, with no private user state. The [metadata-only refresh](source-metadata-refresh-2026-10-09.md) corrected the packaged licence description; original source, patch and six dependency notices are unchanged. Original-source apply/reverse checks and downloaded public hash pass. Remove the patch as upstream gains equivalent local deployment settings and accurate copy.

## Behavior, privacy and limits

Native recognized regions are drawn as solid black rectangles and flattened into PNG. Images/PDFs and detected text stay in browser memory; OCR-text debug logging is removed. Detection settings, allowlists and custom words/dates/regexes remain in localStorage after tab closure. Native OCR model IndexedDB caching is disabled; ordinary static-asset caching remains useful and unchanged. Reset/Process Another Image clears current files, not all saved rules. Clear rules through native settings or the shared tools origin's site data; the latter affects other apps there. Downloads remain on the device.

Only the English model is configured and the UI is English. Native Safe Values excludes common router/loopback/DNS addresses by default. Automated detection can miss data, so the guide requires inspection of every exported page. PDFs are limited to10MiB/20pages and rasterized: image-only output omits text layers, forms, links and document structure. Large files/batches consume client memory; there is no server OCR workload.

Native PDF and ZIP conversion uses `fetch(data:image/png…)`. Its dedicated gateway `security.conf` permits `data:` in connect-src without allowing an outside host; inherited worker/WASM/image policies remain. The policy is scoped only to AutoRedact in the OmniTools gateway. Initial PDF test proved the generic policy blocks that local operation; no remote fallback was added. Cloudflare/Caddy/Hetzner still process asset-delivery metadata, with retention separate from application state.

## Verification and resources

Private reports: `/opt/utilibre/reports/autoredact-20261009`. Desktop1280×900 and mobile375×812 fictional image tests passed, including exact opaque black output pixels over sample@example.com and documentation address203.0.113.42, an unchanged green strip, readable visual output and Reset. Native two-page fictional PDF import/raster/OCR passed, followed by a ZIP containing two PNGs and a PDF reopened as two image-only pages with no text layer. No detection accuracy guarantee follows from those examples.

Private checks completed before atomic publication; the equivalent public image/batch checks pass with no automatic outside HTTP requests, upload requests, page errors or console errors. Public assets and source return200; the app has local CSP and no-cache HTML. Build/type checking passes within2GiB/2CPU. Static output approximately29MiB, chiefly local OCR/PDF resources; no additional runtime workers or container RAM. Completed private node_modules and copied vendor intermediates were removed, preserving pinned source/lock/dist/source archive and reports.

Portal modules `catalog/autoredact-addition.ts` and `pages/autoredact-guide.ts` plus `public/examples/autoredact-fictional.png` provide an EN/ES voseo guide. Its sample is reproducible from check.mjs, with fictional data only. Root owns shared aggregation/status/source-manifest deployment. Roll back only this app's static directory and scoped gateway include; never clear users' browser rules or unrelated service state.
