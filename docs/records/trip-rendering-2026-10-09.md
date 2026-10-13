# TRIP public rendering check and repair

Verified 9 October 2026. The actual public `https://trip.utilibre.org/` route now
serves **TRIP 1.50.1-p2** through Cloudflare and the existing Caddy edge. Native
desktop and mobile workflows passed. Access still requires the approved,
verified-email and service-membership gates; public availability does not mean
open registration.

## Defect and narrow correction

The p1 production build emitted its main stylesheet as `media="print"` with an
inline `onload` handler to switch it to `all`. The existing `script-src 'self'`
CSP correctly blocked that handler. The page returned 200 and its JavaScript
worked, but most application styling never became active. Before screenshots
confirmed the defect on desktop and mobile. The earlier installation tests
caught page exceptions but did not reject the browser's CSP console error.

`deployment/trip/rendering.patch` selects Angular's supported
`optimization.styles.inlineCritical=false` build option. The stylesheet now
loads normally without the inline handler. **The CSP was not weakened.** The
same small patch treats native 404 responses for absent public-share metadata
as an empty result, while preserving all other errors. This prevents an
unhandled Angular exception when opening an intentionally unshared trip. It
does not create sharing links or change authentication or API permissions.

The patch applies to upstream revision
`856b1edfe81a735fce4b544c2e16a6518cebf164` independently of the existing security
and dependency patches. The installed image is `utilibre-trip:1.50.1-p2`, image
ID `sha256:a8be198a5750f2ccbc8e89fe8f0c8e5af40b30d227f7beeda3d761ae86b90ca4`.
Remove this adaptation once the selected upstream build handles the same CSP
and absent-share case correctly, then repeat these checks.

## What was checked

- Actual public browsers at **1440 × 1000** desktop and **390 × 844** touch
  mobile. The second context used `es-GT`; the native application still has no
  Spanish translation, as documented by the bilingual portal guide.
- Two separately named fictional accounts completed ordinary Authentik
  username/password, MFA and native OIDC sign-in. Both received non-admin native
  accounts. No real account or travel data was inspected.
- Logged-out screens, settings dialogs, the native create-trip dialog, trip/day
  layout, map markers, collapse/reopen controls and a normal page reload. The
  actual native create button saved the fictional trip. The normal authenticated
  API added fictional day/place details, using public Louvre coordinates.
- Before/after screenshots were visually inspected. Controls fit the tested
  viewport widths; the document had no horizontal overflow. The mobile plan
  panel can collapse to expose the map and reopen normally.
- One normal initial map view fetched **35 real OSM tiles**, all loaded at
  256 × 256, with `Referer: https://trip.utilibre.org/`. Visible OpenStreetMap,
  Fix the map and operator-contact attribution were checked. The native default
  viewport uses public geography, not a person's location. No geolocation,
  provider search, route request, automated panning or external load test ran.
  All repeated views used local fictional tiles. The gray map in those later
  screenshots is a test fixture, not evidence of missing production tiles.
- App requests were confined to TRIP, Utilibre identity and the disclosed tile
  hostname. No failed stylesheet/script/font/image requests, CSP errors or page
  exceptions remained. The native absent-share lookups still correctly return
  HTTP 404 and appear as resource messages; they no longer throw an application
  exception. These expected API responses are distinguished from asset failures.

## Returning browsers

The real native Angular worker was tested with retained p1 and p2 static assets
at a disposable local origin. The p1 worker controlled the original page. After
the server switched to p2, the first reload could still show the old shell while
the native background update downloaded. Closing and reopening the tab after
that update used p2's fixed stylesheet. Native dark-mode and view preferences
were retained. There was no service-worker unregistration or storage clearing.

A returning user who still sees the old layout can reload, allow the update to
finish, then close and reopen the TRIP tab. This test proves the native update
path with exact deployed assets; it does not inspect anyone's existing browser
profile or promise that every browser has already downloaded the update.

## Deployment, recovery and cleanup

Before the scoped replacement, a consistent TRIP backup was created at
`/opt/utilibre/trip/backups/20261009T114342Z`. Only the TRIP service was restarted,
through its existing firewall-aware systemd unit. The p1 image is retained.
Configuration and the p1 public source archive/manifest are preserved under the
private report's `rollback/` directory. No database migration was added; data,
expiry, provider bounds, OIDC gates, resource ceilings and backup retention are
unchanged. Restore a selected image/config through the same unit rather than
restarting containers outside the network-boundary procedure.

Both rendering fixture accounts were deleted through the native API and their
exact owned fictional trips/places were checked absent. Their old tokens were
rejected. The two identity fixtures were then disabled and their sessions,
tokens, MFA devices and memberships revoked. Existing user data and backups
were not deleted.

Reproducible checks: `deployment/trip/check-layout.mjs`,
`check-worker-update.mjs`, `check-render-cleanup.py` and the scoped
`identity-qa.py` workflow. Private evidence is in
`/opt/utilibre/reports/trip-rendering-20261009/`: baseline, layout and real-map
JSON; native worker update JSON; before/after screenshots; build logs and
fixture-cleanup results. Credentials and browser state stay outside source.

The remaining provider-retention and off-host-backup limits in
[the installation record](trip-review-2026-10-09.md) are unchanged. This check
addresses rendering and native interaction, not concurrent-user capacity.
