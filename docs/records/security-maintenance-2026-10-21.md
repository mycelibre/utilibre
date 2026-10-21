# Security maintenance — 21 October 2026

This record distinguishes installed repairs from assessment and prepared host
changes. It is not a security certification or an assertion of zero findings.
Integration and tests were prepared with AI assistance and executed locally.

## Installed and verified

PrivateBin 2.1.0 is covered by the separate
[upgrade record](privatebin-upgrade-2026-10-21.md), commit
`207f6d3fcb013cd5ee9b24350901beaec48b1b86`. Upload, expiry and existing privacy
fixes were retained; native and synthetic 25 MB attachment checks passed.

Twelve Python application images (fifteen runtime roles) now carry certifi
2026.10.19. Four additionally have Pillow 13.0.0; BeaverHabits has uv 0.13.4;
four have aiohttp 3.14.4/yarl 1.25.1. See the
[rebuild, tests and rollback instructions](../../deployment/maintenance/certifi-20261021/README.md).
All scoped releases passed exact-image, native health, configuration and
existing namespace checks. The earlier SimpleLogin public HTTP 502 remains a
separate edge-route issue; its native login is reachable. No mail was sent.

Penpot's admin-console critical TanStack fix passed native old-fails/new-passes
GET/POST regression tests and is deployed. The
[exact backport](../../deployment/maintenance/tanstack-20261021/README.md)
preserves upstream attribution and old package metadata; the two raw version
findings have explicit, expiring, exact-byte mitigation evidence.

The existing nginx staging/release path installed signed Alpine Expat 2.9.0-r0
and libX11 1.8.14-r0 in 41 shared gateways and 27 application-container roles
(26 distinct application images). Every selected nginx configuration parsed;
image runtime settings and unrelated installed package versions matched their
predecessors. Complete application-root hashes matched for all 27 roles.
Five representative alternate-loopback route checks also compared responses
and security headers. All 68 post-release endpoint/status comparisons passed.
These checks do not newly certify every browser workflow or upstream proxy.

The shared nginx image is `utilibre-nginx:1.30.5-alpine-security-20261021`,
ID `sha256:088c9c6d445bec0ca14f15b5ee92a03cea3142d55bec4535df9e750ab2f1f48c`.
Application-image tags retain their previous versions and append
`-libs20261021`. The existing pinned nginx 1.30.5, TIFF and zlib fixes remain.
The shared-runtime scan had zero critical/high matches and one other finding;
that is not a whole-fleet or application-dependency clearance.

### Rebuilding and rolling back the nginx layer

`deployment/maintenance/Dockerfile.nginx-expat-x11-security` pins the two
same-branch Alpine APKs by SHA-256 and verifies their vendor signatures using
the predecessor's trusted APK keys. Expat uses MIT and libX11 uses X11/MIT
licensing; no new application dependency or third-party runtime request is
introduced. APK downloads come from Alpine's official v3.24 x86_64 repository;
installation/building has network access disabled. The unchanged upstream
package notices remain in the images.

The existing `check-nginx-tiff-security.mjs` and
`release-nginx-tiff-security.mjs` have an explicit `--library-refresh` mode.
Historical modes retain their earlier input pins. Staging requires the exact
reviewed predecessor; it intentionally rejects the already-updated live scope
instead of silently rebuilding from a different image. Use retained original
inputs for isolated replay, not a production downgrade merely to rerun staging.
Release preparation records non-image configuration hashes and endpoint
baselines; activation rejects unrelated configuration changes and mutable-tag
drift. It preserves an 8 GiB recovery floor. Production activation remains a
separate, expressly authorized operation.

Protected receipts are `nginx-libraries-20261021/{stage,artifacts-stage,
gateways-release,artifacts-release,shared-scan}.json` under the maintenance
directory. Each release row records exact old/new references and image IDs.
For rollback, restore only that row's old image pin and use its native release
method: TRIP/13ft/Unfurl require their systemd supervisor; Wallabag requires its
documented stop/recreate/start sequence. Other rows use their exact Compose
project/files and service with `--no-deps --no-build --pull never`. Recheck the
recorded endpoints. No database/schema change was made; rollback does not
restore or alter user data.

## Assessment integrity

Revalidated earlier fixes using retained signed/vendor packages, exact live
file hashes, native test evidence and same-role image ancestry. An omitted
completed GnuTLS-minimization receipt had prevented valid downstream repair
proofs from following the current images; adding its explicit receipt does not
waive a finding by itself. Mount-component review now follows such completed
overlays and still checks the installed library bytes. Negative tests reject
missing links, different roles and post-scan releases.

Linux header attribution now checks all affected roles and the complete shipped
header payload rather than a filename list from one role. The separately
requested current-CNA assessment uses pinned cvelistV5 revision
`2f073091b14641caef8f31f3ae9cfc4eef3c201e`; archived attribution remains pinned
to its earlier data. Ambiguous header overlap remains unresolved. No header
attribution constitutes clearance of the running kernel.

At the 06:39 UTC complete scan: 109 image targets, 57 source targets and host
coverage were checked. Raw package/target occurrences were 69 critical and
3334 high. These include repeated and vendor-backported findings; they are not
counts of exploitable bugs. Subsequent exact review left one unresolved
critical record (host SSH), while high-severity work continues. A later image
change requires fresh scanning/revalidation and can reopen an exact-artifact
decision. Raw evidence and expiry are preserved, never hidden by a rule or
severity change.

The post-release scan completed at **07:05:31 UTC** with the same 109 image,
57 source and host targets checked. It contains 69 critical / 3268 high raw
occurrences. After exact-payload revalidation, **1 critical / 334 high** records
remain awaiting review. The critical record is the uninstalled SSH client fix.
These are dated results, not a claim that the remaining records are all
exploitable or that all other vulnerabilities are fixed.

The combined maintenance/header/mount/backport/release unit command passed
52 tests, and all 15 SearXNG updater tests passed. This does not substitute for
each native application test.

## Host SSH: prepared, not installed

The current host uses Debian backports `1:10.3p1-1~bpo13+1`; that replacement
had displaced the earlier local 10.0 repairs. The candidate is
`1:10.3p1-1~bpo13+1+utilibre1`, built offline using the existing pinned compiler
image and authenticated APT source inputs. No downgrade to 10.0 is proposed.

It preserves Debian packaging and reapplies the four reviewed corrections:
client rekey lifetime, DisableForwarding/tunnel handling, GSSAPI failure
accounting and CLI username validation. Only one patch context spelling
changes for 10.3's `uint32_t`; added/deleted repair code is unchanged.
The build's upstream unit tests passed. Eleven isolated protocol checks cover
valid keys, SFTP, forwarding, changed-host-key rejection, rekeyed transfers,
PAM and a private Kerberos realm. Username regression is reproduced using the
actual 10.3 predecessor. The older 10.0 fixture remains the explicit historical
baseline for the earlier server regressions, not a claim of testing all
possible 10.3 configurations.

Read-only host preflight verified candidate configuration parsing, identical
effective settings, exact three-package APT simulation and rollback binaries
matching the installed Debian packages. The client/server/SFTP packages must
be installed together. **Installation awaits an open Proxmox console for VM
144 and the SSH maintenance window; no host SSH change or reboot has occurred.**
Use `backports103-prepare.mjs`, `username-run.mjs`, then
`username-check.mjs CANDIDATE CHECKS DEBIAN_ROLLBACK_DIRECTORY` and
`username-preflight.mjs` with the same arguments. The new path is explicit;
historical commands retain their old versions. `username-release.mjs --apply`
is production-changing and must not be run from an audit. Preflight expires
after one hour and must be repeated before a later window.

The separate Debian GSSAPI-extension findings are not claimed patched.
GSSAPI authentication and key exchange are currently configured off. Kernel
and bootloader work require their own review/window; no reboot was performed.

## Retention, resource and remaining work

Raw scans, test outputs, source packages, rollback artifacts and release
receipts remain in protected maintenance storage, outside Git. The SSH
candidate/source packages, native checks and three authenticated rollback
packages were retained at
`/var/lib/utilibre-maintenance/ssh-backports103-20261021/`, not just in `/tmp`.
No user data,
temporary sharing content or recovery backups were deleted. Only individually
identified, unused build-cache records were removed to preserve the existing
8 GiB recovery floor. Old runtime images remain available for rollback.

Other unresolved package, source-only, host and application findings remain
in the private queue. Five other Alpine images still need their native-branch
Expat update; Alpine 3.23 does not currently provide the same libX11 replacement
as 3.24. Do not mix distribution branches to clear the scanner. The Debian ACL
finding also requires consumer/API review, not an untested version bump.
Build capacity is close to the protected disk floor; further large builds need
additional safe space. Do not interpret an individual passing release gate as
fleet-wide completion.
