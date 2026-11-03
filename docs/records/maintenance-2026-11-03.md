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
