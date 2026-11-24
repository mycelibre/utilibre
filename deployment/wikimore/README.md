# Wikimore on Utilibre

Wikimore 0.1.27, source commit `70b39146f36f54317ccda71fcc007caa5a555a1e`
from <https://git.private.coffee/PrivateCoffee/wikimore>. MIT license. Public
URL: `https://wikimore.utilibre.org/`; private backend: port 3244 on
`PRIVATE_BIND_IP`.

`prepare.sh /absolute/new/candidate` verifies the source revision and local
input hashes, applies the reviewed patch exactly, downloads hash-pinned Python
wheels and three exact Alpine security updates, builds the application wheel
offline, and obtains Leaflet 1.9.4 from
the npm package registry with the recorded SHA-256 before a network-disabled
image build. Leaflet's BSD license is included in the image and source bundle.
The upstream Docker image is a moving `latest` tag and is not its recommended
installation method; this build uses its native Python package and Gunicorn.

The source patch serves Leaflet from this origin, bounds the native memory
cache, rewrites new Wikimedia `thumb.wikimedia.org` image URLs into the local
proxy, removes third-party `srcset` fallbacks, removes source script/style
elements, and builds interactive-map popups with DOM text nodes. `media.py`
restricts the existing media proxy to exact Wikimedia hosts, HTTPS, bounded
content types/sizes and safe redirects without ambient proxy settings.
`wsgi.py` adds request limits, privacy headers, health and corresponding-source
routes; streamed source downloads keep their streaming response intact. None
of this adds tracking or a separate content database. Default
browser assets are local; an external link is contacted only when selected.

Search terms and article names reach Utilibre and the relevant Wikimedia API.
The source sees Utilibre's server connection and a fixed instance User-Agent,
not the visitor's IP. Native public-content caches are memory only, bounded
to 64 entries per worker; search lasts 30 minutes, articles one hour, and the
project list up to 24 hours. Browser theme/history/cache and saved files are
separate. There are no accounts or content backups. Search terms can occur in
native URL paths and browser history; no-referrer prevents ordinary link
leakage. Application/container request logs and analytics are disabled.

Check `docker compose --env-file .env -f deployment/wikimore/compose.yaml
config --quiet`. Runtime guards: 384 MiB, one CPU, 64 PIDs, two Gunicorn sync
workers, 16 MiB media response maximum. These do not establish a public
concurrency guarantee. Before enabling the portal or submitting the instance,
test the native search form, English and Spanish articles with images and
unusual title characters, link navigation, an interactive map if present,
source archive and browser network requests through the public HTTPS route.
The startup fetch of Wikimedia's sitematrix is essential, not telemetry.

Run `deployment/reference-readers/publish-source.sh wikimore /absolute/candidate /absolute/archive`
to package the reviewed source tree, this deployment directory, the shared
Alpine package manifest, and extracted
Leaflet files/license as `/opt/utilibre/toolbox-public/wikimore-utilibre.tar.gz`.
Exclude `.git`, downloaded build wheels, response captures and private receipts.
The source URL is `/utilibre-source/wikimore-utilibre.tar.gz`.

Rollback: stop only the Wikimore Compose service, remove its portal enablement
and edge route, and retain the previous image/source archive. There is no
persistent user account work to migrate or restore.
