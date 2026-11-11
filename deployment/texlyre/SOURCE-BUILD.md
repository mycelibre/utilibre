# Building the corresponding source archive

The published archive contains the already adapted complete TeXlyre source and
the BusyTeX wrapper source. The Utilibre repository contains the release gate
and operational test harness; these are not required to compile the editor.

From the archive's `texlyre` directory, use the Node 24 image digest recorded in
`utilibre-integration/inputs.json`. Run `npm ci --ignore-scripts --no-audit --no-fund`
in an isolated dependency-download step. Obtain local compiler/font/grammar
assets using the included `scripts/download-core-assets.cjs`, or copy the exact
previously verified asset set. Its BusyTeX download is pinned to 1.4.0, matching
the shipped compiler, rather than upstream 0.14.1's default compiler revision.
Verify `sha256sum -c utilibre-integration/assets.sha256` before building.

Then disconnect build networking and run:

```sh
npm run generate:configs
./node_modules/.bin/tsx scripts/update-sw-version.js
npm run build
```

Serve `dist` using the supplied Nginx configuration and its origin boundaries.
No document database or server compiler is needed. Run the ordinary compiler,
export/import and privacy checks before deploying. This procedure reproduces
the reviewed inputs and behavior; byte-for-byte identical Vite output is not
claimed. The prebuilt WASM components are pinned, not independently rebuilt.
Their licenses and source/build references are in the native asset manifests.
