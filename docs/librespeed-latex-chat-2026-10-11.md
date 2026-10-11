# LibreSpeed installation and LaTeX/chat review — 11 October 2026

Scope: install LibreSpeed; research self-hostable LaTeX editors; install chat only
if worthwhile under existing privacy, public-abuse and minimal-glue constraints.
No account registrations, network-directory submissions or external messages.

## Decisions and sources

| Application | Decision | Evidence and material limitation |
| --- | --- | --- |
| LibreSpeed Go 1.1.6 | Install with a private, no-egress backend and the existing static gateway | [Official source](https://github.com/librespeed/speedtest-go/tree/v1.1.6), LGPL-3.0-or-later. Complete upstream speed-test UI/worker/backend; no locally invented measurement algorithm. |
| TeXlyre 0.13.0 | Installed after the owner authorized the candidate | Browser-only BusyTeX compilation, complete native editor, hardened dependencies and local runtime assets. PDF/ZIP export and editable restore verified. [Deployment and bilingual guides](texlyre-2026-10-11.md). |
| Overleaf Community Edition | Not suitable for unrestricted public accounts here | [Official caution](https://github.com/overleaf/overleaf#community-edition): free CE is for trusted users; compiles can read/write the container filesystem, environment and network. Server Pro sandboxing is outside the requested FOSS-only model. Do not add a custom compilation isolation engine. |
| SwiftLaTeX | Engine component, not preferred as a standalone public editor | [Official README](https://github.com/SwiftLaTeX/SwiftLaTeX): browser engine API, on-demand TeX packages and WIP WYSIWYG editor. Prefer a maintained complete UI such as TeXlyre rather than write one around the library. |
| The Lounge | Defer unrestricted public gateway; viable for a defined, approved-user community | [Native public mode and controls](https://thelounge.chat/docs/configuration). Public mode loses connections/scrollback on departure; private mode is an account-based bouncer. Native network lock, no previews/uploads, no message storage and TLS are useful controls. They do not remove external-network moderation, shared-IP connection limits, or the gateway operator’s access to plaintext messages. No claim of IRC E2EE. |
| Converse + an XMPP service | Defer until an actual community/account need exists | [Official client](https://github.com/conversejs/converse.js), [configuration](https://conversejs.org/docs/configuration/). A browser client is not an XMPP server or an account provider. A public account service additionally needs moderation, federation policy, recovery and storage limits. Encryption depends on compatible client/room configuration, not just HTTPS. Do not advertise an untested blanket E2EE property. |

Libera.Chat already provides [two public web clients](https://libera.chat/guides/clients).
A generic duplicate gateway currently adds less value than the existing Utilibre
guest chat/whiteboard and bounded voice/meeting services. No new IRC/XMPP runtime
was installed. This is a usefulness/operating decision, not a claim that these
projects cannot be self-hosted or made private.

## LibreSpeed deployment

- Source `7bbfadeeed710500752496f952bbcfb66ab3bdb9` (v1.1.6), local `p1`.
- `deployment/librespeed/go.mod` and `go.sum` pin refreshed compatible dependencies.
  Builder Go 1.26.9 is pinned by image digest. The initially cached Go 1.26.8
  produced vulnerability findings; that binary must not be deployed.
- One read-only, non-root scratch backend, 1 CPU, 128 MiB RAM/no swap, 32 PIDs,
  core dumps disabled. No persistent volume, database, user account or uploads.
- Backend is on an internal-only Docker network with no host-published port.
  Existing OmniTools nginx serves the upstream UI and exactly two test endpoints
  on a separate port. No new reverse-proxy service or TLS terminator is installed.
- Application logging is disabled. Gateway access/error logs are disabled.
  Native database type `none`; statistics, telemetry, IP lookup and unused example
  pages are not exposed. Nonzero unused coordinate sentinels prevent startup
  IP geolocation. No runtime outbound access from the backend.
- Only the edge and local test addresses are permitted by the gateway ACL.
  Host firewall is unchanged. Public DNS/Caddy is on another VM; the owner added
  the route during installation. DNS-only and the HTTPS route are now verified.
- Public destination: `https://speed.utilibre.org/`, Spanish `/es.html`.
  Backend `10.10.1.43:3225`; Caddy block is
  [`deployment/librespeed/Caddyfile`](../deployment/librespeed/Caddyfile).
  Use DNS-only, no compression or caching. Preserve global HTTP access/error-log
  exclusions; never send visitor IP/UA/cookie/authorization headers to backend.

### Limits and interpretation

Native nginx limits: six active transfer requests globally, downloads fixed at
32 MiB per response, uploads at most 21 MiB/request. The concurrency bucket uses
the server name, not visitor identities. In-flight connection state is memory,
not visitor history. Proxy response/request buffering and temporary proxy files
are disabled. Body/send inactivity timeouts are 15 seconds; upstream I/O 20 seconds.

**Accuracy correction during installation:** the first candidate's 8 MiB/s
download and six-POST/s shaping distorted results. Removed both after the owner
reported inaccurate measurements. Do not restore those throttles as a capacity
fix; disable the test if its resource impact becomes unacceptable. The gateway
CPU quota also increased from 0.5 to 1 core to avoid that avoidable bottleneck.

The upstream UI retains its native download stream selection (desktop six;
some mobile cases three/five), three upload streams, native 20 MiB generated
upload blobs (native mobile quirks may use 4 MiB), ten pings, and fixed 15-second
download/upload windows with adaptive shortening disabled. Download grace is
three seconds. The native measurement/overhead logic is unchanged. No speed
shaping remains. Concurrency, CPU, shared uplink capacity, browser, distance and
Wi-Fi still affect results; a busy service can reject a test. Tests can consume
hundreds of MB or several GB. No calibrated ISP capacity or SLA claim, monthly
byte cap, or guarantee against repeated scripted requests is made. This is not
a relay: it only sends generated bytes and discards incoming bodies.

### Owner's high-latency results and timing follow-up

The owner reported about 180 Mbps here versus Fast.com over 300 Mbps, with
154.7 ms versus 3 ms unloaded latency. This compares different network paths,
not interchangeable measurements of ISP capacity. Fixed timing is intended to
give high-latency transfers more time; it is not a multiplier or calibration.
In Chromium's controlled 150 ms / 300 Mbps emulation, the old adaptive window
finished in 5.259 s at 316.41 Mbps and the fixed run in 17.057 s at 311.31 Mbps.
Both can reach the simulated rate; this did not reproduce the owner's problem.

Caddy's reported TCP send maximum was 4 MiB. A reversible 32 MiB experiment was
suggested using the kernel's documented auto-tuned send-buffer ceiling:
[tcp_wmem](https://docs.kernel.org/networking/ip-sysctl.html#tcp-wmem).
The subsequent final result was 69.45 Mbps down, 28.58 Mbps up, 150 ms ping and
12.8 ms jitter. It did not demonstrate improvement or establish causation.
The owner was asked to restore `net.ipv4.tcp_wmem=4096 16384 4194304`; confirmation
is pending. Do not persist that experiment or claim the underlying route fixed.
The client transport (HTTP/2 versus HTTP/3), outside-path congestion/loss and
actual per-flow state during their test remain unmeasured. TCP tuning does not
explain a QUIC/HTTP3 path by itself.

Fixed-window EN/ES browser workflows passed again via the Caddy LAN override
(desktop and 390×844 emulation), with no outside requests or saved results.
Those roughly 1 Gbps LAN readings are functional checks only. Evidence:
`/opt/utilibre/reports/librespeed-20261011/fixed-window/summary.json`.

### Transport correction — 11 October, 07:17 UTC

The next investigation used Linux `tc netem` on **a disposable client's own
network namespace**, delaying outgoing packets/ACKs 150 ms. No production
interface, route, kernel sysctl or firewall was altered. Chromium requested the
actual speed hostname through Caddy at 10.10.1.3 with normal TLS validation.
Only synthetic transfers to our instance were exercised, sequentially. Unlike
DevTools throttling, this delays the actual transport. It is a latency-only LAN
experiment, not the owner's Internet path or a 300 Mbps bandwidth emulation.

Native LibreSpeed, eight-second measurement plus its grace period, three pings:

| Browser transport forced for this test | Download Mbps | Upload Mbps | Ping ms |
| --- | ---: | ---: | ---: |
| HTTPS HTTP/1.1 | 618.28 | 586.33 | 151.2–151.4 |
| HTTPS HTTP/2 | 224.43 | 58.78 | 151.4–151.6 |
| HTTPS HTTP/3 | 212.52 | Not tested | 152.0 |

All observed backend responses were 200. HTTP/1.1 allows native parallel
transfers to use separate TCP connections; multiplexed protocols do not turn
each request into an independent transport connection. This demonstrates a
material protocol-dependent throughput constraint on our delayed path. It does
not establish that every low outside result has this sole cause or predict the
owner's final throughput. The measurement algorithm and compensation factor
remain unmodified.

**Active on the edge, verified 11 October at 07:27 UTC:** `deployment/librespeed/Caddyfile` uses
the supported hostname-specific [`tls` ALPN setting](https://caddyserver.com/docs/caddyfile/directives/tls#syntax)
`http/1.1`, and sends `Alt-Svc: clear`. This avoids advertising HTTP/3 for normal
new browser visits and clears older alternative-service advertisements. It does
not turn off the shared QUIC listener: a deliberately forced HTTP/3 client can
still connect. Existing browser connections can persist; use a fresh private
window for the owner's acceptance test after reloading Caddy. TLS versions,
ciphers, certificate validation, hostname and no-logging policy are unchanged.
No global HTTP/2/3 setting or other application is changed.

Caddy 2.11.7 adaptation/validation passed (edge last reported 2.11.1). A temporary
loopback-only Caddy with internal test certificates verified that an HTTP/2-capable
curl negotiates HTTP/1.1 for speed with `Alt-Svc: clear`, while the control host
still negotiates HTTP/2 and advertises HTTP/3. Its forced HTTP/3 check confirmed
the caveat above. Certificate verification was bypassed only for these synthetic
loopback certificates, never for production-path tests. The lab config is
`Caddyfile.protocol-check`; it must not replace the production Caddyfile.

An HTTP/2-capable curl reached the actual Caddy edge using the speed hostname,
normal TLS verification and a LAN address override. It negotiated HTTP/1.1 and
received HTTP 200 with `Alt-Svc: clear`. The owner subsequently reported
150.86 Mbps down, 41.94 Mbps up, 158.10 ms ping and 0.12 ms jitter. That is an
improvement over the previous reported run, not proof that the remaining
outside-path issue is resolved or that this change alone caused the difference.
The owner later reported `1.1` from the browser's Protocol column; no full browser
trace was requested or captured. There is no remote Caddy admin/SSH access here.

The owner tests on Ethernet with Firefox and Chromium and needs Tailscale to
retain management access. Do not disconnect it. They confirmed exit node `None`.
Their Windows DNS lookup returned `49.12.84.228`; `Find-NetRoute` for that address
returned `Ethernet`. The duplicated interface name is normal for that command's
address/route objects; a separately pasted `-Unique` failed harmlessly and does
not invalidate those results. These checks establish the normal Windows route,
not every browser's proxy configuration or actual request protocol.
[Tailscale's exit-node documentation](https://tailscale.com/docs/features/exit-nodes)
(checked 11 October) distinguishes default private overlay traffic from public
Internet traffic sent through an enabled exit node. Mere installation/enabling
of Tailscale does not establish that it affects this test. No exit-node or
Tailscale-specific route is evidenced by the owner's checks.

**07:38:58 UTC live follow-up:** one fresh Chromium session, with automatic
protocol selection, exercised native `P_D_U` through the actual Caddy edge in a
disposable client namespace with 150 ms packet/ACK delay. It negotiated HTTP/1.1,
reported 799.56 Mbps down, 596.32 Mbps up, 151.50 ms ping and 0.10 ms jitter.
All 61 observed backend responses were HTTP 200. The entire 27.29-second run
used averages of 3.84% of one CPU for the backend and 18.92% for the shared
gateway; neither cgroup recorded any CPU-quota throttling. Shared-gateway
counters include concurrent ordinary service work; Caddy CPU was not accessible.
This verifies the live correction and rules out a fixed 150 Mbps application
ceiling under these conditions. It does not measure the external Internet route,
its packet loss/congestion, or the owner's browser protocol. No new production
tuning was applied. The disposable container and its network queue were removed.
Further outside-path diagnosis requires client-side protocol/path evidence;
do not treat Fast.com's different destination as an interchangeable capacity test.

Rollback removes only the site's `tls { alpn http/1.1 }` and `header Alt-Svc clear`;
no state or data restore. Do not change the worker to inflate results.

Reproduction: `probe-path.mjs` uses native parameters, mode `SPEED_PROTOCOL=auto`
(default), `h1`, `h2` or `h3`, and optional `SPEED_TEST_ORDER=P_U` for upload or
`P_D_U` for both directions. `SPEED_PATH=edge` (default) uses the LAN address
override; `SPEED_PATH=public` uses public DNS without an override. Targets remain
fixed to our speed instance; arbitrary URLs are not accepted. Run only against
authorized infrastructure, one at a time. Without the isolated delayed namespace
it tests ordinary LAN behavior. The disposable client and Caddy test containers
are removed after checks; their namespace disappears with its `netem` queue.

### Independent Internet test — 11 October, 07:51 UTC

At the owner's explicit request, added and ran the manual-only
`.github/workflows/librespeed-external.yml`. It reuses `probe-path.mjs` and the
existing external-check convention: SHA-pinned checkout, read-only repository
permission, no checkout credentials persisted, exact Playwright Core 1.62.1,
and the hosted runner's installed Chrome. No visitor telemetry, secrets, test
accounts, arbitrary targets, scheduled runs or production configuration changes.

[Successful run 38122737099](https://github.com/mycelibre/utilibre/actions/runs/38122737099)
tested commit `54a80b5df881df910866420f6b0a9d5d8e993a0b`. Runner setup explicitly
reported cloud `Azure`, region `eastus2`, Ubuntu image `20261004.327.1`.
Chrome was `154.0.8037.97`. Normal public DNS and validated HTTPS reached
`49.12.84.228:443`, negotiated HTTP/1.1, with no artificial network delay or
browser throttling. Native `P_D_U`, three ping samples, fixed eight-second
measurement per direction and unchanged native stream/compensation settings:

| Measurement | Result from external runner |
| --- | ---: |
| Download: Utilibre to runner | 859.14 Mbps |
| Upload: runner to Utilibre | 318.52 Mbps |
| Native HTTP ping | 93.40 ms |
| Native jitter | 0.10 ms |

All 52 observed backend responses were HTTP 200. Zero application requests to
other origins, zero page errors, zero cookies and zero local/session storage
entries. Only generated test bytes were transferred. The whole GitHub job took
49 seconds; the measurement timestamp was `2026-10-11T07:51:26.967Z`.

This establishes actual Internet throughput from one independent data-center
route, not just LAN capacity, and excludes a universal 150 Mbps service ceiling
at that time. It does not establish the hosting contract's uplink allocation,
simultaneous-user capacity, home-ISP speed, or the exact cause of the owner's
lower result. Route congestion/loss and endpoint differences remain unmeasured.
The user's HTTP/1.1 report is consistent with the corrected protocol.

Safety bounds: manual dispatch only, no workflow inputs or retry loop, one job
at a time, three-minute job timeout, 20-second navigation timeout, 45-second
completion timeout and browser cleanup. The service's existing six-transfer
concurrency ceiling and per-request payload bounds remain unchanged. This is
time-bounded, not a cumulative byte quota; even a short test can transfer hundreds
of MB or several GB. Do not use frequent scheduled speed tests as monitoring.
The script reports aggregate synthetic results only, not request bodies/headers
or visitor data. Its assertions verify positive native results, successful test
responses and the no-storage/no-third-party-request checks. YAML parsing, scope
checks, JavaScript syntax and rejection of an unsupported route passed locally;
the full new public-path test passed in the hosted runner.

Re-run only when needed: `gh workflow run librespeed-external.yml --ref main`.
Rollback: disable/delete this manual workflow or revert its integration commit;
no production service or data migration needs reversal. Sources:
[GitHub manual workflows](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow),
[hosted runner infrastructure](https://docs.github.com/en/actions/concepts/runners/github-hosted-runners#cloud-hosts-used-by-github-hosted-runners).

Before work, this VM had 21 GiB RAM available and 32 GiB root disk available.
The hosting contract’s exact network allocation remains unverified; the previous
Hetzner review is in `docs/next-features.md`. No purchase, public relay, upload
storage allowance, persistent retention change or backup content is added.

## Integration and maintenance

`prepare.mjs` edits the complete upstream example template, extracts its existing
inline scripts/styles for CSP, supplies EN/ES text, an accessible native button,
Utilibre links and documented upstream test settings. The upstream worker,
measurement logic and backend source are unchanged. The local build refreshes
locked Go dependencies. Configuration alone cannot localize this upstream example
or replace its mouse-only div control. No new frontend framework or runtime
dependency is introduced.

Portal records, language links and guides use the canonical registry. A missing
public route must remain explicitly unavailable; a private test does not make it
live. Guides: `/en/guides/test-connection`, `/es/guias/medir-conexion`. No fixture
file is necessary: the native test generates its own random transfer data.

Build: `sh deployment/librespeed/rebuild.sh`. Validate both Compose projects,
start `docker compose -f deployment/librespeed/compose.yaml up -d`, then recreate
only OmniTools to attach the private network/new listener. Validate nginx before
recreation. Run `node deployment/librespeed/check.mjs` locally, then with
`SPEEDTEST_BASE=https://speed.utilibre.org` after DNS/Caddy is ready. Keep the source
archive and LGPL notices available before public use. Normal updates repeat the
source/dependency audit and these bounded tests; no moving latest-tag deployment.

Rollback: remove/disable the speed Caddy block and catalogue launch setting, stop
only the LibreSpeed backend. The shared static gateway can keep the harmless
inactive route until a reviewed removal of its include, mounts, port and network.
Do not stop OmniTools or remove its assets/data as a LibreSpeed rollback. There
is no user data to restore or back up. Existing account-work backups are unchanged.

## Verification and remaining edge dependency

11 October, final no-throttle candidate:

- Go tests pass; patched Go 1.26.9 `govulncheck` finds no reachable vulnerability.
  A module-only advisory for unimported `x/crypto/openpgp` remains, not a blanket
  zero-findings statement. The cached Go 1.26.8 candidate was never deployed.
- Private HTTP and actual HTTPS edge: Chromium 151.0.7922.34, desktop 1280×900
  and mobile emulation 390×844. English/Spanish keyboard start, complete
  download/upload/ping/jitter, stop, no overflow, no cookie/local-storage state
  and no third-party browser requests pass. Screenshots inspected.
- Response size stays 32 MiB despite an injected larger chunk query. Eight
  overlapping requests yield six HTTP200 and two HTTP429; oversized bodies
  return 413; unused routes, telemetry POST and unrelated Origins are denied.
  No caching, compression, IP lookup or results endpoint exposed.
- Backend namespace has only its internal subnet route; an external HTTPS
  connection fails immediately. Container is non-root/read-only/log-driver none;
  gateway strips incoming headers and query strings from the backend requests.
- Post-check backend idle memory: 15.84 MiB of 128 MiB; existing shared gateway
  4.57 MiB of 192 MiB. Static app is about 100 KiB on disk; worker 28,164 bytes
  and main upstream script 16,996 bytes. This excludes generated test traffic,
  build tooling/cache and source archives; no user storage or backup added.
- HTTPS used an explicit LAN DNS override to the separate Caddy VM, with normal
  hostname/TLS verification. Public DNS is DNS-only; owner reached the app
  externally. Automated outside-network throughput, physical phones and Firefox/
  Opera are not verified. Loopback/LAN results are not advertised as Internet speed.

Private artifacts: `/opt/utilibre/reports/librespeed-20261011/`, final TLS checks
under `https-final/`. Recheck through the actual external route when diagnosing a
visitor's result; do not infer their line speed from these VM-local tests.

## Portal release and rollback

Portal release: `public-utility-portal:0.1.0-librespeed-20261011`. Only the portal
was recreated for catalogue publication; existing service state is untouched.
The existing server-rendered templates, design and bilingual content structures
were reused following Impeccable guidance; no portal CSS or new runtime package.
Source publication and GitHub commit use only this task's reviewed files, leaving
the pre-existing sidecar, TRIP notes and export scripts untouched.

Validation: typecheck/lint, 119 unit tests and FOSS/build gates; 86 broader browser
checks passed initially. Fixed the guide test fixture's missing Wallabag settings
and added LibreSpeed; all six practical-guide tests then passed in dev mode.
The no-JavaScript checks require the actual server renderer, not Vite's development
shell; all six header checks passed against the built private preview. Reviewed
desktop/mobile catalogue and guide screenshots; new native language links, SSR
content, headings/descriptions, canonicals, sitemap entries and missing-page 404
verified on the live portal. This distinguishes harness setup failures from a
production claim; no unperformed all-browser pass is implied.

Portal-only rollback: restore `PORTAL_IMAGE` to
`public-utility-portal:0.1.0-navigation-reflow-20261011`, remove `librespeed` from
`ENABLED_SERVICES` and run `docker compose up -d --no-deps --no-build portal`.
The private before-state is `/opt/utilibre/librespeed-release-5cgKrZ/previous.env`;
restore only relevant settings, never overwrite unrelated subsequent changes.
To stop the test itself, disable its edge route and stop only the LibreSpeed
backend. Do not bring down the shared OmniTools gateway. No user-content restore
is involved. The UI/worker deployment can be recreated from the published source.
