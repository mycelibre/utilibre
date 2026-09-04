# Adding a backend service or privacy frontend

Backend additions have public abuse, privacy, bandwidth, license, and upstream
compatibility consequences. The existence of a Docker image is not a reason to
deploy it. Start with current official documentation and the canonical source
repository.

The non-negotiable admission rule is in [`FOSS_POLICY.md`](../FOSS_POLICY.md):
the capability provider must be a complete, independently maintained,
self-hostable FOSS application, and Utilibre's operation must remove a real
access barrier. A library, browser API, original Utilibre implementation, or
merely source-available project does not qualify.

## 1. Pass the viability gate

Record and verify:

- upstream application, independent maintainer, complete self-hosting path,
  and distinct public value;
- the stable project-operated hosted offering, its permanent free tier and
  practical limits, and why a clearly labeled external link would not solve
  the access problem;
- active maintenance, exact release/commit, supported official deployment,
  image registry/digest, architecture support, and license;
- required database/cache, credentials, cookies, tokens, accounts, or private
  APIs;
- English and Spanish interface support and limitations;
- idle and active CPU/RAM/disk, temporary storage, database growth, ingress and
  egress, and likely crawler/bulk-use patterns;
- page, API, media, redirect, and download data flows;
- upstream blocking/hostility, terms, legal concerns, and public-instance
  reliability;
- SSRF, open-proxy, arbitrary redirect, oversized-response, registration,
  scraping, and relay risks; and
- multi-user separation, export, deletion, account recovery, inactivity,
  backup, and retirement behavior where the application stores user data.

Defer the service if it needs personal account cookies, unofficial credential
workarounds, fragile evasion, an unreasonable bandwidth budget, or a bundled
general reverse proxy that cannot be cleanly omitted. Do not silently replace
it with an unreviewed fork.

Redlib is the one current operator-approved exception to the unofficial-
credential-workaround rule. Its Android OAuth/client identity and browser/TLS
emulation, local security patch, possible Reddit blocking, and English-only UI
are disclosed throughout the repository. That exception is not precedent for
quietly admitting another evasion-based frontend: any new exception requires
the same explicit operator decision and complete public documentation.

## 2. Design the network boundary

The existing edge Caddy VM remains the only TLS terminator and general reverse
proxy. The application VM must not gain Caddy, nginx, Traefik, Apache HTTP
Server, HAProxy, host networking, a Docker-socket mount, or a public wildcard
binding.

For an approved service:

- use an official image pinned to both an immutable version and digest;
- publish only its required HTTP port with Compose long syntax: set `target` to
  the container port, `published` to `${SERVICE_PORT}`, and `host_ip` to the
  required `${PRIVATE_BIND_IP}`. Long syntax keeps raw IPv6 addresses
  unambiguous; never omit `host_ip`;
- never publish database, cache, metrics, debug, or administration ports;
- put internal-only state on a separate Docker network where useful;
- allow outbound Internet access only when the service legitimately contacts
  upstream platforms;
- trust forwarded client headers only from the exact `EDGE_PROXY_IP`;
- design the edge route explicitly, including paths/methods, streaming, Range,
  body limit, timeouts, health path, crawler headers, and client-IP needs;
- add firewall policy examples and an external exposure test, but do not alter
  the host firewall automatically.

An API, feed, or media service should expose the narrowest useful public route.
RSSHub is intentionally internal FreshRSS support and its generic route
surface is not a public product. Stock RSSHub does not enforce the intended
operator-approved route set, so that gap remains an unrelated-user account
gate. Do not create a generic proxy endpoint.

## 3. Add Compose configuration conservatively

Update `compose.yaml` and `.env.example` together. Use a profile such as
`optional` when deployment remains conditional. Configure, where compatible:

- non-root execution from the official image;
- `no-new-privileges`, dropped capabilities, read-only root filesystem, and a
  bounded `tmpfs`;
- a real application health check and restart policy;
- CPU, memory, and PID limits derived from private measurements;
- `json-file` log rotation using the shared bounded settings;
- only required volumes, with temporary/user content excluded from persistent
  storage;
- readiness through health checks rather than `depends_on` alone.

Do not apply hardening blindly. If an official image needs a writable path,
specific capability, or default user, document the narrow exception and test
it. Do not add Redis/Valkey, a database, or a queue unless the supported
deployment genuinely requires it.

Put nonsecret placeholders in `.env.example`; use an ignored file-based secret
when upstream supports it. Never commit resolved domains, private addresses,
keys, tokens, database passwords, or personal credentials.

## 4. Integrate the public portal

First add the approved provider and its license evidence to
`portal/src/catalog/upstreams.ts`. Then add a complete service entry to
`portal/src/catalog/catalog.ts`, including:

- stable ID, bilingual name and description, and category;
- the exact upstream project name and official source URL, rendered visibly so
  a task-oriented label cannot imply that Utilibre created the application;
- public hostname/config key and operational state;
- every applicable `SERVER`, `PROXY`, and `EXTERNAL` label;
- an observed concise flow such as
  `Browser → edge → application service → upstream`;
- upstream recipients, upload behavior, temporary storage, retention, logs,
  cookies/local storage, license, exact version, official source, and
  modification status;
- a bilingual deferral or limitation when the service is not deployed.

The current service-card selection in `portal/src/pages/pages.ts` is explicit;
add the new entry there. If it has a configurable URL, update all of:

- `PublicConfig` and defaults in `portal/src/config.ts`;
- the sanitized `/_portal/config` allowlist in `portal/server/server.mjs`;
- the portal environment in `compose.yaml`;
- `.env.example`;
- the catalog `configUrlKey` mapping.

If public status is supported, add only a fixed internal health URL to
`STATUS_SERVICES`. The server parser permits simple Docker hostnames and is not
a generic scanner. Keep public status high-level; never expose container names,
internal addresses, database detail, stack traces, or utilization.

Add English and Spanish strings for all portal integration text. An upstream
interface may use its own localization when officially supported; document any
limitation rather than forking it solely to imitate the portal.

Follow `docs/copy-style.md`: descriptions lead with the visitor's task, name
the upstream project, and identify Utilibre as host where useful. Controls,
states, errors, limits, privacy facts, and recovery stay literal. Spanish uses
neutral wording, `« »` quotations, and “software libre” for libre-licensed
projects.

## 5. Update operational and legal records

In the same change, update:

- `docs/architecture.md` and `docs/edge-routing.md`;
- `docs/firewall.md`, `docs/security.md`, and `docs/privacy.md`;
- `docs/resource-usage.md`, `docs/backups.md`, and troubleshooting steps;
- `THIRD_PARTY_NOTICES.md`, `docs/licenses.md`, and the public Software page;
- configuration README under `config/SERVICE/`;
- status, disable, update, rollback, and complete-removal procedures.

If AGPL-covered upstream source is modified and offered over a network, publish
the complete corresponding modified source and build/install scripts, identify
the changes and date, and link the exact fork from the public Software page.

## 6. Test privately before adding an edge route

Start on the exact private bind address only. Verify:

```sh
docker compose config --quiet
docker compose pull SERVICE
docker compose up -d SERVICE
docker compose ps SERVICE
docker compose logs --tail=100 SERVICE
sh scripts/verify-network.sh
ss -lntp
docker stats --no-stream
```

For a profiled service, add `--profile PROFILE` to each applicable Compose
command. Keep the profile disabled in the normal core command until the
service has passed this gate.

Then perform small, authorized functional tests without stressing an upstream.
Test startup, health, shutdown, restart, dependency failure, log rotation,
temporary cleanup after success/failure/cancellation/restart, and low-disk
behavior. Measure idle and active CPU/RAM/disk/network rather than copying an
estimate into production limits.

Security tests must cover applicable private IPv4/IPv6 and loopback URLs,
unusual schemes, credentials and ports in URLs, malformed input, redirect
chains, oversized/repeated requests, arbitrary origins, missing/invalid auth,
open redirects, and direct API access. Do not attack a third-party platform.

From the edge VM, confirm health is reachable. From another private host and a
controlled external host, confirm the application port is not. Only after that
should the operator apply and validate the documented Caddy mapping manually.

## 7. Observe and promote—or defer

Keep a newly added service out of public instance directories. Begin with
conservative limits and a documented way to stop it independently:

```sh
docker compose stop SERVICE
```

Promote an optional service only after its access-gap case, compatibility,
abuse controls, localization, logs, retention, resource use, export/deletion
behavior, and data flow match the catalog.
If a provider blocks the VM or the service becomes unstable, remove its portal
URL/card and edge route, mark it deferred, and keep the rest of the utility
working.
