# PHP security runtime update — 22 October 2026

This finite extension of the existing maintenance/release machinery addresses
**CVE-2026-109618** and **CVE-2026-109619**. It updates PHP over the exact maintained
application images, preserving application versions and existing local fixes.

## Completed release

All **nine PHP applications / eleven containers** now run the fixed same-branch
PHP release. Native versions, exact image identities, unchanged deployment
configuration and scoped health/public-response checks passed. No host PHP
installation was found in the inspected inventory.

| Application | PHP before → after | Relevant isolated verification |
| --- | --- | --- |
| PrivateBin 2.1.0 | 8.5.11 → 8.5.12 | Browser-encrypted 25 MB attachment round-trip, upload limit, one-week expiry, purge and sanitizer |
| 4get | 8.4.21 → 8.4.27 | Apache/PHP form response, configuration and Imagick PNG creation/reopen |
| FreshRSS | 8.4.26 → 8.4.27 | Fictional feed persistence, native OPML export, actual Apache/PHP login page and privacy startup |
| RSS-Bridge | 8.2.34 → 8.2.35 | Native HTTP/TLS/HTTP2, preserved curl impersonation and fictional Atom feed |
| Wallabag | 8.4.26 → 8.4.27 | Two-account login, private article read/export, other-account and anonymous denial |
| TransLite | 8.5.11 → 8.5.12 | 25 native URL/IP/cache checks; no shared submitted-text cache |
| Binternet, ordinary and onion | 8.4.21 → 8.4.27 | 22 native URL/address checks; both deployment projects checked |
| Addy | 8.4.21 → 8.4.27 | Native validation, encryption, MIME construction and login; live SMTP supervisor/listener/allowlist gates |
| Pollaris app and worker | 8.5.11 → 8.5.12 | Two-browser poll creation/voting, CSV export, invalid management-token denial, deletion and worker startup |

The Proxmox-expanded main disk was grown from **200 to 220 GiB**, preserving
the first partition's start and existing ext4 filesystem. No formatting,
reboot or user-data deletion occurred. The filesystem reports about 217 GiB
usable, with approximately 27 GiB available at this checkpoint. Its original
partition table is retained privately. The separate 15 GiB temporary-content
disk was not changed or used for build scratch space.

The full assessment restarted after this expansion and completed at 20:31 UTC:
109/109 images (175 containers), 57 source/dependency inputs and the host's
package inventory checked, with no failed scanner targets. It used advisory
data updated on 22 October at 19:14 UTC. Its outcome is recorded separately in
[status.v1.json](status.v1.json). The wider queue still contains 30 critical and
607 high package/target records awaiting review, including replacement-image
revalidation. These are not counts of confirmed exploits. Completion of this
PHP release is **not** whole-fleet security clearance.

## Inputs and preservation

[specs.mjs](specs.mjs) pins the maintained input image IDs and exact target PHP
versions. [inputs.v1.json](inputs.v1.json) pins authenticated package hashes for
all eight package-managed images and the official compiled-runtime donor,
source checksum and copied-payload checksum for Pollaris.

Package-managed candidates change only installed modules belonging to PHP's
native source-package family. Signed package verification remains enabled and
installation runs offline. Application/configuration roots, Composer files,
independent extensions, unrelated packages and image startup settings must
remain unchanged. Native extension, JSON, regex, password, XML and encryption
checks run where applicable.

Pollaris uses the official amd64 artifact
`php@sha256:e4ec029f5afe6c8f8c0b5e5d75e27efcc3eefa462af81d9021f2a7311960c3c1`.
Only its explicit PHP payload is copied over the maintained application.
Application files, FPM settings, custom intl/pdo_pgsql/zip modules and the
complete Alpine package inventory remain unchanged. Configure options, module
compatibility, FPM syntax and native behavior passed. The four PHP provenance
environment values (version, source URL, signature URL, source checksum) are
the sole image-configuration exception; no application setting changed.
Trivy does not automatically inventory this compiled PHP payload: its fixed
version is verified through vendor artifact/source identity and native PHP.

These are exact-input replay checks, **not demonstrated byte-reproducible
builds**. The maintained base images and retained packages must be available;
a fresh Git clone does not contain those image layers. The source archive
contains the scripts, configuration and input locks, not production secrets,
private state or binary image backups.

## Repeatable checks and separate activation

Run from the repository root. Synthetic checks have no external interface and
do not send mail, touch user records or query real search/content providers.
Builds use bounded authenticated downloads followed by offline preparation;
existing-candidate replay neither downloads nor rebuilds.

```sh
node --test deployment/maintenance/php-20261022/checks.test.mjs deployment/maintenance/language-final/release.test.mjs deployment/maintenance/go-final/release.test.mjs deployment/maintenance/maintenance.test.mjs deployment/utilibre/tests/privatebin-storage.test.mjs deployment/utilibre/tests/privatebin-upload-limit.test.mjs
node deployment/maintenance/php-20261022/build.mjs privatebin fourget freshrss rssbridge wallabag translite binternet addy
node deployment/maintenance/php-20261022/build-pollaris.mjs
node deployment/maintenance/php-20261022/check-privatebin.mjs
node deployment/maintenance/php-20261022/check-fourget.mjs
node deployment/maintenance/php-20261022/check-freshrss.mjs
node deployment/maintenance/php-20261022/check-rssbridge.mjs
node deployment/maintenance/php-20261022/check-native.mjs wallabag translite binternet addy
node deployment/maintenance/php-20261022/check-pollaris.mjs
```

All nine existing candidates were reverified without another build. The
combined unit/release/maintenance/PrivateBin suite passed **58 tests**.
Application workflows are additional checks, not included in that count.

`scan.mjs KEYS` is a same-snapshot comparison against the preserved completed
21 October baseline. It deliberately refuses a changed advisory database.
The fresh fleet scan refreshes the shared database, so the archived comparison
cannot simply be rerun afterward: restore the matching recorded database in a
controlled assessment environment or establish and review a new matching
baseline. Do not bypass the identity check. Raw earlier results remain private.

Initial activation is explicitly `release.mjs prepare KEYS` followed by
`release.mjs apply KEYS`. Preparation records exact predecessor/candidate
identities, configuration hashes, deployment scope and HTTP baseline.
Application/scan evidence must match and be under 24 hours old. Activation
never pulls, builds or migrates data. All declared groups have passed.

A repeated `apply` within the evidence window verifies the already-active
images without restarting them. A failed release requires explicit
`retry`, successful verification of the restored predecessor/configuration
and preservation of its failed-attempt history. Do not delete receipts to
force reactivation.

The existing Addy SMTP supervisor and Wallabag isolation supervisor remain
mandatory. Addy uses its native supervisor rather than a generic Compose
restart; SMTP allowlist and IPv6 restrictions are checked. Wallabag's existing
egress firewall is checked. PrivateBin and FreshRSS retain their active
`/opt/utilibre/compose.yaml` and checked-in mirror.

## Deployment observations

- FreshRSS's canonical URL is **https://rss.utilibre.org/**. An initial
  preparation used the incorrect historical `feeds` hostname. That unapplied
  receipt was retained and replaced before deployment; no public-route
  exception was used.
- Addy's first activation failed a readiness check that ran before native s6
  mail startup finished. The exact old image was restored and independently
  verified. The gate now allows a bounded 60-second settling window while
  requiring every original restriction; explicit retry then passed. The
  failure and rollback remain in the private receipt.
- Pollaris's initial synthetic browser checks exposed test-harness routing
  and modal-navigation errors. The test now serves native static assets and
  uses the application's actual deletion modal. No UI workaround or weakened
  authorization was added.

## Evidence and limits

Private evidence is under
`/var/lib/utilibre-maintenance/php-20261022/`: per-application build/input
receipts, application outcomes, raw scanner output and scan decisions;
`release.json` records all scoped deployments and rollback history.
The public status record contains only selected non-sensitive results.
The completed refreshed scan and queue counts are retained privately as
`fresh-fleet-security.json` and `fresh-fleet-queue-counts.json`, separately from
the earlier same-snapshot candidate evidence. All nine updated images were
checked in that refreshed scan; no matches for the two PHP advisories were
reported. Pollaris's compiled-PHP inventory limitation still applies.

- PrivateBin was checked in Linux Chromium, including a 390-pixel Spanish
  viewport; this is not physical phone or Opera coverage. No real paste was
  inspected. The attachment's decrypted SHA-256 matched its fictional input.
- RSS-Bridge used a loopback HTTP/TLS provider fixture, not real GitHub.
  TransLite and Binternet did not query their upstream providers. Both
  Binternet containers passed release checks; end-to-end Tor retrieval was
  not retested.
- Wallabag used two native BrowserKit sessions and synthetic tmpfs SQLite,
  not a physical browser, external article fetch or migration/restore test.
  FreshRSS's native persistence/export and Apache login page were checked;
  remote feed fetching and authenticated browser interaction were not retested.
- Addy sent no email and changed no real accounts/aliases. Its native app
  checks and live SMTP restrictions are not a new end-to-end delivery test.
- Pollaris used two Linux Chromium contexts and isolated PostgreSQL. The
  native worker started; no emails were sent. Its test HTTP server was PHP's
  built-in server, with FPM syntax and live gateway health verified separately.
  No production database migration or restore was performed.
- Trivy 0.75.0 compared every candidate against the same archived advisory
  snapshot (`2026-10-21T01:19:53.032404989Z`). No new high/critical findings were
  introduced in that comparison. Some pre-existing findings remain. This
  snapshot predates the PHP disclosures, so absence of those CVEs is not
  proof of repair: vendor fixed versions, signed packages or official payload
  identity establish the PHP update. No exploit was run.

## Rollback

Exact predecessors, configuration digests, service scopes and previous pins
remain in the private release receipt; predecessor images were retained.
Automatic rollback restores and verifies those exact inputs on failure.

For an operator-approved emergency rollback, restore only the selected image
scalar in its recorded Compose files and any active/checked-in mirror. Use
the established scoped release path: Addy through its SMTP supervisor,
Wallabag through its isolation-aware process, and both Pollaris app/worker
together. Other recorded services use scoped `up -d --no-deps --no-build
--pull never`, including any recorded namespace dependents. Verify image
identity, native readiness, isolation and HTTP response afterward.

No application schema or persistent-data transformation was introduced, so
this runtime rollback does not require database restoration. **Rolling back
reintroduces the PHP vulnerabilities** and is only emergency functional
recovery. Source publication preserves its previous archive/index separately.

## Primary sources checked on 22 October

- [PHP critical advisory and fixed releases](https://www.php.net/archive/2026.php#2026-10-21-5)
- [PHP OOM advisory](https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w)
- [PHP stale-state advisory](https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp)
- [Debian CVE-2026-109618](https://security-tracker.debian.org/tracker/CVE-2026-109618)
- [Debian CVE-2026-109619](https://security-tracker.debian.org/tracker/CVE-2026-109619)
- [Alpine 3.23 php84 package](https://pkgs.alpinelinux.org/package/v3.23/community/x86_64/php84)
