# Final Go runtime repairs — 2026-10-11/12

This batch replaces native binaries, not application data or access policies.
`images.json` records exact original image IDs, source commits, destination paths,
compiler versions and candidate tags. A tag alone is not release evidence.
Production status belongs in the release receipt and the release section below.

## Scope and upstream sources

| Application | Preserved release | Compiler | Additional compatible module repairs |
| --- | --- | --- | --- |
| [OAuth2 Proxy](https://github.com/oauth2-proxy/oauth2-proxy) | 7.15.5 | Go 1.26.9 | x/net 0.60.0 |
| [Anubis](https://github.com/TecharoHQ/anubis) | 1.27.0 | Go 1.26.9 | x/net 0.60.0, cel-go 0.29.0, gRPC 1.83.2 |
| [OpenGist](https://github.com/thomiceli/opengist) | 1.15.2 | Go 1.26.9 | x/net 0.60.0 and its compatible indirect dependencies |
| [Mezzo](https://gitfield.org/fsky/mezzo) | 1.4.0 | Go 1.26.9 | x/net 0.60.0 |
| [ntfy](https://github.com/binwiederhier/ntfy) | 2.28.0 | Go 1.27.2 | x/net 0.60.0 |
| [Vikunja](https://code.vikunja.io/vikunja/vikunja) | 2.7.0 | Go 1.27.2 | x/net 0.60.0 |
| [Wakapi](https://github.com/muety/wakapi) | 2.18.1 | Go 1.27.2 | x/net 0.60.0; rebuild its separate health helper too |

Use each recorded commit, not the changing repository HEAD. Final resolved
`go.mod`/`go.sum` and SHA-256 manifests live in `locks/<application>/`. Rebuilds
consume these locks with `-mod=readonly`; patches in `patches/` make the changes
reviewable. The initial resolution was narrowly pinned, not `go get -u`.
Existing Wakapi privacy/interface changes are preserved and recorded as patch
prerequisites. No application account, content or network configuration is copied
into the source archives.

## Reproducible build and parity gates

1. `prepare.mjs` freezes only immutable binaries from exact original images. Old
   binary copies are gzip-compressed with the uncompressed SHA-256 retained.
   An existing verified inventory can be reused after production changes.
2. `snapshot-source.mjs` records tracked source bytes, executable flags and
   confined relative symlinks. It rejects unapproved source edits.
3. `extract-embed.py` recovers complete Go `embed.FS` assets from the old native
   binaries, validating paths, table structure, bounds and Go content hashes.
   Nine regression fixtures cover its parser. Anubis inline JavaScript is also
   recovered from a local native response and required to occur exactly once in
   the original binary. Its release-only `xess.min.css` is preserved as well as
   the source CSS/fonts; the parity gate rejected the initial incomplete asset
   set before any image was staged. No substitute/dummy frontend is used.
4. `build.mjs <key>` builds in the pinned Go image with telemetry disabled,
   temporary files/module caches in RAM, explicit source revision checks and an
   8 GiB root-filesystem reserve. `build-one.sh` is copied into that invocation's
   tmpfs before execution, avoiding concurrent script-edit races. Final compiler,
   experiment flags, CGO settings and upstream version symbols are explicit.
5. `check-assets.py <name>` requires embedded frontend paths, sizes and SHA-256
   hashes to remain identical. `stage.mjs <key>` overlays only the native binary
   (two binaries for Wakapi) on the immutable original image and asserts that its
   user, environment, entrypoint, command, ports, volumes and health check match.
6. Each native fixture uses synthetic data in an isolated temporary deployment.
   `verify.py <key>` compares exported image files, permits only the specified
   binary paths to change, and scans the actual candidate. It rejects remaining
   fixed-version Go findings or old standard-library findings. Unfixed findings
   and unrelated OS findings remain visible; they are not waived by this batch.

Example (other targets have their own native checker):

```sh
node deployment/maintenance/go-leaf-final/build.mjs anubis
python3 deployment/maintenance/go-leaf-final/check-assets.py anubis
node deployment/maintenance/go-leaf-final/stage.mjs anubis
node deployment/maintenance/go-leaf-final/check-anubis.mjs
python3 deployment/maintenance/go-leaf-final/verify.py anubis
node deployment/maintenance/go-leaf-final/freeze-locks.mjs anubis
```

The Wakapi build/stage/verify key is `wakapi-healthcheck`; its main output,
source-publication name and native receipt use `wakapi`. Its helper additionally
uses `build-healthcheck.sh` and `check-healthcheck.py`. This is deliberately one
combined runtime replacement, not a health-helper-only claim. Before staging,
`check-wakapi-assets.py` separately checks its static filesystem, UI templates,
mail templates and embedded language-color data; all 82 files remain identical.

## Native verification coverage

Raw software-only build reports and private exact-image gate receipts are under
`/var/lib/utilibre-maintenance/go-leaf-final-20261011/output/`. A native receipt
must have `passed: true` and the same `imageId` as its image and verification
receipts. A file's existence does not establish success.

| Target | Proportionate upstream tests | Isolated native acceptance gate |
| --- | --- | --- |
| OAuth2 Proxy | `./pkg/... ./providers` | Real synthetic OIDC authorization-code exchange, PKCE, signed token/JWKS, session/auth headers, forged CSRF denial, logout |
| Anubis | configuration, challenge packages, web | Two fresh Chromium profiles solve actual proof-of-work; authenticated reload, native allow/deny and no unrelated browser requests |
| OpenGist | configuration, render, i18n | Native fresh SQLite/account, private/public gist access, Git and archive/export checks |
| Mezzo | complete package test set | Original/candidate version and static asset parity, homepage, rejected unsafe proxy inputs, missing asset |
| ntfy | util/client; five named server publish/cache/access/metrics tests | Fresh native publish/retrieve and configured access/privacy behavior |
| Vikunja | configuration and utility packages | Fresh native accounts, task persistence and configured import/export/access checks |
| Wakapi | utils, helpers, configuration | Fresh local account/session, authenticated synthetic heartbeat, anonymous denial, health helper and logout |

The ntfy selected server tests are not the complete server suite. Mezzo's check
does not issue Tenor searches; it does not establish upstream availability. Synthetic
local Wakapi authentication does not repeat the production OIDC journey.
Browser checks use headless desktop Chromium, not real phones. See the individual
native receipts for the exact completed assertions; no broad uptime, load or
capacity claim follows from these checks.

Build-time limits are separate from runtime budgets: two CPUs, normally 3 GiB
memory/2 GiB tmpfs; ntfy, Vikunja, OpenGist and Wakapi have approved 4 GiB memory/
3 GiB tmpfs. Early cold builds exceeded a smaller RAM-only linker workspace;
those candidates were not released. An OAuth2 Proxy root-user inotify fixture
failed under the host's per-user limit; the unprivileged upstream fixture passed.
Wakapi's trimmed test binaries needed an explicit `ZONEINFO` path to the pinned
compiler's existing timezone ZIP; its selected date tests passed after that
fixture correction, with no application source patch. Compiler/test failures
are retained and never treated as successful gates.

## Matching source publication

`publish-source.mjs <key> [--publish]` creates a complete source archive with
the exact final locks, preserved frontend assets and a `UTILIBRE-REBUILD.sh`.
The included JSON records the original runtime image, resulting image ID,
compiler image ID and native binary hash. Upstream licenses remain included.
Module downloads at build time are checked against the pinned sums; none are
added to runtime. CGO rebuilds also require Alpine's compiler/musl/binutils.

Publication requires successful exact-image native/parity receipts and verifies
that that image is actually running. Archives are atomically published under
`/opt/utilibre/toolbox-public/<name>-utilibre.tar.gz`. Any prior public archive is
retained in a separately named SHA-256 recovery file. Only the generated source
staging copy is removed after successful archive validation; upstream source,
user data, original binaries and rollback archives are not deleted.
`check-public-source.py <application>...` then streams the normal public HTTPS
archive URL once and requires its length and SHA-256 to equal the publication
receipt. It stores only result metadata, not another download copy.

`deployment/source-patches.json` records the dependency overlays and any prior
privacy patch prerequisites. Re-run the repository's patch apply/reverse audit
when those entries change. A future upstream upgrade may replace this small
overlay only after equivalent version, asset, privacy and native checks pass.

## Production release and rollback

**All seven targets released, 12 October 2026 at 00:19:56 UTC.**
`/var/lib/utilibre-maintenance/go-leaf-final-20261011/release.json` records each
exact original/replacement image, original Compose reference, unchanged resolved
non-image configuration hash, readiness and backend/public response checks.

| Entry point / role | Live image ID prefix | Native result |
| --- | --- | --- |
| [Grist identity gateway](https://grist.utilibre.org/) | `e3a49c15b521` | Synthetic OIDC/PKCE, forged CSRF denial and logout; public anonymous authorization remains denied |
| [Tenor frontend](https://tenor.utilibre.org/) | `53a3e937eda3` | Version/assets and unsafe-proxy rejection; no fresh Tenor availability claim |
| [Redlib challenge](https://redlib.utilibre.org/info) | `46f5eb8a5ed5` | Two Chromium challenge sessions, authenticated reload and allow/deny |
| [Code snippets](https://snippets.utilibre.org/) | `56983d2fd6e0` | Two-account isolation, private Git clone/push/reopen, ZIP and deletion |
| [Notifications](https://notify.utilibre.org/) | `768b8c5fc0cb` | Publish/poll, one-hour/no-cache behavior, restart clearing RAM cache, denied uploads/signup |
| [Tasks](https://tasks.utilibre.org/) | `93940c591250` | Private tasks/attachments, password-protected ZIP export/import, synthetic SQLite restore and deletion |
| [Coding activity](https://wakapi.utilibre.org/) | `de076a730673` | Local account/session, synthetic authenticated heartbeat, anonymous denial and rebuilt helper |

Only the intended executable(s) changed; embedded application assets and runtime
configuration remain identical. These are same-application-version repairs, not
schema migrations. All seven matching source archives passed public HTTPS
streaming SHA-256 verification by 00:21:02 UTC. Their full image IDs and source
hashes are in the private `output/public-source.json`; source remains publicly
available under each `<name>-utilibre.tar.gz` link above the source index.

`release.mjs prepare <key>` refuses drift, missing native/parity evidence,
unexpected network-namespace dependents or an unhealthy baseline. `apply <key>`
requires at least 8 GiB free, preserves every non-image service setting and
checks the exact image, stable native health and unchanged route responses.
The private Anubis `/info` probe supplies its already-required edge-IP header
with a synthetic loopback value; the public probe supplies no spoofed header.
Initial private probing without that header correctly failed before mutation;
this was a probe correction, not a weakened ingress policy.

On a failed rollout, the coordinator restores only the reviewed image scalar,
recreates that one service and verifies the exact old image and route state.
Duplicate pin checks run before mutation. The rollback branches are covered by
the focused release tests; this does not claim a forced production rollback for
each successful target. No database, upload or account is replaced during image
rollback. For a later emergency rollback, first confirm the current image and
non-image configuration still match the receipt, restore that target's recorded
`oldRef` in its recorded Compose file, and use the recorded project/directory
with `up -d --no-deps --no-build --pull never <service>`. Recheck native health
and the same endpoints. Preserve the old image/source archives and user data;
rollback reintroduces the old executable vulnerabilities.

Rustpad and Docker/containerd are **outside this release** and were not restarted:
the owner has an in-memory pad and has not confirmed a saved copy. Fixed-version
Go findings were removed from these seven compiled targets; unfixed crypto and
imaging records, unrelated lower-severity OS findings and broader fleet coverage
limitations remain visible in the final private queue. This is not a claim of
zero vulnerabilities or complete real-device coverage.
