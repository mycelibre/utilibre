# 28 October shared-library and runtime maintenance

This batch extends the existing native-package, exact-JavaScript-package and
transactional release scripts. It does not replace the maintenance system.
No LLM is part of replay, tests or release checks.

## Completed library release

`released-libraries.json` records **100 updated containers** (not 100 distinct
applications): 68 NGINX gateways/static-tool containers, 18 Debian/Ubuntu
application roles, and 14 Alpine roles. Existing service access, user data,
privacy settings and application files are preserved. No database migration or
host reboot is part of these changes.

- Alpine vendor curl/libcurl: 8.23.0-r0 on the existing 3.23/3.24 branch;
  DeGoog retains its 3.22 branch and receives 8.14.1-r4.
- Alpine Brotli: 1.2.1-r0; PairDrop's 3.21 branch receives 1.1.1-r0.
- Debian Brotli: 1.1.0-2+deb13u1 or 1.0.9-2+deb12u1.
- Ubuntu Jammy Brotli: 1.0.9-2ubuntu0.1.

Exact original/candidate images, signed package archives and checksums are in
`nginx-inputs.json`, `brotli-inputs.json` and `alpine-inputs.json`. APK signatures
are verified by the original image's keyring; APT acquisition uses authenticated
native indices. Builds install only the named local packages with no network.
Package inventories, image configuration and application/configuration hashes
are compared before/after. No unrelated package update is accepted.

Private receipts live under `/var/lib/utilibre-maintenance/security-20261028/`.
They include bounded error evidence, native tests, raw same-database Trivy
results, preflight snapshots, exact image activation and rollback checks.
`released-libraries.json` is the sanitized public subset. Raw rendered Compose
configuration and fixture keys are not publication inputs.

Verification includes native encode/decode, malformed-input/output-bound checks;
HTTP, redirects, gzip/Brotli, POST, trusted TLS, rejected TLS hostnames and 404;
all 68 NGINX configuration checks; static application hash preservation; and
per-service readiness. RSS-Bridge also passes its actual preloaded PHP client,
HTTP/2 and fictional GitHub-to-Atom fixture. These are compatibility checks,
not a claimed reproduction of the upstream curl/Brotli memory corruption.

PrivateBin's full synthetic test additionally verified encrypted upload and
retrieval of 25,000,000 random bytes, SHA-256 equality, the one-week maximum,
oversized rejection, volume/low-space safeguards and scheduled expiration.
Linux Chromium desktop and mobile emulation were used, not a physical phone.
The repository's `deployment/utilibre/compose.yaml` mirrors the deployed pins.

### Observed limits and recovery

- SimpleLogin's public address returned 502 before this batch and still does.
  Its local login gateway returns 200. This pre-existing edge issue is not
  claimed repaired by the library overlay.
- RSS-Bridge preloads a separate curl-impersonate build. Testing system Brotli
  requires clearing that preload **only in the isolated system-library test**.
  Real PHP consumer tests keep it. Its embedded dependencies remain a separate
  assessment; an OS package update does not repair those copies.
- OpenGist's curl update removes upstream TLS-SRP, an already reviewed upstream
  removal in `closure-followup/curl-policy.mjs`. Its installed healthcheck uses
  ordinary loopback HTTP. Other feature/protocol loss is rejected.
- Addy's first rollout checked HTTP too early during S6/Laravel startup. The old
  image was restored and independently verified; the retry passed with bounded
  HTTP readiness. The original failure and recovery receipt remain retained.
- Pollaris's worker intentionally recycles; preparation waited for its existing
  five-minute stability precondition instead of bypassing it.

## Replay and release

Run acquisition/build/tests in bounded disposable containers, not by installing
packages into running applications. Never overwrite completed private receipts.
Archived assessments require their recorded Trivy database; current release
approval requires data less than 48 hours old. Missing/malformed scans or new
high/critical findings fail the gate. The scanner does not approve deployment.

The finite commands are:

- Existing `check-nginx-tiff-security.mjs` and
  `release-nginx-tiff-security.mjs`, using the `--curl-brotli` profile.
- `acquire-brotli.sh`, run only inside the suite-specific disposable downloader;
  `brotli.mjs KEY...`, then `scan-brotli.mjs KEY...`.
- `alpine.mjs KEY...`, `check-alpine.py KEY...`, and
  `scan-brotli.mjs --alpine KEY...`.
- `release-brotli.mjs prepare [--alpine] KEY...`, followed by a separately
  authorized `apply`. It reuses `language-final/release.mjs` for exact Compose
  scope, namespace handling, native supervisors and transactional rollback.
  `retry` requires verified restoration of old images/configuration/routes.

These are finite release manifests, not arbitrary scanner-selected commands.
Once deployed, preparation correctly rejects the old baseline; repeating an
`apply` on a completed group verifies the exact running artifact without a
restart. Preserve previous artifacts until the next release is accepted.
Rollback changes only the recorded image scalars and recreates their declared
service group through its native supervisor. It does not restore or delete
user data and is not a database rollback mechanism.

## Remaining work in this batch

JavaScript candidates and native Go/curl updates are separate from the completed
library release above. Candidate files or passing package scans alone do not
mean they are deployed. Node's embedded Brotli/Undici and RSS-Bridge's embedded
curl must be assessed separately from OS packages. Other existing scanner
findings remain open until their specific evidence is revalidated; there is no
blanket exception for descendants of these images.

## Sources checked 28 October 2026

- [curl HTTP/2 advisory](https://curl.se/docs/CVE-2026-92392.html).
- [Brotli 1.2.1](https://github.com/google/brotli/releases/tag/v1.2.1),
  [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-111497),
  [Ubuntu tracker](https://ubuntu.com/security/CVE-2026-111497).
- [Undici TLS option fix](https://github.com/nodejs/undici/security/advisories/GHSA-2m5v-pch6-74hx),
  [response-stream crash fix](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c).
- [body-parser advisory](https://github.com/expressjs/body-parser/security/advisories/GHSA-27r3-jxmh-p828).
- [Node October security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).
