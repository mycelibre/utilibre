# Coturn: bounded MongoDB C driver repair

12 October 2026. This changes two native libraries, not Coturn, its credentials,
listeners, quotas, TLS certificate, database choice or application configuration.
The exact current base is pinned in `common.mjs`; later repairs must be serially
rebased, never applied over a stale image.

## Source and scope

Debian Trixie `mongo-c-driver 1.30.4-1+deb13u3` is authenticated through the
archive-key-signed InRelease, complete Sources checksum and exact three source
archives. All ten Debian patches remain. The only added patch is unmodified
upstream stable-branch commit
[7e4c665](https://github.com/mongodb/mongo-c-driver/commit/7e4c66515a46abaf2f488ed0fe5a5c21887b6e1d),
released in [1.30.9](https://github.com/mongodb/mongo-c-driver/releases/tag/1.30.9).
It fixes OCSP responder temporary-object ownership, CVE-2026-84964. Vulnerable
code is in libmongoc. libbson is rebuilt from the same source; this is not a claim
that the BSON decoder contained this OCSP bug. Locally maintained package version:
`1.30.4-1+deb13u3+utilibre1`, not an upstream Debian release.

No major library transition, removed feature, changed header ABI, new dependency,
or security scanner modification is involved. Every prior export, SONAME and
NEEDED dependency is retained; upstream adds one private OCSP regression entry
point. Unrelated package versions and runtime/configuration bytes are compared.

## Reproduce and verify

Private work is `/var/lib/utilibre-maintenance/coturn-bson-final-20261012`;
compiler workspace is `/work/coturn-bson-final` in the dedicated existing Trixie
builder. Keep compiler at two CPUs/two GiB, preserve eight GiB host free space,
and disconnect its temporary acquisition network before building/testing.

1. `acquire-build-inputs.sh` obtains exact source/build dependencies; run
   `node deployment/maintenance/coturn-bson-final/authenticate.mjs`.
2. Copy authenticated input and recipes to the compiler, extract Debian source
   as `source`, assign this workspace to `nobody`, then run `build-inner.sh`.
3. Run `test-inner.sh`. The preserved Debian source has two pre-existing BSON
   validation expectation failures. `baseline-tests.sh` removes only our patch,
   rebuilds the original suite, reproduces those exact failures, reapplies the
   exact patch and creates complete source packaging. It does not alter tests.
4. Copy output back, with the original tarball next to the new DSC. Run
   `native.mjs`, `stage.mjs`, then `application.mjs`. No production changes.
5. Run `source-offer.mjs` and, after review, `source-offer.mjs --publish`.
6. Run `release.mjs prepare`. The operator changes only the two image references
   in the existing TURN Compose files. `release.mjs apply` serially recreates
   each service only after two zero-allocation checks. An active relay is a
   reason to wait, not to disconnect visitors. Final native STUN is mandatory.
7. After the normal fresh fleet scan, `review.mjs` prepares only scoped review
   decisions. The shared applier/ledger remains operator-owned.

The unit gate passes the unchanged upstream OCSP fixture (no HTTP requests),
368 BSON/URI/atomic cases, and original-header native BSON/URI consumers.
Two huge-allocation upstream cases are skipped. Two BSON validation assertions
also fail on the unmodified vendor source: retained as known baseline failures,
not counted as passes. An initial broader selection accidentally included mock
database network cases; its failure evidence is retained, and that incomplete
selection is not claimed as tested coverage. No external MongoDB service or
exploit toolkit is used.

The existing disposable native relay fixture tests anonymous/wrong-password
denial, UDP/TCP/TLS allocation, private/metadata destination denial, a four-slot
test quota and rejection of slot five, plus bidirectional exact-byte UDP/TLS
relay traffic. This does not establish public NAT/phone/browser coverage or
throughput. After serial release the operator may use the existing bounded
live checks, never repeat public quota stress tests:

```
python3 deployment/community/turn/check-security.py --bounded-live
python3 deployment/maintenance/native-final/check-coturn-live.py --galene
```

## Rollback and privacy

Restore the prior exact image reference recorded in `release.json`, using the
same idle checks and existing Compose service. Failed readiness automatically
uses a temporary image-only override; reconcile the source pin afterwards.
Never restore credentials/configuration or delete application data. There are
no changes to data retention, logging, shared secrets, passwords or access.
Private receipts contain hashes and exact source/package/test evidence, never
public credentials. The published archive contains only source and recipes,
not configuration, logs, certificates or private receipts.

The compatibility tests do not prove general ABI correctness for every possible
consumer. They substantiate this unchanged native Coturn deployment. Debian's
[tracker](https://security-tracker.debian.org/tracker/CVE-2026-84964) may continue
to flag the source version until vendor metadata recognizes the local backport;
the narrow expiring review is tied to actual installed repaired bytes.
