# DNS records retained after the service prune

Public DNS is owned outside this repository and must point to the separate
Caddy edge VM, never directly to the application VM.

| Type | Name | Value | Service |
|---|---|---|---|
| A | `search.utilibre.org` | `<CADDY_EDGE_IPV4>` | SearXNG |
| A | `redlib.utilibre.org` | `<CADDY_EDGE_IPV4>` | Redlib |
| A | `rss.utilibre.org` | `<CADDY_EDGE_IPV4>` | FreshRSS |
| A | `paste.utilibre.org` | `<CADDY_EDGE_IPV4>` | PrivateBin |

Remove retired application records for `media`, `notify`, `pdf`, `convert`,
`tools`, `dev`, `openapi`, `monitor`, `send`, `feeds`, `wakapi`, `youtube`,
`imgur`, and `when`. Preserve the portal and unrelated records. After changing
DNS and the real Caddyfile, verify each retained hostname's certificate,
redirect, content, and health.
