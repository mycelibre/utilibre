# Native Archive::Tar repair — 12 October 2026

This changes three pure-Perl modules, not the Perl interpreter, an XS ABI, GNU
tar, application data, access rules or retention. Official CPAN Archive::Tar
**3.14** is installed through Perl's native vendor-module precedence as
`utilibre-archive-tar 3.14-1`. The original core module remains installed and its
package/version are not falsified. Removing this dedicated package restores
the original load path; that also restores any old vulnerability.

`acquire.mjs` verifies the pinned official CPAN archive against the independently
retrieved MetaCPAN checksum. This is HTTPS/checksum provenance, not a claim of a
detached signature. `package.mjs` retains the unmodified module code and notices.
Source SHA-256: `177ce0506124afbe3ef95836761fb0799c941b87b79bac489bddc6cda860d904`.
License: the same terms as Perl (Artistic or GNU GPL).

`stage.mjs` builds five small, exact-parent overlays: Gathio PostgreSQL, RSSHub,
Priviblur, BreezeWiki and FreshRSS. Each runs the complete upstream test inputs
without mounting the upstream library, checks the actual installed load path,
and round-trips an archive with the existing `ptar` executable. Unicode, gzip,
normal extraction, a tiny negative-control size limit and later-entry recovery
are checked. Tests are disconnected, unprivileged and resource bounded. Image
configuration and unrelated package versions are preserved. Test counts and
exact image/module hashes live in the private `stage.json` receipt.

Penpot exporter's existing DHI module already contains the size-cap backport.
`check-vendor.mjs` compares the complete guard to the official fixed source,
checks its order before content allocation, and exercises normal and capped
reads. It does not replace that image or equate its old version label with old
bytes. This is a separate exact-payload review, not a blanket DHI waiver.

## Explicit limitation

[CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538)
concerns unchecked allocation from a declared archive-entry size. The fixed
module defaults to a **1 GiB per-entry cap**, which is not a safe upload policy
or overall memory budget. Applications still need bounded input/CPU/memory.
[Upstream issue 47](https://github.com/jib/archive-tar-new/issues/47) remains:
rejecting a large entry scans its body in 512-byte blocks and can emit repeated
warnings. The small synthetic test records this behavior; it is not hidden or
reported as complete resource-abuse immunity. Hard-link extraction defaults
also follow the upstream security release; this is documented behavior, not a
promise to preserve unsafe extraction.

## Release and recovery

`release.mjs prepare`, then `apply`, checks exact inputs, pins, configuration,
native module bytes, namespace companions and existing local entry points.
Only the five image scalars change. Failures restore those pins and verify the
old service; no user-data restore/deletion occurs. The core stack's `/opt`
Compose and repository mirror remain aligned. Keep both images until acceptance.

`host.mjs prepare`, then `apply`, performs a separate native host-module install
and unprivileged suite, retaining an exact rollback by removing only this new
package. No daemon, network service, guest agent or VM is restarted.

Private evidence: `/var/lib/utilibre-maintenance/archive-tar-final-20261012/`.
Release state, not this README, determines what has actually been deployed.
Expiring scanner reviews require exact live module hashes and native load-path
proof. Future Perl/vendor updates must compare this override to current upstream
and retire it only after the vendor module passes the same regression. It must
not silently mask a newer upstream security fix.

Primary sources checked 12 October: [CPAN release](https://metacpan.org/release/BINGOS/Archive-Tar-3.14),
[upstream history](https://github.com/jib/archive-tar-new/blob/master/CHANGES).
