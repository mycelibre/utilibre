# Structables admission and Google IPv6 check — 27 October 2026

## Result

Structables 0.4.5 (`4f10ce078543685db88d8ed57606aaa14fae84d9`) is built and
privately tested, with a bilingual catalogue entry and reading guide. **Public
activation is blocked by incomplete image retrieval**, independently of the
remaining Caddy/TLS route. Search and project text pass; full reading does not.
The portal must not offer a launch button yet. No third-party relay, upstream
account cookie or direct-browser image fallback was introduced.

The canonical source is
<https://git.private.coffee/PrivateCoffee/structables>; its GitHub mirror is
older. The complete FOSS app's supported manual/container path uses Flask and
WSGI. The source LICENSE establishes AGPLv3; this record does not infer a
broader version grant. Upstream's public-site search key discovery remains
native; no personal credential is involved. Interface: English only.

## Implementation

See [`deployment/structables`](../../deployment/structables/README.md): pinned
Python/Alpine image, exact wheel hashes, one upstream patch, narrow outbound
transport/content hardening, native policy file, two-worker Gunicorn service,
Compose/Caddy definitions and eight offline tests. The final image `sha256:9e5f4e7262bcc497002ecdfd3fc61a5c92e43390eb3889ceaf6d8c4c52e8e9e5`
scan found no vulnerabilities with advisory data updated 27 October 2026
at 07:13 UTC (downloaded at 10:24 UTC). This is a scan result,
not proof that all vulnerabilities are absent. The initial Debian candidate
had OS and pip-vendor findings and was not selected.

The native task remains upstream's reader. nh3 sanitizes embedded HTML;
the integration does not implement a scraper, general proxy or image processor.
All normal browser assets are local. Frames, arbitrary redirect destinations,
non-allowlisted fetches, public cron, uploads and non-search POSTs are blocked.
Permitted upstreams are www/cdn/content.instructables.com over HTTPS. Media is
bounded to 8 MiB/response with a ten-second socket timeout. No personal headers
are forwarded. CSP blocks external automatic resources and uses a hash for the
native theme script. Access/container logging is disabled. No account data or
database exists. JSON cache: 32 entries/worker, at most 15-minute reuse;
memory-only, cleared on restart, no immediate-erasure guarantee. Media disk
caching and content backups are disabled.

Resource safety limits: 384 MiB, one CPU, 64 PIDs, 32 MiB temporary filesystem,
two sync workers, backlog 16, 35-second worker timeout. Observed private-run
memory after tests: about 83 MiB; this is not a concurrency benchmark. Existing
VM observation before builds: 14 GiB available root disk, about 18 GiB available
RAM. No cleanup, capacity change or other service restart was performed.

## Evidence and limits

Private receipts: `/var/lib/utilibre-maintenance/structables-20261027/`.

- Eight offline behavior tests passed: permitted/forbidden destinations,
  redirect denial, oversized stream rejection, timeout bound, native search
  POST delegation, sanitizer preservation/rejection, headers and route denial.
- Exact upstream patch application and reversal passed via the existing
  source-replay mechanism; its local lock was extended without changing other
  recipes. `inputs.sha256` captures companions and dependency pins.
- A native paper-airplane search returned project links. Two paper-airplane
  pages returned 12–17 steps. A separate electronics project returned eight
  steps. Their full-size photographs failed, including direct source checks.
- One 600-pixel thumbnail passed through the media proxy as a valid 29,969-byte
  JPEG. Another thumbnail failed. Increasing the successful thumbnail to the
  native article width failed, but reducing the paper image did not fix it.
  There is no demonstrated general resolution workaround.
- Browser checks: Playwright Chromium; no external browser requests or script
  errors observed. Full desktop/mobile reading acceptance **failed** on images;
  real-device mobile use was not tested. Do not label this flow ready.
- DNS resolves the intended hostname; the current HTTPS request returns 525.
  No separate edge configuration was changed.

The two release dependencies are working representative project images and
the owner's Caddy site block/TLS check. Only then set the catalogue/provider to
operational/deployed, populate `PUBLIC_STRUCTABLES_URL`, enable `structables`,
and add its health endpoint to the existing status monitor. Until then list it
as unavailable, preserving the prepared build and guide.

## Routes, source and rollback

Reserved service: `https://structables.utilibre.org/`, backend port **3242**.
Guide routes: `/en/guides/read-instructables` and `/es/guias/leer-instructables`.
Both explicitly disclose the unavailable state. The source bundle is
`structables-utilibre.tar.gz`, with the original source, applied patch,
companions, dependency hashes, build and operating instructions. No fetched
project content or test captures belong in that archive.

Stop only this candidate/Compose project if needed. It holds no saved user
work. Keep its source/image receipt; do not prune existing images. Portal-only
rollback restores the previous portal image and removes the listed service ID;
there is no database migration. Caddy configuration is prepared, not deployed.

## Other requested checks

Google WML returned HTTP 403 over native host IPv6 using both curl and the
installed SearXNG client's curl_cffi version/impersonation. No public search
configuration changed. See [engine review](../searxng-engine-review.md).

Priviblur [PR #303](https://github.com/syeopite/priviblur/pull/303) already exists
and remains open without reviews/comments. Its URL, Germany location,
Cloudflare disclosure and modified-source link are correct. No duplicate
submission or reminder was sent. Acceptance remains up to its maintainers.

## Portal verification and release

Typecheck, lint, FOSS policy, build and all 120 unit tests passed. All 48
Chromium end-to-end checks passed across the appropriate runners: 47 use Vite
with mocked configuration; no-JavaScript navigation uses the built SSR server.
The guide fixture now includes the previously added creative applications,
and its bounded timeout accounts for checking the entire bilingual registry.
This corrects fixture/environment failures; no production features were
disabled to pass a test. The stale Redlib version assertion now matches its
already-recorded source revision.

Separate 390-pixel English/Spanish catalogue and guide checks found no
horizontal overflow, external browser requests or enabled Structables launch
links. Screenshots were inspected. This is browser emulation, not phone
hardware verification. The guide remains reachable from the card's help
disclosure and the existing guide index.

Release only the portal from committed source with `structables` added to
`LISTED_SERVICES`, preserving `ENABLED_SERVICES` and leaving its URL unset.
Candidate image tag: `public-utility-portal:0.1.0-structables-review-20261027`.
Previous tag: `public-utility-portal:0.1.0-catalog-views-20261012`. Use the
existing root Compose process with `--no-deps --no-build --pull never portal`.
For rollback, restore that previous portal image and the saved listed-services
value, then recreate only `portal`. Keep unrelated environment values intact.
No Structables container, Caddy route, search configuration, or public-instance
submission is activated by this portal release. Exact release receipts stay
in the private evidence directory.

### Portal base-package gate

The first portal candidate scan found two musl package occurrences of
CVE-2026-107891 and one zlib occurrence of CVE-2026-85091. The same older
package versions were present in the running portal; deployment stopped before
recreating it. The pinned Node image still contains those versions.
`portal/Dockerfile` now shares a base stage with exact native Alpine updates:
`musl=1.2.6-r3`, `musl-utils=1.2.6-r3`, `zlib=1.3.2-r1`. Both build and runtime
inherit them. This uses signed distribution packages, with no application
source patch. The [Alpine 21 October release notice](https://www.alpinelinux.org/posts/Alpine-3.21.9-3.22.7-3.23.7-3.24.3-released.html)
documents both corrections. A future base replacement must pass the same
scan before these pins can be removed. No scanner finding was suppressed.

The corrected portal image scan reports zero findings against the same
advisory snapshot. Both localized catalogue and guide routes pass on that
exact image, with disabled service launches and no narrow-screen overflow.
