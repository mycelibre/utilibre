# Kokoro Web browser deployment

Upstream: `eduardolat/kokoro-web`, v0.1.3, revision
`2cb9d771a549870e7220783a53bdb2e99ed2f421`; Utilibre `0.1.3-p1`.
The app is MIT. This does **not** cover its model or speech engine. Model and
stock voices are Apache-2.0 at the exact revision/hashes in `model-manifest.json`.
ONNX Runtime Web is MIT with its separate bundled notices. Our eSpeak NG1.52.0
build is GPL-3.0-or-later; full corresponding source, notices, two small build
fixes and the build recipe accompany the source offer.

## Reproduce

1. Check out the app revision above and eSpeak NG
   `4870adfa25b1a32b4361592f1be8a40337c58d6c` (release1.52.0).
2. Run `prepare-phonemizer.sh /path/to/espeak-source /path/to/build-work`.
   It checks the source pin, applies `phonemizer-source.patch`, verifies the
   Emscripten3.1.64 archive hash, builds the pinned-base compiler image and then
   compiles offline with 2CPUs/1GiB. Native data compilation precedes WASM.
   Node24 and Docker are required. Budget about2GiB temporary compiler disk.
   The CMake fix avoids fetching disabled Sonic; the header fix loads musl wide
   character declarations before eSpeak's existing Unicode aliases.
3. Run `build.sh /path/to/kokoro-source /path/to/build-work/output` with Node24.
   It applies the frozen app patch, installs the exact lock with a task-owned npm
   cache, verifies all model/runtime hashes, copies notices and checks/builds.
   Do not substitute the original npm eSpeak binary: its exact native C revision
   was not established. No API or Node server is deployed; generated API docs
   are removed from the static output.
4. Run `node deployment/kokoro-web/check.mjs` from this repository.
   The default loopback4198 fixture serves the exact build with `security.conf`.
   Fictional EN/ES text is synthesized, WAV24kHz and native playback checked,
   and profiles saved/reloaded/deleted. External requests/uploads and375px
   layout are checked. Paths to the tested build and private results are explicit.
5. Stage `build/` outside the public tree, then atomically rename to
   `/opt/utilibre/toolbox-public/apps/kokoro-web`. Apply `security.conf` only to
   `/apps/kokoro-web/` in the OmniTools gateway. Run the same browser test with
   `https://tools.utilibre.org/apps/kokoro-web/` as its argument.

## Deliberate limits and storage

Only quantized8-bit Kokoro, English US `af_alloy` and Latin American Spanish
`ef_dora` are offered. Controls are English. Native WAV24kHz at normal speed is
retained; MP3 conversion, speed controls and FFmpeg runtime files are omitted.
API, analytics, remote version checks and badge/CDN requests are removed.
CPU uses ONNX Web's `wasm` provider. WebGPU remains native and requires browser
support; CPU is the tested path. Model sessions and superseded output Blobs are
released. Loaded profiles are forced to the supported local model/WAV mode.

No recording, microphone, voice cloning or inference server is used. Model and
runtime downloads come from Utilibre. Model/voice responses persist in native
`kokoro-web-resources` Cache API storage. Saved profiles include text/settings in
`kokoro-web-profiles` localStorage; theme uses `utilibre-kokoro-theme`. Closing a
tab does not delete those records. Use native Delete profile or browser site-data
controls; the `tools` origin is shared, so clearing all of it affects other tools.
Downloaded files remain on the device. No app account, server text/audio store or
server export exists. Delivery/provider logs have their separately documented
retention.

## Source and removal

`publish-source.mjs` includes original app and exact eSpeak source, patches,
locks, build scripts and dependency notices. The unmodified general-purpose
compiler is identified by immutable source/build identifiers and archive hash;
its runtime licence texts are included. Model bytes are served locally with
their immutable hash ledger and Apache-2.0 model card.

The patch is removable when upstream supports this local-assets/browser-only
mode, correct WASM CPU execution, traceable speech binaries and equivalent
privacy controls. Restore the previous static directory to roll back. There is
no server user state/database; removing app files does not erase browser data.
