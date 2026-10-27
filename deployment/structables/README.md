# Structables

Operator-requested addition, 27 October 2026. Structables is Private.coffee's
complete AGPLv3 Instructables reader, version 0.4.5, source revision
`4f10ce078543685db88d8ed57606aaa14fae84d9` (19 October). Use the canonical
Forgejo repository: the GitHub mirror is older. No Instructables login or
personal token is used. Native public-site search key discovery is upstream
behavior, not a Utilibre credential service.

## Rebuild and verify

Run `sh deployment/structables/prepare.sh /absolute/new/candidate`.
It verifies exact source and integration hashes, applies the reviewed patch
without fallback, downloads only hash-pinned wheels, builds with networking
disabled, then runs offline tests. It never deploys. The existing daily
maintenance inventory reads the catalogue provider; the existing image scanner
covers running containers. No new scheduler or LLM is involved.

Python's official Alpine image is digest-pinned. Runtime dependencies are
Flask, BeautifulSoup, Markdown2, Gunicorn and their locked dependencies. The
only added processing dependency is [nh3](https://github.com/messense/nh3), an
MIT-licensed HTML sanitizer wrapping the established Ammonia sanitizer. It
cleans source HTML; it does not implement the reader. Dependency licences are
retained in package metadata; the original source LICENSE remains intact.

Check `test_policy.py`, then privately test the native Search form, a project
with numbered steps and pictures, the privacy page and representative narrow
layout. Inspect browser requests; no unrelated origins or automatic embeds
may load. Inspect one valid proxied image and forbidden proxy addresses. Do not
count a 200 page or an empty project grid as a successful reading workflow.
Scan the exact candidate image using the existing private security database;
record its identity/date and do not call an archived scan current clearance.

## Scope of the local changes

- `upstream.patch`: route all upstream fetches through `safe_http.py`, bound
  native JSON cache entries to 32/worker and reuse to 15 minutes, sanitize
  upstream HTML through nh3, and remove request-bearing traceback output.
- `safe_http.py`: HTTPS host allowlist, no environmental proxy or redirects,
  ten-second socket timeout, eight-MiB response bound. Exact known upstream
  hosts only; no arbitrary host fetches or visitor headers are forwarded.
- `wsgi.py`: native Flask/Gunicorn integration, HTML sanitizer, narrow method
  and form limits, CSP, no-referrer/noindex, safe media download headers,
  health and fixed corresponding-source routes. Public cron and frame routes
  are disabled. The native theme script is hash-authorized; no telemetry.
- `privacy.md`: uses the upstream-supported policy file, with catalogue and
  exact-source links. Native upstream identity and notices remain.

## Deployment and public edge

Reserved backend port: **3242**. Intended URL:
`https://structables.utilibre.org/`. Edge routing is on the separate Caddy VM.
Use the Caddyfile here, setting its existing `UTILIBRE_APP_IP` environment
variable. Keep global access/error logging exclusions in place. DNS already
resolves through the existing Cloudflare setup; TLS must be checked after
the site block is installed. The portal remains non-launchable until both the image-retrieval and edge checks pass.

Validate with `docker compose --env-file .env -f deployment/structables/compose.yaml config --quiet`.
The service binds only `PRIVATE_BIND_IP`; no wildcard, database or cache port.
Use the existing edge-only firewall policy. Runtime budget: 384 MiB, one CPU,
64 PIDs, two synchronous Gunicorn workers, backlog 16 and 35-second worker
timeout. These are safety limits, not a capacity promise. `/healthz` makes no
upstream query. Media caching is disabled; JSON memory is ephemeral, with no
content backup. Browser history/downloads/theme and source-provider retention
are separate. No registration or uploads are offered.

Before exposing the route, publish the complete reviewed `source` tree plus
Dockerfile, requirements.lock, upstream.patch, safe_http.py, wsgi.py, tests,
prepare script, input hashes, compose config, policy and this README as
`/opt/utilibre/toolbox-public/structables-utilibre.tar.gz`. Do not include the
private evidence directory, `.git`, secrets, runtime state or fetched content.
The native policy page links `/utilibre-source/structables-utilibre.tar.gz`.

Portal integration: `publicStructablesUrl` / `PUBLIC_STRUCTABLES_URL`, stable
ID `structables`, Search and reading group, bilingual task/help and guide.
Add the ID to `LISTED_SERVICES`; add to `ENABLED_SERVICES` only after public
verification. Search terms in native GET pagination can appear in browser
history; no-referrer and request-log suppression prevent extra disclosure.

## Rollback

Stop only this compose project and remove its enabled ID/edge block. There is
no account data, migration or persistent content to restore. Keep the archive
and image receipt for audit. Do not prune other images or modify the existing
SearXNG/Priviblur deployments. If upgrading, retain the previous image and
config and repeat the native search/image/privacy checks before switching.

## Evidence

Private evidence directory:
`/var/lib/utilibre-maintenance/structables-20261027/`. The final public-facing
state and unresolved checks are recorded in `docs/records/structables-2026-10-27.md`. Do not publish
raw upstream HTML, IP-bearing headers or browser captures as audit artefacts.
