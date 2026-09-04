# Update procedure

Review official release notes, migration notes, and security advisories before
changing any immutable image pin. Never replace a digest with `latest`.

## FreshRSS, PrivateBin, and Valkey

The guarded updater accepts these three services:

```sh
cd /opt/utilibre
./scripts/update-check.sh
./scripts/update-apply.sh freshrss docker.io/freshrss/freshrss:<tag>@sha256:<digest>
```

It creates a configuration copy, runs a data backup, validates the repository
name/digest, recreates one service, and rolls back its Compose pin if health
fails. Run the full health script and a functional user check afterward.

## PostgreSQL

PostgreSQL major updates require a fresh backup, restore rehearsal, upstream
migration review, and a separate change window. Do not pass PostgreSQL to the
single-image updater.

## RSSHub

RSSHub is private FreshRSS support infrastructure and uses an unmodified
upstream image. Review the exact upstream source revision and digest, update the
pin manually, and verify that it still has no `ports` entry. Its only networks
must be the internal backend and dedicated `rsshub-egress` network. Recreate it
with:

```sh
docker compose up -d --no-deps rsshub
./scripts/healthcheck.sh
```

Never reintroduce the retired public-origin patch, public hostname, host port,
frontend network, or portal entry as part of an update.
