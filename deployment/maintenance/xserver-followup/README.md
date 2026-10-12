# Xserver native security follow-up

Reviewed 12 October 2026. **Host release passed at 14:40:21 UTC.**
This is a two-package signed Debian update, not a distribution upgrade or a
replacement of Penpot's container image.

## Scope and evidence

Host baseline: `xvfb` and `xserver-common` **2:21.1.16-1.3+deb13u4**.
Installed release: **2:21.1.25-1** from authenticated Debian indexes. No host repository
was added. Both archives have only `control` and `md5sums` control members: no
maintainer scripts. All 13 regular/symlink package payloads are compared, including
documentation. The exact candidate and rollback archive hashes are pinned in
`host-policy.mjs`; complete corresponding source is retained privately alongside
the authenticated package/source indexes.

`acquire.sh` uses isolated signed APT indexes. `stage.mjs` checks archive hashes,
dependencies, and the exact upstream patches in the extracted source. The host
release helper repeats source verification in a fresh temporary extraction,
requires the current baseline to equal both rollback packages, and uses only
`dpkg --install` on the reviewed local pair. A simulation must name exactly those
two packages, without removals. Host libc remains **2.41-12+deb13u4**.

Verified upstream fixes:

- [CVE-2026-88812](https://security-tracker.debian.org/tracker/CVE-2026-88812):
  XKB error-path cleanup, commit `c724006ee76fb002add50fcb4d97e8c96c279f09`.
- [CVE-2026-93521](https://security-tracker.debian.org/tracker/CVE-2026-93521):
  RandR provider cleanup, commit `00ce692c7f6ea1900888a2a24aecf6cba5544ae1`.
- [CVE-2026-93523](https://security-tracker.debian.org/tracker/CVE-2026-93523):
  XInput modifier validation, commit `aa56160fa213d8767e7da0c076b5c8242703313b`.

The existing `native.mjs` protocol fixture is reused unchanged. The host helper
runs it as **nobody**, in a network namespace, with core dumps disabled. Each
fixture starts its own authenticated 320×240 display with TCP disabled and only
synthetic input. It never attaches to a user's display. It verifies an 8×8 pixel
round-trip and valid input, reproduces the old isolated XKB crash and invalid
modifier acceptance, and checks candidate rejection with the server still alive.

**Limit:** Xvfb exposes zero RandR providers; the provider-mutation defect is not
reproduced. The corresponding exact source fix and signed fixed package are the
evidence for that CVE. Do not describe it as a successful exploit regression test.

The release preserves the byte hashes of all **28** dynamically resolved
dependency libraries, every unrelated installed package version, Docker/SSH
service PIDs, and **17** unrelated files/symlinks in the inspected X11, APT source,
and XKB-cache directories. It refuses to start while a host Xvfb is running.
No existing cache or document is deleted. Temporary synthetic fixtures and copied
test runtimes are removed at the end. Disk floor: **8 GiB** available.

## Prepare, authorize, release

```sh
node --test deployment/maintenance/xserver-followup/host-policy.test.mjs
node deployment/maintenance/xserver-followup/release-host.mjs
# Only after review of the exact preparation receipt:
node deployment/maintenance/xserver-followup/release-host.mjs --apply
```

`--apply` requires an unchanged preparation less than 30 minutes old. It verifies
all installed candidate payloads, reruns the native fixture, checks preservation
and dpkg consistency, then refreshes the existing unattended-update blacklist.
Explicit `xvfb` and `xserver-common` entries in `protected-host-packages.json`
prevent an unattended replacement without revalidation. These guards do not
prevent an administrator deliberately replacing packages manually.

Private receipts are under
`/var/lib/utilibre-maintenance/xserver-followup-20261012/`:
`host-checks.json`, `host-release.json`, and (after a fresh scan)
`host-review.json`. A passed release receipt must never be overwritten. Run the
normal scanner after release, then `node deployment/maintenance/xserver-followup/review-host.mjs`.
The reviewer prepares seven-day, exact-host/version/CVE `mitigated` drafts only;
the parent-maintained explicit application gate owns ledger writes.

Rollback is automatic if a post-install gate fails: restore both pinned old
archives, require old versions and all old file hashes, and recheck unrelated
bytes, packages and service PIDs. A failed rollback is explicitly marked
`NOT VERIFIED` and requires operator action; it is never reported as success.
No Docker, SSH, network, or application restart is part of this release.

The actual release passed all these gates at **2026-10-12T14:40:21.323Z**.
The corresponding-source offer is
[`security-host-xserver-20261012-source.tar.gz`](https://tools.utilibre.org/utilibre-source/security-host-xserver-20261012-source.tar.gz):
complete unmodified Debian source, upstream notices, exact already-included
upstream fixes and the bounded test/release recipes. Publish with
`node deployment/maintenance/xserver-followup/publish-source.mjs --publish`;
the explicit allowlist excludes runtime receipts, X11 cookies and user data.
It does not republish the shared source index automatically.

## Container evidence and remaining scope

The earlier independent DHI inspection (`verify-dhi.mjs`, `dhi-proof.json`) found
Penpot exporter's installed **2:21.1.16-1.3+deb13u4+dhi1** already carried these
three exact backports. Complete authenticated package payload and native checks
passed. **This host release does not change Penpot.** Any image-based review must
recheck its exact currently deployed image and files after unrelated overlays.

`authenticate-dhi.mjs` now independently verifies the retained DHI InRelease
signature with the pinned vendor key and retrieves only its two hash-addressed
historical package/source indexes (8,520,227 compressed bytes). `review-dhi.mjs`
is then network-free: it freshly extracts the matching complete source, checks
all three zero-fuzz reverse patch applications and all **13** current package
payloads/symlinks, and compares the exact executable to the retained passed native
test receipt. It does not rerun protocol probes or mutate a running container.

This revalidation passed against exporter image `sha256:fe93a9ab72e125c36bed02c093e67b85cae0a0e4172750b009af620d23127393`
after the librsvg/TIFF overlay on 12 October. Six exact-key `mitigated` drafts
(two packages × three CVEs) are in private `dhi-review.json`, with complete
`dhi-review-evidence.json`. They are **not applied by this reviewer**. The shared
applier's separate `xserver-dhi-policy.mjs` permits only this role, package pair,
version and three CVEs; 19 focused tests cover malformed scope and native proof.
Run again after every new image/scan before the operator applies the drafts:

```sh
node deployment/maintenance/xserver-followup/authenticate-dhi.mjs
node deployment/maintenance/xserver-followup/review-dhi.mjs
node --test deployment/maintenance/closure-review/xserver-dhi-policy.test.mjs
```

Do not close the entire source package. In particular,
[CVE-2023-5574](https://security-tracker.debian.org/tracker/CVE-2023-5574) is still
listed as affected in 21.1.25; its Zaphod multi-screen path and the other 935xx
source-wide findings require separate component/source evidence. They are outside
the host reviewer's allowlist. Passing these fixtures is not a claim that Xserver
has no remaining vulnerabilities.
