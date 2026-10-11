# Penpot 2.18.3 runtime maintenance — 11 October 2026

This is a staged runtime packaging repair, not a new Penpot application fork.
Production release remains the main maintainer's responsibility. The earlier
2.18.3 backend had no OS package database; zero detected OS packages was a
coverage failure, not a clean security result.

## Reproducible backend inventory

`Dockerfile.runtime` uses official public
`debian:13.7-slim@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f`
(amd64 manifest `sha256:918311b7b6c4c6f68b232ba516584925f6c78ad82b6fd534b98979df6438e483`).
It installs the upstream native runtime package set plus `util-linux` for the
existing `prlimit` safeguards. All 228 resolved Debian package versions are
pinned in `runtime-packages.lock`, installed through signed Debian repositories,
and checked against the genuine resulting dpkg database. The lock intentionally
fails rather than silently taking another version when a pinned package is no
longer available. Debian's woff-tools repository version includes a zero epoch
which dpkg omits when displaying it; only that equivalent `0:` is normalized for
the comparison. No installed-package records are fabricated.

The exact upstream 2.18.3 JRE, ImageMagick and backend files are copied from the
official digest in the Dockerfile, then the existing reviewed dependency-repaired
JAR is used without recompilation. Their combined file-content SHA-256 matches
the earlier deployed backend:
`e5b27569f97b23fec69d435f630080ef3c7a93260aea67cbc1587589e3dc0700`.
User/group 1001, command, environment, working directory and launcher are
unchanged. There is no DHI/CIS compliance claim for this public Debian runtime.
The official DHI base still requires unavailable registry authentication; this
recipe does not pretend to reproduce that base or copy its package metadata.

Build with the existing tested JAR directory as context after copying the lock
there. Use a 1 CPU/1 GiB bounded build, and leave at least 8 GiB disk free:

```sh
cp deployment/maintenance/penpot-2.18.3/runtime-packages.lock /var/lib/utilibre-maintenance/penpot-2.18.3-20261011/runtime-packages.lock
DOCKER_BUILDKIT=0 docker build --memory 1g --cpu-quota 100000 --cpu-period 100000 -f deployment/maintenance/penpot-2.18.3/Dockerfile.runtime -t utilibre-penpot-backend:2.18.3-debian-inventory-20261011 /var/lib/utilibre-maintenance/penpot-2.18.3-20261011
node deployment/maintenance/penpot-2.18.3/check-runtime.mjs
node deployment/maintenance/check-penpot-2.18.3.mjs utilibre-penpot-backend:2.18.3-debian-inventory-20261011
```

Inventory candidate ID:
`sha256:a52d2864fd198a89b4af7c0fdad88f9d69751803fe971f2ad35e716e2df7ff35`.
Image size: 472,447,690 bytes. Genuine scanner inventory: 228 Debian + 170 Java
packages. Java has zero high/critical findings. OS has **3 critical and 122 high**
raw findings, none with a listed trixie fixed version in this scan. Restoring
coverage must not hide those newly visible issues.

`check-runtime.mjs` passed native PNG generation, PNG/JPEG/WebP thumbnails,
FontForge-generated fictional TTF/OTF, WOFF/WOFF2 roundtrips and `prlimit`, using
no network and only disposable tmpfs files. Full native evidence:
`/opt/utilibre/reports/penpot-native-roundtrip-1q75sw8j`. Two fictional accounts,
editable native export/import/browser edit/save/reload, member removal/leave,
orphan-permission denial, native Chromium PNG export, actual backend upload and
100 × 75 JPEG thumbnail, other-account denial and deletion all passed.
Fixtures were removed; no real user data, email or external service was used.

## Narrow follow-up hardening

`Dockerfile.frontend-minimal` actually uninstalls unused gawk. The already
installed mawk executes the upstream POSIX resolver expression unchanged. DHI's
stripped alternatives state requires explicitly registering the native mawk
binary after gawk's uninstall. The stale `/var/lib/dpkg/status.d/gawk` fragment
is removed only after the real package and executable are gone and the fragment
is confirmed to name gawk. No inventory of retained software is removed or
modified. The native application, nginx configuration and entrypoint file bytes
remain unchanged. Synthetic IPv4, IPv6, scope and comment parsing agree with
GNU awk. Scanner now reports **0 critical/98 high**, with no gawk package or
finding; this does not waive the remaining findings.

`Dockerfile.exr-policy` adds only an EXR coder denial to each component's own
native ImageMagick policy. Backend and exporter policies differ, so one is not
replaced with the other's. Penpot's accepted public image types are JPEG, PNG,
WebP, GIF and SVG, not EXR. This is defense in depth against unsupported EXR
decoding, **not a patch to OpenEXR or libxml2**. No browser/export sandbox flag,
resource limit, supported format, authentication or retention setting is changed.

Build frontend with `Dockerfile.frontend-minimal`. Build two instances of
`Dockerfile.exr-policy`, setting `BASE_IMAGE` to the inventory candidate and the
previously reviewed vendor exporter respectively. The target tags are
`utilibre-penpot-frontend:2.18.3-minimal-runtime-20261011`,
`utilibre-penpot-backend:2.18.3-runtime-hardening-20261011` and
`utilibre-penpot-exporter:2.18.3-runtime-hardening-20261011`.

Run `check-runtime-hardening.mjs` and then the complete native checker with the
final backend tag. The former checks real gawk removal, full app-file equality,
native config preservation, JPEG/PNG/WebP/SVG processing, a synthetic EXR and the
same EXR bytes mislabeled as PNG. The latter repeats the actual two-account app,
permission, import/export and backend thumbnail gates with all three final
images. Private receipts are under
`/var/lib/utilibre-maintenance/penpot-runtime-20261011/`.

Final staged IDs (all gates passed at 21:43 UTC; no production change by this
subtask):

| Component | Exact local image ID |
| --- | --- |
| Frontend | `sha256:ca4f4adc5367a40e1597bea7d6032de0d08266b6d65cdf083ae4c695d54d23a7` |
| Backend | `sha256:8b822a4d33272059d4be9b6023246a449b7ae6c9a4faf931d7477f168c7623b8` |
| Exporter | `sha256:d403d2f058e0f6ab958b232dd717b2864c3c5980441f577e1ac497d5cf5cedd2` |

Full final gate: `/opt/utilibre/reports/penpot-native-roundtrip-7yemwo50`, with
cleanup confirmed. Artifact equality was checked as root in read-only,
network-disabled containers so root-readable Chromium package files were
included; normal processing tests still ran as the unchanged native user.

## Remaining vendor issues and references

Checked 11 October 2026:

- [gawk CVE-2026-40468](https://security-tracker.debian.org/tracker/CVE-2026-40468):
  trixie has no fixed vendor package. Actual component removal avoids maintaining
  a new gawk fork; it is not a statement that the earlier gawk was patched.
- [OpenEXR CVE-2026-42216](https://security-tracker.debian.org/tracker/CVE-2026-42216)
  and CVE-2026-42217 remain in trixie 3.1.13-2. EXR denial narrows ImageMagick use;
  retain the package findings and evaluate future signed vendor fixes.
- [libxml2 CVE-2026-6653](https://security-tracker.debian.org/tracker/CVE-2026-6653):
  no fixed trixie package. XML/SVG/font functionality still uses native libraries;
  EXR denial does not mitigate all libxml2 consumers. Do not force a Debian
  testing/sid library or major ABI change to make the scanner quiet.
- [Exact upstream runtime recipe](https://github.com/penpot/penpot/blob/ff7a66f51938b2293260ea27a64e2c4e0833b5e3/docker/images/Dockerfile.backend)
  and [media type allowlist](https://github.com/penpot/penpot/blob/ff7a66f51938b2293260ea27a64e2c4e0833b5e3/common/src/app/common/media.cljc).

The proposed libxml2 backport was inspected rather than assumed small. Official
[commit 463bbeeca1805b5c4828f50d0fefc4eebaf620df](https://github.com/GNOME/libxml2/commit/463bbeeca1805b5c4828f50d0fefc4eebaf620df)
changes seven files (+276/-227 lines), redesigns entity-expansion accounting,
alters `XML_PARSE_HUGE` behavior and adds fields to public `xmlEntity` and
`xmlParserInput` structs. Ubuntu's
[2.9.14 backport](https://git.launchpad.net/ubuntu/+source/libxml2/plain/debian/patches/CVE-2026-6653.patch?h=ubuntu/noble-security)
is officially released in noble 2.9.14+dfsg-1.3ubuntu3.8, but likewise includes
the parser rewrite and public-struct changes. It is not a small ABI-neutral
patch to drop into this Debian runtime. No cross-distribution binary was
installed, no unreviewed subset was invented, and no false fixed-version
metadata or scanner suppression was created. Closing this remaining finding
requires an appropriate signed Debian fix or a separately scoped complete
native-library ABI/security backport review. The main maintainer explicitly
deferred that broader backport on 11 October.

## Release and rollback

Use the existing release process to change only the final reviewed image pins.
Retain the approved OIDC-only, no-telemetry, disabled-MCP/PREPL and resource
configuration. This runtime-only change keeps Penpot 2.18.3 and introduces no
new database migration. Check public frontend login, OIDC start, backend and
exporter readiness, then rerun the security scan to verify real OS coverage.
If needed, roll back just these image pins to the previous 2.18.3 images; do not
restore over newer user data. The earlier missing-inventory alert must stay
active until the running backend is actually the inventory-bearing image.
