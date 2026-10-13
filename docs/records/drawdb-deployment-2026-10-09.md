# drawDB deployment — 2026-10-09

Live: https://tools.utilibre.org/apps/drawdb/ . Original upstream v1.8.2, commit `e4e696f2d2b1a17ac99ad1d062927582ff994a3c`, Utilibre p1. The repository identifies GNU AGPLv3 but its project grant does not resolve only/or-later; preserve that uncertainty rather than guessing an SPDX suffix. Full corresponding source and build/patch files: https://tools.utilibre.org/utilibre-source/drawdb-utilibre.tar.gz .

Native browser editor imports SQL DDL, imports/exports diagram JSON, and exports SQL. It does not connect to a database or back up table rows. Native diagrams and templates persist in IndexedDB `drawDB`; settings/language/custom types/version cache use `drawdb.*` keys. This app shares the tools host origin with other browser tools. Clearing all site data on that origin affects those other tools too. Download and protect independent exports. There is no server copy to restore or delete.

The small rendering/configuration patch removes Vercel analytics, the external landing page and its GitHub/Tweet calls, disables all sharing API methods, uses the native Share extension slot to explain file export, adds native Utilibre/source links, selects hash routing, and namespaces generic browser-storage keys. Bootstrap/FontAwesome CSS/fonts and Monaco editor/workers are bundled locally. No AI import handler is installed. The optional native sharing backend and forged share URLs fail closed. Explicit bug-report links open the existing public project issue tracker; do not submit secrets there.

Dependency correction upgrades Monaco to 0.57.0 and replaces its bundled DOMPurify implementation through the build resolver with 3.4.16. Production `npm audit` reports zero known vulnerabilities as checked on this date; this is not a guarantee of absence of flaws. Dependency lock changes and full notices are supplied with the source. Built bundles were checked for the fixed purifier version. No runtime CDN fallback remains. CSP restricts connections, scripts, fonts and workers to self/blob as required and denies external calls.

## Verification

`node deployment/toolbox/check-drawdb.mjs https://tools.utilibre.org/apps/drawdb/ /opt/utilibre/reports/drawdb-20261009/public` passed with fictional authors/books tables: two tables, one foreign key, SQL export, native JSON export/import into a fresh browser context, saved reload, Spanish native labels, sharing-disabled notice, unchanged unrelated origin-storage sentinel values, and no external HTTP requests, POSTs or page errors. No user data was read or deleted. Reports remain private under `/opt/utilibre/reports/drawdb-20261009`.

Static files consume about 32 MiB on disk and use the existing Nginx service; no additional public backend or worker is needed. The isolated loopback verification container had a 64 MiB/0.25 CPU/32 PID ceiling and 2.6 MiB idle memory. Those are static serving observations, not an application concurrency benchmark. Browser memory/CPU grow with schema complexity.

## Rebuild, recovery, removal

Check out the exact upstream revision, apply `deployment/toolbox/drawdb-local-source.patch`, then run `deployment/toolbox/build-drawdb.sh`. This build uses Node24, `npm ci --ignore-scripts`, a locked dependency graph, and a 3 GiB heap ceiling. Preserve `LICENSE` and bundled dependency notices. Stage `dist` outside the public directory, run the native check using the optional loopback compose, then atomically promote it to `/opt/utilibre/toolbox-public/apps/drawdb`; publish the matching source before promotion. The existing tools `/apps/` alias serves it.

`compose.drawdb.yaml` is a restricted optional verification server on `127.0.0.1:3192`; it contains no persistent state. Production uses the shared static host. Roll back by restoring the preceding versioned static directory and source offer; no data migration occurs. Remove the source patch when native upstream configuration supports local-only assets, no analytics/sharing, native branding and namespaced storage, then rerun these checks. Do not delete users' browser state to change documentation. Preserve old source offers while their builds remain deployed.
