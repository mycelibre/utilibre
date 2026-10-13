# Moodist deployment — 2026-10-09

## 10 October: larger, individually credited sound selection

Current release: **3.1.1-p2**, same upstream commit and URL. The library now has
13 sounds: the existing generated noises plus rain, thunderstorm, forest birds,
stream, ocean waves, wind, fireplace, coffee shop, summer night and train.
Five native starter mixes include Rainy café, Forest stream, By the fire,
Seaside and the retained Deep focus. No replacement player, DSP, runtime
dependency, account, backend, port or Caddy change was added.

Recordings are unchanged Ogg files from Blanket commit
`775f2a767230a9681850d1b1e085be58656f1382`. The exact author/source, editor,
license and SHA-256 are pinned in `deployment/toolbox/moodist-recordings.json`.
Blanket's [per-file credits](https://github.com/rafaelmardojai/blanket/blob/775f2a767230a9681850d1b1e085be58656f1382/SOUNDS_LICENSING.md)
and the original source pages linked in that manifest were checked on
10 October. Licenses are CC BY 4.0 (rain/storm/waves), CC BY 3.0 (train),
CC0 (birds/stream/wind), and source-declared public domain
(fireplace/coffee shop/summer night). Preserve those individual terms; the
recordings are not covered by Moodist's MIT code license. The app links to
locally served `sounds/RECORDING-CREDITS.txt`; the source archive contains the
recordings, credits, manifest, checksum-checking installer and build recipe.

`build-moodist.sh` retains the original-recording exclusion and invokes
`install-moodist-recordings.mjs` during the build. Only pinned assets enter the
build; a wrong hash fails it. Runtime still has self-origin CSP and no radio,
YouTube or remote sound retrieval. App payload is 21,719,205 bytes; a clean
Chromium installation measured 21,698,986 cached bytes across 47 resources,
including all ten recordings. Native automatic caching begins when visiting
the app, not only when installing it. EN/ES catalog and guide copy disclose
approximately 21 MiB. The portal does not preload it.

Local and public HTTPS checks: all ten Ogg files decode to non-silent audio and start native
WebAudio playback; native mixing, save/reload, existing white-noise favorite,
unrelated local-storage sentinel and binaural start/stop pass. Browser network
checks cover these journeys, not every setting. Public replay passed with 69
same-origin GET requests, zero outside requests and zero page errors. Offline public Chromium check:
initial caching, controlled offline reload and Rain fetch/decode pass with no
outside requests. This is browser simulation, not a physical phone or a
listening-quality/health-effects test. See `check-moodist-library.mjs` and
`/opt/utilibre/reports/moodist-20261010*` for bounded verification artifacts.

Release/rollback: p1 directory and source are retained under
`/opt/utilibre/portal-copy-NfsEis/` as `moodist-p1` and
`previous-moodist-utilibre.tar.gz`. To roll back, preserve the current static
directory, replace `/opt/utilibre/toolbox-public/apps/moodist` with that p1
directory, and restore its matching source archive. Do not clear user browser
storage. Old hashed chunks were retained in p2 for already-open tabs. Existing
PWA clients should accept Moodist's **New Content → Reload** prompt; deleting
site data is not an update procedure. The original source patch applies cleanly
to the pinned upstream checkout. No dependency versions changed in p2.

## 9 October initial release (historical)

Live: https://tools.utilibre.org/apps/moodist/ . Upstream 3.1.1, commit `11c0be2200116a3635880d600fd6953899cc51a3`, Utilibre p1. MIT code; included generated audio CC0-1.0. Source and recipe: https://tools.utilibre.org/utilibre-source/moodist-utilibre.tar.gz . No additional server/container/database.

The installed library has **three generated white/pink/brown noise loops**, native binaural/isochronic tone generators, breathing, timers, presets, notes and to-dos. The upstream recorded library is excluded: README identifies a mix of Pixabay Content License and CC0, but does not map each file to its source/license. No unsupported claim that these recordings are all freely redistributable was used. Internet radio/Radio Browser and YouTube lo-fi integrations are removed from the runtime component graph; third-party scripts/frames/media are also denied by CSP. The restriction is visible in English/Spanish in the existing intro. Controls otherwise remain upstream English. No medical/sleep-treatment efficacy is promised.

`generate-moodist-audio.py` creates original deterministic noise, a low-level sine alarm and silence; no recordings or external samples. This is a build asset recipe, not a new application/audio backend. Native sound playback/mixing remains upstream Howler/WebAudio. Source includes the generator and generated files, never the unmapped original recordings.

Storage: namespaced `moodist-*` browser preferences, presets, notes/to-do data survive tab closure. Native PWA scope and start URL are `/apps/moodist/`; its offline cache is about 5.5 MiB. Other tools share the origin; clearing tools site data affects their browser data too. No account or server-held sound/note history is added. Shared mix URLs reveal their selected noise IDs and volumes to whoever receives them. Save/download what matters independently; no server restore is available for browser data.

## Changes and checks

Local system fonts replace build-fetched Google fonts. Source patch adjusts existing base paths, limits categories and starter mixes, removes external integrations, scopes PWA, points share URLs to the installed path, includes native project/source links, and prevents closing an already-closed AudioContext. Updating react-icons to 5.7.0 with its normal ESM imports reduced the static output from 29 MiB to 5.5 MiB. Applicable fixable dependency advisories were corrected in the lockfile. Remaining `http-cache-semantics` high advisory is in build tooling; no Astro server, shared HTTP cache or authenticated fetch backend is deployed. It has no published patched version on this verification date. Do not claim zero audit findings.

`check-moodist.mjs` passed against local files and the public URL using a fresh fictional profile: generated WAV request/playback state, native binaural start/stop, unrelated localStorage sentinel unchanged, no external HTTP requests, no POSTs and no page errors. Network report proves the tested actions, not every possible browser environment. Reports `/opt/utilibre/reports/moodist-20261009`. No real notes, mixes or user data were inspected/deleted.

Rebuild: exact checkout, apply `moodist-local-source.patch`, run `build-moodist.sh` with the colocated generator (pinned pnpm10.30.3, Node24, frozen lock, 2 GiB heap). Build temporarily keeps original recordings outside the artifact and restores them afterward. Stage dist outside public, test, publish matching source, then atomically promote to `/opt/utilibre/toolbox-public/apps/moodist`. No new ports or Caddy block. Rollback replaces that static directory and retains old source; existing browser data is not erased. Remove individual patch parts when upstream supports matching privacy flags/base paths/scoped caching and fixes tone cleanup; add recordings only after their individual provenance/terms are verified.
