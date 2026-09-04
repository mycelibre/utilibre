# Test record and verification guide

Historical passing results do not prove that the strategic-reset deployment
passes. Run the current suites and live checks after retired services, routes,
environment values, generated catalogs, and data have been removed.

## Repository checks

From `portal/`:

```sh
npm ci --ignore-scripts
npm run test:foss-policy
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit
```

From the repository root:

```sh
node scripts/validate-config.mjs
docker compose config --quiet
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

From `deployment/utilibre/`:

```sh
docker compose config --quiet
./scripts/healthcheck.sh
./scripts/status.sh
```

Use launch validation only with final production HTTPS origins and the exact
edge peer:

```sh
node scripts/validate-config.mjs --launch
```

## Catalog and policy assertions

Tests must prove that:

- the operated set is SearXNG, FreshRSS, Redlib, and PrivateBin;
- RSSHub is internal support and cannot become a public catalog/service URL;
- the intended RSSHub route set is described as policy, not a currently
  enforced allowlist;
- no removed or cancelled application remains in runtime configuration,
  status targets, routes, source registries, generated catalogs, or navigation;
- every hosted entry maps to an approved independent FOSS provider; and
- FreshRSS copy says operator-provisioned or request-process-not-yet-open,
  never open registration or currently available requests.

Search source and built output for retired service IDs and old endpoint names,
allowing only deliberately labeled historical legal attribution.

## Portal boundary tests

Verify:

- bilingual routes, metadata, language switching, and dictionaries;
- keyboard operation, focus, responsive layouts, enlarged text, and reduced
  motion;
- config/status success, failure, timeout, caching, and sanitized output;
- GET/HEAD-only static behavior, body rejection, header boundary, timeouts,
  missing-asset 404s, and localized unknown-route 404s;
- empty or invalid `SUPPORT_URL` removes donation navigation and content, makes
  both canonical donation paths and the Spanish alias real localized 404s, and
  emits recovery metadata instead of indexable donation metadata;
- a valid HTTPS `SUPPORT_URL` restores the bilingual page, homepage and shell
  links, external action, language mapping, and uncached Spanish alias;
- no arbitrary status target, generic proxy, upload, webhook, DNS, or media
  endpoint; and
- no ads, analytics, remote fonts, third-party scripts, or invented account
  access.

## Private deployment tests

Before adding public routes:

1. start only the retained services;
2. verify health and dependency order;
3. inspect published addresses and Docker networks;
4. confirm PostgreSQL, both Valkeys, RSSHub, Anubis metrics, and direct Redlib
   have no host listener;
5. check read-only roots, capabilities, users, tmpfs, logs, and resource limits;
6. restart each service and confirm intended persistent/ephemeral state; and
7. verify edge access plus rejection from unauthorized private/external hosts.

## Public functional checks

Use nonsensitive, authorized test data and keep load small.

### SearXNG

- submit one English and one Spanish query through the real edge;
- check result links, category behavior, pagination, and image proxying;
- verify configured diagnostics/general API formats are denied;
- verify rate limiting uses the sanitized visitor address; and
- confirm unique query markers do not appear in retained logs.

### Redlib and Anubis

- complete a fresh-browser challenge;
- confirm challenge and preference-cookie attributes;
- load one community/post and one small media Range request;
- test cancellation and local redirect-hardening cases;
- verify updater/health exceptions are exact; and
- confirm direct Redlib and metrics remain private.

Stop if the check would repeatedly hit Reddit or create material transfer.

### FreshRSS and internal RSSHub

- log in with a provisioned test account and confirm registration is closed;
- add/read/export/delete a harmless ordinary test feed;
- refresh one intended internal RSSHub route;
- verify user separation with two disposable test accounts before opening any
  request workflow;
- test import limits, API access if offered, logout/session behavior, and
  account deletion/export; and
- probe private/link-local/loopback/Docker-service URL handling and the stock
  RSSHub route surface in an isolated, authorized environment without
  contacting cloud metadata or third parties.

RSSHub must remain unreachable from the edge and unauthorized host networks.

### PrivateBin

- create, read, and delete a nonsensitive paste;
- confirm the browser fragment key is absent from server requests/logs;
- test each offered expiry and purge behavior;
- confirm oversized pastes and file uploads are rejected; and
- verify rate limiting without creating abusive traffic.

## Backup and restore checks

Run the additional backup, verify checksums, copy it to the intended encrypted
failure domain, and rehearse FreshRSS database, FreshRSS files, and PrivateBin
restores. A passing backup command without an isolated restore is incomplete
evidence.

## Removal assertions

The strategic reset is incomplete until tests show:

- no retired container starts or appears in `docker compose config --services`;
- no retired private port listens;
- no retired hostname routes at Caddy or resolves in DNS after the chosen
  retirement window;
- no old status check generates background traffic;
- RSSHub has no host/public route; and
- old persistent directories and backups were either deliberately retained
  under a documented window or deliberately erased—not silently abandoned.

## Recording results

Record date/time, exact Git revision, image IDs/digests, configuration mode,
commands, relevant sanitized output, failures, and unresolved risks. Mark a
check as unrun rather than inferring it from another layer. Do not publish
secrets, private addresses, user records, queries, feed credentials, paste
URLs, or Redlib browsing paths.
