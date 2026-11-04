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

`PROFILE` is one of `expat`, `expat-debian`, `pyasn1`, `redirects`, `sqlite`, `js-nov`, `libxi`, `oauth-debian`.
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

## Later 4 November: Markmap and host Expat activation

Markmap 0.18.12 is deployed as
`utilibre-markmap:0.18.12-parser-security-20261104`, image
`sha256:ad81ded167b15eafbaafcc69e54f6d80a078232a4b47d4bdc048db2c7892199e`.
Only `markdown-it` 14.3.2 → 14.3.3 and `undici` 6.29.0 → 6.29.1 changed in the
lockfile; DOMPurify 3.4.17 and all runtime security fixes remain. The active
portal integration's manifest/lock now carry those versions. The old input
is preserved by `markmap-inputs.json`'s Git revision and complete file inventory.
Preparation reconstructs that exact Git tree in a disposable directory, not by
reversing changes in the live checkout.

The existing October builder, browser test, parity verifier and release helper
accept a separate November profile. Downloads are an explicit `--resolve` stage;
the build runs networkless using that integrity-checked cache. Replay uses the
recorded lock, never a new dependency resolution. Completed receipts are retained.

```sh
node deployment/maintenance/security-20261022/build-dom-client.mjs markmap --nov4 --resolve
node deployment/maintenance/security-20261022/build-dom-client.mjs markmap --nov4
# Later replay in a fresh private workspace, using the recorded cache and lock:
node deployment/maintenance/security-20261022/build-dom-client.mjs markmap --nov4 --replay
node deployment/maintenance/security-20261022/build-dom-client.mjs markmap --nov4 --stage
node deployment/maintenance/security-20261022/check-markmap.mjs --nov4
node deployment/maintenance/security-20261103/check-markmap-dependencies.mjs
python3 deployment/maintenance/next-leaves-final/verify.py --markmap-nov4
node deployment/toolbox/publish-markmap-source.mjs --nov4
node deployment/maintenance/patch-leaves-final/release.mjs --markmap-nov4 prepare markmap
# Separately authorized activation, not an audit command:
node deployment/maintenance/patch-leaves-final/release.mjs --markmap-nov4 apply markmap
```

The explicit `--resolve` stage retains `dependency-inputs.json` and the four exact
baseline/candidate npm archives in private `markmap/dependencies/`. Their SRI,
SHA256 and URL must match the manifest and original/candidate lockfile. The checker rejects
different archives, creates short-lived synthetic TLS keys, reuses the native
Undici regression, and scans both locks against the same local advisory DB.
The old HTTP client ignores the custom TLS verifier; the replacement calls and
honors it. Seven ordinary HTTP/TLS cases pass in both. Five small Markdown cases
pass; no large-input timing or quadratic-complexity reproduction is claimed.
Upstream identifies the parser repair in
[14.3.3](https://github.com/markdown-it/markdown-it/releases/tag/14.3.3) and the
HTTP fixes in [6.29.1](https://github.com/nodejs/undici/releases/tag/v6.29.1).

EN/ES editing, Markdown/SVG export and reopening, hostile imports, storage
failures, a 390px viewport and already-loaded offline editing passed. Observed
external browser requests: zero. No real-phone or offline-reload claim is made.
A fresh `--replay` reconstructed the pinned Git source and built with networking
disabled. All eleven resulting static files were byte-identical to the deployed
candidate. The tar archives differ because of timestamps; this does not establish
byte-for-byte image or compiler reproducibility. Private `markmap/replay.json`
retains the comparison. Replay neither resolves new versions nor changes production.

Whole-image comparison permits four changed static-output files and preserves
1,901 other runtime files. Current source and candidate image scans have zero
high/critical findings; this does not clear the build compiler or other apps.

[Complete Markmap source offer](https://mindmap.utilibre.org/utilibre-source/markmap-parser-20261104-source.tar.gz):
972,825 bytes, SHA256 `59210251b2d08fb2e31d748820da7e7f61ad6241a2610590a79afab57d616c85`.
The existing source link serves the new source; its former archive is retained.
Rollback uses `markmap-release.json`'s previous image pin and the unchanged
Compose service configuration. Browser-local drafts are not touched.

**Host Expat remains incomplete:** `expat-host.mjs prepare` verified the exact
old package, rollback bytes, both library ABIs, narrow/wide native fixtures,
Python's actual binding and a private D-Bus session using synthetic XML. `stage`
installed authenticated 2.10.0-1 without restarting any service. Long-lived
D-Bus/Python processes still map the old library. The `verify` command correctly
rejects this state and creates no completed release receipt. Keep both host
findings open until a new authorized consumer-refresh/reboot window completes.

After that window, run `node deployment/maintenance/security-20261103/expat-host.mjs
verify`, then a fresh existing host/fleet scan, then `review-expat-host.mjs`.
The reviewer requires exact new payloads, current resident mappings, the private
bus test and a complete scan; it only prepares decisions for operator review.
It does not restart processes or write the ledger. Native package rollback can
also leave mixed process mappings, so it requires the same activation review.

GitHub Actions scheduling remains best effort. A manually successful availability
run is not evidence that periodic delivery recovered. Retain the independent
schedule watchdog and report missed delivery separately from service outages.

Sources checked 2026-11-03: [Expat 2.10.0](https://github.com/libexpat/libexpat/releases/tag/R_2_10_0),
[pyasn1 0.6.5](https://github.com/pyasn1/pyasn1/releases/tag/v0.6.5),
[redirect advisory](https://github.com/advisories/GHSA-mrwp-f3q8-3g9p),
[GitHub scheduled events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

The [complete code-only library supplement](https://tools.utilibre.org/utilibre-source/security-libraries-20261103-source.tar.gz) includes upstream sources/licenses and these recipes (8,769,012 bytes; SHA256 `3b4a820a8b2cde5e1b86d34a921361aed739f66383d50cbe0b2b26645ef4a99a`). Existing complete application source offers remain in place.


## Candlr build inputs — 4 November

Candlr 2.0.0 now runs `utilibre-candlr:2.0.0-inputs-security-20261104`
(`sha256:707780d5b92de62829142d2a7d9fc20e65be11a6f114e47e797b3f8a015f46c8`).
Its canonical lock now pins Sharp 0.35.5, source-map-js 1.2.2, Undici 8.12.2
and Vite 8.3.3, preserving DOMPurify 3.4.17. The first three runtime packages
were already repaired; this closes their stale rebuild inputs as well as the
Vite build input. The image overlays only the rebuilt frontend and its existing
DOMPurify distribution. It preserves 18,981 other runtime files and all backend,
native-library, account, storage and privacy settings. The unused runtime Vite
8.3.0 copy remains; its one Windows-only advisory is separately reviewed against
the actual Linux runtime, not described as patched.

`candlr-inputs.json` binds the upstream revision, 68 source-file hashes, existing
three-page privacy patch, compiler, approved lock and 47 allowed lock-entry
changes. `candlr-privacy.patch` captures existing edits rather than adding new
product behavior. The same October builder supports a separate `candlr --nov4`
profile. Resolution uses only the explicit registry download stage; build and
dependency checks run without external networking. No moving version is
resolved during replay.

```sh
node deployment/maintenance/security-20261022/build-dom-client.mjs candlr --nov4 --resolve
node deployment/maintenance/security-20261022/build-dom-client.mjs candlr --nov4
node deployment/maintenance/security-20261022/build-dom-client.mjs candlr --nov4 --replay
node deployment/maintenance/security-20261022/build-dom-client.mjs candlr --nov4 --stage
node deployment/maintenance/security-20261103/check-markmap-dependencies.mjs --candlr
node deployment/maintenance/patch-leaves-final/check-app.mjs candlr --nov4
node deployment/maintenance/patch-leaves-final/check-libraries.mjs candlr --nov4
node deployment/maintenance/security-20261103/check-candlr-browser.mjs
python3 deployment/maintenance/next-leaves-final/verify.py --candlr-nov4
node deployment/records/publish-sources.mjs candlr --candlr-nov4
node deployment/maintenance/patch-leaves-final/release.mjs --candlr-nov4 prepare candlr
# Separately authorized activation:
node deployment/maintenance/patch-leaves-final/release.mjs --candlr-nov4 apply candlr
```

Do not rerun completed stages into their existing receipt directories. A clean
offline `--replay` passed: 59 of 60 compiled files were byte-identical; the server
entrypoint differed only in Astro's freshly generated manifest encryption key.
That key is intentionally not made deterministic or printed in reports. This
is repeatable preparation, not a byte-reproducible image claim.

The native Undici verifier regression fails before the update and passes after;
seven ordinary HTTP/TLS cases pass on both versions. Native Sharp image format,
orientation, dimensions and transparency checks, source-map roundtrip/bounds,
two-account isolation, save/retrieve/export/delete and real Chromium UI checks
pass. The browser used a network-isolated synthetic instance and a 390px viewport;
zero external requests were observed. This does not establish real-phone support
or reproduce the Vite vulnerability. Four existing release-policy tests pass.

Private evidence is in `security-20261103/candlr/`, with the successful release
in `candlr-release.json`. The new source lock scan has zero high/critical matches
against the retained advisory database, down from seven high. Full image findings
remain visible and earlier runtime reviews require current bytes and receipt
lineage, rather than inheriting approval from an old image name.

[Complete Candlr source offer](https://candlr.utilibre.org/utilibre-source/candlr-inputs-20261104-source.tar.gz):
2,778,508 bytes; SHA256 `333e5dd0cd46940f5fd17b6e51859943b2d8948d6b4cc077f60f2bdd20d376ec`.
This includes the upstream application and current frontend recipe. Earlier
native-library supplements and runtime base remain required by `BUILD.txt`.
The former archive is retained. Rollback restores
`utilibre-records-candlr:sqlite-rowid-20261103`
(`sha256:44aa655bf93d46d3131d9da2a439c654ca6ef81c2bfb4b9d9a6d25673ff5421e`)
through the existing records Compose release, with unchanged mounts/configuration.
No database migration was introduced; an image rollback is not a data restore.

## PairDrop canonical parser lock

The running PairDrop parser was already repaired on 28 October. Its canonical
`deployment/community/pairdrop-security/package-lock.json` still selected
body-parser 1.20.8; it now selects upstream 1.20.9 with its exact npm integrity.
Only that lock entry changed. Express's native compatible dependency range,
all other package entries and the application manifest are unchanged.

`deployment/community/pairdrop-security/lock-replay.json` records the old Git
revision, both lock hashes, compiler, intermediate test image and source.
The old p4 test retains its original lock through that Git reference.

```sh
# Controlled, explicit npm archive acquisition; no install scripts:
node deployment/maintenance/security-20261103/pairdrop-lock.mjs download
# Offline npm ci, isolated intermediate image and before/after parser test:
node deployment/maintenance/security-20261103/pairdrop-lock.mjs prepare
node deployment/maintenance/check-pairdrop-ws.mjs --lock-nov4
```

The old compressed-body fixture crashes for the expected unhandled zlib error;
the fixed parser survives, and seven legitimate request cases pass per version.
The existing native Express routing/proxy/limits and WebSocket fragmentation
checks pass. Two isolated Chromium profiles discover, approve and receive the
exact synthetic file, with direct WebRTC selected and no outside HTTP requests.
No physical devices, cross-network relay or production transfer was exercised.
The source comparison removes one high body-parser match against the same
advisory DB. One medium **qs 6.16.0** finding remains open; no exclusion was added.

This is a **rebuild-input repair, not a production rollout**. The disposable
`utilibre-pairdrop:lock-replay-only-20261104` image starts from the historical p4
base to isolate dependency behavior; it omits later runtime/OS overlays and
must never be activated. The manifest explicitly denies deployment. Current
running services, relay configuration and user transfers are unchanged. Future
production preparation must replay the later existing repair chain and pass
its release checks. Private receipts live in `security-20261103/pairdrop-lock/`.

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

## 4 November continuation: deployed and verified

The [release checkpoint](../../../docs/records/security-maintenance-2026-11-04.md)
separates completed repairs from remaining findings. Preserve the private
receipts referenced below; a successful historical replay is not a fresh scan.

- **QEMU guest agent and utilities:** authenticated Debian Backports
  `1:11.1.2+ds-3~bpo13+4`, using the existing `../security-20261028/qemu-release.mjs`
  transaction. Dependency simulation precedes installation of the two exact local
  archives with `dpkg`; there is no dependency download during activation.
  The first APT local-file attempt failed without installing, and its evidence
  remains. The later release passed; the operator confirmed Proxmox ping and
  `thawed`. That maintenance window is now closed. Further agent operations need
  a new window. `review-qemu.mjs` checks vendor-fixed versions against exact
  installed payloads. `review-qemu-components.mjs` separately proves that four
  SDHCI/9p records concern emulator components absent from these two packages,
  using the authenticated matching source/build graph and complete payloads.
  Neither review clears the separate Proxmox hypervisor.
- **Penpot libXi:** `libxi-inputs.json` pins official Debian `2:1.8.4-1` and
  the backend/exporter predecessor images. The existing `brotli.mjs --batch-20261103
  --libxi KEY` adapter prepares candidates. `check-xi.mjs`, `check-penpot.mjs
  --libxi`, same-database scans and ordinary release gates verify them. Fourteen
  native XInput checks per old/new image and ABI/dependency checks pass. This is
  not a malicious-X-server exploit reproduction. Source provenance and runtime
  bytes, including Penpot's private library paths, are retained.
- **Host libXi and SQLite:** `host-library-inputs.json` and `host-libraries.mjs
  prepare/apply` restrict the transaction to those two packages, verify exact
  rollback archives and reject resident consumers. SQLite's existing sanitizer,
  DISTINCT and FTS repairs are preserved. Native queries, synthetic backup/restore
  and corrupt-FTS rejection pass. No service was restarted. Expat is deliberately
  separate because it has resident host consumers.
- **OAuthlib:** `oauth-debian-inputs.json` and `oauth-client-binding.patch`
  backport upstream commit `c951a1d09f99f14e3240973fa83c4f4287d4753d` onto the exact
  two Debian 3.2.2 grant files. Both client-credentials and password-grant identity
  escalation reproduce in the old fixture and are rejected after repair. Thirteen
  checks retain legitimate clients, credentials, scopes and OAuth1 behavior.
  `oauth-debian.mjs` prepares Kuma with two COPY layers and no resolver or RUN
  command. `check-oauth-debian-app.mjs` reuses the existing native Kuma test;
  authenticated Socket.IO, synthetic persistence and native crypto/Apprise checks
  pass without sending notifications. `oauth-host.mjs prepare/apply` tests the
  real cloud-init OAuth signing function offline and changes only the two source
  files. It never runs cloud-init or restarts a service. A repeated host apply
  verifies the already-correct bytes and makes no changes.

Kuma's deployed image is
`utilibre-uptime-kuma:oauth-client-binding-20261104`, immutable ID
`sha256:80a9866dd3ffcd6716ff0b644b9b39ebe21a3a1aa6aaf1870fababf8969dec6b`.
The complete native application/release evidence is under `oauth-debian/`;
host evidence is `oauth-debian/host/`. Only the named OAuth advisory is covered.
The Debian version label remains unchanged; scanner findings are retained and
`review-oauth-debian.mjs` requires exact current bytes before proposing a bounded
mitigation. This is intentionally not a fabricated upstream package version.

The host update policy protects these packages from unattended replacement.
A manual OAuthlib reinstall can overwrite the backport: re-run its pinned
recipe and checks before release. Its archive/file-hash manifest is the replay
entry point; the older Git-only `source-patches.json` format cannot represent an
extracted Debian binary package. Do not invent a Git revision to register it.

Supplementary code-only source offers, alongside the full application sources:

- [libXi source](https://tools.utilibre.org/utilibre-source/libxi-184-20261103-source.tar.gz):
  473,994 bytes, SHA256 `f3405c3c04713cfc53f89bf034b652bd497a2615aa2a04680dbff19ceda74b28`.
- [OAuthlib source and backport](https://tools.utilibre.org/utilibre-source/oauth-client-binding-20261104-source.tar.gz):
  131,971 bytes, SHA256 `f29a0ef0c52d14304c416d90948fc188da23eaad48aa8d064418c405cddf626a`.

These changes introduce no database migration. Keep prior image pins and native
archives. Host OAuth rollback restores the two original files from its protected
receipt directory after verifying the currently installed postcondition; it does
not restore a database. QEMU rollback restarts the guest agent and therefore
requires another coordinated, thawed maintenance window. Host package rollback
must recheck resident consumers and dependency compatibility; do not copy a
shared library over a running process and call it restored.

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
