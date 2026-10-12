# Bookworm Python, Expat and backup-SDK follow-up

Scope: native Python used by the existing Kuma and Gathio images. No application upgrade, database migration, user-content access, glibc replacement or distribution transition. The release owner authorized both exact-image releases on 12 October 2026. Private evidence is under `/var/lib/utilibre-maintenance/python-bookworm-followup-20261012`; do not publish that directory wholesale.

## Delivered versions and provenance

| Component | Previous version | Delivered version |
| --- | --- | --- |
| Four Python runtime packages | `3.11.2-6+deb12u9` | `3.11.2-6+deb12u9+utilibre1` |
| `libexpat1` | `2.5.0-1+deb12u4` | `2.9.0-1~deb12u1+utilibre1` |
| Gathio `python3-boto3` | `1.26.27+dfsg-1` | `1.40.72-1` |
| Gathio `python3-botocore` | `1.29.27+repack-1` | `1.40.72+repack-1` |
| Gathio `python3-s3transfer` | `0.6.0-1` | `0.14.0-1` |

The Python patch is the [upstream 3.11 CVE-2026-7210 fix](https://github.com/python/cpython/commit/cbaecf9f16da611a646d507c1cbca265c588fc56). `verify-source.mjs` verifies the pinned upstream patch hash and proves the additions/deletions in all four C/header files are identical; only Debian patch context differs. Existing Debian patches remain. Expat was rebuilt from Debian's 2.9.0 source on Bookworm, not installed as a newer-distribution binary. The Python C API member is appended, preserving earlier offsets. Both narrow and wide Expat libraries retain all 71 previous exports.

APT downloaded sources and the three architecture-independent SDK packages against the isolated `review.sources` and authenticated Debian indexes; exact checksums are pinned. This is **not** a claim that each `.dsc` signature was independently verified. CPython/Expat and SDK archives retain their original licence notices and Debian copyright files. SDK compatibility is documented in upstream [botocore 1.40.72](https://github.com/boto/botocore/blob/1.40.72/setup.py), [boto3 1.40.72](https://github.com/boto/boto3/blob/1.40.72/setup.py) and [s3transfer 0.14.0](https://github.com/boto/s3transfer/blob/0.14.0/setup.py): this combination supports Python 3.11 and the deployed urllib3 2.8. Barman remains `3.20.1-1.pgdg12+1`.

## Build, tests and limits

`build.sh` uses the pinned Bookworm compiler image in `repair.json`, limited to 2 CPUs, 4 GiB RAM and 256 processes, with an 8 GiB free-disk floor. Network is disconnected after APT preparation. Native builds use the unprivileged uid/gid 65534. `build-packages.lock` records the compiler dependencies. Packaging uses `nopgo nolto nocheck`, followed by explicit upstream tests: do not describe this as the full Debian Python test suite.

Observed results:

- Expat: **5,196 checks, zero failures**.
- Python: all **10 targeted modules** passed (`pyexpat`, both ElementTree variants, `minidom`, `sax`, `tarfile`, `ssl`, `sqlite3`, `ctypes`, `asyncio`).
- A disposable native interposition probe confirms both deployed parser paths call `XML_SetHashSalt16Bytes` with a nonzero 16-byte salt. It reports counters, never salt contents, and is not installed in the released image.
- Candidate staging compares package deltas, native exports, unrelated library bytes, image settings, application/configuration files and previous security layers. Kuma has exactly five changed packages; Gathio has those five plus the three explicitly reviewed SDK packages.
- Kuma: isolated real setup/login, native SQLite, PyJWT signing and rejection cases, and Apprise parser checks without sending notifications.
- Gathio: isolated PostgreSQL/DocumentDB typed data, PostGIS projection, permission denial, logical dump/drop/restore, and the upstream FlatGeobuf malformed/valid-buffer tests (**2 tests, zero failures**). Permission fixtures use a separate synthetic database rather than altering DocumentDB's internal grants.
- Live release: exact image/configuration/health checks and successful public HTTP checks; no production database test records or credentials used.

Failed compiler-wrapper attempts were retained privately. A packaging version-order issue was corrected, and a wrapper completion error after successful compilation was repaired. A clean `finalize` run repeated the ten Python modules, regenerated source/packages and finished successfully. No failed attempt was treated as release evidence.

### Backup-provider regression caught and repaired

The earlier urllib3 2.8 overlay left Gathio's old botocore unable to import the removed `urllib3.util.ssl_.DEFAULT_CIPHERS`. This was reproduced on the pre-Python live image and its candidate. Barman's `--help` had passed because that path defers loading the AWS provider. This establishes a compatibility regression, **not evidence that a real user's backup failed**.

The gate stayed closed until the supported boto3/botocore/s3transfer combination above passed. No S3 provider was removed or disabled. `sdk-native.py` uses a private loopback TLS S3 fixture with fictional credentials, independently verifies SigV4 HMACs, and checks environment credentials, native Barman upload/list/read/download, missing objects, wrong-key denial, untrusted-certificate denial and deletion of the tiny synthetic fixture. It made 12 tiny requests, without cloud access or actual backup credentials. This is not a multipart test, real-cloud backup test or production restore claim.

### A separate non-applicability finding

The exact Debian `tarfile.py` payload lacks PEP 706's extraction-filter implementation; `filter='data'` raises `TypeError`, and the filter functions/classes affected by [CVE-2026-11940](https://security-tracker.debian.org/tracker/CVE-2026-11940) are absent. `tar-component-proof.mjs` records this per image and source hash; staging and review recheck it. This is **not a repair**, not a claim that unrestricted tar extraction is safe, and not an exemption for other tar vulnerabilities.

## Reproduction and release

The public source archive contains complete modified Debian source packages, upstream original archives, original authenticated inputs, SDK corresponding sources, pinned hashes, notices and recipes. Extract each modified `.dsc` using `dpkg-source -x` and build in the included Bookworm environment/dependency lock. Build/install Expat development packages before Python. For the original-input route, populate the private work directory with the archived `inputs/` files, review the explicit paths in `build.sh`, and run it in a disposable environment. The recipes intentionally refuse to reuse a completed build or replace an unexpected live image.

Normal order after fresh source verification:

1. `node acquire-sdk.mjs --sources` downloads/checks the three SDK binaries and nine corresponding-source files; host APT configuration/packages are untouched.
2. `build.sh` builds native packages and runs the focused suites.
3. `node stage.mjs kuma` / `gathio`, then `node app-checks.mjs kuma` / `gathio`, validate isolated candidates. Reconcile `specs.json` with the latest reviewed parent image before a **new** release; never overwrite another security layer.
4. `node release.mjs prepare kuma` and `node release.mjs apply kuma` (likewise Gathio) use the established exact-image/configuration guards and rollback process. This is a production action, not part of merely reproducing the build.
5. Run a new scan, then `node review.mjs`. It writes separate `mitigation-review.json` and `not-affected-review.json`, never the shared decision ledger. The release owner reviews/applies them using the explicit allowlist.

The synthetic SDK test needs a newly generated self-signed loopback test certificate/key with `subjectAltName=IP:127.0.0.1,DNS:localhost`, mounted only at `/fixture`. Never reuse a production private key. The fixture key is deliberately excluded from the source offer. Gathio's upstream spatial test runner comes from the separately published matching PostGIS source. Shared current maintenance/review helpers are in the existing integration source offer; the essential build/staging/release helpers are also included here.

The successful release receipt is `release.json` in the private work directory. Kuma's released image was `utilibre-kuma:python-expat-security-20261012` (`sha256:09b83e26e45864276fd88f375c35e78184e575b58dd23a05f1d1d900210c239b`); Gathio's was `utilibre-gathio-documentdb:python-expat-security-20261012` (`sha256:cc6bdd204e088f13ba39d977c17656b5b6844e012dce64b1dca1cf732fa6ae6d`). Later reviewed overlays may supersede these exact images.

Rollback restores the previous exact image scalar recorded in the receipt and uses the existing service health gates. There is no schema/data rollback. If a later reviewed layer exists, use its release chain rather than blindly reverting to this receipt. Keep old images until the release owner's bounded rollback-retention policy permits their removal.

## Review and eventual retirement

`review.mjs` requires a fresh scan, a passed release predating that scan, exact scanned/live image identity, an unbroken reviewed overlay chain, and byte identity between installed files and all five repaired native packages. It narrowly covers CVE-2026-7210, CVE-2026-77214 and the separate CVE-2026-11940 non-applicability finding. Decisions expire after seven days. Other vulnerabilities remain open for independent triage.

Do not replace these local images through unattended moving tags. Retire the overlay only after the protected-update process proves upstream carries equivalent fixes, compatible SDKs, retained configuration and passing native/application checks. Pin the reviewed successor, record its receipt, and remove only the now-redundant recipe/exception through normal review.
