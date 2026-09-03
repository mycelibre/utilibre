# Edge routing

Cloudflare is the current outer public proxy. The separate public Caddy edge
VM terminates the operator-controlled edge route and reaches this application
VM over the private network. Nothing in this repository installs or runs Caddy
locally, and these examples are not applied automatically.

## Route plan

Configure these edge-side variables or replace the equivalent placeholders in the Caddyfile. They are deliberately not populated here:

- `APP_VM_PRIVATE_IP`
- `PUBLIC_PORTAL_HOST`, `PUBLIC_MEDIA_HOST`, `PUBLIC_SEARCH_HOST`, `PUBLIC_REDDIT_HOST`
- `PORTAL_PORT`, `COBALT_PORT`, `SEARXNG_PORT`, `REDLIB_PORT`

| Public destination | Private upstream | Protocol | Active health path | WebSockets | Streaming | Request-body ceiling | Real client address |
|---|---|---|---|---|---|---|---|
| Portal host | `APP_VM_PRIVATE_IP:PORTAL_PORT` | HTTP | `/healthz` | No | No | 16 KiB | Required for portal rate limiting |
| Media host | `APP_VM_PRIVATE_IP:COBALT_PORT` | HTTP | `/` (edge-to-upstream only) | No | Yes; potentially long-lived | none; GET only | Useful for tunnel abuse limits |
| Search host | `APP_VM_PRIVATE_IP:SEARXNG_PORT` | HTTP | `/healthz` | No | No | 64 KiB | Required for SearXNG's limiter |
| Reddit host | `APP_VM_PRIVATE_IP:REDLIB_PORT` | HTTP | `/info` with a fixed synthetic health-only `CF-Connecting-IP` | No | Yes; Reddit media is proxied | 64 KiB | Required by Anubis; see the Cloudflare trust boundary below |

Host defaults are portal `8080`, Cobalt `9000`, SearXNG `8888`, and Redlib
`3002`; `.env` is authoritative. Private traffic is unencrypted HTTP because
it traverses the operator-controlled private network. If that network is not
trustworthy, fix the network design rather than exposing these ports publicly.

For an IPv6 application address, define the edge-side `APP_VM_PRIVATE_IP` substitution with brackets, for example `[fd00::1234]`; keep the raw unbracketed address in this repository's `PRIVATE_BIND_IP` and `EDGE_PROXY_IP` settings. IPv4 values need no brackets.

## Required Caddy behavior

- Preserve the request `Host` and `Origin` headers. Caddy's normal `reverse_proxy` behavior does this.
- Let Caddy set `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`; do not copy an untrusted inbound `X-Forwarded-For` value verbatim. The deployed application fragment must forward Caddy's normalized `{client_ip}`, not `{remote_host}` and not raw `CF-Connecting-IP`.
- The portal trusts forwarded client information only when its direct peer equals the exact `EDGE_PROXY_IP` in `.env`.
- SearXNG's generated limiter file trusts only loopback and that same exact edge address.
- Do not proxy the Cobalt hostname with a catch-all. Only `GET /tunnel` is public.
- Preserve query strings on `/tunnel`; they carry Cobalt's short-lived encrypted tunnel state. Avoid logging those query strings.
- Preserve `Range` and response range headers for streamed media. Caddy does so by default.
- Keep Caddy's default response flushing behavior for media streams. In particular, do not set a negative `flush_interval`: current Caddy low-latency mode keeps the upstream request alive after a client disconnect, which conflicts with bandwidth and cancellation goals. Allow a long read/write timeout but a short dial timeout.
- Preserve Redlib paths, query strings, optional preference cookies, content types, and Range responses. Port `REDLIB_PORT` now terminates at the dedicated Anubis gate; Redlib itself is reachable only as `redlib:8080` on the Docker service network. Anubis forwards accepted traffic to Redlib, which proxies Reddit page data and media.
- Anubis uses `CF-Connecting-IP` for per-visitor challenge state. Trusting that header is safe only while Cloudflare is the sole route to the edge origin. Restrict the origin to Cloudflare, preserve Cloudflare's authentic header, and never accept a visitor-supplied replacement on an alternate ingress. If Cloudflare is removed, change `ANUBIS_REAL_IP_HEADER` and the edge trust design together.
- Strip `X-Original-URI` and `X-Forwarded-Uri` before proxying. Anubis 1.27.0 includes the upstream request-target bypass fix; stripping these override headers is additional defense in depth.
- Anubis raises the cost of ordinary automated scraping with a mild proof-of-work challenge. It does not provide volumetric DDoS protection, prevent distributed solvers, or stop Reddit from blocking the application VM's egress.
- No service in this milestone needs a WebSocket-specific rule.

Because Cloudflare sits in front of Caddy, Caddy must first be configured with
Cloudflare's exact trusted proxies. Otherwise `{remote_host}` and `{client_ip}`
both identify a Cloudflare server and unrelated visitors share SearXNG and
portal rate limits. Do not compensate by making the portal or SearXNG trust
broad address ranges or by forwarding raw `CF-Connecting-IP`.

### Cloudflare client-address prerequisite

This is an edge-global setting, not a site-block setting. It requires Caddy
2.8 or later. Merge the following into the actual Caddyfile's existing global
options block; do not create a second `{ ... }` block. These are Cloudflare's
published ranges as reviewed on 2026-09-02. Compare them with
[Cloudflare's current list](https://www.cloudflare.com/ips/) before every
deployment and update both the firewall and Caddy atomically if they change.

```caddyfile
{
	servers {
		trusted_proxies static 173.245.48.0/20 103.21.244.0/22 103.22.200.0/22 103.31.4.0/22 141.101.64.0/18 108.162.192.0/18 190.93.240.0/20 188.114.96.0/20 197.234.240.0/22 198.41.128.0/17 162.158.0.0/15 104.16.0.0/13 104.24.0.0/14 172.64.0.0/13 131.0.72.0/22 2400:cb00::/32 2606:4700::/32 2803:f800::/32 2405:b500::/32 2405:8100::/32 2a06:98c0::/29 2c0f:f248::/32
		trusted_proxies_strict
		client_ip_headers CF-Connecting-IP
	}
}
```

Only Caddy's normalized `{client_ip}` may cross the private hop as
`X-Forwarded-For` and `X-Real-IP`. Caddy ignores the header for an untrusted
direct peer and falls back to that peer's socket address. `CF-Connecting-IP`
must be the sole configured client-IP input here: unlike an inbound XFF chain,
Cloudflare documents it as one address. Same-zone Cloudflare Workers can alter
the related input, so keep unreviewed Workers out of this route.

The header rule is not an origin-access control. At the edge firewall or
security group, allow public 80/443 only from the same current Cloudflare IPv4
and IPv6 ranges, plus separately reviewed management/monitoring paths that do
not reach public site blocks. Confirm there is no alternate A/AAAA record,
hostname, listener, or tunnel to the origin. From a controlled non-Cloudflare
network, direct `curl --resolve HOST:443:ORIGIN_IP https://HOST/` probes for
both origin address families must fail while the ordinary public hostname
succeeds.

Before reload, run `caddy version`, `caddy fmt --diff`, `caddy adapt --pretty`,
and `caddy validate` against the complete edge configuration. After reload,
verify two controlled public clients are attributed to distinct limiter
buckets, a forged client-address header cannot change a direct request's
identity, and all existing Utilibre routes still pass their health and denial
checks. Do not include search paths, queries, or raw client addresses in the
test report.

## Caddyfile examples

The examples use Caddy environment substitutions such as `{$PUBLIC_PORTAL_HOST}`. Define them in the Caddy service environment on the edge VM, or replace them with the operator's real values. Validate against the Caddy version actually installed on the edge before reload.

### Portal

```caddyfile
{$PUBLIC_PORTAL_HOST} {
	request_body {
		max_size 16KB
	}

	header {
		-Server
		Referrer-Policy "no-referrer"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
	}

	@non_indexable path /healthz /_portal/* /api/*
	header @non_indexable X-Robots-Tag "noindex, nofollow, noarchive"

	reverse_proxy http://{$APP_VM_PRIVATE_IP}:{$PORTAL_PORT} {
		health_uri /healthz
		health_status 2xx
		health_interval 30s
		health_timeout 5s
		transport http {
			dial_timeout 5s
			response_header_timeout 60s
			read_timeout 1h
			write_timeout 1h
		}
	}
}
```

The portal origin already supplies a restrictive Content Security Policy, cross-origin policies, `Referrer-Policy`, `Permissions-Policy`, frame denial, and `X-Content-Type-Options`. Caddy should preserve those response headers. Do not weaken the CSP to add analytics, remote fonts, a JavaScript CDN, or embedded donation widgets.

### Cobalt tunnel only

```caddyfile
{$PUBLIC_MEDIA_HOST} {
	@tunnel {
		method GET
		path /tunnel
	}

	handle @tunnel {
		header {
			-Server
			Cache-Control "private, no-store"
			Referrer-Policy "no-referrer"
			X-Content-Type-Options "nosniff"
			X-Robots-Tag "noindex, nofollow, noarchive"
		}

		reverse_proxy http://{$APP_VM_PRIVATE_IP}:{$COBALT_PORT} {
			health_uri /
			health_status 2xx
			health_interval 30s
			health_timeout 5s
			transport http {
				dial_timeout 5s
				response_header_timeout 60s
				read_timeout 1h
				write_timeout 1h
			}
		}
	}

	handle {
		respond "Not found" 404
	}
}
```

Do not add `reverse_proxy` outside `handle @tunnel`. In particular, do not expose `POST /`, `/session`, health output, or future API paths merely because they exist upstream. The edge route is one layer of protection; Cobalt also requires the portal's server-side API key, and CORS is restricted.

The approximately 500 MB result-size policy is a published target, not a Cobalt-enforced response limit in this version. An edge response-size cutoff would terminate downloads abruptly and is not configured. Duration, portal concurrency, request rate, and processing time are the enforceable controls documented elsewhere.

### SearXNG

```caddyfile
{$PUBLIC_SEARCH_HOST} {
	request_body {
		max_size 64KB
	}

	header {
		-Server
		Referrer-Policy "no-referrer"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		X-Robots-Tag "noindex, nofollow"
	}

	@private_diagnostics path /config /stats /stats/* /metrics /metrics/*
	respond @private_diagnostics 404

	@search_non_post {
		path /search
		not method POST
	}
	respond @search_non_post 405

	reverse_proxy http://{$APP_VM_PRIVATE_IP}:{$SEARXNG_PORT} {
		health_uri /healthz
		health_status 2xx
		health_interval 30s
		health_timeout 5s
		transport http {
			dial_timeout 5s
			response_header_timeout 20s
			read_timeout 60s
			write_timeout 60s
		}
	}
}
```

SearXNG's own application route can accept query-string GET searches even when its form is configured for POST. The explicit edge guard above makes public `/search` POST-only, reducing query-string log leakage. The diagnostic guard prevents the unauthenticated `/config`, statistics, and metrics paths from crossing the public edge. SearXNG exposes HTML search output only in this configuration; Valkey has no route. Test these denials after every edge change. The `X-Robots-Tag` is load-reduction guidance, not access control.

### Redlib

```caddyfile
{$PUBLIC_REDDIT_HOST} {
	# Anubis trusts the Cloudflare-generated CF-Connecting-IP header. Keep the
	# origin Cloudflare-only; do not expose this Caddy listener via another path.
	request_body {
		max_size 64KB
	}

	header {
		-Server
		Referrer-Policy "no-referrer"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
		X-Robots-Tag "noindex, nofollow, noarchive"
	}

	reverse_proxy http://{$APP_VM_PRIVATE_IP}:{$REDLIB_PORT} {
		header_up -X-Original-URI
		header_up -X-Forwarded-Uri
		header_down -Strict-Transport-Security
		header_down -Alt-Svc
		header_down -Via
		header_down -Reddit-Io-Info
		header_down -Reddit-Stats
		header_down -X-Imo-Features
		header_down -X-Reddit-Ct
		health_uri /info
		health_status 2xx
		health_interval 30s
		health_timeout 5s
		health_headers {
			# Active health originates at Caddy, not Cloudflare. This value is
			# used only for the synthetic /info request.
			CF-Connecting-IP 127.0.0.1
		}
		transport http {
			dial_timeout 5s
			response_header_timeout 30s
			read_timeout 1h
			write_timeout 1h
		}
	}
}
```

The private port is the Anubis ingress, not a direct Redlib listener. Anubis
fails closed when its configured real-client header is absent, including on an
active health probe, so `health_headers` supplies a fixed synthetic loopback
identity only for Caddy's `/info` request. It does not rewrite visitor traffic.
The policy allows `/info` for health and public-instance discovery, and allows `/`
only for the exact `redlib-instance-updater` and `libreddit-instance-updater`
user-agent patterns. Ordinary browsers receive the default tiered Anubis
challenge, normally the mild difficulty-2 tier. A successful challenge sets a
host-only, Secure, HttpOnly, SameSite=Lax, Partitioned cookie valid for 24
hours. This is a deliberate availability tradeoff: clients without usable
JavaScript cannot pass the interactive challenge, and a challenge is not an
anonymity or absolute bot-blocking guarantee.

The source-built Redlib process runs with `--hsts 0`, but pinned upstream still
emits `Strict-Transport-Security: max-age=0`. The `header_down` line strips that
upstream header so the edge owns the deployment-wide HSTS decision. Do not add
HSTS to this one site in isolation if a broader parent-domain policy would
strand another hostname.
The other `header_down` lines remove Reddit CDN diagnostics observed on a
private ranged-media response. They are not needed by the browser and should
not be relayed as accidental implementation metadata. Caddy may still advertise
its own HTTP/3 support independently.
Redlib also has `REDLIB_ROBOTS_DISABLE_INDEXING=on`; the edge
`X-Robots-Tag` is an additional load-reduction signal, never access control.

This route is intentionally not narrowed to a few paths: Redlib needs
community, post, search, static-asset, settings, image, and video paths, and it
proxies media with Range support. The local source patch rejects
scheme-relative and backslash redirect forms at the settings redirect
boundary. Test that patch through the final edge; do not attempt to replace it
with a brittle list of Caddy path exceptions.

Do not enable ordinary Redlib or Anubis access logs containing complete paths, queries,
or cookie headers. If the edge has global access logging, configure a reviewed
redaction/exclusion mechanism supported by that exact Caddy build and document
its retention. Keep coarse TLS/proxy errors needed for operation.

### Deferred rimgo hostname

Do not configure a public Caddy site for the pinned rimgo 1.4.2 image. Its reviewed `/search` handler can turn a crafted Imgur-looking query into a protocol-relative external redirect. The application also lacks a built-in limiter, can relay substantial media, is English-only, and unconditionally emits a one-year HSTS header. A path denial would be defense in depth, not justification to publish a version with a known open redirect.

After an official fixed release is available, repeat the full maintenance, route, redirect, HSTS, Range, bandwidth, logging, and abuse-control review before writing a new edge mapping. Until then no Imgur variable belongs in the edge configuration, no DNS/TLS/Caddy route should exist, and the optional profile is for private compatibility evaluation only.

## HSTS and access logs

HSTS is intentionally absent from these snippets. Add it only after every subdomain that would be covered is HTTPS-ready and the operator understands `includeSubDomains` and preload consequences. A conservative first deployment can operate without HSTS while TLS is already enforced by Caddy.

The snippets also do not enable Caddy access logs. If the edge has global or site-specific access logging, review it before launch:

- do not log Cobalt `/tunnel` query strings;
- do not log search query strings or request bodies;
- do not log Redlib paths, query strings, preference cookies, or referrers;
- avoid full referrers and sensitive cookies;
- rotate logs by size and time and set a documented short retention period;
- restrict log access to operators who need it.

Keep operational error logs needed to diagnose TLS and proxy failures, but do not turn them into user-activity records.

Cloudflare Network Error Logging was disabled for the zone on 2026-09-03.
Accepted public responses checked after the zone-level change contained
neither `NEL` nor `Report-To`. Cloudflare still processes public connection and
request metadata as the public proxy. Check every public hostname during each
release and after any Cloudflare policy change:

```sh
for task_host in \
  utilibre.org media.utilibre.org search.utilibre.org redlib.utilibre.org \
  notify.utilibre.org pdf.utilibre.org convert.utilibre.org tools.utilibre.org \
  monitor.utilibre.org send.utilibre.org rss.utilibre.org feeds.utilibre.org \
  paste.utilibre.org wakapi.utilibre.org
do
  task_headers=$(mktemp) || exit 1
  if ! curl --silent --show-error --fail --location \
    --dump-header "$task_headers" --output /dev/null "https://$task_host/"; then
    printf '%s\n' "$task_host did not return an accepted response" >&2
    rm -f "$task_headers"
    exit 1
  fi
  if grep -Eiq '^(nel|report-to):' "$task_headers"; then
    printf '%s\n' "$task_host returned a Cloudflare reporting header" >&2
    rm -f "$task_headers"
    exit 1
  fi
  rm -f "$task_headers"
done
```

Success is silent. `--fail` is deliberate: a Cloudflare challenge or other
error must not pass merely because it omitted the reporting headers. Re-run
the check for every additional deployed Utilibre public hostname; either
header returning is a release regression. See [Cloudflare
Network Error Logging](https://developers.cloudflare.com/network-error-logging/).

The syntax and forwarded-header expectations above follow Caddy's current official [`reverse_proxy` documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [`request_body` documentation](https://caddyserver.com/docs/caddyfile/directives/request_body), and [`header` documentation](https://caddyserver.com/docs/caddyfile/directives/header). Re-check those pages when the edge Caddy major version changes.

## Edge validation and reload

Use the edge VM's installed Caddy binary and service manager. Typical commands are:

```sh
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Do not reload if validation fails. After reload, test the public health
endpoints, a normal portal page in English and Spanish, a SearXNG form
submission, one authorized short Cobalt request, and a small Redlib
community/post through the Anubis challenge. Confirm that `POST /` and all non-tunnel paths on the media
hostname return 404. Verify Redlib proxied media/Range behavior and confirm a
crafted settings redirect cannot leave `PUBLIC_REDDIT_HOST`. Also verify that
`/info` and the exact official instance-updater user agents pass while a fresh
ordinary browser is challenged, a valid cookie survives an Anubis-only restart,
and spoofed request-target/client-address headers do not bypass policy.
