# 22 November maintenance batch

This is **ongoing all-severity work**, not a claim that Utilibre has no open
vulnerabilities. Private evidence is under
`/var/lib/utilibre-maintenance/security-20261122/`. Raw findings are retained.
The current dated checkpoint is in `docs/records/security-2026-11-22.md`.

Latest continuation: both relay roles have completed their Mongo and OpenSSL
successors after independent idle checks. Spliit and Wishlist's Effect update,
Yopass's distroless crypto update and the private Penpot admin console's finite
Vite/Rolldown dependency update are deployed and verified. The 08:11 UTC frozen
scan and exact reviews leave 0 critical / 106 high records awaiting review;
lower-severity records remain open too. This is not security clearance.
`retain-reviews.py --successors` accepts only completed, exact role receipts,
explicitly records the unreleased role and retains original decision expiries.
`review-successor-payloads.py --mongo --released-only` verifies the actual signed
package payload only on the completed role. It neither activates nor clears the
unreleased relay. The completed mode requires both role receipts; it cannot
infer release from a prepared image.

Host OpenSSL is active after the operator-confirmed restart. The original
four-package release gate still records independent post-boot APT inventory
drift. `host-openssl/activated-component.json` proves only crypto activation.
The separately installed libc successor has passed payload and native checks,
but old host consumers still require a separate coordinated restart window.
No second restart is authorized by the completed OpenSSL window.

`review-rssbridge-nginx.py --http2` checks the running RSS-Bridge NGINX
executable, mounted configuration, effective `nginx -T` output and current
scanner artifact. Its single plain HTTP listener does not enable HTTP/2, so
the two internal NGINX Rapid Reset records received a seven-day scoped review.
This does not assess the separate public Caddy edge. The parser's negative
tests reject either `http2 on` or a `listen ... http2` option; the raw findings
are retained. Evidence: private `rssbridge-nginx-http2-reviewed-batch.json`.

`acquire-fontenc.py` authenticates the exact Debian libfontenc 1.1.8 source,
build-only protocol headers and one upstream source patch. `prepare-fontenc.py
--build` runs without network or production mounts and returns the verified
candidate on repeat. Its synthetic encoding file triggers an ASan heap-buffer
overflow in the unpatched source and passes after the patch; ten ordinary API
checks pass on both sides. The changed source file is only `src/encparse.c`.
This remains an **isolated candidate**, not a host or Penpot exporter release:
Debian/DHI package integration, full runtime checks and the scoped release gate
are still required. Private evidence: `fontenc/build-b983ce36662e1d2b/`.

`check-qemu-successor-source.py` and `review-host-successors.py` verify the
authenticated QEMU successor's exact retained source patches, complete binary
subpackage scope, native tools and operator-confirmed guest-agent postcheck.
They are read-only reviews; they neither operate the guest agent nor approve
the unrelated host changes.

`prepare-admin-build-deps.mjs`, `admin-build-native.mjs` and
`check-admin-build-deps.py` reuse the existing dependency builder, native
application fixture, complete file comparison and frozen scanner. Six pinned
MIT dependencies change; the compiled application, configuration and private
access boundary do not. `release-effect.py --admin-build-deps` uses the existing
scoped release gate. Native TypeScript bundling, dependency ranges, ordinary
server-function behavior and retained rejection checks pass. No development
server or exploit fixture is exposed. A separately preserved upstream advisory
observation is not silently added to the frozen scanner database.

`acquire-bookworm-successor.py --download` acquires three exact signed vendor
packages and their packaging source. `check-bookworm-successor-source.py` proves
the existing DTLS runtime correction is byte-identical in the vendor successor.
`select-bookworm-successor.py`, `bookworm-successor.py` and
`check-bookworm-native.py` reuse the existing offline builder, complete scope,
frozen scanner and native application/TLS/DTLS tests for five consumers.
Preparation does not authorize release. Old inputs already contain the DTLS
repair: both sides passing demonstrates preservation, not a newly reproduced bug.

The five Bookworm successors and both DHI Penpot successors have now passed
their native, scope, scanner and release gates. `dhi-successors.py` reuses the
same mechanisms with signed DHI source/payload verification; original `status.d`
fragments remain intact. `review-dhi-successors.py` can review only the explicitly
enumerated source fixes and proven metadata aliases, never an arbitrary advisory.

`prepare-host-openssl.py`, `scan-host-openssl.py` and
`release-host-openssl.mjs check` prepare four host packages without installing.
The rollback archives must match the actual host payload, not merely its version
label. The scanner projects only the four versions/source identities in a copy
of dpkg state; all 508 installed packages, including holds, must still match.
Native crypto and candidate-loaded SSH configuration parsing are required.
`apply --maintenance-window-confirmed` is a separate production action requiring
a current operator-confirmed console/backup window; no automatic reboot occurs.
`verify` distinguishes installed packages from still-running predecessor libraries.
The `rollback` action restores the exact four archives and does not pretend that
restoring files replaces already-loaded process libraries.

`select-remaining-vendor.py` and `remaining-vendor.py` cover only the declared
Authentik nghttp2 and Gathio UAPI-header successors. They reuse the existing
native HTTP/2, authentication, header compilation, full-image scope and scoped
release checks. Header preparation changes no running host kernel. Read their
receipts before claiming either candidate is deployed.

## Completed release mechanisms

* `nginx-inputs.json`, `prepare-nginx.py`, `check-nginx.py`, `scan-nginx.py`
  and `release-nginx.py`: 27 exact Nginx/library candidates. Signed APKs,
  complete image-file comparison, unchanged musl/configuration/package hooks,
  native HTTP/TLS and all-severity comparisons precede scoped activation.
* `vendor-inputs.json` and the corresponding `*-vendor.py` adapters reuse those
  checks for six PHP/crypto candidates. PrivateBin, Translite, DeGoog, 4get,
  Binternet and Wallabag retain their native fixtures. Addy's PHP update is
  explicitly held: the available package expects ICU 78 while its mail stack
  still depends on ICU 76. No mixed, untested runtime is approved.
* `debian-wanted.json` / `acquire-debian.py` authenticate exact packages through
  Debian's signed Release/Packages chain. `debian-inputs.json`,
  `prepare-debian.py`, `scope-debian.py`, `check-debian.py`,
  `check-debian-extra.py`, `scan-debian.py` and `release-debian.py` retain the
  existing offline package builder, application fixtures and release procedure.
  Twenty candidates passed. Unresolved vendor advisories stay in the scan.
* `prepare-yopass.py` / `check-yopass.py` handle the separate distroless Yopass
  candidate. No shell, package manager, init or loader cache is introduced.
  The signed libc package's maintainer scripts are pinned and reviewed; the
  existing distroless payload assembler handles image construction, not host
  service management. Native encryption/expiry and independent EN/ES browser
  recipients passed. C-locale checks match this image's available locale data;
  the failed initial C.UTF-8 baseline and candidate checks are retained.
* `addy-nginx.py` is a separate, same-branch Nginx-only candidate. Its finite
  manifest cannot change PHP, ICU, Postfix or Rspamd. Release status must be read
  from its receipts; a prepared candidate alone is not a deployment.
* `debian-followup.py --libraries` selects only the sixteen hash-bound XZ
  candidates. All twenty project releases are recorded in the separately
  SHA-bound aggregate `libraries/vendor-debian/release.json`.

## Current native OpenSSL preparation

`openssl-inputs.json`, `acquire-openssl.py`, `prepare-openssl.py` and
`openssl-inner.py` capture authenticated Debian 3.5.9 source and eight exact
upstream fixes. The source input remains preparation-only. `check-source`
verifies the entire changed-file set; `build-v2` runs the native Debian build
and upstream suite without network access or production mounts. The first
build's tests passed but source packaging failed; its evidence is retained.
The second attempt packages corresponding source before generating binaries.
It also passed all 4,932 tests. A final log-permission failure was recovered by
`finalize-openssl.py`, which verifies Debian-generated checksums and the completed
test/build log; it neither rebuilds nor deploys. The original failure is retained.
Fourteen ordinary runtime candidates, the separate Penpot private-library
correction and the Authentik vendor variant are now deployed with individual
release receipts. A fresh fleet assessment is separate from these release gates.

The narrowly selected `--openssl` runtime mode also requires ordinary crypto,
TLS 1.2/1.3 and wrong-host checks, application checks, complete file/ABI scope,
and the frozen all-severity comparison. `check-openssl-regressions.py` runs the
two regression tests supplied in the selected upstream patches against old
and candidate libraries. A baseline timeout or unrelated error is explicitly
not counted as reproducing the bug. The other six corrections do not gain an
invented individual failing-baseline claim.

`publish-openssl.py prepare` makes the finite private corresponding-source
archive. Its separate `publish` action exposes the exact reviewed archive on
existing source mounts. Neither action restarts services. Runtime release
requires hash-bound successful native tests and the published source receipt;
there is no approval inferred from a scanner result. Read current receipts
before claiming this preparation is deployed.

All adapters check the expected source fragments before adapting an existing
script; they do not perform fuzzy patching or resolve newer versions. The
private adapter and original-script hashes accompany evidence. These scripts
need no LLM. Byte-for-byte reproducible build output is **not** claimed.

## Commands and boundaries

| Command | Effect |
| --- | --- |
| `inventory.py before` / `after` | Private read-only checkpoint; refuses overwrite |
| `acquire-debian.py --download` | Explicit bounded vendor downloads; no install |
| `prepare-*.py KEY` | Disposable credential-free, networkless candidate build |
| `check-*.py KEY` | Native synthetic tests; inspect each adapter for its exact CLI |
| `scan-debian.py KEY` / `scan-nginx.py KEY` | Frozen local Trivy assessment; no approval |
| `release-debian.py check KEY` / `release-nginx.py check KEY` | Release prerequisites; no activation |
| `release-debian.py apply KEY` / `release-nginx.py apply KEY` | **Production deployment**, only for a hash-bound approved row |
| `release-vendor.py prepare KEY` / `apply KEY` | Retained PHP release interface; `apply` deploys |
| `addy-nginx.py prepare` / `check` / `scan` | Isolated Addy candidate and native checks |
| `addy-nginx.py release check` / `apply` | Existing scoped release gate; `apply` deploys |
| `collect-releases.py` | SHA-bound aggregate of the first 20 Debian releases |
| `retain-reviews.py` / `review-glibc.py` | Proposed exact reviews only; no ledger writes |

Do not run every historical script in this directory automatically. Completed
evidence is immutable; some preparation scripts deliberately refuse a replay
into an occupied directory. Check existing receipts before deciding whether
anything needs rebuilding. The `verify` release mode checks an already deployed
artifact without restarting it. The release lock prevents overlapping writers.

The retained supervisors enforce Addy's SMTP boundary, Wallabag/records egress
rules and namespace companions. Both relay deployments first require zero
active relay allocations. This work changes no access rules, retention windows,
quotas, secret identities or backup exclusions. No notifications are sent.
Host boot/SSH/guest-agent changes are outside these container release adapters.

## Assessment and retained repairs

`scan-debian.py` keeps findings that still match the newer vendor version. A
successful comparison means no new advisory/severity/target regression against
the frozen database and exact package inventory; it is not security clearance.
Held dpkg packages are included by `inventory-debian.py`. The separate Yopass
collector reads its immutable `status.d` records. Missing epochs and held
packages caused early rejected scans; corrected scans preserve those failures.

`retain-reviews.py` follows the existing 14 November review contract for **all
severities**: exact previous finding, same advisory snapshot and roles, unchanged
package payload and execution configuration, original unexpired decision and
expiry. It cannot clear a changed package, extend an exception, or inherit a
conditional decision. Raw findings stay visible when an image ID changes.

`review-glibc.py` checks fourteen explicitly enumerated vendor-fixed advisories
against a pinned Debian tracker snapshot, authenticated u5 packages, completed
releases, native compatibility checks and actual installed bytes. Documentation,
manuals and lintian metadata are omitted by existing minimal-image packaging;
every other supplied file/symlink is checked. Other glibc advisories remain open.
It does not claim exploit reproduction. Distroless verification copies only
named package files, never user-content directories. Proposed decisions expire
in seven days and require the existing `triage.mjs record-batch` interface.

The `test_*.py` tests cover held packages, epochs, changed/new advisory identity,
exact vendor scope and missing/tampered payload rejection. Existing native,
vendor and triage tests remain in their original JavaScript test suites.

`assess-vendor.py` is a read-only current-data classification across all
severities, not a vulnerability exemption generator. Non-Debian inputs and
missing extraction remain gaps. `review-grub.py` rechecks the existing signed
GRUB installation, package files and actual EFI bytes without boot changes.
Two existing documentation aliases must resolve to their identical packaged
destination; executable links and every supplied file remain exact.
The explicit `vendor-fixed-review/check.mjs --only-kind=mariadb --mariadb-nov22`
subset checks fourteen pinned primary advisories and both exact client/config
packages. The recorded DHI snapshot option refuses acquisition if its prior
signed-package index is absent. These tools prepare exact, expiring decisions;
only the existing validated triage interface writes the ledger.

## Rollback and remaining limits

Each release stores `rollback-PROJECT.json` (protected original Compose text),
old/new immutable image IDs, exact changed services and completion evidence.
Use the established supervisor for that project to restore those exact pins;
do not run a fleet-wide Compose recreation. Keep the previous image available.
These package-only releases run no database migrations; no backup restoration
or changed retention is part of rollback. Re-run native health and relevant
SMTP/egress/relay boundaries after a separately authorized rollback.

PrivateBin's `reconcile-privatebin.py` binds its already deployed runtime to the
guarded updater without changing application source or the release channel.
Repeated reconciliation passed as already correct, with no restart.

Remaining vendor-open advisories, the ACL caller migration, unresolved package
attribution and any unsupported scanner coverage remain explicit. They are not
accepted merely to reach a zero count. Browser checks here use synthetic
Chromium sessions and narrow viewport emulation, not a new physical-device
test. Provider behavior, full-VM recovery and separate Caddy/Proxmox hosts were
not reassessed by these package tests.

Authentik’s ordinary OpenSSL candidate is explicitly rejected because it loses
the vendor `ak-fips` marker. The separate `prepare-openssl-fips.py` build passed
all 4,932 upstream tests. Its existing FIPS module, configuration, provider
self-check and held-package policy are preserved. `restore-fips-bookkeeping.py`
restores one exact unrelated dpkg Priority field changed by `apt-mark`; any other
unexpected package change is rejected. Complete file scope and native login,
TOTP/OAuth, TLS and regression tests pass on the resulting exact image before
the recorded scoped release. This is no new FIPS certification claim.

`acquire-leaf.py --download` acquires eleven pinned signed packages. Eleven
runtime candidates now pass their isolated checks; read their release receipts
before claiming deployment. Penpot additionally checks HEIC/AVIF dimensions,
colours and alpha through both configured library paths. The exporter's scan
contains 27 inherited duplicate package-version records. Its exact baseline
scan proves they precede this update; `scan-leaf-exporter.py` preserves every
version and raw finding while correcting inventory comparison. No finding is
suppressed. The failed original comparison remains in private evidence.

`acquire-successor-sources.py`, `check-successor-patches.py` and
`acquire-successors.py` prepare exact vendor successors for retained Mongo
library fixes. Source patch hunks or the resulting source bytes must match the
previous reviewed fixes; source agreement alone does not authorize release.

The eleven leaf candidates are now released in twelve project groups; see
`leaves/vendor-debian/release.json`. An active relay allocation initially blocked
one release; the gate was retained and activation followed a later idle check.
`alpine-crypto-inputs.json`, `alpine-crypto.py` and `check-alpine-crypto.py` reuse
the signed overlay, frozen scanner, native runtime and TLS fixtures for twenty
additional library-only candidates. Preparation is not release approval.

All twenty Alpine candidates have completed activation in thirty-three project
groups (`alpine-crypto/release.json`). The portal uses its existing protected
`PORTAL_IMAGE` setting and rollback procedure; its old/new native HTTP responses
match on nine routes, with body/method rejection checked separately. The cache
release also updates the exact older pin in the checked-in core Compose mirror.
The newsletter web release explicitly includes its unchanged gateway and checks
that it joins the replacement web container's network namespace. Initial failed
preflights remain in private evidence; none was bypassed.

`collect-releases.py --alpine` binds the original project receipts, including
the portal's distinct environment-pin receipt. `retain-reviews.py --alpine`
can carry only unexpired reviews of byte-identical, unmodified packages after
a complete new scan; it neither clears changed packages nor renews expiry.
`review-successor-payloads.py` separately checks an enumerated set of Debian
vendor-fixed advisories against authenticated package bytes, current deployed
roles, the pinned primary advisory snapshot and completed native tests. Other
advisories remain unresolved. Its output still requires explicit triage.

The SASL follow-up reuses the Debian preparation, full-image/ABI, frozen-scan
and native consumer checks through `sasl-runtime.py`. Its small C fixture uses
upstream public APIs for encoding, an EXTERNAL client exchange, cleanup and
unsupported-mechanism rejection, with synthetic data and no network or account
store. This is compatibility evidence, not reproduction of a CVE. The earlier
fixture compilation/interaction failures are retained. Candidate preparation
alone does not authorize production activation.
