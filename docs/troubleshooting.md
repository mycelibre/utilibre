# Troubleshooting

Start with bounded, read-only observations. Do not delete volumes, regenerate
secrets, weaken the firewall, expose an internal port, or restore data merely
to see whether a symptom disappears.

## Establish the scope

From the repository root:

```sh
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker stats --no-stream
docker compose logs --since=15m --tail=200
```

From the additional project:

```sh
cd deployment/utilibre
docker compose ps
./scripts/healthcheck.sh
./scripts/status.sh
docker stats --no-stream
docker compose logs --since=15m --tail=200
```

Check host disk/inodes, memory/swap, OOM/restart events, DNS, edge routing, and
firewall reachability. Redact credentials, queries, subscription URLs, paste
identifiers, and Redlib paths before sharing output.

## Portal missing or wrong services

Verify:

- the catalog contains only retained hosted entries and clearly external
  recommendations;
- `ENABLED_SERVICES` contains only the intended public hosted IDs;
- each enabled service has a valid public URL;
- `/_portal/config` exposes no internal destinations;
- `/_portal/status` reports only fixed retained targets; and
- the portal image was rebuilt after source/config changes.

A catalog record or old documentation does not create a route. Do not restore
removed environment variables to make a stale card work.

## Portal config/status failure

Test `GET /healthz`, `GET /_portal/config`, and `GET /_portal/status` from the
private listener and through the edge. Unknown portal API paths should return
404. Inspect the exact status target and private reachability; never broaden
the parser or add a generic URL parameter.

Repeated public status calls share a short in-memory check. Restarting the
portal clears that cache but should not be the first diagnostic step.

## SearXNG failure

Check SearXNG and root Valkey health, generated limiter configuration, secret,
base URL, exact trusted proxy, engine errors, and upstream DNS/HTTPS. Test one
small query rather than repeatedly hammering an external engine.

If results are sparse, distinguish an engine-specific CAPTCHA/block from an
application failure. Do not enable a large engine set to hide one failing
source. If queries appear in logs, remove the public route, preserve minimal
evidence, and review both upstream logging and the local redaction hook.

## Redlib or Anubis failure

Confirm that the private Redlib ingress reaches Anubis and direct Redlib has no
host port. Check Anubis key permissions, bbolt directory, target health,
trusted client header, challenge cookie, and edge Range/streaming behavior.

Then separate:

- challenge/edge misconfiguration;
- local Redlib startup or redirect-patch failure; and
- Reddit blocking, OAuth/client-emulation breakage, or upstream rate limits.

Do not add personal Reddit credentials or bypass the gate. If bandwidth or
blocking becomes unreasonable, remove the public route and stop Anubis/Redlib
while leaving the rest of Utilibre running.

## FreshRSS login or refresh failure

Check FreshRSS, PostgreSQL, filesystem ownership, public origin/proxy trust,
database credentials, and cron/refresh status. For one affected user, inspect
only the minimum account and feed metadata needed with authorization.

If ordinary feeds work but a curated internal feed fails, test RSSHub health
and the exact approved route from the FreshRSS network. RSSHub has no host
port; do not publish one for debugging. Check source-site changes, route errors,
cache health, and request timeouts.

Keep registration closed. Account requests are not open simply because the
login page is healthy. Before changing user data, create a backup and prefer
supported FreshRSS CLI/admin operations over direct database edits.

## PrivateBin failure

Check container health, data-directory ownership/free space/inodes, PHP/nginx
errors, edge body limit, and application traffic limiting. Use a nonsensitive
test paste and keep the full URL out of logs and issue reports.

If creation works but decryption fails, confirm the complete browser URL still
contains its fragment; the fragment never reaches the server. If purge fails,
inspect exact expired records and permissions before changing retention or
removing files.

## Database or disk pressure

Identify exact growth first:

```sh
docker system df -v
df -h /
df -i /
du -x -h --max-depth=2 deployment/utilibre/data
```

Inspect PostgreSQL database/table size through reviewed read-only queries and
check FreshRSS item retention, PrivateBin expiry/purge, logs, backups, and
image/build cache separately. Stop the affected public route if needed.

Do not use a broad Docker prune or recursive filesystem delete. Caches,
backups, live data, and unrelated projects have different removal rules.

## Restore failure

Run the checksum and `--rehearsal` path first. Do not restore into a live
service merely to diagnose an archive. Keep the helper's preserved pre-restore
database/directory until login, feed data, paste tests, and a new backup pass.

FreshRSS database and files must come from the same generation. PostgreSQL
major versions and application schemas must match the reviewed restore plan.

## Public route failure

Test in order:

1. container-local health;
2. application-VM private listener;
3. edge-to-private reachability;
4. Caddy host/path/method handling;
5. Cloudflare DNS/proxy state; and
6. public browser behavior.

Do not weaken every layer at once. Confirm removed hostnames stay absent and
that RSSHub, databases, caches, metrics, and direct Redlib remain unreachable.

## Safe service isolation

When one service threatens availability, remove its edge route or return a
maintenance response, then stop only that service. Account for dependencies:
SearXNG uses root Valkey; Redlib is paired with Anubis; FreshRSS uses
PostgreSQL and may use internal RSSHub; RSSHub uses additional Valkey.

Record the time, symptom, last known good pin, and exact action. Re-enable only
after private health, functional, exposure, privacy, and resource checks pass.
