# PrivateBin guarded patch updates

The existing native PrivateBin tests, Docker/Compose deployment and systemd
scheduler now support unattended **stable 2.1.x application updates**. The user
requested this policy on 6 November 2026. This is not permission to replace the
patched PHP/nginx/Alpine runtime, change dependencies, or perform migrations.

Run from the repository with the existing Node 24 environment:

```sh
python3 scripts/privatebin-maintain.py --check
python3 scripts/privatebin-maintain.py --stage
python3 scripts/privatebin-maintain.py --apply
```

`--check` reads local identities and upstream release/advisory metadata. `--stage`
creates an isolated candidate and evidence only. Only `--apply` can recreate the
single `utilibre-services` PrivateBin service. Neither mode emails anyone, uses
an LLM, submits an instance listing or sends indexing notifications.

## Gates and preserved repairs

- Select the latest stable release from the official GitHub repository; require
  a GitHub-verified signed annotated tag, exact commit and bounded source archive.
  Record the archive hash. No prereleases, downgrades, redirects or unreviewed
  release family are accepted. The GitHub verification is not a separately
  performed offline GPG signature verification.
- Require unchanged licence, Composer manifests/lockfile, sample configuration contract
  and entrypoint; exact native-template patch application; and exact hashes of
  our non-secret mounted configuration. An incompatible patch stops; no fuzzy
  replacement, conflict resolution or new dependency resolution is attempted.
  The maintained template patch includes the bilingual abuse-report links on
  home and paste views. Its 9 November replay against the recorded 2.1.1 source
  produces the same template as the tested notice overlay. The canonical
  template and discovery helper now target that current source; do not restore
  the stale 2.1.0 template during later runtime rebuilds.
  The runtime pin was also advanced on 9 November to the exact tested deployed
  image `sha256:e6a3f0c563c225e055524197f59261f34a805e38d49e4c03c051dcfa19643d6f`.
  This preserves the later musl repair and reporting overlay in future candidates;
  it does not grant automatic permission to replace runtimes. Source contracts,
  configuration hashes, scan gates and isolated upgrade tests remain required.
- Preserve the reviewed runtime **and its vendor tree**, byte-for-byte at the
  package-inventory level. Only app PHP/templates/static files are replaced.
  This retains the later PHP, nginx, Alpine and library repairs. The source's
  bundled minimal vendor directory is not substituted for the deployed tree.
  The image carries the exact application source identity in
  `/usr/share/doc/privatebin/utilibre-release.json`; inherited OCI labels refer
  to the retained runtime and must not be used as the app version.
- Retain 25,000,000 raw attachment bytes, 35,000,000 request bytes, the one-week
  maximum, one-day default, disabled discussions, no logs, read-only container,
  resource limits and the separate temporary volume/1 GiB headroom check.
  Application data is neither copied into tests nor backed up by this updater.
- New or edited published application advisories require review. The approved
  advisory snapshot is separate from the dependency scan. Updating that hash
  requires reviewing the changed advisories; it must not be reset just to pass.
- Scan old/candidate images with the same preserved Trivy database, with network
  disabled. Require the pinned scanner, database <=48 hours old, unchanged
  Alpine/Composer package inventory, complete required extraction, no added
  findings at any severity, and no high/critical findings. Raw evidence remains.
  An existing UNKNOWN finding is not declared harmless or suppressed.
- Run the existing isolated upload, compatibility and discovery workflows.
  Tests block unrelated browser requests; the app containers use internal-only
  networks and synthetic data. Required checks include encryption/download
  hashes, Unicode passwords, prior-paste access, expiry, deletion, burn-on-read,
  full-request size, Markdown/SVG behavior and missing-volume failure.
  Subsequent automatic updates also require previous-version reading of a
  candidate-written Unicode-password paste. The explicit 2.1.0 bootstrap did
  not establish reverse password-format compatibility; see rollback below.
- Activate the exact candidate ID, verify that only the image and obsolete
  template bind changed, and require native health plus the existing bounded
  public test. That test creates one fictional 25 MB paste and deletes it.
  The template now lives in the image so code/template activation is atomic.

The policy, Dockerfile, patch and test paths are in this repository. No package
manager, generic deployment framework or new scheduler was introduced. Changing
this policy requires review, even if a scanner says a package version is fixed.

## Schedule and evidence

`utilibre-privatebin-update.timer`: 03:05, 09:05, 15:05 and 21:05 UTC, each with
0–10 minutes jitter. The flock prevents overlapping invocations. The service has
a 30-minute outer deadline; individual commands/downloads have finite limits.
Preparation requires 8 GiB free. It never prunes production backups or images.
Tests clean up their own containers on SIGTERM; an interrupted activation leaves
`pending.json`, blocking further activation until recovery review.

- `/var/lib/utilibre-privatebin-updater/last-run.json`: last apply/check outcome.
- `check.json` / `stage.json`: separate read-only/staging outcomes; these cannot
  conceal a stale scheduled apply run.
- `installed.json`: exact last successful deployment and source identity.
- `run-*/`: source archive, source/config copies, build logs, scan snapshot hash,
  raw scan results, test receipts and rollback configuration. Private permissions.
  This is software/configuration evidence, never an archive of real pastes.
- `/opt/utilibre/update-public/privatebin.json`: non-sensitive deployed version.
  The portal reads it through its existing read-only update-record mount.

Existing monitoring reports a failed/review-held updater or a report older than
14 hours. It uses the existing notification cooldown, not a new per-run email.
The weekly digest distinguishes newer recorded versions from unknown comparisons
and versions ahead of published tags. Those are review candidates, not proof of
runtime drift. Other applications remain subject to their own release gates.

## Rollback and maintenance

Disable only the timer to pause automatic updates:

```sh
sudo systemctl disable --now utilibre-privatebin-update.timer
```

This does not stop PrivateBin. Wait for/check the service before editing policy.
Keep the previous image and the release's `rollback.json`. A failed activation
restores the original pins and template-mount configuration and recreates only
PrivateBin, then verifies the exact old image and health. Concurrent edits cause
a recovery hold rather than overwriting someone else's work.

For a later manual rollback, compare `rollback.json` with both Compose files and
restore **only the PrivateBin image/template-mount fields**. Do not overwrite
other services' newer configuration. Then use the existing scoped command:

```sh
docker compose --project-directory /opt/utilibre -p utilibre-services -f /opt/utilibre/compose.yaml up -d --no-deps --pull never privatebin
```

Verify native health and synthetic decryption/deletion before updating the
installed receipt. The updater deliberately refuses a mismatched live image.
Image rollback never restores deleted/expired pastes. In particular, downgrade
from 2.1.1 to 2.1.0 may not read newly written Unicode-password pastes: reverse
compatibility with 2.1.0 was not established. It also restores the old SVG and
size-limit behavior. Prefer a forward repair; never present rollback as data
recovery. The automatic post-gate rollback is an availability fallback with
these limitations, not a guarantee about data written during the brief release.

Software source/update evidence can be retained under existing operational
retention. Temporary-content backups remain excluded. Future runtime/library
repairs require updating the reviewed base and policy through their own tested
release, not rebasing automatically onto the upstream container.

### Reconcile a reviewed runtime rebuild

An application-only updater receipt does not automatically follow a separate
runtime/security rebuild. After that rebuild's release has passed, reconcile
the receipt explicitly rather than deleting it, changing its image by hand or
allowing any image that happens to run:

```sh
python3 scripts/privatebin-maintain.py --reconcile-runtime
python3 scripts/privatebin-maintain.py --check
```

`policy.json` must contain an approved `reviewedRuntimeTransition` for the exact
previous/current images, unchanged application version/revision/archive hash,
actual deployment time, three application payload hashes and six preserved
build/consumer/scan/native/deployment/source-replay proofs. Missing, changed or
unreviewed inputs fail closed. The running container must still pass the normal
health/isolation/configuration checks, match Compose and contain the reviewed
application-source receipt and maintained template. This is a finite reviewed
transition, not automatic approval of a different live image.

Reconciliation uses the updater lock and never downloads source, builds an image,
restarts PrivateBin, creates a paste, copies paste data or sends notifications.
It preserves `installed-before.json` and `public-before.json` in its private run
directory, then updates the installed and public software receipts. Old scan/test
results remain historical evidence; they are not assigned to the new runtime or
treated as current security clearance. Repeating the command verifies the same
receipts without rewriting them. An I/O failure restores the previous receipts.
The separate `reconcile-runtime.json` does not conceal a failed scheduled run;
the normal update service must subsequently complete successfully.

On 11 November this repaired the stale 6 November receipt after the already
reviewed 9 November musl/abuse-notice rebuild. PrivateBin stayed on **2.1.1**.
Future 2.1.1-or-newer upgrades require reverse compatibility regardless of whether
the preceding image is also the runtime baseline. Only the historical 2.1.0
bootstrap has the documented exception. The decision follows the application
version, not image equality.

For receipt-only rollback, first confirm the running image and maintenance job
state. Restore the preserved installed/public receipts together only if they
describe the intended running baseline; an older image identity deliberately
puts routine updates back on hold. This does not roll back an image, configuration
or user data. A new runtime needs new reviewed transition evidence.
