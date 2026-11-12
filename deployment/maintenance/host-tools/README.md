# Host maintenance tools — 12 November 2026

This extends the existing maintenance review, scanner, native Debian packaging
and Storage Box wrapper. It adds no scheduler or LLM dependency. Application
updates retain their separate compatibility and privacy gates.

## Active versions

| Component | Version and scope | Verification |
| --- | --- | --- |
| Node | 24.22.3; explicit paths in 15 installed units, 17 tracked templates/helpers | Official hashes; 75 offline tests; unit paths; repeated activation makes no changes |
| Trivy | 0.76.2; `/opt/utilibre/maintenance/bin/trivy` | Official hashes; identical normalized old/new scanner results on recorded inputs; exact binary advisory review |
| Python | 3.13.18-1~deb13u1+utilibre1; five native Debian packages, same 3.13 ABI | 2,630 upstream cases (59 skips); native APT/D-Bus/crypto/SQLite/venv checks; 690 installed payload hashes; clean dpkg audit |
| Restic | 0.19.1 rebuilt with reviewed Go dependencies; explicit binary in Storage Box wrapper | Native tests; old/new repository compatibility; local SFTP; real Storage Box archive restore and content comparison |
| GitHub CLI | 2.103.3+utilibre1; native host DEB, Go 1.27.4 and repaired native locks | Four upstream test packages, exact source-scope check, 162 embedded packages with no findings in the Nov 12 snapshot; native API read; repeated activation |

`versions.json` holds exact source, binary, lockfile and compiler identities.
Private evidence is under `/var/lib/utilibre-maintenance/host-tools-20261112/`.
All four `*-release.json` receipts and `gh-followup/release.json` passed. Historical tests are not current
security clearance; byte-identical rebuilds have not been demonstrated.

Node's [security release](https://nodejs.org/en/blog/release/v24.22.3) was
published 11 November. Python uses signed Debian 3.13.18-1 source rebuilt with
Trixie dependencies; no sid runtime packages or libc changes. An earlier attempt
with 3.13.15 packaging failed exact patch preconditions and was discarded. The
successful build uses the newer native Debian packaging without local source
patches. Docker and SSH kept their process IDs; no VM restart occurred.
Two resident Python helpers (TURN certificate challenge serving and unattended
upgrade shutdown coordination) were refreshed after checking for active jobs.
Their executable hashes and the local challenge response were verified;
`python-resident-refresh.json` records the result. No relay or application
container was restarted for this interpreter change.

The official Restic binary had dependency findings and was not activated.
The accepted source uses Go 1.27.3 and exact native `restic/go.mod` / `go.sum`
updates. Its CLI reports `0.19.1`; identify our build by its SHA-256. No encryption
or repository-format patch was made. `/usr/bin/restic` 0.18.0 is retained, so
an unqualified shell command may still select it. Production backups explicitly
use `/opt/utilibre/maintenance/bin/restic`.

Trivy's raw embedded-module result includes UNKNOWN GO-2026-5932 for
`golang.org/x/crypto`. At the pinned binary, module/source and function-path
evidence show maintained ProtonMail OpenPGP, not affected `x/crypto/openpgp`.
`trivy-advisory-review.json` records the narrow operator review, expiry and
identities. Changed binary/advisory evidence requires review again. Raw findings
remain. Five repository-published Trivy advisories also have binary-bound
reviews in `../advisory-reviews.json`. Neither establishes absence of historical
compromise nor approves another binary.

The refreshed 12 November database introduced new Git, kernel-header, Mongoose
and Go-library observations. The earlier 10 November snapshots in the four
preparation receipts remain historical comparisons. The host Python review
revalidated all five rebuilt packages and 690 installed files, then recorded
25 exact, seven-day mitigated decisions through the existing operator triage
process. It did not remove raw findings. See the
[source/payload record](../../../docs/records/host-python-review-2026-11-12.md).

The [GitHub CLI follow-up](github-cli/README.md) fixes its newly observed x/net
and Go standard-library findings. Upstream CLI telemetry was enabled in native
configuration; it is now disabled there and explicitly disabled in 16 tracked
unit templates and maintenance child processes. The daily review checks that
configuration and alerts on drift. Earlier telemetry transmissions were not
inspected. These settings affect maintenance, not visitor measurement.

## Preparation and checks

Replay on a disposable host with retained source archives and compiler images.
Scripts use one private evidence layout and reject existing outputs. Restore
inputs to that layout on the isolated stage; do not overwrite completed proofs.
Git does not contain compiler images, source archives or DEBs.

- `build-restic.sh download`: pinned source and locked Go modules; no production
  data, credentials or Docker socket in the compiler. Its `build` phase compiles
  and runs native package tests with networking disabled and no resolution.
- `build-python.sh prepare`: verifies three Debian source hashes and extracts
  them in the frozen compiler image without network access. `build` creates
  native packages and runs five compatibility modules, using two CPUs, 5 GiB
  RAM and bounded tmpfs. A separate clean offline preparation was exercised
  after the successful build; a second byte-identical build was not performed.
  Date-bearing Debian build/changelog metadata is not normalized.

On the isolated stage, these ordinary checks need no network:

```sh
unshare --net env -i PATH=/root/.nvm/versions/node/v24.22.3/bin:/usr/bin:/bin \
  node --test scripts/review-upstream-maintenance.test.mjs \
  deployment/maintenance/maintenance.test.mjs
unshare --net /usr/bin/python3 -B deployment/maintenance/host-tools/check-python.py
unshare --net /root/.nvm/versions/node/v24.22.3/bin/node \
  deployment/maintenance/host-tools/check-restic.mjs
```

Restic's fixture creates synthetic repositories only. It tests format-2 reads in
both directions, Unicode/content/modes, a relative symlink, empty directory and
temporary-file exclusion. SFTP uses a local OpenSSH subprocess. Actual remote
transport was checked separately: `modules-restore.json` records a
2,155,635,508-byte compiler archive restored from Storage Box, SHA-256 checked
and compared against the original trees. This is not a whole-VM recovery test.

## Explicit activation and rollback

These are state-changing release commands, never default audit steps:

```sh
node deployment/maintenance/host-tools/release.mjs node
node deployment/maintenance/host-tools/release.mjs trivy
node deployment/maintenance/host-tools/release.mjs restic
node deployment/maintenance/host-tools/release-python.mjs prepare
node deployment/maintenance/host-tools/release-python.mjs apply
```

They require recorded predecessors, exact candidates and successful evidence.
Repeated activation verifies installed state without reinstall/restart. Python
also compares its complete installed payload manifest. Node reloads systemd
definitions only; running jobs are not restarted. Later inputs need new review.

Rollback requires an operator and retained artifacts:

- **Node:** restore exact unit/template files from `node-unit-backups/`, preserving
  unit symlinks, then `systemctl daemon-reload`. Node 24.14.0 remains installed.
- **Trivy:** atomically restore the retained `trivy-sha256-<previousBinarySha256>`
  beside the active binary after verifying its recorded hash/version.
- **Restic:** restore `restic-wrapper-before.sh` to the backup wrapper. The old
  `/usr/bin/restic` remains; old/new format-2 reads passed synthetic checks.
- **Python:** restore all five retained 3.13.16 DEBs together from
  `/var/lib/utilibre-maintenance/closure-followup-20261012/python-system/build`.
  Verify recorded hashes, simulate APT and repeat dpkg/native checks after
  installing. No migration or user-data rollback is implied.
- **GitHub CLI:** follow the exact native DEB rollback in
  [its runbook](github-cli/README.md); retain disabled telemetry.

## Recurring coverage

The existing daily `utilibre-maintenance-review.timer` includes all five tools
through `operational-providers.json`. It reads installed versions and hashes.
Node stays on approved 24.x, Python on 3.13.x. Python uses stable upstream Git
tags because CPython does not publish GitHub Releases. Missing or ambiguous
output fails review. Checks report candidates, require no LLM, and do not approve
arbitrary upgrades.

The existing security job additionally scans only the three named Go executables
in `runtime-artifacts.json`: Trivy, configured Restic and GitHub CLI. It retains
their hashes and embedded dependency inventory. Missing inventory/tool failure
is not a pass. Python remains in the host package inventory. Unmanaged Node has
vendor/version review, not a claimed complete native-library SBOM. Separate
Caddy and Proxmox hosts are outside this VM scan.

## Cache recovery and remaining limits

Only cold reconstructible build caches were removed locally. No saved account
work, backup history, source, lockfile, release output or rollback image was
pruned. Existing encrypted Restic snapshots hold:

- `445aa12f53cb54d6125dfc3690029b5c4d548f01c682dc093bbee1a2308066f3`:
  two original compressed Go caches, restored and SHA-256 checked.
- `e35ab442988272c8b88f536ba7344bb2c7c5a160d73e61c1880ad69ec8b7a856`:
  six completed module-source caches, restored, hash checked and compared against
  originals before exact-path local removal.

Private `archive-receipt.json`, `modules-cleanup.json` and the original
`security-20261028/GO_MODULE_CACHE_ARCHIVED_20261112.json` give recovery paths.
Use the existing Storage Box wrapper to restore the named snapshot into a new
stage, verify the recorded archive hash, then extract only the needed build
cache. Never overwrite application paths. The tag is
`maintenance-build-archives-20261112`; existing `native-app-snapshots` retention
does not prune these. No new retention schedule was added.

After removing the two completed disposable Python compiler containers, the VM
had about 14 GiB disk free and 22 GiB available RAM. These are point-in-time
measurements, not capacity guarantees. Disk remains constrained. The held
application matrix and 30 ACL high records are separate unfinished work;
these host updates do not resolve them. The latest assessment and the 12 November
release follow-ups identify new findings separately; do not read the 30 ACL
records as the complete current security queue.
