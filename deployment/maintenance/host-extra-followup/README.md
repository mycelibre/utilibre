# Native host library follow-up — 12 October 2026

The host's `libpcap0.8t64` was upgraded from `1.10.5-2` to the signed Debian
`1.10.7-1` package. This addresses
[CVE-2026-0799](https://security-tracker.debian.org/tracker/CVE-2026-0799), the
out-of-bounds BPF scratch-register access. This is not a claim that receiving an
ordinary network packet exploits the issue or that the whole host is now fixed.

`acquire-pcap.sh` uses separate authenticated APT indexes for downloads only.
It does not add a new distribution to the host's configured repositories.
`release-pcap.mjs` permits one package change, preserves all 96 exported ABI
symbols and refuses release if a host process has the old library mapped.
The candidate requires no new package or libc change. The native version is
included in the maintained host-update protection policy.

## Completed verification

The staged and installed libraries passed eight malformed scratch-register
program checks, an accepted/rejected offline filter, invalid-filter rejection,
and a fictional packet's file write/read round trip. These checks ran as
`nobody`: no network interface discovery or live packet capture occurred.
Docker and SSH process IDs and the libc version were unchanged; the package
database was clean. No service or network restart was needed.

The private receipt and retained old/new authenticated packages are under
`/var/lib/utilibre-maintenance/host-extra-followup-20261012/pcap/`.
`review-pcap.mjs` requires a new complete scan after release, verifies the exact
live library and package hash, and prepares only the corresponding finding.
It does not suppress raw scanner output or apply a queue decision itself.

## Recheck and rollback

Run the following as an unprivileged user for the synthetic check:

```sh
python3 deployment/maintenance/host-extra-followup/check-pcap.py /usr/lib/x86_64-linux-gnu/libpcap.so.1.10.7
```

Keep its output separate from real traffic: there is none.

Rollback is the retained `libpcap0.8t64_1.10.5-2_amd64.deb`, whose SHA-256 is
`6a756d536a5b0cd3ef92f19ff9f22ed80c66baadbc0fe55d599f4aa0c27d3f86`.
Before deliberately reinstalling it, repeat the mapped-consumer check and
review any package changes made since this release. Downgrading restores the
security issue. Do not remove dependants or run a distribution upgrade.
