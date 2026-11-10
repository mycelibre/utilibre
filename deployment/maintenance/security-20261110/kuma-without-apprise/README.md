# Kuma: remove the unused Apprise integration

Owner-approved scope: remove **Apprise 1.10.0-1** and **Python-Markdown
3.4.1-2+deb12u1** from the existing **Uptime Kuma 2.5.6** image. There were no
configured notification channels at release preparation. Kuma's native
`checkApprise` mechanism detects the missing CLI; SMTP, ntfy and the other
native providers remain. Maintenance emails use a separate SMTP implementation.
This intentionally removes an optional capability; it is not a claim to have
fixed Python-Markdown upstream. No application source or UI fork is needed.

The immutable input, removed package versions and authorization are in
[inputs.json](inputs.json). Prior Kerberos, SQLite, Python, OAuth and other
repairs remain. The recipe removes only the two named packages, without
`autoremove`, dependency resolution or network downloads.

## Preparation and verification

Run from the repository root. These are finite commands for the declared
baseline, not a scheduler or permission for a future release:

```sh
python3 deployment/maintenance/security-20261110/kuma-without-apprise/prepare.py
python3 deployment/maintenance/security-20261110/kuma-without-apprise/prepare.py verify
node deployment/maintenance/security-20261110/kuma-without-apprise/check.mjs
node deployment/maintenance/security-20261110/kuma-without-apprise/scan.mjs
```

Preparation rejects a different baseline, changed recipe or completed build.
`verify` rechecks the recorded candidate without building or deploying it.
It reuses the existing image inventory helpers and compares the complete
filesystem (content, ownership, permissions and links), installed packages
and image configuration. Only the two packages' files/caches and named dpkg
bookkeeping files may change. Actual Markdown/Apprise code must be absent.
An unsupported baseline was rejected; an already-correct candidate was
verified again without modification. Image byte reproducibility is not claimed.

The functional fixture runs both original and candidate images on Docker
`network none`, with a fresh synthetic SQLite database in tmpfs, no production
credentials or mounts, 1 CPU and 512 MiB RAM. It exercises native account
setup/login, Apprise availability, a successful local HTTP heartbeat, status
page creation, monitor deletion, and SMTP/ntfy delivery to loopback sinks.
No real email or public notification is sent. Failed test attempts are retained
privately alongside the passing result. No vulnerability reproduction is run.

The scanner uses the existing pinned Trivy 0.75.0 and frozen local databases,
with a 5-minute limit, 1 CPU and 2 GiB memory ceiling. It checks both immutable
images, preserves raw findings and requires package absence, complete OS
inventory and no new high/critical records. Only the image-ID portion of
Trivy's OS target label is normalized for comparison; finding fields and
application paths are preserved. Scanner absence is not a general clearance.

## Scoped release and rollback

The already-authorized release used the existing transaction, lock, exact-image
health and rollback helpers. The finite entry points are `release.mjs prepare`,
`apply` and `verify`. `apply` requires current passing evidence, exact old/new
image IDs, unchanged Compose settings, no configured Apprise channel, no
unreviewed shared namespace, an 8 GiB recovery floor and a native SQLite backup.
Only the community `uptime-kuma` service is recreated. The public status page,
container health and saved account/monitor/status-page data are checked after
replacement. Other container IDs must remain unchanged. Repeating a completed
release checks its state without restarting it.

Private evidence is under
`/var/lib/utilibre-maintenance/security-20261110/kuma-without-apprise/`.
`release.json` contains exact image IDs, Compose identity and completion time.
`operator-state-before.sqlite` is a restricted recovery snapshot of operator
configuration/history; never publish it. It is not restored automatically.
`state-before.json` / `state-after.json` must match for saved configuration;
ordinary heartbeat/DNS state may continue changing.

Rollback: under a new authorized scoped release, restore only the previous
image pin recorded in `release.json`, verifying that its tag still resolves to
the recorded `oldImage`. Recreate only `uptime-kuma` through the established
Compose command (including the existing `.env.rallly` file) and repeat health,
status-page and saved-state checks. No schema migration was introduced, and
image rollback does not undo subsequent user/operator changes. The previous
image remains local; rollback also reinstates the Markdown finding.

Future upstream updates must repeat the package-absence and native workflow
checks. Do not edit the exact baseline in this approved manifest or blindly
replay it onto another release. Prepare a new reviewed input if upstream
packaging changes, or retire this layer when upstream no longer includes these
packages. Enabling Apprise later needs a compatible dependency/security review.

Existing artifact reviews are revalidated against the completed release chain
and current files. Removal clears the Markdown finding by removing the actual
dependency, not by suppressing it. The separate ACL migration remains open.
