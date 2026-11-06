# Update automation checkpoint, 6 November 2026

SearXNG was updated at **01:57:42 UTC** through the existing guarded updater.
No application settings, search engine selections, limiter rules or submitted
public-instance URL were changed. The manual run omitted `--notify`; it sent
no email. No PrivateBin update is claimed in this record.

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

## What is and is not unattended

The completed 5 November 03:32 UTC upstream report lists 112 checked providers:
110 in `review-before-update`, SearXNG using its guarded upstream updater, and
Redlib using its guarded **reviewed-artifact** updater. A daily release/advisory
check is not automatic installation. Redlib also stops for review on an unknown
revision; that is distinct from SearXNG's compatible official-image path.

PrivateBin 2.1.1 was published on **4 November at 23:20 UTC** and detected by the
5 November 03:32 UTC report. Its running application remains 2.1.0 with local
repairs. There is no PrivateBin automatic upgrade job to execute the detected
release. The new release includes SVG-preview, request-size and Markdown
sanitization corrections; previous package scans do not clear those new issues.
Source: [official 2.1.1 release](https://github.com/PrivateBin/PrivateBin/releases/tag/2.1.1).

A reliable unattended PrivateBin path still needs to reuse its existing native
tests and release procedure while preparing the new image and matching template,
preserving sanitizer behavior, 25 MB attachments, one-week maximum expiry,
temporary-volume checks and all subsequent runtime repairs. Synthetic old-paste,
password, encryption/decryption, upload-boundary, deletion and privacy checks
must pass before activation. The current 2.1.0 hash-gated patch cannot simply be
applied blindly to 2.1.1. Unexpected changes must stop and retain a visible review
item, not discard patches or claim success. This integration is **not completed**
by changing the SearXNG timer, and there is no fleet-wide unattended-update claim.
