# FMD native browser export, 9 October 2026

The native public browser export and deletion controls passed on
`https://fmd.utilibre.org` at 13:49:12 UTC on the final p2 web build. This closes the previously unperformed
browser decryption/download check. It does not establish Android recovery, push
delivery or an account migration/import workflow.

Installed FMD Server: 0.17.0, native web override **0.17.0-p2**; source
commit `224b60c0756ff363bc19063082a8a1543559cf96`. The narrow update fixes four
optional CSV values and refreshes the existing native EN/ES export-verification
notes. The pinned Go image, API, schema, data mounts, limits, gateway, retention
and backup policy are unchanged.

## Reproducible native fixture

`deployment/community/check-fmd-export.mjs` compares the installed `crypto.ts`
and `cryptov2.ts` byte-for-byte with that pinned revision before using their
native password hashing, key derivation and record encryption helpers. Temporary
copies change import resolution only, so Node can execute the TypeScript. Node
24 needs its `--js-base-64` flag for the native Uint8Array hex methods; an initial
harness attempt without this flag stopped before creating an account.

```sh
ulimit -c 0
/root/.nvm/versions/node/v24.14.0/bin/node --js-base-64 deployment/community/check-fmd-export.mjs
```

The checker reads the existing invitation privately, creates one random
disposable account through the native registration API and encrypts three
fictional positions at coordinates 0,0 plus a one-pixel PNG. A small standard
WebCrypto wrapper creates the v2 encrypted master-key blob normally supplied by
the Android client; the pinned native helper decrypts it before registration.
No phone was enrolled and no command or push endpoint was configured.

Chromium then signs in through the real public password form. It does not inject
authentication state or replace the application/API responses. Only OpenStreetMap
tile requests (20 in the final pass) are fulfilled with the local fictional PNG. This
avoids sending fixture map requests to that provider, so this is not a test of
real map tile delivery or provider availability. No other external host request,
browser page error or failing public-origin response was observed.

## Result and scope

The native **Settings → Export data** action downloaded a 799-byte ZIP. Independent
JSZip reopening with CRC validation confirmed exactly:

- `locations.csv`: header plus the three expected rows, with exact time, provider,
  battery and coordinate values. Nonzero optional precision/altitude/speed/bearing
  values matched.
- `pictures/0.png`: byte-for-byte equality with the fictional PNG.
- `info.json`: the fixture's own FMD ID and an empty push URL.
- The native `pictures/` directory entry, with no other files.

**Native CSV defect fixed:** the initial p1 check at 13:43:19 reproduced loss of
numeric zero in optional accuracy, altitude, speed and bearing fields because
the exporter used `value || ''`. `fmd-export-zero-source.patch` changes only
those four expressions to `value ?? ''`. The final public regression verifies
nonzero values and zero values survive, while absent optional values stay blank.
Zero battery/latitude/longitude values still remain zero. No CSV column, format,
import mechanism or other export behavior was changed.

The ZIP is decrypted. It is not a complete account backup: it does not include
all settings, credentials, key recovery material or full command history. No
native ZIP account import is present in the inspected client. Local reopening
of the downloaded ZIP must not be described as Android re-enrolment or a native
export/import round trip.

The checker opened settings at desktop and 390-pixel widths and completed the
native mobile **Delete locations**, **Delete photos** and **Delete account**
confirmations. API reads for that exact account confirmed zero location/photo
records before account deletion, then its own salt endpoint returned 404 and
the former token was denied. Only this fixture's data was removed. Its temporary
private cleanup credential file was removed after verification; no credentials
or signed links are included in this record. Existing backups were untouched.

Private evidence:
`/opt/utilibre/reports/fmd-native-export-20261009-srW9C7/result.json`, the fictional
ZIP and settings screenshots in the same restricted directory. Initial p1
reproduction: `/opt/utilibre/reports/fmd-native-export-20261009-7K7X49/result.json`.
All disposable accounts from successful registration were natively deleted;
their temporary cleanup credential files were removed.

ZIP SHA-256:
`9d72f4a67ab376d98259e708aefd774d8acf0d97388f08934fdaf155b40cb70f`.

## Build, deployment and recovery

The existing `prepare-fmd-web.mjs` pins the source revision and frozen upstream
lockfile, applies the existing four-file privacy patch plus the separate
four-expression CSV fix, and runs the native TypeScript/Vite build. Both patches
apply and reverse exactly against the pinned source. Builds were limited to two
CPUs; existing dependencies were reused. The public output is made readable by
the native nonroot server, independent of the build process umask.

The final read-only web mount is
`/opt/utilibre/community-data/fmd-web-v0.17.0-p2-final`. Only
`utilibre-additions-fmd-1` was recreated, through its existing compose service.
Runtime comparison confirmed the sole expected mount-path change after sorting
Docker's unordered mount list. The pinned Go image, command, 256 MiB/1 CPU
limits, read-only root, dropped capabilities, no-new-privileges, PIDs, network
address and data/config mounts stayed identical. SQLite integrity passed before
and after deployment.

The prior p1 directory is retained. A native online SQLite backup, private
configuration copy and prior deployment recipes are retained under
`/opt/utilibre/reports/fmd-web-p2-20261009/`; no backup generation was removed.
Rollback uses the prior p1 web mount and a scoped FMD recreation. This frontend
change needs no database restore, and restoring an old database would discard
newer legitimate records. The gateway is unchanged.

The native EN/ES privacy page and embedded registration variant retain the
Android, push and missing-native-ZIP-import limits while stating the now-tested
browser export scope. All four public EN/ES normal/embedded cases passed native
language switching, keyboard links, 390-pixel layout and no external page
requests. Evidence: `fmd-web-p2-20261009/privacy.json` in the private reports
directory. Its source link uses
`?revision=0.17.0-p2-20261009` to avoid serving a previous cached source archive.
The publisher includes the pinned source, both patches, native build recipe,
checkers and this record; private configuration, dependencies and QA records are
excluded. Remove the CSV patch when an upstream exporter preserves both zero
and absent values, then rerun the same fictional browser check.

Remaining limits are physical Android workflows, push delivery and unavailable
native ZIP account import. Existing community backup retention remains without
automatic expiry; deleting active records does not remove prior backup copies.

## Map-policy correction — 10 October 2026

Current web override: **0.17.0-p3**, same pinned server and source revision above.
The operator reported a successful ring on their own Android device, followed
by OpenStreetMap's blocked-tile images in the map. The ring is user-reported
evidence for that device, not an independent push, background-delivery or GPS
test. No commands were sent to the real device during this repair.

The public response contained the gateway's effective `Referrer-Policy:
no-referrer`. This conflicts with the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/)
(checked 10 October 2026), which requires a browser Referer and the canonical
unsharded tile endpoint. It explains a policy violation; it does not establish
that every browser, VPN or provider-level block has been removed.

The narrow `fmd-map-policy-source.patch` uses Leaflet 1.9.4's native per-image
`referrerPolicy: 'strict-origin'`, corrects the fallback tile endpoint, and
retains visible OpenStreetMap contributor attribution. The native private
`TileServerUrl` setting now points to
`https://tile.openstreetmap.org/{z}/{x}/{y}.png`; FMD derives the exact permitted
image origin in its CSP automatically. No Caddy or gateway change was needed.
Page-wide `no-referrer` remains. Normal browser tile caching is untouched; no
proxy, forced revalidation, offline prefetch, identity spoofing or IP rotation
was added. EN/ES native privacy notes disclose the origin-only Referer alongside
the pre-existing browser-IP and viewed-region disclosure. This hardening keeps
the correction within the native map integration, without a UI redesign.

Verification at 05:28 UTC against public HTTPS:

- Native TypeScript/Vite production build passed, with existing chunk-size and
  Leaflet dynamic-import warnings. Targeted ESLint could not start because the
  pinned upstream TypeScript 7.0.2 is unsupported by typescript-eslint 8.65.0;
  no dependency changes were made to disguise that limitation.
- Public tile configuration and exact-host CSP passed. Actual Chromium image
  requests carried precisely `https://fmd.utilibre.org/` as Referer, with the
  per-image policy present and the page-wide no-referrer header preserved.
- All 36 tile requests were intercepted and fulfilled with the fictional local
  PNG, so **real OSM delivery remains for the operator's normal browser check**.
  No real location records or other users' accounts were accessed. No
  headless map traversal was sent to OSM.
- Normal login, native decryption/ZIP download, CRC/content checks and deletion
  passed again using only a disposable account with the existing fictional
  fixtures. Its account and test records were deleted; prior user data and
  backups were preserved. No unexpected external hosts, page errors or failing
  public-origin responses were observed.
- All four EN/ES privacy-page variants (normal/embedded) passed at 390 px,
  including the updated provider disclosure, language switch and source link.

Evidence: `/opt/utilibre/reports/fmd-native-export-20261010-P73KdE/result.json`
and `/opt/utilibre/reports/fmd-map-p3-20261010-Bj2YG1/privacy.json`.
Only `utilibre-additions-fmd-1` was recreated and is healthy; the same 256 MiB,
one-CPU limits, native API, database, invitation and push configuration remain.
Read-only web assets are at `/opt/utilibre/community-data/fmd-web-v0.17.0-p3`.
The source publisher includes all three reproducible patches and this record;
the native source link is revisioned `0.17.0-p3-20261010`.

Rollback materials are restricted to
`/opt/utilibre/reports/fmd-map-p3-20261010-Bj2YG1/`: prior recipes, private
configuration and an online SQLite backup whose integrity check passed.
To roll back, change only the web mount to the retained
`/opt/utilibre/community-data/fmd-web-v0.17.0-p2-final`, remove this added
`TileServerUrl` setting (previously unset), validate the existing compose file,
and run `docker compose -f deployment/community/compose.additions.yaml up -d
--no-deps fmd`. Preserve unrelated configuration changes and do not restore the
database for a frontend rollback. Rolling back also restores the map-policy
defect. ntfy was not changed or restarted.

### Grey-map follow-up, 05:47–05:49 UTC

The operator subsequently reported that the warning had disappeared but the
map was grey. That report remains unresolved; passing the request-policy check
is not proof of real tiles reaching their browser.

A separate bounded Chromium check loaded exactly one public world overview
tile (`https://tile.openstreetmap.org/0/0/0.png`) as an image from the real FMD
origin using the deployed per-image referrer policy. The response was HTTP 200,
`image/png`, and the browser decoded 256 × 256 pixels. Visual inspection showed
the world map rather than an error image. No actual device coordinates,
automated traversal, repeated tile fetches, cache-bypass headers or referrer/UA
spoofing were used. This establishes that that provider endpoint loads from the
test environment, not from every client/network. Private evidence image:
`/opt/utilibre/reports/fmd-map-grey-20261010-zx5pdb/world-tile.png`.

The reusable native checker now uses a visibly labelled fictional SVG tile
instead of the transparent one-pixel image, checks restored login after a full
reload, and captures the 390 × 844 map as well as desktop. Both map views visibly
rendered tiles and a marker. Native ZIP export and disposable-account cleanup
passed again, with no unexpected external requests or page errors. All 56 map
requests in this second check were locally fulfilled; only the separate
single-world-tile check above contacted OSM. Result and captures:
`/opt/utilibre/reports/fmd-native-export-20261010-fbV65t/`. The initial result file
still says PNG in its boundary description; this run used the labelled SVG,
and the checker description has been corrected for future runs.

No application, Caddy, gateway, provider, or phone configuration was changed
during this follow-up. The next client-side distinction is whether a fully
reopened FMD tab works, whether map controls remain visible, and which browser
is affected. Do not weaken browser protections or clear account keys/site data
merely to test this hypothesis.
