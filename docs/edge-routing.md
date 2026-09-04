# Edge routing

Cloudflare is the current outer proxy. A separate Caddy VM terminates
operator-controlled TLS and forwards only approved hostnames to exact private
application-VM listeners. The application VM must never be a public DNS
destination.

## Route inventory

| Public host | Private target | Public methods | Notes |
| --- | --- | --- | --- |
| Portal | `APP_VM_PRIVATE_IP:PORTAL_PORT` | GET, HEAD; fixed portal GET APIs | No arbitrary proxy or upload route |
| Search | `APP_VM_PRIVATE_IP:SEARXNG_PORT` | GET/HEAD pages and POST search | Keep diagnostics, metrics, and unsupported output formats private |
| Reddit | `APP_VM_PRIVATE_IP:REDLIB_PORT` | GET, HEAD | Target is Anubis; direct Redlib has no host port |
| FreshRSS | `APP_VM_PRIVATE_IP:FRESHRSS_PORT` | Application-required methods | Account and API endpoints belong to FreshRSS; registration remains closed |
| PrivateBin | `APP_VM_PRIVATE_IP:PRIVATEBIN_PORT` | Application-required methods | Bound request bodies; file uploads are disabled in application configuration |

RSSHub, PostgreSQL, both Valkey instances, Anubis metrics, and direct Redlib
have no public route. Removed application hostnames should return no service
and should be removed from DNS after any deliberate retirement period.

## Trusted client address

Only the edge private address may reach application listeners. The portal and
FreshRSS trust only that exact edge peer where forwarded headers are needed.
SearXNG's generated limiter configuration likewise trusts the exact edge
address.

Cloudflare-facing Caddy must discard visitor-supplied forwarding headers and
derive the client address only from configured trusted Cloudflare proxy
ranges. Do not make an application trust arbitrary `X-Forwarded-For`,
`X-Real-IP`, or `CF-Connecting-IP` input.

## Common response policy

For every retained hostname:

- issue HSTS only after HTTPS and host routing are confirmed;
- set `X-Content-Type-Options: nosniff` and a conservative referrer policy;
- remove upstream `Server` disclosures where practical;
- avoid access logs containing queries, credentials, paste identifiers, feed
  paths, or Redlib browsing paths;
- rotate any necessary edge logs and document their retention;
- reject unexpected request bodies and methods at the narrowest safe layer;
- set request-size and timeout ceilings appropriate to the application; and
- send `X-Robots-Tag: noindex, nofollow` for private or crawler-sensitive
  applications where applicable.

## Portal

The portal accepts static GET/HEAD requests plus its fixed configuration and
status GET endpoints. Unknown `/_portal/*` and `/api/*` paths should remain
404. The removed media adapter must not be recreated as a generic proxy.

Use a modest request body ceiling or reject bodies entirely at the edge. Keep
the portal's restrictive CSP and same-origin static assets intact.

## SearXNG

The public search route should:

- permit normal pages/assets and POST search;
- block `/config`, metrics, statistics, and unsupported API output paths;
- preserve the application base URL and correct `Host`/forwarded scheme;
- pass the sanitized client address needed by the limiter; and
- avoid recording query strings in edge logs.

SearXNG can accept GET query searches even when its form uses POST. The edge
should require POST for the public search submission if the current reviewed
configuration and browser tests support that restriction.

## Redlib through Anubis

The private `REDLIB_PORT` terminates at Anubis, not Redlib. Preserve the
application path, query, cookies, content type, streaming, and Range behavior
needed for pages and media. Do not expose Anubis metrics or add a second route
to the Redlib container.

Cloudflare and the edge must overwrite the one real-client header Anubis is
configured to trust. Validate that a direct or spoofed request cannot bypass
the challenge. The gate raises crawler cost; it is not volumetric DDoS
protection or a guarantee against automation.

Do not log complete Redlib paths, queries, referrers, or cookies. Reddit media
can be large, so apply connection and bandwidth observation without recording
browsing content.

## FreshRSS

FreshRSS needs its normal authenticated application and feed-reader API
methods. Preserve its public HTTPS origin and exact trusted proxy. Keep
registration closed. An edge route does not mean that users can request an
account; that claim requires a separately published workflow.

Apply a conservative request body limit appropriate to settings/imports and
any intentionally supported API use. Do not expose database or administrative
debug interfaces. Review application upgrades for new registration, sharing,
proxy-trust, or API behavior.

## PrivateBin

PrivateBin needs static assets, paste creation, paste retrieval, and deletion.
Apply a body limit slightly above the configured application paste-size limit
to cover protocol overhead. Preserve URL fragments in the browser: fragments
are never sent in HTTP requests and must not be transformed into query
parameters.

File uploads and discussions remain disabled. Avoid logging paste paths or
deletion links. A ciphertext store is still sensitive operational data.

## Internal RSSHub

Do not create a `feeds` hostname, wildcard route, tunnel, or port forward to
RSSHub. FreshRSS reaches it by Docker service name on the internal backend
network. Intended operator-approved route URLs belong in private/user guidance,
not in a public generic route browser. The stock runtime does not enforce that
route set, so edge privacy alone is not an account-level control.

## Verification

After every edge change, test through public DNS:

1. expected portal, search, Reddit, FreshRSS, and PrivateBin behavior;
2. rejection of unexpected methods and oversized bodies;
3. SearXNG diagnostic/API denials;
4. Redlib challenge, cookies, media, and Range behavior;
5. FreshRSS login/API behavior with registration still closed;
6. PrivateBin create/read/delete/expiry behavior without exposing the key;
7. genuine 404s for unknown portal APIs and application assets;
8. absence of public RSSHub and removed-service routes; and
9. absence of internal addresses or sensitive query/path data in responses
   and retained logs.

Keep edge configuration, DNS, firewall policy, portal runtime configuration,
and the documented service inventory in sync.
