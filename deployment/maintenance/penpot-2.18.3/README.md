# Penpot 2.18.3 security candidate — 11 October 2026

Built and isolated-tested, then deployed by the main maintainer through the
expanded stack release on 11 October. Read-only inspection at 21:09 UTC confirmed
the six native Penpot containers running: frontend/backend/exporter at the exact
candidate IDs below, unchanged hardened admin, the separately reviewed
PostgreSQL 17.11 vendor layer and pinned Valkey 9.1.1. Database and Valkey health
checks were healthy. Public login/OIDC release verification is recorded by the
main maintainer; container state alone does not establish that journey.
No production authentication or retention setting is changed by this recipe.

## Reason and exact inputs

[Upstream 2.18.3](https://github.com/penpot/penpot/releases/tag/2.18.3), published
6 October, fixes imported SVG sanitization/content-type handling (PR 12105) and
file access retained by removed team members (PR 12097). Source commit:
`ff7a66f51938b2293260ea27a64e2c4e0833b5e3`, MPL-2.0. These application fixes were
not supplied by the earlier 2.18.2 dependency-only repair.

| Component | Pinned candidate |
| --- | --- |
| Backend | `utilibre-penpot-backend:2.18.3-libraries-security-20261011`, image ID `sha256:4746bdafbe62fd3423c6802e8ee106b453d00be47570e7e9c37ec4e735430301` |
| Backend base | `penpotapp/backend:2.18.3@sha256:2df1b3440d2a82cc3571db211b4ffdfa2b89ccc910759e8d5e9387fb62971b5c` |
| Frontend | `penpotapp/frontend:2.18.3@sha256:bb8abe27d53de84c95597f2c02c0e702b2779971fb0703e543f9ecf183e999f6` |
| Exporter | `utilibre-penpot-exporter:2.18.3-vendor-security-20261011`, image ID `sha256:4b6fd678f60b95698cfecbc175844bdc95c5bdb80d81d936ea010c46ad987dc1` |
| Admin | Keep `utilibre-penpot-admin:seroval-security-20261011-p2`, ID `sha256:e907c2fd6febb2cefa046978c718e3e4e68cf3444201c574bdf2421c07123bc1` |

The official admin image has the same manifest digest in 2.18.2 and 2.18.3:
`sha256:5935b5adbf33eb7abaabfab657fe8f5d465cac08e62e340f932ddb35ce0f311f`.
Keeping the existing reviewed layer preserves its Seroval repair.

The 2.18.3 common/backend dependency declarations still need the compatible
Jackson 2.22.3, Netty 4.2.17.Final and lz4-java 1.11.4 pins. `build.sh` reuses
`../penpot-libraries/patch.clj` with assertions on the original dependency
versions. There is no fork of the application logic. The final image replaces
only `/opt/penpot/backend/penpot.jar`, preserving upstream runtime and launcher.

`Dockerfile.penpot-exporter-vendor` adds six exact signed DHI package backports
to official exporter digest
`sha256:418232d6ca3120b1c2bfde298a56a05a1f41f567cd8494deac3fe7fbc186cfbd`:
expat, cups, PNG, libxi, xserver-common and Xvfb. The layer adds 1,926,361 bytes.
The native user/command/entrypoint/environment/workdir are unchanged. Combined
file-content SHA-256 over `/opt/penpot` and `/opt/imagick` is unchanged:
`5dea8df2b4048994aaea01fa092c47cdd67826134d212af0edf9f3aa3bde7c84`.
The official frontend has no upgrades offered by its signed vendor repositories.

## Build

Archive only `backend`, `common` and `CHANGES.md` from the exact source commit
with `git archive --format=tar`. The input SHA-256 must be
`1d61e7277dd38fc351b1db3244606d4d86db07e38f58a5cbc95e5fe9064cb18b`.
The existing archive is
`/var/lib/utilibre-maintenance/penpot-2.18.3-source.tar`.

Run `build.sh` using the pinned builder
`clojure:temurin-25-tools-deps-1.12.6.1673-bookworm-slim@sha256:2ebab8c189509df632e9ec931805737c92de93aa6d6b9f998d7124c686782e1a`.
Mount the archive read-only at `/input/source.tar`, this repository's
`deployment/maintenance` read-only at `/reviewed`, and an empty output directory
at `/output`. Use a 2300 MiB `/work` tmpfs, 2 CPUs, 4 GiB memory, 512 PIDs and
no-new-privileges. The script caps Java heap at 1536 MiB. Allow build-time Maven
downloads, not production requests. Require at least 8 GiB free disk first.

Build the runtime with `Dockerfile.penpot-2.18.3` and the output directory as
context. Current output is
`/var/lib/utilibre-maintenance/penpot-2.18.3-20261011`. The tested jar SHA-256 is
`7bea0840ef8cf9cef38127af3b22c69d62db3665ce2df94f3975c43656adafe8`.
Generated dependency declarations and tree are retained beside it. Do not
replace the candidate tag with an unreviewed rebuild during rollout.

## Verification and limits

`node deployment/maintenance/check-penpot-2.18.3.mjs` passed using an internal
Docker network, a disposable RAM-backed blank database/assets and two fictional
accounts. Initial evidence: `/opt/utilibre/reports/penpot-native-roundtrip-rj9u6nft`.
The complete gate repeated successfully with the final vendor exporter image:
`/opt/utilibre/reports/penpot-native-roundtrip-cy3dh1a3`.

- Native .penpot export/import preserved an editable rectangle; browser editing,
  save/reload, cross-account denial and deletion passed.
- Native member removal and voluntary leaving revoked access. Team/project/file
  role cleanup passed; an inserted legacy orphan relation did not restore access.
  The owner and unrelated private work stayed accessible. Membership setup used
  isolated SQL fixtures: this is not an email-invitation test.
- No external browser requests or browser errors in that test. Production OIDC,
  public gateway and privacy settings still need the release smoke test.
- Native `/api/export` rendered a synthetic rectangle to a valid 240 × 160 PNG
  using upstream Chromium. Signature, measured dimensions and download passed;
  `check-exporter.mjs` makes no changes to browser launch or sandbox flags.
  PDF visual export has not been separately tested.
- `check-svg.clj` passed when run against the candidate jar with network disabled:
  native SVG sanitization, mixed-case/space/charset content types, unsupported type
  rejection, malformed SVG rejection and consistent output size/hash. This is a
  native-helper test, not a crafted malicious .penpot archive import test.
- Disposable containers, network, relay and synthetic RAM files were removed.

The existing native test now reads the tested version from its private metadata
(allowlist 2.18.2/2.18.3), rather than reporting 2.18.2 for both.

Trivy receipts `backend-scan.json`, `frontend-scan.json`, `exporter-scan.json` are
in the private output directory. Backend Java: 170 detected packages and zero
high/critical findings. Exporter Node: zero high/critical findings. These are
scanner findings, not a proof of absence of vulnerabilities.

**OS coverage remains incomplete:** upstream's backend Dockerfile removes all
of `/var/lib`, including the package database; the backend scan detects zero OS
packages. No replacement package metadata has been invented. The official
frontend/exporter images still produce OS findings (raw frontend 4 critical/102
high; exporter 3 critical/177 high), including duplicate DHI package-version
records. `dpkg-query` confirms current frontend/exporter PCRE2, SQLite and OpenSSL
already meet the listed fixed versions; older DHI `status.d` records explain
many raw duplicates. No package metadata is deleted to suppress findings.
Those counts are not confirmed exploitability or a waiver. Preserve
this limitation in the maintenance queue; this release fixes native application
issues without claiming every upstream OS issue is repaired.

The exact official backend image does have an SPDX attestation, but its amd64
inventory contains only 185 packages and seven Debian/source records; it omits
the installed libc, OpenSSL and image/font libraries. It is not sufficient to
close the OS inventory gap. Attestation manifest:
`sha256:c98520640e69ceb76fc71057633fd2ea652dd248bfc4c93861c0bf7b52f2e6df`.
The official provenance identifies runtime base
`dhi.io/debian-base:trixie-debian13-dev@sha256:61dc022a1908439c478ed4b00e883fe8a7a03540fac23a8aed61352e28e6ae07`.
On 11 October this VM's anonymous pull returned HTTP 401. Rebuilding that exact
runtime with the package database retained requires authenticated DHI registry
pull access. Neither another image's package database nor this partial SBOM
should be presented as the running backend's complete inventory.

Neither `/root/.docker/config.json` nor `/home/ubuntu/.docker/config.json` exists,
and this session has no alternate `DOCKER_CONFIG`. No existing DHI credential
helper configuration was available; no credentials were displayed or requested.
The final exporter vendor scan still reports 3 critical/177 high raw OS findings
and zero high/critical Node findings; the small vendor refresh is not described
as resolving unrelated or duplicate upstream scanner findings.

## Release and rollback

Take a fresh native database/assets backup before changing the three image pins;
preserve the existing OIDC-only access policy, quotas, privacy gateway, disabled
MCP/PREPL and telemetry settings. Do not enable test password login in production.
Verify database readiness, frontend login, OIDC start at the approved Authentik
origin, native version, exporter readiness and normal account access.

Upstream migration `0153-del-orphan-profile-rels-after-team-leave` deletes orphan
permission relations, not design documents. Review its successful application.
Read-only production `migrations` metadata confirms module `main`, step `0153`,
registered at `2026-10-11 21:06:36.811985` UTC; no user-content rows were read.
An image-only rollback does not undo that migration. Retain old image IDs and
the pre-upgrade backup; if a database restore is actually necessary, stop writes,
preserve a post-upgrade copy and explicitly reconcile any intervening user work.
Do not automatically restore over new data or restore stale permissions merely
to recover the older version. Existing configured backup retention is unchanged.

After production success, update the catalogue/source/version record and the
security review's image/file identities. Do not rebind old advisory reviews
before reviewing the final running images and unchanged mitigation settings.
