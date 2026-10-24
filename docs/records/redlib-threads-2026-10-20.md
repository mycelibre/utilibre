# Redlib thread retrieval — 20 October 2026

## GraphQL repair release — 24 October 2026

The later GraphQL candidate supersedes the failed HTML-scraping candidate
below. The tested application is the AGPL-3.0-only
[polak14 fork](https://github.com/polak14/redlib/tree/e48efd85c4527b211f1219bdcbfda72ada6d4ec6),
revision `e48efd85c4527b211f1219bdcbfda72ada6d4ec6`, dated 23 October.
Its Cargo package remains 0.36.0; it is not the official 0.40 release.
The native [GraphQL change](https://github.com/polak14/redlib/commit/a63460b4ac29c27401e3e2aaab34b68dca02991e)
uses anonymous Reddit OAuth and the Android application's persisted comments
query. The selected source no longer uses the encoded-separator workaround.
Utilibre disables the fork's HTML-scraping fallback and does not send visitors
to another operator's instance or make browser requests to Reddit.

**Deployed and publicly verified:** `utilibre-redlib:graphql-e48efd8-20261024`,
image `sha256:42dd36c9d8b0c781bf86df719cf05cda277b9af71a7c0560465e13fa8df14fdf`.
Only Redlib was recreated. Anubis, public routing, all resource/isolation
settings and other running containers were preserved. The native information
banner gained a matching-source link; the native Code control links directly
to the complete modified source. At 11:16 UTC, a headed Chromium 151.0.7922.34
session through the unchanged public Anubis route loaded 200 comments and a
137-comment next page, retained sorting, and exposed the correct source link.
No browser requests to external origins were observed. The initial headless
test was denied by the existing Anubis policy; a normal browser with a temporary
authenticated virtual display passed without changing that policy, forging
forwarded client headers or importing challenge credentials. This is a desktop
browser check, not a real-phone or broad geographic availability claim.

### Source, replay and regressions

The immutable source archive SHA-256 is
`712d5d7684ace386df7f097c8cde9b1a6865f501945e8369c193bc07457a5193`.
[recipe.json](../../config/redlib/recipe.json) records the exact ordered patches,
permitted input/output hashes, runtime predecessor and tested binary checksum.
The [maintenance instructions](../../config/redlib/README.md) describe separate
preparation, assessment, approval, activation and rollback. No LLM is required
to replay these fixes.

- Clean preparation and repeated preparation passed. The second run compared
  the entire prepared tree without applying another patch. A different source
  revision and an unexpected local edit were both rejected.
- Five archive-provenance tests, four GraphQL tests, three parser/URL tests and
  the existing settings-redirect regression passed with networking disabled.
- Restoring the upstream image-rendering statement reproduced an external-media
  privacy regression; restoring the guard made that same test pass. This was a
  targeted reproduction, not a claim that every historical bug was reproduced.
- The local guards reject unsafe schemes, control characters, backslashes,
  scheme-relative URLs and media paths that browser dot-segment normalization
  would move outside native media routes. Normal clickable external article
  links remain usable. Flair/award media follows the same privacy restriction.
- GraphQL has a 20-second request timeout and an 8 MiB streamed-response cap.
  Denied, oversized, malformed and partial-error responses fail without an
  alternative transport retry. Native upstream post-metadata retrieval remains
  separate. Error-page logging no longer includes content or requested paths.
- Continuation/reply links retain the supported sort. The archive build reports
  the correct commit; the update feed refers to the selected fork.

### Functional evidence and limits

The original `1xapnji` thread returned 200 rendered comments. Its continuation
returned 137 different comment IDs with `sort=new` retained; a focused comment
loaded correctly. A second thread from `/r/rust/hot` returned a comment. These
checks passed on the isolated candidate and on the production-equivalent
network/environment/command. A native proxied PNG returned 606 bytes and the
correct image content type. This is a bounded sample, not a claim that every
thread, video or media/Range combination works.

Chromium 151.0.7922.34 rendered the thread with no script errors or requests to
external origins. A 390-pixel viewport was also inspected; that is desktop
emulation, not real-phone testing. Test media requests were capped at four.
No account or personal Reddit credentials were used. No third-party instance
was queried for comparison. Successful retrieval is not an uptime guarantee;
Reddit may change or restrict the native anonymous API.

### Security assessment

The same local Trivy database was used before and after (updated 24 October,
SHA-256 `9f227eaae45c4fa4d8b3e4baea563e4aca69de04c7fef933e469cfb66b8ccfa0`).
The lock scan covered 337 packages, including build dependencies. It found
`CVE-2026-115567` in Tokio 1.54.0; the package-manager-generated update to
[Tokio 1.54.1](https://github.com/tokio-rs/tokio/releases/tag/tokio-1.54.1)
resolved that match. No other package versions changed; Cargo also rewired six
existing dependency edges. The complete lock change is preserved as a patch.
The after-scan reported no locked-package findings.

The packaged source resolves offline to 346 Cargo package records, including
the application. Trivy extracted 337: nine test-only records were absent despite
requesting development-dependency coverage (`linux-raw-sys`, `lipsum`,
`quick-error`, `rustix`, `rusty-forkfork`, `sealed_test`, `sealed_test_derive`,
`tempfile`, `wait-timeout`). Cargo's resolved graph places all nine outside the
application's normal/build dependency closure. They remain an explicit scanner
coverage gap, not a finding-free assessment of the test environment. The native
offline Cargo metadata check also verified that the published source package's
vendored dependency paths resolve without a registry or remote download.

Every prior runtime layer is retained; the only added filesystem entry replaces
`/usr/local/bin/redlib`. The final image's 92 Ubuntu packages retained the exact
same reported OS findings: 79 medium and 13 low, no high or critical. Those
existing matches were not suppressed or declared fixed. Trivy did not extract
Rust dependencies from the executable; the separate exact-lock scan covers
that gap, without claiming complete security clearance or exploitation testing.

### Publication, deployment and rollback

[Matching modified source and dependencies](https://tools.utilibre.org/utilibre-source/redlib-e48efd8-utilibre-1-source-v2.tar.gz)
are published with original notices, the lockfile, vendored crate sources,
ordered patches and build instructions: 54,354,135 bytes, SHA-256
`72bb9fed6ea35abebfc2704d613403ad57b5db26c760e58d9df8c58f60b42286`.
The native Code link points to this archive. Previous source offers remain.
This establishes pinned source/artifact identities and tested replay, not
byte-for-byte reproducible compilation.

The first activation rolled back automatically because the release check
looked for the configured banner on a thread page; upstream only renders it
on the information page. Production-equivalent checks confirmed comment
retrieval worked. The corrected release points the native Code link to matching
source and verifies that actual link. The second activation passed the native
health and 200-comment gate, with every unrelated container ID unchanged.

Rollback restores the exact predecessor image
`sha256:45ec43720c0efe7d8e5cac53d8a133b08aec073e3f25bb46bd23148a2e44b6d2`
under `utilibre-redlib:mount-noble-security-20261012` in both Compose's default
and the protected local environment override; remove the new banner link and
recreate only `redlib` using the existing release process. The old image is
retained. No database, persistent user content or migration is involved.

Private evidence is under
`/opt/utilibre/reports/redlib-graphql-20261024-gx1le80r`: native test/build logs,
`final-workflows.json`, `production-equivalent-workflows.json`, `browser.json`,
`media.json`, exact before/after scanner reports, `source-link-final-check.json`,
the first verified rollback receipt, and `deployment.json`. Public records
contain no tokens, response bodies, user activity logs or private environment.

## Candidate check — 24 October 2026

**Blocked at the functional release gate; not deployed.** This supersedes the
earlier absence of a candidate build, but does not resolve the production
thread failure. Production still uses the maintained image identified below.

Reviewed the AGPL-3.0-only
[xevxx change](https://github.com/xevxx/redlib/commit/47b55546979325f98573e4065f2f5f258c9a99f6),
which obtains post metadata through `/by_id` and parses comment fragments from
the logged-out Shreddit endpoint. The immutable archive is
`https://codeload.github.com/xevxx/redlib/tar.gz/47b55546979325f98573e4065f2f5f258c9a99f6`,
SHA-256 `6a3e120c4054682bea664748ff075f094087d5b504aaea2ce8f949b555ae12df`.
The inherited encoded-separator comments workaround was not exercised by the
selected native thread path. Its presence elsewhere in the source is not
approved for production by this evaluation.

### Prepared changes and offline results

- Applied the existing `0001` settings-redirect and `0002` archive-revision
  patches without conflict, preserving `Cargo.lock` exactly.
- Added the candidate-only
  [comment-media patch](../../config/redlib/candidates/47b5554-comment-media.patch).
  The upstream URL guard accepted a root-relative-looking path beginning with
  slash/backslash; browsers interpret this as an external origin. The new
  regression failed on the original guard for that reason, then passed after
  rejecting backslashes and control characters. Ordinary local media and
  proxied Reddit images still pass the positive cases.
- Five archive-build tests passed with Rust 1.99.0. The exact candidate commit
  was stamped correctly, with identical repeated output.
- Native tests compiled with the existing pinned Rust builder
  `rust:slim-bookworm@sha256:1469a27c125cb5a3aebfa4f4e4665d935b02fb72cc093b2c974b3d740e43f157`
  (Rust 1.98.0): eight `thread::tests` and one
  `settings::redirect_tests::permits_only_local_absolute_paths` passed.
  Builds/tests had network disabled, two CPUs, 4 GiB RAM with no additional
  swap, a 256-PID ceiling, no production mounts or Docker socket, and no
  production credentials. Dependencies were fetched separately with `--locked`.
- Trivy inventoried 337 Cargo packages with no advisory matches. The local
  database was updated **22 October 19:14 UTC**, SHA-256
  `7deff905cefceb3953cf6638e5399e3efb2061a8c71b7360d4d6fb3076a574de`.
  Network access and advisory refresh were disabled for this assessment.
  This covers the lockfile, not runtime libraries or application logic; it
  must not be reported as a current whole-service security pass.

To repeat local checks, verify the exact archive checksum, extract it in a
disposable workspace, then apply `0001`, `0002` and the candidate media patch
in that order with `git apply --check` before each application. Supply
`REDLIB_BUILD_REVISION=47b55546979325f98573e4065f2f5f258c9a99f6`. After controlled
dependency fetching, run the following in a network-disabled build container:

```sh
cargo test --offline --locked --lib thread::tests
cargo test --offline --locked --lib redirect_tests::permits_only_local_absolute_paths
```

Do not run the entire upstream test suite by default: it includes live Reddit
checks. The candidate patch is a reviewed local test result, not approval to
replace the production image or to ignore a future patch conflict.

### Bounded native functionality result

A conventional request to the new comments endpoint returned HTTP 403. This
alone was not treated as proof about the candidate's different network client.
The candidate's own `redlib-probe` was therefore compiled and run once, with
only the originally reported thread as its argument. The probe used a separate
container on the exact maintained Ubuntu runtime, a read-only filesystem,
0.5 CPU, 256 MiB RAM/no extra swap, 128 PIDs, a 32 MiB temporary filesystem,
dropped capabilities, no published port, no container logging and a 45-second
process limit.

The listing control returned **25 entries**. Thread retrieval returned
`Reddit blocked anonymous thread access from this connection`, with **no
validated comments**. No continuation or alternate-instance retry was made.
The probe's process exits zero even when a thread fails; its structured
`status: failure` is the result used for the release decision.

Private minimized receipts are in
`/opt/utilibre/reports/redlib-candidate-20261024-VScsI2/`, including
`carry-forward.json`, `dependency-summary.json`, `native-tests.log`,
`redirect-tests.log`, `media-before.log`, `media-after.log`,
`native-probe.jsonl` and `result.json`. Response bodies/headers and disposable
compiler outputs are not needed for ongoing retention.

No production container, image reference, Compose configuration, source
publication, public listing, cache or notification changed. No production
rollback is needed. A working candidate still needs successful thread,
continuation, media and public-browser checks, review of its remaining request
and operational-log paths, a runtime assessment, and matching AGPL source
publication before activation. The existing direct-service failure is not
evidence that Caddy or Anubis should be weakened.

## Follow-up — 22 October 2026

Rechecked the running image and current primary upstream sources. The running
image and container were unchanged. Four bounded native GETs checked instance
metadata, settings, one subreddit listing, and the originally reported thread.
Metadata/settings returned 200; the listing returned 200 with post entries;
the thread returned 404 with the same JSON-parse error and no rendered
comments. No response bodies, visitor records or tokens are retained in this
record. These native checks do not establish public challenge/media behavior.

The official release is now
[v0.40.0](https://github.com/redlib-org/redlib/releases/tag/v0.40.0),
`ba116c1186f6b0f9d45f0ae50c827e13eb2f5ea2`, published 22 October 03:24 UTC;
GitHub's compare result reports 23 commits beyond the deployed source.
[Issue 591](https://github.com/redlib-org/redlib/issues/591) was closed by the
maintainer on 21 October. The new thread workaround in
[commit 0a3e9cd](https://github.com/redlib-org/redlib/commit/0a3e9cde456b9ce92008d0e3846301c5efcd6565)
specifically evades Reddit's anonymous-request restriction. It was reviewed
but not exercised, built or deployed. No alternative IP, public proxy,
account token or new scraping fallback was used. The prior security repairs,
Anubis ingress and existing submitted URL remain intact.

**Outcome: still unresolved on Utilibre.** The original observation that
deployed source equalled upstream main is historical, not a current claim.
No new artifact was accepted and no production rollback is necessary.
The archive-provenance repair remains prepared, not deployed. A permitted
retrieval path remains the dependency for restoring comments.

## Outcome

**Unresolved upstream retrieval failure; no production deployment.** Reddit
returned HTTP 403/non-JSON responses for threads while subreddit listings
continued to work. Restarting production, loosening Anubis, changing Cloudflare,
or removing existing security repairs is not supported by this evidence.

Separately, the source-archive build stamped `dev` into the binary. This made
upstream's error-page script claim the instance was at least 20 commits old.
The exact running source revision was already upstream `main`, not an older
revision. A minimal build-provenance correction is prepared and offline-tested.
The deployed warning remains until a full candidate is built and released.

## Evidence and coverage

- Deployed application source and GitHub `main`:
  `a4d36e954cf1bd64f209cd8868c5a29edc81b374`.
- GitHub compare response: zero commits ahead, zero changed files.
- Current runtime image:
  `sha256:45ec43720c0efe7d8e5cac53d8a133b08aec073e3f25bb46bd23148a2e44b6d2`.
- Native `/info.json`: HTTP 200, version 0.36.0, embedded commit `dev`.
- User-reported thread: native HTTP 404 error document, reporting invalid
  upstream JSON. Removing the trailing slash and using the short comments path
  did not restore it. The thread was not stored in the evidence archive.
- A separate current Rust thread also failed; `/r/rust/hot` returned HTTP 200
  with 25 post links. A health-check/settings response alone was not used as
  evidence of working content.
- Only minimized error categories/statuses were extracted from recent native
  logs: upstream HTTP 403 Forbidden. No visitor queries, identities, OAuth
  tokens, or response contents are published here.
- A fresh isolated instance of the exact maintained image reproduced the
  reported thread failure. It used no host port, credentials, persistent
  storage or production mounts, with 0.5 CPU, 256 MiB RAM/no swap, 128 PIDs,
  read-only root, a 32 MiB tmpfs, dropped capabilities, no-new-privileges and
  disabled Docker logging. It was removed after the check.

These are bounded checks from the application VM, not uptime statistics or a
claim that every thread is inaccessible. No public-operator instance was
probed, and no issue, directory submission, notification or indexing request
was sent.

## Primary upstream evidence

Checked 20 October 2026:

- [Current-main thread failure report](https://github.com/redlib-org/redlib/issues/591):
  reports listings working, comments receiving 403 and restarting not helping.
- [Broader upstream discussion](https://github.com/redlib-org/redlib/issues/446#issuecomment-6300384747):
  contemporaneous reports corroborate the distinction. These reports are
  supporting evidence, not proof about every other instance.
- [Original archive build script](https://github.com/redlib-org/redlib/blob/a4d36e954cf1bd64f209cd8868c5a29edc81b374/build.rs)
  and [error-page version check](https://github.com/redlib-org/redlib/blob/a4d36e954cf1bd64f209cd8868c5a29edc81b374/static/check_update.js)
  explain the misleading warning.

## Prepared repair and verification

Files: `config/redlib/Dockerfile`,
`config/redlib/patches/0002-archive-build-revision.patch`,
`config/redlib/check-build-revision.mjs` and the service README.

The patch accepts only an explicit full lowercase 40-character commit ID,
preserves normal Git-checkout behavior and the honest development fallback,
and prevents accidentally identifying an enclosing unrelated checkout as the
application source. The Dockerfile supplies the same revision as its
checksum-verified source archive. The existing redirect-hardening patch is
applied first; dependency versions are unchanged.

Private regression receipt:
`/opt/utilibre/reports/redlib-thread-20261020-ZjWvJ0/revision-check-v2/result.json`.
Rust 1.99.0; network disabled for all compiler/test processes. Original archive
build reproduced `dev`; corrected build script produced the exact revision.
Five Rust tests passed. Repeated execution produced identical output; invalid
revision input failed closed. The existing redirect patch still applied and
`Cargo.lock` retained SHA-256
`758ae1e00f94a6a8d2039d1a7569a68ea049edb343657b313150b26ba73dfcdb`.
The first test attempt exposed an incorrect patch-hunk length, which was fixed
before the clean second run; it is not counted as an upstream failing test.

**Not performed:** full application compilation, new runtime security scan,
public-browser/media verification of a replacement, or production activation.
The VM had approximately 7.2 GiB available and remains under disk pressure;
no unrelated files, caches or backups were pruned to make room for a build that
would not resolve the upstream thread refusal.

## Release boundary and next gate

Keep the working listing service, current public URL and Anubis protections.
No source pin is changed just to suppress a warning. Before activating a later
fix, require a bounded successful check of the reported thread and a separate
thread, retained local redirects, media/Range handling and ordinary challenge
completion. Build over the exact maintained runtime, preserving its Ubuntu
OpenSSL/mount repairs; the historical base Dockerfile release stage is not an
acceptable replacement. Publish corresponding source through the existing
release process only for an approved deployed artifact.

No deployed files, pins or containers changed, so no production rollback is
needed. The pending source changes can be reviewed independently of the
unrelated existing worktree changes. Thread restoration requires a verified
compatible upstream correction or Reddit restoring access; no such correction
was established in this check. No proxy rotation, personal Reddit account,
external instance fallback or browser-side Reddit fetching was introduced.
