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

`PROFILE` is one of `expat`, `expat-debian`, `pyasn1`, `redirects`.
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
