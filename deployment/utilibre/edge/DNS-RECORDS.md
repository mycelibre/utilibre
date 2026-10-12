# Public DNS and routing, verified 12 October 2026

DNS is administered separately. Application VM addresses must not replace the
public edge destination. This file supersedes the September service-prune list;
its old removal instructions no longer describe the active deployment.

| Route | Observed role | Limits of verification |
| --- | --- | --- |
| Portal and most active HTTPS tools | Cloudflare HTTP proxy, then separate Caddy edge, then application VM | Public DNS and response headers checked; Cloudflare may terminate ordinary HTTPS content. This is not DNS-only use. |
| search.utilibre.org, binternet.utilibre.org | Cloudflare HTTP proxy, then Caddy edge | Read-only API check at19:11UTC confirms search A/AAAA and Binternet A are proxied. The earlier DNS-only state is historical. Search currently does not meet the public-instance directory's final-webserver requirement. |
| newsletters.utilibre.org, aliases.utilibre.org | Cloudflare HTTP proxy, then Caddy edge | Explicit A records are proxied as of the same check. Web content is visible at Cloudflare TLS termination; MX-based email delivery remains a distinct transport. Portal LAN-edge probes bypass this public HTTP-proxy hop. |
| turn.utilibre.org | DNS-only; native authenticated TURN transport | ACME HTTP verification is routed separately through the edge. Do not HTTP-proxy TURN traffic. |
| mumble.utilibre.org | DNS-only; native voice transport | The A record is unproxied. See service-pack/capacity notes for TCP and UDP verification scope. |
| speed.utilibre.org | DNS-only; HTTPS at Caddy | A separate 12 October 19:13 UTC API check confirms an unproxied A record and no AAAA/CNAME. Native speed measurements require this direct route; earlier LAN checks are not an external ISP benchmark. |

Cloudflare DNS service and Cloudflare HTTP proxying are different provider
roles. DNS-only records do not by themselves send application HTTP content
through Cloudflare. Unknown edge/provider log retention must remain explicit.
The owner confirms that both VMs share the same physical Hetzner server in
Germany. Do not infer operator establishment or separate physical redundancy.

The exact-name API query inspected configuration flags only, not visitor logs,
DNS record contents or provider retention. Sanitized evidence is
`/opt/utilibre/reports/cloudflare-dns-recheck-20261012T1912Z.json` and, for
LibreSpeed, `/opt/utilibre/reports/cloudflare-speed-dns-recheck-20261012.json`. This review
changed no DNS records. Proposed migration fragments elsewhere in this directory
are operator instructions, not evidence that a direct route is deployed.

Do not remove active tool records on the basis of an old prune checklist. Review
public config and the current service manifests first. Certificate, response,
source-offer and native-function checks are required after a route change.

For security.txt discovery, import the reviewed Caddyfile.security-contact
snippet on each intended non-root HTTPS host after the root target is deployed.
The root file alone does not automatically cover subdomain discovery.
