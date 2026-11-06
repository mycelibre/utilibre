# Reviewed release batch, 6 November 2026

This extends the existing build/test/release helpers. It is not a new scheduler
or a general-purpose automatic updater. Read the full outcome in
`docs/records/release-refresh-2026-11-06.md` and `assessment.json`.

Inputs are the exact `commit`/`tag` pairs in assessment.json. Builds must use
clean disposable checkouts and the recorded lockfile. Apply the three new patches
with `git apply --check` followed by `git apply`; reject unsupported inputs.
Do not replay an old dependency patch merely because its app name matches.

Build environment used for JS candidates: locally pinned
`node:24.21.0-alpine3.24@sha256:ebfe2f90462722a7a4de65e91990e97fe0d401c70e0e762c5b53302f905ec1c1`.
Dependency download was separated from network-disabled build/test. Non-root
UID 1000, cap-drop ALL/no-new-privileges, 1–2 CPUs and at most 3 GiB RAM were used;
no production sockets or credentials were mounted. Calino uses pnpm 10.30.3 with
its frozen lockfile. No moving latest dependency resolution is part of replay.

## Build and behavior recipes

- Glyphr: run `deployment/creative-batch/glyphr-prepare.mjs` against the recorded
  source, npm ci with ignored lifecycle scripts, then native Vite build. Build
  Dockerfile.glyphr using that prepared `output` context. Retain fonts/notices.
  Run existing creative-batch check-tasks.mjs and check-imports.mjs on a private
  candidate; require empty external/error arrays, not only process exit zero.
- FreshRSS: Dockerfile.freshrss uses the exact repaired predecessor and copies
  the recorded native app files only. Run php-20261022/check-freshrss.mjs and
  utilibre/tests/check-freshrss-restore.py with synthetic account data.
- Radicale: stage official 3.9.0 wheel; require SHA256
  `7bf5f81e7d9e3f116be741c57448f42835eb1f5104a1620eb8489a9b962fe17e`.
  Dockerfile.radicale copies only its package/dist-info into the repaired image.
  Run calendar/check-dav.py on two isolated synthetic accounts.
- Calino: apply calino-0.42.0.patch; frozen pnpm install with ignored scripts;
  run its icsExport timezone tests then native build with the existing calendar
  Dockerfile's VITE/CALINO settings. Disable service-worker generation as before.
  Run calendar/check-browser.mjs against private Calino/Radicale fixtures.
- Mapshaper: native npm ci/build; run pack/prepare-static.mjs with
  MAPSHAPER_SOURCE_DIR pointing at the exact recorded checkout and
  UTILIBRE_STATIC_OUTPUT_DIR outside production. Run pack/check-static.mjs with
  MAPSHAPER_TEST_SOURCE and UTILIBRE_TEST_REPORT_DIR pointing at private staging.
- One File Core: one-file-core/build.py selects the exact approved revision and
  new patch, producing the standalone HTML and bilingual launcher; run check.mjs.
- Link Cleaner: apply link-cleaner-1.3.2.patch; link-cleaner/build.sh runs native
  check/test/build and restores the upstream module entry point for strict CSP.
  Run check.mjs against private HTTP staging with a private report directory.
- draw.io: official 32.6.10 WAR SHA256
  `a57b06b3b6a876a351dacfe65d027d9509319cd030e9bacf6ae04a034d66a38f`.
  Extract safely; copy toolbox/drawio-PreConfig.js to js/PreConfig.js; run
  toolbox/version-drawio-config.mjs; build Dockerfile.drawio against that folder.
  Run toolbox/check-starting-projects.mjs with APP=draw and private APP_TEST_URL.
- GitHub CLI: official 2.103.3 amd64 DEB SHA256
  `e3bafef96328d1a67de3a968bdfe1cc2ffd58cf6aba8b5e201356897ed06bb3d`.
  Check package scripts, isolated version/help/completion and Go binary rootfs
  scan before a scoped package install. Do not restart SSH or other services.

Every Dockerfile's repaired predecessor tag must resolve to its commented exact
image ID before building. Fail if unavailable or different; never pull a stock
image as a substitute. Complete source/runtime comparisons and native tests
before invoking release.mjs or release-static.mjs with an explicit key --apply.
Those adapters require this batch's exact evidence and reject changed inputs.
A future rebuild produces a candidate, not deployment approval.

`scan-candidates.py` reuses the existing pinned Trivy installation. Its default
scan runs in a network namespace, preserves failure/coverage gaps, and does not
refresh databases, send notifications or touch services. Deliberate advisory DB
refresh is a separate operation. assessment.json identifies the preserved DBs.
Raw reports are outside source trees. No byte-for-byte build reproducibility is
claimed; exact deployed artifact identity and stable decision inputs are recorded.
