# 13ft public-page reader — 2026-10-09

This is a separate deployment from the unchanged, stopped [fixture-only evaluation](13ft-review.md). It uses the pinned native application and a small removable patch; it does not turn the old fixture allowlist into an unrestricted fetcher. The intended host is `read.utilibre.org`, backend port `3207`.

## Versions and security boundary

13ft v0.5.0 is pinned at `d03b120c41d2558d3ce2a45e049ccbea8785ff7a` (MIT). The source patch changes two upstream files: native synchronous POST, bounded fetching, two-language ordinary HTML form, system fonts, and removal of active content/meta refresh. It retains the native parser. The homepage and form work without JavaScript. The unbounded SSE/background-job and cached-article routes return 404. Redirects, Freedium and archive fallbacks are disabled, not silently contacted.

The fixed outbound proxy is Squid 7.7, built from the upstream release tarball with SHA256 `5b05417d681c3cca275bc48ede12ee50a3e7d60cb47fb94522ee3a66022a8c59`. The initially considered Debian trixie 6.13 package still had unresolved 2026 security advisories; it was not deployed. The pinned Python application requirements passed `pip-audit` with no known vulnerabilities at verification. This is not a guarantee against unknown vulnerabilities or a whole-OS audit.

The app has only an internal IPv4 network and no default route. It can connect only to the fixed proxy, enforced in its own network namespace. The proxy allows the reader's source address, GET/HEAD/CONNECT, and ordinary HTTP 80/HTTPS 443; it rejects private/reserved destinations, credentials forwarded by the proxy, and IPv6 literals. IPv6 transport is disabled. HTTP redirects are not followed, so no unchecked redirect destination is fetched. The public site's own cookies/authentication are not supplied.

A second, independent OUTPUT policy inside the proxy namespace rejects private/reserved connections, including loopback and peers on its own Docker bridge. Only public TCP 80/443 and the selected DNS resolver addresses/ports are allowed. Host DOCKER-USER/INPUT rules remain an additional layer. This distinction matters on this VM: host bridge netfilter does not cover same-bridge traffic, so host firewall rules alone would have been insufficient.

The scoped systemd service applies host rules, starts the proxy, applies proxy OUTPUT rules, starts the app, applies app OUTPUT rules, and then starts the gateway with its own OUTPUT policy allowing only the app. Containers have `restart: no`; systemd supervises the whole group. The foreground Compose command uses `--no-recreate --abort-on-container-exit`, so an unexpected component exit stops the group and the supervisor reapplies rules before restarting it. Do not bypass this service with a naked production `docker compose up`.

## Processing, providers and retention

The submitted URL and returned HTML are processed by the Utilibre server. The source website receives a request from Utilibre, including the supplied path/query; do not submit private links, passwords or authentication tokens. Ordinary source content is visible to Utilibre while processing. HTTPS protects the connection to HTTPS sources; an HTTP source uses unencrypted HTTP.

DNS resolution uses Cloudflare's `1.1.1.1` and Quad9's `9.9.9.9`, already used by this VM. Those resolvers can receive queried source hostnames. This DNS role is separate from Cloudflare HTTP proxying on Utilibre's public hostname. Source publishers and their own infrastructure may log the request. No retention duration is invented for these providers. Utilibre's public-edge/provider notes still apply to the reader's hostname.

The application adds no analytics or external font requests. Returned articles have a sandbox CSP blocking scripts, frames, form actions, source images, fonts and other source resources; inline styles are allowed. Source scripts/forms/frames and HTML meta refresh are also removed. Clicking an ordinary outbound link can deliberately navigate to its destination; the reader does not certify that destination's safety.

There is no article database, persistent article cache or account. Native jobs/cache routes cannot be used. Article bytes and the URL exist transiently in the worker/proxy/browser, and Python does not promise immediate memory erasure. There is no stored article identifier or later retrieval/deletion API. Browser history, saved pages and downloaded files remain under the user's browser/device controls. No article backup is created; reproducible configuration/source are retained in the repository.

Nginx, Gunicorn and Squid access logs are disabled for this deployment; critical operational diagnostics remain. Docker logs rotate by size, 1 MiB × 2 per container, not by a promised time period. Native worker failures can log timestamps/PIDs. Separate edge/security/system logs are not covered by an application “no logs” claim.

## Practical limits

- Source must return HTML with HTTP 200 directly. Login, redirects, bot challenges, JavaScript rendering, images and archive fallback are unavailable. Some public pages will not work; this is not a promise to bypass paywalls or access restrictions.
- Input body 4 KiB; decoded HTML 1 MiB. The native stream checks an eight-second deadline between chunks; the synchronous Gunicorn worker has a 12-second hard timeout for stalled/trickling work. Source connect/read timeouts are three seconds. Gateway timeouts are bounds, not a throughput guarantee.
- Two sync workers, two concurrent gateway connections globally, 12 requests/minute/client with burst4. Over-limit requests return429. Shared public IPs can share a rate bucket.
- App 1 CPU/256MiB; Squid 0.5CPU/192MiB; gateway 0.25CPU/64MiB. Each has 48 PIDs, read-only root, no capabilities, no-new-privileges and bounded temporary filesystems. No application accounts or native persistent data to migrate.

## Verification record

Private fictional-data evidence: `/opt/utilibre/reports/13ft-public-20261009/`.

- Native POST fetched a Utilibre-owned fictional HTML page through the actual public HTTPS origin and the restricted proxy.
- EN and ES (voseo) native forms passed Chromium checks. The returned article was readable, inline script did not run, meta refresh/forms/frames were removed, and the browser made zero source/external-resource attempts.
- Literal loopback, RFC1918, carrier-grade NAT, metadata, documentation, multicast/broadcast, IPv4 alternate representations, IPv6/mapped literals and nonstandard ports were denied by the proxy. The native app rejects credentials/fragments/private literal inputs before fetching.
- A controlled DNS fixture permitted a public A answer; after TTL expiry the same hostname changed to 127.0.0.1 and was denied 403. A mixed public/private A answer was denied 403. The fixture configured a private AAAA too, but Squid only queried A because IPv6 was disabled: this is not a claim to have tested an actual mixed-AAAA connection attempt. Temporary DNS configuration was restored and the fixture process stopped before exposure.
- Direct app connections bypassing the proxy, and proxy connections to its own loopback/private bridge/host/metadata addresses, failed with namespace OUTPUT restrictions active.
- Actual public compressible HTML above 1 MiB was rejected with the native decoded-size error. Six focused native tests verified URL validation, fixed-proxy use, redirect/non-HTML rejection, no fallbacks, decoded-size bound, between-chunk deadline and blocked background/cache routes. The earlier isolated pilot separately measured the unchanged 12s hard-worker recovery; it is not described here as a new public slow-source test.
- The same scoped restart reinstalled namespace rules, and the normal fictional article rendered again. No user data was read or deleted.

## Recovery and removal

`systemctl restart utilibre-13ft.service` stops/restarts this stack and reapplies the connection boundaries before the gateway serves it. `deployment/13ft/rebuild.sh` reconstructs the application from the pinned upstream archive and reversible patch. `Dockerfile.proxy` reconstructs the pinned proxy source release. Keep the complete previous application/proxy images for a rollback; use the scoped service after changing image references. There is no persistent article state to restore.

Remove the edge route and portal listing before stopping/disabling this one service. Only then remove this deployment's own containers/networks and named firewall rules. Do not remove other projects' chains or flush shared host tables. The old evaluation project remains independent.

Patch removal condition: upstream must support an equivalently bounded native synchronous fetch, no automatic third-party fallbacks, safe output rendering/local assets and a compatible mandatory restricted proxy configuration. Retain the connection boundary even after upstream rendering improvements.

Primary evidence: [13ft release](https://github.com/wasi-master/13ft/releases/tag/v0.5.0), [pinned source](https://github.com/wasi-master/13ft/blob/d03b120c41d2558d3ce2a45e049ccbea8785ff7a/app/portable.py), [Squid 7.7](https://github.com/squid-cache/squid/releases/tag/SQUID_7_7), [Debian Squid security tracker](https://security-tracker.debian.org/tracker/source-package/squid), [Squid ACL reference](https://www.squid-cache.org/Doc/config/acl/).

## Final deployment checks and source offer

Canonical HTTPS `https://read.utilibre.org` returned 200 and its native POST rendered the owned fictional marker. Both EN/ES Chromium form checks then passed against that actual public origin, with zero external resource attempts. `/.well-known/security.txt` redirects 302 to the verified root-domain file. The reader returns `X-Robots-Tag: noindex`; robots.txt allows crawling so that directive remains discoverable. Backend binds are loopback and the existing edge-facing `10.10.1.43:3207`, not all VM interfaces.

A bounded 12-request/four-client local burst produced two successful owned-fixture renders and ten intentional 429 responses in 0.147s, with no unexpected response class. This measured rejection controls, not usable public throughput. During the final restarted run, peak cgroup memory was 88.29MiB app / 17.87MiB proxy / 10.44MiB gateway against 256/192/64MiB ceilings. The larger disposable size-test fixture was removed; the small clearly fictional reader sample remains for reproducible checks. No real user data was involved.

The corresponding-source archive is [13ft-utilibre.tar.gz](https://tools.utilibre.org/utilibre-source/13ft-utilibre.tar.gz), 10,057,052 bytes, SHA256 `b210a852f42722c1a77af19f734ed8817dc8d6eb018343cd7088753401d5d003`. Actual HTTPS download matched the hash. It contains pinned 13ft source with the reversible patch applied, deployment/verification recipes, notices and the exact separate Squid 7.7 source tarball. No credentials, browser profiles or application state are included.

Unperformed checks: no arbitrary publisher compatibility/paywall test, no public slow-source test beyond the existing isolated pilot's hard-timeout measurement, no claim to know provider/edge log retention, no AAAA connection test with IPv6 disabled, and no off-site infrastructure-disaster restore. These limitations do not block this bounded stateless deployment; public text describes them accurately.
