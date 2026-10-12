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
The six Docker/containerd/plugin updates were initially held for Rustpad's
memory-only work. The owner subsequently authorized their coordinated rollout;
see the 12 October release below. No bulk distribution upgrade was performed.

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

## Docker and Rustpad release — 12 October 2026

The owner authorized the previously held restart with “Go.” The maintenance
window began at **00:55 UTC**, services were restored before **00:59**, and
exact-image/container/health/configuration verification passed at **01:00:48**.
Those are release timestamps, not measured per-service outage durations.
There was no VM/kernel reboot, volume deletion or account-data migration.

| Package | Previous | Installed |
| --- | --- | --- |
| Docker Engine, CLI, rootless extras | 29.7.2 | 29.9.0 |
| containerd.io | 2.3.4 | 2.4.1-2 |
| Buildx | 0.36.1 | 0.38.0 |
| Compose | 5.5.0 | 5.6.0 |

All six packages came from Docker's signed Debian 13 stable APT index. Exact
versions, old/new artifacts and their verified SHA-256 values are retained in
`/var/lib/utilibre-maintenance/docker-release-20261012/release.json`. The APT
simulation contained six upgrades, no added package and no removal. The local
artifacts were installed with dpkg after that dependency check; `dpkg --audit`
was clean. Engine Go is **1.26.9**. [Upstream 29.9 release notes](https://docs.docker.com/engine/release-notes/29/).

`release-docker.mjs` records only operational container fields, never container
environments or document contents. All **175** formerly running containers
returned on their previous images except the intended Rustpad replacement;
all **11** stopped containers remained stopped. Saved-account mounts and native
privacy/access settings were retained. The six supervised network-sensitive
stacks and three active-exited stack units were restored through their native
systemd startup hooks. Timers active before the release were restored.

The first attempt exposed two orchestration problems, both repaired before
completion: containerd must remain alive until Docker finishes shutting down,
and the PairDrop firewall's Docker pre-start hook could not find interactive
NVM's `node`. It now uses Debian's absolute `/usr/bin/python3` and strict native
IPv4 validation. The firewall policy is unchanged; a minimal-PATH regression
test covers valid IPv4, invalid/IPv6/injection-like input and malformed JSON.
APT's no-download local-URI attempt changed no package; installation subsequently
used the already verified six local artifacts. No private data rollback was needed.

Compose 5.6 reordered generated JSON keys. The old 5.5 binary reproduced the
original Rustpad configuration hash, and canonical object comparison proved
the new output semantically identical. The release receipt preserves that proof;
the check was not simply waived.

Live gates: two independent Chromium sessions collaboratively edited a newly
generated fictional Rustpad document through the public HTTPS route; raw text,
copied subpath link and language controls passed, with **16 same-origin requests,
zero third-party requests and zero page errors**. No owner's pad was inspected.
PairDrop's bounded native check passed TLS, authenticated allocations, wrong-key
denial, exact-byte relay transfer, IPv6 denial and host/private-peer restrictions.
Nine recreated reader/proxy namespaces, two SMTP ingress boundaries and the
Wallabag/Projects host firewall hooks were checked after restart. These are not
a new external-network throughput or physical-device test.

The **01:00:15** scan completed in 59 seconds: 109 live images, 175 containers,
510 host packages and 55 source manifests. Rustpad now has 191 recovered compiled
Rust packages and zero findings in that inventory. The scanner service passed;
this closes its incomplete-image failure, **not** the remaining dependency queue
or documented Deno/WASM and separate-host coverage limitations. The later
read-only monitor check passed all 59 status monitors and 105 catalogue endpoint
checks. Root free space is about **8.2 GiB**, still below the 10 GiB warning.

### Recovery

Keep all retained images/packages and the new Wakapi credential. For a Rustpad
regression, first coordinate another memory-only-pad save, change only its
Compose image back to `utilibre-rustpad:54e4a93-p1`, then recreate that one service
with `--no-build --pull never`; rerun the native browser check. Both restart and
rollback discard memory-only pads; these are deliberately not backed up.

For host recovery, consult the exact old package filenames/hashes in the private
receipt. Stop supervised and active-exited stacks first, then Docker/socket,
**then** containerd. Temporarily mask daemon starts while installing the reviewed
package set; unmask, start containerd/Docker, restore prior firewall units/stacks,
supervisors and timers. Do not automatically downgrade containerd's persistent
metadata or restore a stale whole-VM snapshot over saved user work. Retained old
packages are recovery material, not proof that every downgrade is safe; first
check the observed regression and that version's metadata compatibility.
No automatic live-restore claim is made: [Docker's documented limits](https://docs.docker.com/engine/daemon/live-restore/)
do not guarantee this cross-minor transition.
