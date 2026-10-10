# Knit deployment, 9 October 2026

Pinned upstream commit `42be1d858273e2e1dad3c6b379a4219057b5176d` from [alefore/knit](https://github.com/alefore/knit/tree/42be1d858273e2e1dad3c6b379a4219057b5176d). Its package version is 1.0.0 and no stable GitHub release was published at review. Utilibre build `1.0.0-42be1d8-p1` is installed at `https://tools.utilibre.org/apps/knit/`, using the existing static toolbox server. No container, account, port or backend is added. Native controls stay English; the compact operator note, portal return links and guide have equivalent English/Spanish text with voseo.

## Licence and build

The root `LICENSE` contains GNU GPL version 3; `package.json` and `package-lock.json` instead identify ISC. Both are free-software licences, but the intended grant and GNU version scope need upstream clarification. Preserve both original notices; use the explicit human label `GNU GPLv3 (version scope unconfirmed)` and do not arbitrarily infer `-only` or `-or-later`. `LICENSE.txt` and `LICENCE-NOTE.txt` explain this in the installed package. The complete pinned application source is offered, including the original package metadata. This is not a claim that ISC overrides the repository licence.

`deployment/knit/build.py` extracts the exact Git pin, applies `local-static.patch` with zero fuzz, installs only the upstream lockfile's TypeScript 5.9.3 using `npm ci --ignore-scripts`, and runs native `tsc`. No runtime npm dependency exists. Locked npm audit returned zero reported vulnerabilities; GitHub's public advisory endpoint returned no published advisories. Neither result certifies absence of defects. The installed bundle is about 188 KiB. Repeated builds produced identical `build.json` hashes.

Small patch scope:

- Add noindex/referrer metadata and a per-app CSP permitting only its local scripts, inline style and local/data images; network connections are blocked.
- Add an EN/ES note in a reserved bottom area of the existing layout, with portal/source/licence links. Keep pattern controls reachable at 390px.
- Change the existing GitHub help navigation to HTTPS with `noopener,noreferrer`.
- Use optional chaining when selecting a row while an invalid numeric input temporarily leaves no pattern.
- Restore row selection after the constructor's final render. Before this fix a saved row URL reopened without a highlighted row because the final render erased it.

Remove these functional corrections once upstream passes invalid-input and saved-row round trips. Remove packaging overrides when a supported upstream setting provides the same local-asset, note and CSP behavior. No design-generation or retention algorithm was replaced.

## Data and recovery

Included native pattern families are Cables, Capelet, Triangles and Sophie Scarf. Pattern computation and row selection run in the browser. The URL fragment contains non-default input settings and current row; it is not sent in HTTP requests. It can remain in browser history, bookmarks, clipboard or copied links after closing a tab. Sharing a full URL shares that state. Row-visit times remain in page memory and are not part of this saved URL. The inspected app does not use localStorage, IndexedDB, cookies, fetch, WebSocket or an external asset provider for pattern state.

Native save/recovery is a full-URL bookmark or copy, not a PDF/document export. A fresh browser can reopen the URL to regenerate the pattern and current row. An old copied URL does not advance when another tab advances. Opening the base URL without the fragment resets this view to defaults; delete unwanted links/bookmarks/history independently. There is no Utilibre user account or server-held pattern to recover/delete and no operator backup of local work. Application delivery still creates normal connection metadata through Cloudflare/Hetzner; edge/security/provider retention is not established by these browser checks. Deliberately opened help links are separate navigation.

## Verification and rollout

`node deployment/knit/check.mjs URL` uses only fictional settings and disposable browser contexts. Passed English desktop and Spanish-locale 390px: change cable count to six; start; advance two rows; preserve complete URL; reopen in a fresh context with identical pattern/row; remove fragment and reload defaults; open bilingual notes; no horizontal overflow; no page errors, localStorage state or external HTTP requests. Pinned source confirms no IndexedDB use. Browser viewport emulation does not test every physical phone or yarn/pattern correctness.

Artifacts/evidence: `/opt/utilibre/reports/knit-newton-20261009/knit-results.json` and screenshots. Publishing uses a new staged directory under `/opt/utilibre/toolbox-public/apps/` and atomic rename. Future static updates must retain the previous directory for rollback; no user database or existing backup schedule changes. Source archive `https://tools.utilibre.org/utilibre-source/knit-utilibre.tar.gz` contains pinned source, licence/package notices, exact patch/build/check and this report. `build.json` contains file hashes, not user data.
