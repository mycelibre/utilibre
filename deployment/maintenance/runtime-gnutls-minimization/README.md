# Four Node runtimes: remove unused APT and GnuTLS

## Application advisory bindings: 16 October review

**Activated with owner approval on 16 October 2026 at 06:06 UTC.** The daily review correctly
reopened four application assessments after this runtime-only release changed
their image IDs. Penpot's images did not change, but its whole-Compose hash
changed because the same file contains the Actual/Resume image references.
The original release had refreshed package-level reviews, not these separate
application advisory bindings.

Five bounded GitHub published-advisory requests on 16 October confirmed that
all **48** reviewed IDs, update timestamps and affected ranges are unchanged:

| Application | Version | Published advisories reviewed | Rebinding proof |
| --- | --- | ---: | --- |
| Actual Budget | 26.10.0 | 14 | Completed runtime-minimal image and unchanged application files |
| Reactive Resume | 6.0.0 | 1 | Completed runtime-minimal image and unchanged application files |
| Wishlist | 0.67.1 | 6 | Completed runtime-minimal image and unchanged application files |
| CryptPad | 2026.9.0 | 3 | Same proof plus unchanged mounted package/lock/server hashes |
| Penpot | 2.18.3 | 24 | Same four images; exact two-line unrelated Compose change |

`review-advisories.mjs` reuses the existing `partitionReviewed` matcher. It
checks release receipt hashes, old/new immutable image ancestry, complete
retained filesystem manifests, original package-owned paths, unchanged retained
packages and the native application receipts. Its short-lived inspection
containers have no network or production mounts and never run app servers.
It checks running image IDs and separately bound files read-only. For Penpot,
frontend/backend still disable MCP and PREPL; all four namespaces lack TCP
listeners on 4403/6063. This preserves the earlier **component-not-deployed**
assessment for MCP, not a claim that every Penpot component was patched.

The native application journeys were performed on **12 October**, not rerun
on 16 October. Their exact receipt/image linkage was revalidated today. No
new account, document, live exploit probe, upstream dependency exemption,
deployment or public request was needed for this rebinding. Existing advisory
reasons/ranges remain byte-for-byte unchanged; future image/file/advisory changes
still reopen review. This helper is a review of this particular completed
release, not an automatic carry-forward policy for arbitrary future images.

```sh
node --test deployment/maintenance/runtime-gnutls-minimization/review-advisories.test.mjs \
  scripts/review-upstream-maintenance.test.mjs
node deployment/maintenance/runtime-gnutls-minimization/review-advisories.mjs \
  /absolute/private/new-report.json
```

Run the proof in the prepared checkout against the **still-unmodified** live
review record. It compares the candidate to that prior record and writes only
the named new report; it performs no upstream fetch, notification or activation.
An unrecognized image, source change, incomplete receipt or changed advisory
fails closed. It deliberately refuses to overwrite a report. The application-alert
activation applied only the five scoped changes in
`deployment/maintenance/advisory-reviews.json` after a fresh evidence check.
No service restart was involved. Its pre-change copy is retained privately;
restoring only those five prior entries reopens alerts without reverting any
application or overwriting newer unrelated review records.

Evidence: `/opt/utilibre/reports/advisory-review-20261016.yy51kc/` contains the
original `app-advisories.json`, fresh `activation-app-check.json`, five focused
live upstream results (`activation-upstream.json`), and `activation.json`.
Code commit: `0c74591`. Verified active outcome: **48 reviewed, 0 pending within
these five applications**. The real monitor's `--check-only` run confirms none
of these five application alerts remain; it sends no mail or acknowledgement.
Only the five results in the daily report were refreshed. All unrelated results
and the original full-fleet assessment timestamp were preserved; a scoped
recheck does not pretend the entire fleet was assessed again. Existing service
boundaries, raw findings and scanner policy are unchanged.
The two separate critical PyJWT matches are documented in
[the fixed-package reviewer](../vendor-fixed-review/README.md).
Do not mistake either scoped result for a clean fleet-wide security assessment.

## Original runtime release

Verified and deployed on 12 October 2026. Actual, Reactive Resume, Wishlist and
CryptPad used GnuTLS only through APT. Their runtime images now omit both
packages. This removes eight package-target findings for CVE-2026-88647 and
CVE-2026-88648. It is package removal, not a GnuTLS source fix or a scanner waiver.

`specs.json` records the four immutable bases and final image names. Normal
`dpkg --remove` enforces dependency checks; no force option or edited package
inventory is used. The host and other services retain their packages.

## Evidence and release gates

- `stage.py` checks that APT is the only installed reverse dependency, compares
  every retained file's contents, ownership, mode, type and link target, and
  checks that all retained package versions and runtime image settings match.
  Allowed differences are the two packages' files and removal metadata.
  Manifests come from new, never-started containers without production volumes.
- `applications.mjs` runs the existing disposable native fixtures: Actual
  budget creation, synchronization, ZIP export/import and access checks;
  Reactive Resume account, export/import, deletion and access checks; and
  CryptPad account/document/export/import workflows. `wishlist-check.mjs`
  checks a fictional account, list, item, reload persistence and anonymous denial.
  Wishlist's production OIDC and email delivery were not retested.
- `scan.py` checks complete package inventories and absence of both advisories.
  It compares ELF linkage against each original image. Unused alternate-platform
  prebuilds already have missing libraries; the gate requires exactly the same
  baseline list and no remaining GnuTLS dependencies, rather than hiding those
  baseline entries. This read-only, networkless inspection uses root with
  `DAC_READ_SEARCH` to read image files, without host mounts. Production users
  and permissions remain unchanged.
- `release.mjs` binds the build, native test and scan receipts to exact image
  IDs. It snapshots compose files and review records, changes only image pins,
  recreates one service at a time, and requires native health with zero restarts.
  The existing release helper restores the old image pin if its gate fails.
  All four deployed images passed health checks at 21:24–21:25 UTC.
- After a fresh whole-deployment scan, `revalidate.mjs --apply` can retain prior
  exact reviews for unchanged packages only, with the original expiry. Its
  tests reject changed payloads, settings, package versions, roles, removal sets
  and expired reviews. It explicitly excludes all four unresolved advisory IDs.

Private receipts, original manifests, scans, fictional workflow results and
rollback inputs are in
`/var/lib/utilibre-maintenance/runtime-gnutls-minimization-20261012/`.
The failed first Wishlist navigation attempt and successful rerun are retained.
No live account or document was used for these application checks.

## Reproduction and future maintenance

These are dated, guarded release scripts, not a scheduled updater. Review new
base IDs, dependency evidence and receipt paths before another rollout. The
current `stage.py` deliberately requires the original images to be running;
do not weaken that check to rerun a completed deployment.

The final runtime has no APT. Keep the original build-capable image recorded in
`specs.json`; apply future native package updates to that base or a reviewed
upstream replacement, then reapply and retest the final removal layer. `dpkg`
remains installed. Do not add APT to running containers or reuse their writable
layers as build inputs. Preserve the existing 8 GiB free-space floor.

Other images still need GnuTLS through their application dependencies. The
12 October vendor recheck found no maintained fix for the two advisories.
Those findings remain unresolved. This change does not modify or resume the
separate ACL/GRUB work stopped by automatic security review. Current fleet
counts and the portal release are recorded in [the work queue](../../../docs/work-queue.md).
