# 15 November: document journeys and PAM exposure review

[Results, limits and rollback](../../../docs/records/maintenance-documents-2026-11-15.md).
No new scheduler, scanner, authentication implementation or application fork.

* `pam-inputs.json` pins eight existing running images. Run
  `python3 deployment/maintenance/security-20261115/check-pam-exposure.py`
  for a read-only configuration/exposure check. It does not patch PAM, record
  a finding decision, approve an upgrade or extend the seven-day review.
* `portal-inputs.json` records the baseline Git revision, SHA-256 of the eight
  changed source files, exact old/new image identities and private evidence
  hashes. Unrelated changes in the live worktree were excluded from the build.
* `Dockerfile.portal` retains the prior tested runtime and replaces only the
  built portal assets. Build from a clean baseline plus the recorded files with
  the existing lockfile, `npm run build`, and copy `portal/dist` and
  `portal/server-built` into a private Docker context. Verify the base image
  identity, then use the existing local Docker engine with `--pull=false
  --network=none`. The recorded base is a local immutable image ID: the legacy
  builder was used (`DOCKER_BUILDKIT=0`), because BuildKit interpreted that
  `FROM sha256:...` as a registry lookup and failed. That failed build is not
  counted as verification. No byte-for-byte rebuild claim is made.
* `check-portal.mjs` tests the fixed loopback candidate at `127.0.0.1:34180`,
  configured with the real public PDF/paint/tools/drop/forms URLs. It checks
  desktop/mobile viewports, sample downloads, collection saving and failure
  reporting. The feedback destination is intercepted; no report is submitted.
  Public production configuration is embedded in SSR, so the existing suite's
  mocked `/_portal/config` responses cannot override it. Run that suite against
  its normal dev harness and this check against the candidate.
* `release-portal.mjs --apply` is an **explicit production action**, not an audit.
  It reuses the existing release lock, exact-image health gate, scoped Compose
  recreation and rollback helper. It accepts only the recorded image/evidence,
  checks configuration shape, updates only `PORTAL_IMAGE`, and rejects stale
  preparation or unexpected production image drift. A repeat call verifies
  the already-active artifact without restarting it.

The cleanup helper is a finite operation, not a default maintenance recipe:
`python3 scripts/archive-reviewed-advisory-snapshots.py prepare` and then
`retire EXACT_VERIFIED_RESTIC_SNAPSHOT`. Do not invoke it again after retirement.
It requires a native verified restore and compares the complete archive and
all original DB/metadata member hashes before removing those exact local files.
Original application data, source, raw scan results and rollback images remain.
Restore archived databases before replaying historical scans; never substitute
current advisory data without declaring a fresh assessment.

Private evidence roots:
`/var/lib/utilibre-maintenance/search-20261115/` and
`/var/lib/utilibre-maintenance/security-20261115/`.
