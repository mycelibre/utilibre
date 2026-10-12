# Native libxml2 security backport — 11 October 2026

This is an OS-library-only repair for CVE-2026-6653, not an application,
distribution or database-engine upgrade. The canonical images retain prior
language, SQLite, PyJWT and AOM fixes. Accounts, data, registration, telemetry,
network restrictions and retention settings are unchanged.

## Sources and packages

- [Debian's vulnerability record](https://security-tracker.debian.org/tracker/CVE-2026-6653)
  still reports the deployed Bookworm/Trixie releases vulnerable; the vendor
  does not yet publish a fixed package revision.
- [Upstream fix](https://gitlab.gnome.org/GNOME/libxml2/-/commit/463bbeeca1805b5c4828f50d0fefc4eebaf620df)
  bounds entity amplification; the actual 2.9.14 patch is
  [Ubuntu's official backport](https://git.launchpad.net/ubuntu/+source/libxml2/plain/debian/patches/CVE-2026-6653.patch?id=3df6dfb3e4528d6819b1d6f1cdf90d409bb86187),
  SHA-256 `6c2b8a7b6fa470efcb1854e5c73bd7e1ae1663d8b111e27ce9232bbc1fe44f54`.
- Bookworm: exact signed Debian `2.9.14+dfsg-1.3~deb12u6` source and all its
  existing patches, native package flags and dependencies, with that one
  additional upstream patch. Local revision: `2.9.14+dfsg-1.3~deb12u6+utilibre1`.
  The actual library .deb SHA-256 is
  `7e62da4517ca8becfe040fd5085b33529daa10f52d29fa401c1c921ee9ebc2b0`.
- Trixie: reuse the independently reviewed package documented in
  [native-final](../native-final/README.md), including its preserved nine DHI
  security patches and same Ubuntu backport. Local revision:
  `2.12.7+dfsg+really2.9.14-2.1+deb13u3+utilibre1`; .deb SHA-256
  `b2ff4643de60160f0d80fbe617ce2aa6b92b9fa22d3f52cf02ab8cad7eb841e4`.

`build-bookworm.sh` checks the signed source/index and all source/patch hashes,
uses one CPU/two GiB, builds in disposable RAM-backed storage and preserves
an eight-GiB host recovery floor. It produces real .deb packages, source .dsc,
original source archive, local Debian patch archive, checksums and a builder
package inventory. Gathio's exact-version-coupled development package is
updated alongside its runtime library. No Trixie binary is installed on
Bookworm. Runtime overlays make no network requests during image construction.

Debian removes the test/result corpus from its DFSG archive. The recipe restores
only the exact upstream 2.9.14 test corpus for the disposable test run; it does
not ship these files in runtime packages or the local Debian source archive.
Both native builds passed 3,360 document tests, nine entity recursion/size cases,
280,912 API cases across 1,164 functions, character/dictionary and fuzz tests.
The optional external W3C conformance corpus was not downloaded or tested.

The security backport appends fields to two public structures. Existing exported
symbols and existing field offsets compare identically; old- and new-header
native tests use libxml's allocators and exercise entities and chunked input.
This is not a promise of ABI safety for arbitrary third-party code that allocates
these structures itself. Native gates below cover these selected consumers.
Python lxml wheels can contain their own static libxml; replacing the OS library
does not repair a separately embedded copy.

## Exact candidates and gates

`images.json` pins original bases. The private `build.json` freezes resulting
image IDs; `check.mjs` checks the actual installed package and library hash,
native old/new-header allocation/parser behavior, and isolated app fixtures.

| Service | Native verification | Candidate image ID (SHA-256) |
| --- | --- | --- |
| FreshRSS 1.30.1 | Fresh native install/account, SimplePie RSS, Unicode article storage, DOM-validated native OPML export, secondary-account deletion | `6427b824cad55b156574dec0bab5b37db665f804269d06adf9f05375b955d0e8` |
| KitchenOwl | Fresh two-account login, household/recipe import/export/reimport/delete, anonymous/other-account denial, lxml XML/HTML parsing | `333bc47ed7d79a7740b3bfe99166a11fab1a497a2cfbb4849475061de59f0d98` |
| Authentik 2026.8.3 | Fresh isolated PostgreSQL migrations; password/TOTP replay, RSA/ECDSA OAuth exchange, JWKS and token/audience/replay rejection; FIPS OpenSSL and urllib3 retained | `183de8426796745506c5e14c45d413df25c40480bbcaa430372937bf0e5dfd1d` |
| RSS-Bridge 2025-08-05 | PHP DOM, XPath and SimpleXML; native package/allocator gates | `89dd1b4e0ffa64583a1429825f5e797d1cacf4ea79d2090da3a73edbc49907cd` |
| Gathio DocumentDB 0.107.0 / PostgreSQL 17.11 | Fresh SQL/XML, PostGIS GML, GDAL and SpatiaLite relocations, BSON data/role isolation, logical dump/restore | `95ee3337a58fff0a0430840754b91c547f57bfa806e71b8721d5815bf6985a3b` |

All native tests use disposable synthetic data and `--network none`, with
bounded memory/CPU. They do not inspect production user records or send feed
queries, notifications or mail. The tests are native component/API checks,
not claims of new real-device/browser or concurrency coverage.

Actual `/usr/lib/x86_64-linux-gnu/libxml2.so.2.9.14` SHA-256:

- Trixie: `ac980c0afed237e5f14a6749a9e57af772d388d009a93caf633c20db40840947`.
- Bookworm: `f3603d5303e6703a7604204aa318ff6702cb42aa4d9c8114e9debd1e4192c0e2`.

Raw scanner output must remain available. A scanner may still flag the version
because Debian has no fixed revision. Only CVE-2026-6653 can be bound to these
exact patched package/library/image hashes and native source evidence; this
does not waive other XML advisories or all libraries with a matching version.

## Run and release

```sh
sh deployment/maintenance/xml-final/build-bookworm.sh
node deployment/maintenance/xml-final/build.mjs
node deployment/maintenance/xml-final/check.mjs
node deployment/maintenance/xml-final/check-gathio.mjs
node deployment/maintenance/check-auth-vendor.mjs utilibre-authentik:2026.8.3-xml-security-20261011
node deployment/maintenance/xml-final/release.mjs prepare
# Review exact image-only Compose changes before the next command.
node deployment/maintenance/xml-final/release.mjs apply
```

Receipts, source/package artifacts and logs are private under
`/var/lib/utilibre-maintenance/xml-final-20261011/`; Authentik's separate report
is `vendor-stage-20261011/authentik-xml.json`. No secrets belong in this document.
Preparation captures exact original images, hashes configuration without image
pins, validates consistent read-only PG recovery dumps and a native SQLite
backup, and preserves existing file/config backups. Earlier real restore gates
remain separate evidence; archive listing alone is not a restore test.

The guarded rollout changes five applications/six roles, never database engines
or app schemas. Four-minute readiness accommodates native health intervals.
On failure it verifies the frozen previous image is actually running and healthy;
it never restores old data automatically. Reconcile only the failed image pin
with the receipt, retaining all unrelated source changes. FreshRSS's deployed
and repository Compose copies must remain consistent. Canonical public reader
URL is **https://rss.utilibre.org/**, not historical `feeds.utilibre.org`.

The first release attempt used the historical hostname in its public check,
observed its pre-existing 502, and safely restored FreshRSS's original image at
23:09 UTC. The checker was corrected to the canonical catalogue URL before
retrying. The final private release receipt, not image construction or this
document, establishes which roles are deployed.

All five application releases finished at **23:14:40 UTC**. Six running roles
matched their frozen image IDs, installed package versions and library hashes;
the canonical public reader/login/household/bridge entry points and a native
fictional Gathio create/export/delete journey passed. Application-file parity
against each previous image is recorded separately in
`application-byte-parity.json`. Authentik's first check also used an incorrect
flow slug; its exact old image was verified after rollback, then the checked
existing `default-authentication-flow` route and native readiness route passed
on the corrected retry. No recovery data was restored over live data.

## Host package

The VM's Trixie package was separately reviewed; no container-only evidence was
assumed to prove host compatibility. `check-host.py` inventories actual installed
ELF consumers, checks complete relocations against the candidate, and exercises:

- Native old-/new-header libxml entity/input allocation and chunked parsing.
- The installed BIND `host` client against an isolated, synthetic loopback DNS
  response, with dynamic-loader evidence that the new library was loaded.
- LLVM 19.1's documented C interface for creating a context, parsing a fictional
  IR module, locating its function and disposing it. Interface definitions are
  [IRReader.h](https://github.com/llvm/llvm-project/blob/llvmorg-19.1.7/llvm/include/llvm-c/IRReader.h)
  and [Core.h](https://github.com/llvm/llvm-project/blob/llvmorg-19.1.7/llvm/include/llvm-c/Core.h).

The complete direct ELF consumer set was `libisc` and `libdns` from BIND
9.20.29, plus `libLLVM.so.19.1`. This is bounded native evidence for those actual
consumers, not exhaustive BIND/LLVM feature coverage. Apt simulation changed
exactly **one package**, without dependency additions/removals. No host process
in the host mount namespace mapped libxml2 immediately before the update.

`release-host.py` retained the exact signed-index-verified original Debian .deb
(SHA-256 `e0c6b63ce4602a036a526f60fe5e6c1586710688058d98fc1001b9b3147b7efd`),
checked its payload against the installed original library and installed only
the reviewed Trixie package. All checks were repeated against the **installed
system library**, not the staged directory. Final version/library hash matched,
`dpkg --audit` was clean, and Docker/SSH remained active with unchanged process
IDs. No daemon, Docker engine, SSH service or kernel restart was performed.
The guarded rollback keeps the exact previous .deb; it restores only that
package on failure and verifies the old payload, package state and service IDs.

Host release and native verification passed; private receipts are
`host-release.json` and `host-live-native.json`. The check alone does not install
anything. An explicit repeat installation requires a new reviewed old-version
baseline; do not repeatedly run this one-shot release against arbitrary state.
