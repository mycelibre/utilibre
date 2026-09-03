# Troubleshooting

Start with bounded, read-only observations. Do not delete volumes, regenerate secrets, relax firewall rules, or expose an internal API to diagnose a problem.

```sh
docker compose config --quiet
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker stats --no-stream
docker system df
```

Inspect only recent logs and keep them local:

```sh
docker compose logs --tail=100 SERVICE
docker inspect --format '{{json .State}}' "$(docker compose ps -q SERVICE)"
```

Even minimized logs can contain incident metadata. Redact addresses, request paths, query strings, referrers, cookies, and tokens before sharing an excerpt.

## Private preview URL does not open

Private preview uses `http://`, not `https://`, and has no local Caddy proxy.
Check the assigned address, running state, exact listeners, and local health
before changing configuration:

```sh
ip -brief address
docker compose ps
ss -lntp
curl --include http://PRIVATE_BIND_IP:PORTAL_PORT/healthz
```

With defaults, the portal is `http://PRIVATE_BIND_IP:8080/` and SearXNG is
`http://PRIVATE_BIND_IP:8888/`. Port `9000` serves authenticated Cobalt API and
generated `/tunnel` traffic; it is not a landing page. Confirm the client has a
private route to the VM and that the firewall permits only that intended
client. `PRIVATE_PREVIEW=1` with an empty `EDGE_PROXY_IP` is intentional: the
portal trusts no forwarded peer, and the rendered SearXNG limiter keeps only
loopback proxy trust.

If `.env` already exists, validate and resume it:

```sh
node scripts/validate-config.mjs
docker compose up -d portal cobalt searxng valkey
```

Use `init-private-preview.mjs` only for a fresh configuration; it correctly
refuses to overwrite an existing `.env`.

## Compose reports a missing variable or file

Symptoms include `required variable ... is missing`, a missing secret source, or a missing SearXNG limiter mount.

1. Confirm `.env` exists and is mode `0600`.
2. Replace every `REPLACE_*` value; do not quote or append comments to IP values.
3. Validate or create the matching Cobalt secret pair with `node scripts/init-secrets.mjs`.
4. Render the limiter with `node scripts/render-config.mjs`.
5. Run `docker compose config --quiet` again.

For a fresh direct private preview with no `.env`, use the supported
initializer instead of manually converting the HTTPS placeholders:

```sh
node scripts/init-private-preview.mjs PRIVATE_BIND_IP
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
```

Replace `PRIVATE_BIND_IP` with an exact private address assigned to this VM.
The address argument may be omitted only when automatic selection is
unambiguous. The initializer refuses to overwrite an existing `.env`; do not
delete or rename a real configuration merely to bypass that protection.

The secret generator deliberately refuses a half-existing key pair. Reconcile it from the encrypted backup; do not delete the surviving file and silently rotate a production key.

## A published port will not start

Check whether the address exists and the port is already owned:

```sh
ip -brief address
ss -lntp
docker compose ps --all
```

`PRIVATE_BIND_IP` must be assigned to this VM. Choose a different documented project port only after identifying the current listener. Never solve a conflict by changing the binding to `0.0.0.0`.

## Container is unhealthy or restarting

```sh
docker compose ps SERVICE
docker compose logs --tail=100 SERVICE
docker inspect --format '{{.State.Status}} health={{if .State.Health}}{{.State.Health.Status}}{{end}} oom={{.State.OOMKilled}} error={{.State.Error}}' "$(docker compose ps -q SERVICE)"
```

Common causes are a configuration syntax change in a new upstream release, a read-only-filesystem incompatibility, an invalid secret, unavailable DNS/egress, an architecture mismatch, or a memory limit. Do not raise limits blindly. Compare the observation with `docs/resource-usage.md` and revert the last change if the tested baseline no longer fits.

SearXNG is intentionally not given a read-only root filesystem or forced user because its official image initializes writable cache/config paths. Cobalt and the portal are read-only. rimgo is a scratch-style image and has no in-container shell or dedicated health binary; test it over its private HTTP port.

## Portal health works but public pages do not

From the edge VM, test the private route first:

```sh
curl --include http://APP_VM_PRIVATE_IP:PORTAL_PORT/healthz
```

If that works, validate the edge Caddyfile and inspect edge TLS/DNS/error logs. Confirm public DNS points to the edge VM and that Caddy connects from the exact address in `EDGE_PROXY_IP`. Do not add a proxy container to the application VM.

If scripts or styles fail, inspect browser developer tools for CSP violations and verify the built static files exist in the portal image. QR decoding specifically requires the self-hosted `zxing_full.wasm` asset; no CDN fallback is intended.

An old tab left open across a portal deployment can still request hashed chunks
from the previous build. Missing static chunks now receive a real HTTP 404
instead of the SPA HTML shell, and the client listens for Vite's official
`vite:preloadError` event and reloads the affected path once. If the automatic
recovery does not settle, perform one hard refresh. If it still fails, close old
portal tabs and reopen the exact portal URL. Repeated reloads, CSP relaxation,
or exposing a fallback asset host are not appropriate fixes; confirm the new
image contains the referenced build output.

For `PRIVATE_PREVIEW=1`, bypass the public-edge checks and verify the exact
direct URL instead:

```sh
curl --include http://PRIVATE_BIND_IP:PORTAL_PORT/healthz
```

The preview portal is `http://PRIVATE_BIND_IP:PORTAL_PORT/` and the default is
port `8080`. It is plaintext HTTP and must remain limited to the intended
private client(s). Use it to verify the catalog and fixed upstream handoffs;
HTTPS remains mandatory for public launch. If the interface fails, confirm the
rebuilt portal image contains the current bundle before weakening browser
security settings.

## Media requests return 403 `origin_not_allowed`

- `PUBLIC_PORTAL_ORIGIN` must exactly match the browser's origin, including scheme and non-default port, with no trailing slash.
- In public mode, Caddy must preserve `Origin`.
- In private preview it must be exact `http://PRIVATE_BIND_IP:PORTAL_PORT`, and `PRIVATE_PREVIEW` must be `1`.
- A CLI request with no Origin is deliberately rejected for `POST /_portal/media`.
- The `null` origin and arbitrary websites are deliberately rejected.

After correcting `.env`, recreate the portal:

```sh
docker compose up -d --no-deps portal
```

Do not add `*` to the portal or Cobalt CORS settings.

## Cobalt returns an authentication error

Validate that the portal key is a UUID present in Cobalt's key database without printing either file:

```sh
node scripts/init-secrets.mjs
docker compose restart portal cobalt
docker compose ps portal cobalt
```

If only one file exists, restore the pair from encrypted backup. Confirm Compose mounts `portal-cobalt-key` into the portal and `cobalt-keys.json` into Cobalt. Never pass the key to browser JavaScript or place it in an edge header.

## Downloader reports unsupported or processing failed

The portal intentionally accepts only HTTP(S), no credentials, no explicit port, and a strict provider-host allowlist. Private IPv4, IPv6 literals, loopback, malformed URLs, and arbitrary hosts are rejected before Cobalt. Playlists/pickers, private/authenticated media, cookie import, DRM bypass, and Cobalt local browser processing are unsupported.

Provider extraction changes frequently. Verify the provider is still supported by the pinned Cobalt release and read current official Cobalt issues/release notes. Make one small authorized test; do not repeatedly probe or attack the provider. If support is broken, disable that provider in `COBALT_ALLOWED_HOSTS` or `COBALT_DISABLED_SERVICES` and document the temporary limitation.

The current default and live allowlist is exactly `dailymotion.com,dai.ly`, and
all other providers are disabled. YouTube is temporarily disabled after two
live failures on pinned Cobalt 11.7.1 matching
[official open issue #1562](https://github.com/imputnet/cobalt/issues/1562). Do not
work around that failure with cookies, alternate credentials, or repeated live
probing. Keep YouTube disabled until a fixed upstream release is pinned and
reviewed.

The documented Dailymotion example resolved through the portal and Cobalt, and
its tunnel returned a first chunk before controlled cancellation. No media
artifact was then found in the Cobalt writable layer or `/tmp`. That does not
prove a full download, an FFmpeg path, sustained cleanup behavior, or resource
headroom; those tests remain outstanding.

## A Cobalt result link returns 404

Check all three pieces together:

1. `COBALT_PUBLIC_API_URL` is the public media HTTPS URL with a trailing slash, or exact `http://PRIVATE_BIND_IP:COBALT_PORT/` in private preview.
2. Public mode maps exact `GET /tunnel` through Caddy. Private preview requires the browser to reach the configured private Cobalt port directly.
3. The link is used within `COBALT_TUNNEL_LIFESPAN_SECONDS` (90 seconds by default).

The media hostname must return 404 for `/`, `POST /`, and every non-tunnel path. Do not fix a tunnel route by exposing a catch-all API. Long downloads also require the edge streaming timeouts from `docs/edge-routing.md`.

In preview mode, port `9000` is still not a user interface. The portal accepts
only a returned private URL whose origin exactly matches
`COBALT_PUBLIC_API_URL` and whose path is exactly `/tunnel`; other private
result URLs remain rejected. Restrict that port to the intended preview client
because the pinned upstream also has the broader private-peer trust exception
described in `docs/security.md`.

## SearXNG is unhealthy

First confirm Valkey is healthy and not published:

```sh
docker compose ps valkey searxng
docker compose logs --tail=100 valkey
docker compose logs --tail=100 searxng
ss -lnt | grep 6379
```

The last command should produce no host listener for this project. Confirm `SEARXNG_SECRET` is non-placeholder, `PUBLIC_SEARCH_URL` is correct, and the ignored generated `config/searxng/limiter.toml` exists. Compose mounts the entire `config/searxng/` directory read-only at `/etc/searxng`; this is intentional and prevents the official image from creating an anonymous configuration volume. Re-render after an edge-address change:

```sh
node scripts/render-config.mjs
docker compose up -d --no-deps searxng
```

In private preview, an empty `EDGE_PROXY_IP` is intentional: the generated
limiter trusts only loopback and direct client addresses come from the socket,
not forwarding headers. In public mode, if every visitor is rate-limited as one
client, verify Caddy's forwarded-header behavior and that the direct Caddy peer
equals `EDGE_PROXY_IP`. Do not trust arbitrary `X-Forwarded-For` senders or
widen `trusted_proxies` to the whole private network.

With Cloudflare in front, an explicit `header_up X-Forwarded-For
{remote_host}` is wrong: it groups visitors by Cloudflare edge/POP. The tracked
edge fragment uses `{client_ip}`, but that becomes the visitor address only
when the complete edge Caddyfile has the exact Cloudflare trusted-proxy and
`client_ip_headers CF-Connecting-IP` global configuration documented in
`docs/edge-routing.md`, and the origin firewall rejects non-Cloudflare public
traffic. Validate those prerequisites on the edge; never forward the raw
header merely to make a limiter test pass.

### Search page says “No results were found” for ordinary queries

An HTTP 200 response proves that the SearXNG page rendered; it does not prove
that an upstream engine returned a result. Inspect the warning above the empty
result area and the redacted operational logs:

```sh
docker compose logs --tail=100 searxng
```

The tracked General set is Google CSE, Wikipedia, Bing, Fynd, and Wiby, with
query-specific currency results. Separate curated engines provide image, news,
video, IT, science, map, and dictionary tabs. Required engines are explicitly
enabled because `use_default_settings.engines.keep_only` preserves each
upstream `disabled` flag. On 2026-08-30, bounded English and Spanish queries
returned substantial result lists and every selected specialist category
returned rows. Standard Google returned English but no Spanish rows in its
canary; Mwmbl timed out, Yahoo disconnected, Wikidata initialization received
403, and several familiar scraper engines received CAPTCHA/rate-limit pages.

Engine availability can change with the application VM's egress address and
upstream anti-bot policy. Use a normal browser and one non-sensitive operator
query per candidate, select it with SearXNG's documented engine bang, and
require at least one `article.result` row. Do not treat HTTP 200 as success,
run recurring synthetic searches, disable limiter protection, or enable a
large indiscriminate engine list. Update the catalog and this operational
record whenever the active set changes. The sourced comparison, live matrix,
and exact admission criteria are in `docs/searxng-engine-review.md`.

## Direct SearXNG search returns 429

The pinned public-instance limiter uses a browser link token. A normal browser
first loads `/`, then requests the generated `client<token>.css` using the same
user agent and language before submitting `/search`. A raw `curl` or scripted
`POST /search` that skips that flow is deliberately classified as suspicious
and may return `429` even though the service is healthy.

Test the real browser flow by opening:

```text
http://PRIVATE_BIND_IP:SEARXNG_PORT/
```

With the default configuration, `SEARXNG_PORT` is `8888`. If a normal browser
still receives `429`, inspect its network panel for the generated CSS-token
request and keep the user agent/language stable between page load and search.
Do not add a fake `X-Forwarded-For`, trust the whole private network, disable
the limiter, or repeatedly clear Valkey to make a raw smoke command pass.

## Redlib is missing, unhealthy, or blocked by Reddit

Redlib requires three configuration pieces to agree:

- `privacy-frontends` in `COMPOSE_PROFILES`;
- `redlib` in `ENABLED_SERVICES`; and
- an exact `PUBLIC_REDDIT_URL`/`PUBLIC_REDDIT_HOST` relationship.

It also requires `ANUBIS_PUBLIC_HOST` to match the public Redlib hostname.
The private `REDLIB_PORT` belongs to Anubis; Redlib itself has no host port.

Validate first:

```sh
node scripts/validate-config.mjs
docker compose config --quiet
docker compose --profile privacy-frontends ps anubis redlib
curl --fail --show-error --header 'CF-Connecting-IP: 192.0.2.1' \
  --user-agent 'redlib-instance-updater/1.0' \
  http://PRIVATE_BIND_IP:REDLIB_PORT/
```

On a fresh host, Redlib is a local source build rather than a registry pull:

```sh
docker compose build --pull redlib
docker compose --profile privacy-frontends up -d redlib anubis
```

The build deliberately fails if the pinned archive checksum changes, the local
redirect patch no longer applies cleanly, its Rust regression fails, or the
locked dependency build cannot complete. Do not remove those checks to make an
unreviewed upstream revision compile. Review the new official source, rebase
the patch, update its test/license/privacy records, and choose a new local image
tag through the documented update procedure.

If `/info` and the updater-compatible smoke check are healthy but a real community/post shows an upstream error,
inspect only bounded warning/error output:

```sh
docker compose logs --tail=100 anubis redlib
```

Keep `RUST_LOG=warn`. Informational/trace paths in this upstream can print an
emulated device identity or OAuth token prefix. Redlib intentionally uses
spoofed Android OAuth/client identity and browser/TLS emulation; Reddit can
block the mechanism or VM egress. Do not add a personal Reddit account, cookie,
or token. Stop Redlib, remove its edge route, and mark it unavailable if the
failure persists:

```sh
docker compose --profile privacy-frontends stop anubis redlib
```

If the final edge emits `Strict-Transport-Security: max-age=0`, confirm the
Redlib `reverse_proxy` has the documented
`header_down -Strict-Transport-Security`. If a crafted settings redirect can
leave the configured host, stop the service immediately and restore the known-
good patched image/source. Optional preference cookies are HTTP-only but lack
`Secure`/`SameSite` in the pinned source; that is a documented limitation, not
an excuse for an unverified edge header rewrite.

If every private Anubis request returns 500, confirm the trusted
`CF-Connecting-IP` header reaches it through the Cloudflare-only edge. Do not
make the header optional or trust an arbitrary inbound value to cure the
symptom. If browsers loop on the challenge, check the stable Ed25519 key mount,
exact public hostname, cookie attributes, clock, and bbolt directory ownership.
The metrics endpoint is intentionally container-loopback-only; lack of a host
port is correct.

## Status page shows unavailable while a service works

The portal checks only the fixed internal URLs in `STATUS_SERVICES`, with a short timeout; it is not a network scanner. Confirm the service shares the `services` Docker network and that its configured status URL/health response still matches the pinned version. Optional rimgo normally appears unavailable until its profile is running and it has been enabled in the catalog/configuration.

Do not expose internal details on the public status page to make diagnosis easier. Diagnose with Compose on the VM.

## A retired portal tool URL returns 404

This is intentional. Under `FOSS_POLICY.md`, the original portal-native tools
and custom webhook/DNS endpoints were removed rather than hidden behind a
feature flag. A capability may return only as a reviewed, self-hosted upstream
FOSS application. Do not restore the deleted code or add a portal relay as a
shortcut.

HTTP 431 from the portal means the request reached the conservative 100-header
boundary and was rejected before routing. Reduce the sender's headers; do not
raise the portal limit merely to accept an unexpectedly large header set.

## High memory, CPU, or an OOM kill

```sh
docker stats --no-stream
docker inspect --format 'oom={{.State.OOMKilled}} exit={{.State.ExitCode}}' "$(docker compose ps -q SERVICE)"
docker compose top SERVICE
```

Cobalt/FFmpeg and SearXNG under concurrent searches are the likely active peaks. Stop the affected service before the host becomes unstable:

```sh
docker compose stop SERVICE
```

Reduce portal concurrency/rate limits or disable expensive providers before raising CPU/RAM. The 500 MB media result size remains a soft target; this Cobalt version does not provide a safe exact output-size variable.

## Disk or Docker log growth

```sh
df -h
docker system df
docker compose logs --tail=20 SERVICE
docker inspect --format '{{json .HostConfig.LogConfig}}' "$(docker compose ps -q SERVICE)"
```

The expected log driver is `json-file`, with defaults of `10m` and three files. Rotation applies when containers are created with the Compose configuration. SearXNG cache and Valkey limiter state are bounded/recreatable; downloaded media must not be a persistent volume.

Do not run broad image, volume, or filesystem deletion commands during diagnosis. Identify exact objects and follow the backup/removal procedure.

## rimgo cannot retrieve Imgur content

Some hosting-provider address ranges are blocked or rate-limited by Imgur. Do not add private credentials, an unofficial account token, or another open proxy. Stop and defer rimgo:

```sh
docker compose --profile optional stop rimgo
```

Remove `rimgo` from `ENABLED_SERVICES`, clear `PUBLIC_IMGUR_URL`, recreate the portal, and remove/disable the public edge mapping. A clean deferral is preferable to a fragile workaround.

## Public edge returns 502 or times out

This section applies after `PRIVATE_PREVIEW=0` and the separate HTTPS/Caddy
edge is configured; it is not part of direct private preview.

- test the corresponding private health path from the edge VM;
- check the service is bound to the address/port in `.env`;
- check firewall counters and the edge source address;
- compare Caddy transport timeouts with `docs/edge-routing.md`;
- confirm a media response is streamed and not buffered;
- confirm the private route does not traverse public DNS.

Do not disable TLS verification for public clients, broaden the host firewall, or install a second reverse proxy on the application VM.
