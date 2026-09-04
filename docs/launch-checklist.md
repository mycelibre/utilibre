# Public launch checklist

This checklist covers the post-reset portal, SearXNG, Redlib, FreshRSS,
PrivateBin, internal RSSHub support, and the separate public edge. Check an
item only from current evidence on the exact release revision.

## Product and catalog

- [ ] The hosted set contains only SearXNG, FreshRSS, Redlib, and PrivateBin.
- [ ] RSSHub is described as internal FreshRSS support with an intended route
  policy that stock RSSHub does not technically enforce.
- [ ] Removed applications appear, if at all, only as clearly external
  recommendations or historical legal attribution.
- [ ] No cancelled application is described as pending, installed, or routed.
- [ ] English and Spanish service, account, privacy, limit, and external-link
  copy agree factually.
- [ ] FreshRSS is labeled operator-provisioned; no copy claims that account
  requests or registration are open.
- [ ] Donations unlock nothing and verified upstream support links remain
  visible where appropriate.

## Configuration and secrets

- [ ] Both Compose projects validate with their private environment files.
- [ ] Every public origin is HTTPS and points to the edge.
- [ ] Application listeners bind to one exact private address.
- [ ] The portal/SearXNG/FreshRSS/Anubis trust only the exact reviewed edge
  client-address path.
- [ ] SearXNG, Anubis, PostgreSQL, and FreshRSS secrets are generated,
  permission-restricted, backed up, and absent from repository/log output.
- [ ] The public source URL identifies the exact deployed revision and includes
  Redlib's local patch/build material.

## Containers and networks

- [ ] Only retained services appear in both effective Compose models.
- [ ] PostgreSQL, both Valkeys, RSSHub, Anubis metrics, and direct Redlib have
  no host/public port.
- [ ] RSSHub is reachable only on the internal backend network.
- [ ] Health checks, restart policy, rotated logs, resource/PID limits,
  capabilities, users, read-only roots, and tmpfs exceptions match review.
- [ ] No retired service container, image dependency, secret, network, or
  anonymous volume is required by the active topology.

## Edge and firewall

- [ ] DNS and Caddy contain only intended portal, search, Reddit, FreshRSS,
  and PrivateBin routes.
- [ ] Removed hostnames and the former public feed route no longer reach the
  application VM.
- [ ] Only the edge can reach the five retained private listeners; unauthorized
  private and external test hosts cannot.
- [ ] IPv6 does not create an alternate path.
- [ ] Caddy method/body/header/timeout rules match each application.
- [ ] Sensitive search queries, Redlib paths/cookies, FreshRSS credentials/feed
  URLs, and PrivateBin URLs are absent from retained access logs.

## Functional and security

- [ ] Portal bilingual, config/status, 404, no-JavaScript, accessibility, and
  responsive checks pass.
- [ ] Unknown portal APIs and all retired task endpoints remain 404.
- [ ] SearXNG English/Spanish queries, limiter, diagnostic denial, pagination,
  and query-log redaction pass.
- [ ] Anubis challenge, cookie, updater exceptions, Redlib page/media/Range,
  redirect hardening, and no-direct-port checks pass.
- [ ] FreshRSS login, feed refresh, export/deletion, registration-closed, and
  user-separation checks pass.
- [ ] FreshRSS arbitrary-feed fetching, internal-network access, and the stock
  RSSHub route surface are enforced or explicitly contained before any
  unrelated-user request pilot opens.
- [ ] One approved internal RSSHub route works and the service remains
  unreachable publicly.
- [ ] PrivateBin create/read/delete/expiry, roughly 2 MiB limit, file-upload
  denial, purge, and rate controls pass.

## Backups and continuity

- [ ] A current source/config/secrets backup is stored in an encrypted failure
  domain.
- [ ] FreshRSS database/files and PrivateBin data backup checksums pass.
- [ ] All three additional-stack restore rehearsals pass.
- [ ] Actual backup retention, operator access, account recovery, export,
  deletion, inactivity, incident, and service-retirement terms are documented
  before account requests open.
- [ ] Free disk/inodes, memory/swap, database size, logs, and egress have alert
  thresholds and an independent stop procedure per service.

## Final public check

- [ ] Current repository, portal, deployment, and edge tests pass on the exact
  release revision.
- [ ] Public paths work through Cloudflare and the edge; private-only paths do
  not.
- [ ] No response exposes secrets, internal targets, stack traces, or stale
  service IDs.
- [ ] The contact/abuse destination is real and monitored.
- [ ] The release record distinguishes measured facts, configured ceilings,
  planned account access, and untested assumptions.
