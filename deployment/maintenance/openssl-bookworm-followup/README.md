# Native Bookworm OpenSSL DTLS follow-up

Scope: the system OpenSSL 3.0 libraries in Gathio, Uptime Kuma, Rallly,
RSS-Bridge and Wishlist. This is the native stable `CVE-2026-84782` repair,
not a claim that every advisory affecting OpenSSL is resolved. No distribution,
glibc, application version, privacy configuration or user-data change.

## Source and patch boundary

The source is signed-repository Debian `openssl 3.0.22-1~deb12u1`, built on
Bookworm with its existing patches and configuration. The added change is
Ubuntu's maintained OpenSSL 3.0 backport from `3.0.13-0ubuntu3.16`, including
the upstream client/server DTLS retransmission regression tests. The resulting
native package version is `3.0.22-1~deb12u1+utilibre1`.

- Upstream fix: <https://github.com/openssl/openssl/commit/e961062f6b86727b63b0381ceeec7fa074026fef>
- Vendor status: <https://ubuntu.com/security/CVE-2026-84782>
- Upstream advisories: <https://openssl-library.org/news/vulnerabilities/#CVE-2026-84782>
- Debian source origin: <https://security.debian.org/debian-security/pool/updates/main/o/openssl/>
- Ubuntu source origin: <https://security.ubuntu.com/ubuntu/pool/main/o/openssl/>

Inputs were obtained through authenticated APT source indexes on 2026-10-12;
`acquire.sh`, the source lists and checksum assertions in `build.sh` record
the exact releases. The original Ubuntu patch SHA-256 is
`50ad8c00cc9fa93b79704a116df6486461c3192d3412a77749bb4c4cd4692589`.
`refresh-context.mjs` changes two whitespace-only context lines, asserts that
all added/deleted bytes are identical to the maintained patch, and the patch
must apply with `--fuzz=0`. No rejected hunk is forced or silently skipped.

Only `libssl3` and `openssl` are overlaid in the first four applications.
Gathio already contains `libssl-dev`, so its exact-version dependency is
updated too. RSS-Bridge's curl-impersonate/BoringSSL library is a separate
runtime: its exact bytes, chrome131 profile and HTTP(S)-only protocol policy
remain unchanged. This change does not replace that library with OpenSSL.

## Build and evidence

The isolated compiler uses the pinned Bookworm image in `build.sh`, 2 CPUs,
7 GiB memory and a 5.5 GiB work tmpfs. Network access is disconnected after
dependency acquisition. The first 2.5 GiB workspace was insufficient;
that failed log is retained privately, the workspace was enlarged, and both
complete suites subsequently ran successfully. The compiler was removed
after source, packages and test executable export. Future builds snapshot
the recipe before execution; running scripts must never be edited in place.

Observed on 2026-10-12:

- Static upstream suite: 259 files / 2,980 tests, `Result: PASS`.
- Shared upstream suite: 259 files / 3,415 tests, `Result: PASS`.
- Platform/configuration skips remain upstream skips, not claimed passes.
- Both upstream DTLS retransmit regressions reproduce the expected native
  write-call-state failure with each old image and pass with each candidate.
- All 519 existing exported SSL symbols and 5,367 crypto symbols survive.
- The application trees, `/etc` configuration and unrelated shared libraries
  are byte-identical. Provider/cipher/digest inventories are unchanged.
- Native RSA/ECDSA signing, signature-tamper rejection, AES/PBKDF2 round-trip,
  random generation, default/legacy providers, TLS 1.2/1.3 and wrong-host
  rejection pass on both old and new images.
- Existing system libcurl consumers pass seven HTTP/TLS tests; Wishlist has
  no system libcurl, so none is installed just for testing.
- Kuma/Gathio's native Python requests/urllib3 stack passes eleven loopback
  HTTP/TLS/proxy/bounded-header checks. Gathio additionally exercises native
  PostgreSQL TLS, wrong-host rejection, PostGIS projection, DocumentDB typed
  data, role isolation, logical restore, and Barman/boto3 signed TLS S3 work.
- Kuma native setup/login; Rallly migrations and a fictional invitation;
  Wishlist account/list/item/reload and anonymous denial; and RSS-Bridge's
  native PHP AES-GCM, HTTP/2 chrome131 requests, prohibited-protocol rejection
  and fictional GitHub-to-Atom feed are separate application gates.

All these fixtures are synthetic and isolated. No email, notification, real
remote feed, visitor document or production credential is used. The browser
checks cover desktop Chromium, not a claim about every device or upstream
feature. Public reachability after release is distinct from those tests.

The private evidence root is
`/var/lib/utilibre-maintenance/openssl-bookworm-followup-20261012`.
`images/<key>/{build,native,application}.json` binds the gates to exact image
IDs; RSS-Bridge also has `impersonate.json`. Package SHA-256 values are:

| Package | SHA-256 |
| --- | --- |
| libssl3 | `f112c901b8629d43e5812739f2f189d1f8c0e22ec73f6a14a286415b2c42d1d5` |
| openssl | `ca9e03e6c2d98df60b0707d26b5b53c54084b1f744cdd6d6be3178efed9b0b99` |
| libssl-dev | `405a0f9a30ca5961a4db927858ac437c299a19b0ab9717b4706d137056639047` |

## Release, updates and rollback

`release.mjs prepare <key>` validates the native/application evidence and
the current exact base. `release.mjs apply <key>` changes only that service's
image scalar, recreates it and any same-image network-namespace companions,
then checks exact native bytes, package versions, unchanged settings,
health and the existing public route. Failure restores only that pin and
recreates the old image; it never restores/deletes user data. The standard
receipt is
`/var/lib/utilibre-maintenance/closure-followup-20261012/openssl-bookworm-release.json`.

To reverse a completed release, use that service's recorded `oldRef` and
`newRef`, preserve any later independent overlay, and run the same scoped
Compose recreation/health gates. Do not overwrite the whole Compose file or
roll back later Python, curl, SDK or PostGIS work. Gathio's separately managed
GDAL follow-up must layer on the final OpenSSL image, not its historical base.

The shared update guards/reviewer own advisory decisions. They must carry
this repair forward only after exact payload verification and native gates,
or replace it with an upstream/vendor fixed release. A package-version-only
finding does not prove this backport absent; conversely the `+utilibre1`
suffix alone is not proof that it is present. Unrelated OpenSSL advisories
still require their own scope/version review.

`publish-source.mjs --publish` creates an immutable corresponding-source
archive, including native source, Debian packaging, original Ubuntu patch
source, dependency lock, recipes and required notices. It excludes private
logs, runtime configuration, keys and user data. The shared source index is
updated by the release maintainer, not by this helper.
