# Bookworm OpenLDAP library follow-up

This candidate repairs only CVE-2023-2953 in Debian OpenLDAP 2.5.13 without
switching the application to OpenLDAP 2.6, a different distribution, or a new
TLS implementation. It is not a blanket clearance of all OpenLDAP findings.
No production deployment is performed by the preparation scripts. The separate
`release.mjs apply` is reserved for the reviewing maintainer.

Maintenance must preserve this repair across later application image updates,
or replace it with an upstream/vendor release that contains the same fixes.
A `+utilibre1` version string alone is not sufficient evidence: compare the
source patches, native package/library hashes and compatibility gates again.
Trivy may continue to report the older Debian source version. Only exact
scoped review can reconcile that finding; this recipe changes no security
decisions and does not suppress unrelated source-package advisories.

The exact Debian-maintainer-signed `2.5.13+dfsg-5` source and upstream 2.5
commits `752d320cf96e46f24c0900f1a8f6af0a3fc3c4ce` and
`6563fab9e2feccb0a684d0398e78571d09fb808b` are pinned in `spec.json`.
Original Debian patches, hardening and GnuTLS/SASL linkage remain in place.
The native version is `2.5.13+dfsg-5+utilibre1`. Only `libldap-2.5-0` may be
overlaid in Kuma, Rallly, RSS-Bridge and Gathio. The built LDAP server and
command-line tools are test artifacts, not new services or runtime additions.

The pre-existing disposable Bookworm compiler is capped at two CPUs, 4 GiB
memory and 256 processes. Work is isolated to `/work/openldap-followup`,
preserving the earlier GDAL/PostGIS source trees. The preparation guard
requires 10 GiB free before work, including the maintained 8 GiB disk floor.
Source authentication uses the archive-provided Debian maintainers keyring;
this upload was signed by a Debian Maintainer, not a key in the separate
Debian Developer keyring.

`acquire.mjs` verifies source signatures/checksums. `prepare.sh` installs
compiler-only dependencies and unpacks Debian's source. `build.sh` applies
both unmodified upstream patches with zero fuzz, then executes the full
Debian binary build and its upstream tests. Debian itself disables two
known timing-sensitive tests; those are not reported as passed.
`source.sh` recreates a clean signed-source extraction with the exact same
patch stack and changelog, checks the changed C files against the compiled
tree, and packages that clean source. The initial attempt to package the
unclean binary staging tree was correctly rejected; its diagnostic remains
in the private build log. Binary build/tests passed before that packaging
error. No binary staging files are added to the corresponding-source archive.

`native.c` checks ordinary LDAP/LDAPS/LDAPI URI setup, IPv6 host parsing,
invalid-scheme rejection, options, the selected GnuTLS backend, native BER
round-trip and reading a synthetic local LDIF file. It neither connects to
an outside LDAP service nor injects allocation failures. Source inspection
establishes the allocation-check repair; these compatibility tests are not
claimed to reproduce a denial of service.

## Observed candidate results, 2026-10-12

- Debian's full binary build completed: 76 upstream tests passed, eight were
  skipped for unavailable optional components/environments, one (`test058`)
  was disabled in the upstream test itself, and two known
  timing-sensitive tests were disabled by Debian's unchanged recipe.
- The 183,532-byte native package SHA-256 is
  `e7ec19de9c188b02782cdb3498ce490503e032cff9f5670d1098570dc3d0ca26`.
- All 569 `libldap` and 138 `liblber` exported symbols, SONAMEs and direct
  dependencies are preserved; no private runtime search path was added.
- Candidate `libldap` SHA-256 is
  `0b6a25492cca821398ca01b14f91ec657b59ac240e781f0510ee4318bdeaef5e`;
  `liblber` is
  `a87b3119e3bc1fe79c6bea717c696dd60df8c19334b4908de8b8ecf67f2d2df1`.
- Native URL, IPv6, options, GnuTLS selection, BER and local LDIF checks run
  on each old and candidate image with networking disabled. These supplement
  the compiler's upstream LDAP/TLS/server integration tests; they do not
  constitute an application account workflow or production deployment.
- Stage checks retain application files, configuration, unrelated libraries,
  other installed package versions and image startup settings byte-for-byte.
  The Kuma base includes the intervening Click/Sudo repairs; Gathio includes
  GDAL/PostGIS and the intervening X11 repair.

`collect.mjs` exports exact source/binary hashes and distinguishes actual
test skips from successful cases. `stage.mjs [kuma rallly rssbridge gathio]`
accepts only the named, pinned roles and stops if a live base changed. It
creates disposable, unexposed checks and removes their anonymous volumes.
`publish-source.mjs --publish` additively publishes an immutable corresponding-source
archive including original authenticated source, patched Debian packaging,
upstream patches, dependency inventory, reproduction recipes and notices.

## Application and release gates

All four isolated application checks passed on the exact candidates. Kuma
used a fresh tmpfs SQLite database and native authenticated setup/login without
notifications. Rallly used two separate synthetic accounts, native password
setup/sign-in, poll creation, an anonymous vote, reloaded results, denied
cross-account/guest deletion and successful owner deletion. Account/space and
reset-token rows were seeded only in its disposable database; production OIDC
and mail delivery were not tested. No public registrations were changed.

RSS-Bridge produced Atom from a synthetic loopback GitHub HTTPS response,
retaining Chrome 131 impersonation, HTTP/2, native PHP crypto, unsupported
protocol rejection and the exact bridge policy. Neither old nor new fixture
queried an external website. Gathio's actual PostgreSQL/DocumentDB stack
passed TLS/wrong-host rejection, PostGIS projection, typed BSON persistence,
read-only role isolation, native dump/drop/restore and its native backup SDK
against small synthetic loopback objects. That is not a production restore
or an off-host backup guarantee. All fixture data/containers were removed.

`application.mjs native` and `application.mjs rssbridge` adapt only the paths
and disposable names in existing application fixtures. `rallly-check.mjs`
implements its additional native role checks. To repeat loopback TLS checks,
generate new two-day self-signed RSA-2048 certificates using `openssl req
-x509 -newkey rsa:2048 -nodes -days 2`, subject `/CN=localhost` and SAN
`DNS:localhost,DNS:github.com`, into the documented fixture directories in
the scripts. Never reuse production keys. The backup SDK fixture needs only
the localhost identity. No test private keys are in the source offer.

The reviewing maintainer runs each role serially:

```sh
node deployment/maintenance/openldap-followup/release.mjs prepare kuma
node deployment/maintenance/openldap-followup/release.mjs apply kuma
```

Repeat for `rallly`, `rssbridge`, then `gathio`. Preparation changes only private
evidence; apply changes exactly one existing image scalar, recreates its
reviewed service and same-image namespace companions, and gates exact image,
native library hashes, native package version and existing HTTP health. It
rejects concurrent receipts, proof/config drift, stale tests and a disk below
the 8 GiB recovery floor. Failure attempts exact-image rollback without data
restoration. `advisory-patch.mjs` emits a reviewable application-evidence
rebinding only after all four releases pass; it neither edits the shared
advisory file nor clears dependency findings.

## Other source-package advisories

Checked against Debian's primary tracker on 2026-10-12. Each requires its own
binary/configuration proof before any queue decision:

- [CVE-2015-3276](https://security-tracker.debian.org/tracker/CVE-2015-3276):
  NSS-specific cipher parsing; Debian builds GnuTLS. Inspect native linkage,
  not merely the source-package name.
- [CVE-2017-14159](https://security-tracker.debian.org/tracker/CVE-2017-14159):
  slapd PID handling. Establish whether slapd/scripts are actually installed.
- [CVE-2017-17740](https://security-tracker.debian.org/tracker/CVE-2017-17740):
  nops server overlay; Debian does not build that module. Check installed
  files and library exports before classifying.
- [CVE-2020-15719](https://security-tracker.debian.org/tracker/CVE-2020-15719):
  disputed LDAP certificate-name semantics. Do not waive it merely because
  Debian marks its urgency unimportant; actual TLS policy/consumers matter.
- [CVE-2026-22185](https://security-tracker.debian.org/tracker/CVE-2026-22185):
  bundled LMDB's `mdb_load` utility; OpenLDAP does not build that source.
  A separately installed LMDB package remains a separate scope.

Primary repair reference:
<https://security-tracker.debian.org/tracker/CVE-2023-2953>.

Private native evidence belongs under
`/var/lib/utilibre-maintenance/openldap-followup-20261012`. No credentials,
live LDAP directories, notification destinations or user records are used.
An exact final application/health gate and production image-pin release are
owned by the parent maintainer; preparation alone is not deployment.

Rollback, if this overlay is subsequently released: return only the affected
service's image pin to its recorded `baseRef`, recreate that service using its
existing Compose project, and verify health/native bytes. Do not roll back
whole Compose files or databases, and do not discard later independent image
repairs. No schema, content, retention or access-control migration is involved.
