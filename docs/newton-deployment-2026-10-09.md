# NewTon browser edition deployment, 9 October 2026

Latest stable [NewTon v5.4.0](https://github.com/skrodahl/NewTon/releases/tag/v5.4.0), released 8 October 2026, pinned to `226d6080ea40e1dcc67c628e355bc826a7848858`. Utilibre `5.4.0-p1` is installed at `https://tools.utilibre.org/apps/newton/`. This is the free-software browser tournament manager, using the existing static toolbox mount. No PHP runtime, tournament API, server database, account, new container or port is installed.

## Free-software and security boundary

The pinned root `LICENSE` grants BSD-3-Clause and explicitly excludes `licensed/`, whose experimental network code has a separate proprietary revocable grant. The entire `licensed/` tree is excluded from the build and source offer. The licence states that the rest of the application does not depend on it. This deployment also excludes the PHP API, server tournament files, Chalker companion, upstream payment QR and bundled fonts, whose individual grants were not supplied alongside those files. Native system font fallbacks are used instead. The original BSD scope notice and disclaimer are preserved verbatim; excluded proprietary code is not relicensed as BSD.

The included QR libraries carry MIT (qrcode-generator) and Apache-2.0 (jsQR) grants. Original upstream `THIRD-PARTY-LICENSES.md` remains available, together with full licence texts and retrieval hashes under `deployment/newton/licenses/`. The original notice also describes the uninstalled Chalker libraries; it is preserved as upstream attribution, not a claim that Chalker is deployed. Native QR handover is disabled here. The bundled JS/CSS is pinned in the upstream tree, not downloaded from CDNs at runtime. GitHub's public advisory endpoint returned no published advisories on review; no claim of a complete vulnerability audit is made.

`deployment/newton/build.py` extracts only an allowlisted free-software subtree, applies `local-static.patch` with zero fuzz and emits static files plus `build.json` hashes. No package manager or image build is needed. Installed assets are about 2 MiB; processing/storage demand is on the browser. Repeated builds produced identical artifact hashes. Original NewTon attribution remains visible.

The patch is limited to this edition's browser boundary and observed defects:

- Replace the embedded PHP configuration block with fixed native full/browser configuration plus a local `offlineOnly` flag. No API credential is embedded.
- Skip automatic shared-tournament discovery, disk import and server correction requests. Guard automatic upload even when imported settings request it. Per-app CSP blocks all connection requests, forms, frames, remote resources and font downloads. No application API endpoint is installed.
- Remove the proprietary client script and Chalker navigation. Hide unsupported server/Chalker config panels without removing DOM IDs required by upstream initialization; the native handover helper returns `none`.
- Omit payment QR content and use only the project's free-software SVG identity asset. Preserve the upstream licence and credits.
- Add a small bilingual operator note and portal/source/licence links. Native controls stay English. The note explicitly distinguishes local darts Analytics from visitor tracking.
- Escape the player name in the native completion-achievement summary instead of inserting its raw text as HTML.
- A disposable malformed-JSON test confirmed that an imported player ID could execute an invented marker when clicked in a native control. A small identifier-tree check now rejects executable identifier syntax before the existing tournament, Analytics tournament and Analytics database import paths write/render that data. Native numeric/UUID/match identifiers remain valid. Regression tests exercise all three boundaries and literal achievement-name rendering. This is a targeted correction, not a guarantee that arbitrary untrusted imports are safe.
- Replace the import dialog’s unconditional no-data-loss assurance with export-first and overwrite guidance in EN/ES.
- Add two narrow media-query rules to keep the native bracket header's Setup link and match controls usable at 390px. The initial upstream header overlaid its own navigation and could not be clicked normally at that width.

Keep the packaging patch until equivalent upstream configuration exists. Remove the escaping/mobile corrections only after upstream passes the corresponding identifier-import, text-rendering and native navigation regressions. No new export backend, analytics suppression of user-requested match results, or broad vendor framework is introduced.

## Stored data, exports and deletion

Tournaments, players, configuration and transaction history persist in localStorage. The separate `NewtonMatchDB` IndexedDB database holds local match/tournament statistics. Native Analytics means user-requested darts results; no visitor telemetry is added. A native random server identifier may be retained in local configuration for upstream compatibility; no network handover or server registration sends it anywhere in this edition. Browser data and downloaded JSON are not encrypted by this app. Closing a tab does not necessarily remove them. Shared `tools.utilibre.org` site storage means clearing all site data can erase other tools' work, so prefer native per-record controls and export first.

Tournament Setup → Export tournament downloads JSON exportVersion 4.1 containing the selected tournament's identifiers/name/date/status, players, matches/bracket, placements, seeding/group/cup state where present, included transaction history, a configuration snapshot, legacy player names and the player database. Completed-event history is pruned by the native exporter. API keys/remote credentials are omitted by `withoutServerCredentials`. This is not all tournaments, the entire independent Analytics registry or every application preference.

Tournament Setup → import a tournament file → Import Tournament was tested in a fresh browser context. It restored the fictional four-player single-elimination bracket. Native import deliberately preserves the destination browser's Global Settings rather than applying the exported snapshot. Matching identifiers can trigger overwrite controls: export current data first and inspect settings separately. Use a compatible NewTon version, not a promise that every release imports every file.

To delete a working tournament, first create/load another one, then use Delete in the Setup list and confirm. Native code removes that local tournament plus its per-tournament transaction-history key. Analytics tournament records are separate: its native delete dialog requires the tournament name and calls `NewtonDB.deleteTournament`. Player records have native delete/archive rules; records used in stored statistics can require archiving. These independent controls and the separate Analytics database JSON export/import were inspected in source but are not claimed as a full completed-event migration/deletion round trip. Remove old JSON downloads and independent backups separately. There is no server-held tournament backup in this edition; existing operator backup policy remains unchanged.

Loading assets creates normal HTTP metadata through Cloudflare and Hetzner. Local processing/CSP does not establish provider, edge, system or security-log retention. Links deliberately opened outside the app are separate navigation. No confidentiality claim is attached to noindex.

## Verification and deployment

`node deployment/newton/check-import-boundary.mjs URL` passed all three malformed-identifier rejection paths and literal achievement-name rendering without writing its fixture.

`node deployment/newton/check.mjs URL` passed with fictional data at English desktop and Spanish-locale 390px: native tournament creation; four players; native paid/eligible selection; four-player single-elimination draw; JSON export; independent fresh-context native import; browser reload persistence; native deletion of the disposable original working tournament after switching away; clear bilingual note; reachable native mobile navigation; no horizontal page overflow. No external, PHP/API, proprietary client or font request and no page error occurred. Large 32-player brackets, physical phones, live multi-device games and full match-statistics import are not claimed tested.

Private evidence/fictional JSON/screenshots: `/opt/utilibre/reports/knit-newton-20261009/`. Source and static deployment use a staged directory/atomic first-install rename. Future updates retain the previous static directory for rollback. No real user data, existing backup retention or running service is changed. Source offer: `https://tools.utilibre.org/utilibre-source/newton-utilibre.tar.gz`; it contains the exact free-software source subset, original notices, additional library licences, patch/build/check and this report, with proprietary/fonts/API directories excluded.
