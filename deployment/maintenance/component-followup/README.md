# Exact component follow-up — 12 October 2026

These scripts **prepare**, but never apply, seven-day review decisions. They do
not install packages, remove dependencies, change a live service, or alter raw
scanner findings. Their purpose is to distinguish the binary component that
contains a defect from unrelated siblings sharing the same source-package name.

## Evidence and results

The initial run prepared **17 binary-component decisions** and **2 runtime
decisions**, with no unverified groups. Ten focused policy tests passed. Repeat
the reviewers after the release's final scan; old receipts are not transferable
to another scan or image.

| Exact installed component | Findings reviewed | What was checked / what remains open |
| --- | --- | --- |
| `gdal-data`, `gdal-plugins` 3.13.2+dfsg-1.pgdg12+1 | 49014, 8086, 8087 | Complete package inventory, content digests and file types. Data package contains reference files; this plugins package contains `drivers.ini`, not plugins. Real `libgdal32` decoder findings remain open. |
| `mariadb-common`, `libmariadb3` 1:10.11.18-0+deb12u1 | 107815, 107818, 107823 | Config-only common package and Connector/C plus five named client authentication plugins. Neither includes CONNECT, the MariaDB server service unit, or SQL view parser. No general exemption for future MariaDB defects. |
| `postgresql-17-postgis-3-scripts` 3.6.0+dfsg-3.pgdg12+1 | 73515 | SQL/control files and native-library call declarations are not the native FlatGeobuf decoder. The installed `postgresql-17-postgis-3` library finding remains open. |
| Host `dracut-install` 106-6 | 15816, 16445, 6893 | Package is the native file-copy helper, not affected emergency/DHCP shell modules. `dracut-core` is not installed; `/usr/lib/dracut/modules.d` is absent; native `initramfs-tools` is installed. No boot configuration was changed and no boot test is claimed. |
| Kuma `python3-cryptography` 38.0.4-3+deb12u1 | 69249 | Full inventory and native Python import confirm absence of the Rust X.509 verification API introduced in 42.0.0. CVE-2023-50782 and the host's different 43.0.0 package are **not** covered. |
| `libtiff6` 4.5.0-6+deb12u4 / 4.7.0-3+deb13u3 / 4.7.0-3+deb13u3+dhi3 | 52490 only | Debian identifies `process_command_opts()` in the separate `tools/tiffcrop.c` program. Exact library-package inventories contain the shared decoder and documentation, not that tool. All three reviewed content fingerprints are pinned. This does **not** exempt TIFF decoder defects, a separately installed `tiffcrop`, or future versions. |
| RSSHub source a7d400051d8dc73c0a0a60197920df9d3f80b75c | CVE-2021-21278 | GitHub ancestry establishes descent from the actual 2021 repair. All 4,378 compiled modules match reviewed hashes; removed modules are absent and eight current Huxiu modules contain no vulnerable JavaScript evaluation. The scanner's package.json `1.0.0` is not the project's release boundary. |
| Chitchatter tracker `ip` 2.0.1 | CVE-2024-29415, runtime only | Exact 517-file application/dependency tree; sole `ip` import is the disabled UDP parser, calling only `toString`. An isolated copy of the exact image completed two native WebSocket announcements and an offer delivery while classifier methods were replaced by throwing guards. No classification calls occurred; both UDP sockets were absent. The dependency itself is **not repaired** and its tracked lockfile finding stays open. |

Binary decisions require exact package versions **and** the reviewed digest of
every package-owned path, file type, file content hash and symbolic-link target.
Only missing documentation/lintian files are tolerated, and their absence is
also fingerprinted. Unexpected files, changed versions or content, an affected
sibling, new CVEs, unverified scanner scope, or changed image fail closed.

The runtime check starts two sequential disposable, read-only test containers:
no network interface beyond loopback, no public port, no capabilities, 192 MiB
RAM/swap bound, 0.5 CPU, 32 PIDs, no container logs. It does not contact live peers
or public feed sources. The host makes one read-only GitHub ancestry request.
The synthetically generated offer contains no real SDP, credentials or users.

## Run / apply / renew

```sh
node --test deployment/maintenance/component-followup/policy.test.mjs deployment/maintenance/component-followup/runtime-policy.test.mjs
node deployment/maintenance/component-followup/review.mjs
node deployment/maintenance/component-followup/review-runtime.mjs
```

Private evidence and proposed decisions are written under
`/var/lib/utilibre-maintenance/component-followup-20261012/`:

- `binary-evidence.json`: exact inventories and native import evidence.
- `binary-reviews.json`: 17 proposed binary decisions, fresh scan identifier.
- `runtime-reviews.json`: two proposed runtime decisions and isolated results.

The release maintainer must inspect these and explicitly allowlist/apply the two
review files through the existing `closure-review/apply-reviewed.mjs`. This
directory intentionally does not edit that apply gate or the decision ledger.
Expiry does not automatically renew anything. On upgrade, regenerate evidence;
if the component/inventory changes, update the reviewed boundary only after new
source inspection and tests. Do not copy decisions merely because the new image
has a familiar service name.

Rollback of an applied attribution is removal of its exact decision key from
the private decision ledger followed by the existing queue rebuild. There is no
software/data rollback because this review deploys no software and modifies no
application or host settings.

## Primary sources inspected

All inspected on 12 October 2026; the advisory numbers abbreviated above have the
`CVE-2026-` prefix unless written in full.

- GDAL [netCDF fix](https://github.com/OSGeo/gdal/commit/c49254dc6380af2f02ff43ca79e3cf7c1bc82f01), [HDF4 SW decoder](https://github.com/OSGeo/gdal/commit/9491e794f1757f08063ea2f7a274ad2994afa636), [HDF4 GD decoder](https://github.com/OSGeo/gdal/commit/184f77dbcc74118c062c05e464c88161d3c37b9b). Each changes native decoder source, not reference data.
- MariaDB [CONNECT fix](https://github.com/MariaDB/server/commit/b369925f6855d3e1f0ebcf453492724b99fda6f8), [server service fix](https://github.com/MariaDB/server/commit/e3d62d4e78fd4941cef3f5053e6a50d0b32d740e), [view parser fix](https://github.com/MariaDB/server/commit/8a642bc8103aadc6b2087d781ba8e1595616a2c4). None changes Connector/C.
- PostGIS [3.6.0 native decoder](https://raw.githubusercontent.com/postgis/postgis/3.6.0/postgis/flatgeobuf.c), [3.6.0 build rules](https://raw.githubusercontent.com/postgis/postgis/3.6.0/postgis/Makefile.in), [Debian CVE record](https://security-tracker.debian.org/tracker/CVE-2026-73515), [native repair](https://github.com/postgis/postgis/commit/53e273faeb440176eee83f76319b48afb0b86834). The tracker names merge commit `767fa406…`; GitHub's commit API confirmed the patch's `53e273fa…` header is its second parent, not an unrelated artifact. The native C/C++ repair and deployed-version build rules confirm the SQL-only attribution. That native repair has **not** been applied or regression-tested here.
- dracut [emergency-hook fix](https://github.com/dracut-ng/dracut/commit/c4d555716d569038ca38365741e94ee07908f261), [legacy DHCP fixes](https://github.com/dracut-ng/dracut/pull/2469), [NetworkManager advisory](https://security-tracker.debian.org/tracker/CVE-2026-16445), [106 native helper source](https://raw.githubusercontent.com/dracut-ng/dracut/106/src/install/dracut-install.c). These are separate code components, not a claim that Debian's no-DSA classification resolves the CVEs.
- cryptography [42.0.0 API introduction](https://cryptography.io/en/42.0.0/x509/verification/), [advisory](https://github.com/pyca/cryptography/security/advisories/GHSA-jwv3-5hgf-82ww), [Rust verification fix](https://github.com/pyca/cryptography/commit/4a12cf49675a184e47f912b00b04f3a629283582).
- RSSHub [original advisory](https://github.com/DIYgod/RSSHub/security/advisories/GHSA-pgjj-866w-fc5c), [exact repair](https://github.com/DIYgod/RSSHub/commit/7f1c43094e8a82e4d8f036ff7d42568fed00699d), [source ancestry](https://api.github.com/repos/DIYgod/RSSHub/compare/7f1c43094e8a82e4d8f036ff7d42568fed00699d...a7d400051d8dc73c0a0a60197920df9d3f80b75c).
- node-ip [classification issue](https://github.com/indutny/node-ip/issues/150), [Debian warning about incomplete repairs](https://security-tracker.debian.org/tracker/CVE-2024-29415). Do not apply the first suggested partial fix without also checking CVE-2025-59436 and CVE-2025-59437.

## Remaining real repairs

This component-attribution review does not itself fix Bookworm GDAL or native PostGIS.
The separate [native follow-up](../geospatial-followup/README.md) subsequently
released the PostGIS repair; GDAL's build/check gates remain separate. A candidate must preserve
the existing native ABI and pass actual NetCDF/HDF4/FlatGeobuf regressions plus
Gathio's database restore and representative PostGIS use. Do not remove these
dependencies from the DocumentDB image simply to reduce the scanner count.
Likewise, a future tracker upgrade should prefer an upstream dependency graph
without node-ip; runtime non-use does not make the library intrinsically safe.
