# Native mount and ACL repair — 12 October 2026

The root maintainer released all eight Bookworm mount overlays on 12 October
2026, with exact-predecessor rollback and native/application checks. Ubuntu
mount is also live: Addy's database passed release at 18:34:27 UTC and Redlib
at 18:38:31 UTC. ACL 2.4.0 is a tested candidate only: it has
not replaced any live library or added utilities to production.

Bookworm's `libmount1`/`mount` 2.38.1-5+deb12u3 uses the legacy mount
system call. The June target-FD patch alone does not bind that call to the
checked inode. Ubuntu's older-release backport has the same limitation.
The repair therefore also carries the relevant September upstream legacy
target pinning and pre-canonicalization hardening, without importing the new
mount API, hooks, public ABI, or unrelated utilities.

Primary references:

- <https://security-tracker.debian.org/tracker/CVE-2026-53613>
- <https://github.com/util-linux/util-linux/commit/0b010025a0e429bc80355c94db86a843395d49e2>
- <https://github.com/util-linux/util-linux/commit/708d1b3c51932dc5ba8082c7368187715e6a8d78>
- <https://github.com/util-linux/util-linux/commit/2c773f336134acf016e639abb6f12ba7341fe4b8>
- <https://github.com/util-linux/util-linux/commit/c197f0f37a5ea5ca65a48c47f98135d5d3dd9ec0>

The adapted restricted path requires the deployed Linux kernel's `openat2`
and `/proc/self/fd`. It fails closed when those facilities are unavailable;
it does not use the older unsafe last-component-only fallback. Unrestricted
root contexts and helper invocation remain compatible. Helpers remain
responsible for their own mount implementations; no claim covers arbitrary
external helpers. Regression tests must exercise the real built library with
an intercepted mount call and synthetic inodes, without mounting a real
filesystem or acquiring privileges.

## ACL: caller migration, not a cosmetic library upgrade

Authenticated Debian ACL 2.4.0-1 was rebuilt for Bookworm as
`2.4.0-1~deb12u1+utilibre1`. All 44 old exports and dependencies are retained.
The new descriptor APIs and six deterministic old/new native CLI race cases
pass. The non-root upstream suite passes (10 pass, four root-only skips, two
expected NFS failures). Additional root tests have one test failure containing
two environmental assertions: Dash lacks `shopt`, and the container device
policy returns EPERM rather than ENXIO. Those limitations are preserved in
the private evidence, not converted to a clean-suite claim.

The legacy `acl_*_file` APIs intentionally retain pathname-following behavior.
Both installed GNU tar 1.34 and rsync 3.5.1 still reach those APIs during actual
ACL archive/copy operations, verified by a test-only function interception in
an isolated container. Regular ACL/content round trips with the new library
pass, but that is compatibility evidence, not proof that every caller is safe.
GNU tar's upstream 2.4.0 header-name fix alone is not a safe-API migration.
Consequently **CVE-2026-54369 remains open**; replacing libraries alone would
not satisfy the requested repair. No host service or library was changed.

CVE-2026-54370 concerns the separate `getfacl`, `setfacl`, and `chacl` utilities.
The CLI-only reviewer requires exact live-image/host evidence that the `acl`
package and those executable paths are absent. It never attributes the library
caller issue or a whole source package as not affected. The library remains
installed; no files are removed to change the scan result.

References inspected on 12 October 2026:

- <https://www.openwall.com/lists/oss-security/2026/06/29/1>
- <https://security-tracker.debian.org/tracker/CVE-2026-54369>
- <https://security-tracker.debian.org/tracker/CVE-2026-54370>

## Mount verification limits

Each Bookworm image passes six unprivileged inode/symlink regression cases.
All 17 targeted libmount upstream tests pass. The complete 225-test upstream
run retains one independently reproduced baseline `lsfd` device-encoding
failure; it is not reported as a clean full suite. Existing native application
fixtures cover all eight image roles. Initial wishlist hydration and CryptPad
network-change test failures remain recorded alongside clean reruns.

The immutable full-source offer is
`security-bookworm-mount-20261012-source.tar.gz`, SHA256
`4d25fc4768bcfd418ae87e3bc64cd3389e7137a79dda6535665f2a5abbaf7480`.
Root owns production pin changes, public source publication and ledger review.

## Ubuntu Noble release handoff

Only `mount` and `libmount1` are replaced, at
`2.39.3-9ubuntu6.6+utilibre1`, in Addy's database and Redlib. The authenticated
Ubuntu vendor `6.6` update supplies the first target-descriptor change; its
classic mount path still needs September's upstream descriptor/pre-canonical
completion. All 318 original exports, SONAME, dependency names, earlier native
repairs, unrelated package/application bytes and runtime configuration match
the exact live predecessor. No libc or application stack is upgraded.

The 261-test full suite has two `lsfd` device-encoding failures independently
reproduced with Ubuntu's official binary. All 17 targeted libmount tests and
12 old/new synthetic cases pass; six fixed cases also pass per candidate.
Addy's native authenticated transaction, least-privilege denial, TLS and
disconnected second-instance dump/restore pass. Redlib's native startup and
settings page pass; only its unchanged startup OAuth request reaches Reddit,
and no visitor search/media fetch is used as a load test.

Completed root-maintainer sequence (one image at a time):

```sh
node deployment/maintenance/mount-acl-final/ubuntu-source-offer.mjs --publish
node deployment/maintenance/mount-acl-final/ubuntu-release.mjs prepare addy
node deployment/maintenance/mount-acl-final/ubuntu-release.mjs apply addy
node deployment/maintenance/mount-acl-final/ubuntu-source-offer-v2.mjs --publish
node deployment/maintenance/mount-acl-final/ubuntu-release.mjs reprepare redlib
node deployment/maintenance/mount-acl-final/ubuntu-release.mjs apply redlib
```

The release helper gates the public source bytes, fresh exact native and
application receipts, unchanged service configuration, unchanged data volumes,
and exact predecessor/candidate IDs. A failed readiness check restores the
predecessor pin and recreates its unchanged service/namespace companions.
No data migration occurs. Root registers the two completed receipts in the
existing overlay ancestry registry before a fresh scan/review.

The immutable source offer is
`security-noble-mount-20261012-source.tar.gz`, SHA256
`9661403044f1420f0a2f4fbf48b9cfc3351152713232cfad0f403ff16cea3c84`.
Redlib's first guarded attempt stopped before changing its pin or recreating
the service: the image was selected by both a Compose default and an explicit
`REDLIB_IMAGE` assignment. The failed receipt is retained. The corrected
helper verifies and changes exactly those two matching image references,
rejects unexpected overrides, and reverses only that same pair on rollback.
It records hashes, never other environment contents. Re-preparation confirmed
the predecessor remained healthy and its resolved configuration was unchanged.

The corrected integration is published in the additive immutable
`security-noble-mount-20261012-source-v2.tar.gz`, SHA256
`de427630fb7d10627a133017f709eec13f8f930c5e28301aa812380cca683c70`.
The initial archive, native packages, original source and Addy release receipt
remain unchanged. The completed Redlib receipt binds the second offer.

After the fresh scan, `review.mjs` handles Bookworm, `ubuntu-review.mjs` handles
Noble, and `acl-cli-review.mjs` separately proposes only absent CLI-component
attribution. These programs write review proposals, never the live ledger.

The ACL collector checks live package/command state without relaxing dropped
capabilities. It separately examines each exact image read-only, without user
mounts. Host checks cover native executable roots. All 35 affected container
roles and the host passed the preliminary presence check; a fresh scan must
still match the exact artifact before any attribution is proposed.
