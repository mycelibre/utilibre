# Rollback

Rollback targets only the new `utilibre-services` project. It must not stop,
recreate, rename, reconfigure, or disconnect Cobalt, SearXNG, Redlib, the
existing portal, their images, volumes, or networks.

## Fast service isolation

```sh
cd /opt/utilibre
docker compose stop SERVICE
```

This is the first response to an abusive, compromised, or resource-exhausting
service. Remove or comment only that service's edge site block separately.

## Stop the new stack and preserve everything

```sh
cd /opt/utilibre
./scripts/rollback.sh stop
```

To remove only the new containers and project networks while preserving all
bind-mounted data:

```sh
./scripts/rollback.sh --remove-containers
```

The script has no data-purge mode. Do not add `-v`, prune volumes/images, or
run cleanup against an unresolved path.

## Edge rollback

At the time of initial private deployment, the generated edge file was not
applied. Public routes were added later. To roll them back:

1. back up the real edge Caddyfile;
2. remove only the site blocks copied from
   `edge/Caddyfile.utilibre-apps`—never touch existing Cobalt/SearXNG blocks;
3. run `caddy fmt` and `caddy validate` on the edge VM;
4. reload Caddy rather than restarting it;
5. test existing Cobalt and SearXNG public routes immediately.

DNS records may be left temporarily pointing at the edge if their site blocks
return a deliberate maintenance response, or removed through the established
DNS process. Do not guess provider credentials.

## Portal rollback

The service entries are now incorporated into the live portal. Before rolling
one back, back up the exact portal source and current image, remove only that
service's catalog and public-configuration entry with the portal's normal build
process, rebuild and recreate only the portal container, and verify the English
and Spanish catalog, status page, and remaining launch links.

## Configuration/image rollback

For a single update, restore the root-only
`data/backups/compose-before-SERVICE-TIMESTAMP.yaml` as described in
`UPDATE-PROCEDURE.md`, validate Compose, and recreate only that service.

If a data migration occurred, keep both versions of the data and follow
`BACKUP-RESTORE.md`. Do not point an older application at a newly migrated
database unless upstream explicitly guarantees compatibility.

## Recoverable return to the pre-deployment host state

This procedure disables the new stack without deleting it:

```sh
cd /opt/utilibre
./scripts/rollback.sh --remove-containers
systemctl disable --now utilibre-backup.timer
stamp=$(date -u +%Y%m%d-%H%M%S)
mv /opt/utilibre "/opt/utilibre.disabled-$stamp"
```

Keep the disabled directory until Cobalt/SearXNG regression checks, DNS/edge
rollback, and any required data export are complete. Moving it is recoverable;
deleting it is not.

The 4 GiB swapfile was added as general host safety headroom. It does not expose
a network service and may sensibly remain. If a strict pre-deployment rollback
requires removal, first confirm no swap is in use, run `swapoff /swapfile`,
remove only the exact `/swapfile` entry from `/etc/fstab`, remove the dedicated
Utilibre sysctl file if no other workload relies on it, and only then delete the
exact swapfile. Do not automate those destructive steps.

Systemd unit removal is similarly manual: remove only the exact
`utilibre-backup.service` and `utilibre-backup.timer` files after disabling
them, then run `systemctl daemon-reload`.

The ntfy firewall has a separate, recoverable rollback. Keep `/opt/utilibre/.env`
available so the helper can identify the exact installed rule, then run:

```sh
systemctl disable --now utilibre-ntfy-firewall.service
/usr/local/sbin/utilibre-ntfy-firewall remove
```

`ExecStop` already performs the removal; the second command is an idempotent
check. Confirm that `utilibre-ntfy-edge-only` is absent from `DOCKER-USER`
before restoring a prior reviewed helper/unit or leaving the current files
disabled. If `.env` is missing or invalid, restore its exact prior root-only
copy first—the helper deliberately will not guess which firewall rule to
remove. Remove installed files only as a separate maintenance action after
preserving them, then run `systemctl daemon-reload`.

## Rollback validation

After any rollback:

- confirm ports 2586 and 3101–3109 have the intended state;
- confirm no new listener appears on `0.0.0.0` or `::`;
- confirm PostgreSQL 5432 and Valkey 6379 were never published;
- compare Cobalt and SearXNG container ID, image, `StartedAt`, networks, ports,
  health, and public HTTP behavior with the protected preflight snapshot;
- preserve rollback logs and the last good backup.
