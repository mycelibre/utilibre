# Same-version dependency patch release — 11 October 2026

This is a narrow follow-up to [the runtime maintenance release](../../docs/updates.md).
It does not close the whole vulnerability queue. Scanner findings, package
presence and demonstrated exploitability are different evidence.

## Patch boundaries

- Rallly stays on application 4.15.4. Its separately installed XML parser is
  replaced with fast-xml-parser 5.11.2 and its reviewed, locked dependencies.
  The installed npm CLI's tar package is separately updated to 7.5.21.
- Uptime Kuma stays on 2.5.5 with its native SQLite database. Its Node runtime,
  unchanged native Go healthcheck, protobuf, tar and gRPC libraries are updated
  to Node 22.23.2, Go 1.26.9, protobufjs 7.6.6, tar 7.5.21 and
  @grpc/grpc-js 1.14.5 respectively.
  The native SQLite addon is checked against the replacement Node binary.
- Reactive Resume stays on 6.0.0. The separately installed Seroval package is
  updated to 1.6.8; the application server and web bundles are not recompiled.
  The installed npm CLI's tar package is separately updated to 7.5.21.
- Penpot stays on 2.18.2. Its backend JAR is rebuilt from commit
  `cf46b53bcb61c2a9be8f202bec03647a5470d43d`, changing Netty to 4.2.17.Final,
  Jackson core/databind to 2.22.3 and lz4-java to 1.11.4. The official launcher,
  JVM, filesystem contract, frontend and exporter remain in place. Its admin
  console's separately installed Seroval 1.5.6 is replaced with 1.6.8; a separate
  1.6.7 package and compiled SSR code were not rebuilt. This is not a claim that
  every bundled copy of a dependency was patched.
- Gathio still uses FerretDB 2.7.0, rebuilt from commit
  `0d5eb3343a50b800634cc08ace608bb6f3a3f74b` with Go 1.26.9 and the committed
  dependency graph. The official scratch image, native identity, healthcheck,
  protocol and storage contract are preserved. The MCP SDK remains at 0.2.0:
  the proposed newer SDK did not compile with the upstream API. The native MCP
  listener and trace exporter are explicitly unset and telemetry is disabled.
  Its remaining SDK findings stay open; disabling a listener is not a patch.

The npm replacements copy complete package directories into the existing
native paths. Earlier candidates replaced those paths with symlinks: native
loading used the new packages, but image scanning retained old-layer package
records. Direct replacement fixes the packaging ambiguity without suppressing
findings. Only the replacement packages' dependency lookup uses a link to the
locked dependency tree. Package licences and notices remain in those packages.

No public service, registration, account permission, storage retention, visitor
instrumentation or sandbox policy is added or changed by this batch.

## Final release image identities

These are the immutable identities returned by Docker inspection for these
running images. Do not substitute the different config-blob hash printed
during a BuildKit build. The finite release checker compares both the tag and running identity;
do not infer successful production rendering merely from this table.

| Service | Release tag | Image ID (`sha256:`) |
| --- | --- | --- |
| Rallly | `utilibre-rallly:libraries-security-20261011-p3` | `bfdb030bc867d6bd94eaf7c55d59d289a63f62dc217b9494b975c57dfe2aa88c` |
| Kuma | `utilibre-kuma:runtime-security-20261011-p5` | `4ddf4658edd048a10fe465c92ac80561c0745071596c49a7533fd0dcc5a7aff9` |
| Resume | `utilibre-resume:seroval-security-20261011-p3` | `85ea55446d742a559ba0625878dcbf3295723b889d7751a6d628f34cfae085c3` |
| Penpot backend | `utilibre-penpot-backend:libraries-security-20261011` | `face9ec76086ec826dcfa6c2416c15c16f06e24695e54cf8c820cd1dddc48c7d` |
| Penpot admin | `utilibre-penpot-admin:seroval-security-20261011-p2` | `e907c2fd6febb2cefa046978c718e3e4e68cf3444201c574bdf2421c07123bc1` |
| Gathio FerretDB | `utilibre-ferretdb:libraries-security-20261011` | `465bd70f7d7ee9304b68214887133fa07c0a41bd38c8195fc326ff3f471b6221` |

## Rebuilding

Run from the repository root. These are Linux AMD64 builds for the existing
deployment; they do not establish cross-platform compatibility or bit-identical
JAR timestamps. Retain the original local base images, or reproduce them first
using the preceding maintenance release's recipes. Compare their identities
against the release manifest before building; do not silently substitute a
new image behind a local tag.

The `rallly-libraries`, `kuma-libraries`, `seroval-library` and `npm-tar` package locks are
the complete reviewed npm inputs. BuildKit uses `npm ci --ignore-scripts`
without audit or funding requests. Dockerfiles pin the public builder images.
Build the Rallly, Kuma library/runtime and Seroval Dockerfiles with context
`deployment/maintenance`; the runtime Kuma build consumes its library image.
The generic Seroval build takes these native contracts:

| Target | `BASE` | `APP_ROOT` | `RUN_USER` |
| --- | --- | --- | --- |
| Resume | `utilibre-resume:debian-security-20261011` | `/app` | `1000:1000` |
| Penpot admin | `penpotapp/admin-console:2.18.2@sha256:5935b5adbf33eb7abaabfab657fe8f5d465cac08e62e340f932ddb35ce0f311f` | `/nitrate/apps/admin-console` | `65532:65532` |

```sh
docker build -f deployment/maintenance/Dockerfile.rallly-libraries \
  -t utilibre-rallly:libraries-security-20261011-p2 deployment/maintenance
docker build -f deployment/maintenance/Dockerfile.npm-tar \
  --build-arg BASE=utilibre-rallly:libraries-security-20261011-p2 \
  --build-arg RUN_USER=nextjs \
  -t utilibre-rallly:libraries-security-20261011-p3 deployment/maintenance
docker build -f deployment/maintenance/Dockerfile.kuma-libraries \
  -t utilibre-kuma:libraries-security-20261011-p4 deployment/maintenance
docker build -f deployment/maintenance/Dockerfile.kuma-runtime \
  -t utilibre-kuma:runtime-security-20261011-p5 deployment/maintenance
docker build -f deployment/maintenance/Dockerfile.seroval-library \
  --build-arg BASE=utilibre-resume:debian-security-20261011 \
  --build-arg APP_ROOT=/app --build-arg RUN_USER=1000:1000 \
  -t utilibre-resume:seroval-security-20261011-p2 deployment/maintenance
docker build -f deployment/maintenance/Dockerfile.npm-tar \
  --build-arg BASE=utilibre-resume:seroval-security-20261011-p2 \
  --build-arg RUN_USER=1000:1000 \
  -t utilibre-resume:seroval-security-20261011-p3 deployment/maintenance
docker build -f deployment/maintenance/Dockerfile.seroval-library \
  --build-arg BASE=penpotapp/admin-console:2.18.2@sha256:5935b5adbf33eb7abaabfab657fe8f5d465cac08e62e340f932ddb35ce0f311f \
  --build-arg APP_ROOT=/nitrate/apps/admin-console --build-arg RUN_USER=65532:65532 \
  -t utilibre-penpot-admin:seroval-security-20261011-p2 deployment/maintenance
```

Penpot's selected source must be a clean checkout at the exact commit above;
`penpot-libraries/build.sh` rejects a different revision or modified relevant
source. Build into a new artifact directory, not a live data directory:

```sh
LIBPATCH_REPO="$PWD"
LIBPATCH_PENPOT="$(mktemp -d /var/tmp/utilibre-penpot-library-build.XXXXXX)"
docker run --rm --cpus 2 --memory 5g --pids-limit 256 \
  --tmpfs /work:rw,exec,size=3g \
  -v /opt/utilibre/expanded-src/penpot:/input:ro \
  -v "$LIBPATCH_REPO/deployment/maintenance/penpot-libraries:/reviewed:ro" \
  -v "$LIBPATCH_PENPOT:/output" \
  clojure@sha256:2ebab8c189509df632e9ec931805737c92de93aa6d6b9f998d7124c686782e1a \
  sh /reviewed/build.sh
docker build -f deployment/maintenance/Dockerfile.penpot-libraries \
  -t utilibre-penpot-backend:libraries-security-20261011 "$LIBPATCH_PENPOT"
```

The committed `backend-deps.edn` and `common-deps.edn` record the generated
dependency selections. The script applies the small dependency-only patch to
a disposable copy and leaves the source checkout untouched. Outbound Maven/Git
dependency downloads occur during building, not as new visitor requests.

For FerretDB, use the exact source archive verified by
`ferretdb-libraries/source.sha256`; the retained archive is
`/var/lib/utilibre-maintenance/ferretdb-libraries-20261011/source.tar.gz`.
Its [exact upstream download](https://codeload.github.com/FerretDB/FerretDB/tar.gz/0d5eb3343a50b800634cc08ace608bb6f3a3f74b)
was independently fetched and matched SHA-256
`7f17d04d55e272365208291473045cbc3d8e460033a94b8085c373b22a57f5c1`.
The builder checks its checksum before extraction and uses committed
`go.mod`/`go.sum` with `go mod verify` and `-mod=readonly`:

```sh
LIBPATCH_FERRET="$(mktemp -d /var/tmp/utilibre-ferret-library-build.XXXXXX)"
docker run --rm --cpus 2 --memory 6g --pids-limit 256 \
  --tmpfs /work:rw,exec,size=5g \
  -v /var/lib/utilibre-maintenance/ferretdb-libraries-20261011:/input:ro \
  -v "$LIBPATCH_REPO/deployment/maintenance/ferretdb-libraries:/reviewed:ro" \
  -v "$LIBPATCH_FERRET:/output" \
  golang:1.26.9-alpine@sha256:3082400e369fa24d5fc60bca20edab3f6d604e0c5a690ec66b295eff4dd87ade \
  sh /reviewed/build.sh
docker build -f deployment/maintenance/Dockerfile.ferretdb-libraries \
  -t utilibre-ferretdb:libraries-security-20261011 "$LIBPATCH_FERRET"
```

Keep builds serial on this VM. The build limits are temporary builder budgets,
not service concurrency promises. No production volume or credential is mounted
in either compiler container. Final native smoke/restore gates must pass again
before releasing a newly built image.

## Verification and limits

Tests use Linux Chromium, native APIs and disposable containers. They are not
real-phone coverage or penetration tests. Network-creating isolated checks are
run serially: concurrent clones exhausted the current Docker address pool once;
the affected check was rerun after cleanup without changing production networks.

| Gate | What it establishes | What it does not establish |
| --- | --- | --- |
| `check-rallly-libraries.mjs` and `check-rallly-xml.cjs` | Native empty-database migrations, a fictional two-option invitation rendered, UTF-8 XML parsing/building and malformed-syntax rejection; no external browser origin in that check | Organizer sign-in or poll creation through production OIDC |
| `check-kuma-slim.py` | Native isolated SQLite restore, saved public status page and operator login; 59 HTTP and one TCP monitor definition retained | Every monitor type or notification transport; polling is disabled only in the isolated clone |
| `check-kuma-libraries.cjs` | Native protobuf encode/decode, Kuma gRPC service construction and tar creation/extraction | A remote gRPC endpoint, malicious-archive exploit coverage or every protobuf input |
| `check-seroval.cjs` | Native UTF-8, cycle, typed-array and date serialization round trip; malformed node rejected | Exhaustive unsafe-input testing or replacement of compiled/inlined copies |
| `check-resume-account-export.mjs` | Two fictional accounts, ZIP export, JSON import, editing/reload, account separation and deletion | A production user's recovery or every resume template |
| `check-penpot-libraries.mjs` | Two fictional accounts, editable document export/import/reload, account separation and deletion against the rebuilt backend | Admin-console authenticated operations or every frontend/exporter feature |
| `check-gathio-restore.py` | Native saved-work restore with networking disabled; fictional event creation/edit/reopen, ICS import/export, image and wrong-token denial | Every MongoDB-compatible operation or proof that the unused MCP dependency has no reachable flaw |
| Gathio live fictional event check | Public HTTPS creation, viewing, ICS export and deletion of only the new test event | Existing visitors' events, sustained uptime or capacity |

FerretDB's six selected portable Go test packages pass. The entire upstream test
suite did not pass in this build environment: some tests assume a Git checkout,
non-root permissions or older compiler-specific stack locations. Native Gathio
restore and task checks are the release gates, not a substituted whole-suite
success claim.

Private receipts and recovery material remain outside Git. Relevant dated
directories are `/var/lib/utilibre-maintenance/{rallly-libraries,kuma-slim,gathio,library-release}-20261011/`
and `/opt/utilibre/reports/`. Publish only redacted summaries, never saved
account contents, tokens, credentials or raw environment inspection output.

Final Kuma's isolated restored login/status check passed at 20:39:54 UTC with
protobufjs 7.6.6. The Rallly and Resume complete `/app` trees were unchanged
between their functionally tested p2 images and final p3 images; the p3 change
is npm's separate tar dependency, whose native module check passed. This
justifies reusing the application workflow evidence, not claiming that a fresh
organizer or resume workflow was repeated after that CLI-only replacement.
Penpot's dependency-rebuilt JAR SHA-256 is
`a07a5c889bd760b9794b1cf838db284647b8e6afb41a5a8f7e976af21e030040`.

## Deployment and rollback

Release only the changed services; do not recreate databases or restore saved
work merely to undo a dependency patch. Community Compose requires
`--env-file .env.rallly` when recreating Rallly; omitting it can inject the
`UNCONFIGURED` fallback instead of the existing secrets. Expanded services use
their existing `.env`. Check native health and actual public rendering after
startup; `running`, an HTTP 200 or a transiently blank SPA is not task success.

Pre-release native backups were retained at:

- `/opt/utilibre/community-backups/2026-10-11T20-13-45-308Z`
- `/opt/utilibre/expanded-backups/2026-10-11T20-21-50-282Z`
- `/opt/utilibre/calendar-backups/gathio-20261011T202151Z`

The expanded backup's PostgreSQL and SQLite restore/integrity checks passed.
Temporary sharing data was not added to backups. Recovery snapshots contain
private saved work and are not public release assets.

For an application regression, restore only its previous image reference from
the saved pre-release Compose file or release manifest, using the same native
environment file and `up -d --no-deps` for the specific service. For Penpot,
backend/admin can be reverted independently while keeping the same 2.18.2
frontend/exporter. For FerretDB, retain DocumentDB and Gathio data and revert
only the FerretDB image. Do not perform a broad Compose rollback over unrelated
later changes, delete volumes, or restore an old database over newer work.
Old vulnerable images are emergency recovery options, not acceptable permanent
public fixes. Rerun the relevant native check and scanner after rollback.

Keep raw scans and scoped review evidence. A reviewed upstream application
advisory is not clearance for all transitive dependencies. Pending
vendor-unfixed, compiled-bundle and compatibility-blocked findings remain in
the private queue; none is waived merely because these workflows passed.
