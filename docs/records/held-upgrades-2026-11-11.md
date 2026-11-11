# Held upgrade repairs — 11 November 2026

This continues the [earlier upgrade checkpoint](upgrade-closure-2026-11-11.md).
Counts describe application candidates, not vulnerabilities. The earlier raw
source findings remain evidence; they are not a count of exploitable production
issues.

## Released and verified

| Application | Release | Preserved behavior and verification |
| --- | --- | --- |
| Chhoto | 7.11.3-p1 | Local assets, no click-history writes, private resolved-link logs, eight-character defaults and custom aliases. Native accounts, expiry, three browser widths, export/recovery and old-image recovery passed. |
| ByteStash | 1.6.2-p1 | Native cookie/OIDC handling replaces the superseded authentication patch. Local Monaco assets and redacted logs remain. Two-account isolation, snippet migration, recycling, JSON export/import, reload and recovery passed. The narrow-screen toolbar wraps. |
| WBO | 2.18.33-p1 | Native telemetry SDK remains disabled, with all exporters disabled and the internal network retained. Two browser sessions edited, reconnected and exported SVG; legacy board parsing passed. Activation required an empty temporary board store and zero connections. |
| Candlr | 2.4.0-p1 | Retained dependency repairs, disabled automatic update requests and external notification/media controls. Saved-account migration, private events, JSON export, reload, deletion and backup/old-image recovery passed. Native OIDC router bytes are unchanged; a real identity-provider login was not exercised. |
| CryptPad | 2026.10.1 | Retained privacy configuration, vendored repair and Office 9.3.2+3 assets. Old accounts, Rich Text and Office documents migrated; native team/personal exports, two-client editing, Document Undo, reload and Word export passed. Both production origins and container health passed. |

Each exact image passed the existing scoped release health/public-route checks.
Corresponding source archives were published at the existing source-offer URLs;
previous images and archives remain available. Account data, access rules and
retention were preserved. Tests used fictional inputs and isolated services.
Chromium viewport checks are not a new physical-phone verification.

The EN/ES catalogue now reports all five releases. Its isolated build, lint,
typecheck, FOSS policy and all 122 unit tests pass; the scoped release passed
public version checks. Staging also returned a genuine 404 for an absent page.
Both old and new portal runtime scans had zero matches against the same
recorded advisory database. Unrelated worktree changes were excluded.

The candidate-source repairs reduced Candlr's original 6 critical / 29 high
matches to zero. Its runtime still has raw Debian matches: full filesystem and
configuration comparison establishes that previously repaired runtime files
are unchanged outside the declared application payload. No new exception was
accepted. The existing ACL finding remains open.

## Candidate checks still in progress

CryptPad 2026.10.1 is deployed. No third-party browser requests were observed
in the tested workflows. Exact comparisons confirmed that Office assets,
privacy customizations and the vendored repair are unchanged. Its encrypted
native account-data backup was validated before activation; the old source
tree is retained. This does not certify every Office application or document.
Document Undo does not imply spreadsheet Undo works in Fast mode; the
[native spreadsheet instructions](https://docs.cryptpad.org/en/user_guide/apps/sheets.html#undo-and-collaboration-modes)
describe that distinction (checked 11 November).

KitchenOwl 0.8.1 preserves repaired system libraries and uses Psycopg's
supported Python implementation with system libpq. Synthetic database
migration, household/recipe export, backup restore and old-image recovery
pass. Browser OIDC verification is incomplete: the fixture's redirect/waiting
behavior also failed against the installed predecessor. This is not evidence
that production OIDC is broken. Keep the production version until the browser
journey passes. The final image has no added high/critical matches relative to
the exact retained runtime; the open ACL record remains.

## Debian and the underlying VM

Read-only inspection on 11 November found Debian 13.7, 507 installed packages,
no APT upgrades or holds, no broken package state, and no reboot marker. The
running kernel is the newest installed kernel, `6.12.116+deb13-cloud-amd64`.
The package index had last refreshed at 02:31 UTC that day; this check did not
refresh it or upgrade the host.

Inspected versions: Docker 29.9.3, containerd 2.4.2, runc 1.5.2, OpenSSH
10.3p1-1~bpo13+1+utilibre2, QEMU guest agent 11.1.2+ds-3~bpo13+4, systemd
257.13-1~deb13u1, glibc 2.41-12+deb13u4 and OpenSSL 3.5.7-1~deb13u3.
Unattended updates are enabled. Locally repaired infrastructure packages use
the controlled maintenance path so an unattended replacement cannot discard
their repairs. Selected daemons had no deleted executable/library mappings;
this is not an exhaustive process audit.

The APT result does **not** cover all maintenance runtimes. Fifteen installed
service files explicitly use Node 24.14.0 from NVM, including the Storage Box
job. The separate upstream check found these gaps on 11 November:

| Component | Installed | Upstream release to review | Qualification |
| --- | --- | --- | --- |
| Node | 24.14.0 | [24.22.3 security release](https://nodejs.org/dist/index.json) | Thirteen service files invoke this exact binary; two include it in PATH. Even the 24.21.0 build environment predates this release. |
| Trivy | 0.75.0 | [0.76.2 security release](https://github.com/aquasecurity/trivy/releases/tag/v0.76.2) | The standalone binary needs the Go dependency fixes; its container-base changes are not host fixes. Scanner compatibility and policy hashes must be checked before replacement. |
| Python | 3.13.16, locally repaired Debian packages | [3.13.18 security release](https://www.python.org/downloads/release/python-31318/) | The executable and local patches matter, not the older `python3` metapackage version. The host queue still records the later tarfile and CA-distrust advisories; do not infer all fixes were backported. |
| Restic | 0.18.0-1+b4 | [0.19.1](https://github.com/restic/restic/releases/tag/v0.19.1) | Debian's available package is current against APT; upstream has later backup, snapshot and SFTP corrections. This version gap is not itself proof of an exploitable vulnerability. |

No host runtime replacement was performed by this read-only inspection.
The host scanner currently covers dpkg packages, not unmanaged Node/Trivy
binaries. A complete background-maintenance assessment must include those
tools and their exact executing paths. Test maintenance commands without
notifications and backup/export compatibility before changing them; preserve
the existing local repairs and rollback binaries.

Being current against APT does not close the ACL caller-migration issue. The
host has one of the 30 previously reviewed open high records. No ACL repair,
suppression, reboot or major Debian migration was performed here. The separate
Proxmox host and Caddy VM are outside this guest inspection.

## Post-release assessment

The scan completed at 18:19 UTC: all 109 runtime images, 113 source inputs and
the host package inventory were checked. It used the recorded 10 November
19:01 UTC advisory database without a network refresh. The result is an
assessment against that snapshot, not clearance for advisories published later.

The exact Candlr replacement initially reopened 46 prior component decisions.
Full image-file comparison and the recorded native repair evidence establish
that those Debian components are unchanged. The narrow review adapter carries
only those exact, still-valid decisions with their original expiry; it refuses
a different image, changed evidence or advisory snapshot. No new exception,
expiry extension or raw-finding suppression was added. The remaining queue is
**0 critical / 30 high pending**, all `CVE-2026-54369`. Raw observations remain
visible: 66 critical / 4,089 high package-target records, including reviewed
backports and component-specific non-applicability. These are not counts of
confirmed exploitable vulnerabilities. The unmanaged-tool gaps above remain
separate work and must not be hidden by this queue total.

## Evidence and recovery

Private evidence is under
`/var/lib/utilibre-maintenance/held-upgrades-20261111/`. Each released service
has a `<service>-release/result.json`; candidate directories retain native
results, scans and source-publication receipts. Raw diagnostics and synthetic
credentials stay outside Git and public archives.

The finite `held-inputs.json` binds source revisions, images, patches, locks,
recipes and evidence hashes. `held-policy.mjs` rejects unknown inputs, changed
evidence, new unreviewed high/critical matches or advisory data older than 48
hours. Preparation and deployment remain separate; no LLM is needed to replay
the captured commands. These are deterministic checks, not a claim of
byte-identical builds.

Activation used the existing adapter:

```sh
node deployment/maintenance/release-refresh-20261106/release.mjs chhoto --apply --held-nov11
node deployment/maintenance/release-refresh-20261106/release.mjs bytestash --apply --held-nov11
node deployment/maintenance/release-refresh-20261106/release.mjs wbo --apply --held-nov11
node deployment/maintenance/release-refresh-20261106/release.mjs candlr --apply --held-nov11
node deployment/maintenance/releases-20261111/release-cryptpad-upgrade.mjs --apply
node deployment/maintenance/release-refresh-20261106/release-portal.mjs --apply --held-upgrades
```

Do not rebuild or resolve new dependencies during activation. Roll back only
the selected service to its recorded predecessor and retained configuration.
Restoring a saved-account database is a separate operation: an old image alone
does not undo migrations, and restoring the pre-upgrade snapshot can discard
later writes. WBO's temporary content is deliberately not backed up. No
whole-VM restore is claimed.

The historical Candlr and Chhoto publishers now stop before writing old source
over the new offers. The replacement source publisher verifies the same
approved candidate and archive hash. No update notification, email or indexing
submission was sent during this work.
