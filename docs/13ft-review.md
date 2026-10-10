# 13ft review and stopped restricted pilot — 2026-10-08

**Result:** 13ft can be self-hosted in an isolated fictional-fixture pilot. That pilot was built, tested, and removed after measurement. It is not publicly available and does not establish that arbitrary URL fetching is ready for Utilibre. No production networks, user records or publisher articles were used. No public port, DNS record, portal listing or root Compose change was added.

The user requested self-hosting while preserving zero tracking, privacy, reasonable resource use and minimal custom code. The original upstream currently needs controls beyond its native configuration. The tested alternative adds a 73-line reversible source diff (43 added lines and three removed lines in one upstream file), existing gateway configuration and resource limits; it does not create a new URL-fetching backend. [Reproduction files](../deployment/evaluation/13ft/README.md) remain in the repository and the source patch is in the existing patch ledger.

## Verified upstream state

- Repository: [wasi-master/13ft](https://github.com/wasi-master/13ft), not archived at review time, MIT license.
- Latest release reviewed: [v0.5.0](https://github.com/wasi-master/13ft/releases/tag/v0.5.0), published 2026-09-17; exact commit `d03b120c41d2558d3ce2a45e049ccbea8785ff7a`.
- That revision's change fixes a Freedium mirror layout. It shows recent maintenance; it does not establish an availability or security response guarantee.
- Deployment options found in the application are `PORT` and `LOCALE`. No native destination allowlist, provider-disable flag, authentication, quotas, request-body bound or private reader mode was found.
- Upstream Dockerfile uses an unpinned Python tag and upgrades unversioned pip requirements. Upstream Compose uses a floating `latest` application image. The pilot pins source, image digests and dependency versions instead.

Evidence: pinned `app/portable.py`, `Dockerfile`, `requirements.txt`, `docker-compose.yml` and `gunicorn.conf.py`; unmodified checkout `/opt/utilibre/evaluation-src/13ft`. No exploitation test was made against a deployed upstream or Utilibre service.

## Native behavior tested with fictional data

| Concern | Observed source and fixture result | Implication |
| --- | --- | --- |
| Submitted URLs | Native POST accepted a loopback URL. Requests also followed a redirect to loopback. There is no public-address validation, DNS pinning or per-redirect destination check. | An unrestricted public deployment would expose a server-side request forgery boundary that needs protection. |
| Returned pages | Arbitrary inline JavaScript executed. The browser attempted fictional external scripts, CSS, pixels and frames; the test harness aborted all those requests. Native output provides no protective CSP and strips only specific frame-busting scripts. | Source pages can execute on the service origin and cause browser connections inconsistent with zero tracking. |
| Automatic providers | Medium handling tries two hardcoded Freedium mirrors. Archive fallbacks use archive.org plus four archive.today-family mirrors. Fictional mocked calls confirmed URL disclosure to these destinations. | Provider involvement would require a deliberate, accurate disclosure and policy decision. Native configuration cannot turn these fallbacks off. |
| Homepage | Google Fonts stylesheet is referenced. | Extra external connection unrelated to retrieving the requested article. |
| Work limits | SSE requests start daemon threads; jobs and article cache have no fixed entry/byte ceiling. Individual requests have timeouts, but fallbacks can multiply total work and streaming can prolong reads. | Reverse-proxy timeouts alone do not cancel background jobs or impose a total application deadline. |
| Retention | Nominal cache TTL is 300 seconds, but cached GET reads do not check expiry. Cleanup occurs on another successful background insert. A deliberately stale fictional entry was still returned. | “Deleted after five minutes” would be inaccurate. No persistent article database was found, but RAM retention is not a reliable timed guarantee. |
| Logs | The requested URL appears in GET paths/queries and native SSE requests. The repository alone does not establish deployed proxy, container or error-log retention. | Access/error configuration must be checked at every hop before public privacy claims. |

These are tests of the precise pinned implementation, not claims that every fork or future version behaves identically. [Pinned source](https://github.com/wasi-master/13ft/blob/d03b120c41d2558d3ce2a45e049ccbea8785ff7a/app/portable.py).

## Concrete pilot and verified boundaries

The pilot uses native POST `/article` and the existing parser. Only six exact paths on a literal fictional fixture address are accepted. The patch rejects redirects, non-200 responses and all external fallback paths; no hostname supplied by a visitor is resolved. Native `/status`, cached GET and arbitrary fetch routes return 404. Jobs/cache therefore stay unused, with a limit of zero. This is a new evaluation configuration, not removal of a live service's useful cache to make published copy true.

System fonts replace the external font request. The root page uses the native form with explicit POST action and works with scripts blocked. The article gateway adds a sandbox CSP with no scripts, frames, form submissions or source-resource loading. The patch also removes HTML meta refresh, which CSP alone does not reliably prevent as automatic navigation. Source CSS and image loading are intentionally unavailable in this text-focused pilot. This protection is not a claim of full HTML sanitization or compatibility with arbitrary publisher layouts.

Nginx limits requests to two concurrent globally and two per second per client, with a burst of four. Incoming bodies are capped at 4 KiB. Source bodies are capped at 1 MiB after decompression; plain and gzip overflow fixtures were rejected. An eight-second application deadline is checked between chunks; synchronous Gunicorn workers have a 12-second hard timeout to handle slow trickles that never complete a chunk. Two workers, a 256 MiB app ceiling and one CPU limit bound this pilot. Fixture and gateway each have 64 MiB and 0.25 CPU limits; all three have a 32-PID ceiling, read-only filesystems, dropped capabilities and no-new-privileges.

The dedicated Docker network is internal, IPv4-only and has no default route. There are no published ports, production-network attachments, durable data volumes or credentials. The VM administrator can reach its internal bridge addresses; this is not an access-control claim against the host administrator. The patch's fixed fixture origin prevents the visitor-supplied URL from selecting another address on that network. No external article/content requests occurred during runtime tests. Dependency/source downloads for preparing the build are separate from runtime article processing.

Access logging is disabled in the evaluation gateway and Gunicorn; critical operational diagnostics remain. Docker local logs rotate by size, one MiB per file and two files per container. That is not a time-based retention period and is not a claim about Utilibre's other services. The deliberate worker timeout logged a timestamp and PID. No article database, persistent cache or backup was created.

## Measurements and verification

| Check | Result |
| --- | --- |
| Network/limits inspection | No published ports/default route; only the isolated network; read-only and configured process/memory/CPU limits verified. |
| Native form and reader in Chromium | Form submitted with JavaScript blocked; fictional article readable; no inline script execution, outside resource attempts or meta refresh. |
| Disallowed destinations | Loopback, IPv6 loopback, metadata address, arbitrary host, userinfo, query/fragment variations and unlisted paths rejected before fetching. |
| Redirect/provider paths | Fictional redirect and challenge responses rejected; no automatic archive or Freedium requests. |
| Source-size bound | Both plain and gzip-decompressed bodies above 1 MiB rejected. |
| Bounded burst | 80 requests from eight concurrent local clients: 2 successful renders, 78 intentional HTTP 429 responses, no unexpected response class; 0.084 seconds elapsed. This tests rejection controls, not useful public throughput. |
| Slow trickle | Worker stopped at 12.971 seconds; request returned 500; the next normal article request succeeded. |
| Peak memory | App 92.59 MiB / 256 MiB; gateway 10.04 / 64; fixture 21.99 / 64. |
| CPU | App cumulative 1.375 CPU-seconds, gateway 0.077, fixture 0.317 over the integration run and container startup. These are fixture measurements, not a public capacity estimate. |
| Patch | Exact pinned-source apply and reverse checks passed. The existing source-patch audit also includes the evaluation entry. |

Reports are private fictional-data artifacts under `/opt/utilibre/reports/13ft-review-20261008/`: native results, browser results, pilot results and dependency/build logs. Containers and network were removed after measurement. The pinned image and build sources remain for reproduction. No source content, user record or service data was deleted.

## Remaining public deployment scope

Some controls are readily provided by existing infrastructure: request/concurrency limits, CPU/RAM/PID ceilings, size-rotated diagnostic logs and a script-free CSP reader. Local fonts, provider-disable behavior and bounded synchronous work are small reversible application changes. For the fixture-only pilot these are implemented and tested.

**A public arbitrary-URL service is still not implemented.** It needs an enforced destination boundary on every connection and redirect, including DNS changes/rebinding, IPv4/IPv6 alternate representations, loopback, private/metadata networks and the proxy's own service. The existing DOCKER-USER private-address pattern protects routed traffic but does not see a container's own loopback. There is no already-installed general-purpose outbound HTTP proxy with destination ACLs that was verified to solve this. Do not simply relax the literal fixture allowlist or expose the upstream container.

A future public design can use a proven destination-restricting egress proxy or persistent per-namespace egress controls, alongside bounded fetch behavior. It must be tested with owned fixtures through that actual boundary, including redirects/DNS changes, and reviewed for source-content processing and logging at the real edge. Strict CSP and removal of automatic navigation also need compatibility testing on operator-approved content. Keeping external fallbacks disabled avoids automatically sending requested URLs to archive/Freedium providers; turning them on would require an explicit verified provider/privacy decision.

The evaluation makes no claim that a source permits retrieval or that a publisher's access restrictions can always be bypassed. No real paywall, authenticated/private article or third-party infrastructure was tested. There is no invented public reliability promise, provider retention period or legal conclusion.

Removal is `docker compose -f deployment/evaluation/13ft/compose.yaml down` (already performed). The source patch has an explicit removal condition in `deployment/source-patches.json`. Removing only the restriction and publishing the pilot is not an approved upgrade path.
