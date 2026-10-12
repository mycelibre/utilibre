# Native stable OpenSSH server follow-up

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
