# Native one-screen Xvfb restriction

Deployed by the parent maintainer on **12 October 2026**: host at
**18:40:38 UTC**, Penpot exporter at **18:40:45 UTC**. Both exact release receipts
passed, and a separate read-only check matched the actual live package payloads.
The host required no service restart; only the exporter container was recreated.
Backend, frontend, administration, database and cache containers stayed unchanged.
The fresh fleet scan/review is separate from these completed release checks.

## Scope and trade-off

[CVE-2023-5574](https://security-tracker.debian.org/tracker/CVE-2023-5574) remains
unfixed upstream, including Debian 21.1.25. Its documented prerequisite is two
protocol screens (Zaphod mode), with a pointer warped between screens during
reset/shutdown. Utilibre's automation and Penpot use one virtual screen.

Build the **native host and native DHI sources separately** with the upstream
supported `MAXSCREENS=1` definition. `AddScreen` refuses screen number 1 before
initialization. Xvfb exits unsuccessfully before readiness when asked to add it.
Xinerama's screen count comes only from `screenInfo.numScreens`; with one screen
it returns before the legacy PanoramiX extension registration. The separate
native RandR compatibility extension may still report the one current screen;
it does not register another protocol screen. This is a compiled prerequisite
restriction, **not a fix to the upstream use-after-free**. Multi-screen Xvfb
automation is deliberately unsupported until an upstream correction is tested.

| Target | Authenticated source | Candidate package | Binary SHA256 |
| --- | --- | --- | --- |
| Host | Debian `2:21.1.25-1` | `2:21.1.25-1+utilibre1` | `328bd9abc0b14d1abcea614618bbf109e5f79299e42ca532d78f584168dfc5d9` |
| Penpot exporter | DHI `2:21.1.16-1.3+deb13u4+dhi1` | `2:21.1.16-1.3+deb13u4+dhi1+utilibre1` | `620f43dd4999c7602e86730c208e2c78f0007170451669fb9220f1a0a32c4891` |

Only `/usr/bin/Xvfb` and its native package version/checksum metadata change.
`xserver-common`, other libraries, application payloads and service configuration
stay unchanged. Host and container executables are not interchangeable. Candidate
exporter image is `sha256:415f223b6b456bb5d39ad772b71ad379b21ef7bcb1c1607980f9a9dddf0264cf`,
based on `sha256:906460df3ab8b53623a5a3a5608f2d2c96e0afc0e493abacdc58a7e179596fcc`.

The native Debian rules' extension/dependency flags and hardening are retained.
Other X-server executables are not built. The one-screen constant exposes warnings
in unreachable multi-screen loops; only `-Wno-error=array-bounds` is added, keeping
those warnings visible. There is no `-Wno-array-bounds` or global warning downgrade.
`verify-source.mjs` checks bounds, Xinerama assignments, compiler flags, complete
vendor patches and retained prior fixes. Actual extension lists and dependency
SONAMEs must match the signed baseline.

## A rejected build exposed a proof defect

The DHI source archive contains its 48 vendor fixes in an **unapplied quilt
series**. Debian's supported recipe applies them with `dh --with quilt` before
building. An initial candidate omitted that series and was rejected by the prior
native XInput regression before any deployment. The rejected image/packaging
receipts remain under `rejected-unquilted-*` in the private work directory.

The older `patch --reverse --dry-run --batch` check could automatically fall back
to forward application and falsely pass. All four affected `xserver-followup`
paths now use forced reverse, zero fuzz; fresh DHI proof explicitly applies the
authenticated series first. A behavioral test requires an absent fix to fail.
The corrected candidate applies all 48 patches, and all three previous security
fixes now pass strict source and native compatibility gates. Original vendor
binaries were already fixed; historical receipts are not rewritten. The only
allowed old host recipe delta is the exact argument-only proof hardening, bound
back to its original recorded SHA256. Old source archives remain historical;
this new archive includes corrected recipes.

## Observed checks

- Both old binaries accept two protocol screens. Both new binaries reject a
  second screen before readiness with default, enabled and disabled Xinerama.
  Screen 1 alone and screen 254 are also refused; repeated screen 0 works.
- Each candidate survives 15 last-client reset cycles and pointer movements with
  exactly one protocol screen; Xinerama cannot expose a second physical screen.
- Previous malformed XKB-font and invalid XI2-modifier protections pass, as do
  valid requests and native pixel roundtrips. RandR exposes no providers: its
  prior fix is source/byte-proven, **not** an exercised provider mutation.
- Native Xvfb's selected upstream `make check`: 1 pass, 1 skipped Piglit check,
  0 failures per build. This is not the complete Xorg DDX test suite.
- Headed Chromium 151.0.7922.34 on the host candidate produced a PNG, reopened it
  at 640×480, and wrote a one-page PDF accepted by `qpdf --check`. Network namespace
  isolated; fictional content only. Separate protocol checks run as UID 65534.
- Corrected exporter passes the established isolated Penpot 2.18.3 two-account
  editing/save/reopen/native-import-export, account boundaries, membership,
  deletion and backend-media tests. Its actual PNG export succeeds; its actual
  PDF export reopens with qpdf, one page. All temporary accounts/data/containers
  are removed. Penpot uses headless Chromium; do not claim it starts Xvfb merely
  because the binary is in its image.
- All other `/opt`, `/usr`, `/etc` file bytes, modes/owners/symlinks, installed
  package versions and image configuration are preserved in the exporter.

Private evidence: `/var/lib/utilibre-maintenance/xvfb-single-screen-final-20261012/`.
No real account data, documents or access tokens belong in public evidence.

## Resources and reproduction

One isolated build container: 2 CPUs, 2 GiB memory/swap, 256 PIDs. Measured scratch
including its writable layer was 980,392,213 bytes after both builds. Enforced
scratch ceiling 2 GiB and root-free floor 8 GiB. Native binary packages are about
3.3 MB and 3.2 MB; no new runtime service or remote request is introduced.

Use the authenticated source preparation, dependencies, `build.mk` and `inner.sh`
under a fresh isolated work root. `run.mjs` enforces resource bounds. Apply the
whole vendor quilt series before autoreconf/configure; preserve native build
flags and run both source/native proof suites. The source offer includes original
archives/notices, vendor signatures/indexes, exact dependency versions, all
recipes, prior native fixtures and the corrected strict source-proof helpers.

## Guarded release and rollback

From repository root, parent maintainer only:

```sh
node deployment/maintenance/xvfb-single-screen-final/release-host.mjs prepare
node deployment/maintenance/xvfb-single-screen-final/release-exporter.mjs prepare
# Review both prepared receipts and source offer before applying, serially:
node deployment/maintenance/xvfb-single-screen-final/release-host.mjs apply
node deployment/maintenance/xvfb-single-screen-final/release-exporter.mjs apply
```

Host prepare refuses any active non-container Xvfb and requires apt simulation to
change only `xvfb`, exact original payload/dependency hashes, clean dpkg and stable
Docker/SSH PIDs. Apply reruns native tests unprivileged/network-isolated, protects
the custom package from unattended replacement and restores the signed original
package on failure. No host service, display, SSH, Docker or network restart.

Exporter prepare requires the exact reviewed base, image/config/source/native/app
proofs and current readiness. Apply changes only its image scalar and uses the
existing release/recovery helper; backend/frontend/admin/database/cache container
IDs and configuration must remain unchanged. No database migration or data restore.
Automatic rollback reinstates the exact original image scalar and readiness gate.
Both releases passed these gates; no rollback was needed.

Receipts are `host-release.json` and `release.json`. A prepared receipt is not a
completed release. Do not rerun prepare after completion or rewrite receipt hashes.
For a deliberate later rollback, retain the signed original host archive and
exact exporter base image, coordinate consumers, restore only the specific package
or image scalar, then repeat native/readiness gates; multi-screen exposure returns.

After the next fresh scan run `review.mjs`. Its four-CVE allowlist covers only the
compiled `xvfb` versions above and unchanged `xserver-common` siblings after exact
completed/live byte proof. The old host/DHI reviewers explicitly delegate those
new payloads; they do not pretend the rebuilt binary equals the old vendor hash.
No decisions are applied automatically by these scripts.

Public corresponding source:
`https://tools.utilibre.org/utilibre-source/security-xvfb-single-screen-20261012-r2-source.tar.gz`.
27,064,131 bytes; SHA256
`d591ed4237de3ac093e11392ea9a22156ed50099fff1ded160da9f9b9e564605`.
The complete HTTPS body matched locally. This archive contains the binary build
recipes, original sources, complete quilt series and strict patch-direction
checks. The current integration source additionally carries reviewer-only reason
length and completed-row binding tests added after packaging; no binary build
recipe or release-bound artifact changed. The parent updates the shared source
index; no new user-facing UI is needed.
