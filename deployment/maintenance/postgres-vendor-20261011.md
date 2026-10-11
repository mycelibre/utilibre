# PostgreSQL vendor-library release — 11 October 2026

All eleven production database containers passed sequential deployment and native
health checks. This updates libraries, **not the database engine or schema**.

| Engine | Containers | Exact local image ID |
| --- | --- | --- |
| 17.11 | 8 | `sha256:831b85f33a27b6dc9ae1130630e27fb51685189bfcc9128108cc9d8c4484fb72` |
| 16.15 | 3 | `sha256:7c810ed08d738599ab2533df64bf59d17fe204c16c12e0325de7e822d77da1b0` |

Tags: `utilibre-postgres:17.11-alpine-vendor-security-20261011` and the equivalent
`16.15` tag. Alpine libssl3/libcrypto3 are 3.5.9-r0; libuuid is 2.42.3-r1.
The entire `/usr/local` tree (including PostgreSQL) remains byte-for-byte equal
to its prior official image. Native user, entrypoint, environment and exposed
ports are unchanged. Source pins and the separate `/opt/utilibre/compose.yaml`
running definition match. No new listener, account rule or retention change.

Affected services: SimpleLogin, Spliit, LiberaForms, Pollaris, Rallly, Penpot,
Reactive Resume, the existing shared services database, records, projects and
Authentik. Application sign-in and content tests are separate from DB health.

## Gates and evidence

`Dockerfile.postgres-vendor-security` upgrades only signed Alpine vendor packages.
`check-postgres-vendor-security.mjs` checks engine identity and, in networkless
tmpfs fixtures, native SQL, Unicode, numeric/JSONB data, pgcrypto and uuid-ossp,
then dump/reopen. Every application database also passed a native logical dump
and isolated restore before its production container was recreated.

These restores omit ownership and ACL (`--no-owner --no-acl`). Native roles were
backed up separately, **not replayed**. Do not call this a full role/permission
restore or off-host disaster-recovery test. No dump was restored into production.
Reports and private dumps are under
`/var/lib/utilibre-maintenance/postgres-vendor-20261011/`; they are not source
assets and must never be published. The source checker is a dated one-shot gate:
its old-image/count assertions intentionally reject an already migrated fleet.

`release-postgres-vendor-security.mjs` binds the reviewed image IDs and the entire
resolved service configuration except `image`, limits changes to one service
at a time and verifies native health. Its failure handling verifies the old
image is healthy before describing rollback as successful.

## Rollback and limitations

Use the exact previous image reference from that service's private release
receipt, its original Compose file list and environment; replace only the
image and run `up -d --no-deps --no-build --pull never` for the DB service.
Check exact image identity, native health and the corresponding application.
The schema/engine did not change: **do not restore old data over newer work**
for an image-only rollback. Reconcile the canonical source pin afterward.

Retained gosu/embedded Go findings are not fixed by an OS-library layer. These
tests do not certify all PostgreSQL extensions or remove the remaining queue.
Vendor version evidence: the [Alpine 3.24 signed package repository](https://dl-cdn.alpinelinux.org/alpine/v3.24/main/x86_64/),
checked on 11 October. Exact prior base digests are pinned in the Dockerfile
and staging script; changed packages/image IDs require renewed verification.
