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
