# Redlib deployment

Redlib is built from the official source at commit
`a4d36e954cf1bd64f209cd8868c5a29edc81b374` using upstream's
`Dockerfile.ubuntu` as the basis for a small local build recipe. The Quay release
image was not used because its published 0.36.0 code predates fixes in this
reviewed commit. The source archive checksum, Rust builder image, and Ubuntu
runtime image are pinned in `config/redlib/Dockerfile`.

The local `p1` patch rejects scheme-relative and backslash-prefixed values in
the settings redirect parameter. Without the patch, a URL such as
`/settings/update?redirect=//example.invalid` could produce an external
`Location` header. The build runs the patch's Rust regression test before
producing the release binary. The resulting image tag is
`public-utility-redlib:0.36.0-a4d36e9-p1` by default. This is a modified AGPL
build, so the deployed project's published source must include this Dockerfile
and patch.

Build the image explicitly on first install or when changing its pinned source
or patch:

```sh
docker compose build redlib
docker compose up -d redlib
```

`pull_policy: never` prevents a routine `docker compose up -d` from looking for
the local-only image tag in a public registry or unexpectedly recompiling Rust.

The service is in the `privacy-frontends` Compose profile and is represented by
the `redlib` ID in `ENABLED_SERVICES`. Those two switches must agree. The
checked-in example enables both because Redlib was explicitly approved for this
deployment. To disable a running instance, first run
`docker compose stop redlib`; then remove `privacy-frontends` from
`COMPOSE_PROFILES`, remove `redlib` from `ENABLED_SERVICES`, and clear
`PUBLIC_REDDIT_URL`. A profile change alone does not stop an already-created
container.

Redlib uses no database or persistent volume. Its root filesystem is read-only
and `/tmp` is a small tmpfs. It runs as the non-root `redlib` user with all
capabilities dropped and `no-new-privileges`. Robot indexing is disabled. RSS
is disabled by deliberately omitting `REDLIB_ENABLE_RSS`; in this upstream
revision, setting it to the string `off` would incorrectly enable the route.
HLS, autoplay, and showing NSFW content are off by default; operators
may additionally set `REDLIB_SFW_ONLY=on` to prohibit NSFW content instance-wide.

The application is published only as
`${PRIVATE_BIND_IP}:${REDLIB_PORT:-3002}`. Its container health check requests
`/settings`; it has no database, administration, debug, or metrics port.

`RUST_LOG=warn` suppresses informational messages that can contain the emulated
device identity or an OAuth token prefix, while retaining warnings and errors.
Reviewed warning/error paths do not intentionally include visitor URLs or
queries. Redlib also prints a startup line. Docker stores these operational
messages with the project's bounded `json-file` rotation. Visitor
preferences may be stored in optional first-party cookies. The container has no
persistent server-side request history.

Important policy limitation: this approved deployment retains upstream
Redlib's emulation of an official Reddit Android client and its OAuth identity.
That may stop working if Reddit blocks it. No personal Reddit account or
operator-supplied Reddit token is configured.
