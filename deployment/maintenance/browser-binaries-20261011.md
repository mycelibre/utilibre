# Browser-tool executable cleanup — 11 October 2026

This is a narrowly tested candidate release, not a claim that the whole service
pack is vulnerability-free. Production activation is recorded separately in the
maintenance release receipt. No application documents, registration settings,
privacy policy, retention, or production databases were changed by these tests.

Production follow-through: both final candidates were deployed at 20:44 UTC.
Public Jupyter Python/pandas/plot passed again with no external requests or
content uploads. Removed CLI URLs return 404 via a tool-specific rule, not the
shared successful app-shell fallback. Wishlist's public login returned 200;
its native saved-work backup at `/opt/utilibre/wishlist/backups/2026-10-11T20-43-18Z`
passed SQLite integrity/foreign-key restore and archive extraction. Production
OIDC account creation was not re-tested. Exact deployed identities are in
`runtime-release-20261011.json`.

## JupyterLite

- Previous image: `utilibre-jupyterlite:0.8.5-p5-nginx1305`,
  `sha256:364f80084669153b72fd1aacefe1de189a5eaa8f1d00f295d74aa090adc99877`.
- Candidate: `utilibre-jupyterlite:0.8.5-browser-security-20261011-p2`,
  `sha256:e255a33dd3ae47833eada017dad2adb9dfa8fd6761962aacf31a59cda5202ed4`.
- Preserves JupyterLite 0.8.5, Pyodide kernel 0.8.6 and Pyodide 314.0.6,
  including its local wheels, WASM, Spanish interface, CSP and no-PyPI-fallback
  setting. Upgrades Alpine's `tiff` to `4.7.2-r0` (and its vendor dependency
  `zlib` to `1.3.2-r1`).
- Removes only `/usr/share/nginx/html/pyodide/`'s `python.exe`, `python.bat`,
  `python`, and `python_cli_entry.mjs`: native/Node command-line launchers, not
  the browser Python runtime. The Windows executable had Go 1.21.13 and SHA-256
  `ff250e09d613d6718b5fb5775ce78608ccf44cd45461d4116bbb5bd4e0e13e24`.
  Both the maintenance layer and original build now omit those unused launchers.
- Evidence: the pinned upstream [deployment file inventory](https://github.com/pyodide/pyodide/blob/314.0.6/docs/usage/downloading-and-deploying.md)
  distinguishes browser WASM/stdlib/package assets from CLI entry points.
  The deployed `.bat` identifies its `.exe` companion; browser loaders and
  package lock do not reference `python.exe`. Removal was tested, not inferred
  solely from the extension.
- Chromium against the isolated candidate passed the shipped Spanish notebook:
  Python mean `7.25`, pandas CSV parsing and a rendered matplotlib plot. No
  outside-origin requests or content uploads occurred. The test keeps native
  production-origin paths/CSP and routes all requests to a loopback candidate.
  Service workers are disabled in this focused test; this is not an offline
  cache or real-phone test. An initial direct-loopback attempt could not use the
  intentionally absolute production kernel URL; the isolated origin-preserving
  harness resolves that test-environment issue without changing application CSP.
- Trivy 0.75.0, current local database: previous raw **1 critical / 26 high**;
  final candidate **0 critical / 0 high**. This scan does not establish safety
  of every browser Python package or test malicious notebooks.

## Wishlist

- Previous image: `utilibre-wishlist:0.67.1-security-20261011`,
  `sha256:32bb005aab9fd1dd0da71fa1a27141742c5474a52ed0d624b7a57eb03d96c67f`.
- Candidate: `utilibre-wishlist:0.67.1-esbuild-security-20261011`,
  `sha256:ef6dd27db307610f6031bf1b582f906096f77161d6f1fdc363b3e6903dbee867`.
- Retains Wishlist 0.67.1, its existing privacy patches, schemas and JavaScript.
  Recompiles **the same esbuild 0.19.12 source** with Go 1.26.9 instead of deleting
  packages or changing their API version. Its pinned upstream source archive
  SHA-256 is `dc90cb6f3b77bace240f293765cd625332eae63886b67d80b9fd806ef1f9d1af`;
  source: [esbuild v0.19.12](https://github.com/evanw/esbuild/tree/v0.19.12).
  Upstream's [Go-version rationale](https://esbuild.github.io/faq/#old-go-version)
  explains the compatibility-oriented old baseline; this does not waive scans.
- Replaces Linux x64/arm64 and Darwin x64/arm64 package binaries, plus the
  separate `esbuild/bin/esbuild` copy that originally shared a hardlink. The
  installed `svelte-i18n` dependency resolves this 0.19.12 package; startup
  migrations/seed/patch commands also rely on other packages. Nothing was
  blindly pruned. Existing newer esbuild 0.28.2 is unchanged.
- Native upstream Go tests passed for `pkg/api`, `internal/js_parser`, and
  `internal/css_parser`. Linux x64 version/TypeScript transform passed. Other
  platform binaries were cross-compiled, not executed on those operating systems.
- An isolated, blank tmpfs SQLite installation passed real native startup
  migrations, role/group seed and database patches; browser first-admin form;
  creation of a fictional list/item; reload persistence; and anonymous denial.
  Browser requests remained local and no JavaScript errors occurred. Production
  OIDC, mail, real-account recovery and backup restoration were not re-tested by
  this scoped check. All temporary test data are removed with the test container.
- Trivy: previous raw **9 critical / 172 high**; candidate **1 critical / 68 high**.
  All five rebuilt esbuild binaries identify Go 1.26.9 and have no high/critical
  findings. The remaining critical is Debian's source-package zlib/minizip
  advisory `CVE-2023-45853`; any exception must be validated against this exact
  image by the existing review helper. Remaining Caddy and JS findings are not
  waived. This is a toolchain repair, not an esbuild-version upgrade.

## Reproduce and roll back

Build using the checked-in Dockerfiles, with at most two compiler workers and a
4 GiB build limit; the checks do not mount production data:

```sh
docker build --memory 4g --cpu-period 100000 --cpu-quota 200000 -f deployment/maintenance/Dockerfile.jupyter-browser-only -t utilibre-jupyterlite:0.8.5-browser-security-20261011-p2 .
docker build --memory 4g --cpu-period 100000 --cpu-quota 200000 -f deployment/maintenance/Dockerfile.wishlist-esbuild -t utilibre-wishlist:0.67.1-esbuild-security-20261011 .
node deployment/maintenance/check-wishlist-esbuild.mjs
```

For a candidate Jupyter HTTP backend bound only to loopback, run
`UTILIBRE_JUPYTER_TEST_ORIGIN=http://127.0.0.1:32794 node deployment/expanded/check-jupyter.mjs`.
Without that variable the existing check uses public HTTPS. Keep the candidate's
normal nginx/security mounts and run read-only, non-root, capability-dropped.

Private stage/scan evidence is under
`/var/lib/utilibre-maintenance/browser-binaries-20261011/`; do not publish raw
container or credential dumps. Roll back only the affected compose image pin
to its previous image above and recreate that service with the normal compose
environment. No schema migration or data rollback is part of this patch.
