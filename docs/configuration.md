# Configuration reference

Utilibre has two application-VM Compose projects and a separately managed
public edge. Keep their environment files and commands distinct.

| Scope | Definition | Private configuration |
| --- | --- | --- |
| Portal, SearXNG, and Anubis/Redlib | repository root | root `.env`, copied from [`.env.example`](../.env.example) |
| FreshRSS, PrivateBin, internal RSSHub, PostgreSQL, and private Valkey | [`deployment/utilibre/`](../deployment/utilibre/README.md) | `deployment/utilibre/.env`, copied from its `.env.example` |
| Public DNS, HTTPS, and routing | separate Caddy edge VM | edge-owned configuration; reviewed fragments live under `deployment/utilibre/edge/` |

Never commit either `.env`, generated secrets, private addresses, database
contents, paste data, logs, or backup archives. Keep environment files mode
`0600`. Do not paste expanded `docker compose config` output into an issue; it
can contain secrets.

## Requirements

- Linux with one stable application-VM address reachable from the edge but not
  directly from the public Internet;
- Docker Engine and the Compose plugin;
- Git, curl, OpenSSL, `ss`, and a POSIX shell;
- Node.js 24 or newer for portal builds, tests, and root configuration scripts;
- outbound DNS/HTTPS for image pulls and legitimate application requests; and
- a separate edge VM and public DNS names for production.

No GPU is required. Capacity must be measured under the intended SearXNG,
Redlib, FreshRSS, RSSHub, and PrivateBin workload rather than inferred from an
old deployment snapshot.

## Root `.env`

The complete nonsecret template is [`.env.example`](../.env.example). Important
groups are:

| Settings | Purpose |
| --- | --- |
| project name, language taglines, and `DEFAULT_LANGUAGE` | Public identity and bilingual fallback |
| source, contact, and optional support URLs | Verified public project destinations; empty optional links stay hidden |
| `PRIVATE_BIND_IP` and `EDGE_PROXY_IP` | Exact application listener and trusted edge peer; never wildcards or subnets |
| private-preview switches | Trusted private HTTP preview only; production requires edge-proxied mode |
| public SearXNG and Redlib URLs | Browser-visible origins for the retained core applications |
| FreshRSS and PrivateBin URLs | Links to the separately managed application stack |
| `ENABLED_SERVICES` | Public catalog/status set; enable only retained services with real routes |
| `SEARXNG_SECRET` and Anubis key | Locally generated secrets; never browser-visible |
| CPU, memory, PID, tmpfs, and log settings | Conservative resource ceilings based on measurement |

Redlib requires both its enabled service ID and the `privacy-frontends`
profile. Removing either is not a complete public retirement; also remove the
edge route and portal URL.

For a private preview:

```sh
node scripts/init-private-preview.mjs PRIVATE_BIND_IP
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
```

For production, set final HTTPS origins and one exact edge peer, render the
SearXNG limiter, and run the launch validation:

```sh
node scripts/render-config.mjs
node scripts/validate-config.mjs --launch
docker compose config --quiet
```

These commands do not modify the separate edge VM.

## Additional stack `.env`

The second template is
[`deployment/utilibre/.env.example`](../deployment/utilibre/.env.example). Its
principal settings are:

- `APP_BIND_IP`, the exact private IPv4 listener address;
- `EDGE_PROXY_IP`, the exact edge source address;
- private ports for FreshRSS and PrivateBin;
- PostgreSQL and FreshRSS secrets generated locally; and
- the initial FreshRSS administrator credentials used by the documented
  bootstrap process.

RSSHub and both databases/caches have no public URL or host port. Do not add a
public RSSHub origin merely to preserve an old hostname.

Prepare the second project from its own directory:

```sh
cd deployment/utilibre
cp .env.example .env
chmod 600 .env
./scripts/init-secrets.sh
docker compose config --quiet
./scripts/healthcheck.sh
```

The initializer refuses unsafe partial secret state. Follow the deployment
README for bootstrap and account administration. FreshRSS remains
operator-provisioned; these settings do not open a public request workflow or
registration.

## Sources of truth

- public catalog and data boundaries: `portal/src/catalog/catalog.ts`;
- provider, source, license, and review state:
  `portal/src/catalog/upstreams.ts`;
- root defaults: [`.env.example`](../.env.example);
- additional defaults: `deployment/utilibre/.env.example`; and
- exact additional-stack artifacts:
  `deployment/utilibre/SOURCE_MANIFEST.md`.

Documentation may summarize these files, but only the deployed runtime and
edge configuration determine actual availability.
