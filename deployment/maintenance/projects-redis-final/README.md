# Projects: remove the unused Redis Heroku example

Staged and verified **12 October 2026, 00:35:57 UTC**; not deployed by this
checker. Root release coordination owns the Compose pin and deployment.

- Parent: `utilibre-projects:455aa274-npm1121-security-20261011`,
  `sha256:6241eed79c9e9802ab7069dd34002a106771f1a169799b479709d7f3fd5acd8f`.
- Candidate: `utilibre-projects:455aa274-redis-example-security-20261012`,
  `sha256:97d35fe45c0657eab3151d1850a42f33aee2f46f9a48524d8f6977f39c901b18`.
- Application source remains La Suite Projects commit
  `455aa274b44e63efa42840997ea4924b43eed533` with the existing Utilibre patches.

## Why this changes real vulnerable bytes

The installed direct Redis client is already **3.1.1**. Both
`@sailshq/connect-redis` and `@sailshq/socket.io-redis` resolve that fixed
library. The deployed `REDIS_URL` is unset. However, the official Redis 3.1.1
npm tarball also includes a separate Heroku demonstration, with its own
Redis **3.1.0** dependency. That nested source is actually present; it is not
merely a stale version label.

The candidate removes **only** `/app/node_modules/redis/heroku/`: 45 files,
287,824 bytes. It retains the direct Redis implementation, package metadata,
MIT license, adapters, application code, browser bundles and configuration.
This does not alter live data, accounts, OIDC, limits or logging.

Sources:

- [Upstream advisory, CVE-2021-29469](https://github.com/redis/node-redis/security/advisories/GHSA-35q2-47q7-3pc3).
- [Official npm Redis 3.1.1 metadata](https://registry.npmjs.org/redis/3.1.1).
- [Exact vendor archive](https://registry.npmjs.org/redis/-/redis-3.1.1.tgz),
  SHA512 `42190a84ebb3868811d4d0c97c10f7e13409cf6649c03861202e999afa5fb6599f6128471d05e38cdb29009f99d871f937048155805581a9db899f1b8053078e`.

## Reproduce the bounded gate

```sh
python3 deployment/maintenance/projects-redis-final/check.py
```

The checker requires the exact parent tag and running parent image, verifies
the vendor archive's pinned SHA512, and compares all 60 published package
files against that archive before removal. It then builds without network
access and compares the entire exported parent and candidate images. All
**18,167 other files/symlinks** matched; no package metadata was rewritten.
The candidate keeps the native `node` image user and `./start.sh` command.
The release helper must additionally compare the complete image configuration
and normalized Compose configuration privately before applying its image-only
change; a filesystem hash alone does not establish those properties.

The native test starts fresh PostgreSQL and Projects on an isolated internal
Docker network with RAM-only synthetic data, no public port, no production
credentials and no container logs. It checks migrations, native login,
project/board/card creation, card editing, project deletion and anonymous API
denial. Both adapters still resolve Redis 3.1.1. Production's OIDC enforcement
is **not** disabled: the isolated fixture explicitly selects native password
login and blanks OIDC settings only for its disposable process. Earlier
fixture attempts inherited upstream's OIDC enforcement and correctly returned
403; the corrected fixture then passed. This is not a new live MFA/OIDC test.

The candidate's actual Trivy scan no longer finds CVE-2021-29469. It reports
zero critical and one high: `http-cache-semantics` 4.2.0,
CVE-2026-93748, with no reported fixed version. No vulnerability waiver is
created. Evidence is private under
`/var/lib/utilibre-maintenance/projects-redis-final-20261012/`.

Resource bounds: one CPU per temporary process container, 512 MiB application
and 256 MiB database, bounded tmpfs, eight-GiB root-disk floor. The image layer
adds deletion markers only; it does not recover physical space held by parent
layers. All synthetic containers/network/volumes are removed by the checker.

## Release and rollback

**Released at 00:38:59 UTC on 12 October.** The coordinator compared the
complete inherited image configuration and resolved non-image Compose settings,
then recreated only the application. Exact running image, native health, public
homepage, anonymous API denial and all required host firewall DROP rules passed.
No database restart or user-data change was performed. The private receipt is
`patch-leaves-final-20261012/release.json` in the maintenance directory.

Use the reviewed `../patch-leaves-final/release.mjs` coordinator after its
Projects entry is present, not an ad-hoc full-stack restart. It must pin this
exact candidate ID, verify the private passed native/parity receipt, compare
image configuration and Compose settings, and change only Projects' app
image. Preserve the existing Projects supervisor/firewall setup and check its
native health plus public anonymous-access boundary. Do not restart the DB
or replace any data directory. Retain the parent runtime image for rollback.

Rollback changes only the app image to the exact parent above, preserving the
current database, attachments and settings. It reintroduces the unused old
demo copy; record that security consequence and keep its finding open until
the corrected candidate is reapplied. No schema/data downgrade is needed.
Future full Projects builds must apply this same narrow final-image step
after installing Redis 3.1.1; a plain upstream npm installation reintroduces
the demo. Do not remove unrelated examples or libraries by a broad pattern.
