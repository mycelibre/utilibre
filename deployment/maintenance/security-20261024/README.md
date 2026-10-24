# Critical dependency follow-up — 24 October 2026

This batch keeps application versions, existing privacy fixes, frontend assets,
access controls and user data. It extends the PHP and Go maintenance procedures;
there is no new scheduler, automatic deployment or LLM dependency.

The starting complete scan (10:22 UTC) had 37 critical records requiring review:
30 PHP records in DeGoog, six Echo records across Vikunja/Opengist and their
source locks, and one already-fixed host PyJWT match. Records repeat advisories
across packages and source/runtime targets. They are not confirmed exploits.

## Deployed result

All three releases passed their exact-image, native-health and public-route gates.
The 15:45 UTC fleet recheck completed for **109 runtime images / 175 containers,
58 source inventories and 508 host packages**, using the same advisory database
as the baseline. Awaiting-review records fell from **37 to 0 critical** and
**443 to 382 high**. The remaining high records represent 92 advisory IDs and
remain open. Raw results still contain 62 critical and 3,281 high records;
existing exact-artifact not-affected/mitigated decisions explain the difference.
Neither a reviewed count nor a raw count establishes exploitability or a fleet
security clearance. See [the machine-readable checkpoint](status.json).

The 82 targeted maintenance tests pass. Both old Echo versions fail the intended
regression assertion; both fixed versions pass. Isolated native workflows and
unchanged frontend bytes passed for both Go applications. Repeating their build
commands reused the exact compiled outputs. Reapplying all three passed releases
left container IDs, start times and images unchanged. Vikunja's final lock patch
was reconstructed again from the declared upstream commit after the chi update.

Complete Opengist and Vikunja source archives were checked by public HTTPS and
SHA-256 at the existing `tools.utilibre.org/utilibre-source/` paths. DeGoog's
existing source archive now also includes its PHP repair inputs and checks.
No user-data migration, retention change or access-policy change was made.

## Changes and evidence

- DeGoog: signed Alpine 3.22 PHP **8.4.27-r0** replaces 8.4.16-r0. All five
  installed PHP packages change together; unrelated packages, application files
  and image configuration are compared with the exact predecessor. The native
  homepage and PHP bridge run with synthetic data and no network. Its existing
  public gateway and restrictions remain unchanged. This extends
  [the PHP procedure](../php-20261022/README.md), including a separately selected
  same-database baseline for assessment.
- Opengist **1.15.2** and Vikunja **2.7.0**: Echo **4.16.1**, and additionally
  **5.4.1** for Vikunja, replace the affected versions. Both use Go **1.27.3**,
  compress **1.18.7** and chi **5.4.0**. The chi finding blocked an intermediate
  candidate; it was fixed before release, not waived. Only the native application
  binary changes in each runtime image. Complete filesystem comparison and
  extracted embedded-asset comparison verify this.
- Host PyJWT **2.15.1-1**: retained signed package bytes and the existing isolated
  PEM/HMAC regression establish that CVE-2026-102268 is already fixed. A fresh
  seven-day exact-finding review replaces the expired decision. No package is
  reinstalled just to change the scanner count.

Echo's upstream MIT-licensed `TestProxyRejectedUpgradeKeepsRouting` is reused
without rewriting its assertions. It fails for the intended 403-versus-200
access-control defect on 4.15.4 and 5.3.1, and passes on 4.16.1 and 5.4.1.
Tests use an isolated network namespace and fictional loopback servers.
Legitimate upgrade/HTTP behavior is also covered by the upstream middleware
suite in each application build.

Existing native application checks cover two accounts, private-access denial,
Git/API edits and ZIP export for Opengist; task/attachment persistence,
export/import, other-account denial and synthetic SQLite restore for Vikunja.
Production OIDC and physical/mobile browsers are not newly certified by these
tests. No production accounts or documents are used.

## Rebuild, verify and activate separately

Inputs and private evidence live under
`/var/lib/utilibre-maintenance/security-20261024/`. PHP evidence remains under
`/var/lib/utilibre-maintenance/php-20261022/degoog/`. Exact original image IDs,
source commits and compiler image ID are in [images.json](images.json).
Current source locks and reconstructable patches remain in `go-leaf-final`;
use this batch for current builds. For historical October 11 replay, use that
Git revision's matching scripts and locks, not today's files with old receipts.

```sh
node deployment/maintenance/security-20261024/go.mjs opengist resolve
node deployment/maintenance/security-20261024/go.mjs opengist build
node deployment/maintenance/security-20261024/go.mjs opengist stage
```

Repeat for `vikunja`. `resolve` downloads only the reviewed lock inputs through
Go's checksum mechanism. `build` has networking disabled and uses a read-only
module cache; it retains compiler/native-test output privately. Existing exact
compiled results are checked before reuse. Unsupported source revisions,
changed locks, application-file changes and failed native checks are rejected.
Compilation is limited to two CPUs, 4 GiB RAM and 256 processes per application;
the eight-GiB disk reserve remains mandatory. These limits are build budgets,
not public-service capacity claims.

The compiler uses the official `go1.27.3.linux-amd64.tar.gz`, SHA-256
`65efbc80fdc1fa2cd2631cad5b481777a68e8725f34e89f50fc6ac714e379b40`.
The exact local compiler image must be retained. Rebuilding that image using
new package repositories is a newly reviewed input, not an identical replay.
Byte-for-byte reproducible builds are not claimed.

Use the existing `go-leaf-final` verification scripts with `--candidate`,
`--output-dir`, `--image-id`, `--binary` and `--output` to keep this batch's
reports separate. `echo-regression.mjs download` prepares pinned fixture
dependencies; `check` runs without a network. `collect.mjs APPLICATION` requires
the matching scan/parity, native workflow, embedded assets and Echo regression
proofs before creating the existing release interface's receipts.

Explicit activation remains:

```sh
node deployment/maintenance/go-leaf-final/release.mjs --batch=security-20261024 prepare opengist vikunja
node deployment/maintenance/go-leaf-final/release.mjs --batch=security-20261024 apply opengist vikunja
```

Preparation records the old/new exact images and configuration hashes. Activation
uses only the named Compose services, never pulls/builds or migrates data, checks
native health plus public routes, and restores the previous image on failure.
Reapplying a passed release verifies the current state without a restart.
Matching complete source archives use the existing public filenames and preserve
the previous archives privately. Publish with `go-leaf-final/publish-source.mjs
--batch=security-20261024 --publish APPLICATION`, then run `check-public-source.py`
with the same batch selector. The ordinary integration archive contains the
committed recipe and configuration changes.

For an emergency rollback, use the exact `oldRef` in the selected private release
row, preserve its unchanged Compose settings, and recreate only that service
with `--no-deps --no-build --pull never`. Verify native health and the recorded
public route, then restore the matching previous source archive. No database
rollback is required by this binary-only release. Rolling back reintroduces
the dependency defects; it is emergency functional recovery, not a security fix.

## Assessment boundaries

The existing scanner can explicitly reuse its current advisory database with
`run({refreshDatabase:false})`; scheduled/default runs still refresh it.
The 48-hour data-freshness check remains active. Candidate comparisons use the
same database as the baseline. Raw findings, unknown advisories and remaining
high-severity records are preserved. Separate Caddy/Proxmox hosts, writable
container layers, user data and incomplete browser-bundle inventories remain
outside the documented scan coverage.

Source reconstruction was checked across all 89 current patch sequences. The
two changed Go replay records were updated and individually verified; four
pre-existing stale records in the unrelated, uncommitted replay work were left
untouched. Source reconstruction alone is not application/security clearance.

Primary references checked on 24 October:
[Echo advisory](https://github.com/labstack/echo/security/advisories/GHSA-cxf3-9h37-7rr8),
[Alpine PHP package](https://pkgs.alpinelinux.org/package/v3.22/community/x86_64/php84),
[PHP release](https://www.php.net/archive/2026.php#2026-10-21-5),
[Debian PyJWT](https://security-tracker.debian.org/tracker/CVE-2026-102268),
[Go downloads](https://go.dev/dl/).
