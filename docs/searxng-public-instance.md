# SearXNG public-instance migration

## Current routing gate, 12 October 2026

The 19:11 UTC read-only Cloudflare DNS-configuration check found both the A and
AAAA records for `search.utilibre.org` set to `proxied=true`. Public search
HTTPS therefore passes through Cloudflare before the Caddy edge. The earlier
DNS-only/direct-TLS observation is historical. **The listing's final-webserver
control requirement is currently unmet**; working searches or a prior waitlist
entry do not establish present eligibility. This check changed no DNS or edge
configuration and sent no message to the maintainers.

Sanitized configuration evidence:
`/opt/utilibre/reports/cloudflare-dns-recheck-20261012T1912Z.json`.

## Historical application and submission checks

On 2026-10-06, [request 941](https://github.com/searxng/searx-instances/issues/941)
was on the maintainer's two-week waitlist. The operator had moved search to
DNS-only/direct TLS at that checkpoint. The application was updated on 2026-10-07 to
`2026.10.7-6671d89be`, pinned by
digest through `SEARXNG_IMAGE`. English and Spanish browser searches pass through
the real HTTPS Caddy route using its private address and normal certificate
verification. At that checkpoint public IPv4 timed out from this application VM
and it had no IPv6 route; that vantage could not independently establish public
uptime. IPv6 connectivity was subsequently established on 9 October, as recorded
in [the routing evidence](dumb-ipv6-readiness-2026-10-09.md). The operator reported
public searches working. No limiter or proxy trust was weakened by those checks.

The 2026-10-07 post-update check found `/metrics` correctly returning 404 but
`/stats` returning HTTP 200 with an empty-data page through the deployed private
edge. The direct-edge template below denies `/stats`; the separate edge
operator still needs to reconcile that deployed-policy discrepancy. See the
[dated update evidence](updates.md#verified-searxng-update-2026-10-07).

`utilibre-searx-update.timer` is enabled daily at 02:20 UTC plus up to ten minutes
of jitter. Its first manual systemd execution succeeded. The updater stages an
isolated candidate, checks real browser results, snapshots configuration, pins
the official image by digest, verifies production, and rolls back failed checks.
SMTP status notifications work. Seven offline regression tests pass. See
[updates.md](updates.md) for operation and recovery. This is not an independent
external uptime monitor or a guarantee against outages.

## Admission requirements and retained migration checklist

The [official admission checklist](https://github.com/searxng/searx-instances/blob/master/.github/ISSUE_TEMPLATE/add-instance.yaml)
requires the operator to control TLS termination. Cloudflare DNS-only is
permitted; its HTTP proxy is not. Admission also requires updates within one
week, at least 90% monthly uptime, no tracking or manipulation of the instance's
ranking, and ongoing maintenance. There is a two-week wait after approval.
Confirm domain ownership and those commitments before submitting the issue;
a successful upgrade alone does not satisfy them. The checklist was re-read on
12 October; its restriction on Cloudflare HTTP proxying remains explicit. The
current DNS flags above do not meet it.

The application keeps `server.public_instance`, the limiter, CSS link tokens,
HTML-only output, POST search forms, image proxying, query-log redaction,
container limits, and private-only ports. `pass_searxng_org` permits the official
monitor through the application limiter; it does not bypass the edge firewall.

## Edge operator checklist

This repository cannot deploy the separately managed edge. Back up its complete
Caddy configuration, certificates, firewall rules, and the current search DNS
records first. Keep a working administrative session open.

1. Review the actual edge version, public addresses, listeners, firewall,
   Cloudflare client-IP trust, and logging. Use a public address of the **edge**,
   never the application VM. Do not publish application or cache ports.
2. Arrange a publicly trusted certificate for `search.utilibre.org` before
   DNS cutover. A Cloudflare Origin CA certificate is insufficient for direct
   browsers. Check ACME issuance and renewal, CAA, and the chosen challenge
   path. Do not remove a shared certificate policy used by other sites.
3. Preserve protection of all other hostnames. If the edge firewall currently
   accepts only Cloudflare, opening shared ports 80/443 also exposes those
   sites to direct requests. First enforce their existing Cloudflare-only
   access at the site level or use a dedicated address/listener for search.
   Do not blindly open the shared edge to everyone.
4. Replace only the search site block with
   [the direct-access fragment](../deployment/utilibre/edge/Caddyfile.searxng-direct).
   Do not also import the existing search block. Set `UTILIBRE_APP_IP` to the
   existing private application address. Preserve the exact edge-only
   application firewall and `EDGE_PROXY_IP` limiter trust.
5. Review the full adapted configuration, then validate and gracefully reload
   with the edge's installed Caddy. The fragment was syntax-checked with
   Caddy 2.11.4, not against the inaccessible deployed edge configuration.
6. Test from outside using `curl --resolve search.utilibre.org:443:EDGE_PUBLIC_IP
   https://search.utilibre.org/` with normal certificate verification. Confirm
   the certificate, HTML, health, and browser searches before changing DNS.
7. If the operator elects to complete this migration, set only the search
   hostname's A record to the verified edge address and turn its proxy off
   (DNS-only). The currently proxied AAAA must also be reconciled: retain a
   DNS-only AAAA only after end-to-end public edge IPv6 testing, and remove any
   stale search AAAA that points elsewhere. Working application-VM outbound IPv6
   alone does not prove that public edge path. Leave all
   unrelated records unchanged. Verify authoritative and public DNS answers.

## Checks before submission

- Exercise ordinary English and Spanish browser searches without synthetic
  allowlist headers. Check GET for monitoring and POST for the default form.
- Verify `/config` exposes only upstream's sanitized metadata, including the
  running version; `/stats` and `/metrics` must remain inaccessible. Keep JSON
  and CSV search output disabled.
- From outside, confirm forged `X-Forwarded-For`, `X-Real-IP`, and
  `CF-Connecting-IP` cannot impersonate the monitor or evade the limiter. The
  direct fragment overwrites identity from the socket peer.
- Check access, error, and upstream logs for query or client-identity leakage.
  `log_skip` covers Caddy access logs, not every possible runtime/error sink.
  Do not enable debug/request logging. Use a harmless unique test query.
- Verify the official monitor is not blocked at the edge. Re-read its current
  addresses in the issue template rather than relying on an old allowlist.
- Check CPU/RAM, restarts, search latency, and upstream refusals under normal
  use. Direct access removes Cloudflare's protection; keep conservative
  limits and a tested abuse-response/rollback path.
- Update `docs/privacy.md` and the public privacy copy only after verifying
  the changed path. Continue disclosing Cloudflare for other services.
- Keep the tested SearXNG-specific updater enabled and review its status emails.
  Other services retain the [deliberate-update policy](updates.md).
  Independent external uptime/IPv6 monitoring remains an operator task.
- Verify the public source link and current upstream notices. Submit an
  **issue**, not a pull request, using the upstream Add a new instance form.
  Only check requirements that are actually met; GitHub authentication must
  permit creating issues in that repository.

## Rollback

Retain the prior DNS values and edge configuration. If direct access fails,
restore the former Cloudflare-compatible edge setup and proxy/DNS state in a
coordinated rollback, allowing for resolver caching. Re-check every unrelated
site. Keep the application private throughout; do not solve reachability by
publishing its ports.

For an application regression, restore the pre-upgrade image and SearXNG
configuration from the restricted host backup and recreate only `searxng`.
The old image is retained locally. Do not restore unrelated services or
overwrite newer `.env` changes. Re-run health, network, redaction, and browser
checks. Cached search/limiter state is not a substitute for a data backup.
