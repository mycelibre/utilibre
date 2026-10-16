# Exact fixed-package review — 11 October 2026

## Current follow-up: PyJWT PEM guard, 16 October 2026

**Activated with owner approval on 16 October 2026 at 06:06 UTC.** The two
previously pending critical records are both
CVE-2026-102268: `python3-jwt 2.15.1-1` on the host and the exact Uptime Kuma
image `sha256:38451727e85fa87336c13298a9dfab813ac02a1a009888102533e4cd79ee12f4`.
The upstream [PEM guard advisory](https://github.com/jpadilla/pyjwt/security/advisories/GHSA-ffc3-869f-jxw9)
fixes this in 2.14.0; [Debian explicitly marks 2.15.1-1 fixed](https://security-tracker.debian.org/tracker/CVE-2026-102268).
Both primary sources were rechecked on 16 October. This is an exact fixed-package
assessment of a base-distribution scanner match, not acceptance of an unpatched
critical defect or a whole-fleet clearance.

- All 12 installed PyJWT Python sources in each target match the retained
  authenticated `python3-jwt_2.15.1-1_all.deb` (SHA-256
  `e2bdfe81e1c0c45866e37e1a2f2fd190fcec24f8c5fc083e994733b0f915b1af`).
- The existing native fixture now checks canonical, tab-indented, CR-only and
  single-line RSA/EC public keys: eight HMAC-key rejections per target. The
  cryptography loader first proves each variant is a valid public key.
  Legitimate HS256, RS256 and ES256 round trips pass; empty-JWK and local JWKS
  redirect-denial checks still pass. There are no external fixture requests.
- A separate network-disabled baseline used the retained Debian 2.10.1 package
  (SHA-256 `d6971f1c7b688e7edeff93483ccbab11083bdc19a754a7f5f37d2f7b4a97afe5`)
  and the same `pem_hmac_checks` function. It fails with
  `PEM variant escaped recognition`, not an unrelated build/version error.
  No old package was installed on the host or in a running service.
- Host tests now require the already-reviewed bubblewrap **0.12.0-1~deb13u1**
  binary, SHA-256 `573236e5328ac2ebb08f59ae3a9805b4f8d12bdef14be8af4450d5463294985f`.
  Its isolated namespace exposes only read-only runtime libraries, temporary
  storage and synthetic loopback endpoints; CPU/address-space limits apply.
  Image tests use the exact local image, no network, no production mounts,
  a read-only filesystem, an unprivileged user, 128 MiB, 0.5 CPU and 32 PIDs.
  Both have time/output limits. A failed or absent sandbox does not fall back
  to execution on the host. Disposable containers are removed on failure too.

Reproduce preparation (substitute an existing verified sandbox path and an
absolute private output path; this does not download or install the sandbox):

```sh
node --test deployment/maintenance/vendor-fixed-review/check.test.mjs
node deployment/maintenance/vendor-fixed-review/check.mjs \
  --only-cve=CVE-2026-102268 \
  --host-sandbox=/absolute/path/to/verified/bwrap \
  --output=/absolute/private/output/pyjwt.json
```

The normal completed-scan freshness gate remains **24 hours**. The targeted
option cannot select an unreviewed CVE. Reports include input/fixture hashes,
package payloads, native runtime versions and seven-day **exact-key** candidate
decisions. Missing prerequisites produce `skipped` entries and a nonzero CLI
exit; they never produce a decision. Other findings, scanner severities and
raw evidence remain unchanged. No scheduled application of these decisions
was added. The existing operator-only `triage.mjs record` accepts one reviewed
decision at a time; future activations require separate approval and a fresh recheck.

Private evidence is in `/opt/utilibre/reports/advisory-review-20261016.yy51kc/`.
The original `pyjwt-final.json`/`app-advisories.json` preparation was followed by
fresh `activation-pyjwt-check.json`/`activation-app-check.json` proofs before
activation. `activation.json` records the result; `monitor-after.txt` records
the real monitor's no-mail check. Code commit: `0c74591`.

The combined reviewer suites pass **43/43**, including malformed native output,
timeout/nonzero exits and disposable-container cleanup. Another **30/30**
existing maintenance/triage tests pass. The operator-only triage CLI applied
exactly two seven-day decisions; all other decisions, raw scan bytes, original
observation dates and review deadlines are unchanged. The live queue now has
**0 critical / 56 high awaiting review**, not zero scanner findings. The
42 raw critical matches remain available. No package upgrades, application
restarts, direct email notifications or changes to scanning policy occurred.
The monitor still reports the separate high-review backlog, low disk space
and stale external-monitoring completions; these were not suppressed.

The private directory contains pre-activation ledger/queue snapshots and the
two exact decision files. For rollback, remove only those two decision keys
from the **current** ledger after reviewing a fresh backup, then use the existing
queue builder. Do not overwrite newer unrelated reviews with the whole old
ledger. Raw scan inputs and services require no rollback. Application-alert
rollback is covered by [the runtime review](../runtime-gnutls-minimization/README.md).

## Earlier checkpoints

12 October follow-up: the same signed AOM 3.14.1-1 payload also resolves
[CVE-2023-39616](https://security-tracker.debian.org/tracker/CVE-2023-39616),
whose upstream frame-buffer fixes shipped in 3.7.0. The reviewer now checks
that exact advisory through the completed native-overlay ancestry and rehashes
the live codec; no package was replaced just to change the scanner count. The
native HEIF/AVIF/GDAL checks remain compatibility evidence, not an independent
exploit reproduction for this additional advisory. The counts below describe
the original checkpoint.

This is a review of eight remaining scanner matches, not another deployment or
a blanket exemption. The scanner uses each base distribution's advisory status;
the selected packages were instead downloaded through isolated, authenticated
Debian indexes and deployed after native compatibility gates. Their actual
fixed versions must be evaluated against the corresponding source package.

`check.mjs` prepares seven-day, exact-finding `not-affected` decisions in the
private `/var/lib/utilibre-maintenance/vendor-fixed-review.json`. It never edits
the queue/ledger. The operator must review and apply them separately; raw
findings remain available. A changed image, package version, binary/source hash,
scope, container set or CVE does not inherit a decision.

## Evidence and boundaries

| Installed package / scope | Exact findings | Upstream evidence |
| --- | --- | --- |
| AOM `3.14.1-1`, Gathio's final XML image | CVE-2023-6879 | [Debian explicitly marks this version fixed](https://security-tracker.debian.org/tracker/CVE-2023-6879); upstream fixed the multithreaded encoder resolution-change overflow in 3.7.1, commit [7ae7bef](https://aomedia.googlesource.com/aom/+/7ae7bef246e85c8f349513d668b4571c79a43c5c) and its documented follow-up. |
| PyJWT `2.15.1-1`, host and Kuma | Host: CVE-2026-102266/102267; Kuma: 102267 | Upstream [empty symmetric JWK validation](https://github.com/jpadilla/pyjwt/security/advisories/GHSA-9j54-fg26-wv3r) and [JWKS redirect handling](https://github.com/jpadilla/pyjwt/security/advisories/GHSA-9v7f-9g4p-ffgj) were fixed in 2.14.0. [Debian's 102266](https://security-tracker.debian.org/tracker/CVE-2026-102266) and [102267](https://security-tracker.debian.org/tracker/CVE-2026-102267) records mark the installed source version fixed. |
| `libmariadb3` and `mariadb-common` `1:11.8.9+ds-4`, both Coturn relays | Each package: CVE-2026-44172/49261 | [Connector/C advisory](https://github.com/MariaDB/server/security/advisories/GHSA-pv9p-5w55-55jm): Big5 escaping fixed in 3.3.19/3.4.9. [Debian's exact source record](https://security-tracker.debian.org/tracker/CVE-2026-44172) marks 11.8.9 fixed. [49261](https://github.com/MariaDB/server/security/advisories/GHSA-3p3m-4x7c-p4pw) instead affects server Galera notification commands, fixed in 11.8.8; these relays contain no MariaDB server/Galera package or daemon. [Debian also marks 11.8.9 fixed](https://security-tracker.debian.org/tracker/CVE-2026-49261). |

Sources inspected 11 October 2026. Upstream's current patched-version fields
take precedence over an older unreleased-fix paragraph preserved in an advisory.

## Verification

The checker requires the latest completed scan/queue pair and a checked artifact,
validates exact final image IDs and completed native/release receipts, verifies
the retained `.deb` SHA-256 pins, and compares installed runtime payloads against
those packages byte-for-byte. PyJWT includes **all installed package `.py`
sources**, not merely metadata or a top-level import. MariaDB includes the
client library and authentication plugins; its configuration-only package is
matched by exact package, the default configuration checksum and copyright
checksum, without printing configuration or changing it. The slim runtime
intentionally omits packaged changelogs, so they are not a runtime proof.
AOM checks the actual codec library. The native client version reports
**Connector/C 3.4.10**; upstream [release notes](https://mariadb.com/docs/release-notes/connectors/c/3.4/3.4.10)
confirm that this revision is bundled with MariaDB 11.8.9 (the Big5 fix was
already present in 3.4.9).

Additional PyJWT regression checks reject an empty symmetric JWK and reject a
redirect from a synthetic trusted JWKS endpoint. A second loopback endpoint must
receive zero requests. The host uses its real `/usr/bin/python3` installed path;
Kuma uses its exact image in a read-only, network-disabled disposable container.
No real token, account, notification, document or external endpoint is used.
These checks complement the previously passed native OAuthlib/cloud-init and
Kuma Apprise compatibility checks; they do not assert that every application
authentication path has been exhaustively tested.

Native compatibility and rollout receipts remain under `aom-final-20261011`,
`sqlite-final-20261011`, `mariadb-client-final-20261011`, `host-final-20261011`
and `xml-final-20261011` in the private maintenance directory. The AOM review
does not assert compatibility with removed diagnostic helper exports: only the
actual installed HEIF/AVIF consumers were gated, as documented in
[the AOM release](../aom-final/README.md). Coturn's UDP/TCP/TLS protocol, denial,
quota and exact-byte transfer gates are in [its release](../mariadb-client-final/README.md).

Run `node --test deployment/maintenance/vendor-fixed-review/check.test.mjs`, then
`node deployment/maintenance/vendor-fixed-review/check.mjs` with the verified
`--host-sandbox` path above for host checks. Inspect every
`skipped` item; never turn a failed proof into a review. This tooling neither
installs packages nor changes service configuration.

Observed result: **8 exact reviews prepared, 0 skipped; 18/18 reviewer tests
passed**. Nothing was applied by this checker. Actual library/source hashes and
both local PyJWT regression receipts are embedded in its private report.

## Existing header/MiniZip component reviews

`components.mjs` reuses the existing bounded `review-specific-findings.mjs`
checks, restricts its output to pending **runtime** `linux-libc-dev`/`zlib1g`
findings, and rechecks the current image/version/file list of every named
container. It writes a separate private `component-review.json` for approval.
The [Debian MiniZip record](https://security-tracker.debian.org/tracker/CVE-2023-45853)
explicitly says that the vulnerable contribution was not built in Bookworm's
`zlib1g` version; this does not cover a separately installed MiniZip package.
The kernel [ksmbd](https://security-tracker.debian.org/tracker/CVE-2026-43185)
and [KVM](https://security-tracker.debian.org/tracker/CVE-2026-63940) defects concern
executable kernel code, not container UAPI header files. The host's running
kernel and its packages remain outside this component review. No old Go review
is copied. Sources were rechecked on 11 October 2026.
