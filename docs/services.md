# Services and upstream applications

Creative batch, 7 October 2026 (static applications; no accounts):

| Application | Public address | Private edge target |
| --- | --- | --- |
| Excalidraw | https://whiteboard.utilibre.org/ | 10.10.1.43:3164 |
| SVGEdit | https://svg.utilibre.org/ | 10.10.1.43:3165 |
| CyberChef | https://cyberchef.utilibre.org/ | 10.10.1.43:3166 |
| Image Scrubber | https://scrub.utilibre.org/ | 10.10.1.43:3167 |
| Markmap | https://mindmap.utilibre.org/ | 10.10.1.43:3168 |

See the creative-batch section of [toolbox review](toolbox-review.md) for
scope, disabled features, dependency limitations and exact reproducible checks.
Caddy remains on its separate VM; merge `deployment/toolbox/Caddyfile.tools`.

Utilibre operates a reviewed collection of independently maintained FOSS
applications. Admission depends on a real hosting access gap as well as
license, safety, privacy, resource, export, deletion, and maintenance review.
See [`FOSS_POLICY.md`](../FOSS_POLICY.md).

A service is public only when the catalog, runtime enablement, private
listener, edge route, and current checks agree. This document is not an uptime
promise.

## Operated public services

The live inventory includes the October 7 ZIP Manager, RAWGraphs, AudioMass,
miniPaint, Excalidraw, SVGEdit, CyberChef and Image Scrubber additions, plus
direct links to six tasks within OmniTools. Those
shortcuts are not separate hosted applications. See the concise
[current tool list](../README.md#tools) and machine-readable
[delivery checklist](../deployment/community/delivery-checklist.json).
Reactive Resume, Penpot, Actual Budget, Wakapi and Rallly use approved Utilibre
accounts through Authentik; they are not anonymous tools. Public
self-registration remains closed for these account services. FMD and Pollaris
have their own application-specific access and abuse controls.

Dumb, LibreMDB, BreezeWiki and Rimgo remain visible with specific upstream
failures, not claimed as usable. Password-protected Mumble passes outside-network
authentication and TCP voice loopback; public UDP audio remains unverified.
Current endpoints, licensing, privacy boundaries and workflow checks are in
[the deployment review](toolbox-review.md); [operations](expanded-operations.md)
records the newer ports, backup timers and alerting.

The original services retain these boundaries:

| Application | Practical role and boundary | Access |
| --- | --- | --- |
| SearXNG | Metasearch. Utilibre sends queries to selected external engines and returns their results. Additional independently operated instances support SearXNG's decentralized model. | No application account |
| FreshRSS | Persistent RSS/Atom reader. The server stores subscriptions, reading state, preferences, and account data. | Operator-provisioned accounts; a request workflow is planned but not yet open |
| Redlib | Alternative Reddit frontend behind Anubis. It retrieves pages and proxies media through Utilibre; Reddit may change or block its upstream technique at any time. | No Redlib account; a browser challenge normally requires JavaScript |
| PrivateBin | Encrypted-paste service. Encryption and decryption happen in the browser; the server stores ciphertext and metadata without the URL-fragment key. File uploads are disabled. | No account |

Exact versions, source revisions, image digests, licenses, and local
modifications are recorded in
[`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md) and the additional
stack's
[`SOURCE_MANIFEST.md`](../deployment/utilibre/SOURCE_MANIFEST.md).

## Internal support

RSSHub is intended as an internal source for operator-approved FreshRSS feeds.
FreshRSS reaches it on the additional stack's internal backend; RSSHub also
needs a non-published egress network to contact source sites. It has no host
port, public edge route, public catalog card, or generic route-index promise.

The stock RSSHub runtime does not technically allowlist routes. A provisioned
FreshRSS user who can submit an arbitrary subscription URL may be able to
address other RSSHub routes by Docker service name. Enforce a route boundary,
add an intermediary that does, or explicitly accept and contain that surface
before opening accounts to unrelated users. Operator guidance alone is not an
access control. Every intended route still requires review of its target site,
data flow, stability, legal and abuse considerations, and maintenance cost.

The two Valkey instances, PostgreSQL, and Anubis are also support components,
not end-user products. Their cache, database, or metrics ports must never be
published.

## Portal boundary

The TypeScript/Vite portal provides bilingual discovery, access labels,
source and license links, privacy explanations, and high-level point-in-time
status. It has no account database, advertising system, or behavioral
analytics. Its server exposes fixed configuration and status functions; it is
not a generic proxy or utility backend.

The browser-side Reddit URL router is narrow integration glue: it validates an
allowed Reddit destination and opens the matching path on the configured
Redlib origin. Redlib, not the portal, performs the requested browsing task.

## Data labels

- **Browser** means task data is processed by code in the visitor's browser.
  It does not mean that no page assets or metadata are requested.
- **Utilibre server** means an operated application receives, processes, or
  stores some task or account data.
- **Intermediary** means Utilibre contacts another service or website for the
  visitor's task.
- **External** means the browser navigates to or contacts a service that
  Utilibre does not operate.

Read [`privacy.md`](privacy.md) for recipients, logs, cookies, storage, and
retention details.

## Account direction

FreshRSS remains provisioned-only until the operator publishes the request
channel, quotas, export and deletion procedure, inactivity policy, backup
scope, RSSHub/arbitrary-feed boundary, and retirement terms. Documentation may
describe this direction but must not claim that applications or account
requests are already open.

## Deployment ownership

The repository-root Compose project runs the portal, SearXNG, its private
Valkey, and the Anubis/Redlib pair. The separate `utilibre-services` project
runs FreshRSS, PrivateBin, internal RSSHub, PostgreSQL, and a private Valkey.
Toolbox, identity, expanded and community applications use additional isolated
Compose projects under `deployment/`. The Cloudflare/Caddy public edge is
managed separately; Binternet also has a separate Tor onion gateway. See
[`architecture.md`](architecture.md), [`configuration.md`](configuration.md),
and [`deployment.md`](deployment.md).
