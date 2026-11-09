# Maintenance checkpoint — 9 November 2026

This record covers the requested disk expansion, critical finding triage,
native library repairs and one reviewed application upgrade. It is not a claim
that every pending advisory or newer application version is resolved.

## Completed release and remaining work

The final complete scan and queue reconciliation leave **0 pending critical /
674 pending high package-target records**, compared with 7 / 735 at the start.
The 109 runtime images were assessed against the same database. Raw findings
and scoped reviews are retained; this is not a claim of zero vulnerabilities.
All 175 containers are running; all 90 configured health checks pass. The other
85 containers do not have a Docker health check. No systemd units are failed.
Repeating the release command left all 20 static containers' identities, images,
start times and restart counts unchanged. The 23 maintenance regression tests
pass. The other 42 musl image candidates and 34 upstream application upgrades
remain pending their specific compatibility, workflow and release gates.
Earlier ACL/GRUB repairs remain subject to their recorded automatic approval
review blocks; this release does not bypass them.

## Main disk

Proxmox had already enlarged the main virtual disk to 295 GiB. The guest's
partition and ext4 filesystem were extended into its unused 25 GiB tail.
The root filesystem is now approximately 291 GiB. The partition start and boot
partitions are unchanged. The separate 15 GiB temporary-data disk was untouched.
The operation completed online without reboot or service restart. Before/after
partition tables are retained in the private maintenance evidence directory.
An online shrink is not a rollback procedure.

## Critical records and GLib

The opening queue had seven critical and 735 high package/target records needing
review. These are scanner findings, not established exploitability.

Five critical records received narrowly scoped, expiring evidence reviews:
three Debian zlib packages do not include the affected MiniZip code, and the two
FreshRSS libxml2 payloads retain their verified fixes. Raw records remain.
FreshRSS's isolated library/application checks include native parsing, accounts,
feeds, Unicode, OPML and sanitizer behavior; no real user account was exercised.

Addy and 4get now use GLib 2.86.5 with the actual upstream D-Bus parser repair.
The signed vendor package alone still accepted the invalid node structure.
Both predecessors reproduce that behavior; the repaired library passes five
upstream tests plus a valid interface and seven malformed-document checks.
Existing symbols, dependencies, application bytes and configuration are retained.
Addy's eight native application checks and both applications' image processing
checks passed without sending mail or calling search providers. Their scoped
releases passed health and HTTPS checks; Addy's SMTP firewall boundary remains
active. Old images are retained in the release receipt.

The complete scan after these releases reported zero pending critical and
714 pending high records. This intermediate checkpoint predates the musl batch
below; retained backport reviews are not equivalent to removing raw records.

## musl static-server batch

The inventory records 62 affected image identities used by 120 containers.
Twenty static-server candidates passed exact application/configuration parity,
16 native libc checks per artifact, preserved exported symbols and nine NGINX
checks per artifact. Tests cover normal HTML, UTF-8 content, byte ranges, gzip,
conditional caching, routes, redirects and missing files in network-isolated
containers. The tests do not claim to reproduce the oversized-regex exploit.

Each candidate removes CVE-2026-107891 against the same 9 November Trivy database
and introduces no new high/critical finding. Application bundles and browser
storage are unchanged. The other 42 images remain unapproved: their stateful
consumers, service supervisors or application-specific workflows need testing.
Whisper's withdrawn portal entry remains withdrawn.

All 20 selected static services completed their scoped live health, exact-image,
configuration and applicable HTTPS checks. No rollback was required.

The selected services are BentoPDF, Glyphr, miniPaint, hat.sh, JupyterLite, VERT,
OmniTools, Excalidraw, AudioMass, Image Scrubber, QR Tools, zip manager, CyberChef,
the primary QR creator, SVG-Edit, IT Tools, Markmap, draw.io, RAWGraphs and the
withdrawn Whisper runtime. Release completion is recorded per group in the
private receipt; the overall receipt remains partial because of the unapproved
inventory rows. No stateful data migration is part of this batch.

## ChartDB 1.21.0

The upgraded application is live at
[ChartDB](https://tools.utilibre.org/apps/chartdb/), built from
`ee95448d154cfdcf65264c45745f440c0480ef84`. Local fonts/workers, scoped browser
storage and disabled telemetry/cloud integrations are retained. DOMPurify
3.4.17 and Monaco 0.57.0 remain pinned. Upstream theme validation is preserved.

The clean patch replay equals the tested source. Typecheck/lint/build and all
842 upstream tests passed. Chromium exercised SQL import/export, JSON backup
import in a fresh context and persistence after reload with fictional data.
No external requests, uploads or browser errors were observed in that workflow.
There is no new claim of real-phone verification.

The source/lockfile assessment has no high/critical findings; one medium and two
low findings remain. Static assets were replaced atomically and their previous
directory is retained. The EN/ES portal software pages now show 1.21.0-p1.
The portal passed build, lint, typecheck and 120 unit tests. A test was corrected
to accept Node's native empty 431 rejection while still requiring connection
closure and verifying legitimate requests below the header limit. Production
server behavior was not relaxed. Its runtime packages are unchanged; one
pre-existing medium zlib finding remains open.

The targeted upstream check confirms ChartDB matches its latest stable release.
The morning inventory contained 35 upgrade candidates; the other 34 still need
their compatibility/privacy/local-repair gates. The earlier
[release disposition](release-refresh-2026-11-06.md) remains applicable where
its candidate is unchanged. An available upstream release is not approval to
replace a repaired runtime.

## Evidence and rollback

Private evidence: `/var/lib/utilibre-maintenance/security-20261109/`.
Important records are `glib-release.json`, `musl/*/{build,consumer,scan-gate}.json`,
`musl/release.json`, `chartdb-replay.json`, `chartdb-checks/result.json`,
`chartdb-static-release.json`, `portal-release.json` and the bounded test logs.
The scanner is Trivy 0.75.0, using the unchanged database
`3f021611ab6c0b94ca9f4fb630fb583c200663e8cae430446f89ded1b99fdb29`
retrieved/updated on 9 November. Archived replay is not future security clearance.

[Pinned inputs, operating commands and rollback](../../deployment/maintenance/security-20261109/README.md)
extend the existing release mechanism. Rollback restores the recorded image
pin or previous static directory and verifies the affected service. Preserve
Addy's native SMTP supervisor. Portal rollback changes only `PORTAL_IMAGE`.
Image rollback does not restore persistent data. No VM restart, user-data
deletion, backup pruning, secret rotation or notification was performed.

Corresponding sources:
[GLib repair](https://tools.utilibre.org/utilibre-source/security-glib-20261109-source.tar.gz)
and [ChartDB 1.21.0](https://tools.utilibre.org/utilibre-source/chartdb-1.21.0-utilibre-source.tar.gz).
Their respective SHA-256 values are
`314dbab9dd598a56e683d18b6e6efd228e4531b2dd7d5230e550047ee36c8093` and
`5e7b0f7e15450183f048502adcf44cca73c282bd1589eb132cb5708d33d10563`.

Primary fix evidence: [GNOME parser correction](https://github.com/GNOME/glib/commit/c9da977c178fbfc0e4caf99f9fdf5dc433d6fcc2),
[musl advisory](https://www.openwall.com/lists/musl/2026/10/21/1),
[Debian MiniZip scope](https://security-tracker.debian.org/tracker/CVE-2023-45853).
The exact fixes were checked against retained source/packages, not inferred
only from a scanner's fixed-version label.
