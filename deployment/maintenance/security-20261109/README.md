# 9 November maintenance

This is a finite extension of the existing native-package build, isolated
application tests, Trivy assessment, Compose release and rollback procedures.
Private evidence is under `/var/lib/utilibre-maintenance/security-20261109`.
It does not authorize automatic updates of other services.

## GLib: Addy and 4get

`glib-inputs.json` pins the two repaired predecessor images, signed Alpine APK,
original GLib source, compiler image, upstream patches and final library hash.
The vendor-only 2.86.5 APK still accepts invalid nested D-Bus nodes despite its
security metadata. The same issue is present in its authenticated source.
Do not use the scanner's fixed-version label as the behavioral acceptance test.

The correction is GNOME commit `c9da977c178fbfc0e4caf99f9fdf5dc433d6fcc2`,
with its prerequisite assertions from `656ad4582cb1d7a7fa8bafe3ce8aec6aa3c17da0`.
The test-registration paths were adapted to the stable branch's spelling;
the parser correction and five upstream test vectors are unchanged.
Both live predecessors reproduce the invalid-node acceptance. The replacement
passes five upstream introspection tests, a valid interface and seven invalid
documents, while preserving all exported symbols and NEEDED library entries.
The complete application trees and image configuration are unchanged.

Addy passes eight native address, message, encryption and login-form checks
on both versions, with the mail transport set to an in-memory fixture and
networking disabled. 4get passes its existing isolated Apache/PHP form and PNG
round-trip checks. These do not claim real email delivery or search-provider
availability. Both candidates add zero high/critical findings against the
same 9 November Trivy database; unrelated findings remain.

`Dockerfile.glib-builder` is an acquisition step. Record its immutable image
and package lock; later replay uses that retained image, not fresh resolution.
Run `build-glib.sh` in a disposable bounded container with network disabled,
the exact inputs mounted read-only at `/inputs`, and empty `/work` and `/output`.
The script checks source hashes and applies both patches without fuzzy repair.
`stage-glib.mjs` overlays the APK and tested GIO library onto the exact previous
applications. It intentionally rejects a different running predecessor.

`release-glib.mjs prepare` checks evidence/configuration without activation.
The separately authorized `apply` uses the existing transactional release and
scoped health checks. Addy must use `utilibre-addy-smtp.service` so its namespace
firewall is reinstated before SMTP starts. `verify` checks a completed release
without restarting services. No database migration or user-content change is
part of this repair. The receipt contains old/new pins and configuration hashes.

For rollback, first revalidate that only these pins changed, then restore the
receipt's old image for the affected service using its existing supervisor or
scoped Compose command. Keep Addy's SMTP supervisor boundary. Verify native
health and HTTPS afterward. Image rollback is not a data restore.

## Disk and assessment records

The already-enlarged main virtual disk had 25 GiB of unallocated tail space.
`growpart` and online `resize2fs` extended only its main partition/filesystem.
The partition start, boot partitions and separate temporary-data disk did not
change. No reboot was required. The before/after tables are retained privately.
There is no safe online shrink rollback.

Five initial critical records received exact, expiring evidence reviews:
three Debian zlib binaries omit the affected MiniZip code, and the two FreshRSS
libxml2 payloads retain their verified fixes. Raw scanner records remain.
These reviews do not waive other advisories or future images.

## musl: finite static-server batch

`musl-inputs.json` records 62 discovered predecessor images (120 containers),
including stateful and private services. This is an inventory, not approval to
upgrade all of them. The initial 20 `static-nginx` rows were followed by the 42 reviewed native consumers.
All 62 images / 112 groups are now passed in the private receipt; consult each
row's exact ABI, consumer, configuration and release evidence.

Eight checksum-pinned Alpine APKs were acquired from their original branch and
verified with `apk verify`. Candidates use the existing
`security-20261028/alpine.mjs --batch-20261109 --musl KEY` adapter. They retain
image configuration, application bytes and unrelated packages. The 16 native
checks exercise regex, UTF-8, allocation, local sockets, numeric addressing and
threads; they are compatibility checks, not an overflow exploit reproduction.
`check-musl-static.py KEY` verifies the previous and new libc export sets and
nine NGINX checks, including the unchanged application HTML, range responses,
gzip, conditional caching, routes, redirects and missing files. Everything runs
in disposable, resource-bounded containers with no external network or data
mounts. Browser application code is unchanged and is not represented as freshly
workflow-tested by these server checks.

The existing `scan-brotli.mjs --batch-20261109 --musl KEY` uses the same retained
Trivy database for both artifacts. The target finding must disappear and no new
high/critical finding may appear. The scan alone does not approve deployment.
The release adapter additionally requires explicit approval, exact candidate
identity, ABI/consumer proofs and the checked-in test's checksum. The later `musl-policy.mjs` extension checks native-consumer proof identities
and test hashes; it does not treat the original static-server fixture as proof
for databases, supervisors, media or messaging.

Use the existing `release-brotli.mjs --batch-20261109 --musl prepare GROUP`
then separately authorized `apply GROUP`; set `APP_BIND_IP` to the existing
private bind address. Group IDs come from `releaseGroups`, not from guesses.
Each group retains its previous pin and configuration hashes and is released
sequentially through the existing Compose/rollback helper. Public static homes
must return 200 before release and retain that response afterward. Whisper's
withdrawn entry remains withdrawn; no public route or model setting is enabled.
The complete release report now has `passed` status; all 112 groups passed.
Inspect exact group receipts rather than inferring successful user tasks from a
container being running.

Rollback restores only the exact previous scalar in the receipt's Compose
file, recreates only the affected static service with no build/pull/dependencies,
and checks health and the public route. No user storage is modified. Do not
blindly replay this overlay onto a newer base: review the new branch/package
inputs, retained application fixes and native tests first.

## ChartDB and portal

ChartDB 1.21.0 is pinned to `ee95448d154cfdcf65264c45745f440c0480ef84`.
`prepare-chartdb.mjs` requires that exact clean commit and applies the reviewed
`toolbox/chartdb-local-source.patch` with no conflict repair. A clean replay
matches the tested source exactly. The patch retains local fonts/workers,
scoped storage, disabled external integrations/telemetry, DOMPurify 3.4.17 and
Monaco 0.57.0. The new theme-validation behavior is preserved.

The isolated production build and all 842 upstream tests passed. Chromium
checked native SQL import/export, JSON export/import in a fresh context and
reload persistence; no external requests, uploads or browser errors were
observed in that synthetic workflow. Its corresponding source, lockfile,
licenses and build instructions are offered at the existing source-download
origin. `release-refresh-20261106/release-static.mjs chartdb --apply --nov9`
uses the existing atomic static-directory release; old assets are retained.

The portal's one catalogue record was built from clean `0baecdd` source with
unrelated dirty work excluded. Typecheck, lint/build/FOSS gates and 120 unit
tests passed on Node 24.21.0. The header-count test now accepts Node's native
empty 431 response as well as the application JSON rejection, while requiring
connection closure and successful requests below the limit. No server behavior
was relaxed. The earlier Node 24.22.1 run exposed this same test assumption.
The initial Alpine build could not use the host's glibc-only optional bundler;
the retained compatible Debian compiler was used without resolving dependencies.

`portal-inputs.json`, `check-portal.py` and the existing portal release's explicit
`--nov9` profile pin the exact old/new artifacts. EN/ES software pages show the
new version. Runtime packages are identical; one existing medium zlib finding
remains open. No new high/critical finding was introduced. Rollback restores
only the receipt's previous `PORTAL_IMAGE` and recreates `portal`; this does not
restore or alter account-application data.

## Subsequent November 9 releases

`vendor-debian-inputs.json` pins 28 authenticated APT/libapt/zlib image repairs.
`vendor-debian.mjs`, `vendor-debian-policy.mjs` and the distroless
`vendor-yopass.py` adapter retain the existing release lock, narrow package
allowlists, ABI checks and previous images. All 33 groups passed. The distroless
row has its own exact fixture hash; normal Debian fixtures retain their original
checksum. It receives no shell/package manager.

Chhoto 7.10.8-p2 retains its native migration, anonymous eight-character links,
custom aliases, administrator auth and no-hit-count setting. Use the existing
`deployment/chhoto` build and isolated native/browser checks; the source ledger
records all three ordered patches. Its schema upgrade has a synthetic recovery
test; do not assume changing an image undoes a database migration.

Yopass 16.1.0-p1 uses `yopass-inputs.json` and
[`community/yopass/README.md`](../../community/yopass/README.md). The native CLI
and two-client browser checks cover compatibility, expiry, limits and encryption.
`release-yopass.mjs` changes only the application, preserves its cache container,
and explicitly disables audit/metrics/receipts/secret requests. Roll back only
the app image and recorded flags; do not flush or restart the encrypted cache.
The optional unused CDK lock's twelve high findings remain open.

The `portal-shortener`, `portal-abuse` and `portal-pack` input manifests record
successive exact portal builds. The `--nov9 --pack` release updates only catalogue
versions and the verified retry-retention wording over the tested report routes.
All builds retain runtime package parity and the existing JavaScript budget.

Native notices use `deployment/abuse-reporting` exact hash-gated template/source
patches and native configuration. Read `docs/abuse-handling.md` for coverage,
mail handling and limitations. Restarts of tmpfs-backed tools may lose temporary
content; WBO's release records that fact. Rustpad is not restarted for an unreviewed
notice. The portal's 122 tests and EN/ES rendered routes pass.

`publish-application-sources.py chhoto|yopass` creates code-only source offers
from exact Git objects and reviewed patches, with local vendor assets/locks and
previous archive retention. It disables LFS smudge/network fallback; optional
documentation image pointers remain pointers. Source publication is an explicit
operator action, not a side effect of preparation or assessment.
