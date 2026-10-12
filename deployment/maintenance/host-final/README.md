# Host-only JWT repair — 11 October 2026

Released `python3-jwt` **2.15.1-1**, replacing Debian's
`2.10.1-2+deb13u1`. This is one pure-Python Debian package, not a distribution
upgrade. No daemon, Docker engine, SSH server or kernel was restarted. The
private release receipt is
`/var/lib/utilibre-maintenance/host-final-20261011/jwt-release.json`.

The package was downloaded using Debian-signed sid package indexes into an
isolated APT list directory. Its only required package is `python3:any`; the
recommended cryptography package was already installed. The simulated install
upgraded exactly one package, with no removal. Its maintainer scripts only
compile/clean Python bytecode. Do **not** copy `debian-review.sources` into the
system's APT sources or upgrade the host from sid.

`release-jwt.mjs` checks the exact old/new package hashes, tests the extracted
candidate before installation, installs only that artifact and repeats the
native checks. On failure it attempts to restore the retained exact old package.
The script deliberately refuses to run again against an unexpected version.

The staged and live `check-jwt.py` checks passed: HMAC, RSA, RSA-PSS and ECDSA
round trips; rejection of incorrect keys/algorithms, expired tokens and empty
HMAC/JWK keys; OAuthlib signed-token and service-client assertions; and the
existing cloud-init import. Tests use fictional values, not account tokens.
`dpkg --audit` was clean; Docker and SSH remained active.

## Reproduce or roll back

Retained artifact directory:
`/var/lib/utilibre-maintenance/host-final-20261011/`. SHA-256 values are pinned
in `release-jwt.mjs`; both original and replacement `.deb` files remain there.
For a necessary rollback, verify the original hash first and install only
`python3-jwt_2.10.1-2+deb13u1_all.deb` with `dpkg --install`. This restores the
previous vulnerabilities; it is an emergency recovery step, not the preferred
state. Do not replace unrelated host packages or restore an entire VM for this
change.

Current vendor references, checked 11 October:

- [Debian package](https://packages.debian.org/sid/python3-jwt).
- [JWK empty-key advisory](https://security-tracker.debian.org/tracker/CVE-2026-102266).
- [JWKS redirect advisory](https://security-tracker.debian.org/tracker/CVE-2026-102267).

## Separate host constraints

Remaining host findings are **not** cleared by this release. In particular,
Debian's installed OpenSSH client still has a
[client-side key-reexchange finding](https://security-tracker.debian.org/tracker/CVE-2026-60002).
The current sid binary requires glibc 2.42 and conflicts with the installed
server packaging; a blind sid install would not be a safe client-only repair.
The six available Docker/containerd/plugin updates need their own rollout:
live-restore is disabled, and Rustpad currently has unsaved memory-only work.
No Docker restart or bulk host upgrade was performed.

Rechecked **12 October 2026**: the host's three LMDB scanner-critical records
([16224](https://security-tracker.debian.org/tracker/CVE-2019-16224),
[16225](https://security-tracker.debian.org/tracker/CVE-2019-16225),
[16227](https://security-tracker.debian.org/tracker/CVE-2019-16227)) require opening
an attacker-supplied/corrupt LMDB database. Debian still lists even sid's 0.9.35
as unfixed and classifies the stable-release issue as minor. This is useful
exposure context, **not** an exemption for the installed 0.9.31 library or proof
of every consumer's reachability. Keep these records visible, do not import
untrusted raw LMDB databases into host utilities, and recheck the vendor update.
No unrelated host dependency was removed to clear a scanner count.

The unused kernel SMB **server** `ksmbd` is blacklisted in
`/etc/modprobe.d/utilibre-disable-unused-ksmbd.conf`; the separate CIFS storage
client is unchanged. `modprobe -n -v -b ksmbd` confirms the blacklist-aware
path does not insert it. Do not describe the `install /bin/false` rule as a
complete load prohibition: kmod 34.2 gives the kernel's soft dependencies
precedence, and an explicit administrative load can bypass it. A controlled
probe demonstrated this; only the module newly loaded by that probe was
immediately unloaded after checking zero users. Final checks found no loaded
ksmbd module, no SMB service and no TCP 445 listener. No existing SMB workload
was stopped, and there was no reboot or kernel update.

[CVE-2026-43185](https://security-tracker.debian.org/tracker/CVE-2026-43185)
therefore remains an **unfixed installed-kernel finding**, not a patched or
waived package. The affected server is not in use; stable Debian 6.12.111
does not yet include the fix. The local `modprobe.d(5)` documentation confirms
the softdep precedence. A future kernel release/reboot needs a separate gate
after the owner has saved the memory-only Rustpad document. Rollback of this
blacklist is removal of this one configuration file only, followed by a
review before any deliberate SMB-server activation.
