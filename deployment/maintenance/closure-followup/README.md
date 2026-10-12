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

### In progress: stable util-linux repairs

`build-util-linux.sh` and `util-linux-inner.sh` prepare native Trixie packages,
not a host distribution upgrade. Five checksum-pinned upstream v2.41 stable
commits add descriptor close-on-exec, safe source-path pinning, and failed-helper
post-hook handling to the authenticated Debian 2.41.5 source. Debian already
contains the other two relevant path-handling changes. A build alone does not
authorize deployment: native tests, symbol/import compatibility, matching source
offer, application gates and exact rollback preparation are still required.
No util-linux candidate is deployed at this checkpoint.

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
