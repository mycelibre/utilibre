# 28 October shared-library and runtime maintenance

This batch extends the existing native-package, exact-JavaScript-package and
transactional release scripts. It does not replace the maintenance system.
No LLM is part of replay, tests or release checks.

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

## Evidence durability and remaining assessment

`restore-review-sources.py` reconstructs older mount, HEIF, TIFF and X-library reviewer source trees from
checksum-pinned retained source offers with networking disabled. It does not
rebuild or deploy applications. The existing native-library reviewers still
check exact source/patch and running-library bytes. The October curl profile in
`closure-followup/review-curl.mjs` verifies complete native tests, completed
release chains and actual library/package hashes before proposing individual
expiring decisions. Raw scanner findings remain intact.

The 28 October 11:53 UTC fleet scan completed all 109 running image assessments
plus host and tracked-source coverage. After the explicit reviews, no critical
records await review; high-severity work remains. This is not an all-clear:
raw scanner counts include previously repaired packages and component
misattribution, while unresolved Go JOSE, Zod, Django REST Framework and host
findings require separate work. The private `security-queue.json` is the current
source of counts, including replacement-image revalidation. No blanket exception
is granted to descendants of repaired images or to all packages in a container.

Only completed compiler/module caches were compressed, archive-compared and
removed in expanded form to preserve the 8 GiB free-space floor. Their archives,
checksums and restore paths remain under the private batch directory. No runtime
content, saved account work, backup or rollback image was removed. More disk
capacity must be assigned in Proxmox before another guest filesystem expansion;
the current 220 GiB device has no unallocated space.

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

Validation: 43 existing release, rollback, curl-policy and backport-scope tests
pass. The recorded scanner is Trivy 0.75.0; the DNS/Authlib comparisons use
advisory data updated 28 October 2026 at 07:10:42 UTC, SHA-256
`2c8f4b04f224aded9ecd149b9b5304146736668220dfa403403358fb423a52fd`.
Each before/after pair checks that its database remains unchanged. Older batch
comparisons retain their own database identity; they are not relabelled with the
newer snapshot. Current versus archived assessments remain separate.

The final checkpoint is recorded in `status.json`: all 109 running image scans
completed, with zero critical and 375 high records awaiting review. Raw results
retain 66 critical and 3,206 high records, including exact repaired package and
component-attribution decisions. These numbers are package/artifact occurrences,
not a vulnerability count or a full security clearance. The running guest kernel
is 6.12.113+deb13-cloud-amd64; its build configuration disables GCOV. The separate
GCOV header-package review does not assess the Proxmox host.

The exact core Trivy advisory database and metadata are retained in the private
`utilibre-advisory-db-20261028.tar.gz`, with checksums in `advisory-snapshot.json`.
Java's extraction database was not archived because the combined archive would
cross the disk floor; raw Java results remain retained, but complete archived
Java replay is not claimed. No database refresh is part of these replay checks.
