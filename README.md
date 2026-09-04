# Utilibre

Utilibre is a bilingual English/Spanish public utility that operates a small
set of useful Free and Open Source Software for people who would otherwise
need to run their own server or pay for a hosted account.

The project contributes public operation: installation, configuration,
maintenance, security boundaries, and plain-language data-flow documentation.
It does not operate an application merely because a Docker image exists or
because another copy would make the catalog look larger.

Use is free. There are no advertisements, behavioral analytics, premium
features, donor-only features, or preferential limits. Donations are optional
and unlock nothing. Visitors who can afford an upstream project's official
hosting are encouraged to support the developers who made the software.

Every operated capability must satisfy the access-gap, FOSS, safety,
sustainability, export, and deletion requirements in
[`FOSS_POLICY.md`](FOSS_POLICY.md).

This repository was developed with extensive assistance from OpenAI Codex,
including code, configuration, tests, documentation, and frontend work. No
independent human audit is claimed. See
[`TRANSPARENCY.md`](TRANSPARENCY.md).

## Current service shape

The strategic reset keeps the operated set deliberately small:

| Scope | Current direction |
| --- | --- |
| Public portal | Bilingual discovery, service boundaries, project information, and high-level status. |
| SearXNG | Retained as independently operated, decentralized search infrastructure. |
| FreshRSS | Retained as a persistent feed reader. Accounts remain provisioned-only until a documented request workflow is ready. |
| Redlib | Retained conditionally behind its anti-bot gate while it remains useful and operable. Reddit may block the upstream technique without notice. |
| PrivateBin | Retained as an ancillary browser-encrypted paste service. |
| RSSHub | Internal FreshRSS support with no public route. Its intended operator-approved route set is not yet technically allowlisted. |
| Internal dependencies | Valkey, PostgreSQL, and the Redlib gate are not public products or directly exposed databases. |

The repository records this scope as of 2026-09-03. A service is public only
when the deployed configuration, edge route, and current checks all agree;
documentation alone does not make it available.

## Access model

Anonymous services remain available without accounts where their upstream
design and abuse controls permit it. Persistent personal services are moving
toward free, request-based accounts with transparent quotas, export and
deletion, and a published inactivity and retirement policy.

That direction is not a claim that requests are already open. FreshRSS access
remains operator-provisioned until the request channel, capacity limits,
backups, RSSHub/arbitrary-feed boundary, and user-facing terms are ready.

## Architecture

```text
Internet
   |
Cloudflare
   |
separate Caddy edge VM (DNS, HTTPS, public routing)
   |
operator-controlled private network
   |
application VM
   +-- portal
   +-- SearXNG + private Valkey
   +-- Anubis -> Redlib
   +-- separately managed application stack
       +-- FreshRSS + PrivateBin
       +-- internal RSSHub support + PostgreSQL/Valkey where required
```

Application listeners bind to an exact private address. Databases, caches,
metrics, and administrative ports are not exposed. Public TLS and routing are
managed on the separate edge VM.

See [architecture](docs/architecture.md), [services](docs/services.md),
[privacy](docs/privacy.md), and [security](docs/security.md) for the current
boundaries.

## Private core preview

Requirements: Docker Engine with the Compose plugin, Git, curl, OpenSSL, a
POSIX shell, and Node.js 24 or newer. After reviewing `.env.example`:

```sh
node scripts/init-private-preview.mjs PRIVATE_BIND_IP
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
docker compose pull searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal searxng valkey redlib anubis
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

Replace `PRIVATE_BIND_IP` with one exact private address assigned to the
application VM. This preview is plaintext HTTP for trusted private clients;
it is not the public launch path.

FreshRSS, PrivateBin, and their private support services use the separate
definition under [`deployment/utilibre/`](deployment/utilibre/README.md).
Do not mix the two Compose project names or environment files.

## Documentation

| Topic | Document |
| --- | --- |
| Product purpose | [PRODUCT.md](PRODUCT.md) |
| Admission policy | [FOSS_POLICY.md](FOSS_POLICY.md) |
| Current services | [docs/services.md](docs/services.md) |
| Configuration | [docs/configuration.md](docs/configuration.md) |
| Architecture and data flow | [docs/architecture.md](docs/architecture.md) |
| Deployment and edge routing | [docs/deployment.md](docs/deployment.md) and [docs/edge-routing.md](docs/edge-routing.md) |
| Security and privacy | [docs/security.md](docs/security.md) and [docs/privacy.md](docs/privacy.md) |
| Testing and launch | [docs/testing.md](docs/testing.md) and [docs/launch-checklist.md](docs/launch-checklist.md) |
| Backups, updates, and troubleshooting | [docs/backups.md](docs/backups.md), [docs/updates.md](docs/updates.md), and [docs/troubleshooting.md](docs/troubleshooting.md) |
| Licenses and exact upstream sources | [docs/licenses.md](docs/licenses.md), [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md), and [deployment/utilibre/SOURCE_MANIFEST.md](deployment/utilibre/SOURCE_MANIFEST.md) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |

## License

Copyright © 2026 Mycelibre contributors. Original portal, integration,
deployment, and documentation work is licensed under AGPL-3.0-or-later; see
[`LICENSE`](LICENSE). Upstream applications retain their own licenses and
copyrights. The Utilibre identity assets under `portal/public/brand/` are
excluded from the AGPL grant. See [docs/licenses.md](docs/licenses.md).
