# 3 November 2026 maintenance

Finite updates built on the existing package builders, native tests, Trivy
comparison and transactional Compose release. There is no LLM, new scheduler,
automatic conflict resolution or approval-by-scanner in this path.

Private evidence lives in `/var/lib/utilibre-maintenance/security-20261103/`.
The checked-in inputs contain no production credentials. Preserve previous
images and receipts; do not prune them while this release is in progress.

## Inputs and verification

| Repair | Inputs | Verification |
| --- | --- | --- |
| Expat on Alpine | `expat-inputs.json`, signed APKs at 2.10.0-r0 | Exact predecessor, package signatures, narrow native parser checks, ABI/NEEDED preservation, unchanged app/configuration, actual read-only NGINX configuration where applicable, same-database before/after scan |
| Expat on Debian | `expat-debian-inputs.json`, signed Debian 2.10.0 package or Bookworm rebuild | Both narrow and wide libraries, exact payload hashes, ABI, native consumers and same-database scan; Penpot's private loader copy and DHI package fragment are explicitly included |
| pyasn1 | `pyasn1-inputs.json`, upstream 0.6.5 wheel and source/tests, BSD-2-Clause | Seven legitimate ASN.1 cases, the nested-string regression fails on 0.6.4 and passes on 0.6.5, 1,261 upstream tests per candidate, unchanged unrelated Python files and existing CA repair |
| follow-redirects | `redirects-inputs.json`, upstream 1.16.2 npm integrity, MIT | Both object/array headers and same/cross-realm options; fictional custom credential leaks only in the affected baseline; same-origin headers and redirect limits preserved; every installed copy included |
| SQLite negative rowids | `sqlite-source.json`, `sqlite-inputs.json`; authenticated Debian source with exact upstream patch | Both sanitizer baselines reproduce overflow; patched native queries, prior corruption regressions, ABI/options, app/configuration hashes and synthetic backup/restore pass |
| Seroval / Joi / RSSHub parsers | `js-nov-inputs.json`; exact npm package integrities | Small before/after rejection and operation-count tests, legitimate serialization/validation/query behavior, native application workflows, same frozen advisory database |
| Grist Deno ZIP attribution | `deno-zip-inputs.json` and pinned upstream source | Exact runtime binding, native Pyodide echo, DNS/TCP/HTTP/process/FFI permissions denied. This is a seven-day scoped mitigation, **not** a patched ZIP crate or complete compiled dependency inventory |

Expat Bookworm uses the authenticated Debian source recorded in
`expat-bookworm-source.json`. The narrow upstream suite passes 5,328 tests.
The full upstream wide-character test target is incompatible with Debian's
unsigned-short configuration; that failed attempt is retained. Three separate
native wide-API tests pass. Do not describe those as the full wide test suite.
The small historical Expat subparser fixture does not crash every vendor
baseline; receipts retain the observed outcome rather than inventing a failure.

## Commands and boundaries

Run from the repository root. Select only exact keys in the input manifests.
Preparation is isolated; commands named `apply` below change the selected
running services and need deployment authorization.

```sh
node --test deployment/maintenance/security-20261103/*.test.mjs
node deployment/maintenance/security-20261028/alpine.mjs --batch-20261103 --expat KEY
node deployment/maintenance/security-20261103/check-expat.mjs KEY
node deployment/maintenance/security-20261028/brotli.mjs --batch-20261103 --expat-debian KEY
node deployment/maintenance/security-20261103/check-expat.mjs --debian KEY
node deployment/maintenance/security-20261103/check-penpot.mjs
node deployment/maintenance/security-20261028/dnspython.mjs --batch-20261103 --pyasn1 KEY
node deployment/maintenance/security-20261103/redirects.mjs KEY
node deployment/maintenance/security-20261103/check-redirects.mjs KEY
node deployment/maintenance/security-20261028/scan-brotli.mjs --batch-20261103 --PROFILE KEY
node deployment/maintenance/security-20261028/release-brotli.mjs --batch-20261103 --PROFILE prepare KEY
node deployment/maintenance/security-20261028/release-brotli.mjs --batch-20261103 --PROFILE apply KEY
```

`PROFILE` is one of `expat`, `expat-debian`, `pyasn1`, `redirects`, `sqlite`, `js-nov`.
The Alpine input rows list their individual `releaseGroups` keys; these differ
from shared image build keys. Toolbox Compose rendering needs the existing
`APP_BIND_IP`, obtained from the deployed configuration, not a guessed address.
Completed evidence is protected against accidental overwrite. A replay needs a
deliberately prepared disposable evidence directory and its exact original
image; these commands are not general upstream upgrade resolvers.

Downloads are pinned and separated from tests. Tests use networkless containers
and synthetic data; configuration validation may join the existing container
network namespace to resolve its configured backends without making requests.
Release checks use existing service health/route gates and required namespace
supervisors. No account migrations, retention changes or notification tests are
included. Builds/checks enforce finite CPU, RAM, time and disk bounds, with at
least 8 GiB retained for recovery.

## Reviews, monitoring and rollback

Run the existing fleet scanner after deployment, then prepare the exact reviews
with `review-expat.mjs`, `review-deno-zip.mjs` and the existing native/vendor
reviewers. Re-run the native Deno permission test before its review. Apply
reviewed decisions **serially** through the existing ledger interface. Never
extend an old decision to a replacement image without checking its live bytes.
Completed overlay receipts are listed chronologically in
`../followup-overlays.mjs` so earlier repair proofs remain traceable.

Debian's stable feed can still match the authenticated Expat 2.10.0 package.
`review-expat.mjs` compares the actual running narrow/wide library hashes,
package version, release, scanner and native-test receipts; only the two named
advisories on those exact images can receive expiring reviews. Other matches
remain visible. A completed historical replay is not current security clearance.

The release transaction automatically restores exact previous Compose pins and
uses the established service supervisor if a deployment gate fails. Each private
`release.json` records original/new images, service scope and configuration
hashes. For a later operator rollback, revalidate those prerequisites and restore
the recorded original pin using that project's existing release procedure; keep
its namespace companions together. This is a library-only update, not a database
migration. An image rollback is not a data restore.

GitHub Actions scheduling remains best effort. A manually successful availability
run is not evidence that periodic delivery recovered. Retain the independent
schedule watchdog and report missed delivery separately from service outages.

Sources checked 2026-11-03: [Expat 2.10.0](https://github.com/libexpat/libexpat/releases/tag/R_2_10_0),
[pyasn1 0.6.5](https://github.com/pyasn1/pyasn1/releases/tag/v0.6.5),
[redirect advisory](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p),
[GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The [complete code-only library supplement](https://tools.utilibre.org/utilibre-source/security-libraries-20261103-source.tar.gz) includes upstream sources/licenses and these recipes (8,769,012 bytes; SHA256 `3b4a820a8b2cde5e1b86d34a921361aed739f66383d50cbe0b2b26645ef4a99a`). Existing complete application source offers remain in place.


## SQLite and JavaScript follow-up

```sh
node deployment/maintenance/security-20261103/sqlite-source.mjs build SUITE
node deployment/maintenance/security-20261103/sqlite-source.mjs finalize SUITE
node deployment/maintenance/security-20261103/sqlite.mjs KEY
node deployment/maintenance/security-20261103/js-nov.mjs KEY
node deployment/maintenance/security-20261103/check-js-nov.mjs KEY
node deployment/maintenance/security-20261103/check-js-nov-apps.mjs KEY
```

`SUITE` is `bookworm` or `trixie`. These source inputs preserve previous
DISTINCT/FTS repairs. Trixie additionally needs the exact unsigned-delta patch
already present in authenticated Bookworm packaging. Tests never touch user
databases. The Bookworm allocator failure is recorded as observed; neither an
unrelated startup failure nor scanner version matching is accepted as proof.
The two source builds pass ASan/UBSan, 87 DISTINCT tests each, 18/30 prefix tests,
and six integrity tests each. Future clean replay runs all suites together;
Bookworm's integrity suite was checked separately before finalizing this run.
Byte-identical build output is not claimed.

The Seroval tests do not evaluate injected code. Joi uses a small invalid-input
case and checks the upstream whitespace guard; it is not a load benchmark.
RE2JS follows upstream's deterministic NFA-step test on 128/256 characters;
the URI decoder counts work on 451 synthetic bytes. RSSHub networkless startup
and library checks do not establish that all external feed providers work.
Resume's two-account JSON export/import check is not a PDF rendering test.

Release commands share an exclusive lock, including across profiles, because
several profiles edit the same Compose projects. Do not remove an occupied lock.
After a killed process, inspect its recorded PID and verify it is no longer
running before manually removing a stale lock. `verify-completed KEY` can
reconcile an `applying` receipt only after exact candidate, non-image config,
health, namespace and public-route gates pass; it never restarts a service.
Failed gates leave the incomplete state visible. A five-minute predecessor
stability check remains required when related namespace groups changed earlier.

The new source review is `review-sqlite.mjs`: exact running library hashes,
source/package identities, completed releases and the current complete scan
are required. It covers only the four explicitly named SQLite advisories.
Retained backport matches require an expiring review, not a scanner exclusion.


### Grist CommonJS and CryptPad mounted-source follow-up

`grist-decode` uses the existing JavaScript profile. Grist's query-string 7.1.3
requires a CommonJS function, while decode-uri-component 0.5.1 exports ESM.
`decode-cjs.mjs` adds a small explicit adapter for the exact Node 22.23.4 runtime;
it preserves legacy plus-to-space handling and calls the unchanged upstream
ESM decoder. The imported implementation is not rewritten. Native consumer
checks and the complete disposable document/formula/isolation/export/restore
fixture are required. Recheck Deno runtime permissions after changing its image.
The two incompatible preparation attempts are retained privately; neither was
deployed. One dropped legacy plus semantics; the other produced an unreadable
adapter under a restrictive umask. Both gates rejected the candidates.

CryptPad's redirect fix changes only `node_modules/follow-redirects/index.js`:

```sh
node deployment/maintenance/security-20261103/cryptpad-redirects.mjs
node deployment/maintenance/application-leaves-final/braces-application.mjs --redirects-nov03
node deployment/maintenance/application-leaves-final/publish-braces.mjs --redirects-nov03
node deployment/maintenance/application-leaves-final/braces-release.mjs prepare --redirects-nov03
node deployment/maintenance/application-leaves-final/braces-release.mjs apply --redirects-nov03
```

The first two commands prepare/test; publication and application are separate
explicitly authorized operations. Acquire the exact MIT upstream archive named
in `cryptpad-redirects-inputs.json`; verify its SHA256 before preparation. The
existing lock remains unchanged so earlier body-parser/braces repairs remain
valid. The one-file patch is byte-identical to upstream 1.16.2's implementation.
Reinstalling dependencies must replay this patch and its checks. Existing
release logic retains the original bytes and rolls back only this source file.
It never restores or overwrites documents. Its shared lock now also prevents
concurrent image and mounted-source releases.

`review-cryptpad-redirects.mjs` covers only the exact mounted lock/file/runtime and
named advisory for seven days. It requires the reproduced old leak, preserved
normal redirects, the completed two-account native application test, source
offer and successful release. Version-based raw findings remain visible.

Supplemental sources:
[decoder packages and adapter](https://tools.utilibre.org/utilibre-source/security-js-grist-20261103-source.tar.gz)
(735,298 bytes; SHA256 `85e4cebd6f5ce4459bcf2c5d73161afd3a98ade6a854d7f2225f47a6da344e05`),
and [CryptPad redirect backport](https://tools.utilibre.org/utilibre-source/security-cryptpad-redirects-20261103-source.tar.gz)
(34,837 bytes; SHA256 `2f30e8a2a95b53f0a5609ed8e4bdf826cdcf18ee42297c7cf57baacd02039650`).
These are supplements to the existing complete application offers.
