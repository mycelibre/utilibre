# Native-library follow-up — 12 October 2026

This release continues the [closure repairs](../closure-review/README.md).
It does not assert that every scanner finding is fixed. It preserves application
data, origins, privacy configuration, account rules and rollback images.

## Implemented and deployed

- Host Vim and tiny Vim: Debian `2:9.2.0858-1`, with its compatible signed
  `libsodium26 1.0.22-2`. Both editors passed UTF-8 editing/save/reopen and ELF
  relocation checks. Upstream netrw, blob, buffer and spell tests passed with
  their native platform skips. Spell tests require a PTY; the initial non-PTY
  harness exited early and is not counted as a passing run.
- Host Expat: signed Debian `2.9.0-1`. Actual `pyexpat` checks passed valid XML,
  malformed XML and invalid UTF-16 rejection. The three host processes mapping
  the old library were refreshed: system/user D-Bus and unattended-upgrades.
  Their mappings now use `libexpat.so.1.13.0`; Docker/SSH remained active.
- Host BIND client/libraries: signed stable `9.20.29` source rebuilt as
  `1:9.20.29-1~deb13u1+utilibre1`, with upstream `--without-lmdb`. The unused
  optional server-zone backend and its dependency are absent. `liblmdb0` was
  removed only after dependency simulation showed no other consumer. No
  database or user file was deleted. Native synthetic UDP A/AAAA/NXDOMAIN and
  TCP A responses pass; ELF imports prove the five BIND libraries no longer
  link LMDB. This is not the complete upstream BIND test suite.
- Nine application images now use Expat `2.9.0-1`: Grist, Penpot backend and
  exporter, KitchenOwl, LiberaForms, FreshRSS, Priviblur, RSSHub and BreezeWiki.
  Penpot's private ImageMagick dependency copy is updated as well.
- Grist's Python 3.11.17, LiberaForms/Priviblur/BreezeWiki's Python 3.13.16 and
  KitchenOwl's Python 3.14.6 bundled older Expat. Their **unchanged upstream
  pyexpat translation unit** is rebuilt against system Expat. The interpreter,
  other Python packages, application code and runtime configuration remain
  unchanged. Upstream source archives and extension hashes are retained.

Independent CPython XML/ElementTree/DOM/SAX suite results: Grist 795 cases
(28 native skips), KitchenOwl 866 (31 skips), Priviblur and BreezeWiki 888 each
(32 skips). The latter pair exercises the same 3.13 extension used by Forms.
Grist also passed documents/formulas, cross-account denial, export and synthetic
restore. Forms passed native account/form permissions and CairoSVG PNG/PDF;
browser encryption and email were not re-tested. KitchenOwl passed native
household/recipe import/export/delete and isolation. FreshRSS passed fictional
feed/article persistence and OPML export. Penpot backend passed image thumbnails
and synthetic font conversion. The unchanged proxy/feed frontends received
library and startup checks, not another broad external-content crawl.

Every replacement is recorded in the private `expat-release.json`: exact old
and new image IDs, unchanged resolved-configuration hash, original image pin,
native readiness and deployment result. Image config and application-file hashes
are checked before release, allowing only the stated library/extension paths.
An existing KitchenOwl restart was captured as baseline; new containers must
have zero restarts. No production database migration/restore was performed.

## Primary evidence and build scope

### gzip follow-up — deployed

At **06:40 UTC**, nine gzip-only image replacements across six projects passed
their normal native supervisors and exact-image readiness gates. Eight Bookworm
images use **1.14-1~deb12u1+utilibre1**, rebuilt with their native libc from
authenticated Debian 1.14 source/packaging. The Ubuntu 24.04 Addy database uses
the signed vendor **1.12-1ubuntu3.2** package, not a Debian transplant. Both repair
[CVE-2026-41991](https://security-tracker.debian.org/tracker/CVE-2026-41991) and
[CVE-2026-41992](https://security-tracker.debian.org/tracker/CVE-2026-41992).

All **30 upstream tests passed**, with zero skips, in the unprivileged Bookworm
builder. Each candidate and its original image passed synthetic compression,
decompression, concatenated members, streaming, integrity failure, preservation
of originals, zgrep and gzexe execution. These are not an adversarial LZH proof
or a new full browser journey for each unchanged app. The initial fixture used
a non-executable temporary mount and correctly failed the gzexe execution gate;
only the disposable fixture was changed to permit execution, retaining non-root,
no-network, no-new-privileges, capability and resource restrictions.

Exact image configuration, application files, `/etc` and shared-library hashes
are unchanged. A fixed fixture hostname avoids comparing Docker-generated
random hostnames as an application change. No user data, database schema,
account policy, Caddy block or production mount policy changed. All 59 monitors
and 105 catalogue endpoint probes passed after rollout.

Recipes: `build-gzip.sh`, `gzip-stage.mjs`, `cache-release.mjs prepare/apply --gzip`.
Private `gzip-release.json` retains previous image pins and the existing native
supervisor/rollback for all six projects. Roll back only those exact image
scalars and recreate with the same supervisor; no data restore is needed.
The unused one-CPU/1-GiB compiler container removes itself; no retained new
compiler image. Source/update checks stay independent from functional checks.

Published source: `security-gzip-followup-20261012-source.tar.gz`, 960,873 bytes,
HTTPS SHA-256 `20184b37fd9e65593f12b898e90c733a52811cdc6f6ecf554f2fbc77d83ee04e`.
It includes original notices, complete native source, signed-source input pins,
build inventory and recipes, not private logs or user data.

### curl follow-up — deployed

The deployed version is native **curl 8.22.0-1~deb13u1+utilibre1**, from the
[signed stable 8.22.0 release](https://curl.se/docs/vuln-8.22.0.html), with
matching Debian source packaging. Signature fingerprint:
`27EDEAF22F3ABCEB50DB9A125CC908FDB71E12C2`. The signing key comes from the
previously authenticated Debian source. Upstream archive and Debian packaging
checksums are pinned in `build-curl.mjs`; no sid binary or new libc is installed.

The old 8.21 Debian patch set failed to apply cleanly and was rejected. Matching
8.22 packaging preserves both TLS-library symbol versions. Two native build
options retain supported NTLM/SMB features that newer defaults disable.
Upstream has removed RTMP and TLS-SRP; these are explicitly recorded rather
than advertised as preserved. No app feature or configuration is changed.
Native Trixie-backports nghttp3/ngtcp2 companions preserve HTTP/3 support;
feature presence is not an end-to-end QUIC test.

The first full test attempt exhausted the 256-process fixture limit and failed;
it is not a release candidate. Its complete results are retained privately.
The repeat uses two test workers, a 512-process ceiling, two CPUs, 3 GiB RAM,
network isolation and a tmpfs build tree. No test contacts a real user service.
Both suites have now passed: **1,837 OpenSSL cases / 1,833 GnuTLS cases**.
Each considered 2,072 cases; skipped/unsupported cases are not passes.
`curl-stage.mjs` then checks
unchanged app/configuration/unrelated-library hashes, original exported symbols,
and old/new synthetic GET, redirect, gzip, POST, TLS trust, wrong-host rejection
and 404 behavior. FreshRSS additionally exercises its actual PHP curl extension.
The first image gate caught Debian's removed `libcurl-gnutls.so.3` alias.
The installer retains that exact link to `.so.4` only when it existed before;
the original versioned ABI and compatibility path are tested, not shimmed.
All nine images passed those gates. The **nine roles / six projects** completed
their production readiness gates at **06:19 UTC**. The host's six replacements
and two native companions are installed too: actual host libraries and the
compatibility alias each passed all seven isolated transfer checks, while libc,
Docker/SSH PIDs and unrelated packages remained unchanged. No new service,
Caddy configuration, account change or user-data operation was required.
The subsequent full vulnerability scan is separate from these functional gates.

The 06:22:08 scan completed across 109 images / 175 containers, 55 manifests and
host packages. Exact subsequent reviews leave 0 critical / 492 high pending;
runtime/host raw counts are 40 critical / 2,711 high. This is not a clearance.
All 59 monitors and 105 catalogue endpoint checks passed after release, along
with 91 focused maintenance tests. Curl's review handles primary Debian `~rcN`
fixed versions with native version ordering, preserving the RC suffix and
rejecting unknown spellings or genuinely newer repairs.

The HTTPS-verified immutable source archive is
`security-curl-followup-20261012-source.tar.gz` (14,840,939 bytes), SHA-256
`6d4d77e4516ad07590286faea9acd7e7ed60eef8f3d9ab4343f0a700e4139f87`.
The completed, unused 1.2 GB compiler image was removed after checking that no
container used it; the private build context, source/packages, test receipts
and all application rollback images are retained. No user content was removed.

Release commands, **only after those gates pass**:
`cache-release.mjs prepare/apply --curl`; `curl-host.mjs prepare/apply` is
separate and requires exact package simulation and signed local rollback.
The image receipt includes old pins and the existing native supervisors.
Host rollback restores its six original packages and removes only the two new
companions, after checking that exact removal plan. No account data is changed.
`publish-curl.mjs --publish` creates an additive immutable source offer after
the completed live release. Check the private receipts before claiming success.

One separate XML review is completed: `review-xml-uri.mjs` verifies that the
existing 2.9.14 backport already contains the return-NULL guard described by
[GNOME's CVE-2026-86139 fix](https://github.com/GNOME/libxml2/commit/8edbbdb09f24d26a2f900141fddc2b9d014f53b0).
Exact package/source/library checksums and disassembly confirm the guard,
including Penpot's private library copies. Six exact findings were reviewed;
no giant-input test was performed and other XML issues are not exempted.

### Stable util-linux repairs

Native Trixie package version: `2.41.5-0+deb13u1+utilibre2`. This is a rebuild of
the installed stable family, not a distribution/glibc upgrade. Five unchanged,
checksum-pinned upstream v2.41 stable commits repair descriptor close-on-exec,
restricted source-path pinning, and failed-helper post-hooks. Debian already
includes the other two relevant path-handling changes. A compile-only
`fileutils.h` include is required by the cherry-pick; DHI's `CVE-2026-53615`
libblkid offset-widening patch is retained so Penpot does not regress.

Deployed at **05:33 UTC**: all 21 images / 27 roles / 17 projects passed their
exact-image health gates. The subsequent 59 status and 105 catalogue endpoint
checks passed. Penpot's synthetic PNG/JPEG/WebP thumbnails and native font
TTF/OTF/WOFF/WOFF2 round trips pass as its non-root user with networking disabled.

The genuine non-root upstream suite reports **337 tests**, including **160
skipped** and **8 known-failure lines**. Those are not 337 independently passed
operations. Six isolated old/new controls reproduce the original failed-helper
mode change and inherited descriptor, verify both repairs, and preserve the
successful-helper behavior. The cgroup descriptor fixture simulates only entry
into its existing namespace and redirects the test write to a temporary file;
it never changes a host cgroup or performs a privileged mount. Restricted-source
pinning is source-reviewed, not a claimed adversarial kernel race test.

All 21 candidates preserve application files, configuration, SUID/SGID surface,
unrelated libraries and the existing five-library ABI. Penpot backend additionally
requires repairing **two private ImageMagick loader copies**, with separate ABI
checks. Its initially failing native regression caught those copies; the final
candidate passes. No test shim or fixture helper is shipped inside an image.

Recipes: `build-util-linux.sh`, `build-util-linux-fixtures.sh`,
`util-linux-stage.mjs`, `util-linux-regression.mjs`, and
`cache-release.mjs prepare/apply --util-linux`. Exact 21-image / 27-role pins,
same-namespace companions, 17 project health gates and rollback are retained in
private `util-linux-release.json`. Check its completed state before making a
deployment claim. Source is published additively using
`publish-libraries.mjs --util-linux --publish`, never replacing an earlier offer.

`util-linux-host.mjs prepare/apply` updates only the 14 already-installed sibling
packages, preserving six library ABIs, configuration, libc, and Docker/SSH PIDs.
Signed original packages are retained under private `rollback/util-linux/`.
Two early APT attempts rejected an epoch-bearing local archive path before
installation; rollback verification passed. Allowing APT's normal **local-file
acquisition** after an exact-family simulation fixed this; no additional package
or distribution was selected. The host installation now passes native read-only
checks. Old resident host mappings still require refresh/reboot; disk payload
verification alone does **not** clear those library findings.
The system manager was re-executed and journald, timesyncd, udevd and logind
refreshed successfully, without restarting Docker or SSH. Three remaining
network/user-session/PAM processes are explicitly recorded in private
`util-linux-host-refresh.json`; they were not interrupted to clear a report.

Rollback: use the private receipt's exact previous image scalars and the existing
project supervisor (especially shared-namespace/firewall stacks), then repeat the
old-image readiness gate. For host packages, use the receipt's signed local
`prior` archives with APT `--allow-downgrades --no-install-recommends` and preserve
conffiles. No user data restore or deletion is part of either rollback.

`review-util-linux.mjs` requires the completed release, exact live package bytes,
native controls and explicit patch/primary-vendor evidence. Host library reviews
fail closed while older mapped libraries remain. Component exclusions are
separate from fixes: the >=2.42 subdirectory path and >=2.40 cgroup feature must
not be attributed to older branches that lack them. Raw findings remain intact.

Published source: `security-util-linux-followup-20261012-source.tar.gz`,
9,700,659 bytes, HTTPS-verified SHA-256
`153528327896a9c841956fe6eb5b65b062b611321eaac2dbe1510657bf1999db`.
The 05:36:20 scan covers 109 images, 175 containers, 55 source manifests and
host packages. Raw 40 critical / 2,697 high; exact individual reviews leave
0 critical / 563 high pending. This is not a security clearance.

Related maintenance repair: Spliit's scheduled backup verifier raced the image's
temporary bootstrap PostgreSQL socket. It now uses loopback TCP readiness and the
same repaired image as production, with network isolation, no fixture logging,
and a maintenance-only name. Both its failed snapshot and a fresh scheduled
snapshot passed isolated native restore. No production database was restored.

Primary references checked 12 October:
[stable branch changes](https://github.com/util-linux/util-linux/compare/v2.41.5...v2.41.6),
[failed-helper advisory](https://github.com/util-linux/util-linux/security/advisories/GHSA-m25x-3hj9-m26f),
[descriptor advisory](https://github.com/util-linux/util-linux/security/advisories/GHSA-55fx-f4gg-cfhj).

### Gathio's rsync utility

Deployed 12 October, 04:45 UTC: Gathio's PostgreSQL/DocumentDB image now has
`rsync 3.5.1+ds1-1~deb12u1+utilibre1`, built from authenticated Debian 3.5.1
source against native Bookworm dependencies. Only the Debian changelog is
changed; upstream code, application files, all shared-library bytes and resolved
runtime configuration are preserved. No public rsync daemon is enabled.

The upstream default suite reports **306 passed / 54 skipped**, including
platform and separate TCP-mode skips; these are not claimed as passed. Isolated
non-root checks additionally verify incremental copy, safe symlinks, bounded
synthetic deletion, loopback daemon retrieval and read-only upload denial.
Fresh PostgreSQL XML/PostGIS/DocumentDB role isolation and dump/restore pass.
The live public Gathio check created, viewed, exported and deleted only its own
fictional event. No existing event or production restore was touched.

Recipes: `build-rsync.sh`, `rsync-stage.mjs`, `rsync-native.sh`,
`../xml-final/check-gathio.mjs --rsync-followup`, then
`cache-release.mjs prepare/apply --rsync`. Exact old/new pins and readiness are
in the private `rsync-release.json`; rollback changes only that recorded image.
Matching source and notices are published separately with
`publish-libraries.mjs --rsync --publish`. `review-rsync.mjs` verifies installed
code against the built package and current Debian fixed-version records before
proposing expiring individual findings. The base distribution's older version
range remains in raw scanner output.

Sources checked 12 October:
[rsync upstream](https://rsync.samba.org/),
[Debian security tracker](https://security-tracker.debian.org/tracker/source-package/rsync).

### Terminal utility repair

Deployed on 12 October: `ncurses-bin 6.5+20250216-2+dhi4` (authenticated
Trixie DHI package) and `6.4-4+utilibre1` (native Bookworm backport) across
28 images / 34 roles in 22 existing projects. The host uses the same repaired
Trixie CLI package. Application/configuration fingerprints and all shared-library
fingerprints are unchanged; no tinfo/libc upgrade, daemon addition, access change
or user-data operation. Every released role passes its exact-image/native health
gate; the existing firewall supervisors are reused where needed.

The identical synthetic long-CSI fixture makes both original Debian 12/13
`infocmp -i` binaries abort with a detected buffer overflow. Both repaired
binaries pass, as do terminal export/compile/reopen, capability and ELF-import
checks. Containers have no external network and core dumps are disabled. The
initial test omitted `tic -x`, losing extended capabilities during round-trip;
that failed rehearsal is retained, not counted as a pass. Compilation itself
completed, and the exact retained Bookworm package passed the corrected gates.
The two existing Penpot DHI frontend/exporter images already contained the
repaired CLI and were not replaced for this issue.

Evidence: `ncurses-stage.mjs`, `ncurses-native.sh`, `ncurses-regression.mjs`,
`ncurses-host.mjs`, and `cache-release.mjs prepare/apply --ncurses`. Private
receipts are `ncurses-release.json`, `ncurses-host.json`, and
`ncurses-regression.json`. `review-ncurses.mjs` checks live shipped bytes and
symlinks against the exact package before proposing any expiring finding review.
The 64 focused release/advisory/payload-review tests pass. Application advisory
IDs and ranges are unchanged; rebinding only follows passed image/configuration
parity. Fresh scanning is required after this release.

Sources checked 12 October:
[upstream fix](https://invisible-island.net/ncurses/NEWS.html#index-t20251213),
[Debian component attribution](https://security-tracker.debian.org/tracker/CVE-2025-69720),
and [pinned DHI packaging](https://github.com/docker-hardened-images/catalog/tree/a399ba8b3297ee5f29c05f9a1d2068743eaae797/package/deb/main/ncurses).
An additive source offer is produced by `publish-ncurses.mjs --publish`;
earlier archives remain immutable. Roll back only the old image pin in the
release receipt, or the retained original host CLI package. Never restore or
delete user volumes for a command-line dependency rollback.

### Cache, HTTP server and Bookworm XML follow-up

Deployed on 12 October, 03:32–04:10 UTC:

- `http-cache-semantics 4.3.0` in 19 images/20 roles, with one unchanged
  network-namespace companion restarted through its existing supervisor.
  Registry integrity, full application-file manifests and image configuration
  are checked; only the exact dependency paths change. Existing 4.3.0 copies
  are retained. Every image passes fresh/stale/private/no-store/auth/Vary/ETag
  contracts and native npm cache/lifecycle/pack tests without external access.
  Kuma additionally passes fresh setup/authenticated Socket.IO, RSSHub its
  native health route, and Actual its Chromium account/budget/ZIP export/import,
  reload and server-sync download journey. These are synthetic checks, not
  another exhaustive test of every unchanged application.
- Actual's npm built-in configuration now disables update-notifier, audit and
  fund. No other runtime configuration changes, and no analytics added.
- FreshRSS uses authenticated Debian Apache `2.4.69-1`, PCRE2 `10.48-3.1`
  and coexisting `libxml2-16 2.15.4+dfsg-1`. PHP's old libxml2 ABI and the
  Expat repair are preserved. Complete FreshRSS/Apache/PHP configuration-file
  parity, ELF/regex/XML, fictional account/feed/article/OPML and actual Apache
  login-page checks passed. Existing no-request-log startup is exercised.
- RSS-Bridge and the Gathio DocumentDB/PostgreSQL image now use native Bookworm
  `libxml2 2.9.14+dfsg-1.3~deb12u6+utilibre2`, preserving its earlier entity fix
  and adding the same nine checksum-pinned DHI/upstream backports as the Trixie
  build. No foreign ABI is substituted. Upstream suites report 3,360 parsing
  tests and 280,912 generated API checks without errors; separate native header,
  symbol, PHP DOM/XPath/SimpleXML, PostgreSQL XML/PostGIS and DocumentDB
  permission/dump/restore checks pass. Both exact live images are healthy.

Important: **4.3.0 is not a demonstrated fix for CVE-2026-93748.** Its disputed
`max-stale`/`Set-Cookie` behavior still reproduces in the recorded native test.
The maintainer disputes that advisory; its disappearing scanner version match
must not be interpreted as remediation. The runtime-consumer exposure review
remains open. The separate Vary-wildcard fix (CVE-2026-93750) is verified.
Sources checked 12 October:
[upstream discussion](https://github.com/kornelski/http-cache-semantics/issues/56),
[advisory correction request](https://github.com/github/advisory-database/issues/10139),
[Apache security notes](https://httpd.apache.org/security/vulnerabilities_24.html),
and the pinned XML patch manifest in `../native-final/libxml-dhi-patches.sha256`.

Recipes and receipts: `cache-specs.json`, `cache-build.mjs`, `cache-check.mjs`,
`cache-release.mjs`; `apache-stage.mjs`, `apache-check.mjs`, `release-expat.mjs
prepare/apply --apache`; `../xml-final/build-bookworm.sh --security-followup`,
`build.mjs`, `check.mjs`, `check-gathio.mjs` with `--security-followup`, followed
by `release-expat.mjs prepare/apply --bookworm`. Never overwrite passed receipts
or move candidate tags. Rollback restores only the receipt's old image pin;
user volumes, firewall and configuration remain unchanged.

The 64 focused release, payload-review, source-pin and advisory-identity tests
pass. The 112-provider application-advisory check has no unresolved published
application advisories at 04:06 UTC; this is separate from OS/dependency work.
The manual GitHub external check `38202599557` passed. No genuine scheduled
run from the replacement workflow has yet been observed; its alert stays open.

The original native source addendum remains immutable. Updated recipes and
the additional Bookworm source package are published separately; do not rerun
the original publisher over its already-published archive.

Checked 12 October 2026:

- [Debian Expat tracker](https://security-tracker.debian.org/tracker/source-package/expat)
  and [Vim tracker](https://security-tracker.debian.org/tracker/source-package/vim).
- [Python system Expat configuration](https://docs.python.org/3/using/configure.html#cmdoption-with-system-expat).
  Source versions are pinned in `build-pyexpat.mjs`; no new interpreter is built.
- Debian package/source indexes were verified using the Debian archive keyring
  in an **isolated APT directory**. `review.sources` was not installed in the
  host's APT configuration. No sid distribution upgrade or libc replacement.
- [Linux CNA records](https://github.com/CVEProject/cvelistV5/tree/20d9248c60fe62803efade3177e8b82b586d154c)
  provide exact component paths for the separate header-only review. That review
  requires installed header inventories, rejects UAPI/ambiguous header paths,
  and never exempts the running VM or Proxmox kernel. Decisions expire in seven
  days and do not change raw scan results. Package presence is not exploit proof.

Private evidence directory:
`/var/lib/utilibre-maintenance/closure-followup-20261012/`.
It contains signed source/package artifacts, old packages, source checksums,
candidate/live results, preserved failed rehearsal logs and the exact release
receipt. Source publication is additive via `publish-source.mjs`; its receipt
is `source-offer.json`. No configuration secrets or user data enter the archive.

## Reproduction and recovery

Host release uses `release-host.mjs`, and BIND uses `build-bind.sh`,
`check-bind.py`, `release-bind.mjs`. The two host release rehearsals rolled back:
first a coupled Vim package-order constraint, then a pristine default vimrc
runtime-path transition. The final install allows only the packaged default
transition; custom configuration remains protected.

For application images: build the three pinned extensions with
`build-pyexpat.mjs`, then `stage-expat.mjs`, `check-expat-apps.mjs`, and
`release-expat.mjs prepare` / `apply`. Do not repeat preparation over an existing
receipt. The source addendum includes the libraries' complete upstream source,
modified BIND Debian packaging and these recipes; use the established integration
source archive for shared helpers and unchanged application source offers.

For a failed application release, restore **only** its recorded old image scalar
and recreate its listed role with the same Compose files/project/configuration.
Check identity and native health. Never overwrite data to roll back a library.
The release helper does this automatically on failed readiness. For host rollback,
hash-check the preserved coupled old packages and install them with configuration
preservation; run `dpkg --audit` and native checks. Restoring an old package restores
its old defects too. No partition, filesystem, kernel or backup policy changed.

Builds/tests are bounded and outside the request path; isolated synthetic tests
have no external network. The existing 8 GiB disk reserve is enforced before
image build/release. Browser/device coverage and existing kernel/provider gaps
are not expanded by these native-library checks.
