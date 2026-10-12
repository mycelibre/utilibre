# Native sudo timezone repair — 12 October 2026

This narrow backport addresses **CVE-2026-96512 only**. Both candidates are built
and checked. The root maintainer deployed the host candidate at 15:27 UTC;
configuration/PAM/timestamps and five daemon PIDs were preserved, with no restart.
The root maintainer also deployed the Kuma candidate through its separate
Compose release; native health, exact package/image, retained Click, and the
existing public status route passed. Its account data and configuration remained.
No sudo authentication, privileged command, or exploit was attempted.

| Target | Authenticated Debian baseline | Native candidate | Upstream checks |
| --- | --- | --- | --- |
| Host / Trixie | `1.9.16p2-3+deb13u2` | `1.9.16p2-3+deb13u2+utilibre1` | 92 result groups, 3,056 tests, zero errors |
| Kuma / Bookworm | `1.9.13p3-1+deb12u4` | `1.9.13p3-1+deb12u4+utilibre1` | 86 result groups, 2,478 tests, zero errors |

The totals include both the simple and LDAP upstream build variants. Only the
native `sudo` package is eligible for replacement; no LDAP-enabled sudo package,
authentication change, new privilege, or new daemon is proposed. These counts are
upstream result summaries, not independent vulnerabilities or security coverage.

## Evidence and implementation

The [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-96512)
lists the two native baselines as vulnerable and the unrelated sid branch as
fixed. Sid's binary requires a newer libc and was not used. Debian's assessment
is a local, time-restricted authorization issue; it does not bypass passwords.

Both official changes are required:

1. [`db669167`](https://github.com/sudo-project/sudo/commit/db669167ca599f2a94cd8a4c5fae9e473c81a2fd)
   introduces system-timezone initialization.
2. [`1820a349`](https://github.com/sudo-project/sudo/commit/1820a349687522f51023d1ae5925125f59679a8c)
   removes TZ from sudo's working environment while preserving the original
   plugin environment. The first change alone is ineffective because `mktime`
   reads TZ again.

Trixie uses both changes verbatim with zero-fuzz offsets. Bookworm needs one
**context-only** adaptation: the older main function uses `exit(EXIT_FAILURE)`
where the newer patch context says `return EXIT_FAILURE`. No added/deleted
security line is changed. `native.mjs` verifies that exact difference and the
second patch's complete checksum. All existing Debian patch files remain.

The source and rollback packages are pinned to authenticated APT indexes in
`verify-source.mjs`; the two official patches have fixed SHA-256 values.
`review.sources` is used only for private download metadata, never installed as
host APT configuration. The build is native to each Debian release; production
libc, PAM, sudo plugin ABI, service configuration, and access rules are retained.

Builds ran in separate, non-production containers with no service mounts, core
dumps disabled, a two-GiB memory ceiling, and one CPU for the completed Trixie
build / two CPUs for Bookworm. Future wrappers use the approved two-CPU ceiling.
Dependencies were acquired first; networking was then disconnected. Compilation
and upstream tests ran as `nobody`. The eight-GiB root free-space floor is gated.

## Completed checks

For each native package:

- Both complete Debian `dh_auto_test` paths (simple and LDAP) passed.
- A benign, non-root C test compiles the **actual repaired functions**. It checks
  that the original plugin environment is preserved, TZ is absent from the
  working environment, ordinary local-time conversion uses the system zone, and
  an empty environment works. This does not execute sudo or test escalation.
- All seven packaged `/etc` configuration/PAM files are byte-identical.
- All 14 ELF payloads retain their exported symbol sets, dynamic dependencies,
  and file modes; no library ABI substitution is made.
- Maintainer-script executable content is unchanged; package versions and
  exact build artifacts are bound to private proof files.
- The host-only read-only release preparation compared 137 installed baseline
  payload paths, 12 actual configuration records, package inventory, and service
  PIDs. Both installed and candidate `visudo` parsed the actual configuration
  without making changes. Configuration contents are not printed or published.

The initial checker rejected the text `FAIL:` quoted inside a compiler warning.
Inspection showed this was a test's C string, not a failed test. The checker now
validates anchored executed-test summaries and successful build completion; no
test failure was ignored and no failing binary was installed.

Kuma's isolated fixture deliberately drops all capabilities. An exploratory
`sudo --version` invocation printed the expected version but could not initialize
its audit plugin because that path attempts an internal UID transition. The
fixture was not given additional privileges. Version identity is instead checked
through package metadata and exact hashes of all native ELF payloads; parser,
upstream tests, environment helpers, and Kuma's own login are checked separately.

Private evidence lives under
`/var/lib/utilibre-maintenance/sudo-followup-20261012/`, including signed-index
provenance, source archives, upstream logs, each `output/native.json`, and
`host-checks.json`. None is a scan-wide clearance.

## Preparation and release

```sh
sh deployment/maintenance/sudo-followup/acquire.sh
sh deployment/maintenance/sudo-followup/build.sh trixie
node deployment/maintenance/sudo-followup/native.mjs trixie
sh deployment/maintenance/sudo-followup/build.sh bookworm
node deployment/maintenance/sudo-followup/native.mjs bookworm
node deployment/maintenance/sudo-followup/release-host.mjs
node deployment/maintenance/sudo-followup/prepare-source-offer.mjs
```

Existing completed artifacts/receipts are not silently overwritten by the build
or release. The source-offer command prepares (does not publish)
`security-sudo-native-20261012-source.tar.gz`: complete original and Debian source
packages, both native baselines, official backports, recipes, and a checksum
manifest. The supplied `.dsc` files can be extracted normally and built with
`dpkg-buildpackage` inside their corresponding Debian release.

After independent review, the root maintainer may run
`node deployment/maintenance/sudo-followup/release-host.mjs --apply`.
The helper accepts only the reviewed Trixie artifact and exact installed
predecessor, a fresh preparation receipt, a single-package APT simulation, and
unchanged native evidence. It preserves sudoers/PAM/configuration, timestamp
content/permissions/mtime, all other installed package versions, and the Docker,
SSH, networkd, journald, and logind main PIDs. It never runs sudo authentication
or clears its timestamp cache. Custom-version unattended-update protection is
refreshed only after a verified successful install.

Debian's unchanged post-install script includes an `invoke-rc.d sudo restart`
call. On this host `sudo.service` is masked to `/dev/null`, and the init script's
`restart` branch is explicitly a no-op. The helper gates those facts and absence
of resident host sudo/library users; no daemon restart is required. It refuses
unexpected legacy files that the package scripts would otherwise delete.

On failure the helper reinstalls the exact authenticated previous package and
verifies its files plus preserved configuration/timestamps. It does not change
other packages or restore over concurrent user configuration edits. An
unverified rollback is reported as such and requires operator inspection.

`stage-kuma.mjs` builds a single-package image overlay on the exact current Click
predecessor; `application-kuma.mjs` reuses native Kuma setup/login checks with a
fictional account and disposable tmpfs SQLite. It does not authenticate through
sudo, send notifications, or touch production account data. `release-kuma.mjs`
reuses the established Compose health/rollback gates and must be applied only by
the root maintainer, after its `prepare` phase and explicit Compose pin change.
It preserves application/configuration/native-library hashes, unrelated package
versions, all 14 sudo ELF payloads, and the prior Click/Apprise repair. Preparation
uses a private consistent native SQLite recovery snapshot. Production data is
not reset or restored during a successful release.

Coordinate any concurrent OpenLDAP work: no stale image base may be repinned
over another repair. The next overlay must name the exact released predecessor.
A fresh scan and exact scoped review must follow actual deployment; no
vulnerability-review ledger is edited by this folder. The immutable source offer
contains complete compiled-source inputs; later deployment glue is also supplied
through the repository and shared integration-source offer.

Future upstream updates must retain these two fixes or replace them with an
equivalent supported release, pass the native/application checks, and retire
this local patch deliberately. Do not use a numerically newer foreign-distribution
binary or clear unrelated sudo/dependency findings using this evidence.
