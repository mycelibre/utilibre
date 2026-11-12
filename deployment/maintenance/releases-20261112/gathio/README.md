# Gathio dependency repair — 12 November 2026

Mongoose 6.13.12 and mquery 4.0.4 are deployed. `inputs.json` pins the
upstream revision, predecessor, package archives and checksums. The small
overlay reuses `js-closure/build.mjs`; unrelated app/OS bytes, configuration,
database schema, access and retention are unchanged.

The native package manager produced `source-update.patch`. The retained
source checkout now includes it. Replay from the declared revision with the
existing privacy patch, then this exact patch; input/output hashes are in the
private `source-lock.json`. No fuzzy replacement or latest-version lookup is
part of replay. The existing patch registry records the sequence.

Two-image ordinary tests passed event creation/editing, wrong edit-token
rejection, image upload, ICS import/export, stopped synthetic database
restore and reopening events/images. They used a network-none namespace and
synthetic PostgreSQL/FerretDB, not production data or exploit fixtures.

Same-database Trivy assessment removed two high and two medium Mongoose
records. Fourteen medium and two low records remain; no suppression was added.
Public HTTPS, exact live module version and health passed after activation.
Only the application container was replaced. Database and gateway containers
and data mounts were unchanged.

The first attempt rolled back safely on a transient gateway 502. Its receipt
is preserved as `release.json.attempt1`. The corrected release gate waits for
the gateway's existing 30-second Docker DNS refresh; the second attempt
passed without a gateway reload. This was an orchestration timing correction,
not an application-code or gateway-configuration patch.

## Replay and release

Use `prepare-lock.mjs` only in a disposable source environment with the exact
declared inputs. It resolves the reviewed pins once and rejects unrelated
lockfile changes. Archived replay uses the captured patch and lock outputs,
not another registry resolution. `build.mjs` uses the immutable predecessor
and exact package integrities. `check-native.mjs` runs the bounded fixture.
Fresh preparation uses new private output paths; do not overwrite evidence.

`release.mjs --check` checks the prepared predecessor/candidate pair.
`release.mjs --apply` is an explicit production operation, never a daily audit.
It requires evidence, source publication, an 8 GiB free-space floor, unchanged
Compose settings and the shared release lock. A second blind activation is
rejected. No database migration or production test-content write is involved.

Rollback: restore the image scalar from private `compose.before.yaml` and
recreate only `gathio` using the established Compose project; retain the
database and uploaded images. Recheck backend and public HTTPS after the
gateway DNS refresh. The predecessor image remains retained.

Private evidence: `/var/lib/utilibre-maintenance/releases-20261112/gathio/`.
Corresponding source: [complete prior source plus exact repair](https://tools.utilibre.org/utilibre-source/gathio-mongoose-20261112-source.tar.gz).
Source SHA-256: `3864e92916498bffee9ced398988d106124f3f9f5731dafd574e466c26c1ed82`.
The full shared build/check scripts are in the published integration archive.
Byte-identical rebuilds and live user-data recovery are not claimed.
