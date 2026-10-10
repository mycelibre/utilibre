# SketchForge 3D deployment — 2026-10-09

Live: https://tools.utilibre.org/apps/sketchforge/ . Upstream 1.0.9, commit `e9cb8e8681f92e12f6044e046046cf1d363f6811`, Utilibre p1; AGPL-3.0-only expressly stated by package/README. Source: https://tools.utilibre.org/utilibre-source/sketchforge-utilibre.tar.gz . The installed mode is the upstream static browser editor, without the Node API server, shared server library, update service or MCP bridge.

Private-by-device projects use IndexedDB `sketchForge.projectShapes` plus `sketchForge.*` settings/project metadata in browser storage, not a Utilibre account or encrypted server vault. Data survives tab closure. Export a native SKF project to retain editable geometry and its chosen saved-action history; mesh STL/OBJ exports are not full editable-project backups. Protect downloaded copies. Tools share the tools host origin, so clearing all site data also affects other applications. No server-held project restore exists. Native app controls are English; portal data notes are bilingual.

## Narrow build integration

Next basePath `/apps/sketchforge` plus matching native asset/OCCT/history URLs; native STATIC_EXPORT flag; build-only exclusion of server route modules that otherwise make upstream static export fail. The build restores all excluded source modules even on failure. Source and project links use the existing dashboard/settings UI. Static metadata denies indexing. CSP limits network to self/blob and preserves the WASM/worker/evaluation features used by the geometry kernels. No trackers, AI integration, external runtime font or new public backend.

Compatible dependency/lock fixes include fflate malformed-ZIP repair, Next security updates and the patched PostCSS override. Production audit zero known advisories on this date. Builds are bounded to a 3 GiB Node heap/two Next workers. Final static output approximately 56 MiB, served by the existing tools Nginx. Browser memory/CPU depend on model size; no claim that very large models run on every device.

## Verification

282 native tests pass; the runtime-path test was updated for the actual base path. Fictional native UI verification creates a box, exports binary STL (12 or more triangles with consistent file length), exports SKF, returns to dashboard/reloads, imports SKF through the native file chooser and re-exports matching triangle count. Local and public `check-sketchforge.mjs` pass, with no outside HTTP origins, POSTs or page errors and an unrelated localStorage sentinel unchanged. The public test found/fixed upstream absolute history URLs that escaped the subpath. Reports `/opt/utilibre/reports/sketchforge-20261009`. This verifies digital geometry/export, not physical 3D printing or every CAD format. No existing user project was accessed or removed.

The OCCT kernel is a separately loaded LGPL-2.1-only WASM component; its TypeScript tooling is MIT OR Apache-2.0, and Manifold is Apache-2.0. The build keeps native runtime files separate. Matching occt-wasm 3.6.1 source pin `c4a96db7bb6ec7eed294dec42ba92fe4b6e0f580` and its OCCT submodule pin `6e1fe656bf028bf0004482c389661587b269fc65` are provided as `occt-wasm-3.6.1-source.tar.gz` and `occt-6e1fe656-source.tar.gz` beside Utilibre's source offer; preserve these and their licences. Rebuilding/replacing the component uses the upstream wrapper recipe and existing static asset URLs; no promise of legal certification is made.

## Rebuild and rollback

Check out pin, apply `deployment/toolbox/sketchforge-local-source.patch`, run `build-sketchforge.sh`, then native browser check. Preserve source and dependency notices. Publish matching source before atomically promoting `.next-export` into `/opt/utilibre/toolbox-public/apps/sketchforge`. Caddy and service worker settings are unchanged. Rollback swaps the preceding static artifact; it does not clear browser projects. Remove patch pieces when upstream supports matching deployment base/static build/branding/privacy controls and the same tests pass. Preserve corresponding source for older deployed versions.
