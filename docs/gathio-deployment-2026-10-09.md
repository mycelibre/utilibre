# Gathio deployment — 9 October 2026

Live: https://events.utilibre.org, Caddy → 10.10.1.43:3198. Native public HTTPS event/edit pages and local assets passed; the footer links the portal, bilingual data notes, private contact and modified source. The application UI does not currently provide Spanish; the data notes use voseo.

## Version, licence and reproducible corrections

Gathio tag 1.6.7, commit `98a5e9b719120e2f3e72f712a78c97fba1eff8e7` (upstream package metadata says 1.6.6), GPL-3.0-or-later. Image `utilibre-gathio:1.6.7-p1`. `deployment/calendar/gathio/build.py` asserts the clean source revision and applies `privacy-security.patch`, installs the captured dependency lock, copies vendor assets, runs upstream tests/build and builds the pinned runtime. The patch updates vulnerable dependencies and their native APIs, replaces Math.random edit/magic tokens with 192-bit cryptographic tokens of the native 32-character length, serves formerly remote scripts/styles locally and avoids unnecessary RSA generation when federation is disabled. No analytics was added.

The database uses Apache-2.0 FerretDB 2.7.0 and MIT DocumentDB 0.107.0 on PostgreSQL, not MongoDB's SSPL server. Compose pins FerretDB and matching DocumentDB image digests. The small PostgreSQL child image upgrades the matching base to PostgreSQL 17.11 and libpq 18.6 without changing the DocumentDB extension. FerretDB telemetry is explicitly disabled. PostgreSQL background-job run logging is disabled. Database ports are not published, and the internal application/database network has no Internet egress.

The final production dependency audit has no critical/high findings and one moderate finding in the legacy `request` dependency of `ical`. The application imports only `ical/ical.js`, its local parser, not the unused remote-fetch adapter. The application network also prevents outbound requests. This is not a claim that all dependencies are free of advisories. Review/remove this exception when upstream supports a compatible parser.

## Actual data and limits

Events, descriptions, uploaded images, optional attendee/contact fields and comments are server-readable. Unlisted URLs are not private access control. The edit URL grants management access and must remain secret. Federation, email and email recovery/reminders are disabled. No public event directory is shown. Anonymous event creation remains native functionality; the gateway allows creation/import at 2/minute with a burst of 4, other writes at 60/minute, and bounded ordinary reads. Assets are exempt from the general read limiter.

Native daily cleanup expires events seven days after their end. The application also keeps its native database operation/error log with no configured expiry; entries can contain identifiers and error details. Event expiry does not establish deletion from those logs, recipients' copies or backups. Gateway access logging is off; container/error output rotates by size (2 × 5 MB), not by a guaranteed number of days. HTTPS traverses the existing Cloudflare HTTP proxy and Caddy; provider/edge retention is not established by this check.

Resource ceilings: application 1 CPU/512 MB, FerretDB 0.5 CPU/256 MB, PostgreSQL 1 CPU/768 MB, gateway 0.25 CPU/64 MB. Containers are read-only apart from the declared state/tmpfs mounts, with dropped capabilities and bounded process counts. These are containment limits, not a measured simultaneous-event capacity guarantee.

## Export, deletion and tested recovery

Use an event's native calendar export to download ICS. It contains event details (title, description, time and location); it does not contain attendance, comments, uploaded image bytes, management secrets or all application settings. Native ICS import creates a new editable event with a new management link. Protect and retain that link yourself. Delete through the event editor; removal does not recall downloaded calendars or existing backups.

Fictional checks on 9 October: native create; wrong edit-token rejection; multipart update and synthetic image upload; exact-title ICS export/import; public HTTPS view/edit and bilingual data notes; no external browser HTTP hosts or JavaScript errors. The two exact owned fictional events were deleted through native authenticated-by-link endpoints and returned 404 afterward. No real content was inspected or deleted.

`deployment/calendar/gathio-backup.py` stops only Gathio writes, captures a native PostgreSQL logical dump, then cleanly stops FerretDB/PostgreSQL and snapshots the complete PostgreSQL cluster, images and private configuration. It restores prior running services in a finally block. It is included in `utilibre-community-backup.timer` at 04:25 UTC plus up to 15 minutes of jitter. Copies stay on this VM and have no configured automatic expiry; this is not offsite protection.

A full clean-cluster restore of `gathio-20261009T012059Z` into disposable network-none containers reopened both fictional events and their image through Gathio. Checksums passed. The tested recovery path uses the matching PostgreSQL/DocumentDB image and clean filesystem snapshot. A naive logical-only pg_restore hit DocumentDB extension/background-job initialization ordering; it is NOT the tested restore procedure. Keep the logical dump as an additional artifact, not a promised working alternate restore.

Reproducible checks: `check-gathio-native.mjs`, `check-gathio-flows.mjs`, `check-gathio-browser.mjs`, `check-gathio-restore.py`. Private evidence is under `/opt/utilibre/reports/new-services-20261009/gathio-*`; private fixture files contain edit keys and must never be published. Public source: https://tools.utilibre.org/utilibre-source/gathio-utilibre.tar.gz.

## Maintenance

Back up first, rebuild the pinned source with the documented patch, validate on an isolated restore, then recreate only affected Gathio services. Rollback requires both the previous image and a compatible state snapshot if a database migration occurs. Do not substitute an unreviewed database image or enable federation/email without updating the data notes. Native events can still be abused; use the existing private abuse process and identify an event without publishing its edit key.

Portal apps4 published the EN/ES catalog entry and native guide on9October. Public search, mobile layout, no-JS catalog and configured status probe passed.
