# Native host cryptography 43 repair

Scope: the host's Debian `python3-cryptography` package only. No host pip, broad
Python upgrade, RPM installation, downloaded Rust toolchain, container-image
replacement, user certificate access, or live ACME issuance.

## Provenance and compatibility

The signed APT indexes authenticate Debian `43.0.0-3+deb13u1` source and rollback
package. `verify-source.mjs` pins archive hashes. Existing Debian patches remain,
including CVE-2026-26007. The original upstream 49 budget patch did not apply to
43; it was not forced or rewritten locally. Instead, the maintained 43 backport
from [Oracle's ELSA-2026-71658](https://linux.oracle.com/errata/ELSA-2026-71658.html)
applies verbatim with `--fuzz=0`. Its official source RPM is fetched over HTTPS
and checked against the erratum's SHA256; no claim of independently verified RPM
signature is made. Only its patch is extracted. No RPM scripts or bundled crates
are executed or installed.

The vendor's added Rust regression initially failed to compile because its
`unwrap_err()` requires `Debug` on a certificate type that 43 does not implement.
`vendor-test-compat.patch` changes only that test to `err().unwrap()`. Runtime
backport code remains verbatim. Both native suites are rerun after that change;
this test-only correction is included in the complete corresponding source.

The fix sets a global 128-signature validation budget and prioritizes likely
issuers using AKI/SKI. It originates in
[upstream 4a12cf4](https://github.com/pyca/cryptography/commit/4a12cf49675a184e47f912b00b04f3a629283582).
No cryptographic implementation is invented here. Version 43's Python API stays
unchanged; the release gate requires all its Python package files to match the
original, except the compiled Rust binding. OpenSSL and all other host package
versions must remain unchanged.

## Reproduction and gates

Run `sh acquire.sh`, then `sh build.sh` from this directory. The pinned Debian
compiler is capped at two CPUs, 4 GiB memory, and 256 processes, with an 8 GiB
host free-space floor. Only its dependency-acquisition phase has a network;
native build/test runs as nobody after disconnection. Debian-packaged Rust
dependencies and the build lock are retained. The native Python test suite runs
with the existing Debian exclusion for its older OpenSSL Rust binding, and the
X509-verification Rust suite runs separately. A 768 MiB APT cache bound is
necessary for these compiler dependencies (an initial 256 MiB attempt safely
failed before compilation; host packages were untouched).

`node release.mjs` stages the exact original and candidate native packages, and
runs unprivileged synthetic checks in isolated network namespaces with loopback
only. The tests cover the missing/existing signature budget, a valid issuer
behind 140 wrong-key candidates, legitimate wildcard certificates, the two
later wildcard-CVE shapes, PyOpenSSL certificate validation, JWT ES256,
Fernet, ACME's native challenge calculation/verification, and a real local
requests/PyOpenSSL HTTPS request. No real keys, service credentials or external
requests are used. Outputs/fixtures are temporary.

Only after reviewing `checks.json`, `node release.mjs --apply` installs the one
package with exact old-byte, rollback, unchanged configuration, package
inventory and service-PID gates. It refreshes the existing unattended-update
protection. It does not restart Docker or SSH. Failure restores the exact
authenticated old package and records whether rollback verified. Successful
receipts are not overwritten; reruns need a new reviewed release.

## Wildcard finding attribution

Do not blindly backport later wildcard APIs. This series calls `DNSName::new`
for constrained SANs and rejects wildcards under constraints. The synthetic
excluded-subtree and permitted-subtree reproducer shapes are rejected, while
normal unconstrained wildcards work. See
[Ubuntu CVE-2026-34073](https://ubuntu.com/security/CVE-2026-34073) for the later
introducing commit and [CVE-2026-69248](https://ubuntu.com/security/CVE-2026-69248)
for the affected 45–48 range. This narrower exact-source and runtime evidence
must be retained alongside any not-affected review; a version banner alone is
not sufficient.

`review.mjs` requires a fresh complete scan after the successful native release,
revalidates exact live bytes and proofs, and emits separate host-only mitigation
and not-affected drafts. It never applies security-ledger decisions. Reviews
expire in seven days and must be regenerated or retired on an upstream fix.

## Status and rollback

The authoritative local state is
`/var/lib/utilibre-maintenance/host-cryptography-followup-20261012/release.json`.
The guarded native release passed at **2026-10-12 14:12:26 UTC**: version
`43.0.0-3+deb13u1+utilibre1` is installed, its full synthetic consumer/budget
checks pass, every other host package version and Docker/SSH PID stayed
unchanged, and `dpkg --audit` is clean. The existing unattended-update guard
includes this package. A read-only post-release process-map check found no
mapped deleted host cryptography binding. No release is claimed from a
successful build alone. The full build logs, native
package lock, baseline/candidate checks and source archives are kept in that
private directory. Do not publish operational logs or synthetic private keys.

Staging on 2026-10-12 passed 3,114 native Python tests (168 skips, four existing
Debian deselections), 35 native Rust verifier tests and five Rust doc tests.
All baseline/candidate consumer tests described above passed. The only changed
Python package artifact is the compiled Rust binding; 96 other files remain
byte-identical. Candidate package SHA256:
`fc6952d3d9f31a3fb2e08e80266a37c6b68b9192405b1c4a10c54479817dc85e`.
Native checks ran under the existing host Python 3.13/OpenSSL 3.5 stack as well
as the distribution compiler's suite environment; no real user flow, network
certificate issuance, uptime history or complete vulnerability absence is
claimed from these checks.

Rollback uses the retained authenticated
`sources/python3-cryptography_43.0.0-3+deb13u1_amd64.deb` with `dpkg --install`,
followed by the baseline tests and `dpkg --audit`. It would restore the old
unbounded verifier, so it is an emergency regression fallback, not closure of
the vulnerability. Test and review a supported upstream replacement before
retiring the protected-package entry and local patch.
