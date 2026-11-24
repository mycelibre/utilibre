# Security and backup checkpoint — 24 November 2026

The latest completed whole-VM Utilibre vulnerability assessment finished on
23 November at 10:25 UTC using Trivy 0.76.2 and its database updated at
07:04 UTC that day. The scan completed 109 image, 120 source-manifest and host
targets with no target failures. The queue has 21,108 package-target records;
65 raw critical matches were all recorded as mitigated or not affected on
the reviewed artifacts, leaving **0 critical pending**. There are **50 high
pending** records: 30 repeated `libacl1`/CVE-2026-54369 records across the
host and images, and 20 `linux-libc-dev` header-package records on the host.
The latter are not proof that the corresponding kernel bugs are reachable from
this package. The queue also has 5,715 medium, 4,920 low and 969 unknown
pending records; these are triage occurrences, not unique exploitable flaws.
Thirty high records were past their triage target at this checkpoint. Separate
Caddy and Proxmox hosts, mounted writable data and some browser/native
components remain outside this scan. The three 24 November reader images and
new portal image were scanned separately against the preserved database and
had zero findings; they postdate the whole-VM scan.

Debian's [ACL advisory](https://security-tracker.debian.org/tracker/CVE-2026-54369)
still lists Trixie as vulnerable and says its stable fix is deferred to a
point release. Debian describes
[`linux-libc-dev`](https://packages.debian.org/trixie/linux-libc-dev) as
userspace development headers; the 20 new scanner records need separate
package-versus-running-kernel review rather than automatic runtime attribution.

At this checkpoint, the running kernel was
`6.12.117+deb13-cloud-amd64`, while the Debian security package
`linux-image-6.12.118+deb13-cloud-amd64` was installed. The new kernel needs
a separately coordinated VM reboot to become active; its installation alone
does not change the running kernel. This checkpoint does not claim the
unreviewed high records are fixed or that the site is free of vulnerabilities.

The 24 November `utilibre-community-backup.service` failed during its isolated
PostgreSQL restore check. The container's temporary initialization server
passed `pg_isready`, then stopped before `createdb`, producing a transient
connection failure. The application snapshots were created; the original
restore was not marked verified. `deployment/community/verify-backup.mjs` now
retries database creation within a 30-second bound and checks whether an
attempt already succeeded. Re-running it against that exact snapshot verified
checksums, a native Rallly and Pollaris restore, SQLite integrity and private
archive structure. It wrote the owner-only `RESTORE-VERIFIED.txt` marker. The
restore container was removed, and the production databases were untouched.
This is a same-VM recovery check; it is not an off-host or whole-VM restore.

Private evidence: `/var/lib/utilibre-maintenance/security.json`,
`security-queue.json` and the verified snapshot under
`/opt/utilibre/community-backups/2026-11-24T04-31-02-534Z`. Do not publish
raw findings, database dumps or credentials.
