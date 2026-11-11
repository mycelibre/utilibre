# Stabilization checkpoint — 11 November 2026

This is the authorized five-item maintenance batch: security reconciliation,
scheduled PDF checks, safe disk cleanup, one controlled application upgrade,
and recovery/mobile verification. It is not completion of every held upgrade
or a claim that all vulnerabilities are resolved. No new service was installed.

## Completed work

| Item | Observed result | Evidence |
| --- | --- | --- |
| Scheduled PDF check | Removed dependency on a disposable BentoPDF build directory. Two pinned PDF.js assets are checked by SHA-256 before parsing real outputs. | `deployment/toolbox/pdf-parser-input.*`; private `journeys.json` |
| Representative workflows | All eight pass: portal EN/ES/mobile, PDF merge/compress/Markdown/EN-ES OCR, chart, image, ZIP, QR offline/export, direct PairDrop transfer, poll lifecycle. | Scheduled service successful at 12:18 UTC; Linux Chromium, synthetic data |
| Disk cleanup | Removed only reviewed dependency/cache directories and one unopened ELF build core dump. Sources, locks, live assets, images, rollback artifacts and backups retained. | `scripts/clean-reviewed-build-caches.mjs`; private cleanup receipts |
| TeXlyre | 0.14.1-p1 deployed at <https://latex.utilibre.org/>; native editor, compiler, privacy settings and source offer retained. | `deployment/texlyre/inputs.json`; private `texlyre/{candidate,texlyre-static-release}.json` |
| Portal metadata | EN/ES software records show the deployed TeXlyre version. Built from the previous isolated portal snapshot plus this provider record, preserving unrelated working-tree edits. | `deployment/maintenance/releases-20261111/stabilization-portal.json` |
| Off-host recovery | All 95 downloaded files from 25 configured backup sources matched checksums. Authentik database restored in a disposable networkless PostgreSQL. | `/opt/utilibre/reports/storagebox-restore-U5PMlL/result.json` |
| Scheduled recovery | Native fictional FreshRSS account/article restore and encrypted Storage Box roundtrip passed. | Private `recovery.json`, 12:14 UTC |
| iPhone | Operator reported merged PDF save/reopen and PairDrop transfer/open on computer both worked. | Conversation confirmation; private `iphone-owner-check.json` |

To provision the PDF check on a rebuilt host, acquire the exact
`pdfjs-dist` 5.5.207 package through the existing controlled dependency-download
step, then run `node deployment/toolbox/install-pdf-parser-input.mjs /absolute/pdfjs-dist`.
The adapter verifies both runtime hashes, package identity and license before
installing the test-only fixture. It makes no network request and refuses to
replace an incomplete or changed fixture silently. Parser upgrades require a
reviewed manifest change and the real output checks.

The phone result is operator-reported, not independently observed. Browser
version and same/different-network arrangement were not provided; it does not
establish relay mode or support for every iPhone. No repeat phone test is needed
for this completed task pair.

Cleanup reclaimed 8,467,316,736 bytes (about 7.89 GiB) gross, including the final
TeXlyre build dependencies. New release sources, assets and rollback files use
some of that headroom: the final root filesystem has about 33 GiB available,
90% used. This is still worth monitoring. RAM shows about 21 GiB available out
of 34 GiB; 118 MiB of the 4 GiB swap is used. These are a snapshot, not capacity
or concurrency guarantees.

## Security reconciliation and remaining work

The starting review queue contained 5 critical / 962 high package-target
records. Several reviewed decisions expired during the session. Revalidation
uses exact installed bytes, authenticated archives, completed release ancestry
and retained behavior evidence; it does not alter scanner severity or erase
raw findings. Reviewed dispositions expire after seven days.

The latest checkpoint and scan scope are in [`stabilization-20261111.json`](../../deployment/maintenance/stabilization-20261111.json).
The reviewed queue has zero critical findings. Remaining high groups are:

- 62 libxslt records across 31 images / 81 container roles, with vendor
  candidate 1.1.43-r4. Image-scope, ABI, nginx/application and rollback gates
  must pass before a coordinated rollout.
- 32 Alpine Kerberos records across two images / 11 roles, with vendor
  candidate 1.22.3-r0. Stateful database consumers require compatible package
  and native/application checks; these images were not replaced in this batch.
- 30 previously documented ACL records. No ACL repair or waiver is claimed.

The MIT 1.22.3 source archive and its release-specific notes substantiate ten
additional advisories for the already repaired Debian/host Kerberos payloads.
See [MIT release notes](https://web.mit.edu/kerberos/krb5-1.22/krb5-1.22.3.html),
`kerberos-additional-advisories.json` and its positive/negative tests. This
narrow attribution does not cover the two older Alpine images above.

CryptPad mounted-source reviewers now require unambiguous completed image
ancestry plus the unchanged repaired source/lock hashes. The libXi reviewer
can independently validate its current package while the historical SQLite
package has been superseded. libpcap can revalidate retained checks against
unchanged installed library/archive/fixture hashes without rerunning a
vulnerability reproduction. No historical result was represented as a fresh
behavioral test.

## Upgrade verification and limits

[TeXlyre release and privacy record](texlyre-2026-10-11.md) contains the precise
source revision and replay instructions. Native checks passed guest project
creation, local compilation, PDF text/accents/formula, ZIP export/import,
local-account upgrade, reload persistence and narrow login layout. An old 0.13
project survived replacement with 0.14.1 in the same disposable browser profile.
Public HTTPS checks also passed without outside-origin HTTP requests, document
uploads or browser errors in the exercised path. Test-only PDF parsing was
injected into the test browser; no diagnostic endpoint was published.

Nine upstream component tests passed; four upstream integration cases were
skipped. The native browser workflow provides the actual observed task evidence.
The bundled WASM/C components were not comprehensively reassessed. The HTTP
migration check does not verify every HTTPS service-worker upgrade state.
Larger-screen guidance and lack of a general offline promise remain unchanged.

The dependency scan includes build-time dependencies. The native npm lock has
zero high/critical matches. The unused Yarn lock's high `uri-js` attribution is
an explicit alias to the separate `uri-js-replace` package; installed package
identity, npm resolution and Yarn resolution agree. Raw findings remain in
private evidence. No severity adjustment or global suppression was added.

Portal lint, typecheck, FOSS/build gates and all 122 unit tests passed. Seven
focused maintenance tests passed. Runtime scans before/after the portal change
have no findings against the same recorded advisory database. All 175 production
containers are running; all 90 configured health checks are healthy, and 85
containers have no container health check. Existing exited build/evaluation
containers were preserved. No failed systemd units remain.

Normal Chromium and curl fetched the released app/source files successfully;
public bytes match local artifacts. Python urllib received an edge 403. No
Cloudflare rule was changed; this is a limited automated-client restriction,
not evidence that every crawler or client can fetch every route.

## Recovery dependency

A full-VM recovery rehearsal is **not performed**. The operator has no spare
isolated restore target yet. Before that rehearsal:

1. Provide a new, unused Proxmox VM ID and enough available storage for the
   restored boot/EFI disks. Inspect the actual backup manifest first; compressed
   backup size is not the required restored capacity.
2. Restore a chosen VM 144 backup into that new VM, with its NIC disconnected.
   Never restore over VM 144, reuse its network identity, or let duplicated
   timers send mail, fetch feeds or announce public services.
3. Recreate empty temporary storage according to the existing temporary-data
   recovery procedure. `scsi2` is excluded from backups intentionally; account
   work remains backed up. Do not recreate expired PrivateBin content. Check
   filesystem/mount/quotas and fail-closed service dependencies before Docker.
4. Check UEFI boot, filesystem/database consistency, saved account work and
   representative applications through an isolated access path. Record results
   and remove only the rehearsal VM when explicitly approved.

The current off-host checks prove download integrity and the named application
restores, not boot recovery or a fresh functional restore of every application.
The existing protected SSH backup connection was used; no new password was
written into the repository or logs.

## Release and rollback

Private evidence root: `/var/lib/utilibre-maintenance/stabilization-20261111/`.
TeXlyre uses the existing static release adapter with `--texlyre-nov11`; no
application container restart or database migration is required. Its exact
previous directory is in `texlyre/texlyre-static-release.json`. To roll back,
verify that the live directory still matches that release, preserve it, then
restore the recorded previous directory. Restore the previous corresponding
source archive recorded in `source-publication.json` and the previous source
index if reverting the version. Keep browser project exports: swapping static
files is not a reversal of browser storage changes.

Only the portal container was recreated for the metadata release. Its previous
image and `PORTAL_IMAGE` line are in `portal-release.json`. Restore that one
line using the existing scoped Compose release procedure, validate the service
shape, recreate only `portal`, and check EN/ES routes. Do not overwrite the
whole `.env` or include unrelated working-tree changes.

The daily upstream report previously listed 30 candidates. This batch completes
TeXlyre; the other 29 remain held for their documented checks. It does not make
blanket unattended upgrades safe, and no new scheduler or LLM dependency was added.
