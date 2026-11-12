# Vikunja 2.8.0 — deployed 12 November 2026

The owner approved the new 30-day project Trash period. Activation, stopped
native/cold backup checks, real public Authentik/MFA and synthetic
task/attachment/export/import/Trash checks passed. EN/ES retention guidance
and the upstream version record are deployed. See `release-status.json` for
the final identities and results; `recipe.json` retains the historical
preparation evidence rather than rewriting its frozen scan as current.

The final live check used only the existing marked disposable QA identity.
Its app account was deleted through Vikunja's native CLI; the identity was
retired, with its temporary password, sessions and MFA revoked. No ordinary
user work was read or modified by the workflow tests. Chromium 151 desktop
and 390px mobile emulation passed; no physical phone coverage is claimed.

The Nov 12 advisory comparison removes two medium Echo records and adds no
findings relative to the previous runtime. One low imaging record and two
unknown records (OpenPGP module and Go HTTP request-body concurrency) remain
open. They were not suppressed or called fixed. Both images use Go 1.27.3.

The official pinned amd64 image incorporates the retained Go dependency repairs.
It does not need the old 2.7.0 `vikunja-go-security-20261011.patch` or a custom
compiler build. Keep that patch and its source archives for the retained
2.7.0 rollback image and historical builds. Do not apply it to 2.8.0.

**Approved retention change:** 2.8.0 introduces project Trash with a hard-coded 30-day
retention period. Individual deleted tasks already have 30-day retention in the
pinned 2.7.0 source; project deletion previously hard-deleted its tasks and related
entities. This is a new retention behavior for deleted projects. The selected source has no supported configuration option for the
Trash period (`pkg/models/task_delete_cron.go`, `TrashRetention`). Activating it
changes retention behavior. The owner's approval and its scope are recorded
in `activation-approval.json`; the existing “do not change retention silently” requirement applies.
Do not replace native deletion with a custom cleanup patch. Cleanup runs hourly
after the retention period (tasks at :00, projects at :30), not at an exact
30-day deadline. `pending-copy.json` also contains an independent correction
clarifying the existing 2.7.0 task retention, which does not change policy.

## Exact inputs and results

See `recipe.json` for immutable images, upstream commit, configuration and test
hashes, raw-evidence identities and release gates. Sources are AGPL-3.0-or-later.
The repository worktree at commit `6e788bf87cebe50e2b8d034b213fcf94ae5449ee`
was clean. The official image includes the complete 2.8.0 frontend and backend;
we did not reuse the 2.7.0 frontend or rebuild upstream code.

The native test passed two-account creation, task completion, private project
and attachment access, exact downloaded attachment bytes, password-gated ZIP
export, ZIP import into the second account, reload and SQLite backup/restore.
The migration test seeded the actual retained 2.7.0 binary, upgraded its
synthetic database/files with 2.8.0, reopened the work, restored and permanently
deleted trashed projects, then restored the pre-upgrade snapshot into 2.7.0.

Two independent Chromium 151 sessions passed native OIDC login and reload at
1365×900 and 390×844. Screenshots were inspected after the loading overlay
disappeared. Only the local app and fictional identity provider were requested;
no browser exceptions or unrelated origins were observed. A network-none
namespace prevented egress. `navigator.onLine` was set true for loopback HTTP
inside that namespace; this is **not** an offline/PWA claim. Authentik, its MFA,
real phone hardware and production user data were not accessed in those isolated
checks. The separate live synthetic-account check described above subsequently
verified production Authentik/MFA.

Configuration stayed byte-identical, including the preexisting uncommitted
legal/privacy link. Native local registration remains disabled in the OIDC
fixture. Existing Sentry, metrics, mail, Unsplash, external avatars, webhook and
external-import restrictions were preserved. New audit logging and plugins
default to disabled in this pinned release. No live privacy settings were changed.

Frozen Trivy 0.76.2 scans used the same advisory database for before/after:

| Scope | Critical | High | Medium | Low | Unknown |
| --- | ---: | ---: | ---: | ---: | ---: |
| Retained 2.7 runtime | 0 | 0 | 2 | 1 | 1 |
| Candidate 2.8 runtime | 0 | 0 | 0 | 1 | 1 |
| Candidate Go/pnpm source locks | 0 | 0 | 0 | 1 | 1 |

The two removed medium records are `CVE-2026-118651` and
`CVE-2026-118653` in Echo v4. The remaining low `CVE-2023-36308` in imaging 1.6.2
and unknown `GO-2026-5932` for x/crypto remain visible and unresolved. No
exception or suppression was added. An absent source import for OpenPGP is
not a complete native dependency-reachability proof. Static C dependencies
inside the Go binary are not fully covered by a scratch-image package scan.
The database was updated 10 November 2026 at 19:01 UTC; replaying it later does
not constitute current security clearance.

## Repeat the isolated checks

Use the existing host Python (`requests`, PyYAML, PyJWT, cryptography), Node
24.22.3, Playwright Chromium and Docker. Root access is needed to enter the
temporary network namespaces. The scripts mount only new synthetic files and
the public repository config; they never mount application data or secrets.
The temporary applications use one CPU and 512 MiB each. Runs are sequential.
Choose new output names so evidence is not overwritten:

```sh
python3 deployment/maintenance/go-leaf-final/check-vikunja.py --image-id sha256:12c860da57e1d354d3a75f01ec6b88acb35ea3a38b213a1b9ecab339d59aa243 --output /absolute/private/report/native.json
python3 deployment/maintenance/releases-20261112/vikunja/check-upgrade.py --output /absolute/private/report/migration.json
python3 deployment/maintenance/releases-20261112/vikunja/check-oidc.py --output /absolute/private/report/browser.json
```

The migration adapter verifies the old native check's checksum before reusing
it. It tests ordinary workflows, not exploit fixtures. Browser reports and
screenshots contain only fictional accounts. Report directories must be
private and outside the repository. No deployment command is included.

## Release and rollback

The approved EN/ES text from `pending-copy.json` is applied, retaining the
existing saved-work backup explanation. Upstream metadata and source notices
reflect the actual deployment. Preserve the same
`tasks.utilibre.org` URL, OIDC provider, gateway, upload/import limits and secrets.
The exact corresponding-source archive was published before activation:
`https://tools.utilibre.org/utilibre-source/vikunja-2.8.0-upstream.tar.gz`.

`release.mjs --check` validates the exact prepared predecessor/candidate pair;
`--apply` is an explicit state-changing release, not a default audit. It takes
the existing native dump while stopped and retains a cold database/files copy
before activating only Vikunja. Fresh scans, image/configuration identities,
an 8 GiB free-space floor and the shared release lock are required. Do not
replay blindly against an already migrated service. `check-live.mjs` requires
the explicitly prepared synthetic identity and uses native interfaces only.

`portal-release.mjs` checks and activates only the content overlay built from
`Dockerfile.portal`. The accepted runtime's Node/Alpine repairs are unchanged.
The portal passed all 125 unit tests, typecheck, lint, FOSS/build checks and
four EN/ES desktop/mobile browser journeys. The tests' isolated network needs
loopback enabled; no external connection is permitted during the build/tests.

Rollback requires **both** the retained previous image and the pre-upgrade
database/files/config snapshot. Never run 2.7.0 directly against a database
already migrated by 2.8.0. The synthetic rollback passed; restoring real user
work remains the operator's established backup/release procedure. Private
`release.json` records the native dump hash and `before-data` cold copy. The
release driver preserves failed candidate data separately before restoring
the stopped predecessor. Never silently discard work written after a release.
The independent portal rollback restores its recorded previous image pin;
it does not roll back the application's database or deletion policy.

Primary references inspected 12 November 2026:
[release](https://github.com/go-vikunja/vikunja/releases/tag/v2.8.0),
[installation](https://vikunja.io/docs/installing/),
[pinned Trash source](https://github.com/go-vikunja/vikunja/blob/6e788bf87cebe50e2b8d034b213fcf94ae5449ee/pkg/models/task_delete_cron.go).
