# 14 November native security repairs

Finite additions to the existing maintenance scripts, not a new updater. See
[the release record](../../../docs/records/security-2026-11-14.md) and `status.json`
for the observed state. Private evidence is under
`/var/lib/utilibre-maintenance/security-20261114/`.

## Inputs and preparation

* `inputs.json`: signed Debian/Alpine Apache, libpq and Node packages.
  `acquire.py`, `prepare-debian.py` and `prepare-alpine.py` retain the existing
  acquisition, strict package scope, ABI and native consumer mechanisms.
* `python-inputs.json`: exact dnspython 2.9.2 (ISC) and soupsieve 4.0.1 (MIT)
  upstream wheels. `prepare-python.py` uses offline pip with no dependency
  solving; full image parity outside those distributions is mandatory.
* `headers-inputs.json`: native Debian/Ubuntu UAPI packages. These are not
  running-kernel updates. `check-headers.py` compiles ordinary UAPI consumers.
* `xserver-inputs.json`, `xserver-source-inputs.json`: authenticated Xserver
  sources, seven exact upstream patches, and one explicitly pinned DHI context
  adaptation. `prepare-xserver-source.py check|prepare`, `build-xserver.py
  host dhi`, `prepare-xserver.py`, `check-xserver.py` and
  `assess-xserver.py` preserve MAXSCREENS=1 and previous vendor/local fixes.
* Git 2.54.1, GPL-2.0-only: upstream archive SHA256
  `ca988eb9af7d8770339df7cdc38106fec8244664ff886840767cb9be3ef0e16c`.
  `build-git.py`, `package-git.py`, `package-git-dhi.py`, `prepare-git.py` and
  `check-git-apps.py` rebuild native executables and test their consumers.
  DHI keeps its native dependency declaration; no optional git-man dependency
  is introduced. Existing manual packages remain documentation, not old Git
  executables. `git-inputs.json` pins the resulting packages/images.
* QEMU 11.1.2 Debian backport, GPL-2.0: `build-qemu.py` adds only upstream
  websocket bounds repair `68df2cefcfe6eb3df4c0531cea4d9125742bc9df`.
  `check-qemu-tools.py` tests all four rebuilt block tools. Guest agent,
  emulator/hypervisor and Proxmox packages are outside this release.
  `qemu-qmp-input.json` identifies the build-time wheel and included licenses.
* `compiler-inputs.json` records all four native compiler layers and every
  authenticated DEB. `replay-compiler.py check NAME` verifies archived inputs;
  `build NAME` prepares an offline disposable compiler. No host installation,
  moving dependency resolution, production mounts or container socket inside
  the builder. Existing downloads remain a separate explicit action.

Preparers refuse unexpected baselines and existing output directories. Preserve
completed runs instead of overwriting their evidence. A reconstructed artifact
must be retested and approved by its **new digest**; byte-identical builds have
not been established. Required previous source archives and shared recipes are
in the existing source offers and committed integration archive. Complete Git,
QEMU and both Xserver source inputs plus these recipes are additionally offered
in `security-native-20261114-source.tar.gz`. Upstream notices remain intact.

## Assessment and release

`scan.py [--python|--headers|--git] KEY` runs the existing Trivy offline, in a
network namespace, with the frozen 14 November database. Database SHA256:
`56cee031199d053394380bdc3be3d1c0fd6198054811001d66ebf7028a44a882`.
No ignore file, changing rule pack, severity filter or VEX suppression is used.
Native behavior and a complete package/image scope check are separate gates.
The Git mode retains the actual raw backport findings for explicit review;
it does not pretend the Debian version matcher recognizes upstream 2.54.1.

Releases reuse the Compose/rollback/relay-idle gates in `language-final` and
`security-20261109`. `release-libraries.mjs [--python|--headers|--git]
check|apply|verify KEY` requires exact candidate, scan and application receipts.
`apply` is a production action; check and verify are not activation. Host Git,
headers, Xvfb and QEMU have separate narrowly scoped release scripts. Do not
use them on a different host or to upgrade another version by editing a tag.
Completed release receipts are registered in `followup-overlays.mjs`, which
records lineage only and never grants a security exemption.

Full-fleet verification calls `security-review.mjs` with
`run({refreshDatabase:false})`, then `build-queue.mjs`. No notification command
is part of this sequence. `check-retained.py` compares every before/final image
file. `review-retained.mjs` carries only exact unexpired previous decisions,
without extending expiry or accepting changed packages. `review-native.mjs`
and the existing header reviewers prepare bounded, exact installed-payload
reviews. Review drafts are applied through the existing `triage.mjs
record-batch` interface; raw findings stay visible.

The new native reviews expire after seven days. Archived replay is not current
clearance: release requires advisory data under 48 hours and application
evidence under 24 hours. Refreshed advisory data needs deliberate reassessment.

## PrivateBin updater continuity

`reconcile-privatebin.py` records only the deployed libpq repair and its exact
native/browser/scan/full-image evidence in the existing updater policy. The
three application payload hashes and all privacy/configuration hashes remain
unchanged. Run the existing `scripts/privatebin-maintain.py --reconcile-runtime`
only after reviewing that policy. Repeating it is a no-op. The scheduled updater
uses this runtime for subsequent application builds, retaining the fix; it
continues to reject new advisories, mismatched inputs or failed behavior. Its
scanner pin is the already installed and verified Trivy 0.76.2 binary. Both
explicit reconciliation and the scheduled service passed without another
PrivateBin restart. No LLM is in the scheduled execution path.

## Kernel, rollback and remaining boundary

`prepare-kernel.py` validates the signed 6.12.117 native packages, boot format,
driver resolution and current GRUB syntax without installation. This closes no
running-kernel finding. `release-kernel.py --confirmed-window UTC_TIMESTAMP`
requires fresh operator confirmation of Proxmox console access and paused VM
management jobs. It installs only the two recorded kernel packages, retains
6.12.116 and checks boot files. It **never reboots automatically**. After a
separately authorized reboot, verify the running ABI, service health and guest
agent from Proxmox. Actual boot is not established by preparation checks.

Image rollback receipts retain exact previous pins. Application data, quotas,
retention and schema are unchanged; no data rollback is claimed. Host packages
retain exact old archives. Restoring the old kernel means selecting it in GRUB
through the console, not deleting the new package blindly. The ACL caller
migration issue remains open; see the release record before interpreting the
queue as full remediation.

## Focused checks

`python3 test_assessment_policy.py` tests candidate comparison boundaries,
unsupported versions/modes, changed advisories and retained raw findings.
Existing native/browser/ABI tests remain authoritative for application behavior.
No live exploits, public search queries, email or account-data tests are needed.

The focused offline checks passed: 8 new assessment-policy tests, 18 existing
PrivateBin updater tests, 21 triage/header tests and the existing overlay ancestry
tests. `publish-source.py prepare|publish` creates an explicit-source-only offer
with archive-member/hash verification; publication is a separate action and does
not restart any service. Existing source offers are preserved.
