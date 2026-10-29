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
hashes and maintained runtime. It does not grant unattended deployment.

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
