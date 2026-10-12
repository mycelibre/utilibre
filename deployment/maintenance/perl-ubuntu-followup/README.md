# Native Ubuntu Perl security update — Addy database

Scope: only four installed Perl packages in the existing Ubuntu Noble MariaDB
12.2.2 image. No Perl fork, Debian/Ubuntu migration, database-engine update,
application/configuration change, new dependency or production-data fixture.

## Vendor inputs and exact boundary

Canonical marks [CVE-2026-9538](https://ubuntu.com/security/CVE-2026-9538)
fixed in `5.38.2-3.2ubuntu0.4`. The actual installed baseline is
`5.38.2-3.2ubuntu0.2`. A fresh archive check on 12 October found that `0.4`
had been superseded/removed from Noble Security and Updates on 17 September.
The selected supported vendor version is **`5.38.2-3.2ubuntu0.6`**, retaining
the same 5.38 ABI and the intervening vendor security fixes. No obsolete
unverified binary was downloaded to satisfy the earlier version number.

`acquire.sh` runs in a disposable exact-base container and uses authenticated
official Ubuntu indexes. `verify-input.mjs` independently checks the signed
Noble Security InRelease against the original image's Ubuntu keyring, then
checks the uncompressed index digests and every source/binary archive digest.
The source `.dsc` signer's personal key is not present in the host keyring;
authentication comes from the signed archive chain, not an unverified claim
about that separate inline signature.

Only `libperl5.38t64`, `perl`, `perl-base`, and `perl-modules-5.38` may change.
The simulation rejects additional installations, removals or unrelated
upgrades. Original OpenSSL, gzip, ncurses, gosu, MariaDB and other repairs
remain byte-identical. The old image is retained for rollback.

The vendor Archive::Tar cap fixes the specific memory-allocation defect.
Debian still postpones its own stable backport while upstream regression
concerns are reviewed; [Archive::Tar issue 47](https://github.com/jib/archive-tar-new/issues/47)
remains open. This release does not claim every possible archive denial of
service is fixed or promise safe unbounded processing of arbitrary archives.

## Verification and resources

The private receipt directory is
`/var/lib/utilibre-maintenance/perl-ubuntu-followup-20261012`.

- Signed input: 10,030,808 binary bytes and 14,286,153 source-archive bytes.
- Candidate adds 99,551,744 image bytes. Extracted source is approximately
  130 MiB; retained inputs/indexes approximately 27 MiB. These are measured
  preparation costs, not production memory estimates.
- Acquisition/build: 1 CPU, 512 MiB; 8 GiB free-disk floor. Test commands use
  disconnected containers and small tmpfs fixtures.
- All unrelated installed package versions and `/usr`, `/etc`, `/opt`
  files/symlinks/ownership/modes match. Image configuration, Perl ABI settings
  and existing libperl exports/SONAME/native dependencies are checked.
- The original image intentionally omits manuals/documentation; identical
  `dpkg -V` omissions are retained, not treated as missing runtime files.
- Small old/new Archive::Tar controls demonstrate the absent/present size cap
  without allocating a large buffer. Native UTF-8, JSON, Storable, Socket,
  SHA256, gzip and tar round trips exercise installed modules.
- Nine native MariaDB Perl utilities receive syntax checks, and
  `mariadb-dumpslow` processes a fictional slow-query record. `innotop` already
  lacks optional Term::ReadKey in the baseline; `mariadb-access` attempts a
  compile-time home-directory log. Those two are not claimed as passed in
  the read-only unprivileged fixture, and no dependency is added for them.
- The upstream Archive::Tar test inputs run against the installed candidate
  module, not a source-tree replacement. Native MariaDB initialization,
  authenticated TLS, typed SQL, transaction rollback, role denial and a
  second clean database's dump/restore are independent gates.

The isolated gates passed at **2026-10-12 16:29:58 UTC** for candidate
`sha256:9cd3c29819f4425429cf6bb5307f3850b3d69a52a6289cf5995967b887db3706`.
All 1,322 existing libperl exports survive. The upstream Archive::Tar run
reports 10 files / 1,240 assertions, PASS, with two explicitly skipped files
(platform-specific symlink test and unavailable optional Test::Pod). The
native MariaDB connection negotiated `TLS_AES_256_GCM_SHA384`; its 2,436-byte
synthetic SQL dump restored successfully in a second fresh instance.

The test wrapper supplies the installed `/usr/bin/ptargrep` at the upstream
suite's expected relative path; it does not patch the tests or install a
source-tree module over the actual candidate. Final results and exact image
identity are in `build.json` and `checks.json`.
These fixtures do not constitute a production-data restore, a real Addy
mail/alias flow, large adversarial-archive test or browser/device coverage.

## Release and rollback

Preparation and tests do not restart production. After reviewing the private
passed receipts and published source, the release maintainer runs:

```sh
node deployment/maintenance/perl-ubuntu-followup/release.mjs prepare
node deployment/maintenance/perl-ubuntu-followup/release.mjs apply
```

Only the Addy `db` image scalar and that container are recreated. The existing
native health check, actual package/binary/module digests, unchanged other
containers/configuration and existing HTTP route must pass. Failure restores
the exact previous image scalar; user data is neither restored nor deleted.
The completed standard `release.json` is the authority for deployment status;
a started candidate or a prepared receipt is not a completed release.

For a later rollback, first account for any newer independent overlays;
restore only the recorded old DB image reference with the same bounded
recreation and native/HTTP checks. Do not overwrite the whole Compose file.
Parent maintenance registers completed ancestry/advisory proof after release.
No vulnerability decision is written by these scripts. A fresh scan should
recognize the native vendor version; add narrowly keyed attribution only if
an actual residual finding still requires it.

The corresponding-source offer is generated by `publish-source.mjs --publish`:
<https://tools.utilibre.org/utilibre-source/security-perl-ubuntu-20261012-source.tar.gz>.
It contains exact native source, packaging, notices, provenance and recipes,
without service secrets, account records or operational content.
