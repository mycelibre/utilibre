# Exact DHI binary-subpackage attribution

Read-only review, 12 October 2026. This covers only five retained scanner
records for the existing Penpot exporter/frontend. It does not patch software,
edit DHI metadata, or clear an entire source package or application.

## What is proved

- Exporter `libperl5.40` and `perl-base`: scanner fragment `5.40.1-6+dhi7`;
  actual package `5.40.1-6+dhi+deb13u1+dhi2`.
- Frontend `perl-base`: scanner fragment `5.40.1-6+dhi3`; same actual package.
- Frontend `libsystemd0` and `libudev1`: scanner fragment
  `257.13-1~deb13u1+dhi1`; actual package `257.13-1~deb13u1+dhi2`.

Each stale version is checked in its real `/var/lib/dpkg/status.d/` fragment,
whose exact bytes are hashed without modification. Each complete current
package inventory, including every regular file and symbolic link, must match
its authenticated archive. Missing documentation is not silently disregarded.

The four archives total 6,595,444 bytes. Acquisition reuses the pinned DHI key,
clear-signed InRelease and compressed package index already retained by
`xserver-followup/authenticate-dhi.mjs`. Signature, index SHA256, exact package
stanza, archive SHA256, package name and actual version are all rechecked.
No new APT transaction, compiler, package installation or production write is
necessary. Package archives and detailed receipts stay outside Git.

The existing component policy identifies
[CVE-2026-9538](https://security-tracker.debian.org/tracker/CVE-2026-9538) in the
separate `Archive::Tar` module and
[CVE-2026-16742](https://security-tracker.debian.org/tracker/CVE-2026-16742) in
`systemd-homed`. Neither component is in these inspected binary subpackages.
**The affected sibling packages remain outside this review.** An installed
`perl-modules-5.40`, `perl`, or `systemd-homed` is never covered. This is not a
claim that a vulnerable component elsewhere in an image is harmless.

## Run and renew

```sh
node --test deployment/maintenance/dhi-binary-attribution/policy.test.mjs
node deployment/maintenance/dhi-binary-attribution/acquire.mjs
node deployment/maintenance/dhi-binary-attribution/review.mjs
```

The first completed inventory produced five drafts with zero skipped groups.
The three bounded policy tests reject other versions, images, CVEs, roles,
affected siblings, incomplete payload evidence and mismatched stale fragments.

Private output is under
`/var/lib/utilibre-maintenance/dhi-binary-attribution-20261012/`.
`review.json` contains unapplied, seven-day `not-affected` proposals;
`evidence.json` links complete package inventories and raw fragment hashes.
Only the parent-maintained explicit application gate may apply them.

`policy.mjs` exports `reviewFile`, `expectedStatus`, `eligible` and `prove`.
The scope is deliberately pinned to the five observed package/CVE/version/
role/image combinations. A changed image requires deliberate renewed review,
not an automatic inherited exclusion. A concurrent scan or deployment aborts
the check; a mismatched payload is reported as skipped and never waived.
The raw scanner findings and installed versions remain intact. No rollback is
needed because no application or production configuration was changed.
