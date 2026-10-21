# Native stable OpenSSH server follow-up

## Current release: 21 October 2026

The host now runs the three coupled packages at
**`1:10.3p1-1~bpo13+1+utilibre1`**, installed at **07:50:19 UTC** with the
operator's Proxmox console available. This restores all four reviewed local
repairs on Debian's existing 10.3 backports branch, rather than downgrading to
10.0. The earlier 16 October version below is historical.

Use `backports103-prepare.mjs INPUT OUTPUT`, followed by `username-run.mjs`,
then `username-check.mjs CANDIDATE CHECKS DEBIAN_ROLLBACK_DIRECTORY` and
`username-preflight.mjs` with the same arguments. The optional rollback argument
explicitly selects 10.3; old commands keep the historical 10.0 behavior.
`username-release.mjs --apply CHECKS` remains a separately authorized activation,
not an audit action. Refresh preflight in a new private checks directory if
more than one hour has elapsed. Keep the original native test receipts.

All eleven native protocol checks, the 10.3 username before/after check, exact
installed binary checks and a loopback host-key exchange passed. Host keys,
SSH configuration, Docker PID and all 175 running container identities were
unchanged; there was no reboot. The earlier server regression's failing fixture
is 10.0, while the passing candidate is 10.3. This is not an external account
login test or a claim to fix the two remaining Debian GSSAPI-extension defects.

Before activation, the guard correctly rejected missing unattended-upgrade
protection. The three exact package names are now explicit entries in
`protected-host-packages.json`, so removing a local version suffix does not
silently remove their protection. The policy's ten tests pass; manual
administrative package commands still bypass that protection.

`username-review.mjs CANDIDATE CHECKS [NEW_REVIEW_JSON]` supports both reviewed
generations. For 10.3 it verifies the original source archive, installed binaries,
native receipts and all three pinned patches; reversing them must recover seven
exact authenticated Debian source-file hashes. Corrupted-source and unsupported
release negative checks passed. Source-only version matches remain in raw scans;
sixteen individually reviewed host records carry bounded, expiring decisions.

Artifacts/source and three rollback packages are retained under
`/var/lib/utilibre-maintenance/ssh-backports103-20261021/`. The current window is
`checks-window-Ch7hYk/`; its proposal pins every rollback artifact. Restoring those
three packages together removes the local repairs and requires another SSH
window and reassessment, not reuse of the mitigation decisions. See the
[release record](../../../docs/records/security-maintenance-2026-10-21.md)
for counts, remaining work and exact verification limits.

## Previous release: 16 October 2026

The three coupled packages are now **`1:10.0p1-7+deb13u4+utilibre3`**,
released at **09:18:03 UTC**, after the operator confirmed Proxmox console
availability for the SSH window. The `utilibre2` account below is historical.

The new release adds upstream
[0c4c9a7b](https://github.com/openssh/openssh-portable/commit/0c4c9a7b320bd7ff61c4a2dc345cb2e27e9663b2)
for CVE-2026-106583. CLI usernames containing dollar/backslash characters are
rejected; explicit `User` configuration keeps its native behavior. Previous
client/server repairs remain byte-identical in source. This is not an upgrade
to every feature/fix in OpenSSH 10.6.

Four harmless invalid CLI cases fail for the intended reason only on the new
binary; four ordinary users and an explicit configuration literal pass on both.
No substituted shell command is executed. All 742 upstream unit cases and the
eleven existing native protocol checks pass, including real private-realm
Kerberos, PAM, SSH/SFTP, forwarding and byte-equal rekeys. The release verifies
five installed binary hashes, all three package versions, clean dpkg state,
active SSH, unchanged configuration/keys and unchanged Docker PID. No kernel,
bootloader or VM power-state change occurred.

`GSSAPIAuthentication` and `GSSAPIKeyExchange` are configured off in the inspected
host effective configuration. **CVE-2026-106553 and CVE-2026-106555 are not
patched or waived for the server.** Debian's additional GSSAPI key-exchange code
needs a compatible source repair and its own regression tests; a client or SFTP
subpackage attribution decision does not cover the actual server.

### Offline preparation and explicit release

Use new private directories for each attempt; preserve failed receipts.
The following stages are separate commands, not an automatic deployment job:

```sh
node deployment/maintenance/ssh-server-followup/username-prepare.mjs /private/new-input
node deployment/maintenance/ssh-server-followup/username-run.mjs /private/new-input /private/new-output
node deployment/maintenance/ssh-server-followup/username-check.mjs /private/new-output /private/new-checks
node deployment/maintenance/ssh-server-followup/username-preflight.mjs /private/new-output /private/new-checks
```

Preparation pins the retained authenticated native source, patch and pre/post
file hashes. The already-local compiler is pinned to
`sha256:f45539e1b2380da919ac34c184cb1a19b0c7a1037f993fd30ae37a1a1f8b8604`.
The build has no network, two CPUs, 3 GiB RAM, a 1.5 GiB temporary build filesystem
and a 15-minute timeout. No host credentials or production volumes are mounted.
Native protocol checks use isolated loopback and synthetic keys. Only their
private namespace receives TUN/NET_ADMIN permissions; no ports are published.

After reviewing the exact candidate and separately arranging the SSH window,
`username-release.mjs --apply /private/new-checks` installs all three packages
together. A client-only APT simulation would remove its coupled server/SFTP
packages: never use that route. The release rejects any removal or additional
package upgrade and verifies the maintained-package protection policy.

Observed artifacts are `/opt/utilibre/reports/ssh-username-20261016-output`;
checks, proposal, release and review receipts are under the adjacent
`ssh-username-20261016-check`. The output includes complete modified Debian
source, original source/signature, package hashes and the build dependency lock.
No byte-for-byte build reproducibility is claimed.

After a new host scan, `username-review.mjs OUTPUT CHECKS [NEW_REVIEW_JSON]` re-extracts the modified
source, verifies retained client/server files, strictly reverse-checks the new
patch, checks installed binary/package hashes and the native receipts, and
prepares expiring exact-key decisions. It never writes the ledger. The old
`review.mjs` deliberately rejects this newer version; do not force it to pass.
Use a fresh private `NEW_REVIEW_JSON` filename for later revalidation; leave the
original release and review receipts intact. Apply reviewed proposals through
the existing `triage.mjs record` interface, not an automatic approval job.

Rollback requires the retained three **utilibre2** packages named and hashed in
the new `proposal.json`, installed together with `--force-confold` during another
SSH window. Verify versions, `sshd -t`, active SSH/Docker and `dpkg --audit`;
preserve host keys. This reverses the new CLI protection and requires a new host
scan/review, not reuse of utilibre3 decisions.

See the [56-record disposition](../../../docs/records/security-high-review-2026-10-16.md)
for the remaining ACL/boot/kernel issues and exact scan freshness limitations.

## Previous release: 12 October 2026

Live release completed on **2026-10-12 at 13:56:41 UTC**. All three coupled
host packages are installed at `1:10.0p1-7+deb13u4+utilibre2`; the eleven native
gates passed, installed payloads match the tested candidate, SSH/Docker remain
active, and SSH configuration, host keys and their metadata are unchanged.
The private `release.json` records the completed release and rollback inputs.

The candidate `1:10.0p1-7+deb13u4+utilibre2` keeps Debian Trixie's native
OpenSSH packaging, GSSAPI extensions, PAM support, dependencies and existing
client lifetime backport. It adds these upstream server fixes:

- [8dfe7ed6](https://github.com/openssh/openssh-portable/commit/8dfe7ed6e2fd988de08df508355a196b956b2753)
  makes `DisableForwarding` take precedence over `PermitTunnel`
  ([CVE-2026-59999](https://security-tracker.debian.org/tracker/CVE-2026-59999)).
- [5d04ca6a](https://github.com/openssh/openssh-portable/commit/5d04ca6af739b82fd30d84d2783ca802ebfa1192)
  enforces GSSAPI authentication failure accounting and handles RFC 4462 errors
  ([CVE-2026-60000](https://security-tracker.debian.org/tracker/CVE-2026-60000)).
  Upstream [c10e0498](https://github.com/openssh/openssh-portable/commit/c10e04980300eab089f71aaada8b28fd878ee729)
  removes variables made unused by that fix.

The earlier `d43ba60c` minimum-delay refactor is not a dependency: the chosen
repair adds no references to its `auth_failure_delay` helper and applies in
full to stable. Only upstream RCS dates are omitted and `uint32_t` hunk context
is translated to stable's equivalent `u_int32_t` spelling. Debian's separate
GSSAPI key-exchange method and extended `mm_ssh_gssapi_userok` calls remain.
The previous `e8bdfb15` client lifetime patch is applied byte-for-byte.

## Verification

The Debian package build runs 742 upstream unit cases, compatibility tests,
Debian key-generation tests and configuration checksum checks. Source inputs
are fetched through authenticated stable APT and compared byte-for-byte with
the retained original source archives before compilation.

`native.py` runs with two CPUs, 2 GiB RAM, no external network and no published
ports. Its TUN permission applies only inside that container's private network
namespace. Generated fixture keys and a temporary private Kerberos realm are
used throughout. The fixture explicitly points `SshdAuthPath` and
`SshdSessionPath` at each extracted package generation, ensuring the actual
candidate authentication and session binaries execute.

| Gate | Previous packages | Candidate packages |
| --- | --- | --- |
| GSSAPI ERRTOK, MaxAuthTries=3 | Five negotiations remain possible | Disconnect at attempt three |
| Invalid account ERRTOK and malformed TOKEN | Not claimed | Disconnect at attempt three |
| PermitTunnel=yes, DisableForwarding=yes | Native TUN channel accepted | Rejected |
| PermitTunnel=yes, DisableForwarding=no | Not needed for control | Native TUN channel accepted |
| Client/server sessions, 512 KiB echo, 16 KiB rekeys | Candidate client interoperates | Previous and candidate clients interoperate |
| SFTP and local/remote TCP forwarding | Pass | Pass |
| Wrong host key | Rejected | Rejected |
| PAM sessions and real Kerberos ticket authentication | Not claimed | Pass |

The five-attempt baseline is deliberately bounded; it proves missing failure
accounting without resource exhaustion. The new tests cover the requested
server defects, not all later OpenSSH advisories. Rekey and rejected-host tests
exercise the retained client repair's paths but do not claim to reproduce a
use-after-free. No production SSH authentication or user session is captured.

`check-host.mjs` verifies the staged native payload hashes against runtime
evidence, host dynamic linking, host configuration parsing, identical effective
configuration, a clean package database, active SSH/Docker and an APT simulation
changing exactly `openssh-client`, `openssh-server` and `openssh-sftp-server`.
It creates a private `proposal.json` and does not install anything.

## Reproduction and release

Private inputs, packages, logs and receipts are retained under
`/var/lib/utilibre-maintenance/ssh-server-followup-20261012`. Existing
`utilibre1` packages remain under `ssh-closure-20261012` for rollback.

1. Run `node prepare.mjs` once against a fresh reviewed staging root. It
   verifies exact upstream commit identities, applies every selected semantic
   hunk and records input/output hashes. Do not overwrite existing receipts.
2. Run `build.sh` in
   `debian@sha256:a29215f6a35e51e22adffa17f89e9d2ef06214e64a2bad10d765c46aea49f11f`,
   with the staging directory mounted at `/build` and this repository read-only
   at `/reviewed`; cap `--cpus 2 --memory 2g --memory-swap 2g`. The script checks
   an 8 GiB free-space floor and installs compiler/test dependencies only there.
3. Retain that builder as a local test image, then run `native.py` with
   `--network none --cap-add NET_ADMIN --device /dev/net/tun`, the same resource
   limits/mounts, and the old package directory read-only at `/previous`.
4. Run `source.sh` in the same builder image without networking. It creates a
   clean, complete modified Debian source package plus dependency lock under
   `source-offer/`, excluding fixture keys and private logs.
5. Run `node check-host.mjs`. Review `proposal.json` and its exact three package
   hashes before coordinating the production release.
6. After that review, `node release.mjs` installs the coupled packages with
   `--force-confold`, verifies versions/payloads/configuration and key bytes,
   metadata, active SSH/Docker and a clean package database. A failed gate
   attempts the retained three-package rollback and records its result.
7. The existing maintenance policy automatically protects all installed
   `+utilibre` package versions from unattended replacement. The release also
   checks the explicit generated blacklist entries.
8. After a fresh host security scan, `node review.mjs` generates seven-day,
   exact-key proposals for these two CVEs and retained client CVE-2026-60002.
   The retained client review additionally requires byte-identical patched
   source files, the complete prior patch, the new native rekey results and
   the installed client's exact candidate SHA256. The script never edits the
   private advisory ledger.

Rollback preserves `/etc/ssh`: verify the original package hashes from
`proposal.json`, reinstall those exact three `utilibre1` packages together with
`--force-confold`, then check `sshd -t`, active `ssh.service`/`docker.service`,
all three versions and `dpkg --audit`. Never replace host keys from fixtures.
