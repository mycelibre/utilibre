# Deployment

This deployment runs the portal and backend services on the application VM. HTTPS, public DNS, and public reverse proxying remain on the separate Caddy edge VM. Do not install Caddy, nginx, Traefik, Apache HTTP Server, HAProxy, or another general reverse proxy on the application VM.

Current application-VM note (2026-09-03): the live edge already targeted host
port 4173 from the design-review period. The temporary raw Node process on that
port was replaced with the hardened portal container, which now maps private
host port 4173 to container port 8080. This deployment-specific `.env` override
preserves the edge route; 8080 remains the repository default for new installs.

The launch deployment consists of the portal, Cobalt, SearXNG, SearXNG's
internal Valkey limiter datastore, and Redlib behind Anubis 1.27.0 in the
`privacy-frontends` profile. Anubis is a specialized Redlib gate, not a shared
reverse proxy. rimgo is an optional private-evaluation profile whose Imgur
compatibility test passed; public activation is blocked because reviewed 1.4.2
can produce an arbitrary external redirect. Invidious remains intentionally
absent from `compose.yaml`.

The public Redlib route now reaches Anubis on the configured private port;
Redlib itself has no host-published port. The direct-preview workflow below is
retained for fresh installations, but Anubis's production real-client header
trust assumes the Cloudflare-to-Caddy route and must not be treated as an
ordinary LAN browser endpoint.
`PRIVATE_PREVIEW=1` deliberately uses private HTTP URLs, leaves
`EDGE_PROXY_IP` empty, makes the portal ignore forwarded client headers, and
renders SearXNG's limiter with no trusted edge entry beyond loopback. This mode
is for an operator-controlled private network only. HTTP traffic is plaintext,
so restrict all four published ports to the exact trusted preview client or
management network and never route them from the public Internet.

## Direct private preview

For a fresh checkout with no `.env`, the shortest supported setup is:

```sh
node scripts/init-private-preview.mjs PRIVATE_BIND_IP
node scripts/init-secrets.mjs
node scripts/render-config.mjs
node scripts/validate-config.mjs
docker compose config --quiet
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
docker compose ps
sh scripts/check-health.sh
sh scripts/verify-network.sh
```

Replace `PRIVATE_BIND_IP` with one exact private address assigned to this VM.
The argument to `init-private-preview.mjs` is optional when the VM has one
unambiguous private address, but supplying it is safer on a multihomed host.
The initializer creates `.env` with mode `0600`, generates the SearXNG secret,
writes exact direct HTTP service URLs including Redlib, enables the matching
`privacy-frontends` profile/catalog ID, leaves `EDGE_PROXY_IP` empty, and
refuses to overwrite an existing `.env`. It does not generate the separate
matching Cobalt key pair; `init-secrets.mjs` does that without printing the key.

With the default ports, the private destinations are:

- portal and browser tools: `http://PRIVATE_BIND_IP:8080/`;
- SearXNG: `http://PRIVATE_BIND_IP:8888/`;
- Anubis/Redlib ingress: `http://PRIVATE_BIND_IP:3002/` (production policy
  requires the trusted Cloudflare client-address header; do not expose this as
  a general direct-browser URL); and
- Cobalt tunnel delivery: generated `http://PRIVATE_BIND_IP:9000/tunnel?...` links only.

Port `9000` is not a user interface. Media preparation still enters through the portal's same-origin `/_portal/media`; the portal keeps the Cobalt key server-side and accepts only an exact preview tunnel URL from the configured Cobalt origin. Do not expose or use Cobalt's API root as a general private proxy.

Modern browsers treat a private-IP HTTP origin as less trustworthy than HTTPS. The portal provides local fallbacks for UUID generation, SHA-256/SHA-512 hashing, and copy behavior so the tested tools remain usable, but HTTPS is still preferred and is mandatory for public deployment. Test the target browsers in the final HTTPS topology before launch.

To resume an already prepared preview, do not rerun the initializer:

```sh
node scripts/validate-config.mjs
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
docker compose ps
```

To stop the current preview while retaining its containers and cache:

```sh
docker compose --profile privacy-frontends --profile optional stop
```

To remove its containers and networks while retaining the named cache, images, `.env`, and secrets:

```sh
docker compose --profile privacy-frontends --profile optional down
```

Before public launch, replace the preview values with the real HTTPS host/origin plan, set `PRIVATE_PREVIEW=0`, configure one exact separate `EDGE_PROXY_IP`, re-render the limiter, and pass `node scripts/validate-config.mjs --launch`. The launch validator rejects preview mode and direct HTTP/IP service URLs.

## Prerequisites

- Docker Engine with the Compose plugin (`docker compose`)
- Git
- Node.js 24 or newer for the pinned portal build/tests and configuration scripts
- OpenSSL or another secure way to create the SearXNG secret
- one stable application-VM address reachable by the intended private preview client or edge VM but not by the public Internet
- for public launch, the exact private address of the edge VM
- for public launch, four public hostnames: portal, media tunnel, search, and Redlib

Run all repository commands from the repository root. Never paste the resolved output of `docker compose config` into a ticket: it can contain environment secrets.

## 1. Prepare private configuration

This section describes the edge-proxied HTTPS configuration. For direct private HTTP access, use the initializer above instead of manually adapting the public-host placeholders.

Create the untracked environment file with restrictive permissions:

```sh
umask 077
cp .env.example .env
chmod 600 .env
```

Edit `.env` and replace every `REPLACE_*` value. Important relationships are:

- `PRIVATE_PREVIEW=0` is required for public launch. `node scripts/validate-config.mjs --launch` refuses `1`.
- `PRIVATE_BIND_IP` is the application VM's private or Tailscale address. It must be an address assigned to this VM, never `0.0.0.0` or `::`. Enter an IPv6 ULA/Tailscale address without brackets; Compose uses unambiguous long-form port mappings.
- `EDGE_PROXY_IP` is one exact address used by the Caddy edge VM to reach this VM. Do not enter a subnet.
- `PORTAL_PRIVATE_PREVIEW=0` with an exact `PORTAL_EDGE_PROXY_IP` can put only
  the portal into trusted-edge mode during a staged cutover. Set
  `PORTAL_PUBLIC_ORIGIN` to the public portal origin,
  `PORTAL_COBALT_BROWSER_URL` to the public media URL, and
  `PORTAL_COBALT_RESULT_SOURCE_URL` to the exact URL the unchanged Cobalt
  container currently emits. The portal rewrites only exact `/tunnel` results.
  These overrides do not alter or restart Cobalt or SearXNG and do not replace
  the full `--launch` validation.
- `PUBLIC_PORTAL_ORIGIN` is an origin only, for example `https://tools.example.org`, with no path or trailing slash.
- `COBALT_PUBLIC_API_URL` is the HTTPS media hostname with a trailing slash. Cobalt-generated tunnel links use it.
- `PUBLIC_SEARCH_URL` is the public SearXNG URL with a trailing slash.
- `PUBLIC_REDDIT_URL` is the Redlib HTTPS origin with a trailing slash and must match `PUBLIC_REDDIT_HOST`/`ANUBIS_PUBLIC_HOST` when Redlib is enabled. `ANUBIS_REAL_IP_HEADER=CF-Connecting-IP` is safe only while Cloudflare is the sole ingress to the edge origin. `PUBLIC_YOUTUBE_URL` stays empty while Invidious is deferred; `PUBLIC_IMGUR_URL` stays empty because rimgo 1.4.2 is launch-blocked.
- `ENABLED_SERVICES=cobalt,searxng,redlib` and `COMPOSE_PROFILES=privacy-frontends` form the launch set. Remove `redlib`, the profile, and its public URL together to disable it cleanly.
- `TZ=America/Guatemala` controls supported container-local timestamps; it does not change the host time zone.

Generate a 32-byte SearXNG secret and place the resulting value in `SEARXNG_SECRET`:

```sh
openssl rand -hex 32
```

Do not commit `.env`, the generated value, or the final private addresses.

## 2. Generate secrets and derived configuration

Generate a matching UUID API key for the portal and Cobalt. The command writes only into the ignored `secrets/` directory, forces the directory to mode `0700`, uses read-only `0444` files for the non-root bind-mount consumers, and does not print the key:

```sh
node scripts/init-secrets.mjs
```

Render the SearXNG limiter configuration with the exact trusted edge address, or with no edge entry when a validated private preview leaves `EDGE_PROXY_IP` empty:

```sh
node scripts/render-config.mjs
```

This writes ignored `config/searxng/limiter.toml`. Compose mounts the whole `config/searxng/` directory read-only at `/etc/searxng`, overriding the official image's anonymous configuration volume. In edge mode the generated file contains the exact trusted edge address; in private preview it trusts only loopback. Do not commit or include the generated limiter in a public backup.

Both scripts refuse unsafe or inconsistent input rather than overwriting an existing partial secret pair. Back up `.env` and `secrets/` separately in an encrypted, operator-controlled store.

## 3. Validate before pulling or starting

```sh
docker compose version
docker version
node --check scripts/init-secrets.mjs
node --check scripts/validate-config.mjs
node --check scripts/render-config.mjs
node scripts/tests/validate-config.test.mjs
node scripts/validate-config.mjs
docker compose config --quiet
```

The command above validates either a private preview or an edge-prepared private deployment. Public launch additionally requires:

```sh
node scripts/validate-config.mjs --launch
```

That stricter command rejects `PRIVATE_PREVIEW=1`, empty edge trust, private HTTP/IP service URLs, placeholders, and other unfinished launch values.

Review the configured image references without expanding secret values:

```sh
docker compose config --images
```

Every pulled upstream image in `compose.yaml` is pinned to a release tag and
digest. The portal is built locally from a digest-pinned Node base. Redlib is
built from an exact official Git commit/checksum with digest-pinned Rust builder
and Ubuntu runtime bases, then receives the tracked local redirect hardening
patch. Do not replace any pin with `latest` or an unfixed branch.

## 4. Pull and build

```sh
docker compose pull cobalt searxng valkey anubis
docker compose build --pull portal redlib
```

The application VM needs outbound HTTPS and DNS for image pulls and for the services' legitimate upstream requests. It does not need inbound public access.

## 5. Start the core stack privately

```sh
docker compose --profile privacy-frontends up -d portal cobalt searxng valkey redlib anubis
docker compose ps
```

Compose publishes only these core host ports, all on `PRIVATE_BIND_IP`:

| Service | Default host port | Container port | Private protocol |
|---|---:|---:|---|
| Portal | `8080` | `8080` | HTTP |
| Cobalt | `9000` | `9000` | HTTP |
| SearXNG | `8888` | `8080` | HTTP |
| Anubis (Redlib ingress) | `3002` | `8080` | HTTP |
| Redlib | none | `8080` | Docker service network only |

Valkey has no published port. No database, cache, Docker socket, administrative port, debug port, or metrics port is published.

When `PRIVATE_PREVIEW=1`, browse to the portal and search URLs listed in the
direct-preview section. Anubis's production policy expects the trusted
Cloudflare client-address header; use the documented updater-compatible curl
only for a private ingress smoke check, not as a normal direct-browser route.
The browser must also be able to reach the configured Cobalt port for
short-lived `/tunnel` downloads. Permit only the intended preview client(s);
binding to a private IP is not a firewall.

Wait for the health checks, then run:

```sh
sh scripts/check-health.sh
sh scripts/verify-network.sh
docker compose ps
```

Also inspect all listeners rather than relying on Compose alone:

```sh
ss -lntp
```

Expected project listeners show the exact `PRIVATE_BIND_IP`, not `0.0.0.0`, `*`, `[::]`, or a public-interface address. `scripts/verify-network.sh` also fails if a host listener appears on the usual PostgreSQL or Valkey ports. It does not replace a firewall or an external exposure test.

## 6. Test privately or from the edge VM before public routing

Replace the placeholders below only in the operator's shell, not in repository files:

```sh
curl --fail --show-error http://APP_VM_PRIVATE_IP:PORTAL_PORT/healthz
curl --fail --show-error http://APP_VM_PRIVATE_IP:COBALT_PORT/
curl --fail --show-error http://APP_VM_PRIVATE_IP:SEARXNG_PORT/healthz
curl --fail --show-error --header 'CF-Connecting-IP: 192.0.2.1' \
  --user-agent 'redlib-instance-updater/1.0' \
  http://APP_VM_PRIVATE_IP:REDLIB_PORT/
```

An unrelated machine on the private network and a controlled host outside it
should fail to connect to all four application ports. See
[firewall.md](firewall.md).

The direct Cobalt API must require its key. A POST without a key must not process a request:

```sh
curl --include --request POST \
  --header 'Content-Type: application/json' \
  --data '{}' \
  http://APP_VM_PRIVATE_IP:COBALT_PORT/
```

Do not place the portal's Cobalt key in a browser, Caddyfile, shell history, or public test request.

In private preview, perform the same health checks from the intended browser/client host. SearXNG's public-instance limiter uses a browser link token: a normal browser first loads `/` and its generated `client<token>.css`, then searches with the same user agent and language. A raw scripted `POST /search` that skips that flow can correctly return `429`; do not fix it by trusting arbitrary forwarding headers or disabling the limiter.

For Redlib through the public HTTPS route, load `/`, one small public subreddit, and one post containing a
small image. Confirm that page and media requests go only to the configured
Redlib origin in browser developer tools. Test the local redirect patch with a
scheme-relative or backslash-prefixed `redirect` value and confirm it cannot
navigate to another host. Do not repeatedly probe Reddit or treat one working
request as a promise that its anti-bot rules will remain unchanged.

Use a fresh browser context to confirm that the first request receives Anubis's
mild challenge, the solved 24-hour cookie permits navigation, and that the
cookie remains valid across an Anubis-only restart. Confirm `/info` and exact
official instance-updater user agents pass without the interactive challenge.
Reject or ignore spoofed `X-Original-URI`, `X-Forwarded-Uri`, and alternate
client-address headers at the real edge.

## 7. Configure the edge manually

This section is not used by `PRIVATE_PREVIEW=1`. It is mandatory before any public launch.

Apply the mappings in [edge-routing.md](edge-routing.md) on the Caddy edge VM. The critical rule is that the public media hostname routes only `GET /tunnel`; it must not expose Cobalt's root API, session endpoints, or a catch-all path. The browser sends processing requests to the portal's same-origin `/_portal/media` endpoint, which validates the request and supplies the Cobalt key internally.

After validating and reloading Caddy on the edge, verify:

```sh
curl --fail --show-error https://PUBLIC_PORTAL_HOST/healthz
curl --fail --show-error https://PUBLIC_SEARCH_HOST/healthz
curl --fail --show-error https://PUBLIC_REDDIT_HOST/info
curl --include --request POST https://PUBLIC_MEDIA_HOST/
curl --include https://PUBLIC_MEDIA_HOST/
```

The last two requests must return a non-success response. Only a valid, short-lived `/tunnel` URL produced by the authenticated portal flow should stream from the media hostname.

Cloudflare Network Error Logging was disabled for the zone on 2026-09-03.
Accepted public responses checked after the change contained neither `NEL` nor
`Report-To`. Keep their absence as a release and regression gate:

```sh
task_headers=$(mktemp)
trap 'rm -f "$task_headers"' EXIT HUP INT TERM
curl --silent --show-error --fail --location \
  --dump-header "$task_headers" --output /dev/null \
  https://PUBLIC_PORTAL_HOST/
if grep -Eiq '^(nel|report-to):' "$task_headers"; then
  printf '%s\n' 'Cloudflare NEL headers have returned' >&2
  exit 1
fi
rm -f "$task_headers"
trap - EXIT HUP INT TERM
```

The `--fail` check prevents a Cloudflare challenge or other error response from
passing solely because it omitted the reporting headers. Repeat for every
deployed public Utilibre hostname and after Cloudflare policy changes.
Cloudflare remains the public proxy and a processor of connection metadata.
See [Cloudflare's NEL
documentation](https://developers.cloudflare.com/network-error-logging/).

The portal's HTML responses must also retain `Cache-Control: no-cache,
no-transform`. Check both the header and response body through the public edge;
the body must not contain `/cdn-cgi/challenge-platform/`. This keeps
edge-injected JavaScript outside the portal instead of weakening the portal's
CSP to accommodate it. Static hashed assets keep their immutable cache policy.

The Redlib edge route is a normal site route because pages, images, and media
all use many paths. Its private destination is Anubis; only Anubis reaches
Redlib on the Docker network. Preserve cookies, query strings, `Range`, and
streamed responses; emit noindex/security headers and avoid path/query access
logging. Preserve Cloudflare's authentic `CF-Connecting-IP` only on a
Cloudflare-only origin and strip request-target override headers. Anubis raises
the cost of common scraping but is not an absolute bot or DDoS barrier.

## 8. Redlib policy and lifecycle

Anubis uses the official unmodified 1.27.0 image pinned by immutable digest.
Its policy starts with narrow `/info` and official instance-updater exceptions,
then imports the current upstream defaults without the unsupported Thoth path.
Ordinary browsers normally receive difficulty 2. Challenge records have a
logical 30-minute TTL in `data/anubis/`; the stable signing key stays in the
ignored secrets directory. The authorization cookie is host-only, Secure,
HttpOnly, SameSite=Lax, Partitioned, and valid for 24 hours. Metrics listen only
on container loopback and normal logs are WARN/error with Docker 10 MB × 3
rotation.

Redlib is a source-built, modified AGPL service. Compose pins official commit
`a4d36e954cf1bd64f209cd8868c5a29edc81b374` and its source checksum, pins both
build/runtime bases by digest, and applies the tracked redirect patch in
`config/redlib/`. `SOURCE_CODE_URL` must expose that exact upstream source,
patch, Docker build wiring, and deployment configuration to network users.

This deployment deliberately overrides the project's original blanket ban on
unofficial credential workarounds for Redlib only. Upstream emulates an
official Reddit Android client and OAuth identity and rotates generated device
state; the pinned client also emulates browser/TLS fingerprints. The operator
accepted that behavior after review. It does not use personal credentials, but
it is neither an official Reddit integration nor resistant to future blocking.

Redlib is started with application HSTS expiry zero (`--hsts 0`) because TLS
and the HSTS decision belong to the edge. Pinned upstream still emits
`Strict-Transport-Security: max-age=0`, so the documented Caddy route strips
that response header. Indexing is disabled and RSS is omitted entirely: in
this pinned source, merely setting `REDLIB_ENABLE_RSS` can enable
some RSS routes regardless of the string value. The upstream interface remains
English-only.

Disable it quickly without disturbing search or media processing:

```sh
docker compose stop redlib
```

Stop the public pair together for an abuse or upstream outage:

```sh
docker compose --profile privacy-frontends stop anubis redlib
```

To temporarily roll the private ingress back to direct Redlib while preserving
all data, use the tracked emergency override only after removing/closing the
public edge route:

```sh
docker compose --profile privacy-frontends stop anubis
docker compose --profile privacy-frontends -f compose.yaml \
  -f config/anubis/rollback.compose.yaml up -d --no-deps --no-build redlib
```

Direct Redlib removes the challenge gate and is not the normal public posture.

For a persistent configuration disable, remove `redlib` from
`ENABLED_SERVICES`, remove `privacy-frontends` from `COMPOSE_PROFILES`, clear
`PUBLIC_REDDIT_URL`, rebuild/recreate the portal, and remove the public edge
site. The validator requires those switches to agree.

## 9. Optional rimgo evaluation

rimgo is not part of the default profile because Imgur can block hosting-provider address ranges, rimgo has no built-in public-instance limiter, and reviewed 1.4.2 contains an unsafe `/search` external-redirect case. Start it on the private address only for controlled testing; do not add a public route merely because the smoke test passes:

```sh
docker compose --profile optional pull rimgo
docker compose --profile optional up -d rimgo
docker compose --profile optional ps rimgo
curl --fail --show-error http://PRIVATE_BIND_IP:RIMGO_PORT/
```

Test a small public image, an album, a video range request, upstream error handling, and repeated requests without generating abusive traffic. Stop the private evaluation afterward whether it passes or fails:

```sh
docker compose --profile optional stop rimgo
```

Leave `PUBLIC_IMGUR_URL` empty, leave `rimgo` out of `ENABLED_SERVICES`, and do not create DNS, TLS, or an edge mapping. The launch validator enforces those conditions. If an official release fixes the redirect, update the image pin and repeat the maintenance, security, redirect, HSTS, localization, Range, bandwidth, logging, and abuse-control review before changing the validator, catalog, documentation, or edge plan.

## Routine operation

Show high-level status:

```sh
docker compose ps
sh scripts/check-health.sh
```

Inspect bounded recent logs locally:

```sh
docker compose logs --tail=100 portal
docker compose logs --tail=100 cobalt
docker compose logs --tail=100 searxng
docker compose logs --tail=100 valkey
docker compose logs --tail=100 anubis redlib
```

Logs can still contain incident-related metadata. Do not publish them without reviewing and redacting them. Docker uses `json-file` rotation from `.env` (default `10m` per file and three files).

Restart one service:

```sh
docker compose restart SERVICE
docker compose ps SERVICE
```

Disable one service without affecting the others:

```sh
docker compose stop SERVICE
```

Stop all running containers while retaining them:

```sh
docker compose --profile privacy-frontends --profile optional stop
```

Remove project containers and networks while retaining named volumes and images:

```sh
docker compose --profile privacy-frontends --profile optional down
```

Do not add `--volumes`, remove secret files, or delete the repository unless an intentional full purge has been reviewed against the backup documentation.

## Upstream deployment references

- [Cobalt self-hosting documentation](https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md)
- [SearXNG container installation](https://docs.searxng.org/admin/installation-docker.html)
- [SearXNG limiter documentation](https://docs.searxng.org/admin/searx.limiter.html)
- [Redlib official repository and deployment documentation](https://github.com/redlib-org/redlib)
- [Pinned Redlib source commit](https://github.com/redlib-org/redlib/tree/a4d36e954cf1bd64f209cd8868c5a29edc81b374)
- [rimgo canonical repository](https://codeberg.org/rimgo/rimgo)
