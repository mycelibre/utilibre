# Shared nginx TIFF/zlib follow-up — 11 October 2026

Status at **20:56 UTC: deployed and checked** across 41 shared gateways and 26
artifact wrappers. The release changed the selected runtime image pins only;
listeners, accounts, user files and retention policies were preserved.

Alpine's signed v3.24 package index now supplies `tiff=4.7.2-r0` and
`zlib=1.3.2-r1`. The existing shared nginx 1.30.5 / Alpine 3.24.2 image contains
4.7.1-r0 and 1.3.2-r0 respectively. The native `apk` upgrade installs exactly
those two replacements, preserving the nginx binary version, entrypoint,
command, working directory, unprivileged identity and native application paths.
No packages were removed and no application was rebuilt.

## Candidate and evidence

- Base: `nginxinc/nginx-unprivileged:1.30.5-alpine@sha256:15c994d10d6d78658721c3bcafff14cb281fba2a4bdf9d5ba92c416a472516e3`.
- Candidate: `utilibre-nginx:1.30.5-alpine-tiff-security-20261011`.
- Deployed shared image ID: `sha256:b374bb83a3bf4dbc64b4ed35013dc4276afbb5c601acce931ac989794548c68b`.
- All **41** currently deployed exact-base configurations passed native
  `nginx -t` with read-only native mounts and the existing network namespace.
- A disposable alternate loopback listener passed three Rallly comparisons:
  `/login` remained 200 with native Rallly HTML; `/api/storage/` and
  `/api/auth/sign-up` remained 403 with identical denial bodies. Content type,
  referrer policy, nosniff and frame-denial headers matched.
- Offline Trivy scan at **20:48:47 UTC** identified all 70 Alpine packages and
  reported **zero vulnerability findings** for this shared runtime image.
  That is a dated database result, not a security guarantee or clearance of
  dependencies in the applications served behind nginx.

Private evidence is under `/var/lib/utilibre-maintenance/nginx-tiff-20261011/`.
The short-lived containers use `maintenance-*` names, no public port publishing,
bounded RAM/CPU, no capabilities, no-new-privileges and no container request log.
The route probe's configuration is a copy; the live configuration is checked
unchanged afterward. An initial probe failed because the private umask made its
copied config unreadable to uid 101; the harness explicitly sets that mounted
copy's read permission. Production was unaffected.

## Reproduce and prepare propagation

From the repository root:

```sh
node deployment/maintenance/check-nginx-tiff-security.mjs stage
```

This builds the candidate using `Dockerfile.nginx-tiff-security`, validates the
41 exact shared-runtime targets, performs the three read-only route checks and
scans the shared image. It writes a private inventory with current image IDs,
Compose paths and release methods. It never edits or recreates a live service.
Use the newest stage receipt after rebuilding: a locally rebuilt image can have
a new image identity even when its application files are unchanged.

The same recipe accepts only an explicitly reviewed artifact base. Optional
preparation for the **18 original plus eight extended** runtime wrappers is:

```sh
node deployment/maintenance/check-nginx-tiff-security.mjs stage --artifacts
```

To prepare only the wrappers while another maintainer releases the shared
gateways, use `stage-artifacts` instead. This does not rebuild or change the
shared candidate, revisit the 41 shared gateways, or overwrite their receipt.

```sh
node deployment/maintenance/check-nginx-tiff-security.mjs stage-artifacts
```

Wrapper-only preparation **passed at 20:54:30 UTC**: 26 configurations, 26
complete native application-root hashes unchanged, and 25 distinct candidate
images (one shared Binternet image). Baseline endpoints were 25 HTTP 200s and
one 302. A disposable Hat.sh candidate listener preserved its exact HTML body
and security headers and still rejected `/.git/config` with 404. No wrapper was
deployed during this staging check. Exact public image IDs and hashes are in
[`nginx-artifacts-20261011.json`](nginx-artifacts-20261011.json); the private
full deployment input is `nginx-tiff-20261011/artifacts-stage.json`.

The path uses the
previous private `static-runtime-20261011/stage.json` and
`extra-runtime-20261011/stage.json` ledgers, rejects changed live/base identities,
builds each unique candidate serially, validates native nginx configuration,
and hashes every file under each wrapper's actual application root before and
after. Glyphr uses `/srv/app`; other exceptional roots are retained from their
reviewed ledgers. The clearnet/onion Binternet pair shares one candidate.
An 8 GiB recovery free-space floor is enforced for these additional builds.
Do not interpret a prepared wrapper or HTTP response as a browser task test.

Final receipt validation caught an old-ledger compatibility error in the first
run: 17 original rows omitted the default `/usr/share/nginx/html` field, and the
optional hash branch skipped them. That run was not accepted for release. The
checker now supplies that explicitly reviewed default only for the original
group, requires a valid root and 64-character hash on every artifact, and reran
all 26 hashes. `stage-artifacts --verify-only` repeats checks on the already
built exact image identities without further builds. A separate final
inspection confirmed all 26 candidate IDs and original live IDs matched the
corrected receipt. Around 16 GiB of root free space remained.

There is deliberately no deployment mode. After reviewing the complete stage
receipt, update exact source pins and the established artifact build base, then
use the existing bounded release workflow and application smoke checks. Do not
simply retag the old upstream digest or make a global moving-tag substitution.
For future upstream builds, preserve the pinned package recipe or adopt a
verified upstream digest that contains the fixes; otherwise rebuilding from an
older Dockerfile can reintroduce them.

## Release boundaries and rollback

- **TRIP, 13ft and Unfurl:** use their native systemd supervisor restart, not a
  standalone gateway recreation; their namespace firewall setup is coupled to
  that workflow. Repeat the native internal-network denial checks afterward.
- **Wallabag's wrapper:** retain the established supervisor stop/recreate/start
  sequence and fetch-boundary checks.
- Other services: change only the selected service image using its existing
  Compose project, native environment file and `--no-deps`; keep all storage,
  networks and application dependencies in place. Rallly requires its existing
  `.env.rallly` when its Compose configuration is resolved.
- After each actual recreation, compare the intended endpoint and security
  behavior and confirm the running image ID. Stop on drift or a changed result.
- Roll back only that image pin through the same supervisor/Compose path. Do
  not restore a database, remove volumes, alter firewall policy or replace an
  entire older Compose file to roll back these two system libraries.

The separate Caddy VM is outside this change. This patch does not change the
backlogged application libraries, visitor data handling or upstream access rules.

## Completed release

The shared gateway release passed at 20:54:28 UTC; all 26 wrappers passed at
20:56:00 UTC. Each service retained its before/after endpoint responses and
matched the expected running image identity. TRIP, 13ft and Unfurl used their
native supervisors and their internal-network denial checks passed again.
Wallabag used its coupled supervisor sequence. The release helper rejects
non-image service-configuration changes and incomplete artifact-hash receipts.
These gates do not claim that every application workflow or unavailable upstream
provider was retested.

Normal final-nginx source Dockerfiles now explicitly install the two pinned
Alpine packages, including the generic artifact wrapper and JupyterLite builder,
so ordinary future builds do not silently reintroduce the old shared layer.
Wishlist's remaining occurrence of the original Alpine digest is only a Caddy
archive extraction stage; its final runtime is separate and does not copy those
Alpine libraries. The old runtime and wrapper images remain emergency rollback
targets, with native application data unchanged.

The public [runtime release manifest](runtime-release-20261011.json) contains
the selected live release facts. Private `gateways-release.json` and
`artifacts-release.json` retain the per-service deployment receipts. No private
environment, user data, mail content or credentials are included publicly.
