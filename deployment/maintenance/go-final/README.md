# Five existing Go services: final compatible security rebuild

This bounded batch preserves the existing applications, source revisions,
privacy patches, static assets and runtime configuration. It changes the Go
compiler from 1.26.8 to **1.26.9** and the explicitly reviewed compatible module
versions recorded in `locks/*/{go.mod,go.sum}`. `images.json` records the exact
old images, source commits, executable paths and candidate tags. It is not a
new application deployment or an upstream-content availability claim.

## Reproducible inputs

The compiler is the official Docker Go image, pinned by digest:

`golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade`

Its compiler version is checked before any build. Toolchain auto-download and
Go telemetry are disabled. Runtime binaries are Linux/amd64 with CGO disabled;
dependency checksums are validated with the native Go module verification.
The original upstream copyright and license files remain in every corresponding
source archive (Galene MIT; reader projects retain their individual licenses).
Go and its `golang.org/x` dependencies retain their upstream BSD-style licenses.

Sources: [Rimgo](https://codeberg.org/rimgo/rimgo),
[Galene](https://github.com/jech/galene),
[SafeTwitch backend](https://codeberg.org/SafeTwitch/safetwitch-backend),
[GotHub](https://codeberg.org/gothub/gothub),
[AnonymousOverflow](https://github.com/httpjamesm/AnonymousOverflow).
Official module metadata and checksum records were checked on 2026-10-11 via
`proxy.golang.org`/the native Go module mechanism. In particular, x/net 0.60.0
requires Go 1.26 and x/crypto 0.57.0, x/sys 0.48.0 and x/text 0.42.0; the older
Rimgo/Galene go directives are deliberately raised to 1.26.0, not left falsely
claiming compatibility with the previous minimum compiler.

The prepared source trees contain the existing Utilibre request-safety patches.
Reconstruct those from the existing `deployment/community/*-source.patch` at
the commit in `images.json`, then overlay the exact final locks. Galene starts
from its exact upstream commit plus the existing static preference patch in
`deployment/pack/Dockerfile.galene`. No source checkout under `/opt` is a runtime
data directory. Original build recipes also pin the fixed compiler and disable
automatic toolchain upgrades.

## Build and gates

Run `node deployment/maintenance/go-final/prepare.mjs` against the stated old
images and exact source revisions. It extracts only the original executables
and hashes the source files. Rimgo's generated Tailwind CSS is copied from the
exact existing application so this security rebuild does not refresh its
frontend dependency tree.

```sh
docker run --rm --name maintenance-go-final-build \
  --cpus 1 --memory 3g --memory-swap 3g --pids-limit 256 --log-driver none \
  --tmpfs /work:rw,exec,size=4g,mode=755 \
  -v /opt/utilibre/community-src/rimgo-utilibre-p1:/source/rimgo:ro \
  -v /opt/utilibre/community-src/gothub-utilibre-p1:/source/gothub:ro \
  -v /opt/utilibre/community-src/safetwitch-backend-utilibre-p1:/source/safetwitch:ro \
  -v /opt/utilibre/community-src/anonymousoverflow-utilibre-p1:/source/anonymousoverflow:ro \
  -v /opt/utilibre/src/galene:/source/galene:ro \
  -v /var/lib/utilibre-maintenance/go-final-20261011/input:/input:ro \
  -v /var/lib/utilibre-maintenance/go-final-20261011/output:/output \
  -v "$PWD/deployment/maintenance/go-final:/recipe:ro" \
  golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade \
  sh /recipe/build.sh
node deployment/maintenance/go-final/stage.mjs
node deployment/maintenance/go-final/check-native.mjs
node deployment/maintenance/go-final/check-galene.mjs
python3 deployment/maintenance/go-final/verify.py
node --test deployment/maintenance/go-final/release.test.mjs
node deployment/maintenance/go-final/release.mjs prepare
```

Keep at least 8 GiB free on the shared root filesystem throughout. Builds run
serially; modules, compiler cache and Go temporary files use bounded tmpfs.
The first two-parallel-compiler attempt exhausted its 3 GiB memory allowance
while compiling AnonymousOverflow; it produced no live change. The final
serial recipe uses one compiler, a smaller Go heap target and resets its
disposable compile cache between applications. No runtime image, backup or
user data is deleted for build capacity.

`stage.mjs` rejects unreviewed module version/checksum changes and compares the
runtime image configuration. `verify.py` streams complete image filesystems
and requires only the intended executable to change; it scans the actual
compiled Go inventory. Other unresolved scanner findings are counted, not
suppressed. `check-native.mjs` runs both old/new backends in an internal network
and compares their native static routes, including the disabled SafeTwitch
chat path. These are not repeated public-provider queries.

Galene's existing native lifecycle fixture runs in a separate fictional room
on a separate instance: two Linux Chromium contexts, fake camera/audio,
screen-share start/stop, guest reconnect and 30 seconds of advancing media.
There are no external ICE servers in this fixture. This does not establish
new real-device or restrictive-network coverage; production relay settings
are unchanged. No existing meeting or production room is used for testing.

## Release and rollback

Only invoke `node deployment/maintenance/go-final/release.mjs apply` after
the exact candidate receipts pass and normal deployment authority applies.
The helper checks the 8 GiB floor, the old/new immutable image IDs, complete
non-image Compose parity, absence of unreviewed shared-network dependents,
and existing backend/gateway responses. It changes only one image scalar and
recreates only that service. Existing ACLs, limits, log policy, ports, networks,
volumes, gateways and user data remain unchanged.

Before Galene recreation, the helper reads only aggregate established TCP
connections to its native HTTP/WebSocket port. A nonzero count defers its
release; no client identifiers, room names or content are recorded. A race
detected before mutation does not restart the old instance during rollback.
This is a conservative quiet-instance guard, not a claim of zero usage history.

An unsuccessful post-release gate restores the exact original image pin and
recreates that service, then verifies its identity/native response. It never
restores a fictional database or deletes runtime state. Old images are retained.
Manual Galene rollback must also wait for no active connections. No Docker
daemon or Rustpad restart is part of this batch.

Private receipts live under
`/var/lib/utilibre-maintenance/go-final-20261011/`: prepare/build, native routes,
Galene lifecycle, actual scanner inventory, release and source-publication
records. Published archives contain source, licenses, fixed module locks and
matching build information only; previous archives are retained for rollback.
The public handoff must use the final release receipt, not a successfully
compiled binary, as evidence that an application is live.

## Observed release result — 2026-10-11 23:57 UTC

All five services were deployed and their exact images/native HTTP routes
passed. Galene's aggregate guard was zero before recreation. Four additional
single known public-content requests passed: Rimgo's existing video page,
the Utilibre repository through GotHub, a SafeTwitch channel API result and
a real AnonymousOverflow question/answers page. These bounded checks do not
claim that media playback or all providers were retested.

The source archives were published at their existing `/utilibre-source/`
paths; five fresh public HTTPS downloads returned 200 and matched the exact
archive SHA-256 values. All previous source archives and runtime images are
retained. `result.json` records the immutable final and rollback IDs, linked
module changes, archive hashes and exact remaining scanner findings.

Each final image has **0 critical and 0 high** findings in the actual image
scan. The previous Alpine `zlib 1.3.2-r0` medium `CVE-2026-85091` remains on
all five (vendor fix `1.3.2-r1`). Galene, SafeTwitch and AnonymousOverflow also
retain unclassified `GO-2026-5932` against x/crypto 0.57.0, with no published
fixed version in this scanner snapshot. Neither was suppressed or counted as
resolved. The complete runtime filesystem comparison found only the intended
executable changed in each image; all 468–811 other files per image were
byte-identical. Compiler/module repair is not a claim that the entire fleet is
free of vulnerabilities.

Fixture corrections were kept outside production: use explicit unused private
subnets because Docker's default network pools are exhausted; provide an
ephemeral random JWT key required by AnonymousOverflow's native startup; and
normalize only GotHub's expected displayed compiler version when comparing
HTML. These did not alter application access or security configuration.
