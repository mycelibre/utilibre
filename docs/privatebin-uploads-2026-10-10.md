# PrivateBin attachments and expiry — 10 October 2026

The owner authorized 25 MB uploads and a maximum one-week expiry. Existing
instance URL: <https://paste.utilibre.org/>. This uses the pinned native
PrivateBin 2.0.6 application; no new storage service or account system.

## Limits and privacy

| Boundary | Applied setting |
| --- | --- |
| Browser file selection | 25,000,000 bytes total across attachments; picker, drop and paste admission checks |
| Native server limit | 35,000,000 bytes of base64 ciphertext; the server cannot inspect encrypted file sizes/names |
| HTTP/PHP body | 40 MiB, including JSON/encryption overhead; public full-size check passed without edge changes |
| Lifetime | Default one day; 5m, 10m, 1h, 1d, 1w only; no forever option |
| Cleanup | Native `administration --purge` each minute, subject to service availability; access rejects expired records immediately |
| Disk safeguard | Since 11 October: separate 10 GiB disk; reject new POSTs below 1 GiB available or when space cannot be read; existing reads/deletion remain available on a mounted disk. Missing/invalid volume marker returns 503, including health checks |
| Processing budget | 0.5 CPU, 768 MiB container memory with swap disabled, one on-demand PHP worker, 384 MiB PHP limit, 128 MiB body-buffer tmpfs |
| Other controls | Existing 10-second native rate limit, disabled discussion, password and burn-after-reading options, native CSP and no container logs retained |

A random 25 MB test file produced approximately 33.6 MB of ciphertext. The
extra allowance is necessary for native encoding, not extra advertised file
capacity. Direct clients can bypass the browser's raw-byte cap but cannot bypass
the native ciphertext limit. This is **not** a 100-slot system or per-user quota.
Since 11 October the filesystem is dedicated to PrivateBin; the disk safeguard
preserves emergency headroom. These budgets are not concurrency claims.
After the public checks the container's cgroup peak was 251,953,152 bytes
(about 240 MiB), with zero OOM/max events. This includes that bounded test
interval, not a sustained-load measurement or predicted future usage.

Text, file contents and filenames use native browser encryption. Keep the full
sharing link private; it carries the key, and an optional password adds another
requirement. Recipients can retain copies. A compromised delivery path could
serve altered application code: this is not an unconditional anonymity claim.
Native CSP was not weakened to enable embedded PDF previews; files can be
downloaded even when a browser cannot preview them.

New application backups exclude PrivateBin content. Saved account work remains
protected. Earlier backups and externally managed whole-VM snapshots are a
separate boundary; neither was deleted or newly inspected here. Logical expiry
and unlinking do not prove physical erasure from storage or historical copies.
No live user data was copied for the original attachment tests. The 11 October
disk migration below copied existing encrypted records without decrypting them,
verified them, then removed the old directory. See [backup policy](backups.md).

## Small integration changes

- Supported `fileupload`, `sizelimit`, expiry and custom-template configuration.
- `upload-limit.js`: native event admission and existing PrivateBin error/attachment
  APIs; no new encryption/upload implementation. Seven boundary/event tests.
- `upload-guard.php`: pre-request free-space and deployment-marker admission;
  never reads user content.
- Supported PHP/FPM/Nginx includes and scoped Compose mounts/resources.
- `privatebin-purge.sh` and systemd timer: invoke native expiry cleanup. The
  wrapper detects native 2.0.6's caught-error/zero-exit behavior by requiring
  its exact success output. No identifiers or error contents are persisted.
- Existing homepage template patch and EN/ES catalogue/help/guide metadata
  updated; native interface, attribution, private noindex policy and routes kept.

Image remains
`privatebin/nginx-fpm-alpine:2.0.6@sha256:13290e2f04bfd98cf8fc7e8d216fb76b2b2d12373d4923b859cd41c2d984fde8`.
Template source revision: `921ab83f268add709413a87206e4e1c2e3c2063d`.
Patch applies/reverses against a clean worktree and reproduces the checked-in
template byte-for-byte. No upstream dependency or crypto code changed.

## Verification and release

Isolated candidate evidence:
`/opt/utilibre/reports/privatebin-uploads-CaJTF6/result.json`.
Native Chromium created a paste with a random 25,000,000-byte file, a second
page downloaded it, and SHA-256 matched. The UI rejected 25 MB + 1 without an
upload; server rejected oversized valid-format ciphertext. Server lifetime was
no greater than 604800 seconds. Native cleanup removed an expired fictional
record. Low-space function false/boundary checks passed without filling a disk.
Desktop and 390px Spanish views had no overflow, external requests or script
errors. Screenshots inspected; this is not a physical-phone or Opera test.

Production backend configuration applied; only PrivateBin was recreated.
Nginx/PHP validation passed; the enabled timer's native command exits successfully.
Public full-size creation/decryption/download/hash/deletion passed at 22:22 UTC:
`/opt/utilibre/reports/privatebin-uploads-yRJ7fE/result.json`. The first public
attempt timed out waiting for the attachment; the same workflow then passed
with targeted response diagnostics, without an edge/config change. The first
timeout was not reproduced or diagnosed; this is not an uptime/reliability claim.
All synthetic pastes were deleted with their native deletion tokens. Public
homepage/icon/noindex regression checks also passed. No external browser
requests were observed on either EN/ES tested path. The directory indicator is
still awaiting its external refresh.
The configuration-only recovery rehearsal passed using a fresh archive with no
paste payloads: `/opt/utilibre/reports/privatebin-restore-B5NtvP/result.json`.
New encrypted content is intentionally not recoverable from that archive.
Portal typecheck/lint/build, 118 unit tests, 22 launch-configuration tests, seven
file admission tests, two backup exclusion tests and four targeted desktop/mobile
catalogue browser checks passed. The test dev server hit the host's inotify
instance limit; using polling for that short-lived test process resolved it,
without changing host sysctls or production runtime. Existing SSR split warnings
remain non-fatal. Release `4bec1b8` is deployed as
`public-utility-portal:0.1.0-privatebin-uploads-20261010`. Live EN/ES catalogue/help
and guide checks passed; evidence and portal rollback are in
[the operator work queue](work-queue.md). Both services are healthy.

## Temporary-disk migration — 11 October 2026

VM144's empty `scsi2` (10,737,418,240 bytes, serial `drive-scsi2`) was identified
and formatted as ext4, then mounted by UUID with `nodev,nosuid,noexec` at
`/opt/utilibre/temporary`. Proxmox backup exclusion is owner-confirmed; no
independent host read was available. Only PrivateBin was briefly stopped.
Existing encrypted data was copied with ownership/modes and SHA-256 verified
before startup. After the public attachment test passed, the old
`/opt/utilibre/data/privatebin` directory was removed. Its live counterpart is
`/opt/utilibre/temporary/privatebin`; no recovery copy of expiring data remains
from this migration. This is unlinking, not physical erasure of prior blocks.

The long bind refuses missing source creation. An isolated mount namespace
confirmed that the bare parent has mode 000 and no fallback child, without
unmounting the production disk. Missing/wrong marker HTTP 503 and recovery,
1 GiB admission boundary, oversize rejection and native expiry passed in the
isolated candidate: `/opt/utilibre/reports/privatebin-uploads-jKp80R/result.json`.
The real Compose missing-source test and 15 admission/account/backup tests pass.
Public 25 MB browser encryption/download/SHA-256/deletion passed at 01:33 UTC:
`/opt/utilibre/reports/privatebin-uploads-Qr8r65/result.json`. EN/ES Chromium,
390px mobile emulation; no external HTTP requests or script errors observed.
This does not test physical phones, Opera, sustained capacity or uptime.

Native expiry cleanup passed; its minute timer and the saved-work backup timers
are enabled/active. Configuration-only recovery passed at
`/opt/utilibre/reports/privatebin-restore-xumif0/result.json`, with no paste
payload backup or old-generation pruning. PrivateBin's live cgroup verifies
`memory.max=805306368`, `memory.swap.max=0`. About 9.63 GiB was available after
migration, before the 1 GiB admission reserve; this is not advertised capacity.
No other application, VM139, Caddy route, backup job or snapshot was changed.

Configuration rollback copies (no content):
`/opt/utilibre/reports/privatebin-disk-20261011-IGTYWA/`.
The UUID mount, recovery and rollback procedure is
[PRIVATEBIN-STORAGE.md](../deployment/utilibre/docs/PRIVATEBIN-STORAGE.md).
No production reboot or host-loss recovery was performed. Other temporary
services were not moved; Proxmox `backup=0` does not cover ordinary VM/ZFS
snapshots or old copies.

## Rollback without losing content

Root-private pre-change configuration/Compose:
`/opt/utilibre/reports/privatebin-upload-rollback-6xjYKP/`. It contains no paste
payloads. Before an emergency rollback, compare for newer operator changes.
Restore only the prior PrivateBin config/template/Nginx include and service
mount/resource block, then recreate only `privatebin`. Never overwrite the data
mount or restore expired payloads. Keep scheduled cleanup unless its own code
is at fault. Do not blindly disable file support after people have uploaded:
the old UI can hide existing attachments; a creation-only maintenance pause
preserves the native retrieval UI while investigating.
After the 11 October migration, preserve `temporary/privatebin`, its volume
marker checks and the 1 GiB threshold even when reverting earlier application
changes. Do not restore the old root-disk bind from these historical copies.

## Directory refresh (external)

The instance is already in the [official directory](https://privatebin.info/directory/).
Its File upload column still showed a cross at this check. Public HTML now has
the native `id="attachment"` marker checked by the directory's scanner. The
[directory source](https://github.com/PrivateBin/Directory) documents a scheduled
full scan; its existing-instance `/check` handler reads stored results rather
than forcing a rescan. No duplicate submission or maintainer message was sent.
The next successful scan should update the field; timing and the green check
are not under this server's control.

**11 October, 19:58 UTC follow-up:** the sanitizer security backport introduced
a separate discovery regression: its renamed JavaScript asset no longer matched
the directory's required `js/privatebin.js?VERSION` pattern. Without a detected
version the scanner rejects the page as an instance, even with the attachment
marker present. The p2 security image/template now preserve the native filename,
use a release query parameter for cache invalidation and retain the sanitizer
and matching SRI. This corrects the server-side incompatibility; a successful
directory rescan is still external and has not been observed.

The exact directory detector passes on the public HTML. An isolated candidate
and the public service passed real 25 MB browser encryption, decryption, download
and SHA-256 equality, oversize refusal, one-week maximum and sanitizer checks.
The public fictional paste was deleted; no real paste was inspected. No change
to upload enablement, retention, storage, encryption or tracking policy.
Evidence and scoped rollback: [security recipe](../deployment/utilibre/privatebin-security/README.md).

References inspected 10 October 2026: pinned [configuration](https://github.com/PrivateBin/PrivateBin/blob/2.0.6/cfg/conf.sample.php),
[ciphertext validation](https://github.com/PrivateBin/PrivateBin/blob/2.0.6/lib/Controller.php),
[native cleanup](https://github.com/PrivateBin/PrivateBin/blob/2.0.6/bin/administration)
and [directory detector](https://github.com/PrivateBin/Directory/blob/master/src/models.rs).
