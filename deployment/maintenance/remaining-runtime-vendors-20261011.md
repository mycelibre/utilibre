# Remaining vendor-layer security repairs — 11 October 2026

## Coordinated release status (after the candidate work below)

Opengist, LiberaForms CairoSVG plus PCRE2, Authentik PCRE2/urllib3, Addy's MariaDB
OpenSSL and both PostgreSQL vendor images have been deployed by the release
owner. [Final MariaDB/Forms evidence](vendor-final-20261011.md). Exact final IDs
below match running containers; native health and entry checks passed. The
candidate-only statements below describe the separate staging workstream, not
the final deployment state. No OpenSSL replacement was made in Authentik.

Private live receipts: `/var/lib/utilibre-maintenance/vendor-stage-20261011/`
(`live.json`, `authentik-live.json`) and `postgres-vendor-20261011/release.json`.
Production backup/restore boundaries and rollback are in
[the release record](../../docs/updates.md#parallel-security-release--11-october-2026)
and [PostgreSQL record](postgres-vendor-20261011.md). Candidate package scans
are scoped measurements, not a cleared fleet-wide vulnerability queue.

## Initial read-only inventory

Baseline: the completed 20:44 UTC image scan and read-only running-image/package
inspection. This is a bounded follow-up, excluding the already-reviewed eight
applications, Grist, shared nginx gateways/static wrappers and SimpleLogin. Raw
finding counts are package occurrences, not demonstrated exploitable services.
No deployment or vulnerability exception is authorized by this inventory.

## Five small repair candidates

| Priority / running image | Verified installed → vendor repair | Scope and required release gate |
| --- | --- | --- |
| 1. PostgreSQL `17.11-alpine`, digest `18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73` | Alpine 3.24 `libssl3`, `libcrypto3` 3.5.7-r0 → 3.5.9-r0; `libuuid` 2.42.1-r0 → 2.42.3-r1 | Eight running databases use this digest. Keep PostgreSQL **17.11**, its entrypoint and existing data. Stage native DB/app writes and a synthetic restore before replacing production. These library updates do not fix the image's embedded gosu/Go findings. |
| 2. MariaDB `12.2`, digest `6a4c4bbf0447c2247801309513fcc0dd17c3f35390368139ce419387fdd1144d` | Ubuntu 24.04 `libssl3t64`, `openssl` 3.0.13-0ubuntu3.9 → 3.0.13-0ubuntu3.16 | Actual database is **12.2.2-MariaDB-ubu2404**, used by Addy. Keep that engine and data; stage authenticated native operations and synthetic restore. gosu/Go remains a separate binary review. |
| 3. Opengist `1.15.2`, digest `7edc91273ee7d10a17406da8a08c803158baaff984c39b789c1313473d068f21` | Alpine 3.24 `libssl3`, `libcrypto3` 3.5.7-r0 → 3.5.9-r0; `libexpat` 2.8.3-r0 → 2.8.5-r0; `pcre2` 10.47-r1 → 10.49-r0 | Preserve the application binary, native auth and Git. Check private gist creation/editing/history/export and anonymous denial on a blank isolated instance. Eleven OS high occurrences are in scope; thirteen embedded Go high occurrences require a later native rebuild, not apk. |
| 4. Authentik `2026.8.3-python-security-20261011`, image ID `fa48909ceaeaaa4dd5f3852e7b78208de3149962a88c80ef349b79c30b067d59` | Debian 13 `libpcre2-8-0` 10.46-1~deb13u2 → u3; actual app urllib3 2.7.0 → 2.8.0 | **The OpenSSL proposal is withdrawn after native inspection:** this image has upstream's deliberately apt-held `3.5.7+ak-fips`, not ordinary Debian OpenSSL. Preserve it; do not override its holds. PCRE2 and urllib3 are separable candidates. Actual msgpack is already 1.2.1 and setuptools 83.0.0. Scanner older copies must be located before calling them runtime defects. |
| 5. LiberaForms `4.11.1-p6`, image ID `8520d9d75afad346c1bfd8e228c0f5562fecf5c2c4196e8e9ae89dd87b60eef5` | Actual app CairoSVG 2.9.0 → **2.9.1**; Debian `libpcre2-8-0` 10.46-1~deb13u2 → u3 | CairoSVG's upstream patch addresses malicious long SVG path rendering. Check SVG/PNG/PDF rendering and native form/auth/export flows without changing upload policy. Actual urllib3 is already 2.8.0 and setuptools 84.0.0; do not downgrade/repatch from stale embedded requirements metadata. |

The Alpine updates cover OpenSSL CVE-2026-14456 (minimum 3.5.8-r0),
util-linux CVE-2026-53612/53613/53614/76642/78409/78410 (2.42.3-r0) and
CVE-2026-78408 (2.42.3-r1); Expat CVE-2026-66046/76641/76956/76957
(2.8.4) and CVE-2026-93990 (2.8.5); PCRE2
CVE-2026-86145/89157/89161 (10.48) and CVE-2026-103111 (10.49).
Debian PCRE2's backport fixes CVE-2026-103111. Debian/Ubuntu OpenSSL backports
fix CVE-2026-84782; Ubuntu .16 also includes .11's CVE-2026-45447 fix.
Those plain Debian OpenSSL packages are **not selected for Authentik's modified
FIPS build**; its first attempted layer stopped safely at the package hold.
CairoSVG 2.9.1 fixes CVE-2026-107378. Actual Authentik urllib3 2.7.0 is also
subject to CVE-2026-97687/97689, fixed by 2.8.0; dependency compatibility and
application tests are required before selecting that follow-on.

## Not resolved by these package layers

- Coturn 4.18's queue contains LMDB 0.9.31-1+b2 (CVE-2019-16224/16225/16227),
  MariaDB client 11.8.6-0+deb13u1 (CVE-2026-44172/49261), and libxml2
  2.9.14-backport packages (CVE-2026-6653) with **no fixed vendor version in
  this baseline**. This is not proof the TURN request path reaches each bug;
  it needs separate component/reachability review, not a blanket waiver.
- RSS-Bridge's Debian 12 SQLite 3.40.1-2+deb12u2 (CVE-2025-7458), libxml2
  (CVE-2026-6653), and zlib (CVE-2023-45853) similarly have no scanned vendor
  fix. zlib/minizip scope must follow the separate exact-component review.
- FreshRSS and KitchenOwl also retain libxml2 CVE-2026-6653. Container
  `linux-libc-dev` findings do not establish the host kernel is vulnerable.
- PostgreSQL, MariaDB and Addy gosu findings refer to embedded Go binaries.
  Galene and Anubis also need Go/module rebuilds for their remaining Go
  findings. An OS-library refresh cannot repair statically linked code.
- Installed npm/Python metadata and compiled browser bundles must be
  distinguished. An override of a build dependency does not rewrite an
  existing bundled application.

## Sources and reproducibility

Read on 11 October 2026; fixed versions below are vendor statements, not an
inference from an unrelated distribution or the presence of a newer app tag.

- [Alpine 3.24 official x86_64 package index](https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/APKINDEX.tar.gz): current library versions above, streamed read-only.
- [Debian PCRE2 CVE-2026-103111](https://security-tracker.debian.org/tracker/CVE-2026-103111): trixie 10.46-1~deb13u3 backport.
- [Debian OpenSSL CVE-2026-84782](https://security-tracker.debian.org/tracker/CVE-2026-84782): trixie 3.5.7-1~deb13u3 backport.
- [Ubuntu CVE-2026-84782](https://ubuntu.com/security/CVE-2026-84782): noble 3.0.13-0ubuntu3.16. Its DTLS condition is not a general proof of ordinary application TLS exposure.
- [CairoSVG 2.9.1](https://github.com/Kozea/CairoSVG/releases/tag/2.9.1): upstream security release, bounded patch-version change.
- [urllib3 2.8.0](https://github.com/urllib3/urllib3/releases/tag/2.8.0): separate Python dependency update candidate.
- [Authentik 2026.8.3 container source](https://github.com/goauthentik/authentik/blob/version/2026.8.3/lifecycle/container/Dockerfile): selects `goauthentik/fips-python` and `fips-debian` images. Native inspection confirms `OpenSSL 3.5.7+ak-fips`, with `libssl-dev`, `libssl3t64` and `openssl` held.

Inspection did not read account records, copy production databases, modify
runtime configuration, or publish secrets. Candidate staging results, if any,
are recorded below separately from this inventory and from deployment.

## Completed isolated staging

- **Opengist:** `utilibre-opengist:1.15.2-vendor-security-20261011`, image ID
  `abd991c0904ccf14825d48ece22a203a9df41fbbc8b58236831a287d3f1ad448`.
  The native application SHA-256 remains
  `84acde5cde45b0cd66377f103a1c9c6dd0d4f6a5b6c618406bff2af1dd215fba`.
  `check-opengist-vendor.py` passed a fresh tmpfs database, native registration,
  logout/login, public/private gist creation and editing, two Git revisions,
  verified ZIP contents, native smart-HTTP Git discovery, and anonymous denial
  of a private gist. This is loopback HTTP/API coverage, not a replay of
  production OIDC. Its configuration fixture is explicitly test-only.
  Candidate rescan: **0 critical / 13 high**, down from 0 / 24; none of the
  four upgraded OS libraries has a remaining reported vulnerability. The
  thirteen embedded Go findings remain open.
- **LiberaForms:** `utilibre-liberaforms:4.11.1-cairosvg-security-20261011`,
  image ID `394ce6c0e08ded4f72d577c0a9313b4fb2ff17aa9894504cd400e4928c7147e1`.
  This candidate changes **CairoSVG only**, not the proposed PCRE library.
  The wheel is pinned to SHA-256
  `f91c5628e834be024a0ed4544d76261cd84016a4c73bcdf26c386495825c05a1`;
  all dependencies remain unchanged and `pip check` passes.
  `check-liberaforms-cairosvg.mjs` and its Python fixture passed actual native
  avatar generation, SVG→PNG dimensions/pixel checks, SVG→PDF output, two
  account logins, native required-encryption form creation, owner answer-page
  access, and denial for a second account/anonymous session. The database was
  empty and temporary, its network namespace had no outside interface, and no
  production configuration/data was mounted. Browser encryption, key backup,
  SMTP and full recipient-answer/export workflows were **not** re-tested.
  Candidate rescan: **0 critical / 57 high**, down from 0 / 58; CairoSVG's
  finding is absent. Other findings remain open.

Both builds were limited to one CPU/1 GiB. Test application containers used at
most 512 MiB and one CPU each. Temporary containers/databases were removed.
Root disk retained approximately 11 GiB free. No production restart or compose
edit was made by this workstream. Rebuild from the two new `Dockerfile.*`
recipes in this directory; use the named tests above before a coordinated
release. Rollback is the previous application image with the same configuration
and data; these candidates introduce no database schema migration. If releasing
LiberaForms, also update its canonical future-build CairoSVG pin to 2.9.1 so
the next full build cannot reintroduce the older dependency.

## Authentik candidate follow-up

The safely narrowed `Dockerfile.auth-vendor-security` keeps the exact 2026.8.3
application and prior PyJWT/anyio repairs. Its `os-only` target updates PCRE2
to 10.46-1~deb13u3. The final target also updates **only the actual app venv**
urllib3 to 2.8.0 with wheel SHA-256
`0cf3cae568d36aa9576b28dfb35f11328f1cb974ca7647d9475ebb86c75ac6e3`.
Installed botocore, requests, Docker, Kubernetes and Sentry SDK distribution
constraints permit this version, and `pip check` passes before and after.
No Sentry behavior or production configuration is enabled by this change.

`/usr/local/lib/python3.14/site-packages/pip/_vendor/vendor.txt` and direct
imports locate the additional old msgpack 1.1.2, urllib3 2.7.0 and setuptools
70.3.0 occurrences in **pip 26.2.1's vendored installer dependencies**. They
are not the app's normal msgpack/setuptools/urllib3 imports. They remain in
the scan and are not suppressed, deleted or described as fixed.

The image is `utilibre-authentik:2026.8.3-vendor-security-20261011`, image ID
`9fa746d0be08f6dd6c27e4622554ba50d115fbbf714d3ef6c8f0c02984519b4e`.
Preliminary rescan: **1 critical / 61 high**, versus 1 / 64; the actual app's
two urllib3 high occurrences and the PCRE2 high occurrence are removed.
The FIPS/OpenSSL findings and other remaining findings are not waived.
Local HTTP/JSON through native urllib3 and requests passed with a synthetic
loopback HTTP server inside a `--network none` container.

`check-auth-vendor.mjs` reuses the existing password/TOTP/OAuth test in
`check-auth-python.py` but initializes a **fresh disposable** database with
upstream `python -m lifecycle.migrate`. It does not copy production data or
configuration. The ordinary Django `ak migrate` command alone does not run
this release's required system bootstrap; the first rehearsal exposed that
harness issue and was discarded. The corrected native gate **passed at
21:07 UTC**: fresh system/schema migrations, synthetic password checks, TOTP
replay rejection, RSA and ECDSA authorization-code exchange, JWKS, and rejection
of incorrect audiences, tampered signatures and reused authorization codes.
The test also asserts Python still uses `OpenSSL +ak-fips`. Temporary app and
database containers were removed. Browser MFA, third-party identity providers
and a full external relying-party journey were not replayed. This workstream
prepared/tested the candidate only; coordinated production rollout remains
with the release owner.
