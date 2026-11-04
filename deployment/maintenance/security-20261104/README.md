# 4 November security follow-up

This extends existing native repair and review commands. It adds no scheduler,
LLM dependency, public application or scanner suppression. Raw scanner records
remain available. Review decisions are exact artifact/package/advisory records
with seven-day expiry, separate from permission to deploy.

## Advisory refresh and renewed proof

The 10:36 UTC scan refreshed Trivy's advisory database. Its first queue showed
three critical and 158 high records awaiting review. Ninety-three high/critical
records had expired earlier exact reviews; this was not evidence that those
installed fixes had disappeared. Existing XML, JWT, binary-component,
util-linux, ncurses, urllib3, CPython and dracut reviewers were rerun against
actual installed bytes before their decisions were recorded.

Private evidence: `/var/lib/utilibre-maintenance/security-20261104/`.
`baseline.json` preserves the initial count; `retained-*`, `reviews-applied*.json`
and the normal triage ledger identify the exact renewed records. These reviews
neither lower severities nor delete the raw observations.

### Expat CVE-2026-113351

[Debian](https://security-tracker.debian.org/tracker/CVE-2026-113351) identifies
2.10.0 as fixed; the earlier update already installed that code. A small native
regression adapts [upstream PR1431](https://github.com/libexpat/libexpat/pull/1431):
it sets the public allocation threshold lower and uses 64 KiB synthetic XML.
Both narrow/wide 2.9.0 controls successfully parse legitimate input but fail the
post-reset document with the expected allocation error. All four narrow/wide
Debian 12/13 2.10.0 libraries pass. It is run without network, credentials or
production data mounts, as uid 65534, with 128 MiB address-space/10-second CPU
limits. It is not a huge-memory exploit or complete application test.

```
node deployment/maintenance/security-20261104/check-expat-reset.mjs
node deployment/maintenance/security-20261103/review-expat.mjs --reset-advisory
node deployment/maintenance/security-20261103/review-expat-host.mjs --reset-advisory
```

The first command prepares isolated evidence; the other two prepare decisions,
not ledger writes. Both reuse the existing release, source and live-payload
checks. Host checks also reject old/deleted resident library mappings. The
extracted `expat-host-proof.mjs` now lets CPython's existing reviewer accept
this separately verified host-library update instead of requiring obsolete
2.9.0. No release receipt or original manifest was rewritten.

### Kernel headers and HEIF component attribution

The existing header reviewer now covers 99231 (io_uring waitid), 99233/99235
(tracing) and 99239 (Bluetooth). It checks the exact installed `linux-libc-dev`
version and file inventory; only header/documentation packages qualify. It
never clears the separate VM or Proxmox kernel. Primary references are each
CVE's Debian tracker page. The running VM kernel was observed as
`6.12.115+deb13.1-cloud-amd64`; that is not a Proxmox host assessment.

The existing HEIF reviewer verifies six additional absent components against
its retained source hashes, exported symbols, built library, source offer and
complete deployment lineage: 120208, 50142, 62289, 62292, 84444 and 84446.
These concern later uncompressed-tile and sequence APIs absent from 1.15.1.
Its tests reject the exemption if those implementations are present. **84384
and 84447 remain open:** this build enables zlib metadata decompression and
contains recursive overlay decoding. They were not waived merely because
the installed version is older than the versions discussed upstream.

## Coturn libmongocrypt repair

Source: [MongoDB libmongocrypt](https://github.com/mongodb/libmongocrypt),
Apache-2.0. The authenticated Debian source is `1.13.2-1+deb13u1`; the local
package is `1.13.2-1+deb13u1+utilibre1`. Its original CVE-2026-81523 patch remains.
Two unchanged upstream patches address [CVE-2026-106433](https://security-tracker.debian.org/tracker/CVE-2026-106433):
[duplicate masterKey rejection](https://github.com/mongodb/libmongocrypt/commit/556bcb70b6efecb7f568d824b03469df3a3bc91a)
and [atomic key-encryption-key parsing](https://github.com/mongodb/libmongocrypt/commit/8bc580ea69eea13a932197221edf72830fbc38a1).
No cryptographic algorithm, TURN credential or application setting is changed.

`mongocrypt-inputs.json` pins source/archive/patch identities, compiler base,
acquired compiler packages, package inventory, old image, candidate and scope.
Debian's signed InRelease and complete Sources hash authenticated the original
archives. Acquisition was separate from unprivileged networkless compilation.
All downloads and native tests use synthetic upstream fixtures, no production
credentials. Preserve the recorded dependency `.deb` files for offline replay;
do not resolve moving package versions during a replay.

Run `build-mongocrypt.sh` only in the isolated compiler described in the source
offer. It builds the repaired Debian package and a baseline with the upstream
regression tests but without the repair. The selected upstream tests fail for
the intended reasons before and pass afterward. The full native test process
exits successfully: **330 passing cases, three platform/configuration skips**.
All 980 exported symbols, SONAME and NEEDED entries remain identical. Exact
source comparison permits only the two implementation files, two upstream test
files and declared Debian patch/changelog changes.

After the build, copy `test-mongocrypt.sh` into that same isolated compiler and
run it as uid 65534 with network disabled. It writes the verifier's native logs
to `/output`, refuses to overwrite existing test logs, bounds execution time and
disables core dumps. The optional `/output/replay` argument keeps the original
release evidence intact during a repeat test. Both expected baseline assertion
messages are checked by `mongocrypt-native.mjs`; an arbitrary crash does not count
as a successful before/after proof. The published source supplement contains the
complete upstream tests; this repository supplies the replay runner as well.

```
node deployment/maintenance/security-20261104/mongocrypt-native.mjs
node deployment/maintenance/coturn-bson-final/stage.mjs --mongocrypt-nov04
node deployment/maintenance/coturn-bson-final/application.mjs --mongocrypt-nov04
node deployment/maintenance/security-20261104/scan-mongocrypt.mjs
node deployment/maintenance/security-20261104/publish-mongocrypt-source.mjs
node deployment/maintenance/coturn-bson-final/release.mjs prepare --mongocrypt-nov04
# After scoped approval: update only the two Compose image pins, then:
node deployment/maintenance/coturn-bson-final/release.mjs apply --mongocrypt-nov04
# After the fresh fleet scan:
node deployment/maintenance/security-20261104/review-mongocrypt.mjs
```

Preparation requires the exact baseline, package and completed native checks;
completed stage/release evidence is not silently overwritten. The shared
updater rejects active relay allocations and checks twice before each serial
restart. Native STUN must pass afterwards. No database or persistent-data
migration is involved. The full runtime/config comparison excludes only the
new libmongocrypt package; BSON/OCSP, SQLite and other earlier fixes survive.
The isolated application fixture passes ordinary authenticated UDP/TCP/TLS,
anonymous/wrong-password denial, private/metadata peer denial, four allocations
with a fifth refused, bidirectional exact bytes and native allocation deletion.
This does not establish public NAT, phone coverage or throughput. Production
limits, credentials, ports, logging and retention are unchanged.

The scan compares the exact old/new images against the same local advisory
snapshot. It rejects scanner errors, missing inventory and new high/critical
findings. Normalization removes only Trivy's changing OS image label and the
one intentionally changed package version; other targets, severity and CVEs
remain significant. It does not treat remaining version-based flags as proof
that the source backport failed, or as permission to ignore them.

Deployed at **12:00:02 UTC** to the PairDrop and Galene relay roles:

- Before: `utilibre-galene-turn-turn:sqlite-rowid-20261103`, image
  `sha256:2d099787fc4af07d23c09c71ea2f57cc6b5248b24636cceba659820ceaf7a1e9`.
- After: `utilibre-coturn:mongocrypt-security-20261104`, image
  `sha256:22475b057d3546332125370fa15b1d19f213d932fda1278392457246ba2e3338`.
- Package SHA-256: `ea81a711145bdd78eb5acc092ee213316df6d133701207797a3677123dffff10`.
- [Complete library source supplement](https://tools.utilibre.org/utilibre-source/security-coturn-mongocrypt-20261104-source.tar.gz),
  1,195,276 bytes, SHA-256 `1835ca6eb0ec2b605d2112740f4a2a1e3aad1884968a8b535a1bf319d03ec16d`.

Rollback restores the recorded previous image pins in
`deployment/community/compose.turn.yaml` and
`deployment/pack/compose.galene-turn.yaml`, one service at a time, using the same
idle-allocation safeguard and native STUN verification. Preserve all runtime
configuration and user data. No image pruning was done. Source supplementation
is additive; earlier complete Coturn/MongoDB-driver sources remain necessary.

No byte-for-byte build reproducibility, all-service security clearance or new
public throughput capacity is claimed. ACL caller migration and GRUB repairs
remain under the earlier automatic security-review restriction; do not retry
those blocked operations through this new recipe.

## Final checkpoint

The 12:02:46 UTC fleet scan completed for 109 images / 175 containers, 83 source
inventories and 508 host packages, using the same 07:16:25 UTC advisory revision
as the candidate comparison. Exact reviews leave **0 critical / 38 high** pending
package-target records: 30 ACL, five GRUB, two HEIF and one Python-Markdown.
The raw scan remains 24,403 observations (65 critical / 2,912 high); those include
previously repaired and proven absent components. Pending lower severities are
5,119 medium / 5,449 low / 947 unknown. This is not full security clearance.

`final-checkpoint.json`, `reviews-applied-post-release.json` and retained review
copies preserve the counts and their basis. `mongocrypt/public-source-check.json`
records the successful public download/hash; `native-runner-replay.json` records
330 passing native cases, both expected baseline failures and overwrite refusal.
The compiler is stopped. Seventy-four focused maintenance policy tests passed.

## Gathio HEIF upgrade — deployed 12:50 UTC

The Gathio database image now carries Bookworm-built libheif **1.23.7**, package
`1.23.7-0+utilibre1~deb12`. This replaces the older 1.15.1 backport. The original
signed Debian 1.23.6 candidate was rejected before release: upstream 1.23.7 fixes
additional high-severity issues, including one specific to 1.23.6. All five
previously carried HEIF corrections are verified ancestors of tag `v1.23.7`.
The release asset's SHA-256 matches GitHub's published digest; it is not claimed
as a Debian-signed 1.23.7 source package.

The ordinary metadata test exposed a separate upstream compatibility bug:
libheif's XMP writer labels zlib-wrapped bytes as `deflate`, but 1.23.7's reader
initially tries raw DEFLATE. The unmodified candidate fails with compression
error 2/150 on its own valid output. `heif-legacy-metadata.patch` changes only
that reader: after invalid-compression failure it permits a single zlib retry
for a valid zlib header. It never retries a security-limit failure, and both
attempts share the upstream work budget. This preserves old-writer files as
well as the current writer. It is a local compatibility correction, not an
upstream CVE patch or a replacement decompressor.

`heif-inputs.json` pins the exact archive, patch, compiler image, acquired build
packages, compiler inventory, prior image and resulting package. The source
comparison permits only `libheif/compression_zlib.cc`; the two Debian packaging
files supply dependency/license information. Compilation used uid 65534 with
network disconnected, two CPUs/two GiB and a finite timeout. Existing builtin
HEVC/AV1 codecs and zlib compression remain; no remote codec, plugin loader,
GDK loader, Brotli codec or new runtime service was added.

Verification retained under
`/var/lib/utilibre-maintenance/security-20261104/heif-upgrade/`:

- 38 upstream CTest programs pass; 12 optional/configuration programs skip.
  The full program names and logs are retained. No skipped feature is claimed.
  Internal tests requiring full symbol visibility and disabled-codec tests are
  not compiled by this production configuration; they are not included in 50.
- The metadata test uses only 64 KiB fictional text. Old/new writer data and
  valid raw DEFLATE decode exactly; corrupt checksums/headers are rejected;
  deliberately small memory/work limits reject the same otherwise valid file.
  The fixture runner was replayed offline. No customer images were used.
- All 167 previous public C symbols, SONAME and native dependencies remain.
  Older weak C++ implementation exports are not a supported ABI claim. The
  experimental metadata compression enum changed upstream: a writer compiled
  with the old headers can store uncompressed metadata; exact data preservation
  is tested. Universal experimental-API compatibility is not claimed.
- Existing old-header HEVC/AV1 encoding/decoding preserves dimensions, colours
  and alpha. GDAL reads HEIC **and AVIF**, preserving the earlier AVIF repair.
  All 210 GDAL drivers remain, and four geospatial probes pass. Native PostGIS
  regression, raster export/import, geometry projection, DocumentDB typed data,
  synthetic dump/restore and allowed/denied account operations pass offline.
- Stage comparison preserves all unrelated package versions, runtime and
  configuration hashes. Same-database old/new Trivy scans add no high/critical
  matches. The new release's HEIF decisions use explicit upstream-fixed
  advisories, not the old 1.15.1 absent-component reasoning.
- Only Gathio's `postgres` service was recreated. Exact live library bytes,
  native DB/extension versions and the application HTTP check pass. No data or
  schema migration, host restart, notification or extra public route occurred.

Commands extend the existing HEIF stage/application/release helpers:

```
# Isolated compiler only: build-heif.sh, then test-heif.sh
node deployment/maintenance/security-20261104/heif-native.mjs --upgrade-nov04
node deployment/maintenance/heif-bookworm-followup/stage.mjs --upgrade-nov04
node deployment/maintenance/heif-bookworm-followup/application.mjs --upgrade-nov04
node deployment/maintenance/security-20261104/scan-heif.mjs
node deployment/maintenance/security-20261104/publish-heif-source.mjs
node deployment/maintenance/heif-bookworm-followup/release.mjs prepare --upgrade-nov04
# Scoped deployment approval is separate from preparation:
node deployment/maintenance/heif-bookworm-followup/release.mjs apply --upgrade-nov04
# Fresh fleet scan, then prepare exact, expiring decisions (no ledger mutation):
node deployment/maintenance/security-20261104/review-heif.mjs
```

Completed preparation receipts are not overwritten on rerun. Preserve the
original inputs/evidence; future candidates need a separately reviewed exact
input manifest, not a changed hash inserted to bypass a failed gate. The source
archive includes `REBUILD.txt`, complete upstream source, the local patch,
packaging, compiler inventory and native fixture sources. Replay requires the
recorded compiler/dependency artifacts; it does not resolve moving versions.
The guard compares actual artifact bytes. Deterministic review decisions and
repeatable fixtures do not establish byte-identical builds.

Deployment and rollback pins:

- Before: `utilibre-gathio-postgres:sqlite-rowid-20261103`, image
  `sha256:0fac8a9ffe8461689b7ed6f320a6e89b4bb1240f85a1562189cc3eae2df02541`.
- After: `utilibre-gathio-postgres:heif-1.23.7-20261104`, image
  `sha256:7d144211ce37c299fe413e702271a04586cfde9b85876eb3eac9d32b31e3682a`.
- Package: 734,936 bytes, SHA-256
  `e3caf2b8868f6d8e190387c15c49a8dffd3628b915796f9f745f0d04c95154b1`.
- [Complete source supplement](https://tools.utilibre.org/utilibre-source/security-gathio-heif-1.23.7-20261104-source.tar.gz):
  2,458,530 bytes, SHA-256
  `0c87079c2a712f2323b8f56711c744764d528eee96c7199fe45f56cc17bee9e4`.
  Public HTTP 200 and full hash were verified.

Rollback restores only the previous `postgres` image pin in
`deployment/calendar/compose.gathio.yaml`, using the established namespace,
configuration, health and image checks in the same release helper. Preserve all
volumes and secrets. No database migration needs reversal, but rollback restores
the old HEIF exposure. The previous image remains available; no pruning occurred.

Primary sources: [upstream release](https://github.com/strukturag/libheif/releases/tag/v1.23.7),
[metadata-decompression advisory](https://github.com/strukturag/libheif/security/advisories/GHSA-24wx-9w62-c96w),
[recursive-overlay advisory](https://github.com/strukturag/libheif/security/advisories/GHSA-x8xm-cm2c-cfc8).
`heif-reviewed-advisories.json` links 16 individually checked high and 12 medium records.
The later pixel-work amplification correction is included in 1.23.7 and its
upstream regression runs; no amplification test is sent to a live service.

### Final HEIF checkpoint and efficient exact reviews

The **12:52:19 UTC** fleet scan completed for 109 images / 175 containers,
83 source inventories and 508 host packages, using the same 07:16 UTC advisory
snapshot. Final review at **13:09 UTC** leaves **0 critical / 36 high** pending:
30 ACL, five GRUB and one Python-Markdown. Two previously open HEIF high records
and 12 medium records are now repaired. Pending lower levels are 5,107 medium,
5,449 low and 947 unknown. Raw observations remain 24,403, including 65 critical
and 2,912 high: Debian's base-distribution ranges still flag some locally fixed
packages. This is not full security clearance or an exploitability count.

3,114 exact artifact reviews were recorded after rechecking existing receipts,
source/payload hashes and component inventories. Most preserve earlier repairs
or distinguish headers from runnable kernel code; they are not 3,114 new fixes.
The completed HEIF release is explicitly appended to the existing ancestry
list. Older HEIF absent-component decisions were not transferred to new code.

`triage.mjs record-batch /absolute/private/review.json` extends the existing
operator-only recorder. Format: `{schemaVersion: 1, scanDate, decisions: [...]}`,
where every decision uses the existing exact-key/reason/status/expiry schema.
It accepts at most 5,000 decisions / 8 MiB, requires the current complete scan
from the last 24 hours, validates the whole batch before writing, rejects
unknown/unverified/duplicate entries and checks that the scan has not changed.
It writes the ledger atomically and rebuilds the queue once, instead of once
per entry. No finding detection, automatic approval, wildcard, threshold change
or new scanner/scheduler is introduced. A private exclusive writer lock prevents
concurrent recorder writes. After an interrupted process, inspect its recorded
PID and running writers before removing a stale `triage-write.lock`; do not
blindly remove locks. Raw reports and source review evidence remain unchanged.

**70 focused tests pass**: 28 HEIF/release policy checks and 42 maintenance,
recorder and batch checks. The isolated CLI tests verify all-or-nothing invalid
batch rejection, stale-scan rejection, busy-writer rejection, repeated recording
without duplicate keys and preservation of the scan. Native fixture replay and
overwrite refusal also passed. The compiler is stopped. The VM has about 23 GiB
free disk and 21 GiB available RAM at the observed checkpoint; no capacity or
concurrency promise follows from this observation.

Private final evidence: `heif-upgrade/final-checkpoint.json`, `retained-reviews/`,
`review-batch-{second,final}.json`, `reviews-applied.json`, `policy-tests.log`,
`triage-tests.log` and `public-source-check.json`. No new SSH, guest-agent or
reboot window was used. ACL caller migration and GRUB remain blocked by the
prior automatic security review. Python-Markdown's closed upstream report is
not a compatible fixed release; its record stays open. No notification was sent.
