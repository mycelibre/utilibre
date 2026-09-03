# Updates and rollback

Updates are deliberate, one service at a time. There is no unattended image updater and no floating `latest` tag. A tag names the reviewed upstream release; the digest fixes the exact tested image. Changing a tag without its matching digest does not update the deployed image.

## Before any update

1. Read the official release notes, security notices, deployment documentation, and license for the exact proposed release.
2. Check for renamed environment variables, database or cache migrations, changed health endpoints, changed container users, API response changes, and new outbound connections.
3. Confirm architecture support and inspect the multi-platform manifest.
4. Back up configuration and any genuinely required persistent data as described in `docs/backups.md`.
5. Record the current Git revision, resolved images, container image IDs, and health state.

Commands:

```sh
git status --short --branch
git rev-parse HEAD
docker compose config --quiet
docker compose config --images
docker compose images
docker compose ps
sh scripts/check-health.sh
sh scripts/backup.sh
```

Do not update from a dirty worktree until unrelated operator changes are understood and preserved. Do not print or archive expanded Compose output containing secrets.

For the locally built portal, retain a rollback tag before rebuilding:

```sh
docker image tag public-utility-portal:0.1.0 public-utility-portal:rollback-YYYYMMDD
```

If the current portal image name differs, obtain it with `docker compose images portal` and use that exact name.

## Update an upstream service

Use only its official release registry and documentation:

- [Cobalt repository and instance documentation](https://github.com/imputnet/cobalt)
- [SearXNG releases and deployment documentation](https://github.com/searxng/searxng)
- [Valkey releases](https://github.com/valkey-io/valkey)
- [Anubis releases and administrator documentation](https://github.com/TecharoHQ/anubis)
- [Redlib repository and deployment documentation](https://github.com/redlib-org/redlib)
- [rimgo canonical repository](https://codeberg.org/rimgo/rimgo)

Resolve the intended platform image and record both its immutable digest and release version. Edit `compose.yaml` deliberately. Also update the structured software catalog, `THIRD_PARTY_NOTICES.md`, and `docs/licenses.md` if version, license, source, behavior, or obligations changed.

Validate and pull only the selected service:

```sh
docker compose config --quiet
docker compose pull SERVICE
docker compose up -d --no-deps SERVICE
docker compose ps SERVICE
```

For pulled services, the repository helper performs the pull/recreate step but
does not choose a new version, back up, test, or roll back. Its explicit
`redlib` branch performs a local build/recreate instead; the source-review and
rollback requirements below still apply:

```sh
sh scripts/update.sh SERVICE
```

Because `compose.yaml` controls the pin, running that helper without first reviewing and changing a pin does not perform a major-version upgrade.

### Update Anubis

Anubis is an independent pinned image even though it is only a gate for
Redlib. Review the exact upstream release and request-target/security changes,
resolve the new immutable manifest digest, and compare the policy schema and
default imported policy before editing either the image or
`config/anubis/botPolicy.yaml`. Do not silently add remote Thoth dependencies,
stronger visitor proof-of-work, broad user-agent allows, or new
high-cardinality/debug metrics.

Back up the stable signing key, retain the previous image digest, then update
only the gate:

```sh
docker compose config --quiet
docker compose pull anubis
docker compose --profile privacy-frontends up -d --no-deps anubis
docker compose --profile privacy-frontends ps anubis redlib
```

In a fresh browser context, solve the challenge and verify the cookie, one
Redlib page, `/info`, both exact instance-updater user-agent patterns, the
request-target override-header regression, real-client attribution, metrics
non-exposure, and WARN-only bounded logs. Then restart only Anubis and confirm
the prior valid cookie remains accepted. A tag or healthy container alone is
not acceptance.

### Update the source-built Redlib service

Redlib is not a registry pull. It is a modified local image built by
`config/redlib/Dockerfile` from an exact official source archive/checksum, with
the tracked patch under `config/redlib/patches/`. Before changing it:

1. review official commits/releases, `Cargo.toml`, `Cargo.lock`, deployment
   flags/environment variables, OAuth/client emulation, TLS/browser emulation,
   cookies, logging, redirects, media delivery, and license changes;
2. update the full source commit and archive SHA-256 together;
3. rebase the local redirect patch, confirm `git apply --check`, and keep or
   strengthen its regression test;
4. review/pin the Rust builder and Ubuntu runtime digests;
5. change the local image tag so the old binary remains an unambiguous rollback
   target; and
6. update the portal catalog, notices, license inventory, privacy/security
   review, and published corresponding source.

Retain the current local image, build explicitly, and recreate only Redlib:

```sh
docker image tag public-utility-redlib:0.36.0-a4d36e9-p1 public-utility-redlib:rollback-YYYYMMDD
docker compose build --pull redlib
docker compose --profile privacy-frontends up -d --no-deps redlib
docker compose ps redlib
```

The Docker build executes the local Rust redirect regression test and a locked
release build. `pull_policy: never` prevents routine `up` from looking for this
local-only tag in a registry. After the build, run one health request, a small
community/post/media request, redirect probes, log inspection, source-offer
check, and resource/network observations. Do not repeatedly test against
Reddit or compensate for blocking with personal credentials.

For SearXNG, re-render and validate the limiter whenever trusted-proxy configuration changes:

```sh
node scripts/render-config.mjs
docker compose config --quiet
docker compose up -d --no-deps searxng
```

Valkey has no persistent volume: recreating or updating it clears all in-memory/tmpfs limiter state. Review release compatibility before a major version change, and avoid an unnecessary restart during an active abuse incident.

## Rotate the Cobalt gateway key

Rotate the matching pair after suspected disclosure, when an operator with
access leaves, or according to the operator's credential policy. Stopping both
consumers first prevents a mixed old/new-key window and immediately clears
Cobalt's in-memory tunnel tokens:

```sh
docker compose stop portal cobalt
task_rotation_stamp=$(date -u +%Y%m%dT%H%M%S.%NZ)
task_rotation_dir="secrets/rotation-${task_rotation_stamp}"
mkdir -m 700 -- "$task_rotation_dir"
mv -- secrets/cobalt-keys.json "$task_rotation_dir/cobalt-keys.json"
mv -- secrets/portal-cobalt-key "$task_rotation_dir/portal-cobalt-key"
node scripts/init-secrets.mjs
node scripts/validate-config.mjs
docker compose up -d --force-recreate cobalt portal
docker compose ps cobalt portal
sh scripts/check-health.sh
```

The generator creates one new UUID key and the exact reviewed service list; it
does not print the key. Verify an authenticated portal request and confirm that
an old key is rejected using an operator-controlled test that does not put
either key in browser code, a Caddyfile, command history, or a report. Keep the
quarantined pair accessible only long enough to support a tested rollback. If
rollback is necessary, stop both containers, quarantine the new pair under a
different exact directory, restore both old files together, run
`node scripts/init-secrets.mjs`, and recreate both containers.

After verification and any required encrypted audit/backup retention, destroy
the exact `task_rotation_dir` through the operator's approved secret-storage
procedure. Do not leave old pairs under `secrets/`, do not rotate only one file,
and do not use a wildcard or broad recursive path. A stopped/recreated Cobalt
process invalidates old tunnel state immediately; without a restart, normal
tunnel state can otherwise remain live for the configured lifespan.

## Update the portal and browser dependencies

Dependency versions are exact in `portal/package.json` and locked in `portal/package-lock.json`. From `portal/`, install named reviewed versions rather than running a broad update:

```sh
npm install --save-exact PACKAGE@VERSION
npm audit
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Review transitive license changes and the browser bundle. In particular, keep QR WebAssembly self-hosted and verify the no-upload browser tests after any tool-library or Vite change.

Build and replace only the portal after tests pass:

```sh
docker compose build --pull portal
docker compose up -d --no-deps portal
docker compose ps portal
```

The edge configuration does not need a reload for an implementation-only portal update unless hostnames, ports, headers, body limits, or routing behavior changed.

## Post-update checks

```sh
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker compose logs --tail=100 SERVICE
docker stats --no-stream
docker system df
```

Then test the affected public route through the edge. For Cobalt, test a single
short, authorized public item and verify that the media hostname still rejects
API POSTs. For SearXNG, make one ordinary interactive search and confirm the
limiter sees distinct client addresses through the trusted edge. For Redlib,
use a fresh browser to pass Anubis, load one small community/post, exercise a media Range request, and confirm
encoded/unencoded scheme-relative and backslash settings redirects stay on the
Redlib host. Do not stress third-party services.

Watch memory, CPU, disk, log growth, and temporary files through at least one active request. Confirm that no new port, volume, cookie, telemetry endpoint, credential requirement, or data-retention behavior appeared.

Commit the reviewed pins, lock file, catalog, and notices together. A release tag makes the rollback target unambiguous.

## Roll back one upstream service

Restore that service's previous tag and digest in `compose.yaml` from the known-good release or Git revision. If a related configuration schema changed, restore the matching configuration at the same time. Then:

```sh
docker compose config --quiet
docker compose pull SERVICE
docker compose up -d --no-deps SERVICE
docker compose ps SERVICE
sh scripts/check-health.sh
```

A digest-pinned old image can normally be pulled again while upstream retains it. For high-confidence maintenance, save the known-good image to encrypted operator storage before updating:

```sh
docker image save --output /SECURE_BACKUP_PATH/service-image.tar IMAGE_REFERENCE
```

Restore it with:

```sh
docker image load --input /SECURE_BACKUP_PATH/service-image.tar
```

Do not roll back across a persistent-data migration until the official upstream downgrade procedure has been reviewed. The current core stack has no portal database; SearXNG cache can be recreated, and Valkey contains limiter state rather than user content.

## Roll back the portal

Set `PORTAL_IMAGE` in `.env` to the retained rollback tag and recreate without rebuilding:

```sh
docker compose config --quiet
docker compose up -d --no-deps --no-build portal
docker compose ps portal
```

Alternatively, switch a clean worktree to a known-good signed/reviewed release, rebuild its exact lock file with `npm ci`, run its tests, and deploy it. Never use `git reset --hard` as an operational update procedure.

After the incident is resolved, restore `PORTAL_IMAGE` to the normal release tag before the next planned update.

## Roll back Redlib

Set `REDLIB_IMAGE` in `.env` to the retained exact local rollback tag, then
recreate without building or pulling:

```sh
docker compose config --quiet
docker compose --profile privacy-frontends up -d --no-deps --no-build redlib
docker compose ps redlib
sh scripts/check-health.sh
```

Restore the matching `config/redlib/` source-fetch recipe, patch, catalog, and
license/privacy documents in the public source revision at the same time. A
rollback binary without its corresponding modified source is not an acceptable
AGPL deployment state. Redlib has no database migration or volume to restore;
restart clears its process-local OAuth/device state.

To roll back Anubis, restore the previous image digest and matching policy from
the known-good revision, then recreate only `anubis`. Check the bbolt schema
and official downgrade notes first. The emergency direct-Redlib override at
`config/anubis/rollback.compose.yaml` is for diagnosis only: remove or close
the public edge route before using it, because it removes the challenge gate.
It preserves Redlib and Anubis state by default.

## Failed update response

If the new service is unsafe, corrupting data, consuming excessive resources, or making uncontrolled upstream requests, prefer unavailability over host instability:

```sh
docker compose stop SERVICE
```

Remove its public edge route for a prolonged outage, leave the high-level status as unavailable or maintenance, preserve bounded diagnostic logs, and complete the rollback offline. Do not weaken API authentication, private binding, SSRF checks, or firewall rules to make a failed update appear healthy.
