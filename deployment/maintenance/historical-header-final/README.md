# Historical kernel attribution: userspace header packages only

## Additional exact review: 16 October 2026

`current-policy.mjs` pins five newer Linux CNA records and the current image
identities. `current-review.mjs acquire OUTPUT` downloads only those five pinned
JSON records; `prepare OUTPUT` performs offline, read-only header inspection and
writes proposals. It reuses this directory's existing inventory collector and
validation; it is not a new scanner. Seven locations were inspected, including
all three SimpleLogin roles. Eight HIGH package-target records were attributed
to unaffected userspace headers, with seven-day exact-key decisions.

Private evidence: `/opt/utilibre/reports/high-headers-20261016/{evidence,review}.json`.
Set `UTILIBRE_HEADER_EVIDENCE` to that directory when running
`current-policy.test.mjs` to include the pinned-primary integration check.

**The running VM kernel remains a separate unresolved issue.** It is
`6.12.111+deb13-cloud-amd64`; the pinned Linux CNA identifies the 6.12 branch fix
for CVE-2026-98260 in 6.12.112. The inspected Debian stable candidate was still
6.12.111. A safe vendor-kernel update and coordinated reboot are required; no
header decision is a kernel waiver. See the
[current disposition](../../../docs/records/security-high-review-2026-10-16.md).

## Earlier review: 12 October 2026

Reviewed 2026-10-12. This is **not a kernel repair or an assessment of the running
VM/Proxmox kernel**. It resolves five specifically reviewed records attached to
`linux-libc-dev`, which supplies userspace kernel-interface headers. It never
accepts `linux-image`, kernel modules, private kernel source/header packages,
other package versions, or unrelated runtime roles.

The original CNA JSON has no complete structured `programFiles` attribution for
these cases. This separate reviewer preserves that fact instead of inventing
fields or weakening `closure-followup/headers-policy.mjs`.

## Primary evidence

Full response hashes, exact provider names and original references are pinned in
`policy.mjs`. CNA JSON is pinned to CVEProject/cvelistV5 commit
`20d9248c60fe62803efade3177e8b82b586d154c`; existing cached originals are reused.

| Record | Actual attribution and supporting original source |
| --- | --- |
| CVE-2013-7445 | CERT/CC CNA describes Linux DRM/GEM object memory exhaustion. The official [GEM memory documentation](https://raw.githubusercontent.com/torvalds/linux/v6.12/Documentation/gpu/drm-mm.rst) describes kernel object/backing allocation and identifies `drivers/gpu/drm/drm_gem.c`. The CNA-linked [kernel bug 60533](https://bugzilla.kernel.org/show_bug.cgi?id=60533) is access-challenged; its body was **not** inspected. We do not claim the CNA names a single vulnerable file or that a header test reproduces this issue. |
| CVE-2019-19814 | MITRE CNA links the [original report](https://raw.githubusercontent.com/bobfuzzer/CVE/master/CVE-2019-19814/README.md), which explicitly identifies `fs/f2fs/segment.c` and `__remove_dirty_segment`. Only report text was downloaded; no crafted filesystem image was downloaded or mounted. |
| CVE-2021-3847 | Red Hat CNA links the [original OverlayFS report](https://www.openwall.com/lists/oss-security/2021/10/14/3). It describes the kernel driver's `copy_up` handling, not a UAPI definition. The corresponding [upstream implementation](https://raw.githubusercontent.com/torvalds/linux/v5.14/fs/overlayfs/copy_up.c) supplies the private functions being distinguished from exported headers. |
| CVE-2021-3864 | Red Hat CNA's product is `kernel`; its description does **not** contain the word Linux. Its exact [linked report](https://www.openwall.com/lists/oss-security/2021/10/20/2) identifies `fs/exec.c` and `begin_new_exec`. The report itself need not repeat the CVE identifier: the pinned CNA reference establishes the link. |
| CVE-2022-1205 | Red Hat CNA links the [original AX.25 report](https://www.openwall.com/lists/oss-security/2022/04/02/4), which explicitly identifies `net/ax25/ax25_timer.c` and expiry callbacks. No reproducer was executed. |

These references support compiled implementation attribution, not a claim that
the underlying kernel is fixed, that users cannot call affected syscalls/ioctls,
or that every UAPI header is intrinsically harmless. Inline header code is not
excluded categorically: all actual installed header bytes are read and checked
for the particular private implementation identifiers under review.

## Inventory and decision gates

`inventory.py` reads only the named package's `dpkg-query` inventory and listed
files. It verifies the installed version/status before and after inspection,
restricts locations to headers/documentation, reads every installed header,
hashes regular file contents and rejects unexpected code/binary/module/archive
payloads, missing headers, out-of-package symlink targets and implicated private
symbols. Documentation pruned by upstream images is explicitly recorded as
missing, never presented as read. The total payload is capped at 64 MiB and each
file at 2 MiB; no images are built and no kernel interfaces are exercised.

`review.mjs` requires the current completed scan and exact current image identity,
checks **each** running container's package bytes (including all three SimpleLogin
containers), and prepares seven-day, exact-key `not-affected` decisions. Changed
live images are skipped until a fresh scan. Versions are never relabelled. Raw
scanner output, live apps and the decision ledger are untouched.

```sh
node deployment/maintenance/historical-header-final/acquire.mjs
node --test deployment/maintenance/historical-header-final/policy.test.mjs
node deployment/maintenance/historical-header-final/review.mjs
```

The operator's existing applier can import `eligible`, `reviewFile` and
`expectedStatus` from `policy.mjs`. The draft is
`/var/lib/utilibre-maintenance/historical-header-final-20261012/review.json`;
full hashes/inventories are in adjacent `evidence.json`. Do not commit private
downloaded reports or generated receipts. Removing this policy from the applier
and allowing its exact decisions to expire reverses this attribution; no software
rollback is involved.

## Observed validation, not a final fleet count

- Four focused tests passed, including exact scope rejection, unexpected payload
  and missing-header rejection, changed-primary rejection and all five real
  pinned source chains. Cached-primary integration is explicitly skipped if the
  operator has not acquired the private inputs; ordinary policy tests still run.
- All seven actual locations passed: Gathio (934 headers), KitchenOwl and
  Linkding (1,518 each), three SimpleLogin containers (960 each), and the VM
  `linux-libc-dev` package (1,518). Installed versions were respectively
  `6.1.187-1`, `6.12.111-1`, `5.15.0-198.208`, and `6.12.111-1`.
- Each payload was about 5.5–9.3 MB, not a complete container copy. Gathio,
  KitchenOwl and Linkding each lacked one package documentation file; headers
  were all present. These missing documents are retained in the evidence.
- Against the **pre-update** 16:42:50 scan, 12 exact-key draft decisions were
  prepared and eight Gathio/KitchenOwl keys deliberately skipped because their
  images had since changed. A separate current-payload probe passed for those
  images but does not turn their stale scan records into valid decisions.
  Rerun the reviewer after the parent's final scan; report that result separately.

No production release, ledger application, exploit test, mounted filesystem
image, new dependency, telemetry or live service change was made by this task.
