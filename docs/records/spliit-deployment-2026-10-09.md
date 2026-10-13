# Spliit deployment — 9 October 2026

## Installed and verified

Spliit 1.29.0 (MIT), source commit `d3b1e1e6787ffe13c6dfe0b6a2fcfc403d81686a`, is running as the isolated `utilibre-spliit` Compose project. The initial upstream image was `ghcr.io/spliit-app/spliit:1.29.0@sha256:6d3060db4289605cdcef4e9f4d2074229a6018c0db7cdd334f5d12108977c372`; the deployed image is `utilibre-spliit:1.29.0-p1`, image ID `sha256:1d41309f73066f3900e481e444b14ee79aae4e07fb58591bca4562c8224e18d3`.

Upstream release/advisories were checked on this date. Runtime dependency inspection identified applicable Next.js and image-processing advisories even though the project-specific advisory API returned no entries. `deployment/spliit/security-dependencies.patch` pins Next 16.3.8 and sharp 0.35.5, updates fast-uri/source-map-js within their supported ranges, and pins the upstream Node 26 base image. `rebuild.sh` reproduces this source modification. Remove the patch when an appropriate upstream release includes these fixes. This is a dependency maintenance patch, not a custom expense application.

The remaining production dependency audit has four high/four moderate findings: Prisma's configuration dependency deepmerge-ts is used for trusted startup configuration; its bundled mysql2 driver is not used by this PostgreSQL deployment. The upload dependency/uuid path is disabled and its API route blocked. Tailwind/PostCSS findings relate to build tooling. These are tracked findings, not a claim that every package is advisory-free. Private full audit reports: `/opt/utilibre/reports/spliit-20261009/npm-audit*.json`.

## Runtime, privacy, and access

- Public host: `https://expenses.utilibre.org`; private gateway `10.10.1.43:3190` and local verification `127.0.0.1:3190`. Separate-edge configuration is in `deployment/spliit/Caddyfile`; the actual public workflow is now verified separately below.
- Native group links grant access to read/edit expenses without an account. Treat a group URL as a shared credential. Do not promise identity-based invitations or confidentiality from the server operator.
- PostgreSQL stores group names, descriptions, participant names, expenses, notes, shares and activity records. The browser also retains recent-group links/preferences. No scheduled expiry is configured. Removing a recent group from one browser does not delete server data.
- Analytics are unset; Next telemetry is disabled. Document uploads, receipt extraction and category AI are disabled through native settings. `/api/s3-upload` is additionally blocked. No AI/S3 credentials are installed.
- A same-origin CSP blocks third-party flags and Frankfurter currency requests. Native manual exchange rates remain available (`Use custom rate`); automatic rates are unavailable here. Server egress is restricted to this stack's PostgreSQL connection. No public-source fetch or tracking component was added.
- The gateway sets noindex/nofollow and no-referrer. Link-bearing HTML/API responses use private/no-store; hashed Next assets retain their useful immutable cache. No access log is enabled. Application/gateway/PostgreSQL warning/error output may include diagnostic metadata; Docker rotation is size-based, at most 2 × 1 MiB per container, not a time guarantee. Edge/hosting/provider logs follow the existing verified project notes, not this gateway's rotation.
- App limit: 512 MiB, 1 CPU; PostgreSQL: 256 MiB, 0.5 CPU; gateway: 96 MiB, 0.5 CPU. All have read-only roots, bounded writable mounts, no added capabilities, no-new-privileges and process limits. Native maximum participants is 100 per group. Gateway writes are limited to 30/minute per client with a 30-request burst, a 128 KiB body ceiling, and 429 on excess. These are protective bounds, not a measured concurrent-user capacity claim.

## Export, deletion, and recovery

Open a group → Export → Export to JSON or Export to CSV. JSON preserves the group and participants, expense fields/shares/categories/notes/conversion information and activity records; CSV is a tabular expense export. Browser recent-group lists/preferences are not exported. Attachments are disabled. No native JSON/CSV import was found in this installed version: these downloads can be read independently, but must not be advertised as a full in-app migration/restore.

Open an expense → edit → Delete → Yes to delete that expense. The group/activity history can still retain related names or titles. This version does not expose whole-group server deletion in its UI; an operator must handle a specific group request through native database administration. Do not send the shared group link in a public issue. Shared recipients may retain their own exports. Browser recent-list removal is only local removal.

`backup.mjs` creates private native PostgreSQL custom-format dumps plus private configuration and checksums under `/opt/utilibre/spliit/backups`. Daily timer: 05:35 UTC plus up to ten minutes' random delay. There is **no automatic backup expiry**; these backups remain until an operator removes them. They are on the same VM, not an off-site copy. Active deletion does not rewrite old backups. The script refuses a backup when less than 5 GiB remains.

`verify-backup.mjs` restores into a disposable network-disabled PostgreSQL 17.11 instance, checks native tables and counts, records the result privately, and removes that restore container. Restoring the whole production service remains an operator action using a checked snapshot and matching pinned application/database versions; do not overwrite production while verifying a restore.

## Fictional verification

`node deployment/spliit/check.mjs` passed against the deployed patched image: create one group/three fictional participants, create one expense, open the link in a separate browser context, download and inspect native JSON/CSV, back up and restore into an isolated database (1 group/1 expense/3 participants), then delete the expense through the native UI. No external browser request escaped the CSP in this workflow. The exact owned synthetic group was then deleted with a name-and-ID-guarded native SQL statement. Private snapshots intentionally retain the fictional restore evidence; no real user record was inspected or deleted. Current-phase fixture IDs and exports remain outside the repository.

Evidence: `/opt/utilibre/reports/spliit-20261009/result.json`, `cleaned-fixture-p1.json`, and the corresponding private `RESTORE-VERIFIED.json`. Public HTTPS readiness at `https://expenses.utilibre.org/api/health/readiness` subsequently returned200 through the configured edge. That initial fictional create/export workflow used the private-gateway browser route; the later actual-public pass below closes its separate edge gate. Manual currency conversion is source-verified; the successful fictional expense used the group's default currency.

## Portal integration facts

Suggested catalog ID `spliit`; category money/planning; status target is the fixed private `/api/health/readiness` endpoint. Upstream URL: https://github.com/spliit-app/spliit ; source/licence: MIT, pinned above.

EN description: “Split shared expenses and keep balances with a group link.”
ES: “Repartí gastos compartidos y llevá los saldos con un enlace de grupo.”
EN limit: “Anyone with the group link can read and edit it. Automatic exchange rates and receipt uploads are disabled; use a custom exchange rate when needed. Export CSV/JSON regularly; this release has no native import or whole-group deletion button.”
ES: “Cualquiera con el enlace del grupo puede leerlo y editarlo. Las tasas de cambio automáticas y la carga de recibos están desactivadas; usá una tasa personalizada cuando la necesités. Exportá CSV/JSON con frecuencia; esta versión no tiene importación nativa ni un botón para eliminar todo el grupo del servidor.”

## Published corresponding source

The archive `spliit-utilibre.tar.gz` in `/opt/utilibre/toolbox-public` contains the pinned upstream application source, applied local changes, deployment recipes/patches and licence files. It excludes runtime state, private configuration and credentials. The shared source index links to this file through the existing toolbox source-download endpoint.

## Scheduled backup repair, 9 October at 13:24 UTC

The timer's first invocation failed before starting Node (systemd exit203): its
unit referenced `/usr/bin/node`, which does not exist on this VM. The application
and backup format were unaffected. The source and installed unit now select the
existing verified host runtime `/root/.nvm/versions/node/v24.14.0/bin/node`.
Review that explicit path when updating the host runtime; no new runtime was
installed and no global Node symlink was added.

After unit validation and daemon reload, the actual scheduled service completed
with exit0. It created a new native PostgreSQL/configuration snapshot, verified
its checksums, restored the dump into its network-disabled PostgreSQL fixture,
and checked the expected native tables and aggregate counts. The fixture was
removed; production was not restored. The timer remains enabled/active with its
original schedule, and all existing backups and the5GiB free-space floor remain.
Private evidence: `/opt/utilibre/reports/scheduled-backup-repair-20261009/`.

## Actual public workflow, 9 October at13:31 UTC

`UTILIBRE_SPLIIT_PUBLIC=1 node deployment/spliit/check.mjs` now uses the real
`https://expenses.utilibre.org` origin without request interception or hostname
substitution. A uniquely marked fictional group with three participants and one
expense completed native creation, shared-link reading from a separate browser,
JSON/CSV export and native expense deletion. The English desktop view and Spanish
390px mobile shared view/participant-selection prompt rendered without horizontal
overflow; screenshots were inspected. This does not claim every mobile control
or upstream Spanish string was rewritten or exhaustively exercised.

Four native `flagcdn.com` image attempts were rejected explicitly as `csp` by the
browser; no external response was received. The checker distinguishes such
blocked attempts from completed third-party requests. The existing CSP and
manual-rate privacy boundary were unchanged. No new restore was needed for this
browser pass; the actual scheduled native restore already passed separately.

After native expense deletion, the checker removed only its own whole-group
fixture through the documented database administration path, requiring both the
exact newly created ID and a random ownership marker. Native foreign-key
cascades removed that fixture's related participant/activity state. No real group
was read or deleted. All test-created groups, including abandoned test attempts,
are accounted for by their private cleanup records. A first attempt failed form
validation before creating a group because its generated label was too long;
that harness-only label was corrected. Evidence:
`/opt/utilibre/reports/spliit-public-20261009-ccf9e189-07c7-41b9-80e5-f6261cdd7469/`.
The application image, data schema, accountless access model and retention are
unchanged. The source offer includes the corrected timer unit and reusable check.
