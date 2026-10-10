# Public DNS and routing — 8 October 2026

DNS is administered separately. Application VM addresses must not replace the
public edge destination. This file supersedes the September service-prune list;
its old removal instructions no longer describe the active deployment.

| Route | Observed role | Limits of verification |
| --- | --- | --- |
| Portal and most active HTTPS tools | Cloudflare HTTP proxy, then separate Caddy edge, then application VM | Public DNS and response headers checked; Cloudflare may terminate ordinary HTTPS content. This is not DNS-only use. |
| search.utilibre.org, binternet.utilibre.org | DNS-only public address, HTTPS at the Caddy edge | Public IPv4 resolves to the edge. Hairpin access from this VM is not an external availability test. |
| turn.utilibre.org | DNS-only; native authenticated TURN transport | ACME HTTP verification is routed separately through the edge. Do not HTTP-proxy TURN traffic. |
| Mumble | Native voice transport | See service-pack/capacity notes for TCP and UDP verification scope. |

Cloudflare DNS service and Cloudflare HTTP proxying are different provider
roles. DNS-only records do not by themselves send application HTTP content
through Cloudflare. Unknown edge/provider log retention must remain explicit.
The owner confirms that both VMs share the same physical Hetzner server in
Germany. Do not infer operator establishment or separate physical redundancy.

Do not remove active tool records on the basis of an old prune checklist. Review
public config and the current service manifests first. Certificate, response,
source-offer and native-function checks are required after a route change.

For security.txt discovery, import the reviewed Caddyfile.security-contact
snippet on each intended non-root HTTPS host after the root target is deployed.
The root file alone does not automatically cover subdomain discovery.
