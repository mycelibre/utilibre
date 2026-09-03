# Update procedure

Production does not track floating tags and does not run an automatic updater.
Every update is an explicit review, backup, immutable pin, one-service change,
functional test, and documented rollback.

## Read-only review

```sh
cd /opt/utilibre
./scripts/update-check.sh
docker compose images
```

`update-check.sh` prints the current pins and official release/commit pages. It
does not scrape or silently decide which release is safe; the operator must
open the official upstream release notes, security advisories, container docs,
and migration notes. For RSSHub and VERT, review an exact commit because those
deployments did not have a suitable stable semantic release.

For a candidate image:

1. verify the namespace belongs to the official project;
2. verify the stable version is supported by the current PostgreSQL/runtime;
3. pull the human-readable tag;
4. resolve the platform's immutable digest with `docker image inspect` or
   `docker buildx imagetools inspect`;
5. inspect OCI source/revision/license labels;
6. compare the tag to the official source tag or commit;
7. review license changes and preserve corresponding source.

Never use a digest copied from an unrelated architecture without checking the
manifest. Never update Cobalt, SearXNG, or their dependencies as part of this
procedure.

## Standard single-image update

Supported by `update-apply.sh`: ntfy, BentoPDF, OmniTools, Healthchecks,
PairDrop, FreshRSS, PrivateBin, Wakapi, and Valkey. PostgreSQL, RSSHub, and VERT
are deliberately excluded.

```sh
cd /opt/utilibre
./scripts/update-apply.sh SERVICE 'official/image:VERSION@sha256:FULL_DIGEST'
```

The script:

- rejects an image without `@sha256`;
- stores a root-only pre-change Compose copy under `data/backups/`;
- runs the full backup;
- pulls the candidate;
- changes only the named service's image line;
- validates Compose;
- recreates only that service;
- performs a basic container health check;
- restores the old Compose and container when that check fails.

That health check is necessary but insufficient. Before accepting the update:

```sh
docker compose ps SERVICE
docker compose logs --tail=100 SERVICE
./scripts/healthcheck.sh
```

Then run the service's core operation, restart/persistence test when stateful,
private exposure check, and—after edge launch—public HTTPS/proxy test. Compare
Cobalt and SearXNG to their protected baseline. Update `SOURCE_MANIFEST.md`,
the tested-version documentation, and retained corresponding source in the
same reviewed change.

## RSSHub derived-image update

RSSHub is a local derived image with a narrow source patch. Do not pass RSSHub
to `update-apply.sh`: replacing its image line with an official upstream image
would silently remove the public-origin correction.

1. Review upstream changes and select an exact source commit and immutable
   official image digest whose OCI revision matches that commit.
2. Preserve the current derived image, Compose file, and corresponding source
   through the rollback window.
3. Rebase `config/rsshub/rsshub-public-origin.patch` onto the selected source
   tree and require `git apply --check` to pass.
4. Compare the selected image's `/app/dist/index.mjs` with
   `config/rsshub/patch-runtime.mjs`. Update the exact, fail-closed bundle patch
   point only when it implements the reviewed source change.
5. Change the base digest in both Compose and `Dockerfile.utilibre`, and use a
   new commit- and patch-specific local image tag. Never reuse a derived tag for
   different bytes.
6. Run the RSSHub static tests, validate Compose, and build without cache:

```sh
node --test tests/rsshub-public-origin.test.mjs
docker compose config --quiet
docker compose build --no-cache rsshub
docker compose up -d --no-deps rsshub
sh scripts/check-rsshub-public.sh
```

7. Publish the selected upstream tree, source patch, runtime patcher, Dockerfile,
   Compose integration, and update/rollback instructions at the configured
   public source URL before serving the modified revision over the network.

## VERT source update

VERT is a local source build and must never be converted to a moving-branch
build.

1. Read upstream commits and advisories; select one exact commit.
2. Run `./scripts/backup.sh` and preserve the existing source tree and local
   image ID.
3. Clone/fetch only <https://github.com/VERT-sh/VERT>, verify the selected
   commit, and check it out detached in a new staging directory.
4. Reapply only the documented deployment Dockerfile/build settings. Review
   every current upstream build variable; do not assume old names still work.
5. Review the non-AVX workaround. Keep `--ignore-scripts` only if current
   dependencies are lock-pinned and the production build/tests demonstrate
   optional lifecycle scripts remain unnecessary.
6. Build with a new revision-specific local image name and OCI source/revision
   labels.
7. Test locally with no analytics, Stripe, `vertd`, or external conversion
   endpoint and capture browser network activity.
8. Change Compose, validate, recreate only VERT, and retain the old image/source
   through the rollback window.

```sh
docker compose config --quiet
docker compose build --no-cache vert
docker compose up -d --no-deps vert
```

Publish the new corresponding source and Dockerfile before making the revision
available over the network.

## PostgreSQL updates

Patch updates within PostgreSQL 17 may use a reviewed immutable official image,
but still require logical backup, release-note review, clean shutdown, and a
database connectivity/application test. Do not use `update-apply.sh`.

A major-version update requires a separate migration plan (`pg_upgrade` or
logical dump/restore), free-space calculation, compatibility checks for every
dependent application, and a tested rollback. Never merely change `17` to a
new major against the existing data directory.

## Rolling upstreams and stale projects

- **RSSHub:** follow the derived-image procedure above. Record both the immutable
  base-image digest and its OCI source commit; a new `latest` digest is not
  automatically an approved update.
- **VERT:** record the exact source commit and locally built image ID/digest.
- **PairDrop:** its deployed release is old enough to warrant a maintenance
  review before each update decision. Do not jump to an unofficial fork.
- **Crab Fit:** remains deferred; an upstream commit alone is not approval to
  deploy it.

## Roll back an update

The standard updater reports the retained file:

```text
data/backups/compose-before-SERVICE-YYYYMMDD-HHMMSS.yaml
```

To roll back after a later functional failure:

```sh
cd /opt/utilibre
cp compose.yaml "data/backups/compose-failed-$(date -u +%Y%m%d-%H%M%S).yaml"
install -m 0644 data/backups/compose-before-SERVICE-TIMESTAMP.yaml compose.yaml
docker compose config --quiet
docker compose up -d --no-deps SERVICE
docker compose ps SERVICE
```

Use the backup/restore procedure only if the application migrated persistent
data incompatibly. Never delete the post-update data until the old application
and the preserved database/directory have been tested.
