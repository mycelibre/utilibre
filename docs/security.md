# Security review

Utilibre is an Internet service even though application listeners are private.
The threat model assumes malicious input, automated scraping, credential
stuffing, spam, oversized requests, storage exhaustion, upstream blocking,
container compromise, and operator error. This document records controls and
residual risks; it is not a claim of complete security.

## Boundary summary

- Cloudflare and the separate Caddy edge are the only public ingress path.
- Application listeners bind to one exact private address and accept traffic
  only from the exact edge peer.
- Databases, caches, RSSHub, Anubis metrics, and direct Redlib have no host or
  public port.
- Containers drop capabilities and use `no-new-privileges`, read-only roots,
  bounded tmpfs, resource ceilings, and rotated logs where their official
  images permit it.
- The portal exposes only static files and fixed config/status endpoints; it
  has no generic proxy, upload, webhook, DNS, or media API.
- Persistent user data is limited to FreshRSS/PostgreSQL and PrivateBin
  ciphertext, plus operational Anubis state and secrets.

## Edge and proxy trust

The application VM must not be directly reachable from the Internet. Caddy
must overwrite forwarded-client headers and derive addresses only from trusted
Cloudflare ranges. Applications trust only the exact edge peer. A spoofable
client header can defeat limiting or Anubis policy.

Public DNS points only to the edge. Firewall verification must include Docker
forwarding/NAT behavior, unauthorized private hosts, and IPv6. See
[`firewall.md`](firewall.md) and [`edge-routing.md`](edge-routing.md).

## Portal

The portal server rejects malformed targets, declared bodies on bodyless
routes, excess headers, unsupported methods, and unknown API paths. It has
short header/request timeouts, connection ceilings, fixed status targets, and
a restrictive CSP. Public config is sanitized and does not expose secrets or
internal destinations.

Retired APIs and application routes must remain absent. In particular, do not
restore a generic fetcher, media adapter, webhook receiver, DNS resolver, or
network-scanning surface for compatibility with old links.

## SearXNG

Primary risks are search automation, engine fan-out, slow upstreams, image
proxy bandwidth, query disclosure, and engine bans. Controls include the
official limiter, exact trusted proxy, private Valkey, curated engines, HTML
output, no public metrics/general API formats, query-log redaction, and
container resource limits.

Limiter state is ephemeral and clears on restart. The local logging hook is
defense in depth, not a proof that every future upstream log line is safe.
Review engine behavior, limiter parsing, output formats, image proxying, and
logs on every version change.

## Redlib and Anubis

Redlib is a crawler and media-relay risk. Anubis adds browser work before most
requests but does not stop distributed automation or volumetric traffic.
Cloudflare remains the outer traffic boundary. Direct Redlib and Anubis
metrics stay container-only.

The upstream Redlib implementation emulates a Reddit Android OAuth client and
browser/TLS behavior. This is an explicit operator-approved exception, not a
pattern for new services. Reddit can block it, and its behavior must be
re-reviewed on every pin. The local source build applies redirect hardening;
keep the patch and regression tests with the complete corresponding source.

Preserve Range/streaming behavior only on the Redlib route, observe aggregate
bandwidth, disable indexing, and stop the pair if abuse or upstream blocking
becomes unreasonable. Do not log complete browsing paths or cookies.

## FreshRSS

FreshRSS creates the largest account-security responsibility in the retained
set. Keep public self-registration closed. Require strong generated initial
credentials, transport all public use through HTTPS, protect the admin
account, and keep database credentials out of browser and edge configuration.

Before request-based accounts open, verify:

- unrelated users cannot read, share, export, or delete one another's data;
- login, recovery, API-password, session, CSRF, and brute-force behavior;
- safe import size and type limits;
- whether arbitrary feed fetching can reach private, loopback, link-local,
  cloud-metadata, Docker-service, or credential-bearing URLs;
- whether redirects, DNS rebinding, or feed enclosures cross the intended
  egress boundary;
- account quotas, deletion, export, inactivity, and incident procedures; and
- restore tests that do not overwrite live user state.

FreshRSS legitimately needs the internal backend for PostgreSQL and intended
RSSHub feeds. That makes server-side feed fetching and SSRF review especially
important. Do not call the installation safely open to unrelated users until
this gate passes.

## Internal RSSHub

RSSHub has no public route or host port. Its generic route catalog is not a
public product. Only operator-approved routes needed by FreshRSS should be
documented or used. Disable unsafe user-supplied domains, remote debugging, hotlink
templates, and file logs; retain request deadlines, cache bounds, resource
ceilings, and private Valkey.

An authenticated FreshRSS user may still be able to attempt internal RSSHub
routes by subscribing to a Docker-network URL. Treat that as part of the
FreshRSS/RSSHub multi-user and SSRF gate, not as proof that network privacy
alone is sufficient.

## PrivateBin

PrivateBin's server stores encrypted content, so the operator normally cannot
moderate plaintext. Anonymous creation can attract illegal or abusive data,
link spam, storage exhaustion, and request floods. Controls include a roughly
2 MiB application limit, short expiry choices, disabled uploads and
discussion, application traffic limiting, edge body/rate limits, bounded
storage monitoring, and a safe abuse/deletion procedure.

Encryption does not authenticate a paste sender, prevent someone with the full
URL from reading it, hide request metadata, or erase backup copies
immediately. Do not log full paste or deletion URLs.

## Accounts and authorization

FreshRSS access remains operator-provisioned. A planned request-based model is
not open registration. Before announcing requests, publish eligibility,
quotas, recovery, export, deletion, inactivity, backup, acceptable-use, and
retirement terms. Account decisions and limits must not depend on donations.

Administrative interfaces should not be linked from the public catalog. Use
separate strong operator credentials, minimal operator access, and a recorded
offboarding/rotation procedure.

## Secrets

- Keep `.env`, Anubis keys, PostgreSQL credentials, and FreshRSS credentials
  outside version control with restrictive permissions.
- Generate secrets locally; never paste them into issues, logs, screenshots,
  shell history, or expanded Compose output.
- Rotate credentials after suspected exposure and document which state must be
  invalidated or restarted.
- Keep the public AGPL source offer free of secrets while including all source,
  patches, and build/install material required by the licenses.

## Persistence and backups

Backups contain sensitive account and ciphertext data. Encrypt them, restrict
operator access, keep them outside the live data paths, test restores in an
isolated location, and delete expired generations. A live account/paste
deletion cannot erase an older backup immediately; publish the retention
window before accepting broader user data.

Never solve a low-disk event with an unreviewed recursive delete or broad
Docker prune. Stop the affected service, identify exact growth, preserve needed
state, and use the documented removal procedure.

## Update and supply-chain controls

Pin images by immutable version and digest; pin Redlib source and build bases.
Review upstream release notes, license, artifacts, dependencies, migration and
rollback behavior before updating one application at a time. Re-run security,
privacy, localization, resource, and public-path checks. No unattended image
updater or floating `latest` tag belongs in production.

## Incident priorities

1. Remove the affected public route or stop the service without widening any
   other boundary.
2. Preserve the minimum evidence needed, without copying sensitive queries,
   paths, credentials, or paste URLs into public channels.
3. Rotate exposed secrets and invalidate affected sessions where possible.
4. Restore only from a verified, isolated backup when integrity is understood.
5. Notify affected users when the incident and available contact information
   make that appropriate.
6. Document the factual impact and update controls before re-enabling access.

## Residual risks

Cloudflare and the edge process all public traffic; upstream engines and sites
can log server requests; Redlib can break or be blocked; FreshRSS feed fetching
has an SSRF and content-ingestion surface; anonymous encrypted pastes can be
abused; container and dependency vulnerabilities remain possible; and an
operator with host or backup access can access persistent server data. These
risks must remain visible in public copy and operating decisions.
