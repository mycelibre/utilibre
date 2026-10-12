# Native Bookworm curl closure — 12 October 2026

This repair keeps Debian 12/glibc and the deployed application versions. It does
not force newer security patches onto the structurally different curl 7.88 tree,
install sid binaries, remove package records, or change application access rules.

## Payload and verification

- Signed upstream curl **8.22.0**, native package version
  `8.22.0-1~deb12u1+utilibre1`, built with matching Debian packaging adjusted for
  Bookworm package names/dependencies. Source SHA-256:
  `f7ef3ae8a22e521f289803fe93543eb64c329b58aa73a9e224dfd915a2a5f4f7`.
  Upstream signing fingerprint: `27EDEAF22F3ABCEB50DB9A125CC908FDB71E12C2`.
- Both OpenSSL and GnuTLS variants retain their old versioned ELF interfaces,
  including `CURL_OPENSSL_4`, `CURL_GNUTLS_3`, and the GnuTLS `.so.3` alias.
  The only ignored linker entry is Debian's zero-size, absolute `HIDDEN`
  namespace marker, never a function, storage object, or actual CURL ABI.
- Ordinary NTLM and SMB remain enabled in these general-purpose builds. Upstream
  removed RTMP, TLS-SRP and the NTLM_WB helper; these changes are explicit gates,
  not a blanket allowance for missing capabilities. No HTTP/3 was added to the
  Debian libraries (the old builds did not provide it).
- Upstream suites reported **1,837/1,837 OpenSSL** and **1,888/1,888 GnuTLS**
  passes. Platform/optional-feature skips are retained in private logs, not
  counted as passes. Tests **1725, 2036, 2504** were separately rerun: **3/3 in
  each TLS variant**, including default-SCP rejection of the wrong host key.
  Debug-only test 1647 was unavailable in these release builds; it is not
  reported as executed. The complete upstream security release is used.
- The first outer build wrapper ended nonzero after successful compilation and
  suites because its bind-mounted shell recipe was edited while running. No
  security patch was forced and no failing binary test was suppressed. The
  artifacts were retained, targeted tests rerun successfully, and all package
  checksums and native consumer gates passed. The reproducible wrapper now
  snapshots its recipe before execution and configures the disposable SSH test
  account before either suite.
- The compiler was limited to 2 CPUs/4 GiB, with compilation/tests disconnected
  from networking and no production data mounts. It has been removed.

Old and new libraries passed seven loopback checks each: GET, redirect, gzip,
POST, trusted TLS, wrong-host TLS rejection and 404. Complete application and
configuration bytes and unrelated shared libraries were compared. Gathio's
native PostgreSQL/DocumentDB typed data, read-only role and logical restore;
Kuma's native SQLite setup/login; and Rallly's migrations/fictional invitation
render passed. Rallly's check is not an organizer creation or email-delivery test.

## RSS-Bridge is a separate consumer

Package metadata alone was insufficient: its PHP extension used
`LD_PRELOAD=/usr/local/lib/curl-impersonate/libcurl-impersonate.so`, originally
**8.13.0-IMPERSONATE**, with the **chrome131** profile. Updating only Debian
`libcurl4` would leave that active code unchanged.

The existing upstream-supported preloading mechanism now uses **lexiforest
curl-impersonate v2.2.3**, commit
`6e8f87760a4dd96771e96fc9d55440dcd8845243`, based on curl 8.22.0. Its immutable
official release archive SHA-256 is
`d5eb746c109be4d945cc5fcbe8a5c4940471041be4901439d50111cc3c83359d`.
Only the SONAME is adjusted to `libcurl.so.4`, exactly as the official RSS-Bridge
Dockerfile already does. The resulting library SHA-256 is
`3e30f8c2978706f169c90faf061d5ee7ef6ea6bdd4e296d8de6df4aa478cff19`.
All prior exported interfaces are retained; it requires no newer than glibc 2.17.
All bundled notices are included. Obsolete static dependency archives and the
upstream packaging-only runtime probe are not installed in the runtime image.

This vendor release disables **NTLM, SMB and SMBS**. This exception applies only
to the exact deployed HTTP(S)-only RSS-Bridge configuration: GithubTrending,
TheGuardian and ArsTechnica. Its unchanged `CurlHttpClient` already limits
protocols to HTTP/HTTPS, and these consumers contain no NTLM/SMB calls. The
release gate pins that configuration's hash. Expanding enabled bridges or
changing this protocol policy requires a fresh capability review.

Both old/new actual PHP consumers passed HTTP/HTTPS, redirects, decompression,
POST, errors, wrong-host certificate rejection, explicit SMB/SMBS rejection,
HTTP-to-SMB redirect rejection, chrome131 headers and **negotiated HTTP/2**.
PHP OpenSSL AES-GCM still works. The native GithubTrending Python-language
selection fetched a fictional HTTPS page and produced a valid one-entry Atom
feed. Only its fixture destination was redirected to loopback using documented
curl connection options; no production source or external feed was queried.
HTTP/3 capability remains present but a QUIC transfer was not tested. The
vendor's complete upstream test suite was not rerun; official prebuilt digest,
source versions, ABI and native consumer checks were verified.

## Rebuild, release and rollback

`build.sh`/`inner.sh` prepare the native build; `packaging.mjs` performs bounded
packaging changes. Inputs are checked before execution. `stage.mjs` refuses
changed base-image IDs and completed proof overwrites. `app-checks.mjs`,
`rallly-check.mjs` and `rssbridge-check.mjs` are isolated acceptance gates.
`prepare-impersonate.mjs` verifies the immutable vendor artifact and SONAME
payload; `vendor-sources.mjs` retains the pinned dependency sources without
executing their build scripts. No automatic moving-tag deployment is introduced.

Gathio/Kuma/Rallly use the shared guarded release process and central
`closure-followup-20261012/bookworm-curl-release.json`. RSS-Bridge uses
`release-rssbridge.mjs prepare` then `apply`, with central
`rssbridge-curl-release.json`. Its only production edit is the exact RSS-Bridge
image scalar in `deployment/community/compose.yaml`; `/opt/utilibre` has no
RSS-Bridge service. It verifies source/config hashes, preload/profile, package
and binary identities, running health, existing firewall and HTTPS reachability.
On failure it restores only that image pin and verifies the old service, without
restoring/deleting user data. Keep the old image until the release is accepted.
Do not roll back a later Python/OpenSSL layer by reusing these historical pins.

Private receipts are under
`/var/lib/utilibre-maintenance/bookworm-curl-followup-20261012/images/<service>/`.
`build.json`, `native.json` and `application.json` must agree on image ID and
pass; RSS-Bridge additionally requires `impersonate.json`. Scanner disposition,
reviewer chains and later overlays remain controlled by the central maintenance
workflow, not a version string or these test results alone.

The additive source archive includes the complete modified Debian source,
upstream signatures/notices, build inputs, vendor source and every pinned vendor
dependency source, recipes and checksums. It deliberately excludes runtime
configuration, logs, fixture private keys, credentials and user data.

## Primary evidence (checked 12 October 2026)

- [Current curl releases](https://curl.se/info) and [8.22.0 advisory list](https://curl.se/docs/vuln-8.22.0.html).
- [curl ABI policy](https://curl.se/libcurl/abi.html).
- [CVE-2026-6276](https://curl.se/docs/CVE-2026-6276.html), [8286](https://curl.se/docs/CVE-2026-8286.html), [8458](https://curl.se/docs/CVE-2026-8458.html), [8927](https://curl.se/docs/CVE-2026-8927.html), [12064](https://curl.se/docs/CVE-2026-12064.html).
- [Pinned impersonation release](https://github.com/lexiforest/curl-impersonate/releases/tag/v2.2.3), [build inputs](https://github.com/lexiforest/curl-impersonate/blob/v2.2.3/CMakeLists.txt), [API](https://github.com/lexiforest/curl-impersonate/blob/v2.2.3/docs/api.rst).
- [Deployed RSS-Bridge source](https://github.com/RSS-Bridge/rss-bridge/tree/b39964cee3e4b0babe739d47a604c2323fd270f0), including its `Dockerfile` and `lib/http.php`.
