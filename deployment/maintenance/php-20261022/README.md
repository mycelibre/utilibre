# PHP security runtime update — 22 October 2026

This is a finite extension of the existing maintenance/release machinery, not
a new updater. It addresses PHP **CVE-2026-109618** and **CVE-2026-109619** without
replacing application releases or dropping existing local corrections.

## Current result and remaining exposure

Read-only inspection found nine distinct PHP application images in eleven
running containers. No host PHP installation was found. Two images are fixed
and deployed; **seven applications / nine containers remain unpatched for
these disclosures**. A working homepage is not evidence that they are safe.

| Application | Observed PHP before | Required same-branch PHP | State at this checkpoint |
| --- | --- | --- | --- |
| PrivateBin 2.1.0 | 8.5.11 | 8.5.12 | Deployed 18:30 UTC; isolated attachment/privacy workflow and public HTTP passed |
| 4get | 8.4.21 | 8.4.27 | Deployed 18:29 UTC; Apache/PHP and Imagick checks and public HTTP passed |
| FreshRSS | 8.4.26 | 8.4.27 | Exact maintained input recorded; build/application/release checks pending |
| RSS-Bridge | 8.2.34 | 8.2.35 | Exact maintained input recorded; build/application/release checks pending |
| Wallabag | 8.4.26 | 8.4.27 | Exact maintained input recorded; private-library and namespace isolation gates pending |
| TransLite | 8.5.11 | 8.5.12 | Exact maintained input recorded; native URL/cache regression pending |
| Binternet, ordinary and onion | 8.4.21 | 8.4.27 | One shared image, two deployment projects; both still pending |
| Addy | 8.4.21 | 8.4.27 | Candidate and native mail-supervisor release integration pending; generic activation explicitly blocked |
| Pollaris app and worker | 8.5.11 | 8.5.12 | Compiled PHP, not an APK package; separate runtime preparation and workflow tests pending |

Root storage is the blocker for more builds: the 200 GiB main disk has only
about 8 GiB available, the existing maintenance safety reserve. A limited
cleanup removed approximately 280 MB of identified unused build caches and
Trivy's disposable scan cache. Application data, backups, retained images and
advisory databases were not removed. The separate 15 GiB temporary-content
disk is not build scratch space.

On Proxmox, the requested next step is `qm resize 144 scsi0 +20G`. Then inspect
the guest disk and grow its existing first partition/filesystem using the
normal disk-maintenance procedure. Do not format either disk. No expansion
has been observed at this checkpoint; do not run more builds below the reserve.

## Inputs and preservation checks

`specs.mjs` records the eight package-managed maintained image IDs, exact PHP
package versions and application/configuration roots. `inputs.v1.json` pins
the authenticated package bytes used for the two completed updates. Pending
services are not presented as verified integrations or release approvals.

The candidate layer installs only the installed modules belonging to PHP's
native source-package family. It does not replace the application's source,
Composer tree, independent extensions, unrelated OS packages, image startup
configuration, mounted settings or persistent data. Native package signature
verification remains enabled; installation runs without networking. The
application/configuration file hash and complete package/image inventories
must match the expected narrowly scoped delta. Existing native extension,
JSON, regex, password, XML and encryption behavior is checked where present.

The exact original maintained image must still exist locally. This is not a
claim that a fresh Git clone contains every original image or that builds
produce identical image bytes. Artifact identities and package hashes, rather
than moving tags or a fresh dependency resolution, control this replay.

Pollaris's existing image is
`sha256:c0b42f11fe1db00c7beffc45e55c1dc1f7cf1d7919a89f821e3a8bdb4cd86c6d`.
The official `php:8.5.12-fpm-alpine3.23` amd64 manifest resolved to
`sha256:e4ec029f5afe6c8f8c0b5e5d75e27efcc3eefa462af81d9021f2a7311960c3c1`.
That lookup is **not** a tested candidate. Preserve its maintained OS changes,
FPM configuration and compiled intl/pdo_pgsql/zip modules, verify ABI/runtime
compatibility and native poll/worker behavior before activating a replacement.

## Repeatable commands and separate activation

Run from the repository root. All of these checks are bounded; none sends
email, modifies user records, submits indexing notifications or probes an
external search provider.

```sh
node --test deployment/maintenance/php-20261022/checks.test.mjs deployment/maintenance/language-final/release.test.mjs deployment/maintenance/go-final/release.test.mjs
node --test deployment/utilibre/tests/privatebin-storage.test.mjs deployment/utilibre/tests/privatebin-upload-limit.test.mjs
node deployment/maintenance/php-20261022/build.mjs privatebin fourget
node deployment/maintenance/php-20261022/check-privatebin.mjs
node deployment/maintenance/php-20261022/check-fourget.mjs
node deployment/maintenance/php-20261022/scan.mjs privatebin fourget
```

Build re-execution verifies an existing exact candidate and retained package
hashes without downloading, rebuilding or activating. Changed input, missing
package/module, unexpected package change and path/hash errors fail closed.
New candidate construction uses isolated temporary fixtures and authenticated
vendor downloads, then an offline bounded build. It requires extra disk space.

On an initial release, the explicit sequence is `release.mjs prepare KEYS`
then `release.mjs apply KEYS`; preparation records the current exact image,
configuration digest, service scope and public HTTP baseline. Application and
scan evidence must match the candidate and be less than 24 hours old. Apply
uses the existing namespace-aware Compose/release/rollback functions, never
pulls/builds another image, and changes only the selected image pin. PrivateBin's
active `/opt/utilibre/compose.yaml` and its checked-in mirror change together.

These two groups have already been applied. Repeating their `apply` within the
evidence window only verifies the current state; it does not restart them. Do
not delete receipts to force a repeat or run pending applications without
their application-specific gate. Addy additionally requires its existing
`utilibre-addy-smtp.service` FIFO/firewall supervisor. Wallabag must retain its
existing supervisor and namespace egress restrictions.

## Evidence and limits

Private evidence: `/var/lib/utilibre-maintenance/php-20261022/`. Each completed
service has `build.json`, exact retained packages, `application.json`, raw
`scan.json` and `scan-gate.json`. `release.json` records both live replacements.
The public [status record](status.v1.json) contains only non-sensitive facts.

- PrivateBin: 25,000,000 random bytes encrypted in the browser, downloaded and
  SHA-256 matched; oversized input rejected; server ciphertext limit and
  maximum one-week expiry enforced; synthetic expired paste purged; missing
  temporary volume fails closed; Markdown sanitizer preserved; no external
  browser requests. Linux Chromium, desktop and 390-pixel Spanish emulation,
  **not** physical phone/Opera coverage. No real user's paste was inspected.
- 4get: actual Apache/PHP search form, configuration parsing and PNG
  creation/reopen through Imagick, with networking disabled. No third-party
  engine query was made; this is not a new claim that every engine works.
- Native package/configuration preservation passed for both images. The new
  checksum/delta and existing release/rollback tests passed (19 tests), plus
  eight existing PrivateBin upload/storage tests. Repeated build verification
  made no extra candidate or production changes.
- Trivy 0.75.0 compared candidates using the preserved 21 October advisory
  snapshot (`2026-10-21T01:19:53.032404989Z`), without telemetry or database
  refresh. No new high/critical findings were introduced. That snapshot shows
  PrivateBin 0 critical/0 high and 4get 0 critical/1 pre-existing high. This is
  **not current fleet clearance**: the snapshot predates these disclosures;
  the PHP fix is established by vendor fixed versions and signed packages.
- The scheduled 22 October full scan failed its disk preflight. Its failure
  remains visible; this targeted release did not overwrite it or claim a
  successful current whole-fleet assessment. No exploit was run.

## Rollback

The release adapter automatically restores exact previous image pins and
rechecks the predecessor if activation fails. Both predecessors remain local:

- PrivateBin `utilibre-privatebin:2.1.0-security-20261021-p2`, ID
  `sha256:9816ec497b2c53e6f5f009db6f3a07a0d746afd224e99efbfc073370e7e01b17`.
- 4get `utilibre-4get:03ba5d7-p2`, ID
  `sha256:b1046c28a464248f83ee55225048a91fd211b1d03e9543038702e93c9908a19d`.

For an operator-approved manual rollback, restore only that image scalar in
the receipt's actual Compose files (and PrivateBin's checked-in mirror), use
its recorded project/directory and `up -d --no-deps --no-build --pull never`
for the single selected service, then verify image identity, native health
and its public route. No database or user-data restoration is needed for
these runtime-only updates. **Rollback reintroduces the PHP vulnerabilities**;
it is an emergency functional recovery step, not a security solution.

## Primary sources checked on 22 October

- [PHP critical advisory and fixed releases](https://www.php.net/archive/2026.php#2026-10-21-5)
- [PHP OOM advisory](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w)
- [PHP stale-state advisory](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)
- [Debian CVE-2026-109618](https://security-tracker.debian.org/tracker/CVE-2026-109618)
- [Debian CVE-2026-109619](https://security-tracker.debian.org/tracker/CVE-2026-109619)
- [Alpine 3.23 php84 package](https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/php84)
