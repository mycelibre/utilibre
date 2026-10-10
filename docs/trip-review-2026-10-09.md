# TRIP installation, privacy and recovery record

Verified 9 October 2026. This record supersedes the earlier source-only review.
**TRIP is installed with durable bounded storage, native OIDC and scheduled
backups. Public HTTPS, native sign-in and desktop/mobile rendering passed on
9 October 2026 with 1.50.1-p2.** The later
[rendering check](trip-rendering-2026-10-09.md) records the public route and narrow
CSP-compatible stylesheet fix; it supersedes the earlier private-only status.

## Exact software and active configuration

- Upstream [TRIP 1.50.1](https://github.com/itskovacs/trip/releases/tag/1.50.1),
  revision `856b1edfe81a735fce4b544c2e16a6518cebf164`, MIT in `license.txt`.
  The reviewed upstream amd64 image is
  `ghcr.io/itskovacs/trip@sha256:97525201a9bffcae86d4aa7468709317c84789bf9ad55b686bdae78605bad91c`.
- Local `utilibre-trip:1.50.1-p2` rebuilds the native interface and applies a small
  instance/security patch plus the separately removable rendering correction.
  A separate dependency patch pins Angular 21.2.24,
  Pillow 12.3.0 and compatible locked frontend dependencies; runtime pip is 26.2.
  The upstream image/lock had applicable current advisories. The final installed
  Python dependency audit and frontend production npm audit report no known
  vulnerabilities. This is not a claim of an exhaustive source/OS security audit.
- Native identity uses the existing Authentik service, a distinct `trip` client,
  exact callback `https://trip.utilibre.org/auth`, and all three approved,
  verified-email and `utilibre-trip-members` gates. Registration is disabled.
  Membership is explicitly operator-provisioned. A private bootstrap admin is
  seeded before admission; ordinary OIDC users do not become administrators.
- Gateway: `127.0.0.1:3224` for local checks, `10.10.1.43:3224` restricted to the
  established Caddy edge `10.10.1.3`. The local VM's LAN-sourced attempt was
  rejected; loopback health returned 200. The later real public browser check
  passed through the separate edge and Cloudflare.
  `deployment/trip/Caddyfile.pending` records the operator-managed edge block.
- App: one native worker, 1 CPU, 512 MiB RAM, 32 MiB temporary storage. Proxy:
  0.25 CPU/192 MiB; gateway: 0.25 CPU/64 MiB. The production data filesystem is a
  dedicated 1 GiB ext4 image mounted with nodev/nosuid/noexec. This bounds the
  installation collectively; there is no native enforced per-user storage quota.
- PDF attachment limit 2 MiB; request body limit 10 MiB; backup import limits
  8 MiB per uncompressed member/32 MiB total. Query text is limited to 200
  characters, routes to 32 points, provider responses to 2 MiB decoded and a
  10-second total deadline. Provider redirects and unapproved destinations are
  rejected. No global map/search/routing stack was installed.

## Compact data and provider evidence

| Claim/scope | Verified behavior and retention | Evidence |
| --- | --- | --- |
| Stored travel/account data | SQLite plus local assets, PDF attachments and native ZIP backups. Content is readable to the operator; no end-to-end encryption. Ordinary records have no configured automatic expiry. | Native models/settings; production two-account checks. |
| Browser state | Native access/refresh tokens, preferences and app caches can survive closing a tab. Downloads remain on the device. Access tokens last 10 minutes, refresh tokens 60 minutes; native logout removes browser tokens, not every separately copied token. Deleting the native account made its tested old JWT return 401. | `auth.service.ts`, configuration, deletion test. |
| Basemap | Browser requests `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; OSMF/Fastly receive tile coordinates and connection metadata. Referrer is origin-only, rather than the trip path. Normal browser HTTP caching is retained. No external tile offline/prefetch cache is configured. | `shared/map.ts`, service-worker configuration, scoped gateway headers; initial private checks used fixture tiles; the public rendering check loaded one bounded 35-tile real view with correct origin Referer and attribution. |
| Search | Fixed Photon provider sends query text and any supplied location bias through the TRIP server to `photon.komoot.io/api/`. The browser IP is not forwarded in this native path. Nominatim is not selected. | Native Photon implementation and fixed-provider guard. One fictional query returned 200/empty. |
| Routing | Server sends ordered route coordinates to `routing.openstreetmap.de`, operated by FOSSGIS with sponsored colocation from nine. FOSSGIS explicitly states that route requests are logged. Retention duration is not established. | Native Photon routing implementation; FOSSGIS primary policy; one synthetic walk between Brandenburg Gate and Reichstag returned 200, 290.8 metres and nine geometry points. No external load test. |
| Outbound DNS | The proxy resolves approved provider hostnames using Cloudflare 1.1.1.1 and Quad9 9.9.9.9. Those resolvers receive DNS names and connection metadata, separately from application search text or route payloads. Provider-stated recursive-DNS retention is distinguished from map/API retention in the shared privacy review; no independent deletion audit is claimed. | Active Squid nameservers and network resolver allowlist. |
| Optional external navigation | The deliberate Navigation control opens Google Maps in another tab with selected coordinates. Disabling Google API integration does not disable this distinct navigation link. Native author/source/documentation links also leave the instance when followed. | Native `openNavigation`; equivalent EN/ES instance/guide notes. |
| Disabled outbound features | Remote image downloading, link-title previews, Apprise delivery, Google API/provider integration, bulk/provider imports and automatic public version lookup are unavailable. Local image upload remains. | Narrow native guards, scoped gateway paths, domain allowlist and independent network boundary. |
| Uploaded images | Random image URLs are unauthenticated capability links. Anyone holding the exact URL can fetch the image without login. The tested place-image deletion removed its active file and made the URL return 404. Do not describe all uploads as authenticated/private. | Native static asset route and fictional image check. |
| PDFs and collaboration | Native PDF download checks trip membership; unrelated/anonymous accounts were rejected. Accepting an explicit invitation granted the intended access; revocation withdrew it. Separate intentional public sharing features exist and must be reviewed before sharing a link. | Native PDF upload/download, invitation and revocation tests. |
| Local logs/caches | Gateway/app HTTP access logs and routine HTTP client request logging are disabled. Application errors may include identifiers or submitted details. Container logs rotate at 2 MiB × two files per container, not a number of days. System/security and identity logs are separate. Squid stores no content cache. | Active gateway/app/proxy/container configuration. Public path is Cloudflare → separate Caddy → TRIP gateway. Edge/Cloudflare logging and retention remain unverified. |
| Backups | Daily consistent snapshots of native data plus private runtime configuration remain on this VM without automatic pruning. The service is briefly stopped and restarted through its firewall-aware unit. The job checks a 5 GiB host free-space floor plus snapshot estimate before copying. Same-host failure can affect service and backups together. | Enabled timer/service, successful manual production backup and disconnected recovery test. |

Functional map requests are not relabeled as Utilibre visitor analytics. Equally,
external providers' logs and aggregate statistics must not be called “no
tracking/no logs.” Map services are not confidential processors for private
search text or routes. Their API-specific retention periods remain unknown;
no duration has been invented or copied from unrelated website analytics.

## Provider policy fit

Primary policies were rechecked on 9 October against the installed endpoints;
no provider, cache, retention or routing setting was changed in this follow-up.
Recursive-DNS policy scope is now recorded in [the shared privacy review](privacy.md#provider-policy-and-endpoint-review-9-october-2026).
It does not establish deletion periods for tile, geocoding or route requests.

The [OSMF tile policy](https://operations.osmfoundation.org/policies/tiles/)
requires the canonical HTTPS tile URL, visible attribution, valid browser
Referer and appropriate caching. This deployment scopes `Referrer-Policy:
origin` to TRIP, keeps the normal browser cache, and includes OpenStreetMap and
“Fix the map” links. One bounded public rendering view loaded 35 real tiles;
repeated browser views substitute fictional local tiles. There is no
map-panning, bulk download or offline-prefetch test against OSMF.
The [OSMF services privacy FAQ](https://osmfoundation.org/wiki/Services_and_tile_users_privacy_FAQ)
identifies Fastly and provider usage logging/aggregate statistics. Its general
terms set a minimum age of 13 and exclude confidential submissions; the portal
notes that constraint. An analytics retention period in the general policy is
not evidence of tile-log retention.

[Photon's upstream README](https://github.com/komoot/photon) allows project use
within reasonable limits, may throttle/block extensive use and promises no
availability. It publishes no numerical shared-instance allowance or
API-specific retention period. **30 requests/minute is Utilibre's ceiling,
not a provider-approved quota.** The native nearby search is unsupported by
Photon and remains an explicit limitation.

[FOSSGIS's routing summary](https://routing.openstreetmap.de/about.html) requires
at most one request/second, identifying requests, attribution/fix-map links and
no heavy use. Its complete terms were checked in the operator's own public
[website source](https://github.com/fossgis/fossgis-webseite/blob/4c3c0039fcb02bfb487e93979889c3692e00f73f/content/arbeitsgruppen/osm-server/nutzungsbedingungen.md),
revision `4c3c0039fcb02bfb487e93979889c3692e00f73f` dated 1 October 2026.
They also limit backend scripts to **one concurrent download**, require an
easily reachable operator contact and prohibit high-traffic/bulk use. The
separate prior-consent rule for FOSSGIS `.de` tiles does not apply to the OSMF
`.org` tiles selected here. The
[privacy source](https://github.com/fossgis/fossgis-webseite/blob/4c3c0039fcb02bfb487e93979889c3692e00f73f/content/datenschutzerkl%C3%A4rung/_index.md)
does not supply a routing-log retention duration.

All native completion endpoints share one connection and a constant-key
Nginx **30/minute, no-burst** limit, so accepted starts are separated by two
seconds across users and route profiles. Batch paths are blocked. Backend
requests identify Utilibre-TRIP and its working support URL and send the TRIP
origin as Referer; the map attribution includes the verified operator contact
`admin@utilibre.org`. A held incomplete fictional request proved a second
completion is rejected even after the rate interval; no upstream call was made
in that test. This supports a small operator-provisioned service, not an
unbounded public map proxy, provider endorsement or promised availability.

## Export, deletion and recovery scope

Native UI: **Settings → Data → Backups**, plus button to create; refresh the list,
then download-arrow on a completed entry. The upload-arrow imports a ZIP.
`data.json` includes serialized settings, categories, places and owned trips.
The archive adds images owned by the exporting account and PDFs uploaded by it.
Trips merely shared with the exporter are omitted. A collaborator's uploads
are not covered by that own-upload rule. Do not promise complete history,
credentials, memberships, sharing tokens, permissions or all settings migrate.

The fictional test exported a ZIP, deliberately imported it into the second
account, and verified the new trip/place/image/PDF with remapped ownership and
byte-identical PDF content. The original account could not read the imported
copy. Separate native administrator ZIP recovery restored SQLite, assets and
PDFs in a disconnected disposable container. Its ZIP omits configuration, so
configuration was preserved separately. The scheduled production backup does
include private runtime/configuration; its archive also restored successfully
in a disconnected container with SQLite integrity `ok` and matching PDF bytes.

Native item deletion removes the tested active records/files; generated ZIPs
have a separate trash control. Whole account removal is an administrator action,
not a self-service button. It must be paired with removal of the service's OIDC
access grant to avoid re-creating an empty account at the next sign-in. The two
marked production-check accounts and the later two rendering fixtures were
deleted via the native API and retired in the identity provider. No real account or user data was deleted. Earlier independent
copies and operator backups remain separate and can retain deleted information.

## Verification and operational limits

Private report directory: `/opt/utilibre/reports/trip-20261009/`. Native code and
recipes are in `deployment/trip/`; upstream worktree is `/opt/utilibre/src/trip`.
The private, unsent upstream-report draft is outside the repository; no bug
report or message was sent to an external project.

- Production build and frozen-lock rebuild pass. Final production npm and
  installed Python dependency audits report zero known vulnerabilities.
- Two distinct synthetic accounts completed real identity MFA and native OIDC,
  including the **production HTTPS callback through a local TLS preview**.
  They received separate, non-admin app accounts. Those initial private tests
  intercepted tile requests locally. The later public rendering check used two
  separate fictional accounts, the actual public HTTPS callback and one real
  35-tile map view; repeated views used fixture tiles. No real travel records or
  personal locations were used in either run.
- Native account isolation, ownership regression, literal-text Leaflet tooltip
  regression, PDF limits, invitation/revocation, export/import, deletion and both
  recovery methods passed. The source patch is deliberately narrow and removable
  when upstream supplies equivalent behavior.
- App direct connections to the host, sibling gateway, unapproved ports/public
  destinations were blocked; proxy requests for private/metadata/IPv6/unapproved
  destinations were denied. The proxy's own namespace cannot directly reach the
  app. Native namespace rules complement host rules rather than relying on
  DOCKER-USER alone for same-bridge traffic.
- An 80-request, eight-client local `/api/info` burst produced 16 successes and
  64 rate-limit responses; the next health check returned 200. P95 was 23.72 ms
  for that burst. Afterward the pilot app used about 102 MiB, proxy 9.7 MiB and
  gateway 2.3 MiB. This measures bounded local API behavior, **not** how many
  simultaneous travel planners or external map queries the service can handle.
- The persistent service and backup timer are enabled. Configuration syntax,
  source patch apply/reverse checks and private source packaging are recorded
  alongside image/source hashes. The obsolete disposable pilot is stopped and
  its marked fixture recovery artifacts remain private.

## Access requirements and precise unknowns

The public route and native rendering gate are complete. The portal activation
is recorded separately by its release process.

1. Admit only deliberately approved real members through the existing native
   service group and explain shared storage/backup limits. Account requests are
   not silently opened by this installation. Native operator administration
   remains separate from ordinary user provisioning.
2. Provider-specific log retention for OSMF tile traffic, Photon API and FOSSGIS
   routing remains unverified. Public notes say so; any numerical retention
   promise is withheld. The live hostname is Cloudflare-proxied; the public
   notes identify that role. Cloudflare can process ordinary HTTP content at
   TLS termination and connection metadata. Applicable Cloudflare and
   separate-edge logging/retention remain unverified.
3. No off-host recovery copy exists. Do not imply that on-host snapshots survive
   loss of the VM/physical server. Existing backup retention was not shortened.

EN/ES card and guide modules are prepared separately for parent integration,
with equivalent image-capability/provider/export caveats and Spanish voseo.
The native release itself has English, French, Italian, Dutch and Brazilian
Portuguese; it does not provide a Spanish UI. No new translation backend or
whole-application translation fork was added.
