# PrivateBin 2.1.0 — 21 October 2026

Upgraded only `utilibre-services-privatebin-1`. Public URL remains
<https://paste.utilibre.org/>. No Caddy changes, new service, account, telemetry,
data migration or backup of temporary user content. The synthetic public paste
was deleted. Existing encrypted records were neither read nor copied.

## Exact release and retained repairs

- Upstream source `c6f1b7186b8ab37aaf57ef4a2bcb58886e24e9ae`, tag 2.1.0,
  released 18 October; Zlib license retained.
- Base `privatebin/nginx-fpm-alpine:2.1.0@sha256:b221c93dea1610380c5a64ca0318d1447f5197f7a4fc790467eb14e25eb15ba7`.
- Deployed `utilibre-privatebin:2.1.0-security-20261021-p2`, image identity
  `sha256:9816ec497b2c53e6f5f009db6f3a07a0d746afd224e99efbfc073370e7e01b17`.
- PHP 8.5.11 and previous OpenSSL/runtime fixes are retained by upstream.
  Checksum-pinned, signed Alpine libx11 1.8.14-r0 and libxpm 3.5.20-r0 close
  one high and four medium package records present in both old and base images.
- Existing Markdown `FORBID_ATTR` restriction retained, SRI regenerated.
  Patched script SHA-256 `e2cb643bce9faef8fee1a6d4149cce0da08913c17508f5eece35bd7b7a1e4191`.
- Backport upstream [0250510](https://github.com/PrivateBin/PrivateBin/commit/0250510c15a052943e0f718df468ec08607dfb1d): tolerate missing optional discussion/password controls. The first candidate reproduced the native crash when `discussion=false`; enabling discussions was not used as a workaround.
- Template regenerated from the pinned source; upload guard uses native
  `window.PrivateBin`, replacing the removed jQuery namespace. No custom
  encryption or storage implementation. Source/template checksum preconditions
  reject incompatible input. Runtime files and pinned package artifacts are
  captured by the recipe, not handwritten changes inside a running container.

25,000,000 raw bytes, 35,000,000 ciphertext bytes, default one day / maximum
one week, password/burn options, disabled discussions, native traffic limit,
one-minute purge timer, 1 GiB free-space reserve and volume-marker checks remain.
The existing backup-excluded data mount and project quota are unchanged.
Read-only/non-root execution, dropped capabilities, no-new-privileges,
0.5 CPU, 768 MiB memory with no swap, tmpfs buffers and disabled container logs
remain. This is not a concurrency or uptime claim.

## Verification

All evidence below is private, synthetic and free of real user content:

| Check | Result / receipt |
| --- | --- |
| File admission, backup exclusion, absent mount | 10 Node tests passed |
| Native candidate | `/opt/utilibre/reports/privatebin-uploads-GxKT9l/result.json` |
| Old password paste/attachment, deletion token, new burn-after-reading | `/opt/utilibre/reports/privatebin-upgrade-qE2oTd/result.json` |
| Public 25 MB encryption/download/SHA-256, oversize rejection, one-week expiry, sanitizer | `/opt/utilibre/reports/privatebin-uploads-NwAshs/result.json`, 05:29 UTC |
| Public EN/ES, metadata, private-path noindex, local icons | `/opt/utilibre/reports/privatebin-discovery-20261009/public-result.json`, refreshed 05:28 UTC |
| Runtime image and release scope | `/opt/utilibre/reports/privatebin-210-3VFbZX/` |

Candidate checks also passed native expired-record cleanup, ciphertext oversize
rejection, missing/wrong volume failure and recovery. Browser journeys observed
no external HTTP requests or script errors. Coverage is Linux Chromium desktop
and 390px mobile emulation, not physical phones or Opera. No real paste was used
for compatibility testing. Package scans cannot establish absence of all defects.

Trivy 0.75.0 compared old, upstream-base and final images with the same advisory
snapshot freshly downloaded on 21 October, with no mid-scan refresh. Final
Alpine/Composer/detected JavaScript package results contain **zero findings**;
this is this artifact's scan result, not fleet-wide clearance or a security
guarantee. Raw results are retained as `previous-scan.json`, `upstream-scan.json`
and `candidate-scan.json` in the release receipt directory. All 13 published
PrivateBin advisory identities/ranges were rechecked against the new release;
runtime-bound review keys now follow the new image and template.

One simultaneous test could not allocate a Docker bridge; the checks passed
when run sequentially. Another harness attempt hit Chromium inspector-cache
eviction for the large request: native Fetch response capture fixed the test,
without modifying the application's request behavior. These attempts are not
counted as successful workflow checks.

## Rebuild and rollback

Use the [reviewed build/test recipe](../../deployment/utilibre/privatebin-security/README.md).
The native template preparer pins both commit and original checksum. Local
source checkout: `/opt/utilibre/src/privatebin-2.1.0`. The prior checkout is
retained for historical source offers. No automatic floating-tag upgrade.

Configuration-only rollback snapshot:
`/opt/utilibre/reports/privatebin-210-3VFbZX/rollback/`. Prior image:
`utilibre-privatebin:2.0.6-php-security-20261011-p3`.

If rollback becomes necessary, stop **only** PrivateBin; restore only the saved
`bootstrap5-utilibre.php` and `upload-limit.js`, and set only its Compose image
back to the prior tag. Validate Compose, then `up -d --no-deps --no-build --pull
never privatebin`. Do not restore the full old Compose file over newer changes,
touch the temporary data mount, change expiry, or recover expired content.
Image/template/JavaScript must change together. Prior fixes are retained in the
old image, but rolling back also gives up this release's newer fixes.

No database migration or storage format rewrite was performed. Future updates
must repeat compatibility checks; this run does not prove arbitrary downgrades.
The source/recipe updates were AI-assisted and reviewed through the checks above.
