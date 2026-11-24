# Freetar on Utilibre

Freetar 0.22.0, source commit `0418035548a5d42f6252621514cd0949a7845b1b`
from <https://github.com/kmille/freetar>. GPLv3 LICENSE; this record does not
infer an `-only` or `-or-later` grant. Public URL: `https://tabs.utilibre.org/`;
private backend: port 3243 on `PRIVATE_BIND_IP`.

`prepare.sh /absolute/new/candidate` verifies the exact source revision and
companion hashes, applies `upstream.patch` without fallback, downloads only
hash-pinned CPython 3.14 Alpine wheels and three exact Alpine security updates,
builds a wheel offline, builds the
runtime image without network, and runs offline regression tests. This only
prepares an image. The upstream Docker image uses a moving `latest` tag; this
build retains the native application and pins its source and dependencies.

The source patch escapes upstream chord HTML before Freetar marks chord spans,
removes its optional HTML minifier (whose pinned transitive `jsmin` lacked a
binary wheel), uses DOM text nodes for imported favorites, and prevents
redirects from direct Ultimate Guitar requests. The deploy boundary adds
request limits, privacy headers, a health endpoint and corresponding source.
The patch is limited to this application; no new scraper or account service
was built. `FREETAR_LOCAL=1` means the server contacts Ultimate Guitar
directly and never uses public Freetar proxy instances. Browser favorites and
theme stay in localStorage. Search terms and selected tab paths reach this
server and Ultimate Guitar. The native search URL also exposes terms in browser
history; no-referrer prevents forwarding them through ordinary links.

Use `docker compose --env-file .env -f deployment/freetar/compose.yaml config
--quiet` before activation. The 256 MiB, 0.75 CPU, 64 PID, four-thread and
128-entry/15-minute memory-cache limits are resource guards, not a concurrency
claim. No persistent content or account database needs backup. Container
logging is off. The edge must use the checked Caddyfile and existing global
access/error log exclusions. No visitor analytics or third-party browser
assets are installed.

Before setting the portal ID to enabled or requesting upstream listing, test
the real search form and a Chords result from two clean browser profiles,
favorites export/import in one profile, autoscroll/print, source link, browser
network requests and the exact public HTTPS route. A successful homepage alone
is insufficient. Afterward, add only the `freetar` ID to the portal and outside
monitor set. The upstream README instance list is maintained by its author;
submit a PR with the working address and wait for review.

Run `deployment/reference-readers/publish-source.sh freetar /absolute/candidate /absolute/archive`
to package the reviewed source tree, this deployment directory and the shared
Alpine package manifest as
`/opt/utilibre/toolbox-public/freetar-utilibre.tar.gz`. Exclude `.git`, build
wheels, runtime cache, screenshots, request captures and private receipts.
The source URL is `/utilibre-source/freetar-utilibre.tar.gz`.

Rollback: stop only the Freetar Compose service, remove its portal enablement
and edge route, and retain the source archive and image for review. Browser
favorites remain in the user's profile; do not delete them remotely.
