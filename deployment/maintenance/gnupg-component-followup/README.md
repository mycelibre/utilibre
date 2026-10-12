# GnuPG component attribution — CVE-2026-24882 only

Read-only evidence collected **12 October 2026** for the current Penpot exporter
and frontend. This prepares seven-day, exact-key `not-affected` review drafts;
it does **not** repair/remove GnuPG, erase stale scanner metadata, change the
security ledger, or declare either image secure.

## Component and provenance

The [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-24882)
identifies a PKDECRYPT stack overflow inside **tpm2daemon**. Its table is explicitly
source-package-wide. The [Debian report](https://bugs.debian.org/1126631) and
[upstream introducing commit](https://github.com/gpg/gnupg/commit/62a7854816b8f3661fb41f05463289e5b96663ee)
identify the distinct daemon; [its release Makefile](https://github.com/gpg/gnupg/blob/gnupg-2.4.7/tpm2d/Makefile.am)
builds `command.c` into that executable. The installed sibling tools, translated
messages and documentation do not contain the affected daemon.

`acquire.mjs` used a disposable, compiler-free copy of the existing exporter
image with authenticated Debian/DHI APT indexes. It downloaded ten exact package
archives, never installing them or changing a running service. The reviewer
checks pinned archive SHA256 values against those authenticated index records,
extracts each archive afresh, and compares **every** installed regular file and
symlink. Missing documentation is not silently ignored. The complete package
inventory is also fingerprinted. Configuration contents are not put in reports.

Both containers report no installed tpm2daemon. A successful, error-checked
search through `/usr`, `/opt`, `/bin`, `/sbin` and `/lib` found no daemon path;
no user-content tree, keyring, TPM hardware or decryption operation was touched.
This is component-absence evidence, not a demonstration that a vulnerable daemon
would resist exploitation, nor a claim that all arbitrary renamed programs
have been reverse engineered.

## Observations

Initial reviewed images:

- Exporter: `sha256:913d35f37b54e7e53d16e883d946c52ed15efb1bf4b8433b53ae3dba22be845b`.
- Frontend: `sha256:a78bf3c037a53febe5dbd92e8cc15bf4de6d53cb95ad7f608e0398d0d2584303`.

The first run prepared **13** narrowly keyed drafts from **11** full live
package/image inventories, with **zero skipped** groups:

- Exporter: `dirmngr`, `gnupg-utils`, `gpg`, `gpg-agent`, `gpg-wks-client`,
  `gpgconf`, `gpgsm`, `gpgv` are `2.4.7-21+deb13u1+dhi4`; `gnupg` and
  `gnupg-l10n` are `2.4.7-21+deb13u1`.
- Frontend: `gpgv` is `2.4.7-21+deb13u1+dhi4`.
- Additional scanner records come from actual retained `/var/lib/dpkg/status.d/gpgv`
  fragments: exporter `+dhi3`, frontend `+dhi2`. The live executable and every
  other current package file match the authenticated **dhi4** archive. These
  fragments are hashed, checked against the exact stale finding, and left intact.

The reason for this CVE's exclusion is the absent affected component, **not** an
unsupported claim that the DHI version fixed tpm2daemon. Other GnuPG CVEs and
actual installed vulnerable components remain outside this review.

## Run and renew

```sh
node --test deployment/maintenance/gnupg-component-followup/policy.test.mjs
node deployment/maintenance/gnupg-component-followup/review.mjs
```

Private evidence lives under
`/var/lib/utilibre-maintenance/gnupg-component-followup-20261012/`:
authenticated acquisition logs/index and pinned archives in `packages/`, full
current inventories in `evidence.json`, decisions in `review.json`.

The reviewer requires a fresh completed scan, exact scanned/live image IDs,
allowed Penpot containers, current package versions, complete matching payloads,
and absence checks. It rechecks image IDs before/after inventory and again
before writing. A later exporter native overlay needs a new scan and complete
live reinspection; nothing is inherited merely because its image descends from
one previously checked. Incomplete checks emit an explicit skipped finding,
never a waiver. Concurrent scan/deployment invalidates the run.

Only the parent-maintained explicit application gate may apply these drafts.
`closure-review/gnupg-followup-policy.mjs` permits only this exact review file,
CVE, artifact and role/version combinations: frontend `gpgv` only, exporter the
ten inspected package names, with retained `gpgv` dhi2/dhi3 records restricted
to their respectively observed frontend/exporter roles. Its negative tests
reject substitution of another daemon, version, CVE or container role.
The evidence generator does not edit shared policy, existing inventory modules, compose,
runtime metadata, or the ledger. Keep the bounded negative policy tests when
renewing or retiring the evidence. No new public service or source patch was
introduced, so no production release or rollback is needed.
