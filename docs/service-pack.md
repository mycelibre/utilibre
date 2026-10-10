# Service-pack implementation — 7–9 October 2026

## Security-gate follow-up — October 9, 2026

These are completed checks and bounded changes, not a claim that every original
service-pack dependency is resolved. No account access, retention or visitor
logging policy was relaxed.

### Galene: screen-stop/rejoin fix deployed and verified

At 17:26 UTC, production retained native image `utilibre-galene:1.2.1-p2` and
received a configuration-only repair: container-local resolution of the owned
TURN hostname, plus exact host-input access to its UDP 3478/TLS 5349 listeners.
There were zero established signaling connections before the recreation. No
public DNS, edge/Caddy change, peer allowlist, quota or account change was needed.
The existing systemd firewall hook reapplies the new exceptions after startup.

The reproducer established that screen capture started but native stop signaling
stalled with the deployed ICE settings; an empty-ICE isolated control passed.
A synthetic-only lab stack capture identified a pending TURN TCP dial holding
Pion's candidate-gathering shutdown. Container-local relay resolution fixed the
same lab case. A tested Pion dependency-upgrade candidate did **not** solve it
and was rolled back before the configuration fix; it is not the deployed image.
No custom room protocol or connection-close patch was introduced.

The public HTTPS lifecycle check completed at **17:29 UTC**: two independent
Chromium contexts exchanged audio/video, native screen-share start and stop
passed, a guest rejoined, media continued for 180 seconds, and leaving the last
moderator disconnected the guest. No unexpected signaling closure or outside
browser HTTP origin was observed. Separate same-host forced-UDP-relay checks
selected `relay` / `udp` / relay-only policy in both clients and decoded media.
The expanded security check passed TLS hostname/trust verification from the SFU,
denial of a responsive unrelated host TCP listener, expired/wrong/anonymous TURN
authentication checks, reservation checks and peer/port isolation.

This does not establish real-phone screen sharing, external restrictive-network
reconnection, long-call reliability or a resolution of the two historical
external 1006 closures. Prior external UDP/TCP/TLS evidence remains separate.
One during-test sample was Galene 29.44 MiB / 2.81% CPU and coturn 31.07 MiB /
0.01% CPU; it is not a capacity benchmark. Configured resource ceilings are
unchanged. See [exact implementation and rollback](../deployment/pack/turn/README.md).

Only the three owned, synthetic loopback test containers were stopped/removed
after testing. Candidate sources, reports, images and mounted example files were
preserved. User containers/data were not deleted. No broad repository commit was
created because the worktree includes substantial unrelated staged changes.

### Wallabag: repaired backend deployed; public Caddy/TLS route still pending

October 9 follow-up, through 19:34 UTC: the pinned newer upstream candidate now
has a reproducible **two-file OTPHP 10.0.3 security backport**, taken from the
input-validation fixes in upstream 11.4.3. It retains Scheb 5's native OTP API
and MFA; it does not alias package versions or ignore advisories. Native Composer
still reports the two version-based findings. The hash-gated backport check
reports **two locally mitigated, zero unexpected**, plus 16 abandoned packages.
This is a locally maintained repair, not a new supported Wallabag release.

Artifacts live in `deployment/pack/wallabag/`: the patch, safe installer,
14-case OTP regression check, actual MFA/CSRF HTTP test, dependency gate, and
loopback-only browser rehearsal. Sources remain separate from the untouched
stable checkout at `/opt/utilibre/src/wallabag-repair-20261009`. The earlier review
used synthetic state only. The final PHP-FPM runtime uses Alpine 3.24 / PHP 8.4.26,
without development dependencies, build tools or a development server. Its new
production database has one native administrator owned by `admin@utilibre.org`.
Registration remains closed; credentials are root-private, never printed.

The app patch enables native MFA CSRF protection, verifies outbound TLS, removes
the Matomo rendering hook and Sentry bundle, disables production request/error
logging, removes Codecov/build notifier integration, pins Annotator's source
revision, and updates the source-map dependency. Native build and both JS/SCSS
linters pass. The browser-runtime Yarn audit is clean; full build tooling still
reports **GHSA-vfj7-8cjw-p6xm in braces 3.0.3**, reached through Stylelint, with
no published fixed release. This build-only parser is not shipped as a browser
or PHP runtime and is not exposed to visitor inputs. No full clean-audit claim.

Verified: 14 OTP/security cases; 37 native functional tests / 175 assertions for
login, MFA setup, article read/edit/delete, cross-account denial and imports/
exports; one additional full MFA/CSRF test / nine assertions. Linux Chromium
at desktop and 390px emulation passed real password+OTP login, private reading,
JSON export, denial to another account and signed-out visitors, and blocked
remote image/frame loads. No outside browser HTTP response, missing JS/CSS/font
or script exception was observed. Actual screenshots were inspected.
Private evidence: `/tmp/utilibre-wallabag-browser-WcOWoN/report.json`,
`/tmp/utilibre-wallabag-production-3V33Ng/report.json` and
`/opt/utilibre/reports/wallabag-repair-dependencies-20261009.json`.

The final production-image check at **19:30 UTC** passed password+OTP login,
account A/B and anonymous denial, JSON/TXT/PDF/EPUB exports, actual saving of the
owned Utilibre homepage, text-first media blocking, secure/HttpOnly cookies with
the HTTPS edge header, and the aggregate fetch limiter. Desktop and 390px Chromium
emulation were checked; the settled mobile layout was visually inspected. The
impeccable hardening workflow kept the native form/layout; only the missing native
MFA CSRF input and the supported custom CSS hook were needed, not a redesign.

The native fetcher now uses the existing pinned Squid package behind a scoped
firewall: 19 checks passed against private/reserved IPv4, alternate loopback forms,
IPv6 literals, wrong ports and direct bypass attempts. The owned public HTTPS page
was fetched successfully. A 92 MB owned model URL was rejected from its announced
size, with **zero body bytes downloaded**. HTTPS verification remains enabled.
No controlled public redirect-to-internal fixture was exercised; do not claim
comprehensive SSRF coverage. Both proxy destination checks and network restrictions
apply in addition to Graby's validation. The only private outbound exception is
the existing mail relay `10.10.1.20:26`; its SMTP greeting passed, not email delivery.

An encrypted SQLite snapshot was restored into a **networkless disposable runtime**:
native password/MFA login, private article access and JSON export passed. The live
synthetic accounts/articles were then deleted; the sole administrator and empty
library remain. SQLite snapshots now participate in the existing daily encrypted
pack-backup job. No prior retention was shortened; deleted content can remain in
older backups, and off-host recovery is not established by this test.

`utilibre-wallabag.service` is enabled and starts the scoped firewall before the
three capped, non-root containers. The backend answers **200 at
`10.10.1.43:3177/login`**; port 3177 permits the existing Caddy VM only. The auxiliary
33177 listener is loopback-only. **`https://wallabag.utilibre.org` still returns
Cloudflare 525**, so this is not a completed public launch or catalogue addition.
Apply the Wallabag block in `deployment/pack/Caddyfile.pack` on the separate Caddy
VM, then verify the real HTTPS login/assets/cookies and only then add the account
service to the portal. No new listing submission or account registration occurred.

Versions, commands, limits, bilingual starter copy and rollback are in
[`deployment/pack/wallabag/README.md`](../deployment/pack/wallabag/README.md).

#### Earlier baseline, retained to distinguish the repaired candidate

The latest official release remains [2.6.14](https://github.com/wallabag/wallabag/releases/tag/2.6.14).
The cached official image digest is pinned in
`deployment/pack/check-wallabag-release.mjs`. Its fresh native Composer audit
reports **63 advisories across 19 runtime packages**, superseding the older
60-advisory observation below. The read-only check does not start the application,
mount production data or execute Composer scripts. Private detail:
`/opt/utilibre/reports/wallabag-security-20261009.json`.

The application still pins Symfony 4.4/Guzzle 5 dependencies; a newer PHP Docker
base alone does not repair them. An upstream-supported application dependency
update (or separately approved replacement) is required before the remaining
privacy, account-isolation and restore gates. No Wallabag service was launched
on 3177 and no vulnerable image was promoted.

The newer upstream branch was also checked at exact commit
`496db5b457755bbf7d46f314716c8aad1b80fcfb` (October 7). It upgrades to Symfony
5.4 and removes Guzzle 5. Native `composer audit --locked --no-dev` now finds
**two advisories in one runtime package**, OTPHP 10.0.3, plus 16 abandoned
packages. This is a separate unreleased candidate, not a repair of 2.6.14.
Private manifest/report: `/opt/utilibre/wallabag-upstream-review-pjzrrb/`.

Both OTPHP advisories are fixed in 11.4.3, but the pinned Scheb 5.13.2 MFA bundle
only accepts OTPHP 9/10. Scheb 6 accepts OTPHP 11 but requires Symfony's newer
authenticator system; this Wallabag revision still uses legacy security
configuration. The [official migration](https://github.com/scheb/2fa/blob/6.x/UPGRADE.md)
is not a safe one-line dependency override. No MFA removal, forced incompatible
dependency, audit suppression or custom authentication fork was applied. These
are dependency findings, not proof that Wallabag exposes every vulnerable code
path. A compatible maintained upstream fix remains necessary for this release
gate; privacy/isolation/restore checks would still follow it.
Sources: [mass assignment](https://github.com/Spomky-Labs/otphp/security/advisories/GHSA-2jx3-65f3-xr8r),
[unbounded digits](https://github.com/Spomky-Labs/otphp/security/advisories/GHSA-g7m4-839x-ch6v).

### Whisper: repaired direct-URL pilot, still hidden from the catalogue

#### Optional noise reduction: p7, October 9

The owner confirms louder recording in p6 but reports humming. Its source is not
established from that report. P7 offers the native browser `noiseSuppression`
constraint through **Reduce background noise / Reducir ruido de fondo**. It
starts **off**, preserving p6's working capture settings. Automatic gain remains
on, echo cancellation stays off, and no extra amplifier, codec, filter algorithm,
model or dependency was added. The bilingual hint explains how to turn it off if
speech becomes quiet/choppy. The interface-hardening pass retains the native app,
keyboard operation, a disabled control during recording/permission and a clear
unsupported-browser fallback. The choice is dialog-local, not persisted or sent.

`check-whisper-noise.mjs` uses the existing fictional Kokoro Spanish recording
(SHA256 `09ab385affe73e28e871357f5acf710d02d07606e3262ebed43ccd79e5e989ab`),
attenuated to 15% and mixed with artificial 60/120 Hz hum. Native Chromium
recording with the filter lowered the hum-only RMS from 0.005351 to 0.001495;
the speech-window RMS rose from 0.017074 to 0.051261, without clipping. These are
one synthetic fixture's measurements, not a hardware or general noise-removal
guarantee. Actual Small transcription/TXT export retained “esta es una prueba
ficticia” in both modes, but both misheard “Hola” as “Gola”. The initial exact-word
gate therefore failed; the full-word result remains explicitly false in the
report. Do not describe this as perfect Spanish recognition or a user's fix.

Lint/build and 17 regressions pass. Desktop/390px native-input checks pass gain,
noise on/off, keyboard toggle, device selection, meter, channel-cancellation and
silence guards. Stop/Close/late-permission/denied-permission checks pass. The
optional-API fallback passes; no outside browser HTTP request or audio upload was
observed. The matching `whisper-noise.patch` applies after source, repair,
microphone and gain patches. Source: `/opt/utilibre/expanded-src/whisper-p7`.
Reviewed native API: [MDN noise suppression](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/noiseSuppression),
October 9. Actual support/quality varies by browser and microphone.

Release: `utilibre-whisper:81869ed-p7`, same direct-pilot URL/backend, same security
policy and local models. JS `index-D99aNWSL.js`, CSS `index-STncuLmp.css`; inference
worker unchanged. The catalogue remains hidden and no Caddy change is needed.
Matching source is published; the p6 archive is retained under
`/opt/utilibre/source-update-whisper-z4w3Tw`. Rollback: select only the prior
`utilibre-whisper:81869ed-p6` image, recreate Whisper and restore that archive.
Sources/images/model files are preserved. Noise comparison evidence:
`/tmp/utilibre-whisper-noise-NDSKix/report.json`. Owner's Windows/Opera hum and
voice quality with the optional switch still need confirmation.

Post-release public HTTPS checks passed for both native filter modes, off-by-default
state, keyboard toggle, microphone lifecycle, unsupported-filter capture and hum
reduction. Desktop and 390px layouts were inspected without overflow. Sanitized
reports are retained under `/opt/utilibre/reports/whisper-noise-20261009/`; the
public noise comparison did not repeat model inference. The owned loopback review
container was removed; no persistent user data or prior images were deleted.

#### Recording-volume follow-up: p6, October 9

The owner reports that p5 works much better in Windows/Opera, but playback is too
quiet. A native Chromium check reproduces a settings regression: the original
`audio: true` request enables automatic gain control; p5's explicit
`echoCancellation: false` without a gain preference disables it. P6 adds only
`autoGainControl: true` to the native capture request. Echo cancellation and noise
suppression remain off, preserving the other recording fixes. No custom gain
processor, volume multiplier, inference change or dependency was introduced.

Source: `/opt/utilibre/expanded-src/whisper-p6`; apply `whisper-gain.patch` after
source, repair and microphone patches. The native flag is best-effort for browsers
that support it; it is not a guaranteed microphone level on every device. The
browser behavior is documented in [Chromium's constraint selection](https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/modules/mediastream/media_stream_constraints_util_audio.cc)
and [MDN's automatic-gain constraint](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/autoGainControl),
checked October 9. User audio, device IDs and level measurements are not uploaded
or retained; file-upload decoding, silence and repetition guards are unchanged.

Build, lint and all 17 audio/worker tests passed. The quiet synthetic native
capture comparison measured RMS 0.004508 without gain and 0.007294 with gain
(+4.18 dB), no clipping in that fixture, and released tracks. This is a Linux
Chromium regression check, **not** a promised volume increase on Windows/Opera
or a speech-quality benchmark. The p6 private desktop/390px checks passed actual
accepted gain/echo/noise settings, device selection, meter movement, recorded
signal, stereo-cancellation recovery, quiet input, silence rejection and cleanup.
No audio POST or outside browser HTTP origin was observed.

The normal scoped Compose release uses `utilibre-whisper:81869ed-p6` on the same
3137 backend and `https://transcribe.utilibre.org`; no Caddy changes. The app's
new JS is `index-B9ShN6qY.js`; CSS and inference worker are unchanged. Matching
source is published, with the prior archive retained at
`/opt/utilibre/source-update-whisper-DOvqMN`. The catalogue stays hidden pending
the owner's pilot feedback. For rollback, set only Whisper's image back to
`utilibre-whisper:81869ed-p5`, recreate only that service, and restore its matching
source archive. Both source trees, images and existing model mounts are retained.

Focused reproduction: `node deployment/expanded/check-whisper-gain.mjs`.
Evidence: `/tmp/utilibre-whisper-gain-HpHA4T/report.json` and private rehearsal
`/tmp/utilibre-whisper-microphone-GWs2LT/report.json`. Real microphone volume after
this correction still needs the owner's confirmation.

Post-release public HTTPS checks passed at desktop and 390px with actual gain
enabled and echo/noise suppression disabled. Separate native lifecycle checks
passed Stop, Close, late permission, denied permission and invalid-file recovery,
with no uploads or external browser requests. Sanitized JSON evidence is retained
in `/opt/utilibre/reports/whisper-gain-20261009/`. Only the owned loopback review
container was removed after testing; no user data or existing images were deleted.

#### Microphone follow-up: p5, October 9

The owner reports that the saved recording itself is silent/nearly silent in
Windows/Opera. This points to capture/input selection before inference; the exact
device cause is not established. Separately, a three-second synthetic stereo WAV
reproduced a real p4 bug on the public site: opposite-phase audible channels were
summed to RMS `0.0000037252`, below the existing silence guard.

`utilibre-whisper:81869ed-p5` is now deployed (image ID
`sha256:af913a57f7a34eef73677c365f282bb4ef9bbf567e248acee13870e76ea7f871`).
The small `whisper-microphone.patch`, applied after source+repair patches, keeps
ordinary mono/stereo mixing but falls back to the stronger channel when severe
phase cancellation would erase the signal. Multichannel inputs are no longer
silently reduced to their first channel. The silence threshold and runaway-output
checks remain in place; there is no new speech detector or inference engine.

The native recorder now has an ephemeral microphone selector, actual input label,
and Web Audio input meter. It lists permitted microphones only after explicit
microphone permission; device IDs, levels and audio are neither saved as settings
nor transmitted. Native capture requests disable echo cancellation and noise
suppression for isolated recording. No claim is made that every driver honors
those constraints. Stop, dismissal, late permission and unexpected stopping
release tracks/meters. The hardening pass preserved the upstream interface,
made the recorded-clip handoff explicit as **Use recording / Usar grabación**,
and improved record-button contrast and actionable bilingual error copy.

Verification: build/lint and 17 regression tests pass; full npm audit reports zero
known advisories, with no new dependencies. The public p4 cancellation reproducer
and repaired browser-input tests are in `check-whisper-microphone.mjs`. Linux
Chromium with simulated microphone WAV input passed capture → Stop → Use recording
→ native decoding → Spanish Small transcription → TXT export in the private
rehearsal. The native browser decoder converted the corpus's G.711 test fixture
to PCM for Chromium's fake-device harness; it is not an application codec patch.
Desktop and 390px runs passed microphone selection, meter movement, quiet input,
actual-silence rejection and track release; no browser audio POSTs or outside
HTTP origins were observed. Real Windows/Opera microphones remain **unverified**.

Private rehearsal evidence: `/tmp/utilibre-whisper-microphone-QbToRn/report.json`;
baseline reproduction: `/tmp/utilibre-whisper-microphone-bCYspy/report.json`.
The production HTML now names `index-DX5LlyOt.js` / `index-M5VzgbGZ.css`.
Sources are `/opt/utilibre/expanded-src/whisper-p5`, reusing the unchanged reviewed
dependency lock. The corresponding source archive is published; prior archive
preserved in `/opt/utilibre/source-update-whisper-pwUEx1`. No Caddy, model,
catalogue, account or retention changes were made. The prior p4 image is retained;
rollback changes only the Whisper image to `utilibre-whisper:81869ed-p4` and
recreates that service. `compose.whisper-withdrawn.yaml` remains the full-withdrawal
option. Do not mark the user's hardware problem resolved until their input meter
and recorded playback confirm sound.

API evidence checked against these native browser mechanisms on October 9:
[device enumeration](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/enumerateDevices),
[meter samples](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatTimeDomainData).
These references describe browser behavior, not tests of the owner's device.

#### Earlier p4 repair and preserved baseline

The October 9 repair is `utilibre-whisper:81869ed-p4`, built from upstream
`81869ed62970ff4373509b6004a6c9a3f0c5b64d` plus the existing
`whisper-source.patch` and new `whisper-repair.patch`. It retains Transformers.js
2.17.2, the same pinned local multilingual models and browser-only inference.
It does **not** establish that the owner's Windows/Opera accuracy problem is
resolved. Keep it out of the catalogue until the owner approves its results.

Changes: Vite 6.4.3, Tailwind/PostCSS 4.3.3, TypeScript 5.9.3 and compatible
ESLint configuration; native style compatibility fixes; typed-array annotations;
removal of unused URL-import/Axios code and remote demo URLs. Formatting and the
worker-test import reader were updated without replacing inference or recording.
ESLint 9.39.5 is retained for React-plugin compatibility and is out of upstream
support; it is not shipped in the static runtime. Tailwind 4's documented browser
baseline is [Chrome 111+, Safari 16.4+, Firefox 128+](https://tailwindcss.com/docs/upgrade-guide).

The patch applies/reverses exactly in a disposable Git index. A fresh source
checkout at `/opt/utilibre/expanded-src/whisper-p4` passed `npm ci --ignore-scripts`,
lint, production build, all **13** audio/worker regressions and full `npm audit`
with **zero known findings**, including build dependencies. No advisory was
ignored. Its generated JS/CSS hashes exactly match the reviewed private candidate.
ONNX's existing build-time `eval` warning remains; the strict browser policy does
not permit ordinary `unsafe-eval`, and the tested inference paths worked under it.

Loopback browser checks passed real English and Spanish sample transcription/TXT
export, failed-model-download retry, invalid files, microphone Stop/Close/late
permission cleanup, digital silence before any model download, and injected
repetition/empty-output error recovery. The injections test error handling, not
general speech accuracy. Zero outside browser HTTP origins and zero audio uploads
were observed. The runner separately downloads hash-checked public test samples.
Desktop and 390-pixel screenshots were inspected. These are Linux Chromium and
mobile emulation, not physical phones or Windows/Opera. Private artifacts:
`/tmp/utilibre-whisper-check-KOOMFO`, `/tmp/utilibre-whisper-quality-lBwicL`.

All 39 existing model files match their published SHA256 manifest; installed WASM
bytes match the locked runtime package. Small totals **253,463,874 bytes**, Tiny
45,210,682 and Tiny.en 44,500,937, plus runtime downloads. No model was replaced
or automatically fetched for visitors. The ~1.06 MB application build is served
by non-root read-only Nginx, with 192 MiB RAM/0.5 CPU/32-process ceilings and
no container/access/error request logging. Inference consumes the visitor's
resources, not a server inference queue. These limits are not a capacity claim.

Deployment uses the existing `transcribe.utilibre.org` → `10.10.1.43:3137` route;
**no Caddy change is needed**. The pilot sends `noindex, nofollow` and keeps the
same-origin CSP and `no-referrer` policy. Source publishing preserves the prior
archive in `/opt/utilibre/source-update-whisper-5QSjBz/`; existing source/model
directories, browser documents and other services are untouched.

Rebuild from the exact source/lock with `npm ci --ignore-scripts`, `npm run lint`,
`npm run build`, `node --test tests/*.test.mjs` and `npm audit`. Build the existing
`deployment/expanded/Dockerfile.whisper` as `utilibre-whisper:81869ed-p4`; retain
the reviewed read-only model/WASM mounts. Publish the corresponding archive using
`node deployment/expanded/publish-whisper-source.mjs`. Recreate only Whisper:

```sh
docker compose -f deployment/expanded/compose.yaml up -d --no-deps --pull never whisper
node deployment/expanded/check-whisper.mjs
node deployment/expanded/check-whisper-quality.mjs
```

Rollback restores the former 410 notice, not the older vulnerable app:

```sh
docker compose -f deployment/expanded/compose.yaml \
  -f deployment/expanded/compose.whisper-withdrawn.yaml up -d --no-deps --pull never whisper
```

Both Compose configurations validate. This rollback preserves models/source and
does not delete user data. Keep the rollback override in subsequent deployments
while withdrawn.

**Public acceptance, October 9, completed by 18:36 UTC:** both browser scripts
passed again through `https://transcribe.utilibre.org`, including actual EN/ES
transcription/TXT, model-failure recovery and microphone lifecycle. The container
is healthy; homepage and matching source archive return 200; CSP, `no-referrer`
and `noindex` headers are present; POST returns 405. No outside browser HTTP
request or audio upload was observed. Settled recording-dialog screenshots
passed the final desktop/mobile inspection. Artifacts:
`/tmp/utilibre-whisper-check-kqyLot` and `/tmp/utilibre-whisper-quality-TbSbJr`.
Deployed image ID:
`sha256:81533ff7656c36e1bc592a118dd4c2bb78edbf65f224086f96267e93edbd9cfa`.
An idle sample was 3.926 MiB/0% CPU; no throughput or concurrency claim follows.
The loopback preview was stopped after acceptance, with its source and rollback
artifacts retained. No other application was restarted, no Caddy change or portal
build was made, and no user data was deleted. The repository's unrelated staged
work was preserved; this repair has not been committed or pushed.

#### Superseded private candidate (retained for comparison)

The isolated candidate `/opt/utilibre/whisper-hardening-WlGz7K` upgrades Vite to
6.4.3, its React plugin to 4.7.0, Tailwind to 3.4.19 and the selector parser to
7.1.6, with a regenerated lockfile and supported non-force transitive fixes.
`deployment/expanded/whisper-hardening-candidate.patch` preserves the exact
package/lock changes against the existing locally patched source at upstream
`81869ed62970ff4373509b6004a6c9a3f0c5b64d`. `git apply --check` passes there.
Apply only to a separate source copy; this patch is **not a public release**.

The production build and all 13 existing audio regressions pass. Runtime
`npm audit --omit=dev` reports zero advisories, but the full build dependency
audit still reports 12 high findings through the unpatched `braces` stack-depth
advisory. Do not suppress this finding or call the whole build clean. Fixing it
requires a further supported dependency review, not an automatic force upgrade.

Both installed browser-check scripts passed against loopback port 3347:
`check-whisper.mjs` covered English transcription/TXT, failed model-download
retry, invalid files and microphone shutdown; `check-whisper-quality.mjs`
covered actual Spanish fixture/TXT anchors, digital silence before any model
download and explicitly injected repetition/empty-output recovery. The latter
injections test error handling, not the model's ability to detect every failure.
The browser requests stayed on the local application origin and no audio upload
was observed. The test harness separately downloaded public speech fixtures;
that is not an application request.

These were Linux Chromium and mobile viewport emulation, **not Windows/Opera,
real phones or the owner's failing three-holas recording**. Public Whisper
continues to serve the existing 410 withdrawal notice. No model, inference
service or production source was replaced. Private screenshots remain under
`/tmp/utilibre-whisper-check-9QqqfN` and `/tmp/utilibre-whisper-quality-axj2Ev`.

### Provider settings

The corrected read-only audit now reads zone settings and all 14 Web Analytics
site records. Utilibre's Web Analytics ruleset and NEL are disabled. The stored
auto-install preference is true but its ruleset is disabled; these are distinct.
Logpull is unavailable on the verified Free Website plan. The owner reports
Logpush is not used; no write permission is being requested just to list jobs.

The initial narrowly scoped disable attempt returned HTTP 403. After the owner's
dashboard correction, the **18:06:47 UTC GET-only check** verified the Skip rule
remains enabled with `logging.enabled=false`; every other definition field,
rule count and ordering matched the private pre-change snapshot. No further
dashboard correction is pending for this toggle. Separate Caddy runtime logging and
provider internal operational/security retention remain unverified. See
[the current configuration evidence](privacy.md#current-configuration-evidence--9-october).

### Disk and owner-confirmed VM backup

A bounded BuildKit cleanup reclaimed **5.917 GB** of regenerable build cache,
raising measured free space from 5.23 to 10.66 GiB. Docker image/container
inventories were unchanged; no volume, source, backup or user document was
deleted. The new dry-run-first helper is `scripts/reclaim-build-cache.mjs`.
Root remains 92% used and below the existing 15 GiB warning threshold. The
130 GiB virtual disk is fully partitioned: durable expansion requires growing
that disk at the hypervisor before guest filesystem expansion is possible.
No host storage or retention policy was changed.

The owner confirmed a completed VM backup and named Storage Box. Do not treat
that confirmation as a tested off-host restore or create a duplicate backup
setup. The latest application archive passed the bounded native recovery check;
its exact scope and remaining whole-VM dependency are in [backups](backups.md).

### Current closeout and exact dependencies

| Work item | Completed / current state | Remaining dependency |
| --- | --- | --- |
| Disk | 5.917 GB regenerable cache reclaimed; service images/data preserved | Hypervisor disk growth; guest has no unallocated capacity. No provider purchase made. |
| Recovery | Owner confirms VM backup; latest encrypted application generation passed native restore checks | Inspect the existing Storage Box backup location, included disks and recovery-key/restore process; whole-VM restore is not demonstrated. |
| Edge privacy | Web Analytics, NEL and Skip-rule matching-request logging disabled; Skip rule remains enabled, other fields/order unchanged; no visitor data fetched | Run the [sanitized Caddy configuration check](privacy.md#separate-caddy-vm) locally on the separate edge. Provider internal retention remains unverified. |
| Wallabag / Whisper | Whisper p4 direct-URL pilot restored. Wallabag repaired runtime passes MFA, reading/export, isolation, egress and native restore; backend deployed at 3177. | Wallabag public Caddy/TLS route returns 525; then public verification/catalogue release. Whisper's Windows/Opera transcript quality remains unverified. |
| Readers | BreezeWiki tabs fix deployed; media failures separated from working metadata | Provider-permitted working media responses for BreezeWiki/Rimgo/Dumb; LibreMDB has a separate unresolved public-use condition. No visitor-direct or third-party-proxy shortcut. |
| FMD / Galene devices | Prior scoped browser/API and synthetic Galene lifecycle checks retained | An explicitly authorized Android test device for FMD and actual phone/restrictive-network Galene checks; desktop emulation is not device coverage. |
| Handoff | Maintenance helpers and eight tests checkpointed as `13059f1`; scoped docs updated here | Docs also contain earlier uncommitted work, deliberately left intact rather than swept into the maintenance commit. Nothing pushed; no portal release required for these operator-only changes. |

The only production mutation in the **earlier maintenance-helper closeout** was deletion of
rebuildable cache. No application restart, access/retention change, Caddy deploy,
new service, provider purchase or backup deletion occurred in that earlier step. The attempted WAF
logging change was rejected. Rolling back the helpers means removing their use;
they install no timer. Normal builds regenerate removed cache. Previous Galene
and reader production corrections above retain their own separate rollback notes.
The later Whisper pilot release is recorded separately above.

## Previous checkpoint — October 8, 2026, relay and readiness review

Galene `1.2.1-p2` and its authenticated coturn relay are live. Four external
Chromium clients passed audio/video checks over UDP, TCP and TLS using the
deployed default settings. The native client defaults Simulcast to off; room
capacity remains four including the moderator. Certificate issuance and renewal
were tested. No real-phone, screen-sharing or long-call claim follows.
See [relay operations](../deployment/pack/turn/README.md).
The later [simultaneous-meeting report](capacity-2026-10-08.md#simultaneous-four-person-meetings--october-8-late-evening)
records eight four-person UDP meetings for two minutes and eight TLS meetings for
five minutes, with the actual adapted video resolution and two earlier unresolved
signaling disconnects. Current ceilings are Galene 2 CPUs/256 MiB and TURN
1 CPU/128 MiB, with 256 relay reservations. Start with at most four provisioned
meetings; the public deployment still has only one native group. These current
limits supersede the historical ranges and quotas recorded below.

Portal image `public-utility-portal:0.1.0-readiness-20261008` publishes the reviewed
English/Spanish access and privacy copy. Account requests are visible beside
sign-in and distinguish native application accounts from shared Utilibre login. See [account access](account-access.md),
[source-patch review](source-patches.md), [privacy](privacy.md) and the current
[backup/restore matrix](backups.md). These checkpoints supersede earlier entries
that describe no TURN relay or unfinished source publication.


This is the active implementation record, not a launch announcement. Privacy and
zero visitor tracking are release gates. Existing documents, routes, access rules
and account retention remain unchanged unless a change is explicitly recorded.

## Production release — 8 October 2026

### Galene connectivity repair and FMD listing — 8 October, 17:39 UTC

Galene now discovers its public address using Cloudflare STUN. The previous
empty ICE configuration and blanket container egress denial prevented external
media. An intermediate single-port configuration also failed discovery: this
Galene/Pion build opened its STUN socket on an unrelated ephemeral port. Native
`-udp-range 47800-47927` now constrains both media and discovery sockets.
The pack firewall allows only that source range to public UDP peers on ports
1024–65535, denies new private/reserved-address connections and other egress,
and preserves edge-only HTTP. Existing NAT mappings carry replies; no public
UDP forwarding, DNS change, third-party TURN service or new relay was enabled.
The existing systemd pack firewall hook reapplies these rules after Docker starts.

[External media check 37818200472](https://github.com/mycelibre/utilibre/actions/runs/37818200472)
passed from GitHub's runner: both synthetic Chromium clients received audio
(4,351 / 6,003 bytes) and decoded video (21 / 38 frames), using server-reflexive
ICE candidates at both ends. The disposable two-client room had presentation-only
users, no moderator credentials, no recording and a timed cleanup; it was removed
after the check. This verifies the tested external path, not every phone/network.
Native moderator invitations, guest permissions, chat, four-client rejection and
disconnect-on-last-moderator-exit also passed on the VM. Positive/negative network
checks verified allowed STUN, denied out-of-range UDP and denied access to a
temporary, otherwise-responsive private-host echo socket.

Galene and FMD now belong in Accounts & sign-in rather than Pilots. Galene's launch
opens `/group/community/` directly; its bilingual guide discloses STUN metadata,
the four-person invitation requirement and absent TURN fallback. FMD remains
invitation-only at the operator's request to list it despite pending real-device
testing. Fresh public API checks passed registration protection, opaque-data
roundtrip, account separation and synthetic-account deletion. No Android GPS,
push delivery or client cryptography test is claimed.

Portal image: `public-utility-portal:0.1.0-galene-fmd-20261008-p2`; previous image:
`public-utility-portal:0.1.0-search-fix-20261008`. Validation: 27 discovery/FOSS
tests, typecheck, scoped lint, production build and six desktop/mobile guide tests.
The final guide regression also checks the exact meeting-room URL in both languages,
avoiding a duplicated path when the catalogue supplies the same launch destination.
After deployment, 16 live English/Spanish desktop/mobile checks passed account and
pilot placement, search, exact launch URLs and guide layout; the portal was healthy.
Private rollback copies and network evidence are under
`/opt/utilibre/reports/galene-fmd-20261008`. Restore only the relevant portal image,
Galene command/ICE configuration and pack firewall if rolling this change back.

TURN fallback remains separate work: the current `turn.utilibre.org` DNS record
still uses Cloudflare's HTTP proxy. It needs DNS-only public IPv4 routing,
3478 TCP/UDP, 5349 TCP and 49160–49191 UDP forwarding, and a renewed TLS certificate.
Galene-specific ICE credentials and relay peer rules must be configured and
tested; the disabled PairDrop relay profile cannot simply be assumed suitable.
See [Galene's native NAT/ICE instructions](https://galene.org/galene-install.html).

### Earlier service-pack release

Implementation commit `1ba100e` was pushed to the existing GitHub repository and
the portal deployed using its normal Compose project. The backend pack, eleven
bilingual guides, editable examples, source downloads and catalogue entries are
live. A final guide-only follow-up removes repeated privacy/source entries for
two tasks from the same application. No Search/Redlib restart or listing submission.

Observed after deployment: all 70 public canonical pages passed the live SEO
check (HTML, unique metadata, reciprocal languages, sitemap, CSP and no cookies).
Real EN/ES public/account/pilot views showed the intended new tools and preserved
Collab in Use now. Both missing-page probes returned 404; guide journeys had no
outside browser requests or page errors. Desktop/narrow screenshots were inspected.
All eight new/updated source archives returned 200 with nonempty files. Local
typecheck/lint/build, 84 unit tests, six desktop/mobile guide tests and seven
IndexNow-selection tests passed; no IndexNow submission was sent.

Rollback image: `public-utility-portal:pre-service-pack-20261008`.
Private environment backup: `/opt/utilibre/pack-secrets/portal-pre-service-pack.env`.
Restore those together and recreate **only** portal; preserve all application
state. Five unused intermediate PDF/Omni/Python images and the loopback test proxy
were removed, not user data or rollback images; build recipes recreate them.
Disk recovered to about 12 GiB free. This release is not a claim that the blocked
services, provider controls or external media paths below are complete.

## Baseline and boundaries

- Portal release `dc8a0e8` moves Collab/WBO from Pilots to Use now, preserving its
  temporary, server-readable room warnings. All 84 unit and six browser tests,
  typecheck/lint/build and configuration validation passed. Public EN/ES routes
  show one matching public card and zero pilot cards. WBO was not restarted.
- Existing personal collections, local link conversion, image handoffs, QR
  offline support, native examples and bilingual guides are preserved. Public
  PairDrop remains direct WebRTC without WebSocket fallback; TURN has only been
  tested in a private lab. Public relay network/certificate prerequisites remain.
- Measured app VM: 8 logical CPUs, 15 GiB reported RAM, 8.3 GiB available;
  4 GiB swap (2.3 GiB allocated); root 128 GiB, 34 GiB free, load about 0.5.
  These are a point-in-time inventory, not capacity or concurrency guarantees.
- Existing scheduled backups are local to this VM; community snapshots occupy
  622 MiB, expanded snapshots 1.6 MiB, identity snapshots 17 MiB. Off-host disaster
  recovery is not established. New stateful services need their own tested
  native snapshots and restore rehearsal before being described as recoverable.
- Separate Caddy edge/DNS/provider settings are not writable through the access
  discovered here. New backend deployment is authorized; public TLS/routing and
  provider-level tracking settings require operator verification. No directory
  submissions, paid resources or tracking systems are part of this release.

## Coverage and release gates

| Capability | Baseline / mechanism | Required verification | Current state |
| --- | --- | --- | --- |
| CryptPad suite | 2026.9.0, cryptpad-server 1.0.1, Office 9.3.2+3; two public origins | Two-session Markdown and spreadsheet edits/Undo, native document/office/calendar exports, isolated browser restore pass; remaining detailed gates below | Backend live; portal release pending |
| LiberaForms + feedback | 4.11.1-p5, Python 3.13, PostgreSQL 17.11; native required encryption | Guest encryption, creator decryption/key restore/JSON export, second-account denial, database restore, SMTP, public branding pass | Backend live; source notice added; portal release pending |
| Mapshaper | 0.7.80-p1 complete static GUI | Public GeoJSON/zipped Shapefile/CSV import, simplify/export pass, no external browser origins | Backend live; portal release pending |
| Numbat | 1.24.0-p1 complete WASM GUI | Variables, units/errors and explicit nonexecuting fragment links pass | Backend live; portal release pending |
| FreshRSS packs + read later | Existing 1.29.1; four OPML packs/seven verified feeds; native favourites | Authenticated import, refresh, text-first reading and favourites pass; native export is ZIP containing OPML XML and starred JSON | Privacy configuration live; packs/guide not yet released |
| Super Productivity | 19.1.0-p1 full web-only production build; no SuperSync | Public task/focus/reload/export/fresh-profile import pass; warmed native service worker reloads offline | Backend live; portal release pending |
| wallabag | Locally repaired pinned 2.7-dev `496db5b` / PHP 8.4.26; stable 2.6.14 was not launched | Native MFA/CSRF, private article/export, 19 egress checks, size/rate limits and encrypted native restore pass; 16 abandoned dependencies remain a maintenance concern | Backend 3177 deployed; public TLS route pending (525), registration closed |
| Galene | Native 1.2.1 in isolated bridge, four-client moderator-led room | Native invitations/permissions, chat, client cap and external two-way audio/video pass; see the latest checkpoint above | Invited meetings live; TURN fallback remains pending |
| Whisper | Existing hidden deployment; reported poor Spanish transcription | Supported pinned dependencies, local model checksum/license, useful EN/ES transcripts | Unavailable pending credible passing test |
| Whole-pack privacy | Existing no-tracking policy, but configuration alone is not an audit | Asset/backend/job/log inventory; targeted clean-profile workflows; edge/provider confirmation | In progress |

## Release and rollback

### Current checkpoint — 8 October, 02:55 UTC

This section supersedes the older checkpoints below; the release status above
supersedes its earlier pending items. Tests used synthetic data on Linux
Chromium, normal public TLS except explicitly isolated restore/lab tests. No real
phone, Windows/Opera transcription or independent external meeting test is implied.

- Eleven complete EN/ES pack guides (22 pages), original CC0 editable fixtures,
  existing catalogue-derived access/privacy and contextual guide links are ready.
  Existing URLs and personal collections are preserved. An Impeccable distillation
  pass reduced the long repeated guide list to three related links and All guides.
- CryptPad checks completed: native Form guest response/owner access and owned-form
  destruction; Document DOCX, Spreadsheet XLSX, Presentation PPTX, Rich Text HTML,
  Kanban JSON, Calendar ICS and Markdown exports. Two-client Markdown/spreadsheet
  editing and synchronized Undo passed. Code rendered Mermaid, Markmap and mathjax.
  Calendar event editing, all read-only office permission combinations and every
  Spanish fixture import remain untested. A fresh-guest deletion check used a safe
  address-bar URL by mistake: it is not proof of post-deletion denial.
- Forms native create/publish/respond/decrypt/key-restore/JSON-export/delete passed.
  Deleted disposable form returned 404; feedback remained. Owner/second-account
  isolation and SMTP passed. `/feedback` asks only tool/task/stuck/optional contact.
  Creator accounts remain invitation-only, anonymous respondents need no account.
- Mapshaper also passed native attribute editing (`-each books=books+1`) and
  exported GeoJSON reimport. Numbat verified 375 g, 0.18 kWh, 5000 m, unit mismatch
  errors, unchanged normal URLs and explicit nonexecuting bounded fragment sharing.
- FreshRSS test account imported the packs, fetched 40 articles, starred one and
  exported the native ZIP containing OPML XML and starred JSON. Test account and
  its synthetic database were removed using native CLI; real accounts unchanged.
  Correct import/export URL is `/i/?c=importExport`. Read-later means native
  favourites, not a wallabag archive. Seven valid feeds in four optional packs;
  Guatemala's pack is public-interest journalism, not a government source.
- Super Productivity task/focus/reload/export/fresh-profile import and native
  offline reload passed. Initial native asset preparation took an eight-second
  warm-up in this test; a visit alone is not an offline-readiness guarantee.
- Galene's two host-local clients exchanged 2766 audio bytes, 25660 video bytes
  and 18 decoded frames in the final fixture. Fifth guest was rejected at four
  native clients; disconnecting the last moderator removed guests. These are
  small test observations, not capacity figures. Public UDP/TURN remains inactive.
- BentoPDF 2.8.8-p3 uses supported air-gap settings: PyMuPDF 0.11.16, Ghostscript
  0.1.1, CoherentPDF 2.5.5, Tesseract/core 7, EN/ES trained data and Noto fonts.
  Public readable two-page merge and useful EN/ES OCR passed with zero outside
  requests/content uploads/failed requests. English OCR needed an accent correction.
  Optional signature validation is disabled due to an unpatched verification
  dependency. Do not infer secure redaction or signature verification from OCR.
  Full runtime asset tree is about 358 MB on disk, fetched by task, not all on visit.
- OmniTools 0.6.0-p5: local FFmpeg 0.12.9, Monaco 0.52.2, compression 2.0.2,
  Tesseract/core 6 and EN/ES data; local IMG.LY 1.7.0 retained. Native Filerobot
  backend translations disabled. Six featured tasks (CSV→JSON, deduplication,
  compression, image editing/background removal, audio trim) produced outputs
  with zero external requests or application uploads. Other optional tools are
  not implied verified by this set. Runtime package hashes/licenses are pinned.
- JupyterLite 0.8.5-p5 / kernel 0.8.6 now uses native wheel/index configuration,
  checksum-pinned local Pyodide 314.0.6 and comm 0.2.3. Public Python calculation,
  pandas CSV and matplotlib image output passed with zero external requests or
  uploads. The full compressed Pyodide archive is 350,203,134 bytes on the build
  server, not an initial browser download; packages load on demand. External
  package fallback is disabled. Two migration defects (missing comm wheel and
  its file permissions) were resolved before the passing notebook test.
- New services disable Docker/access/error logs and optional usage telemetry.
  Selected existing Penpot frontend/admin, Wakapi, RSSHub and PrivateBin log sinks
  were disabled without deleting application data or changing account policies.
  Wakapi remains explicit user-owned coding records, no public leaderboard or
  automatic visitor enrollment, unchanged three-month retention.
- Snapshot 02:08 repeated isolated native PostgreSQL restore/login/encrypted-answer
  AND CryptPad browser document decryption successfully. Both snapshots remain
  encrypted; keys and snapshots are on this VM, not off-host disaster recovery.
  Installed timers: backup 05:15 UTC and native Forms expiry/purge 07:15 UTC,
  each with up to 120 seconds jitter. Existing monitor checks job result only.
  No automatic snapshot pruning: deleted content may remain until an approved
  backup retention policy exists. The backup disk floor is 5 GiB.
- Resource sample 02:51: eight logical CPUs, 15 GiB reported RAM, 4 GiB swap;
  root 128 GiB with 12 GiB free after builds. CryptPad 231 MiB, Forms 123 MiB,
  Galene 20 MiB. Build/source caches consumed space since the 34 GiB-free baseline.
  These are point samples, not sustained capacity or a 1000-user guarantee.
- Privacy limits remain explicit: no access to edge/provider analytics/log controls;
  remaining legacy services have not all had authenticated/error-path network
  inspections. Whole-pack zero-tracking certification is **not established**.
  No certification badge or invented provider assurance was added. Known optional
  unsafe applications remain unavailable; no alternate tracking system introduced.

Exact dependencies: Caddy HSTS header for CryptPad; inspect alias routes on edge;
provider analytics/log-retention controls; off-host backup destination/key separation
and retention policy; independent public Galene/TURN network test. Prepared relay
requires DNS-only hostname/certificate and routing for 3478 UDP/TCP, 5349 TCP and
49160–49191 UDP, with existing eight allocations, 250 kB/s per allocation and
1 MB/s aggregate. Credentials delivered to guests are not per-user authorization.
PairDrop WebSocket fallback stays disabled. Later October 9 Wallabag/Whisper repairs
supersede this historical packaging gate: see the dated follow-up above for actual
deployment, public-edge and Windows/Opera quality limits.

### Reproducible build / update notes

Use exact Git commits in `publish-source.mjs`; never switch to moving latest tags.
Sources are under `/opt/utilibre/src`. Build one heavy app at a time, outside requests.

- Mapshaper: copy reviewed pack `mapshaper.package*.json` to pinned source, run
  `npm ci --ignore-scripts` and native `npm run build`; then run
  `node deployment/pack/prepare-static.mjs mapshaper` from this repository.
- Numbat: build `deployment/pack/Dockerfile.numbat` with its source context and
  `--output /opt/utilibre/build/numbat`; then `prepare-static.mjs numbat`.
- Super Productivity: apply `super-productivity.dependencies.patch` and the small
  `super-productivity.plugin-lock.patch` to clean pinned source;
  `npm ci --ignore-scripts`, `HUSKY=0 npm run prepare`, then
  `NODE_OPTIONS=--max-old-space-size=3072 NG_BUILD_MAX_WORKERS=2 npm run buildFrontend:prodWeb`.
  Run `prepare-static.mjs plan`; do not start upstream test databases/SuperSync.
- CryptPad: native dependency install and current `npm run install:components`,
  official Office/x2t 9.3.2+3 installer with upstream SHA512 verification, then
  `node deployment/pack/prepare-cryptpad.mjs`. Retain all component licenses.
- Forms: `docker build --build-context pack=deployment/pack -f deployment/pack/Dockerfile.liberaforms
  -t utilibre-liberaforms:4.11.1-p5 /opt/utilibre/src/liberaforms`.
  Bootstrap/state/key scripts are initial setup only, not credential resets.
- Galene: `Dockerfile.galene` with pinned native source; prepare native group
  configuration privately. Do not expose credentials or enable UDP by inference.
- BentoPDF: apply `bentopdf.dependencies.patch`, native `npm ci --ignore-scripts`,
  `build-bentopdf.mjs`, `prepare-bentopdf-airgap.mjs`; build `Dockerfile.bentopdf`
  from its versioned assets. OmniTools uses `Dockerfile.omnitools` and its pinned
  upstream image; runtime installers verify hashes, not unpinned visitor downloads.
- Apply pack firewall and only relevant Compose services. FreshRSS updates retain
  its privacy overlay. Keep existing data, source archives and previous images.

Stage reviewed files before `publish-source.mjs APP` and
`scripts/publish-integration-source.mjs`; publishers archive Git-indexed integration
files and pinned upstream source, not runtime secrets. Update the source index.
Root portal-only build/up follows checks; do not restart Search/Redlib for this.
Preserve live portal image/private .env for rollback; stateful volumes stay intact.
Never `down -v`, restore over production, globally prune, or restore external tracking
to make a failing task look healthy. Reverted deployments need matching source.

### Historical checkpoint — 8 October, 02:00 UTC

This section supersedes older "pending" test notes below; it is not a full-pack
completion claim. Portal release is still pending.

- Added 11 complete bilingual pack guides (22 localized pages), preserving the
  earlier guides. New editable CC0 fixtures include XLSX, DOCX, Kanban JSON, ICS,
  Markdown slides/diagrams and text questions, alongside maps/OPML/calculations.
  The guide renderer uses the existing catalogue for access links and privacy.
  No new framework, accounts, analytics or workflow engine was introduced.
- CryptPad native XLSX import/export, two-client cell edits, formula totals and
  synchronized Undo passed. Rich Text HTML, Document DOCX (exported XML contains
  the original fictional text), Kanban JSON, Calendar ICS, Markdown Slides and
  Markdown export passed. Markmap, Mermaid and mathjax each rendered an SVG.
  Presentation exported a real PPTX containing the entered fictional title.
  Some guides also describe supported native controls whose full interaction
  still needs the final targeted pass (calendar event editing, form creation,
  permission/deletion, reimport and Spanish fixture variants); do not treat
  those as a completed end-to-end audit yet.
- Native CryptPad documentation retrieved today describes older office Undo
  limitations; deployed 9.3.2+3 was tested directly and does synchronize the
  tested Undo operation. The guide identifies the two toolbars and mode caveat.
- `check-restored-pad.mjs` passed against the 00:45 encrypted snapshot: decrypt
  to a private temporary directory, start an isolated native CryptPad and
  loopback TLS proxy, load the recovered owner state, decrypt the original
  collaborative test document. Both test containers and the temporary restored
  copy were removed afterward; live state was never overwritten. Together with
  `verify-backup.mjs`, this establishes a synthetic on-host restore, not off-host
  recovery or a guarantee for every office attachment.
- The LiberaForms resolved requirements audit reported zero known advisories
  after compatible updates and removal of the unused test SMTP dependency.
  p5 adds only required source links to the native footers; p4 privacy patches
  already disabled optional form-action logs, last-login activity statistics
  and statistics routes. Native permissions, keys and answers are retained.
  `maintain-forms.mjs` invokes upstream expiry/purge functions; its first run
  completed. Scheduling and documented backup retention are still pending.
- Public feedback is `https://forms.utilibre.org/feedback`. Its four visible
  fields are tool, task, where stuck and optional contact. EN/ES introduction
  explains that authorized operators can decrypt it. No attached diagnostics,
  hidden identifiers, uploads or response-content emails are requested.
- Cloudflare was injecting same-origin JavaScript challenge detection into
  ordinary application HTML; counting only outside origins missed it. This
  broke Super Productivity's native index integrity/offline preparation too.
  Added documented `Cache-Control: no-transform` via local servers and supplied
  the edge line. Public responses now show that header and no injection on pad,
  sandbox-pad, forms, meet, plan, tools, pdf and drop. Existing shared static
  nginx configs and WBO were validated/reloaded without restarting applications.
  This does NOT verify Cloudflare account-level analytics/log-retention settings.
- Measured resources near 01:30: 8 logical CPUs, 15 GiB RAM (8.4 GiB available),
  4 GiB swap (2.6 used), root 128 GiB (22 free). CryptPad about 286 MiB, Forms
  126 MiB, Galene 11.5 MiB in that sample. No capacity extrapolation. Recheck free
  space before builds; the backup script refuses below 5 GiB free.
- Whisper remains hidden. Pinned upstream `81869ed62970ff4373509b6004a6c9a3f0c5b64d`
  dates to June 2024. Runtime npm audit is zero; complete build-tool audit found
  22 advisories (13 high, 8 moderate, 1 low), including a major Tailwind change
  among proposed fixes. This is not 22 proven runtime exploits. More importantly,
  prior Spanish quality complaints on Windows/Opera are not resolved by a single
  server-browser fixture. No new transcript-quality or Windows/Opera claim is made.
- At 01:43, user-reported `monitor`, `send`, `feeds` hosts returned 502. Canonical
  `status` (3125), `drop` (3124), `bridge` (3120) and `rss` (3106) all returned 200,
  as did their private backends. Those aliases are absent from repository Caddy
  files. Active edge configuration remains unavailable; do not infer stopped
  containers or expose localhost-only Kuma administration port 3135.

### Historical release queue (superseded by current checkpoint above)

1. Complete the targeted native form, permissions/deletion and example reimport
   checks; inspect representative bilingual portal desktop/mobile pages.
2. Finish source bundles/notices, exact build/update instructions, current
   dependency locks, native maintenance timers and final snapshot verification.
3. Audit remaining existing-service telemetry, external runtime assets and log
   sinks; an environment-flag inventory found 101 containers, only 30 with Docker
   log driver `none`. That is an audit queue, not proof the other logs track users.
4. Galene cannot be presented as a public meeting service until a bounded public
   media/TURN path is configured and tested from an independent external network.
   No external-network success follows from host-local browser traffic.
5. Build, source publication, portal release and public-route/SEO verification.
   No instance-directory submissions or IndexNow notifications were sent.

### Source and custom-glue inventory

- Existing portal catalogue/config/guidance and guide data: links, access facts,
  text, examples and privacy answers only; no replacement application logic.
- `prepare-static.mjs`: complete upstream static assets, disable basemaps/fonts/
  exchange-rate fallback; Numbat has explicit bounded fragment sharing instead
  of automatic calculation URLs. Super Productivity uses upstream native PWA.
- `prepare-cryptpad.mjs` and native `customize/` files: telemetry off, policy links,
  CKEditor version-ping off and advisory-triggering modes disabled.
- `liberaforms-privacy.py`: small fail-closed build changes for optional activity
  records, statistics UI and required source notice. Native cryptography unchanged.
- `prepare-galene.mjs`: native PBKDF2/group/permission settings, no room platform.
- `prepare-examples.mjs`: original small fixture files, not document conversion.
- `backup.mjs`, restore checks, `maintain-forms.mjs`: wrappers around native
  pg_dump, tar, OpenSSL and upstream lifecycle functions; no backup database.
- `publish-source.mjs`: pinned Git-indexed upstream source and local recipes,
  excluding secrets/runtime data, with previous public archives preserved.

Reversible release: preserve the prior portal image and source archive; rebuild
only the portal for catalogue changes. For a Forms rollback use the retained p4
image with the same database/volume; p5 makes no schema migration. For static
tools restore their previous versioned asset mount. Never use `down -v`, prune
data, or overwrite a live database with a test restore. A rollback must retain
the no-tracking controls and appropriate corresponding source.

### Public forms branding repair (8 October)

The public homepage returned 404 for `/logo.png` (and the favicon), although the
native files existed in the persistent brand directory. LiberaForms expects its
web server to serve these paths; they are not Flask application routes. Added
`deployment/pack/nginx-forms.conf` following the selected release's
`docs/nginx.example`, with exact aliases for these two public files only. The
uploads directory and database are not exposed. The existing app and database
versions, account policy, forms and answers are unchanged.

The pinned, unprivileged nginx frontend is read-only, capped at 64 MiB / 0.25 CPU,
has no access/error log sink, and can connect only to the existing app on its
private bridge. External port **3176 is unchanged**; no edge Caddy change is
needed. Deploy with `docker compose -f deployment/pack/compose.forms.yaml up -d
--no-deps app web` after applying the pack firewall. Configuration syntax passed.

`node deployment/pack/check-forms-branding.mjs` passed against real public HTTPS
without certificate overrides: logo and favicon returned image responses with
200 status; Chromium decoded every homepage image at 1280px and 390px widths;
neither viewport had horizontal overflow; sign-in still displayed its username
field; no HTTP errors occurred. The actual desktop screenshot was also inspected.
This is a branding/sign-in regression check, **not** proof of the remaining
encrypted-response, backup or whole-service privacy gates.

Rollback, if necessary: stop only the `web` service, remove its port mapping and
restore `10.10.1.43:3176:5000` to `app`, then recreate only `app`. Do not remove
volumes or reset branding; the former direct-WSGI path will retain the original
image defect. Neither deployment nor rollback requires database changes.

### Working checkpoint (updated 8 October)

- Mapshaper 0.7.80-p1: hardened dependency lock (npm audit reported zero), complete
  static GUI installed on private port 3170. Chromium imported/exported fictional
  GeoJSON, zipped Shapefile and CSV, including simplification; no external browser
  requests in these journeys. Public `maps.utilibre.org` now returns 200 with
  valid TLS; the same import/export checks passed through the public hostname.
- Numbat 1.24.0-p1: complete Rust/WASM build on 3171. Variables, units, incompatible
  units and explicit nonexecuting fragment sharing passed. Public
  `calc.utilibre.org` returned the patched build and 120 min for `2 h -> min`;
  simulated 390px viewport had no horizontal overflow. Normal calculations do not
  alter URLs. Remote currency requests and Google Fonts removed. No field/device
  coverage or whole-provider privacy claim follows from these tests.
- Both tools have canonical catalogue/config entries and complete EN/ES guides
  in `service-pack-guides.ts`, plus original fictional examples. Portal typecheck
  and the FOSS gate passed for 61 cards. These portal changes are **not released**.
- Super Productivity 19.1.0 (`42ded9f`) built successfully with compatible
  dependency updates and is staged on 3172. Task creation/reload and initial
  network check passed. Native focus/export/import/offline checks are ongoing.
  Native task/focus, reload, JSON export and fresh-browser import also passed.
  A self-only CSP blocks cloud integrations; no SuperSync/database was installed.
- CryptPad 2026.9.0 / cryptpad-server 1.0.1 and official Office v9.3.2+3/x2t assets
  installed on 3173. Official installer checked asset SHA512; office assets are
  about 1.2 GiB unpacked. Main/sandbox origins use separate names. Native owner
  creation succeeded; checkup 51/55 (policy links, support key and test HSTS not
  configured). Drive loading was a private-test CA/SharedWorker issue, not an
  application failure. Public main/sandbox TLS now works. Two independent public
  Chromium sessions edited a Markdown document and owner reload retained it;
  no external browser requests were observed. Office/permissions/restore checks
  remain; this does not establish the whole suite is ready.
  No server file logs/container logs; diagnostic stdout, when explicitly enabled
  in the private synthetic test, is reduced to event types and then disabled.
- LiberaForms 4.11.1 (`4d59674`) complete Python app and isolated PostgreSQL 17.11
  running on 3176, publicly routed at forms.utilibre.org. Native owner login,
  personal-key generation/backup, encrypted feedback submission and operator
  browser decryption passed. The submitted synthetic answer was absent in
  plaintext from its request; the private key did not leave the browser in that
  test. Native Restore reads the clipboard when permission is granted; the
  optional paste field is a fallback. Encryption REQUIRED, uploads/metrics/RSS disabled;
  creator invitations retained. Logging sink disabled, static CSS builds disabled
  in request handling through supported Flask-Assets options. Encryption-key,
  response, export and isolation checks still pending. Initial requirements scan
  produced 233 advisory records (including duplicate aliases), not 233 proven
  exploitable application flaws; final resolved-environment review remains.
- Galene 1.2.1 (`6d9338e`) built from native upstream source; group/token/ICE tests
  passed. No public meeting or TURN service enabled by this build alone.
- wallabag 2.6.14 official image inspected, not launched: PHP 8.1.32 / Alpine 3.19.8
  and Composer reported 60 advisories across 19 packages. Do not publish this
  image. Check supported rebuild/patch bounds; no weakening of the privacy gate.
- FreshRSS text-first CSP and logging controls are deployed on the existing
  1.29.1 image. No existing subscriptions, accounts, retention or article data
  have been changed. Feed-pack and authenticated-browser checks remain.

The forms proxy uses **same-origin** Referrer-Policy, not no-referrer: Flask-WTF
requires the same-origin Referer for its HTTPS CSRF check. Public login and
decryption passed after this correction. Cross-origin referrers remain blocked;
CSRF protection remains enabled.

`backup.mjs` created a 252 KiB local encrypted snapshot at 00:45 UTC using native
pg_dump/tar and OpenSSL CMS AES-256-GCM. `verify-backup.mjs` authenticated all four
archives, restored PostgreSQL into a temporary separate database and verified
native login, authorized form access and the synthetic encrypted answer. It also
extracted CryptPad files into a private temporary directory; browser recovery of
that copy remains untested. The temporary database/files were removed, not live
data. The private decryption key is outside the snapshot, on the same VM; this is
not off-host disaster recovery. No automatic backup deletion is enabled yet.

New static and CryptPad outbound connections are denied by the pack firewall;
LiberaForms permits only its private database and existing SMTP relay. IPv6 is not
enabled on these new Docker bridges. Runtime request logs are disabled for new
services. The test-only Caddy container binds loopback 8443, uses a private CA and
does not represent a successful public TLS test. Remove it after verification.
Owner/bootstrap files stay in `/opt/utilibre/pack-secrets` (0700; credential files
0600), never in source or output. Do not publish browser storage-state files.

Build static assets outside request handling, one heavy build at a time. Keep
services independently bounded and private until their functional/privacy gates
pass. Preserve previous images and state; never use volume deletion or global
prune. Portal release follows `docs/deployment.md` and source publication.
Collab-only rollback image is `public-utility-portal:pre-collab-use-now-20261007`;
the WBO service itself must not be restarted for a catalogue rollback.

## Source log

Retrieved 2026-10-07; pinned source/configuration decides deployed claims.

Additional primary checks, 2026-10-08:

- https://developers.cloudflare.com/cloudflare-challenges/challenge-types/javascript-detections/
  (`Cache-Control: no-transform` prevents HTML script injection).
- https://docs.cryptpad.org/en/user_guide/apps/sheets.html (older documented Undo
  modes compared with direct installed-version tests, not blindly copied).
- https://docs.liberaforms.org/user-guide/e2ee/ (keys, browser storage and sharing;
  current local templates and observed UI decide the walkthrough).
- https://symfony.com/blog/cve-2025-64500-incorrect-parsing-of-path-info-can-lead-to-limited-authorization-bypass
- https://github.com/guzzle/guzzle/security/advisories/GHSA-w248-ffj2-4v5q
- https://github.com/guzzle/guzzle/security/advisories/GHSA-f2wf-25xc-69c9

- https://docs.cryptpad.org/en/admin_guide/installation.html (documentation's
  example tag predates current release; inspect selected release scripts).
- https://github.com/cryptpad/cryptpad/releases/tag/2026.9.0
- https://docs.liberaforms.org/sysadmin/install/
- https://codeberg.org/LiberaForms/server
- https://github.com/mbloch/mapshaper/releases/tag/v0.7.80
- https://numbat.dev/docs/web/usage/
- https://github.com/sharkdp/numbat/releases/tag/v1.24.0
- https://github.com/super-productivity/super-productivity/wiki/2.13-Run-with-Docker
- https://jupyterlite.readthedocs.io/en/stable/howto/pyodide/wheels.html
- https://github.com/cryptpad/onlyoffice-editor/releases/tag/v9.3.2+3
- https://github.com/cryptpad/onlyoffice-x2t-wasm/releases/tag/v9.3.2+3
