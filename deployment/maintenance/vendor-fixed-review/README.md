# Exact fixed-package review — 11 October 2026

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
`node deployment/maintenance/vendor-fixed-review/check.mjs`. Inspect every
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
