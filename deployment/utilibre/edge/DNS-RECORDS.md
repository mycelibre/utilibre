# DNS records for Utilibre services

DNS-provider state is managed outside this repository. Before creating or
changing records, confirm the current public address of the separate Caddy edge
VM and substitute it for `<CADDY_EDGE_IPV4>` below. DNS must point to the
**edge VM**, never to the application VM or its private address.

| Type | Name | Value | Purpose |
|---|---|---|---|
| A | `media.utilibre.org` | `<CADDY_EDGE_IPV4>` | Cobalt tunnel only |
| A | `search.utilibre.org` | `<CADDY_EDGE_IPV4>` | SearXNG |
| A | `redlib.utilibre.org` | `<CADDY_EDGE_IPV4>` | Redlib |
| A | `notify.utilibre.org` | `<CADDY_EDGE_IPV4>` | ntfy |
| A | `pdf.utilibre.org` | `<CADDY_EDGE_IPV4>` | BentoPDF |
| A | `convert.utilibre.org` | `<CADDY_EDGE_IPV4>` | VERT |
| A | `tools.utilibre.org` | `<CADDY_EDGE_IPV4>` | OmniTools |
| A | `monitor.utilibre.org` | `<CADDY_EDGE_IPV4>` | Healthchecks |
| A | `send.utilibre.org` | `<CADDY_EDGE_IPV4>` | PairDrop |
| A | `rss.utilibre.org` | `<CADDY_EDGE_IPV4>` | FreshRSS |
| A | `feeds.utilibre.org` | `<CADDY_EDGE_IPV4>` | RSSHub |
| A | `paste.utilibre.org` | `<CADDY_EDGE_IPV4>` | PrivateBin |
| A | `wakapi.utilibre.org` | `<CADDY_EDGE_IPV4>` | Wakapi |

Do **not** create `when.utilibre.org` or `when-api.utilibre.org` yet. Crab Fit is
deferred and there are no active application or edge routes for it.

An equivalent CNAME to an existing, stable edge hostname is acceptable if that
is the DNS provider's established pattern. Do not point a CNAME to the zone apex
unless the provider supports flattening. Create AAAA records only after verifying
that the edge VM actually serves the same Caddy configuration over that IPv6
address; an unverified AAAA record causes intermittent failures for IPv6 clients.

After applying the DNS and Caddy changes, verify each active hostname with:

```sh
dig +short notify.utilibre.org A
curl -fsSIL https://notify.utilibre.org/
```

Repeat for all thirteen active names. Confirm the certificate names, HTTPS redirects,
and application content rather than treating DNS resolution alone as success.
