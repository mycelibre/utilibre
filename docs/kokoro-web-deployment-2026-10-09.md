# Kokoro Web deployment, 9 October 2026

Static browser application at `https://tools.utilibre.org/apps/kokoro-web/`.
No inference service, microphone recording, Whisper service, API account or
text/audio database was installed. Shared portal registration is owned by the
parent integration task; catalog and guide modules are ready.

## Versions and source

| Component | Exact version and grant |
| --- | --- |
| Kokoro Web | v0.1.3, `2cb9d771a549870e7220783a53bdb2e99ed2f421`, local `0.1.3-p1`; MIT |
| eSpeak NG | 1.52.0, `4870adfa25b1a32b4361592f1be8a40337c58d6c`; GPL-3.0-or-later, locally compiled |
| Compiler | Emscripten 3.1.64, release build `fd61bacaf40131f74987e649a135f1dd559aff60`; archive hash in recipe |
| ONNX Runtime Web | `1.21.0-dev.20250206-d981b153d3`; MIT and separately supplied upstream dependency notices |
| Kokoro model/voices | `onnx-community/Kokoro-82M-v1.0-ONNX`, revision `1939ad2a8e416c0acfeecc08a694d14ef25f2231`; Apache-2.0 model-card grant |

The original npm eSpeak binary reported only `1.52-dev`; its wrapper source
linked to a floating native build. It was replaced with a build from the exact
official eSpeak release. Full eSpeak source and its dictionary sources accompany
the served binary. A small CMake fix avoids fetching disabled Sonic, and a header
ordering fix preserves native Unicode aliases with the pinned Emscripten musl.
No speech algorithm was rewritten. Native English/Spanish phonemization passed.

The MIT application grant does not relicense the engine or model. Optional
FFmpeg conversion files are omitted, so that binary's separate codec/source
chain is not redistributed as though it were MIT. Native WAV at normal speed
works without FFmpeg. Local notices include the app, model, eSpeak, Emscripten
runtime, ONNX Runtime and applicable UI/audio libraries. The upstream ONNX
notice file covers a wider project than this browser build; it is not evidence
that every listed optional native accelerator is linked into the WASM runtime.

Corresponding source:
`https://tools.utilibre.org/utilibre-source/kokoro-web-utilibre.tar.gz`

- Archive SHA256: `e970f455173adb698d3ca8826f6f588495a759730be3ab2d9d6b6d3105d59186`.
- App patch SHA256: `90640d5b936c1759314979193d0bf381eab6e1b516523c62eca0ea5c718d4559`.
- eSpeak patch SHA256: `a0a806d1dccd9645cc95bf345b9e930bd780e83b13d790d6d018461b6c5c5828`.
- Recipe: `deployment/kokoro-web/`; app source: `/opt/utilibre/src/kokoro-web`;
  engine source: `/opt/utilibre/src/kokoro-espeak-source`.

Archive extraction with safe link handling and applying both patches to the
included originals passed. A frozen-lock app rebuild and a separate offline
native/WASM engine build passed. Source tar is about 21 MB; published app files
about 168 MiB. Model/runtime assets total 147,544,307 bytes, including an unused
alternative native ONNX runtime variant, so first use does not necessarily
download every asset. The q8 model alone is 92,361,116 bytes. Model and voice bytes
are verified against the immutable hash ledger before packaging.

## Actual workflow and privacy

The English interface offers English (US) with `af_alloy` and Spanish (`es-419`)
with `ef_dora`. Output is WAV at 24 kHz at normal speed. MP3 and speed controls are
omitted. Native WebGPU remains optional; the default and verified path is CPU
through ONNX Web's `wasm` provider. The source correction fixes the upstream
browser CPU provider selection, releases inference sessions after generation,
and releases superseded output Blob URLs. It removes content console logging,
API inference, analytics, version polling, external badges and runtime CDNs.

Text/audio processing stays in the browser in the exercised native workflow.
Static app/model downloads use the existing Cloudflare HTTPS proxy, Caddy edge
and Hetzner hosting path. This does not eliminate connection records from those
layers or set their retention. Author/source/model links are deliberate external
navigation; no new visitor analytics or fingerprinting is added.

| Data | Storage and deletion |
| --- | --- |
| Unsaved text/current output | Page memory and audio Blob; no server copy to retrieve |
| Saved native profiles | Text and settings in localStorage `kokoro-web-profiles`; native Delete profile removes the selected entry |
| Model/voice files | Persistent browser Cache API `kokoro-web-resources`; remove through browser site-data controls |
| Theme | Namespaced localStorage `utilibre-kokoro-theme` |
| WAV download | User device until the user deletes it; independent of profile deletion |

Closing the tab does not erase saved profiles or model cache. The tools origin
is shared; clearing all its site data affects other apps. No account, server
backup/deletion or native profile export/import is promised. Profile save/load
is browser storage, not a backup of the downloaded audio. Keep original text and
the WAV independently. Model accuracy, pronunciation and long-text quality need
human review. This is not voice cloning.

## Verification and integration

`deployment/kokoro-web/check.mjs` uses fictional text, a fresh browser context,
the exact scoped CSP and an audit that rejects outside HTTP requests or uploads.
Private results are under `/opt/utilibre/reports/kokoro-web-20261009/`.

- Svelte: zero errors/warnings. Frozen-lock build passed. Production dependency
  audit: zero vulnerabilities; this result does not audit model quality.
- Desktop English: 2.69 seconds of non-silent audio in 12.16 seconds; desktop Spanish:
  2.41 seconds in 8.44 seconds; emulated 375px Spanish: 2.41 seconds in 10.07 seconds.
  These are single short CPU samples on this VM, not phone benchmarks or a
  server concurrency claim. WAV headers are 24 kHz; Web Audio test decoding
  resampled playback to the browser's 44.1 kHz AudioContext.
- Native Play/Pause, download/reopen decoding, profile save/reload/delete/reload,
  and 375px layout passed. No external requests, uploads or browser errors.
- New controls have accessible names; native More tools links lead to EN/ES
  portal pages. Spanish portal catalog/guide copy uses voseo. No broad upstream
  UI translation fork was made.
- Public source archive returns 200 and its downloaded SHA256 matches. The
  final public-URL native test also passed English/Spanish and emulated mobile
  WAV generation, playback/download and profile deletion with no external
  requests, uploads or browser errors. The scoped gateway CSP is active.
- Own compiler image/toolchain, native/WASM intermediates, package download
  cache and regenerated app dependencies were removed after verification.
  Exact sources, engine outputs, public files and reports remain. Disk free
  space recovered to about 7.5 GiB at the cleanup check, not a fixed reserve.

Portal modules: `portal/src/catalog/kokoro-web-addition.ts` (`kokoroWebAdditions`)
and `portal/src/pages/kokoro-web-guide.ts` (`kokoroWebGuides`). Provider/catalog ID
`kokoro-web`, config key `publicToolsUrl`, launch path `/apps/kokoro-web/`.
Guide routes are `/en/guides/generate-local-speech` and
`/es/guias/generar-voz-local`. Parent owns shared registry and source-index edits.

Only the app's scoped gateway include changes: `security.conf` permits local
WASM/workers/Blob playback, blocks external connections/frames and disables
microphone/camera/geolocation. No other tool headers or containers are changed.
Rollback restores/removes only this static app directory and its portal entry;
browser-retained data is not cleared by deployment. Remove the patch when
equivalent supported upstream configuration is available.

Primary evidence: [Kokoro source](https://github.com/eduardolat/kokoro-web/tree/2cb9d771a549870e7220783a53bdb2e99ed2f421),
[eSpeak1.52 release](https://github.com/espeak-ng/espeak-ng/releases/tag/1.52.0),
[pinned model card](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/blob/1939ad2a8e416c0acfeecc08a694d14ef25f2231/README.md),
[ONNX licence](https://github.com/microsoft/onnxruntime/blob/d981b153d3/LICENSE),
[FFmpeg wrapper/core distinction](https://ffmpegwasm.netlify.app/docs/faq/).
