# Native runtime closure, 11 October 2026

Scope: genuine package removal or supported native rebuilds. Application code,
accounts, document data, encryption and access policies are not changed. No
scanner exception is introduced by these recipes.

## Coturn 4.18.0 — released

The binary does not link LMDB or libxml2. Those libraries were dependencies of
unused Bind DNS auto-detection tools. Both live Compose services directly execute
`turnserver -c /run/config/turnserver.conf` with explicit addresses; they do not
invoke the upstream DNS-discovery entrypoint.

`Dockerfile.coturn-minimal` checks the exact five-package purge plan and removes
only `bind9-dnsutils`, `bind9-host`, `bind9-libs`, `liblmdb0`, and `libxml2`.
No broad autoremove, database replacement or feature switch is involved.
The original relay binary SHA-256 remains
`7d7706104f48524ccc19636fc3dcad46de563267b84641d335c1376ea0272dfc`.

- Base: `utilibre-coturn:4.18.0-security-20261011`, image
  `d3645951d146f938f8ce3ff3d85d3cf2022b693bffa35d7c23f88d40184b4460`.
- Release: `utilibre-coturn:4.18.0-minimal-native-20261011`, image
  `42d3309a92b6e573ffdcdf971cf65fd50dcc6cb3e6e9ed9ca49f7f17cf482b79`.
- Image-only pins changed in `deployment/community/compose.turn.yaml` and
  `deployment/pack/compose.galene-turn.yaml`; runtime settings remain unchanged.

Build after verifying the base identity above:

```sh
DOCKER_BUILDKIT=0 docker build --cpuset-cpus 0 --memory 512m \
  -f deployment/maintenance/native-final/Dockerfile.coturn-minimal \
  -t utilibre-coturn:4.18.0-minimal-native-20261011 \
  deployment/maintenance/native-final
python3 deployment/maintenance/native-final/check-coturn.py \
  utilibre-coturn:4.18.0-minimal-native-20261011
```

The disposable internal-network check passed: unchanged binary, authenticated
UDP/TCP/TLS allocations, wrong-password and anonymous denial, private/metadata
peer denial, four allocations with the fifth refused (486), bidirectional exact
payload between UDP and TLS clients, and native allocation deletion. All fixtures
were removed. No public NAT or throughput claim follows from this lab check.

At 22:30 UTC both production relays were recreated with the exact release image.
Both subsequently reached their native `healthy` state.
The existing PairDrop bounded-live gate passed real TLS, two allocations,
bidirectional payload, wrong credentials, private-peer/host firewall denial and
deletion. Galene passed its native TLS path, one expiring-credential allocation,
expired/wrong credential denial, deletion and unrelated-host-port denial. The
corrected post-release aggregate relay-socket check found zero active allocations;
the earlier pre-release parser used the wrong column and is not evidence of an
idle interval. No peer addresses or real user payloads were retained.

Rollback: restore only the two image tags to the base above and recreate one
`turn` service at a time with `--no-deps --no-build --pull never`. This restarts
active relay sessions; it does not change stored configuration or data. The
existing Compose build contexts describe the vendor-patched base; use the explicit
overlay command above, not a plain Compose rebuild, for this release.

Primary evidence checked 11 October 2026:
[LMDB malformed-database issue](https://security-tracker.debian.org/tracker/CVE-2019-16224),
[libxml2 issue](https://security-tracker.debian.org/tracker/CVE-2026-6653),
[Coturn 4.18.0 source](https://github.com/coturn/coturn/tree/23c6c1d32a3d2b21a56cee65d3203bcc4ea82d2b).

## Penpot 2.18.3 — verified no-EXR intermediate

The exact upstream ImageMagick 7.1.2-27 source is rebuilt with its documented
`--without-openexr` option, not an original codec or changed Penpot application.
`build-imagemagick.sh` enforces a one-CPU/2-GiB build and disk floor; source/build
objects use tmpfs and the dependency container is removed afterward. Source
archive SHA-256 is pinned. Its resolved signed Debian build-package inventory,
configure output, compiler log and final 22-MiB archive are under
`/var/lib/utilibre-maintenance/native-final/imagemagick-output/`.

`Dockerfile.penpot-no-exr` preserves the existing ImageMagick security policy,
updates both normal and private duplicate MagickCore/Wand libraries, removes
the genuine OpenEXR package and its private library copies. No source is patched.
The private duplicates were important: the first never-deployed candidate
failed the media gate because backend `LD_LIBRARY_PATH` preferred the old copy.
That failed candidate and its exclusive build layers were removed.

Verified candidates:

| Component | Image | SHA-256 image ID |
| --- | --- | --- |
| Backend | `utilibre-penpot-backend:2.18.3-no-exr-20261011` | `f894ce42177851eb25ef6b72349a2a83c35928ec5b243393f7f9c0323a803b8d` |
| Exporter | `utilibre-penpot-exporter:2.18.3-no-exr-20261011` | `e5feeab8cd7e1030ac5bed3152ae641198466c2b2e53f68337770cb66fa5aa3e` |

`check-penpot-no-exr.mjs` passed: unchanged application/JRE/Chromium bytes and
runtime configuration, exact delegate parity except EXR, identical decoded
PNG/JPEG/WebP/SVG pixels, ordinary FontForge TTF/OTF and WOFF/WOFF2 roundtrips,
unchanged native user/resource guard and rejection of real or mislabeled EXR.
The package and private OpenEXR/Iex/IlmThread payloads are absent—not merely
hidden from the package inventory.

The existing full isolated gate accepts a narrowly validated exact-ID manifest:

```sh
node deployment/maintenance/native-final/check-penpot-no-exr.mjs
node deployment/maintenance/check-penpot-2.18.3.mjs \
  --manifest=/var/lib/utilibre-maintenance/native-final/penpot-no-exr.json
```

Full gate passed at 22:43 UTC in
`/opt/utilibre/reports/penpot-native-roundtrip-x8ctw4yz`: two fictional accounts,
editable export/import/reload, account boundaries, removed-member/leave/orphan
permission denial, native Chromium PNG export, backend media processing and
deletion. Disposable containers, port relay and synthetic RAM data were removed.
The frontend remains the previously verified image. This intermediate was not
deployed on its own; the final XML release below includes it.

To release, the main maintainer changes only backend/exporter image pins through
the existing release process and checks public OIDC/backend/exporter readiness.
Rollback restores the prior `2.18.3-runtime-hardening-20261011` tags; do not
restore or overwrite user data. This does not fix the remaining libxml2 issue.

Sources:
[upstream Penpot native build](https://github.com/penpot/penpot/blob/ff7a66f51938b2293260ea27a64e2c4e0833b5e3/docker/imagemagick/Dockerfile),
[ImageMagick source](https://github.com/ImageMagick/ImageMagick/tree/b661ac969aa3a0d326690f95830aab246569f090),
[OpenEXR advisory](https://github.com/AcademySoftwareFoundation/openexr/security/advisories/GHSA-65j8-95g9-jgj4).

## Other native findings — investigation in progress

Penpot bundles additional native libraries in `/opt/imagick/lib/deps`.
Backend `LD_LIBRARY_PATH` causes ImageMagick and FontForge to load private copies;
an OS-only package update must not be represented as fixing these private copies.
The currently deployed EXR policy is a decoder restriction, not a library fix.

Kuma's native Node SQLite binding does not dynamically link OS SQLite, but purging
`libsqlite3-0` also removes its supported Python/Apprise runtime. Therefore that
broad purge was rejected. No application feature was silently disabled.

### Penpot libxml2 candidate: proper source backport

`build-libxml2.sh` uses the exact Debian 13 source
`2.12.7+dfsg+really2.9.14-2.1+deb13u3`, authenticated by Debian's APT source
indexes and additionally pinned by source-file SHA-256. An individual `.dsc`
signature was not separately established during the initial source inspection.
The local package revision is honestly named `+utilibre1`; it is not presented
as an official Debian fixed release.

The deployed exporter/private library already contains Docker Hardened Images
patches. Replacing it with plain Debian source would regress those fixes, so all
nine patches from DHI catalog commit
`4560b6ac143a58056b793efe2d6bcd5e92bf3682` are retained in their original order.
`libxml-dhi-patches.sha256` pins their bytes. The additional CVE-2026-6653 fix is
Ubuntu's reviewed backport at commit
`3df6dfb3e4528d6819b1d6f1cdf90d409bb86187`, not original parser code.

The fix appends fields to two public libxml structures. Existing field offsets
are unchanged in source, but code allocating those structures itself could be
incompatible. Reviewed FontForge SVG, librsvg and ImageMagick consumers use
libxml's native allocators. The gate compiles a test against original headers,
runs it against both libraries, compares existing exported symbols and field
offsets, and exercises the installed consumers. This is evidence for this
specific runtime, not a universal ABI guarantee for unrelated consumers.

The bounded build uses one CPU, 2 GiB RAM, tmpfs source/objects and a 9-GiB start
floor with an 8-GiB recovery floor. It explicitly runs the upstream `make check`
suite in the native Debian package build. Debian strips the `test`/`result`
corpus from the DFSG archive; the first explicit test run correctly failed on
missing files. The recipe restores only exact upstream 2.9.14 test fixtures
(GNOME archive SHA-256
`60d74a257d1ccec0475e749cba2f21559e48139efba6ff28224357c7c798dfee`),
preserving newer Debian fixtures. These test-only files are not shipped in the
runtime package. The runtime overlay installs the real
`.deb`, retaining truthful package inventory, then replaces the matching private
`/opt/imagick/lib/deps/libxml2.so.2` with the same payload. Updating only the system
library is insufficient because backend `LD_LIBRARY_PATH` prefers that copy.

Candidate gates are in `check-penpot-libxml.mjs`: package/payload equality,
unchanged application/runtime settings, original/new-header native allocators
and chunked entities, installed librsvg dimensions, exact normal raster pixels,
FontForge SVG import and TTF/SVG export/reopen. The full two-account gate must
then run with the generated `penpot-libxml.json` manifest.

The source build passed at 22:58 UTC: 3,360 document tests, nine recursive/huge
entity cases, 280,912 API cases across 1,164 functions, character tests,
20,000-string dictionary checks and 955 fuzz-corpus inputs. Existing exported
symbols and public field offsets compare identically; both old- and new-header
allocator/chunked-parser binaries passed against the rebuilt library. The
optional external W3C conformance corpus was not downloaded and is not included
in these coverage claims. Compiler container and tmpfs build objects were removed.

Real package `libxml2_2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1_amd64.deb`
SHA-256: `b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4`.
Private source/build/ABI receipts and the corresponding development/utility
packages are in `/var/lib/utilibre-maintenance/native-final/libxml2-output/`.
Final native candidates:

| Component | Image | SHA-256 image ID |
| --- | --- | --- |
| Backend | `utilibre-penpot-backend:2.18.3-libxml-security-20261011` | `0e6eb47f25fde0310f7b318144bf78c2bc068fb4f3a4f0edcaaebcc604eeae95` |
| Exporter | `utilibre-penpot-exporter:2.18.3-libxml-security-20261011` | `a3102615b1349f141d787dd806bc3464a49d223a5336471b3e09b1bc74a6d8da` |

Both stack on the verified no-EXR candidates; frontend is unchanged. All native
image gates above passed at 22:59:56 UTC. FontForge's pre-existing optional
plugin-discovery warning remains; SVG, fonts and WOFF conversions passed through
its real embedded Python interface rather than requiring a new Python module.

The complete isolated two-account gate passed at 23:00:55 UTC:
`/opt/utilibre/reports/penpot-native-roundtrip-ul45qgid`.
It covered editable export/import/reload, account isolation, removed-member,
leave and orphan permissions, native Chromium PNG export, backend media and
deletion. The cleanup receipt confirms containers, relay and synthetic RAM data
were removed.

Release only the exact two image IDs above using the existing image-only process
and public OIDC/readiness checks. The private exact-ID manifest is
`/var/lib/utilibre-maintenance/native-final/penpot-libxml.json`; rerun with:

```sh
node deployment/maintenance/native-final/check-penpot-libxml.mjs
node deployment/maintenance/check-penpot-2.18.3.mjs \
  --manifest=/var/lib/utilibre-maintenance/native-final/penpot-libxml.json
```

Rollback changes only backend/exporter pins to their previously deployed
`2.18.3-runtime-hardening-20261011` images. Preserve application storage and all
user data. No schema, access, retention, telemetry or backup policy is changed.

### Production release, 23:06:44 UTC

The main maintainer authorized the final two-image release. `release-penpot.mjs`
reuses the existing exact-image/health/rollback protocol. Preparation paused
only Penpot's backend, admin and exporter for a consistency snapshot; unrelated
account services stayed running. The snapshot at
`/opt/utilibre/expanded-backups/2026-10-11T23-04-52-685Z` passed native PostgreSQL
restore in a network-none tmpfs container and archive/checksum checks. Assets
were checked as an archive, not restored into a live application. This is an
on-host recovery snapshot, not an additional off-host backup.

Only the backend/exporter image pins in `deployment/expanded/compose.yaml`
changed. Both exact candidate IDs above are live. Frontend and admin container
IDs, images, settings, user access and data remained unchanged. Native backend,
exporter and frontend readiness passed; the real public login appeared and the
OIDC start reached Authentik without submitting credentials. Browser requests
were confined to `design.utilibre.org` and `auth.utilibre.org`, with no script
errors. Both live containers report the genuine rebuilt package and identical
system/private libxml payloads. Private receipt:
`/var/lib/utilibre-maintenance/native-final/penpot-release.json`.

The shared rollback protocol's 15 focused tests passed. This is not a claim of
complete security, every browser/format tested, or removal of every scanner
finding; local backports need exact source/image-bound triage, not version spoofing.

Primary sources:
[Debian issue status](https://security-tracker.debian.org/tracker/CVE-2026-6653),
[DHI exact recipe](https://github.com/docker-hardened-images/catalog/blob/4560b6ac143a58056b793efe2d6bcd5e92bf3682/package/deb/main/libxml2/debian-13/2.yaml),
[upstream fix](https://github.com/GNOME/libxml2/commit/463bbeeca1805b5c4828f50d0fefc4eebaf620df),
[Ubuntu backport](https://git.launchpad.net/ubuntu/+source/libxml2/plain/debian/patches/CVE-2026-6653.patch?id=3df6dfb3e4528d6819b1d6f1cdf90d409bb86187).
