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
