# Host Python source and payload review — 12 November 2026

Scope: the five installed Python 3.13.18 packages rebuilt from Debian's
`python3.13_3.13.18-1` source, installed as
`3.13.18-1~deb13u1+utilibre1`. This is an exact-artifact assessment proposal,
not permission to apply decisions or deploy. Containers and other Python
advisories are outside its scope. After reviewing the exact source/payload
evidence and refreshing the two resident helpers, the parent applied all 25
decisions using the existing `triage.mjs record-batch` process on 12 November.
They expire after seven days; the raw scan is retained. The adapter itself
remains proposal-only.

## Source and installed evidence

`deployment/maintenance/host-tools/review-python.mjs` reuses the existing
fresh-scan, decision-schema and Expat host-proof helpers. It performs local
read-only checks and writes one private proposal. It has no apply mode,
network requests, package installation, service restart or notification.

The reviewed inputs are the SHA256-pinned upstream archive, Debian packaging
and source descriptor in `host-tools/versions.json`; five exact rebuilt Debian
packages; the successful release receipt; and all 690 installed regular-file
hashes. The rebuilt Debian packaging differs from the vendor archive only in
`debian/changelog`. The retained Sources stanza names the correct 3.13.18-1
inputs. Replaying historical APT signature validation is not part of this
adapter; the source descriptor's individual signature is not claimed verified.

Upstream `Misc/NEWS` and the relevant source members were checked from the
retained, pinned archive. The Debian native patch series leaves the relevant
HTML, tarfile, Python SSL and Expat files unchanged. Its one patch touching
`Modules/_ssl.c` selects the generated OpenSSL error-code table; the reviewed
hunk does not change callback lifetime or hostname validation. The patch hash
is pinned by the adapter, so a different vendor patch requires review.

| Advisory | Upstream issue | Release containing the change | Additional requirement |
| --- | --- | --- | --- |
| [CVE-2026-15308](https://security-tracker.debian.org/tracker/CVE-2026-15308) | gh-153030 | 3.13.15 | Exact HTML parser source inclusion |
| [CVE-2026-19445](https://security-tracker.debian.org/tracker/CVE-2026-19445) | gh-156293 | 3.13.16 | Exact native SSL source inclusion |
| [CVE-2026-19553](https://security-tracker.debian.org/tracker/CVE-2026-19553) | gh-156793 | 3.13.16 | Exact native SSL source inclusion |
| [CVE-2026-7210](https://security-tracker.debian.org/tracker/CVE-2026-7210) | gh-149018 | 3.13.14 | Python correction **and** corrected system Expat |
| [CVE-2026-82049](https://security-tracker.debian.org/tracker/CVE-2026-82049) | gh-157190 | 3.13.16 | Exact tarfile source inclusion |

The five primary Debian tracker entries, inspected on 12 November, identify
source package 3.13.18-1 as fixed. That is supporting vendor evidence for this
native rebuild, not an assertion that every package with a higher version
string is safe. The adapter also verifies the installed Expat 2.10.0 package,
its existing release proof and actual resident library mappings.

Existing compatibility evidence was retained and its hashes rechecked:
2,630 ordinary upstream cases, 59 skips across five modules; native SQLite,
Unicode, ordinary tar round-trip, venv, temporary-directory cleanup, Debian
APT/D-Bus/cryptography imports and TLS verification defaults. These are
compatibility results. No exploit, race, vulnerability reproduction, new
adversarial regression or exhaustive security suite was run for this review.

## Proposal and activation boundary

Run with the maintained host Node:

```sh
/root/.nvm/versions/node/v24.22.3/bin/node deployment/maintenance/host-tools/review-python.mjs
```

Private output: `/var/lib/utilibre-maintenance/host-tools-20261112/python-review.json`.
It selects only the five named advisories across the five exact host packages
(25 records), validates them against the current completed scan, and proposes
seven-day reviews. It never writes the shared review ledger. An operator must
review the exact report before using the existing triage process.

The first execution correctly withheld all 25 decisions: two host helpers
still held the replaced interpreter (`utilibre-turn-acme.service` and
`unattended-upgrades.service`). That proves neither a new vulnerability nor a
failed package install; it means the new executable had not reached every
resident consumer. The report records the blocker and contains an empty
`decisions` array until the parent maintenance process resolves it and the
adapter is rerun. No helper was restarted by this review adapter.

The parent subsequently refreshed those two helpers using their native
service procedures, retained the operational evidence in
`host-tools-20261112/python-resident-refresh.json`, and requested a rerun.
The rerun passed with **25 prepared decisions, zero blocked, 690 installed
files verified and no replaced host interpreter remaining**. Decisions remain
unapplied by this adapter. `python-review-checks.json` records the valid batch,
rejection of malformed schema/unknown keys and the unsupported `apply` flag,
and stable normalized decisions on repeated execution. Review timestamps and
expiry naturally change; source identities and exact finding decisions do not.

## Other new host-tool findings

Private evidence: `host-tools-20261112/host-tool-review-gaps.json`.
Seven separate pending host-tool records from the 03:49 UTC scan snapshot
were inspected: five UNKNOWN, one HIGH and one MEDIUM. None is covered by the
Python proposal. This is a dated assessment snapshot, not the final fleet
status after the parent's separate host-tool updates.

The existing Trivy GO-2026-5932 review's binary, advisory and upstream go.mod
hashes still match. None of the advisory's affected OpenPGP import paths is
present in the binary strings, while the maintained ProtonMail implementation
is present. This supports that narrow previous review; string absence is not
a reconstructed build graph or blanket security clearance. No new decision
was applied or transferred to GitHub CLI.

At that snapshot, three Go standard-library CVE-2026-97054 records require a corrected,
reviewed build or separate exact-artifact applicability evidence. GitHub CLI's
OpenPGP record needs its own assessment, and its two `x/net` records require a
separately prepared and tested dependency update or equivalent precise proof.
Scanner-provided fixed versions are candidate inputs, not compatibility proof.
The parent is preparing the superseding GitHub CLI build separately; this
record does not certify it or reuse Trivy's evidence for it.

This work does not demonstrate byte-for-byte reproducible builds and does not
clear unrelated findings. Historical ordinary tests and current vendor/source
inclusion are reported separately from active-process and payload checks.
