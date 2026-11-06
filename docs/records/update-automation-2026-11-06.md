# Update automation checkpoint, 6 November 2026

SearXNG was updated at **01:57:42 UTC** through the existing guarded updater.
No application settings, search engine selections, limiter rules or submitted
public-instance URL were changed. The manual run omitted `--notify`; it sent
no email. PrivateBin's subsequent update is recorded below.

## SearXNG release and schedule

Previous image:
`docker.io/searxng/searxng:2026.11.2-cccbc9e15@sha256:892ed5710603e38f9dc201e6a0b2f3f14dbdb8108edcadac30e55b165c979fb7`.

Current image:
`docker.io/searxng/searxng:2026.11.5-3e95f6cd2@sha256:ffad724acd87b8dd312328d18da88ddd42e5c4b1d23231594662620053c13cae`.

The 5 November 02:29 UTC scheduled run succeeded and found the deployed image
current. The next official image was built at 13:15 UTC that day, after that
check. This was the ordinary daily polling gap, not a failed updater.

Verification used the existing implementation: 19 offline updater tests pass,
local pagination/redaction policy tests pass, the candidate's CA trust check
passes, and actual English/Spanish searches return at least three result links
before, in private staging, and after activation. The production checks used
verified HTTPS through the private Caddy edge; the separate public homepage
probe was reachable. They do not prove every engine works or establish an
independent external-network uptime history. The running container is healthy.

`utilibre-searx-update.timer` now runs at **02:20, 08:20, 14:20 and 20:20 UTC**,
plus up to ten minutes' jitter. Native systemd verification and all four calendar
times passed; the installed timer is enabled and active. The existing process
lock, exact image identity, local repair checks, staging, scoped release,
interruption recovery and rollback remain unchanged. No new scheduler or LLM
was added. Registry/compatibility/test failures still block activation.

Private release evidence remains in `/var/lib/utilibre-searx-updater/last-run.json`
and the updater's run directory, with the configuration-only rollback archive.
Public release identity: `/opt/utilibre/update-public/searxng.json`.

Schedule rollback: restore only the saved timer from
`/var/lib/utilibre-searx-updater/timer-before-20261106/utilibre-searx-update.timer`
to `/etc/systemd/system/utilibre-searx-update.timer`, reload systemd, then restart
the timer. This restores daily polling and does not change the running app.
Application rollback requires the existing exact-pin/configuration/health gates;
keep the previous image and never restore a whole older `.env` over newer changes.

## Initial assessment before PrivateBin implementation

The completed 5 November 03:32 UTC upstream report lists 112 checked providers:
110 in `review-before-update`, SearXNG using its guarded upstream updater, and
Redlib using its guarded **reviewed-artifact** updater. A daily release/advisory
check is not automatic installation. Redlib also stops for review on an unknown
revision; that is distinct from SearXNG's compatible official-image path.

PrivateBin 2.1.1 was published on **4 November at 23:20 UTC** and detected by the
5 November 03:32 UTC report. At that checkpoint its running application remained 2.1.0 with local
repairs. There was no PrivateBin automatic upgrade job to execute the detected
release. The new release includes SVG-preview, request-size and Markdown
sanitization corrections; previous package scans do not clear those new issues.
Source: [official 2.1.1 release](https://github.com/PrivateBin/PrivateBin/releases/tag/2.1.1).

The initial implementation gap was an unattended PrivateBin path reusing its existing native
tests and release procedure while preparing the new image and matching template,
preserving sanitizer behavior, 25 MB attachments, one-week maximum expiry,
temporary-volume checks and all subsequent runtime repairs. Synthetic old-paste,
password, encryption/decryption, upload-boundary, deletion and privacy checks
must pass before activation. The current 2.1.0 hash-gated patch cannot simply be
applied blindly to 2.1.1. Unexpected changes must stop and retain a visible review
item, not discard patches or claim success. This integration is **not completed**
by changing the SearXNG timer, and there is no fleet-wide unattended-update claim.

## Follow-through: PrivateBin 2.1.1 and unattended patch updates

The earlier PrivateBin gap above is now closed. At **02:22:11 UTC** the scoped
updater completed the live 2.1.1 release. Source:
`802b834509628a94a376112ea6561914741d649e`. Image:
`sha256:95d4a7ef121809772bbae5021badc46f0188361677da1e4aa41bc56cddb63f9d`.
It preserves the reviewed runtime image
`sha256:e3fbe8ac43db6ac84c2a566ca276fffa68aec0b0788fbc2f262271d9cc733d67`
and all 69 Alpine / 35 Composer packages. No data migration or content backup.

The native 2.1.1 sanitizer/optional-control fixes replace the old app-JS
backports. Our template patch still applies exactly. Template/code now ship
together; retention, privacy, upload settings and temporary storage stay intact.
Native tests passed for a 25 MB encrypted attachment and download hash, local
oversize rejection, server full-request limits, one-week expiry, native purge,
old Unicode-password paste/attachment, new Unicode-password paste, burn-on-read,
no-key access, deletion, disabled discussions, safe SVG previews (including
Unicode delimiters), Markdown presentation restrictions and EN/ES discovery.
No unrelated browser requests were observed. Desktop Linux Chromium and mobile
viewport emulation were used; no physical-phone/Opera coverage is claimed.

The same-database scan retained two UNKNOWN findings, with **no added findings
and no critical/high findings** in these two images. This does not clear the
fleet. Database identity and raw reports are saved. Twelve offline updater tests
cover version guards, unsafe archives, malformed/missing scanner coverage,
timeouts, secret-free child environments and failed-activation rollback. The
51 existing/extended maintenance, upstream-review and PrivateBin unit checks
also pass. A real interrupted synthetic check removed its own container/network.
A repeated apply returned `up-to-date` without replacing the production container.
The 2.1.1→2.1.1 two-way data-format gate was separately exercised; it does not
prove downgrade compatibility with 2.1.0.

Evidence: `/var/lib/utilibre-privatebin-updater/run-r19tbh_k/`, subsequent
interruption/reverse-compatibility/advisory regression receipts, and
`/var/lib/utilibre-privatebin-updater/last-run.json`. Private permissions apply.
The first rollback record was reconstructed from the committed PrivateBin
service block and verified by exact forward transformation against both files;
subsequent deployments save the original configuration before activation.

The installed, enabled timer checks every six hours at **03:05/09:05/15:05/21:05
UTC +0–10 minutes**. Its native first run succeeded. New release families,
changed dependencies/configuration, new or edited application advisories,
stale/missing scans and failing workflows remain explicit review holds.
No LLM is involved. No manual-run email, cache purge or directory message sent.
[Policy, commands, limitations and rollback](../../deployment/utilibre/privatebin-updater/README.md).

The refreshed **02:28:40 UTC** upstream inventory covers 112 providers with no
failed release lookups: SearXNG guarded updater, Redlib reviewed-artifact updater,
PrivateBin guarded patch updater, and **109 review-only providers**. A strict
comparison of recorded versions finds **42 newer stable release candidates**;
14 tagged comparisons remain ambiguous. These are not 42 verified out-of-date
running services, and this work does not claim those 109 applications were
upgraded. The comparison excludes downgrades and ambiguous/prerelease strings,
recognizes our documented local revision suffixes, and feeds the existing
weekly digest. No new notification schedule was added. Redlib's independent
read-only check returned `up-to-date`.

## Portal release and final checks

At **02:48:40 UTC**, the portal deployed image
`sha256:d53e7d50db9a679656e301fc5d24a3acc907bcfa58682b17a3211f24632052a3`
from clean source commit `e058f2d`, preserving runtime image
`sha256:e14dc8727bc020940f1f733d4ee95399232290c31a92655e02357f632178b0b6`.
Only built frontend/SSR and the tracked server files changed. Before preparation,
the deployed server files exactly matched the committed baseline. Typecheck,
lint, FOSS policy/build and **all 120 unit tests** passed. One pre-existing test
expected the superseded Redlib revision; it now checks the approved recipe's
revision instead of another hardcoded value. The isolated image's 21 extracted
packages and zero scanner findings match its predecessor under the same database.

The PrivateBin version in the software/transparency pages now reads the existing
read-only deployment-record mount, as SearXNG already did. Native health, isolated
EN/ES server-rendered pages and actual public EN/ES software pages with the live
embedded version were verified. The first portal attempt rolled back after
Python urllib received a public 403; normal curl requests returned 200. Retrying
the exact artifact with the public-page/embedded-config gate passed. No CDN,
origin access rule or privacy control was relaxed. This does not claim that every
automated client is accepted by the edge.

Portal rollback: compare the single `PORTAL_IMAGE` line against the private
receipt in `/var/lib/utilibre-privatebin-updater/portal-release-wvneg3yg/deployment.json`;
restore that line to the recorded previous image only, then recreate only portal
with `docker compose -p public-utility up -d --no-deps --pull never portal` from
the repository and verify native health. Preserve all other `.env` fields.
PrivateBin's independent image/data are unaffected by this portal rollback.

An isolated native PrivateBin discovery run also passed under the installed
updater service's ProtectHome/NoNewPrivileges settings: approximately 4 seconds,
337 MiB peak host-process memory, zero swap in that run. This is a test-run
measurement, not a production concurrency estimate. PrivateBin and SearXNG timers
are enabled/active; the final PrivateBin service run returned `up-to-date`.
