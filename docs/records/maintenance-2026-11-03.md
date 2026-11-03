# Security maintenance, 3 November 2026

The package-update batch is deployed; the entire security queue is **not closed**.
The existing builders, transactional Compose release and native checks were
extended. No LLM is required to replay these recipes. No application data,
retention policy, registration setting or notification configuration changed.

## Completed package updates

| Package | Deployed version | Verified scope |
| --- | --- | --- |
| Expat, Alpine | 2.10.0-r0 | 32 image candidates; 68 release groups, 73 containers |
| Expat, Debian | 2.10.0-1; native Bookworm 2.10.0-1~deb12u1+utilibre1 | 11 image candidates and containers, including Penpot's separate private library |
| pyasn1 | 0.6.5 | LiberaForms, Authentik and SimpleLogin: three images, six containers |
| follow-redirects | 1.16.2 | Actual, Uptime Kuma, Grist and Gathio: four images and containers; all identified installed copies |

These releases updated **91 distinct containers**; the rows overlap. All release
receipts passed their bounded health/configuration checks. Native checks verify
parser behavior, retained ABI and application/configuration bytes. They are not
a claim that every public user journey was repeated.

pyasn1's nested-string regression fails on the old input and passes on the new
input; seven legitimate round trips and 1,261 upstream tests pass per candidate.
The redirect fixture reproduces cross-realm credential forwarding on the old
dependency and rejects it after the update, while preserving same-origin
headers and normal redirects. Tests use synthetic data and no external provider.

Expat's Bookworm rebuild passes 5,328 narrow upstream tests and three separate
wide-API tests. The full upstream wide-character test target does not compile
with Debian's unsigned-short configuration; that failed attempt is retained.
The small historical parser fixture does not reproduce a crash on every vendor
baseline. Neither limitation is reported as an exploit regression success.

The final read-only running-container check found 90 exact batch image identities
and one separate concurrent Kittygram cache update. Its Expat library matches
the tested 2.10.0 bytes, and its replacement image was included in the final scan.
That application change, its source patch and its source-offer link are outside
this batch and are preserved separately.

## Assessment and remaining work

The complete fleet scan finished **2026-11-03 15:02:26 UTC**: 109/109 image
identities covering 175 containers, 83/83 source inputs and 508 host packages
were checked. Trivy's advisory database was updated at 07:14 UTC that day.
The retained raw scan has 24,483 package/target records, including 64 critical
and 2,922 high records. These are occurrences, not distinct vulnerabilities.

After exact live-payload/component reviews, **zero critical and 288 high
occurrences remain awaiting review** at this checkpoint. Replacement image
identities invalidate old reviews; renewed decisions require matching installed
bytes and completed release ancestry. Raw findings are not removed, and reviews
expire. A source-package match on headers is not automatically a running-kernel
vulnerability; the reviewer requires the specific CNA paths and actual installed
inventory. Ubuntu's verified header inventories now pass the same narrow
application gate as Debian's.

The Deno ZIP findings are a seven-day, runtime-bound **mitigation**, not a patched
ZIP dependency. The tested Grist sandbox can execute its legitimate Python echo;
DNS, TCP, HTTP, process execution and FFI are denied. Other Deno operations and
compiled-crate coverage are not claimed. Changes to the image, wrapper or grants
invalidate the review.

Outstanding work includes SQLite's newer FTS5 finding, remaining application and
build dependencies, host Expat, QEMU and boot-related findings, plus further
review of retained backports/component matches. The 288 are not all confirmed
exploitable defects. CryptPad's separately mounted redirect dependency and
historical lockfiles are outside the four-image redirect repair above.

The QEMU guest-agent and block-tool candidates were retested in isolation on
3 November: native RPC/capabilities, fictional disk conversion/read checks,
exact rollback payloads and a two-package host simulation passed. **They are
prepared, not installed.** Activation requires a current five-minute pause of
Proxmox backups/snapshots/agent operations with VM 144's console available;
afterward, Proxmox ping and thawed-state checks are required. No VM reboot is
part of that update. Older maintenance-window approvals are not reused.

The separate Caddy and Proxmox hosts are outside the VM vulnerability scan.
Image scans do not inspect mutable container layers or mounted user data.
Source-lock coverage is not a complete browser-bundle, WASM or linked Rust SBOM.

## Verification, sources and operations

The focused maintenance suite passed **69 tests**: batch selection, exact
finding scope, native evidence, descendant lineage, stale/malformed evidence,
permissions, release rollback and namespace bindings. Re-run from the repo root:

```sh
node --test deployment/maintenance/security-20261103/*.test.mjs \
  deployment/maintenance/language-final/release.test.mjs \
  deployment/maintenance/go-final/release.test.mjs \
  deployment/maintenance/vendor-fixed-review/*.test.mjs \
  deployment/maintenance/review-native-backports.test.mjs \
  deployment/maintenance/closure-followup/headers*.test.mjs \
  deployment/maintenance/sandbox-inventory/*.test.mjs
```

[Recipes, pinned inputs, commands and rollback boundaries](../../deployment/maintenance/security-20261103/README.md)
are checked in with the exact Compose image updates. The private evidence root is
`/var/lib/utilibre-maintenance/security-20261103/`, including each profile's
`release.json`, `batch-checkpoint.json`, full baseline/candidate scans and native
test receipts. Scanner and review ledgers remain under
`/var/lib/utilibre-maintenance/`; they are not published with user/configuration
data. Source supplements contain code and licenses only.

[Published library sources](https://tools.utilibre.org/utilibre-source/security-libraries-20261103-source.tar.gz)
are 8,769,012 bytes, SHA256
`3b4a820a8b2cde5e1b86d34a921361aed739f66383d50cbe0b2b26645ef4a99a`.
A public GET and complete archive hash were verified. Existing full application
source offers remain necessary and intact. Later review-only integration edits
are in Git; the preserved archive is not silently replaced.

At the post-release check, no systemd unit was failed and no running container
reported unhealthy. The VM had about 36 GiB filesystem space and 18 GiB available
RAM, with 1.1 GiB swap used. These are point-in-time readings, not capacity or
uptime guarantees. Rollback images, backups and evidence were not pruned.

GitHub availability scheduling remains an external dependency. The staggered
schedule change is commit `b327e6e`; manual run
[41633991916](https://github.com/mycelibre/utilibre/actions/runs/41633991916)
succeeded. At the final check, the latest automatic run was still 08:00 UTC.
Manual success does not establish restored scheduling; retain the watchdog.

Rollback must use the exact original pin and declared service group in its
private receipt, after checking for subsequent changes. Preserve network
namespace companions and use the existing supervisor. Do not overwrite the
separate Kittygram change. No database migration occurred; an image rollback
does not restore account data or reverse unrelated later changes.


## Evening follow-up — application repairs deployed

The 22:43 UTC review checkpoint had **0 critical / 153 high awaiting-review
records**, compared with 292 high in the reported alert. This is an intermediate
review count, not the post-rollout total. Eight thousand four hundred fifty-seven
header-package attributions were checked against the immutable Linux CNA
snapshot `d4e64685005cb49f8cf3123b04e49eac6617de00` and actual package inventories.
Ambiguous/missing records and genuine header overlaps stayed open. This does not
assess or exempt the VM or Proxmox kernel. Review targets were not reset.

SQLite's negative-rowid repair was built separately for Bookworm and Trixie,
then deployed as 24 exact image candidates across 29 existing release groups.
Both sanitizer baselines reproduced overflow; both corrected builds pass. Each
candidate preserves application/configuration files, unrelated libraries,
exported symbols and SQLite options, and passes legitimate queries, previous
DISTINCT/corrupt-FTS checks and synthetic backup/restore. The native package
versions are `3.40.1-2+deb12u2+utilibre3` and
`3.46.1-7+deb13u2+utilibre1`. No user database migration was performed.

Four additional applications passed isolated native checks and release gates:

- Penpot's admin console and Reactive Resume: Seroval 1.6.11, including the
  separately loaded SSR dependency. Small forged-node/constructor cases are
  rejected; legitimate serialization remains intact. Admin authentication and
  public server-function checks, and Resume's two-account JSON import/export,
  reload, access isolation and deletion checks pass.
- Gathio: Joi 17.13.9. Normal validation and the upstream whitespace guard pass;
  synthetic event creation/editing, rejected invalid edit tokens, image upload,
  ICS import/export and a stopped-database-copy restore pass in both states.
- RSSHub: RE2JS 2.8.7 and decode-uri-component 0.5.1. Small deterministic work
  counters reproduce the old repeated-scanning behavior and show the fixes,
  with legitimate parsing and networkless application startup retained. This
  does not test all external feed providers.

All candidates were scanned against the same unchanged advisory database;
no newly introduced high/critical records passed the release gate. Debian's
version-based SQLite matches remain raw findings until the exact native-byte
review is applied. The full fleet reassessment is separate from these
candidate comparisons.

A release-report race left an already successful RSS-Bridge replacement marked
`applying`. The original candidate/configuration/health/namespace/route gates
were rerun before reconciling its receipt; no additional restart was needed.
Release profiles now share an exclusive lock. Two stale checked-in FreshRSS
and RSSHub source pins were reconciled against the earlier verified Expat
release before applying SQLite. The five-minute predecessor-stability gate
remained intact; sequential namespace updates waited for it.

New source supplements were published through the existing source directory:

- [SQLite](https://tools.utilibre.org/utilibre-source/security-sqlite-20261103-source.tar.gz):
  28,414,191 bytes; SHA256
  `6b9b8ae2f740ddfc2746b82499cbc9271616f99ded02ffc134aeebf961015d6e`.
- [JavaScript dependency packages](https://tools.utilibre.org/utilibre-source/security-js-20261103-source.tar.gz):
  732,815 bytes; SHA256
  `07f4fb03d4d498deb42425ee3b3b6bbcc2be9af2fcf1bab3b38d4c005d7b8bdc`.

Complete public GETs matched both hashes using a standard browser User-Agent.
Python's default User-Agent received an edge 403; this check does not establish
access for every bot or client. Existing application source offers, notices,
rollback images and user data remain intact. The added source-index links reuse
its existing layout and both languages.

Private evidence: `security-20261103/sqlite/{SUITE}/output`, per-image
`{build,native,scan-gate}.json`, both profiles' `release.json`,
`security-20261103/js-nov/KEY/application.json`, and `followup/` logs.
Failures and intermediate attempts were retained. No notification, indexing
request, host package installation, guest-agent restart or VM reboot occurred
in this follow-up. QEMU/boot coordination and unresolved application/build-input
findings remain separate work; this section is not a completion claim for the
whole queue.

## Final follow-up checkpoint, 23:33 UTC scan

**The full queue is not finished.** The complete scan checked 109 images serving
175 containers, 83 source inputs, and 508 host packages. Raw records remain
24,437, including 64 critical and 2,909 high package-target attributions. After
exact current-payload reviews, **0 critical / 107 high await review**, compared
with the user's 292-high alert. **4,905 records remain past their original
triage target**, down from 10,885 (4,368 medium, 432 unknown and 105 high).
No deadline, severity threshold, scanner scope or raw finding was removed to
achieve those figures. Counts are not unique vulnerabilities, exploitability
assessments or an overall security clearance. Reviews expire automatically.
The machine-readable checkpoint is
[`status.json`](../../deployment/maintenance/security-20261103/status.json).

Grist's final `decode-uri-component` 0.5.1 candidate was deployed after its
CommonJS compatibility and normal parsing checks, bounded-work regression,
document/formula/access-isolation/export/restore fixture and frozen-database
comparison passed. The adapter retains the old plus-to-space behavior using
Node 22.23.4's supported synchronous ESM loading. It does not modify the upstream
decoder algorithm. The two rejected preparation attempts were not deployed.
Fresh native sandbox checks confirm DNS/TCP/HTTP, process creation and FFI remain
denied while the normal Python echo succeeds. Deno ZIP findings have an exact
seven-day permission-bound mitigation, **not** a claimed ZIP-library patch.

CryptPad's single-file redirect backport was also deployed. Its old code leaked
two fictional custom headers across cross-realm redirects; the corrected code
leaks none. Four representation cases, same-origin redirects and redirect limits
pass. Its full disposable native two-account/document/upload/team/import/export
journey passed without outside browser requests. Production document data, locks,
account policies and the earlier body-parser/braces repairs remain unchanged.
The metadata still says 1.16.1; the implementation matches upstream 1.16.2 and is
bound to an explicit expiring review. Reinstallation must replay the patch.

Source supplements were served successfully and full-download hashes verified:

- [Grist dependency/adapter](https://tools.utilibre.org/utilibre-source/security-js-grist-20261103-source.tar.gz):
  735,298 bytes; SHA256
  `85e4cebd6f5ce4459bcf2c5d73161afd3a98ade6a854d7f2225f47a6da344e05`.
- [CryptPad redirect repair](https://tools.utilibre.org/utilibre-source/security-cryptpad-redirects-20261103-source.tar.gz):
  34,837 bytes; SHA256
  `2f30e8a2a95b53f0a5609ed8e4bdf826cdcf18ee42297c7cf57baacd02039650`.

The new source-index links use the existing layout and both languages. Previous
application offers remain available. The focused maintenance policy/release
suite has 102 passing tests; syntax and code-file whitespace checks passed.
Exact upstream patch files retain diff context, signature and whitespace bytes;
Git flags those as whitespace warnings when the patches themselves are added.
Their checksums and application checks passed. Unrelated patches were not changed.
The final fleet scan completed successfully in 82 seconds with the same frozen
advisory database. Grist's replacement image intentionally reopened earlier
image-bound reviews; they were rechecked against actual live bytes and fresh
native evidence before applying decisions. Old image decisions were not copied.

### Remaining work and exact dependencies

| Scope | High records still open | Next required work |
| --- | ---: | --- |
| Host | 31 | Coordinated VM/guest-agent/SSH maintenance and boot repair verification; tested QEMU candidates still need a fresh maintenance window and prerequisite checks. Host Expat/SQLite/libXi/oauthlib/libacl findings also remain. No old approval window was reused. |
| Runtime images | 40 | 29 libacl caller/API cases; 4 libXi, 2 Go stdlib, 2 header-attribution cases, and one each Guava, Python Markdown and OAuthlib. These require source/caller validation or compatible candidates plus application regression checks; they have not been waived. |
| Tracked build inputs | 36 | Reconcile historical/current lockfiles with the exact replay chain and prepare supported updates where still used. A newer runtime alone does not clear source/build coverage. |
| Lower-severity overdue work | 4,800 | Triage the remaining medium/unknown records against actual components; preserve deadlines and distinguish build, runtime and host exposure. |

Only host coordination depends on the owner's maintenance window. The other
rows are unfinished engineering/triage, not claimed to be blocked by that window.
No further service is disabled, no notification sent, and no host packages,
QEMU/SSH services or VM power state were changed by this follow-up.

Private evidence: `followup/final-fleet-scan.log`, `followup/final-reviews/`,
`followup/final-tests.log`, `followup/final-security-summary.json`,
`js-nov/grist-decode/`, `cryptpad-redirects/`, and all completed release receipts.
Rollback uses the exact predecessor artifact/configuration in each receipt;
CryptPad retains its original single source file. Check for later changes first.
Never restore user data merely to undo one of these code-only changes.
