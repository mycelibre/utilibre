# Deployment

Utilibre runs two named Compose projects on the application VM. Public DNS,
TLS, and routing remain on a separate Caddy edge VM. Application ports bind to
one exact private address and must not be reachable from the Internet or
unauthorized private hosts.

This guide assumes that the operator has already reviewed
[`configuration.md`](configuration.md), [`security.md`](security.md), and
[`backups.md`](backups.md).

## 1. Prepare configuration

From the repository root:

```sh
cp .env.example .env
chmod 600 .env
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
```

Set an exact `PRIVATE_BIND_IP`, the exact edge peer, real HTTPS public URLs,
and a public source URL for the deployed revision. Do not use wildcard bind
addresses. Keep Redlib's `privacy-frontends` profile disabled if it is not
intended for this host.

Prepare the additional project separately:

```sh
cd deployment/utilibre
cp .env.example .env
chmod 600 .env
./scripts/init-secrets.sh
docker compose config --quiet
cd ../..
```

Do not reuse environment files, project names, or secrets across the two
projects.

## 2. Preserve state before changing a live host

Before replacing an existing deployment, create and verify a backup of:

- FreshRSS application data and PostgreSQL database;
- PrivateBin ciphertext data;
- Anubis data and signing key;
- both private environment files and generated configuration; and
- the exact source revision and image references.

Do not delete old application data merely because its container was removed.
Archive or erase it deliberately under the applicable retention decision.

## 3. Start the root project privately

```sh
docker compose pull searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal searxng valkey redlib anubis
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

If Redlib is intentionally disabled, omit the profile and its two services.
The portal and SearXNG should remain independently usable.

## 4. Start the additional project privately

```sh
cd deployment/utilibre
docker compose pull
docker compose up -d postgres valkey rsshub freshrss privatebin
docker compose ps
./scripts/healthcheck.sh
cd ../..
```

RSSHub, PostgreSQL, and the additional Valkey must have no host-published
ports. RSSHub needs outbound access for intended operator-approved source sites
while remaining reachable from FreshRSS on the internal backend. Its stock
route set is not technically allowlisted. FreshRSS and PrivateBin bind only to
`APP_BIND_IP`.

Follow `deployment/utilibre/README.md` for first FreshRSS bootstrap and user
administration. Public registration and account requests remain closed until
the separate product, abuse, quota, backup, export, deletion, and retirement
workflow is published and the RSSHub/arbitrary-feed boundary is enforced or
explicitly contained.

## 5. Verify private exposure

On the application VM:

```sh
ss -lntp
docker compose ps
docker network ls
sh scripts/verify-network.sh
```

From the edge, each intended private listener should respond. From another
private host and a controlled external host, the same ports must time out or
be rejected. Confirm no listener exists for PostgreSQL, either Valkey, RSSHub,
Anubis metrics, or direct Redlib.

## 6. Configure the edge

Create only the retained routes:

- portal;
- SearXNG;
- Anubis/Redlib;
- FreshRSS; and
- PrivateBin.

Do not retain public routes or DNS records for removed applications. RSSHub is
internal and must not receive a route. Apply the method, body, header, timeout,
and trusted-client rules in [`edge-routing.md`](edge-routing.md).

## 7. Release gate

Before describing the deployment as public:

```sh
node scripts/validate-config.mjs --launch
docker compose config --quiet
sh scripts/check-health.sh
sh scripts/verify-network.sh
(cd portal && npm ci --ignore-scripts && npm run build && npm test)
(cd deployment/utilibre && docker compose config --quiet && ./scripts/healthcheck.sh)
```

Then complete [`launch-checklist.md`](launch-checklist.md) through the real
public hostnames. A private healthy listener or an old test result is not a
public release.

## 8. First-hours observation

Watch bounded service logs, container restarts, host disk/memory, database
growth, paste growth, search latency, Redlib media traffic, and RSSHub failures.
Do not log full queries, feed credentials, paste URLs, or Redlib paths merely
to make observation easier.

If one application misbehaves, remove its public route and catalog URL, then
stop it independently. Keep the rest of Utilibre available.
