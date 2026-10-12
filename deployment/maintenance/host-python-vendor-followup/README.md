# Native host packaging repair — 12 October 2026

Scope: `python3-setuptools-whl` only. The stable Debian `78.1.1-0.1` package contains jaraco.context 5.3.0 inside its wheel. Its custom extraction filter removes the first directory component without subsequently applying tarfile's data-safety filter. A patched host interpreter alone does not fix a caller that replaces that filter.

The deployed native package is `78.1.1-0.1+utilibre1`, built from the authenticated stable Debian source. Its guarded live release passed on 12 October 2026. It retains the setuptools 78.1.1 API, all original notices and existing Debian changes. The vendored patch's added/deleted code lines exactly match [upstream commit 3b16eec9](https://github.com/jaraco/jaraco.context/commit/3b16eec9f80db260bd072acdb85d0bd2d530a563), part of the published [CVE-2026-23949 repair](https://security-tracker.debian.org/tracker/CVE-2026-23949). The original module's different path/context is the only adaptation. It does not replace Python's archive engine or invent a filter.

## Verified preparation

`acquire.sh` downloads through isolated signed Debian APT indexes without editing host repositories. `verify-source.mjs` pins those source/rollback checksums and the upstream patch hash; independent `.dsc` signature verification is not claimed. `build.sh` uses the pinned Trixie image, 2 CPUs, 3 GiB RAM and a bounded 1.5 GiB workspace; network disconnects before building. No host build packages or pip packages are installed. The upstream Debian packaging disables its test target, so the independent checks below—not an alleged full upstream suite—are the acceptance evidence.

`compare.py` confirms that all **514** wheel entries are preserved. Only the vendored `jaraco/context.py` and the generated wheel `RECORD` differ. The wheel remains version 78.1.1; the Debian package version records the repair.

`check.py`, run as `nobody` in a fresh network namespace, exercises the actual vendored functions against local fictional archives:

- Seven unsafe baseline cases reproduce: relative traversal, deeper traversal, absolute destination, symbolic link, hard link, special file and explicitly opened nested archive. All escape targets stay inside the disposable fixture directory even in the vulnerable baseline.
- The repaired helper rejects or confines all seven. Absolute paths may be made relative by the upstream data filter rather than rejected; the check requires that no outside file is created.
- Normal UTF-8 content and nested directories extract correctly, with native cleanup.
- Every wheel RECORD checksum verifies.
- A real native virtual environment installs the local wheel, imports the complete vendored module, builds a fictional package with setuptools, installs/imports that output and passes `pip check`. This never installs anything into the host Python environment and makes no network request.

Tests do not claim archives are universally safe or inspect existing user environments. Existing environments with their own setuptools copy are not silently changed by this host package repair.

## Release and rollback

Private inputs, logs, staged checks and release receipt live under `/var/lib/utilibre-maintenance/host-python-vendor-followup-20261012`. Run `node release.mjs` for staging, then the authorized `node release.mjs --apply` only after it passes. The installer requires the exact signed old package/payload, a fresh unchanged staging proof, an APT simulation changing exactly one package, no removed dependencies and a clean package database. It repeats the functional checks live, verifies no other package or Docker/SSH process ID changed, and refreshes unattended-update protection.

The private `release.json` records the passed installed-state checks: all seven archive cases, native venv/package consumer, unchanged other packages and Docker/SSH process IDs, clean package database and refreshed host protection. Failure attempts reinstall the exact retained old package and verify its wheel hash. The old package is `python3-setuptools-whl_78.1.1-0.1_all.deb`, SHA-256 `0caf134e73ab90ffeaa5ce2529d73ea7d48078b2a9251ed9d1b7b514a61e9483`. A deliberate rollback restores the known vulnerability: first inspect later package changes and use the normal release process. No service, network or database restart/migration was required.

The protected-host policy contains the narrow new entry; existing libpcap and other entries are preserved. Automated updates must not discard this repair. Retire it only after a reviewed upstream successor passes equivalent native checks. No broad package hold, host pip mutation, distribution upgrade or privacy-policy change is introduced.

After a fresh completed scan, `node review.mjs` prepares only the expiring CVE-2026-23949 mitigation draft for this exact host wheel. It verifies live bytes, source provenance, candidate/live checks and package identity. It does not edit the shared security ledger or waive unrelated setuptools findings.

## Corresponding source

`publish-source.mjs --publish` offers the complete modified Debian source package, upstream archive and notices, original authenticated inputs, explicit patch, dependency lock and build/test/release recipes. No private logs, runtime settings, fixture data or keys are included. Rebuild with `dpkg-source -x` and the native dependency lock, or populate the recipe's explicit source paths from the archive and run its isolated build. Essential source archives remain immutable; later recipe changes are also covered by the existing integration-source offer.
