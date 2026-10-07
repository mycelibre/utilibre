# Browser toolbox review — 2026-10-06

## Markmap implemented — 7 October 2026

Only **Markmap** was installed from the five candidates below. The restricted
editor is live at [mindmap.utilibre.org](https://mindmap.utilibre.org), backed by
the static `markmap` service at `10.10.1.43:3168`. Super Productivity, BeepBox,
Teleprompter and Typings remain uninstalled and uncleared for public launch.
The earlier source-only assessment is retained below as historical evidence.

The integration pins `markmap-lib` and `markmap-view` 0.18.12. The npm release
source is [revision 205367a](https://github.com/markmap/markmap/tree/205367a24603dc187f67da1658940c6cade20dce),
rather than the newer source snapshot in the historical review. Upstream
Markmap is MIT; the thin Utilibre editor is AGPL-3.0-or-later, matching this
repository. The [public source archive](https://mindmap.utilibre.org/utilibre-source/markmap-utilibre.tar.gz)
returned HTTP 200 and includes upstream source, integration, build recipe,
lockfile and license notices. The publisher retains the previous archive.

The editor supports English and Spanish, Markdown import/download, SVG
download, and optional browser draft storage that is off by default. Markdown
is the editable backup; SVG uses embedded text that some image editors cannot
display. Draft removal runs independently of rendering, failed storage writes
retain departure protection, and failed deletion never reports success.
Imports are limited to UTF-8 text up to 400,000 bytes, 100,000 characters,
128 nesting levels and 2,000 map nodes. These are safeguards, not a guarantee
against every resource-exhaustion input.

Hardening disables raw HTML, clickable links, image loading, frontmatter,
math/highlighting plugins and dynamic asset loaders; DOMPurify 3.4.16 permits
only inert inline formatting without attributes. All application assets and
fonts are local. CSP restricts scripts to self without inline scripts or eval,
blocks connections, frames, objects and workers, and permits inline styles
needed by the renderer. No application upload endpoint or account store ships.
Delivery providers still receive connection metadata. The unused indirect
KaTeX dependency is pinned to 0.18.2 for
[GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7).
The lockfile audit had zero findings on 7 October; that is not a security
guarantee. [Markmap JSON options](https://markmap.js.org/docs/json-options) and
the advisory were checked on that date.

The final public Chromium/Linux run passed at **2026-10-07T20:23:27.504Z**
after an initial HTTPS 525 failure was resolved. Its 13 groups cover EN/ES,
exact Markdown roundtrip, opt-in draft/reload/removal, removal after rendering
failure, quota-failure departure protection, denied-deletion messaging, SVG
reopening, hostile Markdown/frontmatter, oversized/invalid UTF-8 imports,
390px layout, already-loaded offline editing, CSP and 404/405 responses.
No external application requests or page errors were observed in that flow.
There is no physical-phone, Firefox/Safari/Opera, fresh-load offline or PWA
validation. Captures are in `.impeccable/captures/markmap/`. Independent finish
review requested draft-state and official-logo fixes; those scoped fixes ship.

The serving container runs read-only as UID 101, drops all capabilities, denies
new privileges, and is limited to 128 MiB / 0.5 CPU. Its observed idle memory
was 2.27 MiB at 20:22 UTC; this is not a capacity or client-memory measurement.
Portal checks passed 78 unit and 64 browser tests. English and Spanish starter
guides and downloadable sample outlines are implemented; portal deployment
is pending at this checkpoint. The resulting 58 catalogue records and 36
canonical portal pages are not counts of independently deployed applications.

The final JavaScript asset is 335,165 bytes (133,726 bytes with local gzip),
and CSS is 5,368 bytes (1,817 bytes with local gzip). The tested Latin font
files total 92,080 bytes. These are measured built assets, not a field speed
score; transfer encoding, caching and client device costs vary. No tool bundle
is embedded or preloaded on the portal homepage.

Recheck with `MARKMAP_TEST_URL=https://mindmap.utilibre.org node deployment/toolbox/check-markmap.mjs`.
For updates, review the pinned source and advisories, rebuild from the lockfile
using `Dockerfile.markmap`, rerun the private and public workflow checks, and
republish corresponding source with `publish-markmap-source.mjs`. Keep the
restricted parser/CSP settings and validate Markdown and SVG reopening before
promoting a new image. Runtime configuration is in `compose.browser.yaml` and
`security-markmap.conf`; the update monitor includes Markmap.

Rollback the portal to `public-utility-portal:pre-markmap-20261007`
(previous image `sha256:0d4d8eaa30b1fc53e840a11899a070e20c7021eebbbeae7caf142c5044639b4d`)
using the private environment snapshot at
`/opt/utilibre/markmap-rollback-6EeaSI/portal.env`. Disable the Markmap launch
and stop only the new `markmap` service. It has no previous server-held user
data; do not delete volumes or alter unrelated services.

Super Productivity was re-inspected at stable v19.1.0,
[revision 42ded9f](https://github.com/super-productivity/super-productivity/tree/42ded9f31a132bf92633b0c78ad4ebf1d87c0f71).
Its full npm audit reported 59 dependency entries: 20 moderate, 32 high and
7 critical. Omitting development dependencies misses Angular browser packages
classified that way. Conversely, native/server/build-tool findings do not prove
public-browser exploitability. Broad CSP and `new Function` plugin/bootstrap
paths still require review; a hardened browser build and export/restore flow
have not passed, so this candidate is not approved. Stock Typings was also
rechecked and still has analytics, remote fonts and inline event handlers.
Neither candidate has met its release gates; conditional installation
authorization is not being treated as permission to skip them.

## Historical next-batch assessment — 7 October 2026 (before implementation)

The following records the earlier source-only review. Its “not activated”
status and proposed launch gates describe that checkpoint; the implementation
section above supersedes them for Markmap only.

The catalogue/guide work takes precedence. None of these five candidates was
added to production, public DNS, Caddy, registrations or the catalogue. The
proposal is **Markmap and Super Productivity only**, after an owner launch
decision and the release gates below. “Defer” is not a claim that a workflow
passed. No candidate was built or browser-tested in this release; bundle sizes,
client memory, mobile playback/fullscreen and export/restore remain unmeasured.

Inspected pinned sources (license files/package metadata, not star counts):

| Candidate and exact reviewed revision | Architecture, burden and overlap | Decision and material gate |
| --- | --- | --- |
| [Super Productivity](https://github.com/super-productivity/super-productivity/tree/71eb7780bcf5d6b1dfdcd39a8a8265547d040760), package 19.1.0, MIT | Angular browser build; Node 22 build stage, `buildFrontend:prodWeb`, static `dist/browser` served by nginx in the inspected Dockerfile. 15 direct runtime and 124 development dependencies in that manifest; not a small single-file tool. IndexedDB operation log; default sync disabled and provider null. Existing IT Tools chronometer overlaps timing, not persistent task planning, focus and work logs. | **Defer public launch; preferred pilot.** Build a stable release reproducibly off the request path. Keep sync/integrations/plugins/external backgrounds disabled by default. Test a fictional study task, timing, reload, JSON export, fresh-profile import and deletion. Desktop local-backup settings do not prove browser backups work. Inspect actual requests before a local-only claim. |
| [Markmap](https://github.com/markmap/markmap/tree/122bf0500ee7aca4f023c2465f7e26bf023eec52), markmap-lib/view 0.18.12, MIT | Static browser libraries: Markdown parser, D3 rendering and optional syntax/math assets. pnpm/Vite build; 13 direct markmap-lib dependencies and two markmap-view dependencies (not an installed-size measurement). Existing draw.io/Excalidraw offer diagramming, but not this outline-first editing flow; no equivalent was located in deployed OmniTools/IT Tools source. | **Defer public launch; preferred first pilot.** Thin upstream-based editor, local assets, Markdown import/export and SVG. Reject `extraJs`, `extraCss` and imported parser overrides: the inspected frontmatter plugin normalizes them, it does not make arbitrary resources safe. Disable raw HTML or sanitize it, restrict URLs/images, and test hostile Markdown/frontmatter and exported HTML. No offline promise until the complete dependency path is tested. |
| [BeepBox](https://github.com/johnnesky/beepbox/tree/355e510099d230d066d95074c16d748d59fe054c), MIT | TypeScript compiled to static editor/player/synth; Web Audio runs on the visitor's device. Song URL, local preferences and exports; no server synthesis needed. Existing AudioMass trims/edits recordings, not note-pattern composition. | **Defer, worthwhile later creative expansion.** Test playback, note editing, full-song URL reconstruction, WAV/MIDI/JSON and supported exports. `website/index.html` loads Google Fonts; MP3 loads `lamejs@1.2.0` from jsDelivr on demand. Vendor permitted assets/notices and remove the TinyURL action: it transmits the complete song URL. A full URL is not a confidential or durable backup. |
| [Teleprompter](https://github.com/mjibulu/teleprompter/tree/25c797d66fa43673d2c34a39696287c7be975307), package 0.1.0, MIT | Current revision is **React 19 + Vite**, not the older assumed standalone HTML script. Four direct runtime dependencies; static production build, no application backend. `teleprompter:script:v1` in sessionStorage; text import/download, mirror/speed controls and Fullscreen API. No equivalent presentation-reading flow found in deployed Omni/IT source. | **Defer.** Limited project/version history requires a maintenance owner. Review all built requests, test export/reload/session loss, mirror, keyboard, pause and real-mobile fullscreen before recommending. No speech-recognition or AI backend. |
| [Typings](https://github.com/briano1905/typings/tree/1a4d4cb8f74870a7b185ffbcc318d5992d9d3783), GPL-3.0, reviewed HEAD dated 11 May 2020 | Plain HTML/CSS/JS, no build server needed. Inspected HTML 2,944 B, CSS 2,280 B, main JS 14,794 B, words JSON 51,880 B (source bytes, not total/gzipped download). Preferences are 90-day cookies, not localStorage. Spanish dictionary includes accents and ñ. Existing utilities do not provide typing practice. | **Reject stock deployment; defer a privacy-clean fork.** HTML includes Google Analytics and CSS imports Google Fonts. Remove both before any pilot, use system/local fonts, retain GPL/source notices, expose Spanish selection and test accented input, preferences, WPM/accuracy and malformed theme inputs. Six-year-old reviewed HEAD is not evidence of active maintenance or certified assessment. |

### Concrete first-batch preparation and acceptance

- Keep both proposed pilots loopback/private only until approved. Reuse the
  existing static-tool packaging and edge pattern; do not reserve public ports
  or create another registry for this review. Pin source, lockfile and base
  image; retain upstream notices and corresponding source archives.
- Markmap example: a fictional three-section study outline → editable mind map
  → SVG and Markdown downloads → reopen. Bundle dependencies; block arbitrary
  remote images, script/style imports and unsafe links by default. Do not
  invoke upstream asset loaders on imported frontmatter. HTML export, if
  offered, must be independently safe and disclose any remaining network use.
- Super Productivity example: create three study tasks, plan a focus session,
  record time, export, clear only the disposable test profile, restore and
  compare task titles/timing. Confirm no sync request without an explicit
  opt-in. No shared account, default cloud destination or promise that browser
  storage is a backup.
- Measure compressed cold-load bytes, first usable interaction, export time
  and memory on representative hardware. Static runtime means low *server
  computation*, not zero bandwidth/client cost. Build CPU/RAM and production
  file-serving RAM are different measurements; neither was benchmarked here.
- Only after the gates pass: add at most these two cards, precise service
  privacy records, English/Spanish starter guides, source/update notes and
  public health monitoring. This release adds no candidate as an unfinished
  public item and makes no traffic forecast.

Primary evidence retrieved 7 October 2026: the pinned repositories above;
[Super Productivity Dockerfile](https://github.com/super-productivity/super-productivity/blob/71eb7780bcf5d6b1dfdcd39a8a8265547d040760/Dockerfile),
[default sync configuration](https://github.com/super-productivity/super-productivity/blob/71eb7780bcf5d6b1dfdcd39a8a8265547d040760/src/app/features/config/default-global-config.const.ts),
[Markmap browser documentation](https://markmap.js.org/docs/markmap) and
[frontmatter parser](https://github.com/markmap/markmap/blob/122bf0500ee7aca4f023c2465f7e26bf023eec52/packages/markmap-lib/src/plugins/frontmatter/index.ts),
[BeepBox MP3 export](https://github.com/johnnesky/beepbox/blob/355e510099d230d066d95074c16d748d59fe054c/editor/ExportPrompt.ts),
[teleprompter storage](https://github.com/mjibulu/teleprompter/blob/25c797d66fa43673d2c34a39696287c7be975307/src/tool/TeleprompterTool.tsx),
[Typings HTML](https://github.com/briano1905/typings/blob/1a4d4cb8f74870a7b185ffbcc318d5992d9d3783/index.html),
[styles](https://github.com/briano1905/typings/blob/1a4d4cb8f74870a7b185ffbcc318d5992d9d3783/style.css)
and [preferences/scoring](https://github.com/briano1905/typings/blob/1a4d4cb8f74870a7b185ffbcc318d5992d9d3783/main.js).

Comparison inspected `/opt/utilibre/src/omnitools/src/pages/tools` and
`/opt/utilibre/src/it-tools/src/tools`; IT Tools has `chronometer`. Existing
Omni task links remain separately discoverable. Source inspection is narrower
than a full feature inventory or browser audit of the proposed applications.
Whisper remains withdrawn; no transcription/model download evaluation was
added to this batch.

## Creative/local-data batch — 7 October 2026

Scope: Excalidraw, SVGEdit, CyberChef and reviewed Image Scrubber.
Exact commits, licensing and ports are in `deployment/toolbox/browser-manifest.json`.
No LanguageTool, CryptPad or additional overlapping tools were deployed.
Each application is static, independently removable, unprivileged, read-only,
limited to 128 MiB / 0.5 CPU and reachable privately only from the edge/app host.
Strict same-origin CSP remains in force; there is no new application backend,
account database, analytics script, external font host or upload endpoint.

- Excalidraw: local editing/export and native Spanish; removed hosted collaboration,
  cloud export, AI and unconditional Simple Analytics injection. Fonts are local.
  Drawings persist in browser storage; downloads remain the visitor's backup.
- SVGEdit: local SVG creation/editing, native Spanish (some upstream dialogs are
  untranslated), URL-supplied content/config/extensions disabled. MIT application
  plus Apache-2.0, ISC, LGPL-3.0-or-later and X11 components, preserved in source.
- Both builds integrity-pin DOMPurify 3.4.16; SVGEdit also pins fflate 0.8.3.
  The remaining upstream lock graph is unchanged. Build-tool audit findings are
  not equivalent to vulnerabilities in a deployed Node server: no Node server ships.
- CyberChef: checksum-verified v11.5.0 release; no HTTP, DNS, map or RSA Verify
  operations in the UI/config. Strict CSP independently prevents remote requests.
  [RSA Verify's node-forge dependency has an unpatched signature-validation flaw](https://github.com/advisories/GHSA-86w9-cpqp-85rv)
  (checked 7 October). Do not recommend security-critical crypto decisions here.
  Runtime audit still flags browser-parser/crypto dependencies; this is not a
  zero-advisory build. DOMPurify use here is string sanitization, not the affected
  IN_PLACE/hook paths; malformed/large image or compression recipes can still
  exhaust browser resources. Some rich HTML outputs are intentionally blocked.
  URL input synchronization defaults off, but explicitly shared recipe URLs can
  contain data. English interface, best on a larger screen.
- Image Scrubber: upstream last functional commit is from 2020. Review found
  filename/EXIF `innerHTML` injection; both now use text nodes. String-to-code
  jscolor paths removed without enabling unsafe-eval. Opaque Paint is default;
  export is a new raster PNG, not a modification of the original. File decoding
  rejects unsupported/corrupt files, >25 MiB and >64 MP; output fits 2500 pixels.
  Native service-worker paths/cache are scoped to this subdomain. Touch handlers
  use their actual event argument. No anonymity or blur-security guarantee.

Public traffic still passes through Cloudflare. Its challenge script can make
same-origin security POSTs; these are distinct from an application file upload
and are not described as zero-network activity. Browser tests record them.

Reproduce checks with `node deployment/toolbox/check-creative-tools.mjs`.
All four public HTTPS workflows pass on Chromium/Linux: Excalidraw PNG/SVG
export and Spanish UI; SVGEdit export/reopen and stripping injected script/event
handlers; CyberChef Base64 decoding and a known SHA-256 result; Image Scrubber
hostile filename/EXIF display, opaque-paint PNG export without original metadata,
and malformed-image rejection. File-picker fallbacks are explicitly exercised.
No task uploads or third-party application requests were observed. This is not
certification of every operation, physical phone, browser or large file.
Portal checks pass: 76 unit tests, 60 desktop/mobile browser tests, 21 config
tests, lint and typecheck. The independent catalog finish review returned
`ship`; existing visual tokens/layout are unchanged.
Public source archives include exact upstream code, notices and adaptation recipes.
Rollback: disable only these four runtime launches and stop their compose services;
no database migration or other application's state is involved.

## Browser tools added on October 7

Four additional applications serve static assets only; selected files are
processed on the visitor's device. All four public HTTPS roots are reachable.
`check-browser-tools.mjs` exercises actual outputs, not just HTTP health:
ZIP creation and exact-byte extraction; two CSV rows mapped to a downloadable
RAWGraphs SVG; a one-second WAV selection exported from a three-second recording;
and a 160×120 PNG opened and exported by miniPaint. Chromium/Linux is the test
environment, not certification for every browser, mobile device or large file.

| Application | Public address and private port | Source revision | License and limits |
| --- | --- | --- | --- |
| ZIP Manager | `zip.utilibre.org` / 3160 | `3b77a599d823691cc3b7b81e0715b4655423e578` | MIT; ZIP, not RAR/7z. Native Spanish; optional default passwords/preferences can persist in browser storage. |
| RAWGraphs | `charts.utilibre.org` / 3161 | `b7b2909111cc029ccf418dc3e7d079e0f4c50d6f` | Apache-2.0; English, best on a larger screen. Local data and built-in charts only. |
| AudioMass | `audio.utilibre.org` / 3162 | `21f5ee1362a47be6f0dbe6e4969a15e43d21b044` | MIT application; upstream dependency notices include BSD/LGPL. English; multitrack is upstream beta. |
| miniPaint | `paint.utilibre.org` / 3163 | `a79733eb803fc97084ef0ee4faa96b031e69e1c0` | MIT; native Spanish. Local images/device fonts; download important work. |

Google Analytics and consent scaffolding were removed from RAWGraphs, together
with remote imports and executable custom-chart loading. Lodash/lodash-es are
pinned to 4.18.1, d3-color to 3.1.0 and Babel runtime to 7.29.10 in the supplied
lockfile. D3's native row parser replaces its eval-dependent object wrapper,
fixing **“Cannot parse dataset!”** under the strict CSP without allowing eval.
The old CRA build toolchain still has audit findings; it is not deployed as an
application server. This is not a zero-vulnerability claim. miniPaint uses UUID
v4 only; the audit advisory affecting v3/v5/v6 buffer arguments is not on that
observed path. Reassess dependencies on each upstream upgrade.

miniPaint remote image search/imports and web fonts are disabled. AudioMass
uses local application assets and permits the microphone only on its own origin.
No custom return-link injection was added. The four tested tasks made no
third-party application requests and no task uploads. Cloudflare can inject
same-origin security requests on public HTTPS; those are separate from the
applications and are not described as “zero network traffic.”

The six OmniTools catalog shortcuts are tasks within the existing application,
not six new deployments: background removal, image editing, compression, audio
trimming, CSV-to-JSON and duplicate-line removal. The parent service controls
their visibility/access; the software inventory credits OmniTools only once.
OmniTools p2 mirrors checksum-verified IMG.LY 1.7.0 model/runtime assets locally
because the original external model request was blocked. Other OmniTools tasks
can still fetch permitted processing components from CDNs. The MIT application
includes an AGPL-3.0 background-removal component and MIT ISNET/ONNX assets;
the public source index preserves these separate notices. A bilingual source
and license link is visible in OmniTools itself, including its deep task pages;
this is a source offer, not a custom return-navigation injection.

Release checks: 74 portal unit tests, 60 desktop/mobile browser tests, 21
configuration tests, lint, typecheck and production builds pass. All ten public
synthetic workflows pass: four new application exports and six OmniTools tasks.
Image compression reduced the fixture to 4,478 bytes; background removal
produced both transparent and opaque pixels; audio trimming produced a
176,478-byte WAV. Compression/trimming fetched permitted CDN components;
background removal used local model assets. No task-content uploads were
observed. These are bounded functional/privacy checks, not a capacity estimate
or a guarantee about untested operations.

Source/rebuild recipes, immutable revisions and private-port mappings are in
`deployment/toolbox/browser-manifest.json`, `compose.browser.yaml` and the public
`/utilibre-source/` archives. Security advisory evidence checked October 7:
[Lodash](https://github.com/advisories/GHSA-r5fr-rjxr-66jc),
[d3-color](https://github.com/advisories/GHSA-36jr-mh4h-2g58), and
[IMG.LY license and asset-hosting instructions](https://github.com/imgly/background-removal-js/tree/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web).

## Dumb recheck — October 7

The operator is correct that other instances work. Low-volume searches and a
sample song page succeeded at `dumb.bloat.cat`, `genius.fsky.io` and
`dumb.artemislena.eu`; their pages report `v.f558107`, matching the retained
Utilibre image and current upstream main. The sample pages contain nonempty
lyrics and annotations, not just HTTP 200 homepages. This does not establish
their uptime or all-content coverage. A browser-client fetch to FSKY did not
reproduce the successful plain-HTTP-client result, so access can vary by client.

The original pinned image was tested privately on loopback port 3343, without
changing LRCLIB or the public gateway. Search returns HTTP 500; the lyrics route
returns an error page with misleading HTTP 200 and no lyrics. Direct Genius
search/article requests, Chromium, and curl_cffi 0.16.3 with browser-compatible
TLS all receive HTTP 403 with `cf-mitigated: challenge`. The separate official
API responds HTTP 401 without credentials. No authentication bypass was tried.

The reviewed upstream/fork changes did not provide a verified access fix.
Network/IP treatment is a likely explanation, not proven solely by these
tests. The next discriminating test needs another operator-controlled outbound
IP, or configuration information from a working instance operator. No new
hosting, paid proxy, operator contact, public-instance relay, shared account or
visitor-side Genius requests were configured. The temporary test container was
removed; the original image/source and live LRCLIB replacement are retained.
**Dumb has not been restored.**

## Whisper withdrawn from the catalog — October 7

At the operator's explicit request, Whisper is hidden from the English and Spanish
catalogs, software inventory and public status pages because transcription results
remain unhelpful. The current advertised inventory is **38 services**. This is an
exception to the earlier request to keep tools visible; do not relist it without
approval. The installation, direct transcription URL, source and private monitor
remain intact. This is a reversible visibility change, not an uninstall or a fix
for transcription quality. Historical verification notes below are unchanged.

## Public-reader expansion checkpoint — October 6, after the edge update

### Whisper quality correction — October 6

The operator reported Spanish "hola" becoming `[Susah]`, hundreds of repeated
greetings and then dashes on Windows/Opera. The previous JFK-only check did not
establish usable Spanish transcription; the broader success claim was too strong.

Version `81869ed-p3` adds visible, accurate language/model controls, multilingual
Small by default (253 MB of model files), and Tiny as a lighter option. All model
and runtime requests stay same-origin; audio stays on-device. Repetition/duration
limits abort and discard unreliable results, rather than silently deleting actual
repeated speech. Silence/near-zero input and punctuation-only results are errors.
There is no speech VAD or general quality guarantee.

Thirteen audio/worker unit tests cover three genuine repeated words, 400 simulated
repetitions, duration limits, silence and punctuation. A public Spanish fixture
improved with Small, but another fixture still had errors; synthetic speech was
not recognized perfectly. `check-whisper-quality.mjs` checks Spanish fixture
content, digital silence, explicitly injected UI error recovery and privacy.
The user's exact clip and Windows/Opera remain unverified. Prior browser tests
use Chromium/Linux or mobile emulation, not the user's physical device.

### Latest functional audit — October 6

The enabled inventory remains **39 services**; no requested service was hidden.

- **Whisper Web:** deployed `81869ed-p2`. Fixed unreadable audio failing silently,
  failed model downloads poisoning retries, unreleased AudioContexts/blob URLs,
  and microphone tracks remaining live after Stop/Close. Late microphone
  permission is discarded safely; denied permission has bilingual guidance.
  Files are limited to 128 MiB before decoding. Public desktop/mobile-emulation
  tests cover invalid-file recovery, a deliberately failed model request followed
  by successful speech transcription/TXT export, and microphone lifecycle.
  No audio uploads or external browser requests occurred. Production dependency
  audit is clean; 22 development-tooling advisories remain outside the static
  serving image. Physical phones and long recordings remain unverified.
- **draw.io:** deployed `32.0.2-p3`. Native Minimal UI on screens≤600px fixes
  narrow-screen overflow; explicit UI choices and desktop defaults remain.
  Content-versioned configuration/loader URLs fix Cloudflare serving stale
  JavaScript. Public Spanish/mobile layout fits 390px. Cloud accounts and remote
  export remain disabled. No custom navigation was added.
- **SafeTwitch:** deployed `ddee63e-p2`. Lazy preview images reserve their size;
  media admission now fits the native 50-thumbnail gallery (64/IP, 96 global).
  Existing request-rate, upstream socket/body limits and same-origin proxying
  remain. Public desktop/Spanish-mobile image scrolling, real decoded live
  video and privacy checks pass without the observed intermittent 429.
  Source audit corrected an older metadata error: the actual frontend checkout
  is `ddee63ebbe8b7b74d8f6ed3869cd7958934746d7`, not `caeb85a`.
- **Portal status:** added the eight missing newer web-service targets. All 38
  launched web services now have private HTTP liveness checks, with a regression
  test against the reviewed inventory. Mumble remains unknown on this HTTP page;
  its separate private TCP monitor does not prove public UDP voice.
- **Rechecks:** FMD invitation/data isolation and Pollaris create/vote/export/delete
  passed with disposable data cleaned up. PairDrop transferred an exact-byte
  synthetic file through public HTTPS/WebSocket signaling and WebRTC; both
  browsers were on this test machine, not different restrictive NATs. JupyterLite
  executed Python, pandas CSV and matplotlib examples publicly. GotHub,
  BiblioReads, DeGoog and TransLite workflow/privacy checks passed.
- **Network diagnosis:** search and Binternet's public-IP path times out from
  this app VM. Verified HTTPS through the actual Caddy VM passes search in both
  languages and Binternet search/images/pagination. Checkers explicitly label
  that route; it is not independent external availability evidence. No TLS,
  anti-abuse or browser-CSP bypass was used to make a check pass.

The portal passes 63 unit and 56 browser tests. A flaky software-spacing test now
waits for the asynchronously rendered inventory before measuring it; no layout
assertions were removed. 48 deployment/security tests and 3 audio-lifecycle unit
tests pass. All 39 Kuma liveness monitors and host resource thresholds are healthy.
Published Whisper/SafeTwitch archives match public-download SHA256 hashes; source
and deployment recipes are preserved, with previous archives retained.

The existing Fandom-image 403, Imgur-media 429 and IMDb public-data-use gate remain
unresolved; no privacy-weakening fallback was introduced. Off-site backups remain
deferred. These checks are representative workflows, not a claim that every
feature, device or upstream connector is verified.

### Latest checkpoint — October 6, LRCLIB replacement

**39 services are enabled: 38 web services plus password-protected Mumble.**
With the operator's approval to use suitable replacements, LRCLIB replaces
blocked Dumb at `https://lyrics.utilibre.org/`, using the existing LAN port3142.
The official [MIT frontend](https://github.com/tranxuanthang/lrclib-homepage/tree/f37c07042be1af5fdcc7932d090af32141089751)
uses the documented [LRCLIB search API](https://lrclib.net/docs) through a
bounded, read-only Utilibre adapter. No account/key is required. This provides
lyrics, not Genius annotations or a Genius URL redirector.

Public desktop/mobile search, lyrics preview, keyboard dismissal and recovery
states pass. Those workflows make no direct third-party browser requests.
CSP intentionally blocks Cloudflare's injected inline security script without
breaking the application. Application search logs are absent; edge/upstream
retention is separate. RAM cache:8MiB/128entries/ten-minute freshness;
sequential upstream calls, 500ms spacing, and Retry-After-aware backoff.
The browser dependency audit reports no production advisories; build-only
Tailwind/Vite tooling retains advisories and is not present in the serving image.
Upstream attribution/license and the pinned-source patch are retained.

No safe, verified drop-in was found for the remaining IMDb/Fandom/Imgur readers.
Phantom's current proxy validation needs security work and uses the same blocked
Fandom media source. Rimgu's maintainer recommends Rimgo. Watcharr changes the
movie offering to an account-based watched-list service. Details and reproduction
commands are in [expanded operations](expanded-operations.md#lyrics-replacement).
Off-site backups remain explicitly deferred; existing local schedules are unchanged.

### Previous checkpoint — October 6, QR/Gram/DeGoog launch

**38 services are enabled: 37 web services plus password-protected Mumble.**
Relevant public web workflows and Mumble's TCP voice fallback have passed;
public Mumble UDP audio remains unverified.
The current machine-readable inventory is
[`delivery-checklist.json`](../deployment/community/delivery-checklist.json).
Earlier checkpoints below are historical, not instructions to disable services.
The mobile category cue now derives its count from the nine actual categories;
the stale hard-coded "4 groups" text has been removed in both languages.

- **QR Tools:** public at `qrtools.utilibre.org:443`, backend3155, MIT build
  `0fde700-p2`. Fixed the code being drawn off-center inside its image, including
  worker/fallback rendering and SVG exports. Default margins now measure29pixels
  on all four sides. Public desktop/Spanish-mobile generation, decoding,
  PNG/SVG/PDF export, synthetic camera and offline tests pass. Versioned scripts
  and a new service-worker cache avoid stale Cloudflare/browser assets.
- **Kittygram:** public at `gram.utilibre.org`, backend3154. Actual profile,
  post, image and video workflows pass on desktop/mobile without third-party
  browser requests. Enabled in the portal and Kuma. No upstream Spanish UI exists.
- **DeGoog:** public at `degoog.utilibre.org`, restricted gateway3156; direct
  operator port3143 remains loopback-only. Official1.0.0 image identifies
  revision4a9bcc74. Native SearXNG compatibility loads pinnedAGPL engines
  Mwmbl, Open Library and Hacker News fromSearXNG d48c4b555; no code from the
  unlicensed extension repository is installed. Real search, Spanish/mobile,
  privacy and admin-route denial pass publicly. Native privacy text offers
  return/source links. Search cache is boundedRAM, indexer/favicon persistence
  are disabled, and application/gateway logs are disabled. The source archive
  includes the exact core revision, engines, licenses and deployment material.
- **Mumble:** the operator selected password protection. It is configured on
  `10.10.1.43:64738` TCP and UDP; correct/incorrect-password protocol tests pass.
  Public DNS changed to the direct IPv4 address during final checks. An independent
  Tor-routed check then passed public authentication and TCP voice loopback with
  the server certificate pinned. A valid 20 ms Opus silence packet was relayed
  exactly and separately decoded in Chromium. No other participant hears this
  loopback probe. The app VM's direct timeout is consistent with NAT reflection
  being absent, not proof of a public outage. Native client launch is enabled;
  public UDP voice remains unverified. Credentials are never put in launch URLs.
- **Rimgo:** HTTPS is reachable, but Imgur media still returns429. The gateway
  now removes the erroneous one-year cache header from errors, uses`no-store`
  and supplies`Retry-After`. A per-upstream cooldown prevents repeated requests
  for at least ten minutes, or longer when Imgur asks. This is not a playback fix.
  Cloudflare still has older cached errors: an existing media URL returned a
  cache HIT with the old one-year header, while a fresh cache key returned the
  corrected `no-store`/`Retry-After` response. Purge only the Rimgo hostname's
  cached content in Cloudflare; no Cloudflare API credential is available here.
- **Dumb:** inspecting the deployed binary confirms base revisionf558107 and
  Go1.26.8. Its build tree is markedmodified, so this is not a reproducibility
  claim. Genius403/human challenges persist even with an ordinary browser;
  replacing an already-current container does not resolve that denial.
- **BreezeWiki/LibreMDB:** a fresh BreezeWiki check confirms article text200
  but proxiedimage403. IMDb still requires responses the current reader cannot
  retrieve; the vulnerable old LibreMDB runtime remains stopped. No challenge
  solvers, shared login cookies, rotating proxies or direct-visitor image leakage
  were introduced to bypass these failures.

Account backups now run daily at04:40UTC; identity and expanded PostgreSQL/SQLite
restore rehearsals passed. Interrupted-run recovery and low-disk/failure alerts
are configured. A five-minute host watcher checks Kuma's web-service monitors
and Mumble's explicitly labeled private TCP monitor, plus
disk/inode/memory thresholds and sends verified-STARTTLS mail through
`10.10.1.20:26` while checking the certificate for`mx.mailgt.dev`. Its test was
accepted by the relay. This is not independent monitoring of a wholeVM outage;
backups remain on-host, not off-site. No old backups were deleted.

Public-directory changes for AnonymousOverflow and DeGoog were pushed to
`mycelibre` forks. Both actual PR-creation attempts were denied by GitHub token
permissions. [Prepared submissions](public-instance-submissions.md) distinguish
fork branches, submitted requests and published listings.

### Previous checkpoint — October 6, 18:00 UTC

This checkpoint supersedes older pending-route notes below. **34 services have
passed public HTTPS/workflow checks.** BiblioReads, 4get, AnonymousOverflow and
SafeTwitch are now public, enabled in the catalog, and monitored. The catalog has
43 records covering42 independently maintained applications and one integration.

- **BiblioReads:** `biblioreads.utilibre.org`, LAN3151, revision9508abc-p1.
  Node24/Next15/React19 source build; production npm audit reports zero advisories.
  Build-only PWA dependencies still have advisories; this is not a claim of zero
  vulnerabilities. Public desktop/mobile search, book/cover retrieval, library
  export/delete and native operator link pass. Outbound HTTPS uses allowed hosts,
  public-IP-pinned sockets, size/time/concurrency limits and no visitor credentials.
  Covers are same-origin, resized by Sharp, with a bounded one-hour RAM cache.
  Browser-local library/PWA storage is disclosed; no account or Goodreads login.
- **Second QR tool:** QR Generator Offline, MIT, revision0fde700-p1,
  `qrtools.utilibre.org`, LAN3155. Mini QR remains available separately.
  PNG/SVG/PDF export, QR decoding, Spanish handoff, synthetic camera-stream UI,
  offline loading and desktop/mobile checks pass. This does not certify every
  physical phone camera. External fonts/CDNs removed; jsPDF/JSZip bundled with a
  lockfile and clean npm audit. QR history is memory-only; the service worker
  stores application assets and preferences may remain locally. Camera tracks
  stop on exit; decoded links only open HTTP(S) after an explicit action.
  Public HTTPS still returns525: the supplied Caddy block must be applied.
- **Kittygram:** `gram.utilibre.org` replaces the initially proposed Instagram
  hostname at the operator's request. LAN3154, AGPL3 revision5931c21-p1. Public
  profile/post, proxied images and real video playback pass at the new hostname
  through the protected backend on desktop/mobile, without external browser
  requests. Native operator link configured; upstream has no Spanish translation.
  Media uses exact CDN suffixes, verified TLS, time/size limits, RAM caches and
  restricted egress. No Instagram login/cookies or public JSON API. Signing
  credentials are private and backed up. Public HTTPS still returns525; apply
  the revised Gram block on Caddy before enabling its portal launch.
- **Rimgo:** revisiond2be8e2-p1 on LAN3153, AGPL3. Installed with bounded HTTPS-only
  transport, fixed upstream hosts, private-address denial and bounded API caches.
  Removed response caching that retained upstream media errors and mishandled
  range responses. Album data works; Imgur media still returns429 even directly
  from the host. Not launch-ready or eligible for a directory submission yet.
- **Mumble:** official BSD3 image1.5.915 pinned by digest. Password-protected local
  pilot on127.0.0.1:64738 TCP/UDP,20users, no recording/event logs, no new outbound
  connections. TLS/protobuf authentication and wrong-password rejection pass.
  Native welcome link returns to Utilibre. Public networking and the admission
  policy remain operator decisions; ordinary HTTP Caddy configuration cannot
  carry Mumble's TCP/UDP protocol. The pilot uses a self-signed certificate.

BreezeWiki now runs pinned6d09507-p1 from source with strict image proxying and a
bounded, verified-TLS transport adapter. Actual articles now return200; its image
CDN still returns403 for many images. Full-page browser tests therefore fail.
Dumb was checked last as requested: upstream main is stillf558107 from September26,
and direct Genius search returns403 while the public reader returns500. LibreMDB
also remains blocked: its old Node18/Next12 image is stopped, and IMDb returns an
AWS WAF JavaScript challenge rather than title JSON. No challenge solvers, shared
login cookies or rotating proxies were added. DeGoog extensions still lack an
identified license. Screego inventory found no installation; prior user wording
asked to find it, not to install it.

Source archives and reproducible build/gateway recipes are published for modified
deployments; publisher scripts preserve prior archives. The new on-host snapshot
`/opt/utilibre/community-backups/2026-10-06T17-53-56-714Z` includes Mumble SQLite,
Mumble/Kittygram private configuration and the onion identity. PostgreSQL restore,
SQLite integrity, archive structure and checksums pass. Backups are **not off-site**.

Directory state: PrivateBin is listed; Redlib/SearXNG requests remain open.
RSS-Bridge, ntfy, Priviblur and Binternet have prepared fork branches, not submitted
PRs, because the token cannot create them. BiblioReads' upstream accepts instance
issues, but an actual createIssue attempt was denied by token permissions on
October6. AO's hub reads its main repository's`instances.json`; submission still
needs write permission. SafeTwitch/GotHub need Codeberg credentials. 4get's list is
distributed: an existing operator must add our address. Do not describe any of
these unfinished requests as published. Exact remaining states are maintained in
`deployment/community/delivery-checklist.json`.

### TransLite addition — October 6

Installed `gospodin/translite` at reviewed revision
`7b4b8e51359338219463f14c2a06211b6998a11e` (Unlicense), with PHP8.5.11 on
Alpine3.24. The requested `80600f5` changes its CI build action; this newer pinned
revision incorporates subsequent input-validation fixes. The protected gateway
is `10.10.1.43:3152`; only the separate Caddy VM can reach it over the LAN.
All four engines—Google, DeepL, Yandex and DuckDuckGo—returned actual English ↔
Spanish translations from this VM. This is a point-in-time functional check,
not a promise that unofficial provider endpoints will remain available.

Public `translate.utilibre.org` is now live. The same desktop/mobile translation,
four-engine API, native engine-switching, secure-cookie, input-limit and privacy
checks pass over verified public HTTPS. The bilingual catalog enables its launch
link. The Caddy block is in `deployment/community/Caddyfile.community`. Recheck
with `node deployment/community/check-translite.mjs` without `--backend`.
Backend tests use temporary loopback TLS solely to exercise secure cookies;
they do not verify the public certificate. Cloudflare injects its security script
into public HTML; application JavaScript remains opt-in. No external browser
requests were observed in the tested public workflow, and CSP was not relaxed.

Changes: POST-only text submission, server-enforced 2,000-character limit,
restricted provider hostnames, verified TLS with public-IP-pinned connections,
2MiB/15-second upstream limits, provider cooldown, quotas and private-network
firewall rules. No normal application or gateway request/error logs. Caddy,
Cloudflare and upstream operational records are separate. Referrers are sent
only within this origin, preserving same-origin POST checks without off-site
referrer disclosure. Cross-site POSTs are denied, but ordinary inbound links work.

No shared translation-content cache: only language lists are cached across
requests. Short-lived RAM sessions may hold text during engine/language changes;
they expire after five minutes of inactivity, are collected by subsequent
requests, and disappear on restart. Preference cookies last up to90days. There
are no accounts, uploads, database or persistent visitor-data volume. Audio is
disabled because upstream audio links put submitted text in GET URLs. Provider
selection is explicit: multi-engine mode sends the text to every selected
provider. This is not local, confidential or end-to-end encrypted translation.

Native UI is English; Spanish portal links use the supported `tl=es` target,
not an invented interface-locale parameter. Mobile form text is enlarged to16px
without changing the upstream layout. There is no native external-return-link
setting; no custom Utilibre navigation was added. Matching modified source is
published at `/utilibre-source/translite-utilibre.tar.gz`, with build, gateway,
network rules and source patch in `deployment/community`. A private database
backup is unnecessary for this stateless service; deployment source is tracked.

Run `check-translite.mjs --backend` for browser and input/privacy regressions.
The source build also runs25 fixed-host/private-IP/cache tests. This is a scoped
deployment review, not an independent security audit.

### Pollaris and LibreDNS addition — October 6

Pollaris 1.2.3 (`b6ab5b3309e858a02c042350be82cc7a9c599246`, AGPL-3.0-or-later)
is installed with PHP 8.5.11, PostgreSQL 17.11, an async/cleanup worker and a
restricted nginx gateway. Composer's production-dependency audit reported no
known security advisories. Backend browser tests pass poll creation, anonymous
guest voting, CSV export, administrator-route denial, native Spanish preferences
and deletion. Synthetic polls/responses were removed. The SMTP relay accepted
one deployment test to the operator. This is not proof of inbox delivery.

Public `pollaris.utilibre.org` now passes the same creation, anonymous voting,
CSV export, denied administrator routes, Spanish handoff and deletion workflow
over verified HTTPS. Pollaris is enabled in the bilingual catalog. The app
listener is `10.10.1.43:3149`, restricted to Caddy; the block is in `Caddyfile.community`.
Do not expose `127.0.0.1:3159`, the administrative listener. `admin@utilibre.org`
owns the native admin account; its randomly generated password is stored in
`/opt/utilibre/community-data/pollaris-private/admin.json` (0600), not Git.
Use a private SSH tunnel to administer it. No general user account is required.
No custom return-link UI was added: upstream offers template overrides, not a
native external-footer setting. Spanish portal entry submits the app's native
CSRF-protected preferences form. Rallly now sets its native locale cookie through
a fixed HTTPS handoff too; public Spanish HTML was verified.

Recipes: `compose.pollaris.yaml`, `Dockerfile.pollaris`, `init-pollaris.mjs`,
`init-pollaris-admin.mjs`, and `check-pollaris.mjs`. In the community directory:

```sh
docker compose -f compose.pollaris.yaml up -d --wait pollaris-db
docker compose -f compose.pollaris.yaml run --rm --no-deps pollaris php bin/console doctrine:migrations:migrate --no-interaction
docker compose -f compose.pollaris.yaml up -d
node check-pollaris.mjs --backend
# After the edge is ready, repeat WITHOUT --backend to test real public HTTPS.
```

The backend test uses a short-lived, loopback-only TLS proxy; its self-signed
certificate exception is confined to that test and does not certify public TLS.
Polls are not end-to-end encrypted. The private administration URL is a bearer
credential. Native expiration deletes completed polls six months after their
closing date and incomplete closed polls after seven days. Request bodies are
limited to 128 KiB; writes, page requests, processes and memory are bounded.
No normal nginx/FPM access logs; operational warnings use rotated Docker logs.
Only the worker can contact the specific SMTP relay; the database has no public
port, and the web application has no external network.

LibreDNS was assessed, **not installed**. The supplied URL is a group; its
[`libredns-cfg`](https://gitlab.com/libreops/libredns/libredns-cfg) project is a
whole-host Ansible deployment of PowerDNS Recursor, dnsdist, nginx, certificates,
networking and monitoring, tailored to LibreOps' addresses. Its configuration
also deliberately uses `dnssec=process-no-validate`. Running it unchanged on this
shared host would be inappropriate. A public DNS service deserves a separately
planned, monitored resolver deployment, direct encrypted endpoints and a clear
query-privacy policy. No host DNS, network configuration or DNS ports were changed.
LibreDNS itself offers [DoH and DoT](https://libredns.gr/), not a browser toolbox.

The daily community snapshot job now includes Pollaris's database, secret
configuration and scheduler state alongside Rallly, FMD and Uptime Kuma. The job performs an
isolated PostgreSQL restore and SQLite integrity check, sends a generic failure
alert, refuses to start with less than 5 GiB free, and never prunes backups.
Backups remain on this VM; an off-site destination is still needed. The unrelated
identity/expanded-app snapshots retain their separate scheduling status below.

The public status page now includes 28 monitors, preserving its existing
settings and history. The SearXNG monitor uses verified HTTPS `/healthz` through
the private Caddy edge, explicitly labeled: the public-IP route from this VM is
unreachable, and a non-browser root request is correctly rate-limited. No limiter
exception, forwarded-IP forgery or TLS bypass was added. Daily updater browser
tests remain the separate functional-search check. These same-VM root/liveness
monitors are neither complete workflow tests nor independent outage monitoring.

This section supersedes older deployment states below. Installation, a passing
homepage, successful content retrieval, and public readiness are separate checks.

| Application | Listener | Verified / remaining work |
| --- | --- | --- |
| Rallly 4.15.3 | app LAN 3123; `poll.utilibre.org` | Live. Public OIDC + MFA, onboarding, poll creation, anonymous guest voting, CSV export and deletion pass. A second organizer's deletion attempt returned 403. Email-login bypass routes remain blocked. Stock licensing reminder is disclosed; no checks were modified. |
| Priviblur 251a8e6-p1 | app LAN 3139; `tumblr.utilibre.org` | Live. Public blog/media and Spanish preferences pass after tuning media-specific limits. Patched dependencies, private-network egress blocks and RAM-only cache; full modified-source archive linked prominently. |
| Mezzo 1.4.0 | app LAN 3140; `tenor.utilibre.org` | Live. Public GIF search and all 31 displayed images loaded without HTTP errors. Media-specific limits avoid throttling ordinary results. |
| FMD Server 0.17.0 | app LAN 3141; `fmd.utilibre.org` | Live invitation-only pilot. Public synthetic API registration, opaque-location round-trip, account separation, unauthenticated denial and cleanup pass. Real Android GPS/push/cryptographic end-to-end testing still needs an operator device. No Spanish UI in this release. |
| Dumb | app LAN 3142; proposed `lyrics.utilibre.org` | Homepage works, but Genius search fails and a lyric URL returns a soft error. Not publicly advertised as working. |
| DeGoog 1.0.0 core | loopback 3143 | Public-instance lockdown denies unauthenticated settings API reads/writes. Indexer defaults off. No engines installed: the separate official extensions repository has no identified license. |
| LibreMDB | loopback 3144, stopped | IMDb search/title requests failed. Published image contains Node 18 / Next.js 12; public deployment requires a supported build and working upstream access. |
| 4get 03ba5d7-p2 | app LAN 3145; proposed `4get.utilibre.org` | Bounded public-IP image fetching, redirect validation, ImageMagick resource/coder restrictions and fixed JPEG resizing. Real Wiby/DuckDuckGo searches and image resizing pass. Source published; Caddy HTTPS pending. No rotating proxies or challenge bypasses. |
| SafeTwitch 2.4.5-p1 | app LAN 3146; proposed `twitch.utilibre.org` | Source-built static frontend and Go 1.26 backend, bounded Twitch/CDN-only proxy, image MIME checks, fixed URL-safe playlist encoding, gateway quotas/cache and explicit follow-lookup bounds. Real live-video frames decode and time advances; EN desktop/ES mobile, images and following lookups pass with no third-party browser requests in the tested workflow. Chat is disabled. Caddy HTTPS remains pending; long recordings/clips and every upstream feature are not validated. |
| AnonymousOverflow 937cfee-p1 | app LAN 3147; proposed `overflow.utilibre.org` | Hardened current-Go/dependency build renders a real question and answers. govulncheck reports no reachable vulnerabilities. Fixed-host short-link fetching, bounded JSON cache and quota/backoff tests pass; invalid media tokens are denied. Source published; Caddy HTTPS pending. |
| GotHub 24bedc8-p2 | app LAN 3148; `gothub.utilibre.org` | Live. Fixed static compression writing into the read-only container (gzip requests previously404). Versioned asset URLs avoid cached errors. Public desktop/mobile styling, repository and file checks pass. Bounded GitHub-only egress, gateway limits and full modified source supplied. Upstream seeks maintainers. |
| Binternet 9bb70ef-p1 | app LAN 3150; `binternet.utilibre.org` | Live; operator confirmed public search/images. GPL-3.0 source build on PHP 8.4.21. Desktop/mobile search, images and pagination passed; restricted outbound requests, response/time limits, image validation and gateway quotas. Separate Tor frontend passed homepage/search/images/pagination through an independent Tor client. English UI; no native Utilibre return-link option. |

Runtime recipes are `deployment/community/compose*.yaml`. Unready evaluation services
have loopback listeners; reviewed gateways use Caddy-only LAN listeners. Both use
capability drops, read-only roots, resource limits,
disabled IPv6, and firewall blocks on private/host destinations. These controls
are not an independent security audit or a complete open-proxy defense. The
unready reader evaluations do not restart automatically; 4get, AnonymousOverflow
and GotHub now do; SafeTwitch also restarts automatically after its playback checks. Native language settings
are used where available; Priviblur requires the complete Spanish preference
restore URL, not only a `language` parameter. Experimental entries are searchable
in the bilingual catalog and software list, with no launch links and no claim
of public availability; they are not featured on the default homepage.

Binternet also restarts automatically. Its full modified source is available at
`/utilibre-source/binternet-utilibre.tar.gz` and the patch/build/configuration
are tracked under `deployment/community/`. It has no database, visitor account,
uploads or persistent image cache; bounded images are held in worker memory.
Searches and image requests go to Pinterest and its image CDN from this server.
Author links leave the instance for Pinterest. Gateway access logs are disabled,
but error logs and any edge/upstream retention still apply. Pagination URLs carry
anonymous Pinterest CSRF tokens, never a shared personal login cookie.
Broken upstream `api.php` and non-public PHP files are denied by the gateway.
Binternet's official instance list excludes Cloudflare-proxied hosts. DNS was
confirmed direct after the operator's update and public access was confirmed.
The clearnet/onion listing branch was pushed to `mycelibre/Binternet`, but GitHub
refused upstream PR creation with the current token. It is **not submitted/listed**:
[prepared comparison](https://github.com/Ahwxorg/Binternet/compare/main...mycelibre:utilibre-public-instance-20261006?expand=1).
No cryptocurrency wallet or donation address was configured.

Binternet's onion address is
`http://ued2jl2ahvngdegugysin2fa6malo6omyf33j5tpfgex47erv453wbad.onion/`.
The separate Tor 0.4.9.13 service reaches its own restricted nginx/PHP frontend
through a Unix socket, with no published TCP listener, SOCKS port, control port
or exit-relay role. The clearnet response advertises `Onion-Location`, and the
portal offers a Tor Browser link. Tor protects the visitor connection; Pinterest
requests still leave through the ordinary application-server connection.
Onion requests have a shared budget rather than pretending client IPs are known.
The private onion identity is backed up with mode-restricted community snapshots;
archive/checksum verification passed on October 6. These backups are on-host,
not off-site. Do not publish the identity files. Recipes and corresponding source
are included in the public modified-source archive; no keys are included.

GotHub's `check-gothub.mjs` covers the gzip/identity stylesheet regression plus
desktop/mobile rendering and real repository/file content over public HTTPS.
`publish-gothub-source.sh` retains an earlier archive before publishing matching
patched source. No custom return-link navigation was added. Other reader routes
(`overflow`, `4get`, `twitch`) still returned525 on the latest October6 check.

Merge `deployment/community/Caddyfile.community` on the separate edge VM,
preserving the existing Cloudflare-only trusted proxy ranges. The file supplies
Rallly, Priviblur, Mezzo and FMD routes; adding a route does not complete their
end-to-end tests. Do not publish the loopback evaluations. Do not open FMD
registration or replace its Android authentication with a browser login gate.
The unsupported `lyrics.utilibre.org` block has now been removed from the
deployment file so applying it does not expose a nonfunctional reader. The
remaining Caddyfile passes local adaptation and provisioning validation; this
does not establish successful certificate issuance or connectivity on the edge.
Rallly, Priviblur, Mezzo and FMD pass ordinary verified HTTPS GETs after the
operator's edge update. The same-day recheck also found 21 of the 22 previously
enabled service roots reachable from this VM. SearXNG's public IPv4 connection
times out from this VM, and this VM has no IPv6 route; its local `/healthz`
returns OK and the operator confirms public search works. Treat this as a
vantage-specific connectivity failure, not evidence of a general search outage.
No SearXNG limiter or proxy-trust configuration was weakened for these probes.

SafeTwitch's complete frontend/backend source archives, locked dependencies and
build material are linked from its footer. Its pinned translations submodule is
included. The Go audit found no reachable or imported vulnerable packages; an
unused-module advisory was also reported. Remaining frontend npm audit warnings
are the unpatched `braces` recursion issue and build-only glob dependents; the
static nginx runtime contains neither Node nor these build dependencies. Never
use that toolchain to build untrusted visitor projects. The privacy copy explains
that searches, opened channels and followed-channel lookups reach the proxy;
browser-only preference storage does not mean all those requests stay local.

The catalog now has nine categories and 27 enabled services. JupyterLite's real
Pyodide kernel executed a calculation, a pandas CSV example and a matplotlib chart
in the browser. Initial "No Kernel" while it downloads is not a missing kernel.

Rallly uses the AGPL distribution without purchasing a key or altering license
checks. Native `instance_settings.footer_links` contains English/Spanish return
links and the matching upstream source. A further fresh `20261006c` run completed
the entire poll/vote/export/delete workflow. Its three identity-provider accounts
were disabled and their sessions, MFA fixtures and OAuth tokens retired. Its two
synthetic app users, polls, workspaces and anonymous guest record were deleted.
The original three QA identities remain
retired. A fresh `20261006b` run verified public password + MFA login, completed
the approved OIDC callback, and rejected the outsider. All three fresh identities
were then retired too: groups cleared, passwords made unusable, sessions/tokens/
MFA fixtures revoked. The two empty synthetic Rallly accounts and their app
sessions were deleted; no owner credentials or real user data were changed.
Run-specific QA scripts refuse credential overwrites or reused usernames.
Community snapshots passed disposable PostgreSQL restores and FMD SQLite
integrity checks, including Pollaris after its addition. The daily 04:10 UTC
timer is enabled and its first run passed. Backups remain on-host only, not a
complete backup/recovery service.

### Public directories

- PrivateBin: **published**, confirmed in the [official directory](https://privatebin.info/directory/)
  on October 6. Automated geolocation shows the Cloudflare edge, not necessarily
  the origin's country.
- RSS-Bridge: row prepared on `mycelibre/rss-bridge:utilibre-public-instance-20261006`;
  [create the pull request](https://github.com/RSS-Bridge/rss-bridge/compare/master...mycelibre:utilibre-public-instance-20261006?expand=1).
  GitHub refused PR creation: the current personal token lacks permission.
  The row discloses Germany/Hetzner, Cloudflare and the three enabled bridges.
- ntfy: same credential blocker;
  [prepared comparison](https://github.com/binwiederhier/ntfy/compare/main...mycelibre:ntfy:utilibre-public-instance-20261006?expand=1).
- Existing [Redlib PR 117](https://github.com/redlib-org/redlib-instances/pull/117)
  and [SearXNG request 941](https://github.com/searxng/searx-instances/issues/941)
  remain open. No duplicate requests created.
- Priviblur: source-disclosing row prepared on
  `mycelibre/priviblur:utilibre-public-instance-20261006`;
  [prepared comparison](https://github.com/syeopite/priviblur/compare/master...mycelibre:utilibre-public-instance-20261006?expand=1).
  No upstream pull request has been created.
- Mezzo, Dumb, LibreMDB, DeGoog, 4get, SafeTwitch, AnonymousOverflow
  and GotHub are **not submitted**. Mezzo and
  Codeberg submissions also need forge credentials. No third-party public-host
  directory was found in the FMD project's documentation; its community-server
  page lists alternative implementations, not hosted instances.

### Other requested assessments

From [Private.coffee's services](https://private.coffee/services.html), the
strongest third-party candidates are CyberChef (browser-only data tools),
HedgeDoc (collaborative Markdown), CryptPad (encrypted documents; requires a
separate sandbox origin and storage operations), and FacilMap (shared maps;
disclose external tiles/routing). No general recommendation was treated as
permission to install it. Their own projects were excluded from this shortlist.

No current Utilibre tool replaces EteSync's encrypted contacts/calendar/task
synchronization. Matrix is worth an invitation-only pilot if there is an actual
community and capacity for moderation, media retention, updates and recovery;
it was not installed. Syncplay is feasible and Apache-2.0 licensed, but requires
desktop clients/players and a separate TCP/TLS endpoint (normally 8999), not a
normal Caddy HTTP route. It synchronizes playback rather than storing/sharing
videos. It too was assessed, not installed.

## Current checkpoint: approved-account pilots

This checkpoint supersedes the historical private-setup notes below.

- Public HTTPS and native OIDC sign-in passed for two separate synthetic users
  on `cv`, `design`, `budget` and `wakapi.utilibre.org`. Authentik admits only
  active, email-verified members of `utilibre-approved`; no public signup.
- Single-use, 48-hour invitations fix the approved username/email. The tested
  flow rejects missing tokens and identity overrides, requires email verification
  and TOTP, and grants no administrator role. Test email was captured locally;
  real SMTP delivery was separately confirmed by the operator.
- Recovery passed email-link verification, existing MFA and password reset.
  Neither the owner's password nor their MFA was changed.
- Resume JSON/PDF export, Penpot design archive export, Actual budget download
  and Wakapi private-stat access passed. Other-user requests were denied.
  Synthetic CVs were moved to Trash then explicitly purged; the synthetic
  design and budget were deleted through application APIs. Test accounts and
  sessions were retired afterward; the verified backup retains these fixtures.
  Backup checks restore PostgreSQL into a disposable networkless container and
  verify SQLite integrity. Backups remain on-host, unscheduled, not off-site.
- Penpot pilot limits: 3 teams/profile, 10 people/team, 100 files/team and 1 GiB
  media/team. `admin@utilibre.org` is the configured administrator identity.
- JupyterLite and Whisper Web are linked publicly. CV links select Spanish;
  Penpot uses a first-party language handoff; Actual follows browser language.
  Software-page spacing and bilingual mobile checks pass.
- Wakapi has a small published patch for free-service retention wording and
  empty-account/OIDC-only UI errors. Public registration, paid subscriptions,
  imports and leaderboards are disabled. Raw activity retention is 3 months.
- Rallly is now live as described above. Licensing is not itself a
  mandatory-purchase blocker: the developer's [May 30 clarification](https://github.com/lukevella/rallly/discussions/1714)
  confirms the AGPL code may be self-hosted without purchasing a key. The
  [commercial terms](https://rallly.co/terms-of-use) expressly preserve
  open-source rights. No paid license was purchased and no license checks were
  modified; the current workflow tests are recorded above.
- Return links use native settings only: SearXNG custom footer links,
  PrivateBin `main.info`, PairDrop's About-page custom button, Uptime Kuma's
  status-page Markdown footer, authentik's flow footer, and JupyterLite's
  built-in Help menu configuration. Spanish/English links are provided where
  multiple links are supported; PairDrop has one bilingual-titled button.
  JupyterLite opens the matching-language portal in a new tab. No upstream
  source patches, injected scripts, custom plugins or proxy rewriting were
  added for navigation. Other apps are unchanged.
- BreezeWiki has two independent blockers: `wiki.utilibre.org` returns
  Cloudflare 525 and the Caddy private endpoint also fails its TLS handshake;
  its healthy backend returns 503 on tested articles because Fandom rejects
  server-side requests. Native JSONP/browser fetching is currently disabled.
  Enabling it would expose visitors' IP addresses/requests to Fandom and load
  its scripts; this requires an explicit privacy decision. It also requires
  bounded POST support in the gateway (currently GET/HEAD-only, 1 KB bodies),
  working public HTTPS on the separate Caddy VM, and end-to-end article tests.
  Neither the mode nor the public route was enabled by this navigation change.

Fresh verified snapshots: identity `2026-10-06T03-32-46-594Z`, expanded apps
`2026-10-06T03-32-52-667Z` under their respective `/opt/utilibre/*-backups/`
directories. Restoring those pre-cleanup snapshots requires retiring the
synthetic QA identities again. Portal verification: 55 unit tests, 56 browser
tests, type checking and linting passed.

Approved account requests go privately to `admin@utilibre.org`. To send one
invitation after approval, run from the project root (replace both examples):

```sh
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml exec -T \
  -e 'UTILIBRE_INVITEE={"username":"approved-user","email":"person@example.org"}' \
  server ak shell -c 'exec(__import__("sys").stdin.read())' < deployment/identity/invite-user.py
```

Do not disable group/verified-email policies to open a tool. New client setup
is in `configure-apps.py` and `export-app-env.mjs`; existing owner credentials
must be preserved. App sessions/API keys must also be revoked when removing
access; identity-provider logout alone is not universal app logout.

## Earlier rollout checkpoints

The operator requested restoration/expansion of these applications on October
5. This replaces the earlier access-gap-only exclusion for these tools.
Public enablement is separate from image builds and private health checks.

| Application | Reviewed source | License | Host / private port |
| --- | --- | --- | --- |
| BentoPDF 2.8.8 simple | alam00000/bentopdf, f96cd4e5166f3d51393dfe9f3c440b5bb77802f1 | AGPL-3.0 | pdf.utilibre.org / 3101 |
| VERT | VERT-sh/VERT, c7b9f3921d6f8722c1dc1515799b461622777068 | AGPL-3.0 | convert.utilibre.org / 3102 |
| OmniTools 0.6.0 | iib0011/omni-tools, 922b28ce154e8f22da4a721472889717a95f7562 | MIT | tools.utilibre.org / 3103 |
| IT Tools 2024.10.22 | CorentinTh/it-tools, 5732483fc24a6e6818839060bdf3cc7d9d324b9f | GPL-3.0 | dev.utilibre.org / 3109 |
| hat.sh 2.3.6 | sh-dv/hat.sh, 540d3ccfd2a12b4ed96b78a776c764f899678b6c | MIT | hat.utilibre.org / 3110 |
| draw.io 32.0.2 | jgraph/drawio, v32.0.2 | Apache-2.0 | draw.utilibre.org / 3111 |
| Mini QR 0.33.0 | lyqht/mini-qr, fe46504853c597e44b2e39d3decb5df2184c6605 | GPL-3.0 | qr.utilibre.org / 3112 |

Pinned image digests and reproducible integration builds are in
`deployment/toolbox/compose.yaml` and its Dockerfiles. Upstream license and
source links are in `portal/src/catalog/upstreams.ts`. Sources and local
integration configuration are also published at each tool's
`/utilibre-source/` route. Preserve upstream notices and credits.

## Data flow and limits

All seven serve static applications through unprivileged nginx. User files
are processed on the user's device, with no application upload endpoint.
Only GET/HEAD are accepted. Containers use read-only roots, no capabilities,
no-new-privileges, 192 MB memory, 0.5 CPU, 64 processes and 32 MB tmpfs.
Listeners bind to the private application address; new application ports
accept ingress only from the separate Caddy VM. No existing service or SSH
firewall policy is replaced. Normal nginx access logs are off; Docker error
logs rotate at three 10 MB files. Cloudflare/edge retention is separate and
not asserted to be a fixed number of days.

Browser caches, preferences, saved drafts and downloaded output may remain
on the visitor's device. These are not anonymous browsing services.

- BentoPDF/OmniTools may fetch processing code and language data from
  jsDelivr/unpkg; BentoPDF also uses githack OCR fonts. These providers see
  download requests and network metadata, not selected input documents.
  Remote-URL import/certificate proxy access is blocked. OCR output must be
  reviewed; large jobs depend on client RAM and browser support.
- VERT has external requests, telemetry, embedded payments and remote video
  conversion disabled. Its exact FFmpeg core is bundled locally. The
  integration build patches English/Spanish processing and privacy copy to
  describe this installation; Spanish primary instructions use voseo.
- hat.sh is a static export, not an exposed legacy Next.js server. Its older
  upstream release deserves periodic client dependency/security review.
  Passwords cannot be recovered by the operator. It is not a backup service.
- draw.io uses local/device storage. Cloud integrations, remote export,
  remote URL fetching and telemetry are disabled. It is not collaborative
  storage. Its WAR is verified with the release's SHA-256 before extraction;
  Java server directories are not served.
- Mini QR disables analytics and QR history. Camera use requires browser
  permission. A QR code does not encrypt its content.
- IT Tools retains upstream credit. Inspecting JWT content does not verify
  a token's authenticity. Upstream donation links fund the developer.

## Operation and retirement

Run this independent stack with `APP_BIND_IP=10.10.1.43 docker compose -f
deployment/toolbox/compose.yaml up -d --build --wait`. Apply
`deployment/toolbox/Caddyfile.tools` on the separately managed edge, merging
existing routes without overwriting unrelated hosts. Ensure only one COEP
header survives and disable intermediary script transformation.

Do not add a public URL to runtime enablement until public HTTPS and real
operations work. Stop individual services if an update breaks functionality.
No user-file backup or migration is needed because the server stores no
input files; users must save/export their own work before closing a tool.

## Donation destination

Liberapay replaces Stripe. Set `SUPPORT_URL` only after the operator provides
the actual public Liberapay URL. Do not infer a payee from a GitHub username.
There is no embedded payment script; the visitor explicitly opens Liberapay.

## Community services — October 6 addition

Pinned images and source revisions are in `deployment/community/compose.yaml`
and `portal/src/catalog/upstreams.ts`. These are application-VM deployments;
public HTTPS enablement requires the separate edge routes and verification.

| Application | Release / license | Host / private port | Operating boundary |
| --- | --- | --- | --- |
| RSS-Bridge | 2025-08-05 / Unlicense | bridge.utilibre.org / 3120 | GitHub Trending, The Guardian, Ars Technica only; public HTTP(S) egress only; private addresses blocked; cached responses; 6 requests/minute/IP plus burst |
| ntfy | 2.28.0 / Apache-2.0 option of upstream dual licensing | notify.utilibre.org / 3121 | Public topics; 100 messages/IP/day; 4 KB/message; one-hour RAM cache; no attachments, email, telephone or iOS upstream relay; no Web Push configuration |
| Yopass | 14.10.0 / Apache-2.0 core | secret.utilibre.org / 3122 | One-time retrieval and one-hour expiry enforced; encrypted payloads at most 10 KB; no files; bounded RAM-only Valkey; gateway rate limits |
| PairDrop | 1.11.2 / GPL-3.0 | drop.utilibre.org / 3124 | WebRTC file transfer; Cloudflare STUN; no TURN relay and no WebSocket file fallback; both devices online |
| Uptime Kuma | 2.5.5 / MIT | status.utilibre.org / 3125 | Public read-only status gateway; admin only 127.0.0.1:3135; no Docker socket; 30-day monitor history |

The shared ingress firewall accepts the new private ports only from
10.10.1.3 on eth0. `rssbridge-firewall.sh` additionally blocks its container
from private/link-local destinations and the application host. A test to
10.10.1.43:4173 times out while the three admitted public feeds work. The
systemd unit re-applies the ingress, RSS and BreezeWiki rule sets after Docker restarts. Preserve this
restriction when changing the RSS network address.

Use `docker compose -f deployment/community/compose.yaml up -d --wait` for the
default five-service stack. Merge `Caddyfile.community` on the edge, retaining
its existing TLS policy. Forward an authentic client IP, trusting only
appropriate proxy networks; user-supplied forwarding headers are not evidence
of identity. The public Kuma gateway denies setup, dashboard and admin
WebSocket routes. `bootstrap-kuma.mjs` initializes the owner and status page;
its generated credentials are in the ignored, mode-0600
`secrets/uptime-kuma-admin.json`, never in the source bundle. Keep that file
private. Kuma monitors HTTP response availability, not full workflows, and
cannot independently report an outage of its own application VM.

Rallly 4.15.3 is pulled and staged under the disabled `rallly` Compose profile,
not running or advertised. The pinned source disables guest poll creation on
self-hosted instances. Real support email, SMTP/account setup and the intended
organizer/license arrangement must be resolved before enabling it. No fake
email, shared organizer login, paid license purchase or license bypass is part
of this deployment. Its empty data directory does not contain user polls.

This is bounded configuration and functional verification, not an independent
security audit. Older stable browser-app/bridge releases need ongoing
dependency review. RSS connector breakage, client resource limits, restrictive
WebRTC networks and upstream blocking remain operational limitations.

## Functional verification and remaining public-edge work

October 6 synthetic-file browser checks passed: English/Spanish OCR and a
searchable-PDF download; VERT Markdown-to-HTML conversion with the output
contents verified; OmniTools JSON import/format/download; IT Tools Base64
encode/decode; hat.sh encrypt/decrypt exact-content round trip; draw.io SVG
export with a shape; Mini QR SVG download; PairDrop two-browser file transfer;
Yopass encryption, reveal/decrypt and rejection of a second retrieval. The
Yopass round trip was subsequently repeated successfully over public HTTPS;
PairDrop's full transfer was tested through local browser test proxies.
RSS-Bridge produced entries from all three
admitted sources. ntfy publish/readback and oversized-message rejection
passed, including public ntfy publish/readback. Kuma's public gateway renders the status page and rejects its admin
routes. These are representative operations, not every upstream feature.

All seven browser-tool hosts and the five community hosts above now respond
over public HTTPS. PDF has a single COOP/COEP pair and browser
`crossOriginIsolated` is true. The portal now enables these twelve additions
alongside the four existing services (16 enabled services in total). Public
English/Spanish language handoffs were verified for supported tools; a
translation being available does not mean every upstream string is translated.
Spanish links use BentoPDF's `/es/`, OmniTools/ntfy query preferences,
draw.io's language parameter and allowlisted same-origin handoffs for
VERT, IT Tools, Yopass, PairDrop and Kuma. Unsupported interfaces stay in their
available language. No arbitrary redirect or storage-key input is accepted.
The portal's typecheck, lint, 51 unit tests and 52 end-to-end tests passed,
including first-action visibility at 375 by 812 in both languages.
SearXNG's app health is OK, but its public IPv4 path timed out from this VM;
the status monitor preserves that failure rather than claiming public uptime.

Portal rollback image: `public-utility-portal:pre-toolbox-voseo-20261006`.
The original four enabled IDs were `searxng,redlib,freshrss,privatebin`;
remove the twelve added IDs/URLs before recreating the portal with that image
if rollback is required. Do not stop or recreate the unrelated service stacks.

## Expanded applications — October 6 checkpoint

Configuration is in `deployment/expanded/compose.yaml`. Image digests are
pinned. Credentials are generated only into the ignored mode-0600
`deployment/expanded/.env` and `secrets/wakapi-admin.json`. Never include these
files, data volumes or backups in a published source archive.

| Application | Version / license | Address / app port | Current boundary |
| --- | --- | --- | --- |
| JupyterLite | 0.8.5 + Pyodide kernel 0.8.6 / BSD-3-Clause | python.utilibre.org / 3133 | Running on private app IP; real Python, CSV/pandas and chart tests passed; public HTTPS still 525 |
| Whisper Web | 81869ed62970ff4373509b6004a6c9a3f0c5b64d / MIT | transcribe.utilibre.org / 3137 | Running on private app IP; short audio transcription and text export passed; public HTTPS still 525 |
| Wakapi | 2.18.1 / MIT | wakapi.utilibre.org / 3136 | Public HTTPS owner login and authenticated summary verified, secure HttpOnly cookie, signups rejected with 403; route now reaches Wakapi correctly |
| Reactive Resume | 6.0.0 / MIT | cv.utilibre.org / 127.0.0.1:3130 | Running privately; signups/email login disabled; real owner email and recovery setup pending |
| Penpot | 2.18.2 / MPL-2.0 | design.utilibre.org / 127.0.0.1:3131 | Running privately with database/exporter; signups closed; real owner email and recovery setup pending |
| Actual Budget | 26.10.0 / MIT | budget.utilibre.org / 127.0.0.1:3132 | Running privately; OIDC/user separation not configured; do not publish shared-password setup |
| BreezeWiki | Official compiled distribution / AGPL-3.0 | wiki.utilibre.org / 3134 | Running, but tested Fandom pages return upstream-blocked 503; not advertised as usable |

Only the three ready-to-route hosts are active in
`deployment/expanded/Caddyfile.expanded`. This fragment is validated locally,
not applied by this agent to the separate Caddy VM. The existing public Wakapi
route now reaches the correct backend after its 3136 listener was deployed.
Python and transcription are included in
the portal code but remain runtime-disabled until public workflows pass.
Wakapi is an owner-only pilot, not an open registration service. Its
administrator credentials remain private; email password recovery is not
configured. To provision additional accounts later, establish an explicit
operator-managed enrollment and recovery process first.

JupyterLite runs visitors' code in their browser, not on this server. The
runtime/packages can download from jsDelivr and Python package repositories;
these third parties receive those download requests. Important files must be
downloaded: browser storage is not a backup. The Spanish route
`/es/lab/index.html?path=Empeza-aqui.ipynb` was tested from an English-language
browser. Its notebook explains CSV and chart operations using voseo.

Whisper uses the stable WebAssembly implementation rather than the
experimental WebGPU branch. Utilibre serves its model weights, tokenizer and
WASM locally. The complete short-recording test observed only same-origin
GET requests, no upload requests or third-party requests, and a successful
text download. The first tiny-model download is roughly 75 MB. Long recordings
and real-phone performance are not validated: keep the pilot wording. The UI
is primarily English; multilingual audio, including Spanish, is supported.

Whisper rebuild: extract `whisper-web-utilibre.tar.gz` into
`/opt/utilibre/expanded-src/whisper`, run `npm ci --ignore-scripts`, run
`node deployment/expanded/fetch-whisper-models.mjs` from the integration tree,
copy the `.wasm` files from `node_modules/onnxruntime-web/dist/` into
`public/wasm/`, then `npm run build`. Build `Dockerfile.whisper` with that source
directory as context. The modified source archive includes the regenerated
package lock; model revisions and SHA-256 checksums are recorded in the
downloaded `public/models/manifest.json`. The model Apache-2.0 license is
served alongside the weights. Jupyter's Dockerfile includes pinned direct
build dependencies and publishes the resolved package list.

BreezeWiki's official compiled bundle SHA-256 is
`f1b9bc650a02a4c36c09574620a513c89707a3b7a4db38daf6e2673238593688`.
Its exact source commit is not established; do not describe the binary as a
build of the separately inspected current checkout. Strict proxy mode is on,
JSONP/search suggestions are off, ingress is rate limited and egress blocks
private/link-local destinations. Do not circumvent Fandom's current rejection
or promise every wiki is reachable.

## Initial expanded-service backup and restore test

Run `node deployment/expanded/backup.mjs` as root for a consistent snapshot.
It briefly stops only the running account application containers, dumps their
PostgreSQL databases, archives file/SQLite storage and private configuration,
then restarts those applications. The resulting directory is mode 0700 and
files mode 0600 under `/opt/utilibre/expanded-backups/`.

The initial snapshot `2026-10-06T01-17-51-005Z` passed SHA-256 validation and
`verify-backup.mjs`: real PostgreSQL restores produced 29 Resume tables and
60 Penpot tables; restored Wakapi and Actual SQLite databases passed integrity
checks, including the Wakapi owner flag. The disposable restore container had
no network or production volumes and was removed afterward. No personal
documents/designs/budgets existed yet; this is not an end-user document/export
recovery test. This snapshot is on this VM, not off-site or automatically
scheduled. Arrange recurring off-site backups and account/export/deletion
rehearsals before opening account-based services to a community.

## Requested GUI completion and operator mail settings

The operator explicitly requested every missing tool in the GUI on October 6.
The portal now separates `LISTED_SERVICES` from `ENABLED_SERVICES`: listing
shows a reviewed application's description and access limitation, never an
implicit permission to launch it. The eight additions to the visible catalog
are Whisper Web, JupyterLite, Reactive Resume, Penpot, Actual Budget, Rallly,
BreezeWiki and Wakapi. Only Wakapi adds an enabled public URL in this update;
its entry explicitly says administrator-only pilot. Other entries have plain
unavailable text instead of a dead launch button. Runtime listing is a public
catalog decision, not a database, authentication or proxy change.

The operator supplied `admin@utilibre.org` for administrator ownership and
`no-reply@utilibre.org` as sender. The unauthenticated SMTP relay is
`10.10.1.20:26` (the operator's latest correction after `.28` and `.18`
refused connections). This endpoint returns SMTP 220/EHLO 250, advertises
STARTTLS and does not advertise AUTH. Its certificate is valid for
`mx.mailgt.dev`, not the IP: strict verification using `10.10.1.20` fails
with a name mismatch. A separate, mail-free STARTTLS diagnostic using
`mx.mailgt.dev` as SNI and verification name validated the public CA chain
and negotiated TLS 1.3. Confirm that hostname is the operator's intended
relay identity before configuring clients to use it; do not disable checks.
No email was sent. Settings are saved privately for the expanded stack,
and in a separate, inactive Rallly mail override; email delivery/recovery
is not enabled or verified. The pinned
Reactive Resume transport additionally requires nonempty SMTP user/password
before constructing a transport, so the no-auth relay needs a reviewed
compatibility change or an identity-provider recovery flow. Never insert fake
credentials or disable certificate checks to claim delivery works.

The GUI release passed 53 unit tests, 52 Playwright tests and 18 configuration
tests, plus type checking and linting. Public browser checks found 24 service
rows and 17 launch links in each language, including seven unavailable entries;
Wakapi's launch is explicitly an owner-only pilot, not open enrollment.
Desktop/mobile captures and the independent finish review approved this
bounded catalog extension. Existing visual identity and design tokens remain
unchanged; this is not a claim that the pending services are publicly ready.

## Liberapay activation and identity foundation

On October 6 the operator supplied the Liberapay recipient `mycelibre` and
authorized installation of the recommended identity provider. The public
profile returned HTTP 200, explicitly described Utilibre.org, and exposed a
working donation route. `SUPPORT_URL` is now
`https://liberapay.com/mycelibre/donate`; English and Spanish support links use
Liberapay's verified `en.` and `es.` hosts without changing the recipient.
The existing Donate button and optional-support explanation are enabled.
No payment widgets, scripts, preferential access or donation tracking were
added. Live desktop/mobile checks found no horizontal overflow and no
external browser requests before leaving Utilibre. The updated portal passed
55 unit tests, 54 browser tests, type checking, linting and production build.

`deployment/identity/compose.yaml` installs authentik 2026.8.3, the current
stable upstream release at review, pinned to
`sha256:ab9b4e8cc4ab3f8d1198d2db6aeea66bafea1963b3f2843589e0d163f97d9849`.
The [upstream license](https://github.com/goauthentik/authentik/blob/version/2026.8.3/LICENSE)
licenses the core under MIT; the official image also includes separately
licensed enterprise modules. No enterprise license, trial or paid feature is
activated or required for this deployment. This is shared login infrastructure,
not an additional public utility or a reason to require accounts for anonymous
tools. Upstream branding and attribution remain visible.

The database, worker and server are isolated in a separate Compose project.
Only the server publishes a port, bound to `10.10.1.43:3138`; the persistent
application-port firewall admits that listener only from the Caddy VM at
`10.10.1.3`. Authentik trusts forwarded headers only from that proxy address.
All containers run as non-root with read-only root filesystems, dropped
capabilities, bounded memory/CPU/process counts and rotating container logs.
There is no Docker socket mount or embedded proxy outpost. PostgreSQL has no
published port. Startup analytics, error reporting and update-check outbound
contacts are disabled; operators must track security updates explicitly.
Avatars use local initials rather than Gravatar. New authentication events
have a 30-day retention setting; container logs use size-based rotation, not
that retention period. UI impersonation is disabled; operators still have
technical access to the host and database.

The owner is `akadmin`, with `admin@utilibre.org` as the account email.
Generated credentials are in ignored, mode-0600 `secrets/authentik-admin.json`;
deployment secrets are in mode-0600 `deployment/identity/.env`. Neither belongs
in the source archive. Bootstrap uses a Django password hash, and the bootstrap
override has been removed from the running worker. Public enrollment and
account-request flows remain closed. First login requires the owner to enroll
their own TOTP authenticator; the deployment never submits an enrollment on
their behalf. The local browser check accepts the owner password and reaches
MFA setup without external browser connections. It does not establish public
HTTPS or complete the owner's MFA enrollment.

The SMTP endpoint remains `10.10.1.20:26`, with STARTTLS required and no SMTP
credentials. Its IP does not match the certificate; the user has not yet
confirmed `mx.mailgt.dev` as the intended identity. Certificate verification
has not been weakened, no message has been sent, and email recovery remains
disabled. Sender configuration is `no-reply@utilibre.org`.

The separate Caddy VM needs `deployment/identity/Caddyfile.identity`. The new
configuration passed Caddy validation; the public hostname still returned
Cloudflare HTTP 525 at this handoff checkpoint. Do not claim public login or
SSO integration based on local readiness. No application/provider clients
have been created yet: each account-based service needs its own reviewed OIDC
integration and user-access separation test after the public issuer is ready.

Operator commands (from the project root):

```sh
node deployment/identity/init-private.mjs
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml -f deployment/identity/compose.bootstrap.yaml up -d
# Wait for first-start migrations and default blueprints before configuring.
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml exec -T worker ak shell -c "exec(open('/integration/configure.py').read())"
docker compose --env-file deployment/identity/.env -f deployment/identity/compose.yaml up -d --no-deps worker
node deployment/identity/check-login.mjs
node deployment/identity/backup.mjs
node deployment/identity/verify-backup.mjs /opt/utilibre/identity-backups/EXACT-SNAPSHOT-DIRECTORY
```

The backup script briefly stops only this identity server and worker, dumps
PostgreSQL and archives application data plus private configuration, then
restarts previously running services. Snapshots are private and on this VM,
not automatically scheduled or off-site. The verifier restores the dump into
a disposable, networkless database with no production volumes and checks the
owner record; it checks archive integrity but does not rehearse every possible
future provider, signing-key or user-file recovery. Establish recurring
off-site backup and full recovery procedures before community enrollment.

The initial snapshot at
`/opt/utilibre/identity-backups/2026-10-06T02-39-26-051Z` passed checksum and
archive checks and was restored successfully into the networkless test
database; its administrator record matched. The temporary restore container
was removed, and the production identity server, worker and database were
healthy afterward. The owner has no enrolled MFA device yet and no application
clients exist, as expected for this installation checkpoint.
