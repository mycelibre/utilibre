# Disk, held upgrades and ACL review — 11 November 2026

Scope: the operator selected items 1, 2 and 4 after the vendor-library batch.
This extends the existing finite maintenance/release tools. It adds no service,
scheduler, telemetry, notification or public feature. Full-VM recovery remains
outside this batch; an isolated Proxmox target is still unavailable.

## Deployment completed

- **Wakapi 2.18.2**, commit `1157f203c8b646466b4e72563764738b10f0cd0d`,
  at <https://wakapi.utilibre.org/>. Exact image:
  `sha256:59914b69d36255f24f39aae0a97f82acc937a2f4c0536818dd167d22b09b8869`.
  All 99 repaired runtime dependency versions and image configuration remain;
  only `/app/wakapi` changes. Native unit tests and five synthetic account,
  heartbeat, reload, migration and reverse/forward binary lifecycle checks
  passed in a networkless disposable environment. Live health/public checks
  passed. These do not establish a real external OIDC login.
- **GridSpace 4.7.3-p1**, commit `ff7692241c48c3495da0bb8eb7455f906f3abb2d`,
  at <https://grid.utilibre.org/kiri/>. Native browser builders and libraries
  are used; the printer-control server, Electron and documentation build are
  not deployed. Usage reporting remains disabled. Isolated Chromium imported
  the fictional STL, sliced it and exported readable G-code with motion
  commands: no external requests, non-GET requests or page errors observed.
  This is software verification, not certification for a physical printer.
  The existing nginx image/configuration was preserved without a restart.
- The portal now reports both versions in English and Spanish. Build, lint,
  typecheck, FOSS policy and **122 unit tests** passed in a clean committed
  snapshot plus only the two catalogue updates. Unrelated worktree changes
  were excluded. Staging and production version checks passed; staging also
  returned a real 404 for an absent route. Exact portal image:
  `sha256:adeee2a5e23cacbd439c5a81397e2232e93de698344a9a1146bb4fa88aad73ee`.

Matching source archives were published using existing source-offer paths.
No account, access, retention or donation policy changed. No real user data
was inspected in the synthetic workflows.

## Candidate assessment and remaining work

The once-refreshed upstream review checked 112 providers. Thirty candidates
were assessed (the earlier 29 plus Chhoto 7.11.3): **2 deployed, 28 held**.
Twenty-seven yielded supported dependency inventories; Newton, Unfurl and
Mumble did not. Twelve recorded patch sequences conflict. A successful patch
check only covers recorded source patches, not every runtime overlay or gate.

The numbers below are **raw candidate-source matches**, including build-time
packages. They are not production findings or proof of exploitability. Inputs
with no extracted inventory are unavailable, not clean. High/critical matches
must be repaired or reviewed with exact evidence before release. A zero count
is not workflow, migration or privacy approval.

Grid's full upstream installation initially included 1,407 packages and 4
critical / 15 high matches, including unused desktop/server/documentation
build graphs. The browser-only dependency manifest contains 250 packages,
0 critical / 0 high / 2 medium / 4 low matches. This changes actual build
inputs; it is not a scanner exclusion. The complete earlier scan is retained.
The medium/low matches remain visible. Wakapi's raw upstream graph differs
from its repaired runtime: the latter retains one metadata match for JOSE v3,
with the exact previously reviewed source backport and live binary identity.
No new vulnerability reproduction was run.

| Candidate | Raw source C/H | State / next gate |
| --- | ---: | --- |
| grist v1.7.22 | 0/24 | Reconcile 24 high source findings with retained repairs and sandbox inventories; verify document/account workflows. |
| candlr v2.4.0 | 6/29 | Repair/review 6 critical and 29 high candidate-source findings before native PDF/browser compatibility checks. |
| grid 4.7.3 | 0/0 | Deployed native browser-only build; STL import, slicing and G-code export passed with no external requests. |
| addy v1.7.4 | 0/0 | Candidate locks have no high/critical matches; controlled forwarding/reply, account and retained mail privacy checks are not complete. |
| donetick v0.1.86 | 2/29 | Recorded backend patch conflicts; candidate source has 2 critical and 29 high matches. |
| newton v5.5.0 | unavailable | Recorded local-static patch conflicts; scanner extracted no supported dependency inventory, not a clean assessment. |
| unfurl v2026.11 | unavailable | Recorded patch applies, but no supported dependency inventory was extracted; fetch boundaries and native parsing/import/export need verification. |
| razzia 4.0.2 | 0/0 | Major-version transition; retained dependency patch conflicts. Replay and native restore checks needed. |
| chhoto 7.11.3 | 0/0 | New 7.11.3 release adds one candidate to the prior 29. Zero-tracking/local-assets patch conflicts with changed authentication/configuration paths. |
| spliit 1.30.0 | 2/9 | Retained dependency patch conflicts; candidate has 2 critical and 9 high source matches. |
| wishlist v0.69.0 | 0/30 | Retained dependency patch conflicts; candidate has 30 high source matches. |
| kitchenowl v0.8.1 | 0/0 | Candidate locks have no high/critical matches; coupled frontend/backend, saved-account migration and export checks not completed. |
| opengist v1.15.3 | 1/5 | Retained dependency patch conflicts; candidate has 1 critical and 5 high source matches. |
| vikunja v2.8.0 | 0/0 | Retained Go patch conflicts; repaired graph, account-data migration and workflow checks remain. |
| bytestash v1.6.2 | 0/0 | Retained privacy patch conflicts in OIDC/client/server paths; login, account isolation and export require verification. |
| cryptpad 2026.10.1 | 0/0 | Candidate npm scan has no high/critical matches; complete office assets, sandbox, two-client editing and retained privacy/retention gates remain. |
| super-productivity v20.0.0 | 0/0 | Major-version transition; retained local-mode source patch conflicts. Native local-project migration/export and network checks remain. |
| wbo v2.18.33 | 0/0 | Major OpenTelemetry API/dependency changes need verification with retained disabled-export settings; two-client editing and temporary history compatibility also remain unverified. |
| markmap v1.1.0 | 0/0 | Upstream packages changed from markmap-lib/view 0.18.12 to @markmap/* 1.1.0; adapter compatibility, safe imports and exports need migration/testing. |
| mumble v1.5.939 | unavailable | No supported source dependency inventory extracted; repaired TLS stack and authorized native voice workflow remain required. |
| degoog 1.1.1 | 0/0 | PHP-to-Bun runtime change; cannot substitute into the current deployment without retaining privacy and validating search. |
| reactive-resume v6.1.0 | 0/1 | One high source finding plus retained repair replay and account/PDF export gates remain. |
| penpot 2.19.1 | 1/16 | One critical and 16 high source findings; coupled frontend/backend/exporter and repaired JVM native workflows remain. |
| actual v26.11.0 | 2/21 | Two critical and 21 high source findings; retained dependencies and synthetic budget/account migration gates remain. |
| wakapi 2.18.2 | 0/5 | Deployed 2.18.2 with all 99 repaired runtime dependency versions retained; five native synthetic lifecycle checks passed. |
| jupyterlite v0.8.7 | 3/65 | Three critical and 65 high source findings; kernel/WASM compatibility and retained privacy controls require work. |
| ntfy v2.37.2 | 0/1 | Retained Go patch conflicts; one high source finding and native permission/cache/notification gates remain. |
| uptime-kuma 2.5.9 | 2/35 | Two critical and 35 high source findings; retained runtime removals/repairs and monitor/account restore checks remain. |
| omnitools v0.7.0 | 6/50 | Retained privacy/local-assets patch conflicts; six critical and 50 high source findings. |
| authentik version/2026.8.5 | 13/150 | Thirteen critical and 150 high source findings; coupled identity/database migration and retained repair gates remain. |

## ACL remains open

Passive installed-state assessment found **30 records at 36 locations**,
with none closed or unverified. No ACL package, caller or permission policy
was changed. Debian's stable ACL versions still require a compatible caller
transition; installing the new library alone does not change legacy callers.
No custom exploit or race reproduction was run.

Primary evidence rechecked 11 November:
[Debian CVE-2026-54369](https://security-tracker.debian.org/tracker/CVE-2026-54369),
[upstream compatibility explanation](https://www.openwall.com/lists/oss-security/2026/06/29/1),
and [Debian tar transition issue](https://bugs.debian.org/1141146).
The tar symbol-collision fix is not evidence that every caller migrated to
safe access semantics. Keep these findings open until compatible upstream
caller/package repairs can pass ordinary permission and application tests.

## Repeatable inputs and release boundaries

The finite recipes are in
[`deployment/maintenance/releases-20261111`](../../deployment/maintenance/releases-20261111/README.md):
`build-wakapi.mjs`, `check-wakapi-upgrade.py`, `upgrade-policy.mjs`,
`upgrade-inputs.json`, `grid-browser-build.patch`,
`grid-browser-package-lock.json`, `grid-upgrade.json` and `upgrade-portal.json`.
They extend the existing preparation and release adapters, rather than adding
another updater. Hash-bound source, locks, patches, compiler, artifact and
private evidence are required. Unsupported revisions or changed evidence stop
release. Assessment uses the recorded 10 November 19:01 UTC advisory database;
release requires data less than 48 hours old. Historical replay is not fresh
security clearance or a claim of byte-reproducible builds.

Preparation refuses existing candidate output so evidence is not overwritten.
Restore captured inputs to a separate staging environment for historical
replay; do not rerun builds over the live tree. The GridSpace 4.7.0 publisher
now stops before touching files so a historical command cannot silently
replace the upgraded service. Explicit repeated Grid activation verified the
same artifact was already live and changed nothing.

Approved exact activation commands used in this batch:

```sh
node deployment/maintenance/release-refresh-20261106/release.mjs wakapi --apply --wakapi-nov11
node deployment/maintenance/release-refresh-20261106/release-static.mjs grid --apply --grid-nov11
node deployment/maintenance/release-refresh-20261106/release-portal.mjs --apply --upgrades
```

These commands are not permission to redeploy a different candidate. Existing
exclusive locks, unchanged configuration checks, native/public checks and
transactional rollback remain in force. No host reboot was needed.

## Recovery and evidence

Private evidence root:
`/var/lib/utilibre-maintenance/upgrade-closure-20261111/`.
`held-source-assessment.json`, `patch-compatibility.json` and `held-scans/`
retain all candidate outcomes. `wakapi/`, `grid/` and `portal-*` bind successful
build/native/scan evidence and source offers. Protected data copies and raw
logs must not be published.

Wakapi's previous image is
`sha256:b3d3d5ebf2416f31617a1163873f0c392e7a8ca1dc2a3e46a78f0b2e3b1457dc`.
The native pre-upgrade SQLite backup is `wakapi-release/wakapi-before.sqlite`.
The previous binary successfully reopened the migrated synthetic store, but
that is not permission to overwrite production data. A reviewed rollback uses
only the old Wakapi pin and existing scoped Compose release; restoring the
backup is a separate operator decision that can lose subsequent writes.

Grid's old static files are in `grid/grid-previous-public-assets` and its old
source offer is retained privately. Restore that exact directory via the
existing atomic static release path, preserving unrelated apps. No database
migration occurred. The portal's old image is
`sha256:cc793c0593dd1056343f456596b01bb8d584c83b74c73697fa9fed8b8b45a94f`;
restore only its protected `PORTAL_IMAGE` pin through the scoped release path.
Retain these artifacts and account backups: Git alone cannot recover them.

## Final security and health check

The 16:31 UTC same-database scan completed **109 runtime images, 113 source
inputs and host packages**, with no incomplete target. Grid's additional
browser-only lock has its separate complete candidate scan. The derived queue
is **0 critical / 30 high pending**, all ACL. The raw inventory remains
26,177 package-target records (66 critical / 4,093 high); raw counts include
historical inputs and exactly reviewed repairs, not just pending work.

Changing the Wakapi image and a guarded recipe correctly reopened 23 reviews.
The exact new JOSE-backport artifact review and 22 historical-input conditional
reviews were renewed against fresh runtime/binary evidence, with seven-day
expiry. No finding, rule or severity was suppressed. The retained-command
suite passed 50 checks and the condition/policy suite passed 83 (these overlap;
they are not 133 distinct tests). No exploit fixtures were rerun.

There are **175 running production containers, 90 healthy configured checks,
zero unhealthy checks and zero failed systemd units**. Eleven deliberately
stopped build/initialization/preview containers are not counted as live
services. This is a point-in-time check, not an uptime or capacity claim.

## Disk cleanup and Storage Box archive completed

Reclaimed **about 7.1 GiB gross**: 2,033,876,992 bytes of four reviewed
regenerable dependency/build caches, 362.6 MB reported by Docker for five
exact stale unshared build-cache records, and **5,222,865,981 bytes** of
11 cold compressed build-tree archives moved to the encrypted Storage Box.
Docker images, containers, source/lock files, live assets and saved account
backups were preserved. No blanket prune was used. New build/evidence space
means gross reclamation differs from the net free-space increase.

The native Restic upload was fully restored to a new private directory with
`restore --verify`; all 11 archive sizes and SHA-256 hashes matched the local
originals. Only then were the local archives and disposable restore copy
removed. The original archive directory now contains `ARCHIVED.json`.
This verifies these source archives, not a whole-VM recovery.

Snapshot: `b022dd9c556bb2fd7ef3500f6b7434dac4688330b8fb4e959ea1b32e46a19dc6`.
Tag: `maintenance-build-archives-20261028`; host: `utilibre-vm`.
Existing daily account-backup retention selects only `native-app-snapshots`,
so it does not expire this separate reconstruction snapshot. No automatic
expiry was added. Transfers used the existing protected SSH/Restic wrapper,
two SFTP connections and a 4 MiB/s cap. No new credentials were requested.

Recover to a fresh, private directory with the existing wrapper, then use
`archive-inputs.json` for independent checksums before unpacking any archive:

```sh
sudo sh deployment/storagebox/restic.sh restore b022dd9c556bb2fd7ef3500f6b7434dac4688330b8fb4e959ea1b32e46a19dc6 \
  --target /var/lib/utilibre-maintenance/restored-build-inputs --verify
```

Choose a new target with enough free space; do not restore over live paths.
The archives preserve already reviewed build trees, not mutable account data.
Current root-filesystem availability at this checkpoint is **33.4 GiB**;
see the machine-readable status for the exact byte count and timestamp.
The separate temporary-data disk and its backup exclusion were unchanged.

Final additional gates: all five new release-boundary tests passed; unsupported
or conflicting CLI profiles stop before invoking external tools. Portal and
Grid repeated activation verified the already-correct state without changes.
JS/JSON/Python syntax and local documentation links passed. Whitespace checking
passes outside the patch artifact, whose two single-space lines are required
unified-diff context for empty upstream lines; those patch bytes are retained.
