# Redlib deployment

## Reviewed listing and comments repair — 29 October 2026

The deployed build uses the maintained [polak14/redlib fork](https://github.com/polak14/redlib/tree/29f18352cf54be4ffe579f773552acd0c45cdd08),
revision `29f18352cf54be4ffe579f773552acd0c45cdd08`, AGPL-3.0-only.
Its native GraphQL client retrieves listings, posts and comments using the existing anonymous
Reddit OAuth identity. No personal account, other operator's proxy or visitor
request to Reddit is introduced. This is a modified fork, not the official
Redlib 0.40 release: its Cargo version is still 0.36.0.

Release status and observed results are recorded in
[the incident record](../../docs/records/redlib-threads-2026-10-20.md).
Do not infer successful public operation from the `/settings` health check.

### Exact repair sequence

[recipe.json](recipe.json) pins the archive, ordered patches, input/output file
hashes and maintained runtime. Scheduled activation additionally requires the
matching reviewed [update policy](update-policy.json); an upstream announcement
or vulnerability finding does not authorize a replacement.

1. Retain the existing scheme-relative/backslash settings-redirect protection.
2. Stamp the exact source revision when building an archive without `.git`.
3. Retain the upstream removal of the HTML scraper. Bound GraphQL responses to 8 MiB and 20 seconds; reject denied, malformed or
   incomplete responses without scraping fallback. Keep automatically loaded
   rich-text, flair and award media on native same-origin media-proxy paths; retain normal external
   article links. Exclude comment content/request paths from error logging.
   Preserve sort in comment pagination and compare update information with the
   selected fork.
4. Apply the package-manager-generated lock update to Tokio 1.54.1. No other
   package version changes; Cargo also resolved five existing dependency edges
   differently. Preserve the complete lock patch.
5. Point the native Code link at the complete matching modified source archive.
   The configured banner appears on the native information page, not on threads.

The tested predecessor is
`utilibre-redlib:graphql-e48efd8-20261024`,
image `sha256:42dd36c9d8b0c781bf86df719cf05cda277b9af71a7c0560465e13fa8df14fdf`.
All its native-library repair layers must remain. Rebuilding on bare Ubuntu
would lose those repairs.

### Preparation and verification

Download the exact archive named in the recipe in a controlled download step.
Then prepare a clean tree without network access:

```sh
node config/redlib/prepare-source.mjs /path/to/candidate.tar.gz /path/to/new-review-directory
```

Repeating that command checks the complete prepared tree and makes no further
changes. Wrong archive/patch hashes or unexpected prepared-tree changes fail.
The script does not build, deploy, resolve dependencies or make live requests.

Use the pinned Rust builder, recorded toolchain image and locked dependencies.
The selected Rust compiler for this release is 1.98.0. The source Dockerfile
runs native build-script, GraphQL, feed, media-URL and redirect tests with networking
disabled. It builds only the production `redlib` binary. A private diagnostic
binary used in testing is not part of the published application.

Before a source build, compare `docker image inspect` of the runtime reference
with the exact image ID in the recipe. Build to a new tag, with bounded CPU/RAM
and sufficient disk. Never overwrite the predecessor tag. The Dockerfile's
build-time Debian packages are not a claim of byte-reproducible builds.

A locally compiled release binary can be packaged by copying only
`/usr/local/bin/redlib` onto that verified runtime. Check layer ancestry,
binary checksum, unchanged runtime settings and a same-snapshot security scan.
Behavioral release gates include a thread with comments, pagination, sorting,
focused replies, same-origin media and settings redirects. Live checks require
a finite operator-approved request budget; they are not a default offline test.

Publish the matching source, dependency sources, notices, lockfile and build
instructions before activation. Keep previous source offers available.
Preserved native-runtime repair sources remain in the shared source directory.

### Scoped activation and rollback

The production release is stateless. There is no database or data migration.
Update only the exact Redlib image pin in `compose.yaml` and the protected
local `.env` override, after recording both predecessors. Resolve Compose and
verify every other Redlib setting is unchanged except the source link updated
in the native banner, then use the existing project:

```sh
docker compose up -d --no-deps --no-build --pull never redlib
```

Check health and an actual comment page through both the backend and public
Anubis route. On failure restore both exact predecessor pins and run the same
scoped command and restore the previous matching-source link in the banner. Retain the
previous image; do not prune it as part of release.
Image rollback does not change browser preferences.

### Operating boundaries

Keep the existing 0.5 CPU, 256 MiB RAM/no additional swap, 128 PID limit,
32 MiB tmpfs, non-root user, read-only root, dropped capabilities and
`no-new-privileges`. Only Anubis publishes a host port; Redlib has none.
Preserve `privacy-frontends`, the public URL and enabled-service entry.

Indexing, RSS, HLS and autoplay remain disabled; NSFW content is off by default.
RSS must be omitted entirely: the upstream treats even an `off` value as set.
`RUST_LOG=warn` excludes informational anonymous-device/token-prefix messages.
Error logging must not include comment content or visitor request paths.
Preferences remain optional first-party browser cookies, not server history.

Reddit can still restrict the anonymous upstream client. A successful bounded
check is not an uptime guarantee. Do not switch automatically to HTML scraping,
another instance or visitor-side Reddit requests when access fails.
Earlier failed candidates and dated observations remain in the incident record.

## Daily guarded maintenance

`utilibre-redlib-update.timer` runs at **03:40 UTC plus up to ten minutes of
jitter**, and catches up after downtime. This is deterministic Node, Docker,
Cargo and Trivy execution: it uses no LLM or paid API. The existing 03:20 upstream
review remains the broader release/advisory inventory.

The new job checks one public GitHub commit response and compares the running
image, configured pin, recorded revision and patch hashes. When already current,
it checks actual comments, listings, pagination, sorting and supported media
with at most ten backend requests, without a rebuild or restart. These checks
contact Reddit through Redlib; they do not repeat the public Anubis browser test.
An upstream restriction remains a failure even when `/settings` is healthy.

**An unfamiliar upstream revision requires review.** This workflow does not
automatically rebase patches, resolve newer dependencies, build an unreviewed
release or revert to an unpatched upstream image. A maintainer must first prepare
the exact new artifact through the existing source-build procedure, preserve the
current image as its predecessor, publish matching source, and update the reviewed
recipe and policy. Once those inputs exist, the daily job can verify and activate
that exact artifact unattended. It only handles the stateless Redlib service.

### Operator entry points

```sh
node scripts/redlib-maintain.mjs --check
node scripts/redlib-maintain.mjs --stage
node scripts/redlib-maintain.mjs --apply
```

- `--check`: live/configuration inspection and one upstream lookup; no Reddit
  browsing, staging or activation. Writes a private check report.
- `--stage`: validates the approved local images and source bundle, replays the
  patches, runs the 22 offline regression checks, scans the exact image and Cargo
  lockfile, then exercises a private candidate. Requires the approved revision
  to match upstream. Does not modify production.
- `--apply`: the scheduled path. Checks browsing when current or awaiting review;
  otherwise stages and promotes only the approved artifact. It also recovers an
  interrupted transaction before attempting a new upstream lookup.

`scripts/update.sh redlib` delegates to the same `--apply` path. There is no
second updater. A single `flock` excludes overlapping manual and scheduled runs.
Stages need 10 GiB free space, the exact local toolchain image, published source
bundle and existing Trivy installation/database. Offline builds are limited to
two CPUs, 4 GiB RAM, 256 processes and twenty minutes. The private browsing
candidate uses 0.5 CPU, 256 MiB RAM, no published port and no production volume.
An interrupted stage's recorded, uniquely labelled containers and scratch files
are cleaned on the next stage/apply; other containers, images and backups are
never pruned. The overall systemd job has a fifty-minute limit.

The pinned Trivy 0.75.0 runs without network, ignores, registry pulls or database
refresh. Both scans use one local database copy, whose update time must be at
most 48 hours old. The existing separate security scanner refreshes that database.
Missing tools, extraction changes, stale data or any difference from the reviewed
finding set block promotion. The current baseline is **92 OS packages and 320
Cargo package records; 79 medium and 13 low findings, zero high/critical** as
assessed on 29 October. This is not a claim of no vulnerabilities or future
clearance. A changed finding set needs a new assessment, not a suppression.

### Activation, recovery and alerts

Promotion changes only the private `.env` image pin and matching-source banner.
It preserves other values, file ownership and permissions; concurrent file,
image or service-configuration drift stops it. The existing scoped Compose
release helper recreates Redlib only. Failed candidate health or browsing
restores the recorded pins and predecessor image, then checks its native health.
That health check does not promise Reddit access has recovered upstream.

The private transaction journal is written before a pin changes. If a process
is interrupted, a later `--apply` validates the journal and restores the recorded
predecessor before new work. Manual drift prevents automatic recovery. **Do not
delete a pending journal to bypass a failure.** Inspect the private report and
reconcile the exact image/configuration first.

Reports live under `/var/lib/utilibre-maintenance/redlib-update/` (0700):
`last-run.json` is the scheduled result, while manual checks/stages have separate
reports. Each stage retains tests, scans, database identity and workflow evidence;
temporary build data and the copied database are removed. For an archived scan
replay, separately retain the database snapshot with its recorded SHA; these
reports alone do not reproduce advisory data or guarantee identical build bytes.
Do not publish raw responses or private configuration evidence.

The existing alert service checks failed units, failed browsing, overdue runs
(36 hours) and review-required revisions. It retains the existing deduplication
and cooldown; this updater sends no mail itself. A manual stage cannot hide a
failed scheduled run. The fleet security scanner remains separate and continues
assessing the currently deployed image.

To stop automatic maintenance without changing the application:

```sh
systemctl disable --now utilibre-redlib-update.timer
```

Let any active transaction finish; inspect its report before terminating it.
Disabling the timer does not roll back an image. Use the recorded predecessor
and the scoped rollback procedure above when an application rollback is needed.

### Verification evidence

On 29 October 2026, the full isolated stage passed with the current approved
image: 22 native regressions, complete 92/320 package extraction, unchanged
reviewed findings, eight successful workflow requests and matching public source.
Private evidence: `run-FBlRi5/stage.json` beneath the report directory.

`node --test scripts/test-redlib-maintain.mjs` exercises approval/drift rejection,
malformed or incomplete scans, actual missing-executable/timeout handling,
idempotent pinning, transaction failures, journal scope and alert freshness.
`node scripts/test-redlib-release.mjs` is an **explicit optional Docker test**:
it uses a separate, network-disabled Compose project with harmless commands to
test successful replacement and forced-failure rollback. It does not run in the
daily job. The observed run `integration-EcdvR9/result.json` passed and confirmed
the production containers were unchanged. Native browsing is tested separately;
the harmless-command test is not an upstream reliability claim.

The installed systemd service completed its first `--apply` at 07:37 UTC on
29 October: `up-to-date`, eight successful browsing requests, no production
restart. The daily timer is enabled. Manual `--check`/`--stage` reports do not
replace this operational evidence.
