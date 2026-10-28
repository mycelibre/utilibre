# 28 October shared-library and runtime maintenance

This batch extends the existing native-package, exact-JavaScript-package and
transactional release scripts. It does not replace the maintenance system.
No LLM is part of replay, tests or release checks.

## Completed CFITSIO bounds repair

`released-cfitsio.json` records the Gathio database image with only
`libcfitsio.so.10.4.2.0` replaced. The exact
[upstream pre-read bound](https://github.com/HEASARC/cfitsio/commit/579792e0f85bff0c6733ad5ebdf54c3b5c188686)
is backported onto authenticated Debian 4.2.0-3 source. Debian's older source
lacks the later post-read guard, so the upstream hunk removing it is inapplicable.
The patch requires exact pre/post hashes and zero fuzz; all vendor patches remain.
`cfitsio-source.json` pins the source archives, authenticated index and compiler.

The native oversized-string case fails on the original and is rejected with
READ_ERROR 108 after the repair. Eight legitimate cases per state cover normal
variable strings, the valid fixed-width boundary, FITS pixels and the installed
GDAL FITS driver. All 1,808 exported symbols, SONAME and dependencies are retained.
The upstream test program finishes with status zero, including its expected
numeric-overflow diagnostics. PostgreSQL/DocumentDB typed data, read-only account
isolation and a fictional dump/drop/restore pass without network or user data.
Whole-image comparison verifies 26,775 unchanged files and one changed library.
Same-database scans introduce no high/critical findings. Live image/readiness and
the public homepage pass; repeated activation leaves the container and receipt
unchanged. This is not a full live-user Gathio workflow test.

**Separate unresolved behavior:** a 16,384-byte variable-string round trip fails
on both old and patched libraries. Its private evidence and public summary are
retained in `primary-findings.json`; no exploitability or confidentiality impact
is established. The bounds repair does not establish complete CFITSIO clearance.
The Debian version label remains unchanged, so the raw scanner finding remains;
`review-cfitsio.mjs` binds its seven-day review to exact live library bytes and
does not waive the separate limitation.

Replay uses `rebuild-cfitsio.mjs` in a fresh offline workspace, `cfitsio.mjs` for
the candidate/native checks, the existing `check-blkid-apps.mjs --cfitsio gathio`
adapter, `scan-brotli.mjs --cfitsio gathio-postgres` and
`go-final/verify.py --cfitsio-oct28 gathio-postgres`. Completed receipts must be
preserved, not overwritten. The first application receipt came from an equivalent
private adapter; exact comparison verified that the checked-in wrapper changes
only equivalent paths/spec placement, not test behavior. Its repeat attempt
correctly refused to overwrite the successful receipt. Fifteen policy tests
reject wrong inputs, unrelated changes, missing behavior and concealed failures.

Two clean offline compilations produced identical **library bytes**. Compiler,
fixture executable and complete image reproducibility are not inferred. The
[complete library source offer](https://tools.utilibre.org/utilibre-source/security-cfitsio-20261028-source.tar.gz)
includes original notices, vendor sources, patch, build/test instructions and
compiler package inventory. It is 19,393,616 bytes; SHA-256 is
`481f89c9f3d154fd08be141d57c3daf45e8ce488100b1536f793a7bc248f2537`.

The existing transactional `release-brotli.mjs prepare/apply --cfitsio
gathio-postgres` path enforces the finite scope. Rollback restores only the
recorded former image pin and database container; no schema or data migration was
performed. Previous image and private release/rollback evidence remain retained.
Never use image rollback to overwrite or restore the persistent database.

## Completed trust-store update

`released-trust.json` records Anubis and Mezzo updated to Wolfi's
`ca-certificates-bundle` **20261020-r0**, preserving their application binaries,
configuration and earlier Go repairs. The signed repository index authenticates
the exact package; Wolfi does not sign each APK separately. No untrusted-package
override is used. Acquisition identities and source are in `trust-inputs.json`.

The native installer runs in a disposable partial filesystem with no network,
scripts or production mounts. Whole-image comparison permits only the bundle,
its native package inventory/world and new vendor SBOM. The inherited historical
SBOM is retained as metadata; the installed package inventory and actual trust
bundle identify the new version. APK's header ordering, empty dependency fields
and octal padding are compared semantically, with negative tests rejecting real
package/file/checksum/permission changes. `/lib` remains the existing `usr/lib`
symlink. Installer logs stay in private evidence, outside the image.

Both old/new system-store tests verify an ordinary trusted root; the three
retired emSign root subjects are absent after the update. These are local
trust-store tests, not a claim to reproduce a remote certificate-chain exploit.
Anubis additionally passes two independent browser challenges, allow/deny and
authenticated reload on each image, with zero external browser requests. Mezzo
passes native startup, unchanged assets and rejected unsupported proxy URLs on
both images, without querying Tenor. Same-database scans remove the two targeted
findings with no new high/critical records. Exact activation, readiness and a
repeated no-op apply pass; no user data or access policy changed.

Replay: `trust.mjs anubis mezzo`, `check-trust.mjs`, the existing
`go-leaf-final/check-anubis.mjs --trust-oct28 [--before]` and
`check-mezzo.py --trust-oct28`, then `scan-brotli.mjs --trust anubis mezzo` and
`go-final/verify.py --trust-oct28 anubis mezzo`. The existing transactional
release helper accepts `prepare/apply --trust anubis mezzo`. Rollback restores
only the recorded prior image pins and their declared services; it does not
delete or restore persistent data. Private receipts are in `trust/` under this
batch's existing evidence directory. Completed build/scan receipts are never
silently overwritten.

The same checkpoint reviews three CVE-2026-55453 records as binary-package
misattributions: [the upstream repair](https://github.com/OpenPrinting/cups/commit/d41cf0616688721e9d435d54118c4c8a36ed596a)
changes `backend/ipp.c`; each exact installed `libcups2t64` file inventory lacks
that backend. This does not waive affected printing backends, other libcups
defects or an entire machine. The existing binary-component reviewer retains
timestamped inventories, binds decisions to the fresh artifact keys and expires
them after seven days. No package was removed and raw scan records remain.

## Completed library release

`released-libraries.json` records **100 updated containers** (not 100 distinct
applications): 68 NGINX gateways/static-tool containers, 18 Debian/Ubuntu
application roles, and 14 Alpine roles. Existing service access, user data,
privacy settings and application files are preserved. No database migration or
host reboot is part of these changes.

- Alpine vendor curl/libcurl: 8.23.0-r0 on the existing 3.23/3.24 branch;
  DeGoog retains its 3.22 branch and receives 8.14.1-r4.
- Alpine Brotli: 1.2.1-r0; PairDrop's 3.21 branch receives 1.1.1-r0.
- Debian Brotli: 1.1.0-2+deb13u1 or 1.0.9-2+deb12u1.
- Ubuntu Jammy Brotli: 1.0.9-2ubuntu0.1.

Exact original/candidate images, signed package archives and checksums are in
`nginx-inputs.json`, `brotli-inputs.json` and `alpine-inputs.json`. APK signatures
are verified by the original image's keyring; APT acquisition uses authenticated
native indices. Builds install only the named local packages with no network.
Package inventories, image configuration and application/configuration hashes
are compared before/after. No unrelated package update is accepted.

Private receipts live under `/var/lib/utilibre-maintenance/security-20261028/`.
They include bounded error evidence, native tests, raw same-database Trivy
results, preflight snapshots, exact image activation and rollback checks.
`released-libraries.json` is the sanitized public subset. Raw rendered Compose
configuration and fixture keys are not publication inputs.

Verification includes native encode/decode, malformed-input/output-bound checks;
HTTP, redirects, gzip/Brotli, POST, trusted TLS, rejected TLS hostnames and 404;
all 68 NGINX configuration checks; static application hash preservation; and
per-service readiness. RSS-Bridge also passes its actual preloaded PHP client,
HTTP/2 and fictional GitHub-to-Atom fixture. These are compatibility checks,
not a claimed reproduction of the upstream curl/Brotli memory corruption.

PrivateBin's full synthetic test additionally verified encrypted upload and
retrieval of 25,000,000 random bytes, SHA-256 equality, the one-week maximum,
oversized rejection, volume/low-space safeguards and scheduled expiration.
Linux Chromium desktop and mobile emulation were used, not a physical phone.
The repository's `deployment/utilibre/compose.yaml` mirrors the deployed pins.

### Observed limits and recovery

- SimpleLogin's public address returned 502 before this batch and still does.
  Its local login gateway returns 200. This pre-existing edge issue is not
  claimed repaired by the library overlay.
- RSS-Bridge preloads a separate curl-impersonate build. Testing system Brotli
  requires clearing that preload **only in the isolated system-library test**.
  Real PHP consumer tests keep it. Its embedded dependencies remain a separate
  assessment; an OS package update does not repair those copies.
- OpenGist's curl update removes upstream TLS-SRP, an already reviewed upstream
  removal in `closure-followup/curl-policy.mjs`. Its installed healthcheck uses
  ordinary loopback HTTP. Other feature/protocol loss is rejected.
- Addy's first rollout checked HTTP too early during S6/Laravel startup. The old
  image was restored and independently verified; the retry passed with bounded
  HTTP readiness. The original failure and recovery receipt remain retained.
- Pollaris's worker intentionally recycles; preparation waited for its existing
  five-minute stability precondition instead of bypassing it.

## Replay and release

Run acquisition/build/tests in bounded disposable containers, not by installing
packages into running applications. Never overwrite completed private receipts.
Archived assessments require their recorded Trivy database; current release
approval requires data less than 48 hours old. Missing/malformed scans or new
high/critical findings fail the gate. The scanner does not approve deployment.

The finite commands are:

- Existing `check-nginx-tiff-security.mjs` and
  `release-nginx-tiff-security.mjs`, using the `--curl-brotli` profile.
- `acquire-brotli.sh`, run only inside the suite-specific disposable downloader;
  `brotli.mjs KEY...`, then `scan-brotli.mjs KEY...`.
- `alpine.mjs KEY...`, `check-alpine.py KEY...`, and
  `scan-brotli.mjs --alpine KEY...`.
- `release-brotli.mjs prepare [--alpine] KEY...`, followed by a separately
  authorized `apply`. It reuses `language-final/release.mjs` for exact Compose
  scope, namespace handling, native supervisors and transactional rollback.
  `retry` requires verified restoration of old images/configuration/routes.

These are finite release manifests, not arbitrary scanner-selected commands.
Once deployed, preparation correctly rejects the old baseline; repeating an
`apply` on a completed group verifies the exact running artifact without a
restart. Preserve previous artifacts until the next release is accepted.
Rollback changes only the recorded image scalars and recreates their declared
service group through its native supervisor. It does not restore or delete
user data and is not a database rollback mechanism.

## Completed standalone Undici release

`released-undici.json` records 21 images and 22 application roles updated to
same-major Undici 6.29.1, 7.30.1 or 8.12.2. Exact npm archives and their integrity
hashes are pinned in `undici.mjs`; the existing package builder preserves every
unrelated application file and image configuration. Old pnpm path labels are
retained so relative symlinks continue to resolve.

For every installed copy, isolated before/after tests reproduce the custom TLS
callback omission and malformed content-encoding process crash. Fixed copies
reject the malformed input, remain running, and pass seven legitimate HTTP/TLS
checks. Tests cover Node and DeGoog's actual Bun runtime. The installed DeGoog
and Candlr applications also pass isolated startup, privacy-header, error-route
and synthetic account checks as applicable. These do not establish live search
provider availability or real-device compatibility.

Same-database Trivy comparisons remove the targeted Undici finding without new
high/critical records. Each release passes exact-image, native health, existing
route and namespace/supervisor gates. Newsletter SMTP retains its existing
supervisor and network restrictions; no email is sent by these checks.

Replay: `undici.mjs KEY...`, `check-undici.mjs KEY...`,
`check-undici-encoding.mjs KEY...`, `scan-brotli.mjs --undici KEY...`;
Candlr/DeGoog also use `patch-leaves-final/check-app.mjs KEY --undici-oct28`.
`release-brotli.mjs prepare --undici KEY...` prepares the finite scope, and
separately authorized `apply --undici` activates it using the existing release
mechanism. Private evidence is in the `undici/` subdirectory.

## Additional completed releases

- `released-go.json`: five same-source Go 1.26.10 application rebuilds (Galene,
  Rimgo, SafeTwitch, Gothub and AnonymousOverflow). Complete exported images
  differ only in the declared binary. Locked modules and embedded assets remain
  unchanged. Native routes/privacy checks pass; Galene passes a two-client
  synthetic media, screen-sharing and rejoin test. No active Galene connections
  were present at activation. Corresponding source offers were updated.
- `released-curl.json` and `released-curl-bookworm.json`: twelve native curl
  8.23.0 overlays, retaining application/configuration bytes and exported ABI.
  Both native OpenSSL/GnuTLS upstream suites pass. Curl 8.23 removes SMB/SMBS;
  these applications' checked paths use HTTP(S), and this does not change the
  host's Storage Box filesystem mount. Ordinary NTLM remains available.
- `released-body.json`: eight body-parser repairs (Kuma, ByteStash, Planka,
  Gathio, PairDrop, Grist, Reactive Resume and Actual). Every affected old copy
  reproduces the upstream trailing-compressed-bytes crash; repaired copies
  survive and pass seven legitimate/rejection checks. Dependency ranges are
  checked against their actual resolved packages. Grist and Actual use complete,
  lockfile-pinned upstream dependency trees scoped inside body-parser, keeping
  the rest of each application's dependencies unchanged.

Grist additionally passes formulas, private-account isolation, SQLite/CSV
import, export, deletion and a synthetic restore. Actual passes isolated startup
as UID 1000 with a new temporary database. Its first locked candidate failed
production readiness because the copied directory permissions were too narrow;
rollback to the old image was verified, permissions were corrected, the native
UID checks were strengthened, and the replacement passed. Failed receipts remain
private; no user data was restored or deleted.

The Debian scanner does **not** attribute CVE-2026-92392 to the custom 8.22
baseline. Therefore the curl gate records signed upstream source, exact native
package identity and behavior as its fix evidence, and explicitly reports this
scanner coverage gap. Existing distribution findings remain in the raw results;
a changed installed-version string is not counted as a new advisory. The source
archive is `security-curl-20261028-source.tar.gz` on the existing toolbox source
host; SHA-256 `b5da407a584e5b510636a8b90cc67518d6014f039e2a9a5925054d677ea14551`.

Replay extends the existing `go-final`, `closure-followup`,
`bookworm-curl-followup`, `js-closure` and transactional release helpers with
finite October 28 profiles. Go's original release helper retains its no-active-
meeting gate. `body.mjs` handles compatible small replacements; `body-tree.mjs`
handles the two scoped dependency trees using `locks/body1` and `locks/body2`.
Acquire those trees with the recorded official Node image and
`npm ci --ignore-scripts --no-audit --no-fund`, then verify their recorded file
manifest before an offline build. Run `check-body.mjs`, the additional Actual
or Grist app checks, and `scan-brotli.mjs --body` before separate release approval.

## Completed Node runtime release

`released-node.json` and `released-node-apk.json` record **24 application roles**:
23 roles use exact official Node binaries, and PairDrop uses its existing
Alpine branch's signed native package. Same-major releases are 22.23.4,
24.22.1 and 26.12.1. Existing application files, package trees, native-module
ABI and runtime configuration remain unchanged. Final RSSHub pins are mirrored
in the repository's base Compose file.

Before/after native tests reproduce and reject DNS NUL handling and incorrect
TLS hostname handling, with 15 legitimate/rejection checks, real local TLS,
compression and installed native modules. Grist additionally passes private
account isolation, formulas, imports, exports, deletion and synthetic restore;
Actual passes a new temporary database startup as its actual UID. Production
checks verify the exact image, native supervisors, dependent namespaces and
existing routes. No real email, search or notification is generated.

Trivy does not inventory most standalone Node binaries. The gate therefore
retains package findings and records official binary SHA-256/version and native
regression evidence separately. A clean package scan is not proof of a fixed
Node runtime. PairDrop's native APK inventory is checked explicitly.

`node-artifacts.json` identifies the immutable official artifacts and complete
runtime licence notices in `node-licenses/`. The same notices are available in
`node-runtime-notices-20261028.tar.gz` on the existing source host. Replaying
`node.mjs` requires those recorded artifacts; it does not resolve a moving tag.
Run `check-node.mjs`, the applicable app check, `scan-brotli.mjs --node`, and
the separately authorized `release-brotli.mjs prepare/apply --node` steps.
PairDrop uses the corresponding `--node-apk` profile and signed APK inputs.

Identical build-copy files were replaced with hard links only after verifying
their hashes (2,886,549,840 bytes of duplicate copies). All artifact paths,
rollback images, private evidence and user data were preserved.

## Completed embedded HTTP client and six Go helpers

RSS-Bridge now uses immutable curl-impersonate **v2.3.1** (curl 8.23.0,
Brotli 1.2.1), plus native Debian curl 8.23. Its original chrome131 profile,
PHP OpenSSL, allowed bridges and HTTP(S) restrictions remain intact. Both
versions passed actual PHP HTTP/2 transfers and a fictional GitHub-to-Atom
journey. No feature/protocol removal occurred in this update. Curl's new
"Unsupported URL scheme" wording required a fixture adjustment; the rejected
redirect remained blocked. HTTP/3 transfers and the vendor's complete suite
were not exercised. The corresponding-source archive is
`security-curl-impersonate-20261028-source.tar.gz`, SHA-256
`4d21a67a684cac9d55d17285354f0e6f14e482862c33c3907f31a8de14d1462d`.

`released-go-helpers.json` records Anubis, FerretDB, OAuth2 Proxy, Mezzo,
ntfy and Wakapi rebuilt with same-branch Go 1.26.10/1.27.3. Locked dependencies,
embedded frontend/privacy edits and complete image contents were checked.
Only the declared executable(s) changed. Tests include two independent Anubis
challenges; native event creation/editing, images, calendar export and restored
database; synthetic OIDC login/logout and CSRF rejection; GIF frontend/error
routes; ntfy publish/read, one-hour cache and no-cache behavior; and Wakapi's
local account/session, authenticated heartbeat and healthcheck. These checks
do not send real notifications or exercise a real phone or external GIF source.

Offline build failures caused by missing cached test dependencies, timezone
data and temporary-directory capacity were retained and corrected in the
isolated build setup. Failed candidates were not deployed. The ntfy release
probe uses the configured `notify.utilibre.org/v1/health` destination; an
initial incorrect probe hostname was corrected before activation.

The existing closure/leaf scripts have finite October 28 profiles;
`go-helpers.mjs` adapts their receipts to the existing scan, full-filesystem
comparison and transactional release gates. It rejects module drift and
unsupported baselines. Four original application source offers were updated
with prior copies retained. Complete Anubis/FerretDB sources are in
`security-go-closure-20261028-source.tar.gz`, SHA-256
`b4ad92e1e2868c0c9ad7162f090ad957efb739b74c718b19c86d4b24f1e802cb`.

## Completed Caddy, Go service and Authlib repairs

`released-caddy.json` records three images/four roles: Wishlist and the
newsletter web, SMTP and jobs roles. Caddy 2.11.7 retains the earlier x/net
0.60.0 correction and now uses Go 1.26.10. Native HTTP/TLS proxy, compression,
SSE and HTTP/2 checks pass. Two-account Wishlist isolation and a fictional
newsletter SMTP-to-Atom/delete journey pass in isolated networks. No real email
was sent. Complete corresponding source is retained in
`security-caddy-20261028-source.tar.gz`.

`released-go-runtime.json` records Yopass (Go 1.27.3, original CGO setting) and
FMD (Go 1.26.10). Native encryption/decryption, burn-on-read, concurrent retrieval,
expiry and oversized rejection pass for Yopass. Two synthetic FMD accounts pass
opaque-record storage/retrieval, account isolation, token/control CLI and deletion
checks. No real phone or command delivery is involved. Source/module locks and
previous configuration are preserved. Source offer:
`security-go-runtime-20261028-source.tar.gz`.

`released-go-services.json` records Donetick (Go 1.27.3) and LibreSpeed
(Go 1.26.10). Donetick passes two-account creation/read/delete and isolation;
254 embedded frontend assets are byte-checked in both executables by
`check-donetick-assets.py`. An upstream quirk returns 500 for some denied/missing
lookups in both baseline and candidate; the other account receives no chore
content. LibreSpeed passes a bounded 1 MiB download, 64 KiB upload and ping on an
internal test network. Its existing Caddy address passes verified TLS with the
public hostname, but direct public IPv4 times out from this VM. This is **not**
an outside-Internet or connection-speed result. Source offer:
`security-go-services-20261028-source.tar.gz`.

`released-authlib.json` records TRIP's Authlib 1.9.1 repair. Empty-signature JWS
and empty HMAC-key acceptance are reproduced in the old dependency and rejected
after the repair. Valid signatures, wrong-key rejection and TRIP's actual OIDC
client factory pass with a mocked HTTP provider; state mismatches are rejected.
No real account or identity provider is exercised. The first 1.9.0 candidate was
rejected because another high-severity Authlib advisory remained. Its evidence
is retained; only 1.9.1 was deployed. The future wheel pin is captured in
`deployment/trip/runtime-wheels.txt`.

Each release preserves unrelated image files and configuration, retains its
previous image, uses the existing transactional release/rollback gates and
passes same-database scans. Run the corresponding finite profile through
`scan-brotli.mjs`, `go-final/verify.py` and `release-brotli.mjs`; preparation and
activation remain separate commands. Source-offer receipts record archive
SHA-256 and provenance. Go compiler-only rebuilds preserve dependency versions;
they do **not** fix subsequently disclosed Go JOSE module vulnerabilities.

## Completed DNS parser repair

`released-dnspython.json` records six application images/nine roles: TRIP,
Candlr, BeaverHabits, LiberaForms, Authentik and SimpleLogin. Five use the pinned
upstream dnspython 2.9.0 wheel. SimpleLogin requires the 2.7 series; its sole
source change is the upstream 11-line pointer-chain guard, with context adapted
to that release's older parser type annotation. `dnspython-pointer-chain.patch`
and both source hashes are captured in `dnspython-inputs.json`. No fuzzy replay
or dependency-constraint override is allowed.

Each old dependency accepts the small 17-pointer reproduction; every repaired
candidate rejects it, accepts the legitimate 16-pointer boundary, rejects three
malformed inputs and passes ten UDP/TCP A/AAAA/MX/TXT plus email-validator
consumer checks on isolated loopback. No external DNS or real email is used.
The full filesystem comparison permits only the dependency's files (and removal
of its own old bytecode for wheel installs); unrelated dependencies, application
files, trust-store repair and image configuration remain unchanged. All six
same-database comparisons add no high/critical findings. SimpleLogin keeps its
original version metadata, so its remaining scanner record needs the explicit
live-byte reviewer, `review-dnspython.mjs`; it is not silently suppressed.

Replay uses `dnspython.mjs KEY...`, `scan-brotli.mjs --dnspython KEY...`, then
`go-final/verify.py --dnspython-oct28 KEY...` (the existing shared image comparator,
not a claim that these Python applications use Go). Prepare and separately
authorize activation with `release-brotli.mjs prepare|apply --dnspython KEY...`.
All nine roles passed exact-image, native health and existing-route checks.
SimpleLogin's already-present public 502 remains; its local login route passes.
The library repair does not claim to repair the separately managed edge route.

## Completed Django REST Framework backports

`released-drf.json` records Authentik's server/worker and Linkding. Four ordered
upstream patches change exactly five DRF source files per image. They correct
non-text request codecs, repeated/unbounded content negotiation, and ineffective
token revocation. The fourth patch preserves the public `order_by_precedence`
return type. DRF remains 3.17.1/3.17.2 because the 3.18 series changes list
serializer errors; the existing applications keep their established API.

`drf-inputs.json` pins both baseline images, every patch and before/after file
hash. The older `request.META` header lookup and the already-safe admin token
deletion workaround are retained. `drf-LICENSE.md` preserves the upstream BSD
notice. Replay rejects mismatched files or patch context; no fuzzy edits or
dependency resolution occur. These are focused upstream backports, not a claim
that every later DRF change has been applied.

Both baselines reproduce all three defects with bounded synthetic inputs. Both
fixed copies pass rejection checks and 18 legitimate/compatibility checks,
including Unicode/multipart input, token-authenticated requests, independent
tokens, and preserved serializer/precedence interfaces. The oversized-header
check counts parsing work and enforces boundaries; it is not a live load test.
The compression fixture expands to only 64 KiB. Full-image comparison permits
only the five declared source files; configuration, unrelated code and the
earlier trust-store/DNS repairs remain unchanged.

The existing application checks now accept a finite `--drf-oct28` profile:
fresh, disposable databases and fictional credentials, no production data or
secrets, and no external network. Authentik passes native password/TOTP and
RSA/ECDSA OAuth, JWKS, wrong-audience/signature and code-replay checks. Linkding
passes bookmark creation, native HTML export/import, anonymous denial and
cross-account read isolation. These are native Django client/component tests,
not browser MFA or a live external identity-provider journey. Authentik's first
fresh-database attempt used the wrong bootstrap command; its error is retained.
The passing check uses upstream `python -m lifecycle.migrate` exclusively in the
disposable database. No production schema change was introduced.

Replay uses `dnspython.mjs --drf authentik linkding` (the existing small Python
source-overlay builder), `scan-brotli.mjs --drf authentik linkding`, and
`go-final/verify.py --drf-oct28 authentik linkding` (the shared full-image
comparator). Run `check-auth-python.mjs --drf-oct28` and
`check-linkding-python.mjs --drf-oct28` before
`release-brotli.mjs prepare|apply --drf authentik linkding`. Activation remains a
separate authorized step. Linkding's isolated post-release check uses the extra
`--verify-released` flag and requires the exact completed release.

The same-database scans introduce no high/critical findings. Because package
versions are preserved, raw advisories remain visible. `review-drf.mjs` checks
the exact deployed image, every patched live file, behavior, application tests
and release evidence before proposing six scoped, expiring decisions. It does
not waive the application or its other dependencies. Existing transactional
rollback restores only the recorded image pins and declared service roles;
neither upgrade nor rollback edits account records.

## JOSE v4 repair after disk expansion

The `jose` profile updates only `github.com/go-jose/go-jose/v4` to **4.1.6**
in Yopass, Donetick, ntfy and Vikunja. Existing Go 1.27.3 compilers, CGO mode,
application revisions, other modules, frontend assets and runtime settings stay
unchanged. New checksum-pinned lockfiles preserve every previous dependency
fix. `released-jose.json` records all four completed, healthy live releases.
The additional v3 consumers are covered by the separate release below.

The offline upstream suites passed 302 checks on 4.1.4, 490 on 4.1.5 and 529
on 4.1.6, including the added bounded modulus and legitimate RSA, ECDSA,
Ed25519, HMAC and JWE round trips. Old versions accept the oversized public
modulus; the patched version rejects it. This demonstrates the missing input
bound without running a CPU-exhaustion attack. No live provider or user token
was involved. The upstream 4096-bit RSA limit is retained; accepting larger keys
would require a separate compatibility/security decision.

Replay uses `jose.mjs locks` only to capture the reviewed fixed version once;
committed lockfiles are immutable inputs for `download`, then `build` with
network disabled. `stage` rejects unrelated module changes and preserves the
image configuration. Run the existing Yopass/Donetick/ntfy/Vikunja native
fixtures, the relevant embedded-asset check, `jose.mjs proof`,
`scan-brotli.mjs --jose` and `go-final/verify.py --jose-oct28` before
`release-brotli.mjs prepare --jose`. Separately authorized `apply --jose` uses
the existing exact-image, readiness and transactional rollback gates. Raw
scanner findings and old images are retained; rollback is not a database
restore. There is no schema migration or access/retention change in this batch.

Yopass's fixture checks encryption, retrieval, concurrent burn-after-reading,
one-hour expiry, length limits and uploads remaining disabled. Donetick checks
two fictional accounts, task creation/deletion and account isolation; its
pre-existing denied/missing-item 500 responses are not claimed repaired.
ntfy checks anonymous permissions, one-hour expiry, no-cache behavior and
restart cache removal. Vikunja uses its established two-account, attachment,
export and synthetic restore fixture. These are isolated API/native checks,
not physical-device or external-provider tests.

The separate `jose-v3-rsa.patch` adapts the exact upstream RSA bounds to
3.0.5. Both baseline and repaired v3 libraries passed 262 native checks;
the bounded oversized-modulus regression changes from accepted to rejected.
The first fixture attempt used Go's newer `any` spelling despite the module's
Go 1.12 language setting; it was corrected to `interface{}`. That build failure
is retained and is not counted as reproduction of a vulnerability.

The source bundle is `security-jose-20261028-source.tar.gz`, SHA-256
`0a03e63dc7e988c3cc3547d12b0a80dab90ca698b81238d7ad03344da028b345`.
It is linked from the existing shared source index. The PDF origin serves both
index and archive successfully; a Python request through the tools origin
received an edge 403, which is not represented as a source-file failure.
ntfy and Vikunja individual source offers were also updated, preserving their
previous archives.

## Completed JOSE v3 consumer repairs

`released-jose-caddy.json` records three images and four application roles:
Wishlist, newsletter web, SMTP and jobs. `released-jose-leaf.json` records
OAuth2 Proxy and Wakapi. All six roles passed exact-artifact, native health and
existing-route release gates. These repair embedded Caddy copies; they do not
change the separate edge Caddy VM. Application versions, compilers, access
settings and persistent data are unchanged.

All five images receive JOSE v4 **4.1.6** and the exact v3 RSA bounds above.
Caddy remains 2.11.7 with its prior x/net 0.60.0 fix; OAuth2 Proxy remains
7.15.5, and Wakapi keeps its recorded source revision. Caddy and OAuth2 Proxy
keep Go 1.26.10; Wakapi keeps Go 1.27.3. Complete image comparisons permit
only the declared binaries and Caddy build notices. Wakapi's healthcheck and
all 82 embedded assets/templates are unchanged.

Application verification uses synthetic data only:

- Caddy: HTTP/TLS proxying, gzip, SSE and HTTP/2; Wishlist account, list/item
  persistence and anonymous denial; newsletter feed creation, isolated SMTP
  ingestion into Atom and deletion. No external email was sent.
- OAuth2 Proxy: discovery, authorization-code exchange, PKCE, signed ID token,
  authenticated cookie/identity header, forged-state rejection and logout.
  The fake provider and client run inside a network-disabled namespace.
- Wakapi: a fresh SQLite database, native local-account login/logout,
  authenticated synthetic heartbeat, anonymous denial and native healthcheck.
  Real production OIDC and real users' activity were not exercised.

Replay uses `caddy-security/build.mjs --jose`, its existing Caddy/Wishlist/
newsletter checks and `security-20261028/caddy.mjs --jose`. OAuth2 Proxy and
Wakapi use `jose.mjs --v3 download/build/stage/proof KEY...` with committed
`locks/jose-leaf`. Acquisition is separate from network-disabled compilation;
source snapshots and all non-target module versions are verified. The
existing `check-oauth.py`, `check-wakapi-assets.py` and `check-wakapi.py` accept
`--jose`. Run `scan-brotli.mjs --jose-caddy/--jose-leaf` and
`go-final/verify.py --jose-caddy-oct28/--jose-leaf-oct28`, using the relevant
profile, before separately authorized `release-brotli.mjs prepare/apply`.
There is no schema migration or retention change; exact previous images and
configuration snapshots remain available for the existing transactional rollback.

Raw v3 findings remain because its version metadata is still 3.0.5. The
`review-jose-caddy.mjs [--leaf]` review requires a fresh complete fleet scan,
matching release chain, native regression/application evidence and actual
running binary hashes. It can propose only the exact CVE, binary and image for
a seven-day mitigation review. It grants no exception to other consumers or
advisories. Additional v4 header-parsing hardening was not ported to the v3 API.

Two rejected Caddy build attempts are retained privately: a compiler without
Git and a raw local image ID that BuildKit interpreted as a registry name.
The successful build checks the exact patch postimage before compilation and
uses a local image tag only after verifying its immutable image ID. Neither
failed candidate was deployed.

The complete Caddy source offer is
`security-jose-caddy-20261028-source-r2.tar.gz`, SHA-256
`8f3c36bda74f0df1182451ac13df362f69bc4c4ab2d43ce31cbd687f7ab9eaab`.
Revision 2 includes the native compile script omitted by the first packaging
attempt; the first archive remains retained. The published archive's recipe
and patch were compared with the checked-in inputs. Updated individual offers:

- `oauth2-proxy-utilibre.tar.gz`: SHA-256
  `18036e2370e1747d1c4df4666cd7a769ee7237afc5bdc2932364b86f4175bb47`.
- `wakapi-utilibre.tar.gz`: SHA-256
  `f03ed5a9cba827453168963f20e110f575dfe2f38c23428c0170fd3d84465371`.

Both include the exact reviewed locks, v3 patch/postimage, upstream source and
licenses, compiler identity and native rebuild instructions. The Wakapi offer
explicitly preserves the existing healthcheck. Previous public archives are
retained privately. Reproducible inputs and verified behavior are established;
byte-for-byte reproducible builds are not claimed.
The final source-route check verified the exact index and all three archive
hashes through the existing Caddy address, with public hostname/SNI and normal
TLS validation. A Python request through public DNS received an edge 403;
this check does not establish outside-Internet access for every client.
No CDN/WAF setting was changed. The distroless OAuth image intentionally has
no `sha256sum`; the live-payload reviewer copies its binary out for a local
hash check rather than installing tools in the container.

## Evidence durability and remaining assessment

`restore-review-sources.py` reconstructs older mount, HEIF, TIFF and X-library reviewer source trees from
checksum-pinned retained source offers with networking disabled. It does not
rebuild or deploy applications. The existing native-library reviewers still
check exact source/patch and running-library bytes. The October curl profile in
`closure-followup/review-curl.mjs` verifies complete native tests, completed
release chains and actual library/package hashes before proposing individual
expiring decisions. Raw scanner findings remain intact.

The fleet checkpoint in `status.json` covers all 109 running image assessments
plus host and tracked-source coverage. After the explicit reviews, no critical
records await review; high-severity work remains. This is not an all-clear:
raw scanner counts include previously repaired packages and component
misattribution, while tracked historical inputs, Zod and host/native
findings still require separate work. The private `security-queue.json` is the current
source of counts, including replacement-image revalidation. No blanket exception
is granted to descendants of repaired images or to all packages in a container.

Only completed compiler/module caches were compressed, archive-compared and
removed in expanded form to preserve the 8 GiB free-space floor. Their archives,
checksums and restore paths remain under the private batch directory. No runtime
content, saved account work, backup or rollback image was removed. On 28 October the operator expanded the main Proxmox disk from 220 to 270 GiB.
Online `growpart /dev/sda 1` and `resize2fs /dev/sda1` succeeded: the root
filesystem is 266 GiB, with approximately 56 GiB free immediately afterward.
The separate 15 GiB temporary-data disk, EFI partition and TRIP loop filesystem
were unchanged. No reboot or failed systemd unit resulted. Private partition
preflight and result receipts are in `disk-expansion/`.

## Sources checked 28 October 2026

- [curl HTTP/2 advisory](https://curl.se/docs/CVE-2026-92392.html).
- [Brotli 1.2.1](https://github.com/google/brotli/releases/tag/v1.2.1),
  [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-111497),
  [Ubuntu tracker](https://ubuntu.com/security/CVE-2026-111497).
- [Undici TLS option fix](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx),
  [response-stream crash fix](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c).
- [body-parser advisory](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
- [Node October security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
- [curl-impersonate v2.3.1 security release](https://github.com/lexiforest/curl-impersonate/releases/tag/v2.3.1).

- [Authlib signature advisory](https://github.com/authlib/authlib/security/advisories/GHSA-6v38-4h7w-rj9h)
  and [1.9.1 release](https://github.com/authlib/authlib/releases/tag/v1.9.1).
- [dnspython pointer-chain advisory](https://github.com/rthalley/dnspython/security/advisories/GHSA-45c3-73f7-pv4m)
  and [exact upstream fix](https://github.com/rthalley/dnspython/commit/b485e460c266540a1a09ca6d8d1d7b685b1d3023).
- DRF [codec](https://github.com/encode/django-rest-framework/security/advisories/GHSA-3547-9m27-7rxg),
  [negotiation](https://github.com/encode/django-rest-framework/security/advisories/GHSA-33wh-fxxf-88vv),
  [token revocation](https://github.com/encode/django-rest-framework/security/advisories/GHSA-xw6w-gcfp-cf8m),
  and [precedence compatibility fix](https://github.com/encode/django-rest-framework/commit/e140de794d11149a09c04a3ee7cc4815946148f8).

Validation: 43 existing release, rollback, curl-policy and backport-scope tests
pass. The recorded scanner is Trivy 0.75.0; the DNS/Authlib comparisons use
advisory data updated 28 October 2026 at 07:10:42 UTC, SHA-256
`2c8f4b04f224aded9ecd149b9b5304146736668220dfa403403358fb423a52fd`.
Each before/after pair checks that its database remains unchanged. Older batch
comparisons retain their own database identity; they are not relabelled with the
newer snapshot. Current versus archived assessments remain separate.

The latest checkpoint is recorded in `status.json`; it supersedes earlier
counts in this release history. These numbers are package/artifact occurrences,
not a vulnerability count or a full security clearance. The running guest kernel
is 6.12.113+deb13-cloud-amd64; its build configuration disables GCOV. The separate
GCOV header-package review does not assess the Proxmox host. Four individually
reviewed historical kernel findings are also excluded only from the newly
installed 6.12.113-1 UAPI-header package after inspecting its complete payload;
this is not a kernel exemption. Its four policy tests pass.

The exact core Trivy advisory database and metadata are retained in the private
`utilibre-advisory-db-20261028.tar.gz`, with checksums in `advisory-snapshot.json`.
Java's extraction database was not archived because the combined archive would
cross the disk floor; raw Java results remain retained, but complete archived
Java replay is not claimed. No database refresh is part of these replay checks.

- [Go JOSE RSA parsing advisory](https://github.com/go-jose/go-jose/security/advisories/GHSA-mgcc-cww5-fp2q) and [upstream 4.1.6 fix](https://github.com/go-jose/go-jose/commit/a0111f82742fa92bceec9ede40845e73319e6230).

## Follow-up repairs deployed 28 October

The following receipts record additional code/package repairs, not just scanner
exclusions. No account content or service retention settings changed.

| Receipt | Exact change | Verification |
| --- | --- | --- |
| `released-blkid.json` | Eight Bookworm images retain their ABI and receive the upstream EBR bounds fix in libblkid | Fourteen regular-file cases per old/new library; baseline invalid-partition acceptance reproduced; candidate rejects it and accepts valid partitions. Restricted upstream suite: 225 reported, 213 skipped, zero failures. Additional Actual, Gathio database, Kuma and RSS-Bridge consumer checks. |
| `released-expat.json` | Addy, DeGoog, 4get, Kittygram and OpenGist receive signed Expat 2.9.0 on their existing Alpine branch | Four normal native checks on the old library; five on the new library including overflow rejection. Vulnerable memory corruption was not triggered. |
| `released-postal.json` | Newsletter SMTP/jobs, newsletter web and RSSHub receive postal-mime 4.0.8 | Seven legitimate MIME checks per state; deterministic character-work regression; synthetic isolated SMTP-to-Atom and deletion; RSSHub native startup. No external mail sent. |
| `released-pcre.json` | DeGoog receives signed Alpine 3.22 PCRE2 10.46-r1 | Seven native compile/JIT/capture/UTF-8/error checks per state; actual Bun application startup, form, readiness, 404 and privacy-header checks. This is compatibility evidence, not memory-corruption reproduction. |
| `released-cryptpad-body.json` | One exact body-parser source file backported from upstream f7075eae in CryptPad's mounted code | Old process crash reproduced; seven normal parser checks per state and three lifecycle checks; complete disposable account/document/team/upload/import/export exercise. |
| `released-host.json` | Host curl 8.23.0 and BIND client libraries 9.20.30 | Three curl library paths each pass seven native HTTP/TLS checks; legacy ABI/alias retained. BIND UDP A/AAAA/NXDOMAIN and TCP A pass; optional LMDB stays disabled. SSH/Docker PIDs and libc unchanged. |
| `released-multer.json` | Gathio receives Multer 2.5.0, keeping the existing runtime dependencies and pnpm links | Old asynchronous-filter crash reproduced; candidate survives; eight normal memory/disk upload checks per state. Five additional checks per state execute the installed event/group/ICS upload configuration. Image decoding and a live-user upload are not claimed. |

The libblkid replacement has SHA-256
`e7c8ba644880df7594fef438046a271b389bc8e02688c72d58692928e1be854e`.
Whole-image comparison permits only the declared library. Debian source-family
findings repeat this advisory against sibling util-linux packages; the explicit
reviewer checks the loaded library in each exact image before issuing an
expiring mitigation. It does not exempt arbitrary util-linux findings.

CryptPad's patch preserves body-parser 2.3.0 metadata, all dependency locks and
the already repaired runtime image. An image update alone cannot repair this
mounted code. Reinstalling its dependencies must replay `cryptpad-body.patch`
against the exact preimage and rerun both tests; blindly copying an old
`node_modules` directory is not the maintenance path. The source offer contains
the full original library, exact upstream/contextual patches and test recipes.
Old bytes remain privately available for a code-only rollback.

### Replaying these repairs

- `blkid.mjs` and `build-blkid.sh` use the exact inputs and detached regular-file
  fixtures in `blkid-inputs.json`. `check-blkid-apps.mjs` checks the consumers;
  `check-actual.mjs --blkid` supplies the separate Actual fixture.
- `alpine.mjs --expat KEY...` and `alpine.mjs --pcre KEY...` reuse the signed
  native package mechanism. Fixture manifests pin the source/header/compiler
  and executable hashes. The PCRE application gate is
  `patch-leaves-final/check-app.mjs degoog --pcre-oct28`.
- `postal.mjs KEY...` uses the existing exact npm package builder;
  `check-postal.mjs KEY...` verifies the actual libraries. The newsletter and
  RSSHub companion fixtures are recorded in their private application receipts.
- `body.mjs --multer gathio`, `check-multer.mjs` and `check-multer.mjs --consumer`
  prepare and test the exact Gathio dependency replacement. Its current filters
  are synchronous; the update removes the latent async-filter crash without
  changing permissions or limits. The first isolated build tried replacing a
  pnpm symlink and correctly failed its file-scope gate. The corrected candidate
  replaces the resolved package directory and preserves the link. No failed
  candidate was activated. Complete base source plus overlay is published in
  `security-gathio-multer-20261028-source.tar.gz`, SHA-256
  `aa69966daeca31ec34f088bc0eb26b2d526aa0a35ffc260b9d3af41c81b2be89`.
- `cryptpad-body.mjs` prepares a clean one-file source candidate and regression
  evidence. `application-leaves-final/braces-application.mjs --body-oct28`
  reuses the existing full application fixture. `braces-release.mjs prepare
  --body-oct28` checks the code-only scope; a separately authorized `apply`
  verifies the exact same candidate, preserving rollback bytes and data.
- Host preparation and native checks reuse `closure-followup/curl-host.mjs`,
  `curl-host-native.mjs`, `build-bind.sh`, `check-bind.py` and `release-bind.mjs`
  with their finite `--oct28` profiles. Inspect their command modes before use;
  release commands are not audit commands.

Image candidates require `scan-brotli.mjs --PROFILE KEY...` against the same
recorded database, then `release-brotli.mjs prepare --PROFILE KEY...` and a
separately authorized `apply`. Completed receipts are not overwritten. Package
acquisition can use the named upstream; native tests/builds use restricted
disposable namespaces and no production data. Historical replay does not mean
current security clearance. Previous images and package archives remain for
scope-specific rollback; none of these changes performs a database migration.

### Exact review and operational limits

The gosu helper's Go advisory is reviewed separately from genuine Go repairs.
Five immutable image copies / fourteen roles contain the same helper hash.
Its complete native Go function table contains no affected `crypto/x509`
package; the inspector detects that package in a real TLS-capable positive
control and rejects a malformed ELF. The expiring decision applies only to
that helper and CVE-2026-111943. It does not excuse Kuma's TLS health helper or
other Go binaries. Original findings are retained.

Existing SimpleLogin, X-library, Next.js and vendor-package decisions are
revalidated against exact live artifacts and retained source evidence. Next.js
is an unreferenced optional peer in Reactive Resume's Hono deployment; this
specific conclusion is not a blanket exception for Next.js applications.
Reviews and ledger application run sequentially: concurrent ledger writers are
not supported. New image keys require new evidence; copied decisions are not
accepted. `followup-overlays.mjs` records only completed release chains.

CryptPad, libblkid and BIND source archives were checked through the existing
Caddy address with public SNI and normal certificate verification. This proves
that route and the exact bytes, not outside-Internet reachability. The separate
Caddy/Proxmox machines are outside this VM's scan. No reboot or SSH reload was
performed. Remaining bootloader/SSH/guest-agent changes require their own
reviewed scope and appropriate maintenance coordination.

Primary follow-up references, checked 28 October 2026:
[libblkid bounds fix](https://github.com/util-linux/util-linux/commit/05c2dbadf34cc74192287f377904afaaf4061623),
[postal-mime advisory](https://github.com/postalsys/postal-mime/security/advisories/GHSA-f2hq-32vh-53cc),
[body-parser advisory](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828),
[Multer lifecycle advisory](https://github.com/expressjs/multer/security/advisories/GHSA-q7qp-rjg7-q26m),
[Alpine PCRE2 package](https://pkgs.alpinelinux.org/package/v3.22/main/x86_64/pcre2),
[Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p3m5-59mp-jv5r).

## Authentication, parsing and consumer follow-up

The following additional releases are live. Their receipts preserve exact old
and new image identities; all package acquisition, preparation and tests are
separate from the transactional activation command. None changes registration,
account data, retention, telemetry or database schemas.

| Receipt | Change | Observed verification |
| --- | --- | --- |
| `released-msgpack.json` | Authentik server/worker: MessagePack 1.2.4, exact CPython 3.14 wheel | Twelve ordinary checks per state, native and fallback APIs, rejected-value reference leak and incomplete-array preallocation regression. Synthetic password/TOTP/OAuth/JWKS sessions pass against a fresh database. |
| `released-nltk.json` | KitchenOwl: upstream Weka model-path validation, with the import adapted to installed NLTK 3.10.3 | Eighteen path rejection cases and six legitimate cases. Existing six-API NLTK protections, real ingredient parsing, ARFF writing and account-isolated recipe import/export pass. Weka lookup is intercepted; a JVM invocation is not claimed. |
| `released-symfony.json` | Pollaris and Wallabag: HTTP header bounds; Pollaris also gets YAML nesting bounds | Small old inputs reproduce PCRE budget exhaustion and missing depth rejection. Fixed code retains whitespace-separated headers, valid YAML and parser reuse. Pollaris two-session create/vote/export/delete and worker startup pass; Wallabag passes 26 native private-account checks per state. |
| `released-markdown.json` | RSSHub: markdown-it 15.0.3 with a scoped, locked seven-package tree | Twenty ordinary CJS/ESM checks per state, fixed CLI, bounded unclosed-reference regression and native RSSHub startup. Every unrelated application file is preserved. No external feed connector is queried. |
| `released-health.json` | Kuma: unchanged upstream health helper compiled with Go 1.26.10 | Five HTTP, fallback-port, redirect, local TLS and connection-failure checks per state; isolated Kuma account setup/login. Whole-image comparison permits only the helper binary. |
| `released-x11.json` | Wallabag: signed Alpine 3.24 libX11 1.8.14-r0 | Eight native Xrm/keysym/geometry checks per state, identical exported symbols and native dependencies, plus the same 26 private-account checks per state. No malicious X-server wire test is claimed. |

MessagePack preserves every unrelated dependency, including the prior certifi
repair. NLTK and Symfony preserve package version metadata, so Trivy continues
to report those upstream versions. `review-source.mjs` verifies the exact
current file hashes, completed release chain and native proof before proposing
only the corresponding expiring decisions. Its policy matches Trivy's actual
`composer-vendor` records, including their `v` version prefix; a source lock
record cannot inherit that runtime decision. Raw findings are retained.

The Symfony header fix includes upstream's whitespace-separator compatibility
follow-up. The YAML change uses the installed 7.4 method signature, not the
older two-argument variant. Complete component source and tests are published
as `security-symfony-20261028-source.tar.gz`, SHA-256
`6c4cd238e69a1676987086bbf694cbcfdd438c5cf7fc72c922a0e3dcc70ea1fd`.
NLTK's matching addendum is `security-nltk-weka-20261028-source.tar.gz`, SHA-256
`a5e38200ea5382eb41bf9eed9279cb0762bde8fc15af9081fdd988bd9f7084f4`.
Their HTTPS source-route bytes were checked. These addenda retain the earlier
complete source offers and required upstream notices.

### Replaying this follow-up

- MessagePack uses `dnspython.mjs --msgpack authentik`,
  `check-auth-python.mjs --msgpack-oct28`, and
  `go-final/verify.py --msgpack-oct28 authentik`.
- NLTK uses `dnspython.mjs --nltk kitchenowl`, the existing
  `application-leaves-final/nltk-check.mjs --weka-oct28` adapter and
  `go-final/verify.py --weka-oct28 kitchenowl`.
- Symfony uses `symfony.mjs`, the Pollaris/Wallabag existing PHP fixtures with
  `--symfony-oct28`, and `go-final/verify.py --symfony-oct28`.
- Markdown uses `body-tree.mjs --markdown rsshub`, `check-markdown.mjs rsshub`,
  `closure-review/check-kuma-rsshub.mjs --markdown` and
  `go-final/verify.py --markdown-oct28 rsshub`. Acquire the exact committed
  `locks/markdown15` tree with `npm ci --ignore-scripts --no-audit --no-fund`
  in the pinned compiler image, with npm's update notifier disabled. The tree
  and lock hashes must match `markdown-locks.json` before the offline build.
  The package and all six runtime dependencies are nested inside its original
  pnpm directory, preserving external symlinks and shared dependencies.
- Kuma uses `health.mjs`, `closure-review/check-kuma-rsshub.mjs --health` and
  `go-final/verify.py --health-oct28 kuma`. Its compiler/source checksums are in
  `health-inputs.json`. It uses no dependency downloads. The helper retains
  upstream's acceptance of self-signed loopback TLS and of completed HTTP 404
  responses; this compiler repair does not improve those existing semantics.
- Xlib uses `alpine.mjs --x11 wallabag`, `check-x11.mjs` and
  `php-20261022/check-native.mjs --x11-oct28 wallabag`. Compile the small
  `x11-native.c` fixture using the exact offline compiler and arguments in
  `x11-fixture.json`; its recorded binary hash must match. The signed package
  archive is pinned in `x11-inputs.json` and verified by the base image's APK
  keyring without network access.

Each profile also requires `scan-brotli.mjs --PROFILE KEY...`, using its recorded
unchanged advisory database, before `release-brotli.mjs prepare --PROFILE` and
a separately authorized `apply`. These commands are not a default audit.
Full-image inventory checks run after the scan; scope-specific app gates must
also pass. The known base must match, and repeated completed activation checks
the exact running image without restarting it. Rollback restores only the
recorded image pins and declared service group; it does not restore account
data. Keep the prior images and private receipts.

The initial Kuma candidate build hit Docker BuildKit's local-image-ID lookup
limitation and failed before creating or deploying an image. The corrected
recipe explicitly uses the existing classic offline builder and preserves file
mode in its input. The failed diagnostic remains private. No application
source or user data was sent to a registry.

Current-image revalidation runs serially. The existing header reviewer can
apply only the explicitly selected immutable CNA snapshot
`d4e64685005cb49f8cf3123b04e49eac6617de00`, read offline, with per-record source
and installed UAPI inventories. It does not clear kernel binaries or the
Proxmox host. Earlier mount and OTPHP decisions were independently rechecked
against current bytes; no decisions are copied merely because an image is a
descendant of another.

Primary references checked 28 October:
[MessagePack](https://github.com/msgpack/msgpack-python/security/advisories/GHSA-j586-36cw-2gc2),
[NLTK](https://github.com/nltk/nltk/security/advisories/GHSA-j456-xh4h-cpf2),
[Symfony headers](https://github.com/symfony/symfony/security/advisories/GHSA-r925-mgvr-h9cc),
[Symfony YAML](https://github.com/symfony/symfony/security/advisories/GHSA-2v3c-qxhr-7vpv),
[Markdown parser](https://github.com/markdown-it/markdown-it/security/advisories/GHSA-gfr2-rv44-r23c),
[Go certificate advisory](https://pkg.go.dev/vuln/GO-2026-6809).

## Rimgo and FerretDB compression follow-up

`released-codec.json` records the two live images. Only the application binary
changes in each; Go 1.26.10, every unrelated module, image configuration and
FerretDB's existing MCP repair are preserved. Exact source/module checksums and
locks are in `codec-inputs.json` and `locks/codec/`. The dependency is
`github.com/klauspost/compress` v1.20.2 (BSD-3-Clause, with Apache-2.0 gzhttp
notices retained in `codec-LICENSE.txt`).

Both old versions (1.18.0 and 1.18.5) reproduced the signed dictionary-length
overflow and bounded FSE parser panic in network-isolated fixtures. The update
rejects all three dictionary boundary cases and returns errors for the two FSE
frames without a panic. Seven ordinary gzip/Zstd/S2 checks pass per state. The
dictionary test does not run the unsafe old encoder. The initial fixture build
exhausted its 32 MiB temporary filesystem, not the VM disk; the compiler now uses
the bounded 512 MiB work filesystem. Its failed diagnostic is retained privately.

Rimgo's four local routes and native utility tests pass without querying Imgur.
This does not establish live provider-media availability. FerretDB passes native
MCP/util checks and Gathio event creation, editing, denied incorrect edit keys,
image upload, ICS import/export, and stop/copy/restore/reopen against fictional
data. No production database is restored or migrated. Full image inventories
permit only the declared binary. Same-database scans remove CVE-2026-63209 and
introduce no high/critical records. CVE-2026-116591 is newer than that database: its
proof is the pinned upstream regression, not a claimed scanner detection. Other
Go consumers remain separately assessed, not automatically cleared.

Replay Rimgo with `go.mjs --codec rimgo prepare`, `download`, `build`, then
`stage`; run `check-codec.mjs`, `go-final/check-native.mjs --codec-oct28`, and
`codec.mjs proof rimgo`. FerretDB uses `go-closure/build.py ferretdb --oct28
download --codec` and `build --codec`, then `codec.mjs stage ferretdb`,
`go-closure/check-ferretdb.mjs --codec-oct28`, `check-codec.mjs --ferretdb`, and
`codec.mjs proof ferretdb`. Each also requires `scan-brotli.mjs --codec KEY` and
`go-final/verify.py --codec-oct28 KEY`. Scripts retain completed evidence and
reject unexpected lock changes. The three module-policy and nine existing
release-policy tests pass.

The existing transactional `release-brotli.mjs prepare/apply --codec` gate
activates only the recorded images after these checks. Repeated completed apply
verifies the running image without a restart. Roll back using each receipt's
old image pin and the same declared service group; no data/schema changes were
made. Retain the prior images and private release receipts.

The matching complete sources, prior patches, embedded assets, locks and notices
are published as `security-codec-20261028-source.tar.gz` (97,715,385 bytes), SHA-256
`7b39f9fa64597cc4b1a5ce48ea3b08425dfdae7fbb75e5d4c08deaa557cbbede`.
`publish-codec.mjs` reconstructs the offer from checksum-pinned inputs.

Primary references checked 28 October:
[dictionary overflow](https://github.com/klauspost/compress/security/advisories/GHSA-259r-337f-4rfw),
[FSE/Huffman panic](https://github.com/klauspost/compress/security/advisories/GHSA-fpmh-frq8-7rj8).

## OAuthlib: verified improvements and a retained upstream discrepancy

`released-oauth.json` records Authentik server and worker on the exact same
application revision with OAuthlib 4.0.0. The pinned BSD-3-Clause wheel requires
no new dependencies. Whole-image comparison permits only OAuthlib's own package,
metadata and removal of its previous bytecode; all other dependencies, certifi,
prior DRF/MessagePack fixes and runtime configuration remain unchanged.

Eleven ordinary library checks pass before and after, including client and
password grants, rejected permissions/credentials, RFC-derived OAuth1 signing,
requests-oauthlib integration, PKCE correctness and token revocation. Both
authenticated client-ID mismatch cases succeed incorrectly in 3.3.1 and are
rejected in 4.0.0. The fixed API removes JSONP. The initial fixture expected
HTTP 500 for the native `server_error`; the actual upstream response is HTTP
400. That test expectation was corrected, with the failed diagnostic retained.

**CVE-2026-49272 is not behaviorally fixed by this wheel**, despite upstream's
fixed-version field and the scanner removing the record. The isolated device
grant still accepts a bogus device code without calling the rejecting validator.
`primary-findings.json` preserves this discrepancy separately from scanner
counts. Direct source inspection finds only one OAuthlib consumer in this exact
Authentik tree: its requests-oauthlib OAuth1 client. The actual consumer passes
request-token, callback/session and signed access-token tests with an intercepted
transport. Authentik uses its own OAuth2 provider; its synthetic password, TOTP,
RSA/ECDSA token exchange, JWKS, audience/signature and replay checks pass using a
fresh isolated database. This is not a live external-provider or browser-MFA
claim, nor proof about future dynamic imports.

Replay uses `dnspython.mjs --oauth authentik`, `check-oauth.mjs`,
`check-auth-python.mjs --oauth-oct28`, `scan-brotli.mjs --oauth authentik`, and
`go-final/verify.py --oauth-oct28 authentik`. The existing release gate requires
the exact consumer inventory, native proof and retained discrepancy; it cannot
use scanner disappearance as proof of a device-code fix. Rollback restores the
recorded MessagePack-fixed predecessor for both roles and any namespace
companions. No account schema, registration setting or data is changed.

Primary references checked 28 October:
[client identity binding](https://github.com/oauthlib/oauthlib/security/advisories/GHSA-7984-qgvg-3j9c),
[device-code advisory](https://github.com/oauthlib/oauthlib/security/advisories/GHSA-3jp2-3mrg-2vxc),
[4.0.0 release](https://github.com/oauthlib/oauthlib/releases/tag/v4.0.0).

## FMD and KitchenOwl: text and file-locking repairs

FMD's `released-text.json` changes only `golang.org/x/text` from 0.40.0 to
0.41.0, using the original 0.17.0 source, Go 1.26.10, exact embedded assets and
unchanged dependencies. The source/module sums and exact resulting locks are in
`text-inputs.json` and `locks/text/fmd`. A short Unicode compatibility expansion
crashes the old Nickname profile and succeeds after the repair; four ordinary
transformations and 100 bounded streaming combinations pass. The initial
fixture incorrectly treated that expanding character as a normal baseline
case; it is now explicitly a caught-panic regression, with the failed logs
retained. A missing extracted baseline module also failed closed before the
fixture ran; both exact old/new zip identities are now checked.

The real FMD server/control binaries pass protected registration, two synthetic
accounts, opaque-record save/read, cross-account and anonymous denials, account
deletion and native CLI checks. No phone, push, real location or application
encryption protocol is tested. Both binaries are the only image file changes;
the runtime web override remains unchanged.

Replay uses `go-runtime.mjs --text download/build fmd`,
`stage-go-runtime.mjs --text stage fmd`, `check-text.mjs`, the existing
`go-runtime-20261011/check-fmd.mjs --text`, then
`stage-go-runtime.mjs --text proof fmd`, `scan-brotli.mjs --text fmd`, and
`go-final/verify.py --text-oct28 fmd`. The existing transactional release takes
`prepare/apply --text fmd`. No schema/data migration occurs; the release receipt
retains exact predecessor pins for rollback. The complete source offer is
`security-text-20261028-source.tar.gz`, 64,482,635 bytes, SHA-256
`f1ba4e5a12ab80299c1a8876f0625de79b36df120f7c4083e4d1404dd9f1e143`.
Its public HTTPS route returns 200 with the matching length; the local served
archive hash was verified.

KitchenOwl uses the dependency-free MIT filelock 4.2.1 wheel, preserving prior
NLTK path validation, all unrelated package files and runtime configuration.
Ten ordinary checks cover native/soft reentrancy and contention, release/reuse,
async locks, actual Hugging Face WeakFileLock and read/write locks. A planted
non-empty WAL directory makes the old lock fail; the update takes the lock and
preserves the sentinel. This is a Linux tmpfs test, not a Windows, distributed
filesystem or malicious-ancestor guarantee. Its existing NLTK regression and
ingredient-parser checks plus native private-account recipe import/export pass.

The finite replay profile is `dnspython.mjs --filelock kitchenowl`,
`application-leaves-final/nltk-check.mjs --filelock-oct28`,
`scan-brotli.mjs --filelock kitchenowl`, and
`go-final/verify.py --filelock-oct28 kitchenowl`, followed by the separately
authorized `release-brotli.mjs prepare/apply --filelock kitchenowl`. The wheel
checksum, version and Python prerequisite are pinned in `filelock-inputs.json`;
no resolver or moving tag is used. Rollback restores the Weka-fixed image and
unchanged service configuration; no user data or schema is modified.

Primary references checked 28 October:
[Go text advisory](https://pkg.go.dev/vuln/GO-2026-6629),
[upstream text change](https://go.dev/cl/793360),
[filelock advisory](https://github.com/tox-dev/filelock/security/advisories/GHSA-v4x8-3wr5-3wq8),
[filelock fix](https://github.com/tox-dev/filelock/commit/5e3f2ec0c5fb17cb2635b60b2b68bc63ab81ca2d).

The existing scanner summary now retains embedded Go module names/versions per
binary, even when the current advisory database has no matching finding. This
uses Trivy's existing package inventory and makes no additional network calls.
A source go.mod is kept distinct from an embedded binary inventory; absent or
unrecognized binaries still cannot be claimed covered. This supports checking
new primary-source advisories without guessing from older vulnerability rows.

### Compression inventory follow-through and Zod

The retained Go binary inventory exposed five additional current artifacts with
compress v1.20.1: Gothub, AnonymousOverflow and the embedded Caddy binaries in
Wishlist and the newsletter web/mail/job roles. This was primary-source work:
CVE-2026-116591 was absent from the retained Trivy database. The v1.20.1 native
fixture reproduces the FSE panic; v1.20.2 rejects it, retaining seven normal
codec checks and the already-fixed dictionary checks. No exploitability of a
particular live decoding route is inferred from a linked module.

The existing `go.mjs --codec` recipe now accepts the two exact reader baselines
and checked-in locks. `go-final/check-native.mjs --codec-oct28 gothub
anonymousoverflow` checks local/static routes on an internal network. Upstream
source tests also run offline; no fresh Github or Stack Overflow content fetch
is claimed. `codec.mjs proof`, `scan-brotli.mjs --codec`, whole-image comparison
and the existing transactional release gate complete the sequence.

The existing Caddy build/check/application scripts accept `--codec` against
`codec-caddy-inputs.json`. They retain Caddy 2.11.7, Go 1.26.10, x/net 0.60.0,
JOSE v4 4.1.6 and the exact JOSE v3 RSA-bounds backport. Only compression and its
build notices change. Native proxy, gzip, SSE and HTTP/2 checks pass; disposable
Wishlist account/list/item/privacy and newsletter feed/isolated-SMTP/Atom/delete
checks pass without external browser requests. Use `caddy.mjs --codec`, then
`scan-brotli.mjs --codec-caddy`, `go-final/verify.py --codec-caddy-oct28`, and
separately authorized `release-brotli.mjs --codec-caddy prepare/apply` for the
three declared keys. Rollback restores the exact prior image/configuration;
these changes have no database migration. SMTP fixtures send only to the
isolated synthetic receiver, not the operator or any real mailbox.

Both source offers are additive and include complete application/module code,
licenses, retained fixes and build instructions:

- `security-codec-readers-20261028-source.tar.gz`: 40,987,049 bytes,
  SHA-256 `9e7bf5476a48ef793d13ad97a14e0cd46132c3840343386d417fcf8c99de1268`.
- `security-codec-caddy-20261028-source.tar.gz`: 53,290,388 bytes,
  SHA-256 `a8491bdbc3409fea41c940b3a9581eb182e5ec51a683445b9d8afda7a6659450`.

[Upstream compression advisory](https://github.com/klauspost/compress/security/advisories/GHSA-fpmh-frq8-7rj8)
and [release](https://github.com/klauspost/compress/releases/tag/v1.20.2), checked
28 October 2026. Version-only scanner output is not the evidence for this fix.

RSSHub's Zod patch uses the unmodified MIT 4.6.6 npm package, with no additional
dependencies or install scripts. Exact integrity, predecessor and paths are in
`zod-inputs.json`; use `body.mjs --zod rsshub`, `check-zod.mjs rsshub`,
`closure-review/check-kuma-rsshub.mjs --zod`, `scan-brotli.mjs --zod rsshub`,
`go-final/verify.py --zod-oct28 rsshub`, then the separate `release-brotli.mjs
--zod prepare/apply rsshub`. Fifteen ordinary CJS/ESM parsing cases and six
array/set/map upper-bound checks run on old and fixed versions. Oversized
synthetic inputs invoke twenty element transforms before the old rejection and
zero with the fix. Unbounded containers and overwrite-before-bound semantics
remain supported. Native RSSHub health passes offline; no live feed provider
is claimed tested. The two direct built-app import sites use `zod`, not `zod/v3`.
This does not justify a blanket 3-to-4 upgrade or a clearance for other apps.

[Zod release and provenance note](https://github.com/colinhacks/zod/releases/tag/v4.6.6)
and [bounds change](https://github.com/colinhacks/zod/pull/6652), checked
28 October. The upstream history rewrite is documented; the pinned published
npm provenance revision is `284243fb0d6532665afdc9239188773bb624f73c`.

### Final verification of this follow-through

At 18:55 UTC on 28 October, the retained-database scan completed for all 109
running image identities, all 77 source inputs and 508 host packages. After
revalidating exact-artifact backports and component evidence, the queue has
**0 critical and 140 high records awaiting review**: 74 runtime-image, 35
tracked-build-input, 2 upstream-source-lock and 29 host-package records. These
are package/target occurrences, not distinct exploits. Raw findings remain
available. The additional OAuthlib device-code defect in `primary-findings.json`
is deliberately retained even though scanner version metadata no longer flags
it. This is not a security-clearance claim.

The final 62 focused checks pass. Repeating the completed release paths leaves
all twelve affected/companion roles' container IDs, start times, restart counts
and images unchanged. RSSHub's repository mirror now follows the deployed pin;
`release-brotli.mjs --zod sync-mirrors rsshub` is an exact-predecessor repository
repair, not a service restart, and repeated execution is a no-op. The same
existing transactional release records these declared mirror files for rollback.

The JOSE reviewer requires the compression rebuild's exact source/patch hashes,
compiled artifact, full-image scope, module delta, native/application checks and
successful release chain before accepting its new binary hash. Wrong images,
source changes, failed gates and unrelated file changes fail closed. It does not
copy an exception to arbitrary descendant images.

The three new source archives return HTTP 200 with matching lengths using the
public HTTPS curl check; their local served bytes match the recorded hashes.
Python urllib's HEAD request received 403 from the edge, so universal crawler
access is not claimed. Detailed private evidence is in `final-batch-check.json`,
`idempotent-recheck.json`, `source-route-checks.json` and each profile's receipts
under the existing private maintenance directory. No host reboot, SSH reload,
guest-agent restart, user-data migration or real email delivery occurred in this
follow-through. Existing service access and privacy settings are retained.

### TURN relays: BSON minimum-reservation follow-through

The two existing TURN relay roles now use `released-bson.json`. One native
library changes: upstream stable commit `b7f1f5742351741c068020196fd88f196551aad2`
rejects BSON reservations smaller than the five-byte minimum (CVE-2026-106437).
The prior authenticated Debian source, ten vendor patches and OCSP backport are
retained. `libmongoc` remains byte-identical; the native Coturn binary, package
metadata, TLS, authentication, credentials, quotas and network/privacy settings
remain unchanged. This does not infer exploitability through a live TURN route
from the mere presence of the linked library.

Five boundary inputs reproduce invalid accepted lengths before the repair and
are rejected afterward, without attempting an unsafe append. Ten ordinary
BSON cases, the existing original-header MongoDB client and all 272 exports,
SONAME and dependencies pass. The existing disposable relay fixture passes
UDP/TCP/TLS allocations, anonymous/wrong-password rejection, private/metadata
peer denial, four-slot/fifth-rejected quota and exact-byte bidirectional transfer.
Whole-image comparison finds only the declared `libbson` binary changed.
No external NAT, phone/browser coverage or throughput is inferred.

Replay uses `bson-inputs.json` and `bson.mjs prepare/build/stage`, followed by
`coturn-bson-final/application.mjs --reserve-oct28`,
`scan-brotli.mjs --bson coturn`, and
`go-final/verify.py --bson-oct28 coturn`. The existing Coturn source-offer and
release commands accept `--reserve-oct28`; prepare records exact pins and
configuration hashes, apply waits for two zero-allocation observations for each
relay and changes them serially. Both live STUN postchecks passed. Repeating
apply is a no-op. Rollback uses the exact predecessor recorded in `release.json`
and the same idle checks; there is no data/schema migration.

Compiler acquisition installed CMake 3.31.6 in a disposable existing Trixie
builder. Its complete package inventory and immutable image are recorded;
compilation and tests are disconnected and resource bounded. The complete
source offer `security-coturn-bson-reserve-20261028-source.tar.gz` is 4,085,103
bytes, SHA-256 `76341becd36c03222bab1a1c545a84ac015a8d3c58388c7f10bcf569ead9a427`.
The public HTTPS download returns 200 with that length. No runtime information,
credentials or user content is included. The exact live-byte reviewer covers
only the new reservation fix and retention of the previous OCSP fix, with an
expiring, artifact-specific decision; raw version findings remain retained.

Primary references checked 28 October:
[Debian attribution](https://security-tracker.debian.org/tracker/CVE-2026-106437)
and [upstream stable fix](https://github.com/mongodb/mongo-c-driver/commit/b7f1f5742351741c068020196fd88f196551aad2).

### Zod application follow-through (28 October)

`released-zod-followthrough.json` records the completed Wishlist, Candlr, Projects,
Reactive Resume and private Penpot admin releases. The declared 4.6.5 and Projects' 4.3.5 packages are replaced by the same pinned
MIT-licensed 4.6.6 artifact already verified in RSSHub. The existing pnpm paths
and links are retained. No registration, authentication, database, privacy,
resource or routing settings change. Penpot admin remains private.

All four have 15 normal parser checks and six bounded array/set/map regressions
per old/new state. Old callbacks process all 20 synthetic elements; the fixed
bounded schemas reject before processing elements. Unbounded collections are
unchanged; this does not establish application-wide DoS protection.

Wishlist's Chromium fixture creates an isolated account, list and item, reloads
saved data and verifies anonymous denial, with no external browser origins or
page errors. Candlr's two network-disconnected native states create two accounts,
create/export/delete a fictional private record and reject anonymous/cross-account
access. Penpot admin's two isolated native states migrate empty PostgreSQL and
preserve login routing/schema counts. That admin check does **not** verify a real
operator login or all admin mutations. Real visitor accounts and data are unused.

Projects/Planka additionally moves its installed Zod 4.3.5 to 4.6.6. The existing
native fixture is hash-pinned and reused with only exact image, disposable name
and evidence-path substitutions. Both states pass fresh PostgreSQL migrations,
login, project/board/list/card creation, card editing, anonymous denial and
project deletion. Its Redis-adapter fixes remain present. This verifies local
password login, not the production OIDC provider. The public route remains 200.

Reactive Resume additionally replaces both installed Zod copies, 4.1.11 and
4.6.5. The older copy has no map-bound API: its separate fixture tests the four
actual array/set bounds, rather than calling an absent API and mistaking that
failure for a regression. Both versions pass 15 normal checks; supported old
bounds process 20 elements and 4.6.6 rejects before callbacks. Both exact
application images pass the unchanged synthetic two-account browser fixture:
account ZIP/JSON export, import into another account without migrating sharing,
editing/reload, cross-account denial, deletion and invalidated tokens. No external
browser origins occur. Production OIDC and PDF rendering are not re-tested.
`check-zod-resume.mjs` and `zodResumeNativeProof` bind all copies, fixtures and
application flags to the exact artifacts. Repeated activation preserves the
container ID, start time, restart count and receipt bytes.

The normal package replacement helper now supports explicit Node exec-form
removal for the shell-free admin image. It does not add a shell or package
manager. Whole-image verification records pnpm hardlinks that become independent
files, compares their actual content and rejects link-layout changes outside the
exact Zod package. Symbolic links are never treated as regular files. Missing,
cyclic or non-regular hardlink targets fail closed.

Replay extends the existing commands, without a new scheduler or framework:

```sh
node deployment/maintenance/security-20261028/body.mjs --zod wishlist candlr admin projects
node deployment/maintenance/security-20261028/check-zod.mjs wishlist candlr admin projects
node deployment/maintenance/check-wishlist-esbuild.mjs --zod-oct28
node deployment/maintenance/patch-leaves-final/check-app.mjs candlr --zod-oct28
node deployment/maintenance/patch-leaves-final/check-app.mjs admin --zod-oct28
python3 deployment/maintenance/security-20261028/check-zod-projects.py
node deployment/maintenance/security-20261028/scan-brotli.mjs --zod wishlist candlr admin projects
python3 deployment/maintenance/go-final/verify.py --zod-oct28 wishlist candlr admin projects
node deployment/maintenance/security-20261028/release-brotli.mjs --zod prepare wishlist candlr admin projects
# Only during an authorized release:
node deployment/maintenance/security-20261028/release-brotli.mjs --zod apply wishlist candlr admin projects
```

Preparation refuses changed baselines and preserves completed receipts. Candidate
scans use one unchanged local advisory database and remove the targeted finding
without adding high/critical records. Completed apply is a no-op: all four
container IDs, image IDs, start times, restart counts and the exact release
receipt are unchanged on repetition. Rollback pins the predecessor recorded in
that receipt and uses the existing scoped Compose recreation/health gate; no
schema migration is introduced by this package-only overlay.

Wishlist's prior JOSE proof now accepts this exact Zod descendant only after
whole-image proof confines changes to that package. It still compares the actual
live Caddy hash with the separately validated compression/JOSE build; no
exception is copied to an arbitrary descendant. DHI/native package reviews also
re-read the exact new live image's payload. Raw scanner findings are retained.

### Official QEMU candidate prepared; host activation pending

`qemu-inputs.json` pins Debian backports
`qemu-guest-agent` and `qemu-utils` **1:11.1.2+ds-3~bpo13+4**. The current guest
agent is 11.0.2 and utilities 10.0.13. Native APT simulation changes exactly these
two packages, with no new dependencies/removals. `qemu-native.mjs prepare`
authenticates candidate hashes against the existing APT index, acquires only
those archives, then uses the existing container-only RPC fixture. It has no
host-installation mode. Acquisition can use Debian repositories; subsequent
verification has no Docker network and no host devices or production credentials.

The official candidate passes all 43 existing RPC capability comparisons,
native-default parity, benign time/OS/thawed-state reads, fictional-user key
add/read/remove and credential restoration. Native block checks create a 1 MiB
fictional raw disk, convert it to qcow2, check and compare it, and read zero
sectors through qemu-io. No real VM freeze, Proxmox channel, host disk or real
account is touched. Guest-agent, Docker and SSH PIDs and installed package versions
remain unchanged. Evidence: private `qemu-native/native.json`, `rpc.json`,
`runtime-packages.txt` and `host-simulation.txt`.

**Not deployed.** The native Debian package restarts the agent. Activation still
requires fresh confirmation that VM 144 backup/snapshot/agent operations will
remain paused and the Proxmox console is available, as in the existing
`qga-native-followup/README.md` release policy. The exact installed 11.0.2 guest-agent and 10.0.13 utilities archives are now
retained and verified against every installed payload file, symlink and native
maintainer script. The older locally patched guest-agent archive is not used as
an equivalent rollback. The native compatibility result alone is not complete
current security clearance.

`qemu-rollback.mjs prepare` reproduces archive retention and full installed
payload/control-file comparisons without executing maintainer scripts. The
previously authenticated utilities archive must already be retained. The exact
guest-agent archive can be recovered from Debian HTTPS with its recorded hash;
its complete payload and control scripts are compared with the installed
package. This does not invent a retained historical signed-index verification.
Repeating this check verifies the inputs without rewriting the original receipt.

`qemu-release.mjs prepare` verifies those rollback archives, the tested candidate
archives, an exact two-package APT simulation, unchanged current running agent,
no active block utilities and the recovery-space floor. `apply` additionally
requires a root-only `qemu-native/coordination.json` matching the existing
five-minute `windowGate` policy. No coordination receipt is created without an
actual owner confirmation. Installation uses only the locally pinned packages
with `--no-download`, preserves unrelated package versions, Docker/SSH PIDs and
configuration, and requires a separate Proxmox ping/thawed postcheck. A failed
local gate can restore the exact old packages only while that coordinated window
is still valid and no local freeze marker or block operation is present.

### Current assessment boundary

The 20:30 UTC assessment checked all 109 running images with the same advisory
database. After exact-artifact review it leaves **0 critical / 103 high records
awaiting review**. Raw findings remain available; this is not full security
clearance. `status.json` carries the scope/package breakdown and the independent
OAuthlib behavioral finding remains in `primary-findings.json`.

`review-platform.mjs` records five narrowly scoped current-runtime decisions:

- Vite's [CVE-2026-112942 advisory](https://github.com/vitejs/launch-editor/security/advisories/GHSA-587h-7wmj-h5pm)
  explicitly concerns Windows path/shell behavior. The exact Candlr and private
  Penpot admin images and their actual Node runtimes are Linux. Other Vite
  advisories and tracked build inputs receive no exclusion.
- Black's [CVE-2026-114134 advisory](https://github.com/psf/black/security/advisories/GHSA-cg8m-r9f2-5wm2)
  concerns its GitHub Action with `use_pyproject: true` in 26.9.0/26.10.0.
  All three SimpleLogin roles have the Python 22.1.0 distribution, no bundled
  action files, and native application commands. Offline formatting passes.
  This says nothing about arbitrary external CI workflows.

- KitchenOwl imports LiteLLM's SDK through its unchanged ingredient parser; it
  does not run LiteLLM's proxy server. Two upstream advisories concern that
  proxy's authentication/key handling and `/utils/transform_request` endpoint.
  Current launch commands, image, unshadowed source hashes and all six relevant
  LLM/telemetry flags are checked. A networkless native fixture verifies no proxy
  routes, no loaded proxy server, no provider call during ordinary parsing, and
  normal two-account recipe import/export/isolation. This does not repair the
  installed proxy library or authorize enabling it. Primary references are
  pinned in `platform-policy.mjs`.

These checked conclusions expire after seven days and bind exact image, package,
advisory and role identities. The reviewer retains immutable per-run private role evidence;
apply its individually inspected decisions through the existing `triage.mjs
record /absolute/decision.json` interface, sequentially. It never changes a
running service or scanner rule. Four policy tests reject unsupported platforms,
artifacts, versions, sibling advisories, source scopes and missing evidence.

The remaining ACL records are deliberately open. [Debian's current notes](https://security-tracker.debian.org/tracker/CVE-2026-54369)
require the new `acl_*_at` interface and warn of caller compatibility problems.
The earlier native fixture observed tar/rsync using legacy APIs, so simply
replacing libacl would not establish a repair. Older Zod consumers also need
separate work: the remaining 3.x packages cannot be treated as a compatible
same-major 4.6.6 overlay. No unrelated fixture failure is counted
as a successful vulnerability reproduction.


### Existing native repairs and component evidence retained

Eight kernel-header records now use exact offline CNA snapshot
`d4e64685005cb49f8cf3123b04e49eac6617de00`, record hashes and reviewed upstream
patch hashes. Installed UAPI bytes and private-kernel symbol absence are checked.
These decisions do not waive running-kernel findings. Three additional CNA path
exceptions are finite hash-bound records; they do not broaden the general path
allowlist. Four new overlapping upstream patches are matched in full. Eight
policy tests include rejection of altered primary records and private fields.

The generic header applier correctly rejects Ubuntu targets under its Debian-only
rule. Its rule was left intact; the individually reviewed Ubuntu decisions used
the existing `triage.mjs record` interface, sequentially. No scanner rule changed.
Four Xvfb records revalidate the existing cleanup-order repair using both native
cleanup fixtures and exact completed release ancestry, including the current
Penpot exporter. This is not a full wire-protocol exploit test. Two DHI Perl-core
records match the current signed vendor payload and contain no Archive::Tar
module; that module has a separate existing repair. Six DHI and three passive
Xvfb policy tests pass. Reviews expire after seven days and apply only to their
exact artifact/package/advisory/role identities.

### RSS-Bridge NGINX 1.30.6 release

`released-nginx-rssbridge.json` records the running replacement. The signed
[upstream Debian package](https://nginx.org/en/linux_packages.html) is pinned in
`nginx-debian-inputs.json`, including its archived signed index, signing-key
identity, package and executable hashes. The [upstream advisory list](https://nginx.org/en/security_advisories.html)
identifies 1.30.6 as fixed for the three reviewed records. This is a vendor binary
update, not a new source patch or an exploit reproduction.

Only `/usr/sbin/nginx` and the vendor license are changed. The complete exported
image comparison preserves the existing PHP/application/configuration and prior
curl, Brotli, SQLite, XML, OpenSSL, LDAP and mount fixes. Debian package labels
remain unchanged; raw findings therefore remain visible and need exact live-byte
review. `nginx-debian-policy.mjs` rejects unrelated advisories, package versions,
roles, modified output scope and incomplete native evidence.

Both images pass 14 native NGINX-to-PHP-FPM checks using the existing mounted
configuration: normal page/HEAD, privacy headers, rejected methods, private paths,
traversal rejection, security-contact redirect and rate limiting. The unchanged
PHP consumer fixtures additionally pass HTTP/2, the Chrome impersonation profile,
TLS/protocol rejection and a fictional GitHub-to-Atom feed. Test containers have
no external network and no production content/credentials. The first fixture
incorrectly expected 404 instead of the baseline's 400 for malformed traversal;
that assertion was corrected, not counted as a repaired application defect.

Replay `nginx-debian.mjs`, `check-nginx-rssbridge.mjs`,
`scan-brotli.mjs --nginx-debian rssbridge`, and
`go-final/verify.py --nginx-debian-oct28 rssbridge`. Acquisition is separate:
retain the exact archived files under the private `nginx-debian/acquisition/`
directory; do not replace them with moving repository metadata. Builds use the
local immutable base and the existing legacy Docker builder with networking
disabled. A first BuildKit attempt tried to resolve the bare image ID at Docker
Hub; it failed before producing an image. The recipe now explicitly selects the
local builder. Both failed precondition attempts and diagnostics are retained.

`release-brotli.mjs prepare/apply --nginx-debian rssbridge` reuses the existing
single-service transactional release. Only the RSS-Bridge image scalar changes.
The native/public route gates passed after activation; repeated apply leaves the
same running container and receipt unchanged. Rollback uses the old image in
`released-nginx-rssbridge.json`, restores the recorded image scalar, and recreates
only `rssbridge` through the existing Compose project. No database migration,
user-data change, cache purge, notification, host restart or new route is involved.
After a fresh fleet scan, `review-nginx-debian.mjs` prepares six expiring exact-byte
decisions for individual review and sequential application through `triage.mjs`.

### Wishlist platform attribution

The remaining Wishlist Go trust-store record targets its bundled **macOS ARM64**
esbuild executable. The pinned Go build-info reader and Mach-O header identify
that exact file; its SHA-256 is
`d09bfc7dfbbc8817a9bda524d9612e154a355725435f105c1b8cdc9b0b3a6fc3`.
The running container and Node process are Linux x64. The separate ELF x86-64
executable passes the native TypeScript transform offline, and the retained
exact-image application test covers account/list creation, reload and anonymous
denial. No runtime file changed.

`review-platform.mjs esbuild-darwin-wishlist` prepares this exact-image/target
review; five policy tests include rejection of a different executable target,
platform, bytes or missing native/application checks. The seven-day decision is
runtime-platform attribution only. The bundled Mac executable is **not upgraded**
and must be reviewed before Mac execution or redistribution. Raw scan records,
other Go targets and future image identities remain separate.

### Uptime Kuma MSAL origin validation

`released-msal.json` records the deployed five-file backport for
[CVE-2026-109461](https://github.com/AzureAD/microsoft-authentication-library-for-js/security/advisories/GHSA-xcx6-jx8p-x3h5).
The fixed upstream 7.x major is outside the installed Azure Identity 4.13.1
dependency range. `msal-inputs.json` therefore pins the exact MIT 5.6.0 source
archive, upstream commit, patch and before/after hashes. Both installed CJS and
ESM outputs carry the upstream TypeScript correction. Only their obsolete
source-map references are removed; the old map files remain unreferenced.
Dependency versions, runtime configuration and all 43,495 other files are
unchanged. The raw version-based advisory remains visible.
The pinned patch retains the vendor runtime's CRLF bytes and unified-diff blank
context lines; whitespace-only patch warnings are intentional, not edits to
normalize during replay. Its SHA-256 and all five output hashes are checked.

Both formats reproduce the missing validation before the patch and reject the
five tested payload/configuration cases afterward. Seven legitimate token,
state and cache checks per format pass before/after. The real installed Azure
SDK passes credential acquisition and cache reuse with a synthetic transport;
the native Kuma MSSQL monitor passes four query/error/cleanup cases with a
synthetic database. An isolated Kuma instance also passes setup/login without
notifications. These tests do not establish behavior of a live Microsoft tenant
or a production SQL server. No real credentials, user data or outside requests
are used by the fixtures.

The existing adapters now accept a finite MSAL profile:

```sh
node deployment/maintenance/security-20261028/symfony.mjs --msal kuma
node deployment/maintenance/security-20261028/check-blkid-apps.mjs --msal kuma
node deployment/maintenance/security-20261028/scan-brotli.mjs --msal kuma
python3 deployment/maintenance/go-final/verify.py --msal-oct28 kuma
node deployment/maintenance/security-20261028/release-brotli.mjs prepare --msal kuma
node deployment/maintenance/security-20261028/release-brotli.mjs apply --msal kuma
```

Preparation requires the exact declared baseline and preserves existing evidence
instead of overwriting it. It does not resolve dependencies or access the network.
Prepare/apply retain their separate deployment gates. Repeated completed apply
preserves the same container, start time, restart count and receipt. The 28
targeted policy/release tests include wrong-revision, file-scope, incomplete
regression, consumer, notification and rollback failures.

The complete library source, license and patch are available at
<https://tools.utilibre.org/utilibre-source/security-msal-20261028-source.tar.gz>.
The standalone patch instructions in that offer do not require running production.
After a fresh scan, `review-source.mjs msal` prepares a seven-day exact-image
decision, requiring all five current file hashes and the completed release.
Use the existing sequential `closure-review/apply-reviewed.mjs` interface.
No scanner rule, severity threshold or unrelated package decision changes.

Rollback restores the previous image scalar from `released-msal.json` in
`deployment/community/compose.yaml` and recreates only `uptime-kuma` with the
existing Compose project. There is no database migration in this dependency
repair; keep the persistent data volume unchanged. No host reboot, SSH reload or
guest-agent restart is involved.
