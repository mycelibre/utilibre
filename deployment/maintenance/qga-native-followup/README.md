# Native guest-agent repair — 12 October 2026

**Deployed and confirmed on 12 October 2026 at 16:07:11 UTC.** The parent
maintainer installed the exact tested package during the owner-confirmed
control-plane pause. The owner then reported successful Proxmox checks and a
thawed filesystem state; the confirmation helper completed the receipt. The
new process PID was 1725379, with the expected executable hash. Docker/SSH PIDs
and unrelated configuration/packages were unchanged. There was **no VM reboot,
real filesystem-freeze test or key write to an existing account**.

CVE-2026-12080 is the real guest-agent SSH-key issue repaired here. It is not
closed by the separate QEMU component-attribution reviews. Nothing here patches
the Proxmox host, emulators, running kernel or other QEMU findings. The
control-plane postcheck is owner-reported evidence, not direct Proxmox API
access from this VM.

## Scope and provenance

The baseline is Debian `qemu-guest-agent 1:10.0.13+ds-0+deb13u1`; candidate
`1:10.0.13+ds-0+deb13u1+utilibre1` rebuilds only its executable. All 11 remaining
package files, native service/udev/init scripts, hook, manuals and notices remain
byte-identical. The unchanged native maintainer scripts **restart the guest
agent during installation**. Package metadata changes only version, installed
size and the executable's MD5 entry. This is a locally built package, not a
Debian-signed candidate binary.

The complete native source and original binary were acquired using authenticated
Debian indexes by `../qemu-component-followup/acquire.mjs`. `verify-source.mjs`
pins all input SHA-256 hashes. The sole production-source change is upstream
stable [332ab334](https://github.com/qemu/qemu/commit/332ab334bc6b0b43bc17c90820fec068b63a666b),
also described by the [Debian tracker](https://security-tracker.debian.org/tracker/CVE-2026-12080).
Its patch SHA-256 is
`8b7b122ef83e47078e0f31188405ca1d7dc86f8ba941b2f886abf81295b7e21e`.
It applies with no offsets/fuzz: 71 added lines in `qga/commands-posix-ssh.c`.
The upstream fix switches effective credentials for the requested user, then
restores effective UID/GID; it fails closed if restoration fails.

The build uses the pinned native Debian container in `build.sh`, at most two
CPUs/4 GiB RAM/256 processes, with an 8 GiB host recovery floor. Dependency
installation is confined to that container. Compilation/tests run disconnected
from Docker networks. `build-packages.lock` records the actual compiler and
native dependencies. The upstream tools/modules configure switches are enabled
because upstream otherwise omits native `libudev`/`gmodule` functionality from
the agent. Only `qemu-ga` is packaged; no emulator or block tool is installed.
All seven original ELF NEEDED entries are preserved. No libc upgrade occurs.

## Observed checks

- The complete configured upstream unit suite ran: **85 passed, one skipped,
  zero failures/timeouts**. The skipped `test-crypto-pbkdf` has no test cases
  with the optional block-tool crypto backend disabled; it is not a guest-agent
  handler. Both guest-agent suites pass, including 28 `test-qga` subtests and
  the existing upstream SSH tests. No new exploit fixture was introduced.
- Baseline/candidate agents ran through private Unix sockets in the disconnected
  disposable container. All **43 command capability entries**, including enabled
  flags, match, as do native default configuration values.
- Benign ping, time/OS reads, thawed-status read and synthetic SSH-key add/read/
  remove work. A nonexistent-user error leaves the agent usable. Effective
  UID/GID restoration is checked after each RPC. The key is deliberately
  unusable fictional text, in a new container-only user/home, never an existing
  account or host path. Unlike the upstream unit build, this exercises the
  normal binary's `initgroups` path.
- Native package simulation changes exactly `qemu-guest-agent`; the complete
  installed baseline, host configuration, unrelated package inventory and
  Docker/SSH service PIDs are checked without mutation.

These checks do not test a real VM freeze/backup, live Proxmox communication,
every guest-agent command, or the exploit against real data. A passing process
or socket is not proof that the control plane has no backup running.

Initial build attempts were rejected before staging: omitting upstream tools/
modules removed native libraries, caught by the exact dependency gate. A test
fixture also used `/dev/null` where QEMU requires a regular config file; the
fixture now uses an empty regular file. Neither attempt changed production.

## Preparation and maintenance-window activation

The following documents the completed release procedure, not a request to repeat
the installation. The helper rejects an existing release receipt and a changed
baseline. Preparation before the authorized window used:

```sh
node --test deployment/maintenance/qga-native-followup/policy.test.mjs
node deployment/maintenance/qga-native-followup/release-host.mjs
```

Activation is blocked unless the owner verifies **on Proxmox** that
VM 144 has no running backup/freeze/other agent operation and keeps those tasks
paused for the short window. Read-only control-plane checks include:

```sh
pvesh get /nodes/pve/tasks --source active --limit 100 --output-format json
qm status 144
qm agent 144 ping
qm agent 144 fsfreeze-status
```

The node name `pve` is the established host; substitute its actual node name if
changed. Keep the task query unfiltered by VM ID: a cluster-wide backup may have
no VM ID. If 100 rows return, paginate with `--start 100` and further pages;
otherwise the result is partial. The supported `--source active` parameter is
defined in [Proxmox's task API](https://github.com/proxmox/pve-manager/blob/master/PVE/API2/Tasks.pm).
Inspect scheduled/manual tasks too: a currently empty task list does not lock
the control plane or prevent a new scheduled job. Keep other operations paused
throughout the window. Do not issue freeze, thaw, reboot or key-write
commands merely to test this repair. Stop if the status is frozen or any task
is active/uncertain. Do not write the occupied virtio channel from this VM.

After those results are reviewed, the operator records a root-owned mode-0600
private `coordination.json` with VM ID 144, current `agentPid`, fresh `checkedAt`,
`proxmoxBackupsIdle`, `otherAgentOperationsPaused`, `operatorConfirmed` and
`approvedGuestAgentRestart` all true, and `freezeStatus: "thawed"`. This is an
explicit operator attestation, not invented API verification. It expires after
five minutes. The file is deliberately absent until coordination occurs.

Only then, on this VM after refreshing preparation:

```sh
node deployment/maintenance/qga-native-followup/release-host.mjs --apply /var/lib/utilibre-maintenance/qga-native-followup-20261012/coordination.json
```

The helper verifies exact candidate, source offer, unchanged configuration and
old payload, then installs the single package. Its native postinst restarts
only the guest agent. It verifies the new running executable and untouched
Docker/SSH PIDs/packages/config, and regenerates the existing unattended-update
blacklist to protect the `+utilibre1` package. It never restarts the VM, Docker,
networking or SSH. A failed native gate attempts the exact archived old package
only if the local frozen marker is absent; otherwise it stops for control-plane
inspection rather than blindly restarting a frozen agent.

After installation, repeat **on Proxmox** `qm agent 144 ping` and
`qm agent 144 fsfreeze-status`. Keep the window in effect until these pass.
Record the operator-confirmed results in root-only `control-plane-postcheck.json`
with `vmid: 144`, `pingSucceeded: true`, `freezeStatus: "thawed"`, the new PID,
`operatorConfirmed: true` and a fresh `checkedAt`. Then run:

```sh
node deployment/maintenance/qga-native-followup/confirm-control-plane.mjs --confirm
```

Until this confirmation the receipt says `native-passed-control-plane-pending`,
not complete. There is no ledger update or global scan in these helpers.
The old native archive is retained under private `inputs/` for rollback;
reinstalling it also restarts the agent and needs the same coordinated window.

## Source and attribution

`publish-source.mjs --publish` packages exact native source archives, upstream
patch, build/test/package recipes, dependency lock and preserved native package
control/data needed to recreate this one-executable package. No user data,
SSH key, account, operational log or private coordination file is included.
The raw source has its original GPL and other notices. Source-offer receipts
and build/release proofs live under
`/var/lib/utilibre-maintenance/qga-native-followup-20261012/`.

The complete [source offer](https://tools.utilibre.org/utilibre-source/security-qga-native-20261012-r2-source.tar.gz)
includes the corrected Proxmox task-list command (`--source active`); the first
archive remains preserved, but its task-query example was superseded before
activation. The candidate executable/package bytes are unchanged.

`review.mjs` refuses to draft the single CVE mitigation until completed release,
operator control-plane confirmation, exact live bytes and a subsequent fresh
scan all match. Other QEMU issues require their own evidence. Retire this local
patch only after a compatible vendor release includes it and passes these same
checks; never install a moving upstream build over the guarded native package.
