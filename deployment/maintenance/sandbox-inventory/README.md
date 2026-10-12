# Grist dependency coverage, 12 October 2026

This adds two bounded code inventories to the existing scheduled security scan.
It does not replace Grist, Deno, Pyodide or a production document, and it does
not claim complete coverage of their compiled components.

## What is scanned

- `deno/Cargo.lock` is the unchanged Deno 2.9.7 release-source lock at commit
  `0c071246a412575e07423263404a5d13e7ed6aa2`. Its upstream SHA-256, binary and
  archive digests are in `deno/provenance.json`; the upstream MIT notice is
  retained. The scanner identifies 1,128 packages, including optional, build
  and other-platform dependencies. This is **not a linked-binary SBOM**.
- `grist-wheels.py` reads only the 19 wheel files shipped in Grist's fixed
  Pyodide package directory. It extracts package metadata and hashes each
  payload. The generated requirements input includes those hashes, so changed
  bytes reopen review even when a version string remains the same. It does
  not inspect documents, user package caches or account records.

Deno's installed binary must match the release pin. Its scanner input has one
TOML comment containing a deterministic runtime fingerprint: immutable Grist
image, installed wrapper and binary hashes, and seven non-secret sandbox
settings. The canonical upstream lock remains unmodified in the repository.
Any changed fingerprint changes the finding's artifact key. Unexpected wrapper,
binary or configuration values fail collection; no empty/clean result is
inferred. Native sandbox command/argument overrides must remain unset.

The collector reads container environment in memory but keeps only the fixed
sandbox allowlist. No environment dump, document content or credential appears
in receipts. Both known nonempty inputs must yield a positive package count.
An incomplete scan retains previous observations as `not-rechecked`; an old
review decision cannot overwrite that status.

## The two high source findings

The release lock exposes:

- [`GHSA-3v94-mw7p-v465`](https://github.com/advisories/GHSA-3v94-mw7p-v465),
  `hickory-proto` 0.25.2: DNSSEC NSEC3 response processing.
- [`GHSA-5j98-2g5x-46v6`](https://github.com/advisories/GHSA-5j98-2g5x-46v6),
  `hickory-resolver` 0.25.2: DNSSEC validation during lookup.

These are not claimed patched. `check-runtime.mjs` verifies the production
sandbox settings and executes ordinary native checks in separate, named
containers of the exact running image. They are non-root, read-only, without
network or production mounts, and have CPU, memory, process and time limits.
Each owned probe is removed in `finally`, including after a CLI timeout.

DNS, TCP and HTTP APIs must reject with Deno's `NotCapable` permission error
before I/O; a transport failure does not pass. Grist's native Pyodide launcher
must also return a fictional echo and supply no network, subprocess or FFI
grants. The running binding is checked again afterward. These checks establish
a particular permission boundary, not a new general sandbox escape audit.

`review.mjs` requires the exact checked scan, matching current runtime, a native
proof less than 15 minutes old, and the current primary advisories. It prepares
seven-day **mitigated** decisions only for those two exact high findings. The
strict applier independently checks the current binding again. No lower-severity
finding is waived. Future source/runtime changes or expiry require new evidence.

## Commands and evidence

The existing `utilibre-security-review.service` runs the collector and rebuilds
the private queue. Its resource limits, timer and eight-GiB disk floor remain.

```sh
node --test deployment/maintenance/sandbox-inventory/*.test.mjs deployment/maintenance/maintenance.test.mjs
node deployment/maintenance/sandbox-inventory/check-runtime.mjs
node deployment/maintenance/sandbox-inventory/review.mjs
node deployment/maintenance/closure-review/apply-reviewed.mjs sandbox-inventory-20261012/dns-review.json
```

Run the reviewers only after a completed current scan. Private receipts are in
`/var/lib/utilibre-maintenance/sandbox-inventory-20261012/`; full observations
remain in `security.json` and `security-queue.json`. Tests cover changed image,
wrapper, binary and overrides; secret-bearing invalid values; exact review
scope; empty inventories; and prior decisions after failed rescans.

The shipped wheels have no findings in the dated check. The Deno source lock
also has three medium and three low observations, retained for review. Neither
result establishes coverage of native libraries inside Python/WASM. A complete
linked Rust inventory and Pyodide compiled-component inventory remain missing.
The earlier native formula/import/export and account-boundary release tests are
recorded separately in [the sandbox release](../sandbox-final/README.md).
